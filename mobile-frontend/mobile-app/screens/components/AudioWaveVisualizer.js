import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    PanResponder,
    StyleSheet,
    Dimensions,
    Platform,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import { FontAwesome } from '@expo/vector-icons';
import { getServerIP } from '../../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import { Buffer } from 'buffer';

global.Buffer = Buffer;
const WAVEFORM_HEIGHT = 90;
const BAR_WIDTH = 3;
const BAR_GAP = 1.5;
const BAR_UNIT = BAR_WIDTH + BAR_GAP;
const CURSOR_WIDTH = 2;

// How many px from either edge triggers auto-scroll while dragging
const EDGE_SCROLL_ZONE = 60;
// How fast (px per frame) the view scrolls when in the edge zone
const EDGE_SCROLL_SPEED = 8;



export default function AudioWaveVisualizer({ lessonId, volume = 50, playbackRate = 1 }) {
    const [token, setToken] = useState(null);
    const scrollRef = useRef(null);
    const [cursorX, setCursorX] = useState(0);          // absolute X within waveform
    const [scrollOffsetX, setScrollOffsetX] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [waveformData, setWaveformData] = useState([]);
    const [serverIP, setServerIP] = useState('');
    const soundRef = useRef(null);
    const [positionMillis, setPositionMillis] = useState(0);
    const [durationMs, setDurationMs] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const screenWidth = Dimensions.get('window').width;

    const totalDurationSec = durationMs / 1000;
    const totalWidth = Math.max(screenWidth, waveformData.length * BAR_UNIT);

    // ── Refs that keep PanResponder handlers free of stale closures ────────────
    const cursorXRef = useRef(0);
    const scrollOffsetRef = useRef(0);
    const totalWidthRef = useRef(totalWidth);
    const durationMsRef = useRef(durationMs);
    const screenWidthRef = useRef(screenWidth);
    const isDraggingRef = useRef(false);

    // Keep all refs in sync with the latest derived/state values
    useEffect(() => { totalWidthRef.current = totalWidth; }, [totalWidth]);
    useEffect(() => { durationMsRef.current = durationMs; }, [durationMs]);
    useEffect(() => { screenWidthRef.current = screenWidth; }, [screenWidth]);

    // Edge-scroll animation frame ref — cancelled when drag ends
    const edgeScrollRAF = useRef(null);

    // ── Token & server IP ──────────────────────────────────────────────────────
    useEffect(() => {
        const loadToken = async () => {
            const token_g = await AsyncStorage.getItem('accessToken');
            console.log("Loaded accessToken:", token_g);
            setToken(token_g);
        };
        loadToken();
    }, []);

    useEffect(() => {
        const loadIP = async () => {
            const ip = await getServerIP();
            setServerIP(ip);
        };
        loadIP();
    }, []);

    // ── Volume / rate sync ─────────────────────────────────────────────────────
    useEffect(() => {
        if (!soundRef.current) return;
        if (Platform.OS === 'web') {
            soundRef.current.volume = volume;
        } else {
            soundRef.current.setVolumeAsync(volume);
        }
    }, [volume]);

    useEffect(() => {
        if (!soundRef.current) return;
        if (Platform.OS === 'web') {
            soundRef.current.playbackRate = playbackRate;
        } else {
            soundRef.current.setRateAsync(
                playbackRate,
                true,
                Audio.PitchCorrectionQuality.Medium
            );
        }
    }, [playbackRate]);

    // ── Move cursor to match playback position (only when not dragging) ────────
    useEffect(() => {
        if (durationMs <= 0 || isDragging) return;
        const newCursorX = (positionMillis / durationMs) * totalWidth;
        updateCursor(newCursorX);
    }, [positionMillis, durationMs, totalWidth, isDragging]);

    // ── Auto-scroll to keep cursor centred (only when NOT dragging) ───────────
    useEffect(() => {
        if (!scrollRef.current || isDragging) return;
        const desiredOffset = Math.max(
            0,
            Math.min(cursorX - screenWidth / 2, totalWidth - screenWidth)
        );
        scrollRef.current.scrollTo({ x: desiredOffset, animated: false });
    }, [cursorX, screenWidth, totalWidth, isDragging]);

    // ── Waveform fetch ─────────────────────────────────────────────────────────
    useEffect(() => {
        if (!token || !serverIP || !lessonId) return;

        const loadWaveform = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/waveform/`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ lesson_id: lessonId }),
                    }
                );
                const data = await response.json();
                setWaveformData(data.waveform);
            } catch (err) {
                console.error('Waveform load failed', err);
            }
        };

        loadWaveform();
    }, [token, serverIP, lessonId]);

    // ── Helpers ────────────────────────────────────────────────────────────────
    const updateCursor = (x) => {
        const clampedX = Math.max(0, Math.min(x, totalWidthRef.current));
        cursorXRef.current = clampedX;
        setCursorX(clampedX);
    };

    const xToTime = useCallback(
        (x) => {
            const clampedX = Math.max(0, Math.min(x, totalWidth));
            const totalMs = (clampedX / totalWidth) * durationMs;
            const secs = Math.floor(totalMs / 1000);
            const ms = Math.floor(totalMs % 1000);
            return `${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
        },
        [totalWidth, durationMs]
    );

    const handleScroll = (e) => {
        const x = e.nativeEvent.contentOffset.x;
        scrollOffsetRef.current = x;
        setScrollOffsetX(x);
    };

    // ── Edge-scroll loop ───────────────────────────────────────────────────────
    // Called on every animation frame while the user is dragging near an edge.
    const startEdgeScroll = (fingerScreenX) => {
        const step = () => {
            if (!isDraggingRef.current) return;

            const sw = screenWidthRef.current;
            const tw = totalWidthRef.current;
            let delta = 0;

            if (fingerScreenX < EDGE_SCROLL_ZONE) {
                // Near left edge — scroll left
                delta = -EDGE_SCROLL_SPEED * (1 - fingerScreenX / EDGE_SCROLL_ZONE);
            } else if (fingerScreenX > sw - EDGE_SCROLL_ZONE) {
                // Near right edge — scroll right
                delta = EDGE_SCROLL_SPEED * (1 - (sw - fingerScreenX) / EDGE_SCROLL_ZONE);
            }

            if (delta !== 0 && scrollRef.current) {
                const newOffset = Math.max(
                    0,
                    Math.min(scrollOffsetRef.current + delta, tw - sw)
                );
                scrollRef.current.scrollTo({ x: newOffset, animated: false });
                scrollOffsetRef.current = newOffset;

                // Also nudge the cursor along with the scroll
                const newCursor = Math.max(
                    0,
                    Math.min(cursorXRef.current + delta, tw)
                );
                cursorXRef.current = newCursor;
                setCursorX(newCursor);
            }

            edgeScrollRAF.current = requestAnimationFrame(step);
        };

        cancelAnimationFrame(edgeScrollRAF.current);
        edgeScrollRAF.current = requestAnimationFrame(step);
    };

    const stopEdgeScroll = () => {
        cancelAnimationFrame(edgeScrollRAF.current);
        edgeScrollRAF.current = null;
    };

    // ── PanResponder ───────────────────────────────────────────────────────────
    // All values accessed from refs → never stale.
    const freshPan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (evt) => {
                isDraggingRef.current = true;
                setIsDragging(true);

                const absX = evt.nativeEvent.locationX + scrollOffsetRef.current;
                const clampedX = Math.max(0, Math.min(absX, totalWidthRef.current));
                cursorXRef.current = clampedX;
                setCursorX(clampedX);

                startEdgeScroll(evt.nativeEvent.locationX);
            },

            onPanResponderMove: (evt) => {
                const fingerScreenX = evt.nativeEvent.locationX;
                const absX = fingerScreenX + scrollOffsetRef.current;
                const clampedX = Math.max(0, Math.min(absX, totalWidthRef.current));
                cursorXRef.current = clampedX;
                setCursorX(clampedX);

                // Update the edge-scroll loop with the latest finger position
                startEdgeScroll(fingerScreenX);
            },

            onPanResponderRelease: async () => {
                isDraggingRef.current = false;
                stopEdgeScroll();

                const seekMillis =
                    (cursorXRef.current / totalWidthRef.current) * durationMsRef.current;

                if (soundRef.current) {
                    if (Platform.OS === 'web') {
                        soundRef.current.currentTime = seekMillis / 1000;
                    } else {
                        await soundRef.current.setPositionAsync(seekMillis);
                    }
                }

                setPositionMillis(seekMillis);
                setIsDragging(false);
            },

            onPanResponderTerminate: () => {
                isDraggingRef.current = false;
                stopEdgeScroll();
                setIsDragging(false);
            },
        })
    ).current;

    // ── Cursor screen position ─────────────────────────────────────────────────
    const cursorScreenX = cursorX - scrollOffsetX;
    const timeLabel = xToTime(cursorX);

    // ── Audio helpers ──────────────────────────────────────────────────────────
    const getAudioPath = (lessonID) => {
        return FileSystem.documentDirectory + `lesson-${lessonID}.mp3`;
    };

    const isDownloaded = async (lessonID) => {
        if (Platform.OS === 'web') return false;
        const info = await FileSystem.getInfoAsync(getAudioPath(lessonID));
        return info.exists;
    };

    function arrayBufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);

        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }

        return btoa(binary);
    }

    const playAudio = async () => {
        if (!token) {
            console.log("Token has not loaded yet");
            return;
        }

        try {
            // Already loaded → resume
            if (soundRef.current) {
                if (Platform.OS === 'web') {
                    await soundRef.current.play();
                } else {
                    await soundRef.current.playAsync();
                }
                setIsPlaying(true);
                return;
            }

            const response = await fetch(
                `http://${serverIP}:8000/api/audio/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ lesson_id: lessonId, full_audio: true }),
                }
            );

            if (!response.ok) {
                throw new Error(`Failed to fetch audio: ${response.status}`);
            }

            // ── Web ──
            if (Platform.OS === 'web') {
                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);
                const audio = new window.Audio(audioUrl);
                audio.volume = volume;
                audio.playbackRate = playbackRate;
                audio.preload = 'auto';

                audio.addEventListener('loadedmetadata', () => {
                    setDurationMs(audio.duration * 1000);
                });
                audio.addEventListener('timeupdate', () => {
                    setPositionMillis(audio.currentTime * 1000);
                });
                audio.addEventListener('ended', () => {
                    setIsPlaying(false);
                    setPositionMillis(0);
                });

                soundRef.current = audio;
                await audio.play();
                setIsPlaying(true);
            }

            // ── Mobile ──
            else {
                const arrayBuffer = await response.arrayBuffer();

                // Convert directly to base64 WITHOUT Buffer/FileSystem
                const base64 = arrayBufferToBase64(arrayBuffer);

                const uri = `data:audio/mp3;base64,${base64}`;

                const { sound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: false, progressUpdateIntervalMillis: 50 }
                );

                await sound.setVolumeAsync(volume);
                await sound.setRateAsync(
                    playbackRate,
                    true,
                    Audio.PitchCorrectionQuality.Medium
                );

                sound.setOnPlaybackStatusUpdate((status) => {
                    if (!status.isLoaded) return;
                    setPositionMillis(status.positionMillis);
                    setDurationMs(status.durationMillis || 0);

                    if (status.didJustFinish) {
                        setIsPlaying(false);
                        setPositionMillis(0);
                    }
                });

                soundRef.current = sound;
                await sound.playAsync();
                setIsPlaying(true);
            }
        } catch (err) {
            console.error('playAudio error:', err);
            setIsPlaying(false);
        }
    };

    const pauseAudio = async () => {
        try {
            if (!soundRef.current) return;
            if (Platform.OS === 'web') {
                soundRef.current.pause();
            } else {
                await soundRef.current.pauseAsync();
            }
            setIsPlaying(false);
        } catch (err) {
            console.error('pauseAudio error:', err);
        }
    };

    const skipForward = async () => {
        if (!soundRef.current) return;
        const newPosition = Math.min(positionMillis + 2000, durationMs);
        if (Platform.OS === 'web') {
            soundRef.current.currentTime = newPosition / 1000;
        } else {
            await soundRef.current.setPositionAsync(newPosition);
        }
        setPositionMillis(newPosition);
    };

    const skipBackward = async () => {
        if (!soundRef.current) return;
        const newPosition = Math.max(positionMillis - 2000, 0);
        if (Platform.OS === 'web') {
            soundRef.current.currentTime = newPosition / 1000;
        } else {
            await soundRef.current.setPositionAsync(newPosition);
        }
        setPositionMillis(newPosition);
    };


    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <View>
            <View style={styles.controls}>
                <AntDesign name="plus-circle" size={24} color="white" />
                <AntDesign name="minus-circle" size={24} color="white" />
            </View>

            <View style={styles.wrapper}>
                <View style={styles.headerRow}>
                    <Text style={styles.headerLabel}>Audio Waveform</Text>
                    <View style={styles.timeBadge}>
                        <Text style={styles.timeBadgeText}>{timeLabel}s</Text>
                    </View>
                </View>

                <View style={styles.scrollContainer}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onScroll={handleScroll}
                        scrollEnabled={!isDragging}
                        style={styles.scroll}
                    >
                        <View
                            style={[styles.waveformCanvas, { width: totalWidth }]}
                            {...freshPan.panHandlers}
                        >
                            {waveformData.map((amplitude, i) => {
                                const barH = Math.max(4, amplitude * (WAVEFORM_HEIGHT - 10));
                                const isActive = i * BAR_UNIT <= cursorX;
                                return (
                                    <View
                                        key={i}
                                        style={[
                                            styles.bar,
                                            {
                                                height: barH,
                                                width: BAR_WIDTH,
                                                marginRight: BAR_GAP,
                                                backgroundColor: isActive
                                                    ? '#00adb5'
                                                    : 'rgba(255,255,255,0.18)',
                                                borderRadius: BAR_WIDTH / 2,
                                            },
                                        ]}
                                    />
                                );
                            })}
                        </View>
                    </ScrollView>

                    {/* Cursor overlay — outside the ScrollView so it stays fixed on screen */}
                    <View
                        pointerEvents="none"
                        style={[
                            styles.cursor,
                            {
                                left: cursorScreenX - CURSOR_WIDTH / 2,
                                opacity:
                                    cursorScreenX >= 0 && cursorScreenX <= screenWidth ? 1 : 0,
                            },
                        ]}
                    >
                        <View style={styles.cursorHandle} />
                        <View style={styles.cursorLine} />
                    </View>
                </View>

                <TimeRuler
                    totalWidth={totalWidth}
                    totalDurationSec={totalDurationSec}
                    scrollOffsetX={scrollOffsetX}
                    screenWidth={screenWidth}
                />
            </View>

            <View style={styles.bottomSection}>
                <View style={styles.controls}>
                    <AntDesign
                        name="fast-backward"
                        size={24}
                        color="white"
                        onPress={skipBackward}
                    />
                    {isPlaying ? (
                        <FontAwesome
                            name="pause"
                            size={24}
                            color="white"
                            onPress={pauseAudio}
                        />
                    ) : (
                        <FontAwesome
                            name="play"
                            size={24}
                            color="white"
                            onPress={playAudio}
                        />
                    )}
                    <AntDesign
                        name="fast-forward"
                        size={24}
                        color="white"
                        onPress={skipForward}
                    />
                </View>
            </View>
        </View>
    );
}

// ── Time Ruler ────────────────────────────────────────────────────────────────
function TimeRuler({ totalWidth, totalDurationSec, scrollOffsetX, screenWidth }) {
    const tickInterval = totalDurationSec > 120 ? 10 : totalDurationSec > 30 ? 5 : 1;
    const ticks = [];

    for (let t = 0; t <= totalDurationSec; t += tickInterval) {
        const x = (t / totalDurationSec) * totalWidth - scrollOffsetX;
        if (x < -20 || x > screenWidth + 20) continue;
        ticks.push(
            <View key={t} style={[styles.tickContainer, { left: x }]}>
                <View style={styles.tickLine} />
                <Text style={styles.tickLabel}>{t}s</Text>
            </View>
        );
    }

    return <View style={styles.ruler}>{ticks}</View>;
}

const styles = StyleSheet.create({
    wrapper: {
        backgroundColor: '#1a2330',
        borderRadius: 14,
        marginHorizontal: 10,
        marginVertical: 12,
        paddingTop: 10,
        paddingBottom: 6,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,173,181,0.25)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        marginBottom: 8,
    },
    headerLabel: {
        color: '#eeeeee',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },
    timeBadge: {
        backgroundColor: 'rgba(0,173,181,0.18)',
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: '#00adb5',
    },
    timeBadgeText: {
        color: '#00adb5',
        fontSize: 12,
        fontWeight: '700',
    },
    scrollContainer: {
        height: WAVEFORM_HEIGHT,
        position: 'relative',
    },
    scroll: {
        flex: 1,
    },
    waveformCanvas: {
        height: WAVEFORM_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    bar: {
        alignSelf: 'center',
    },
    cursor: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: CURSOR_WIDTH + 12,
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    cursorHandle: {
        width: 10,
        height: 10,
        borderRadius: 2,
        backgroundColor: '#ffffff',
        transform: [{ rotate: '45deg' }],
        marginTop: 2,
        shadowColor: '#00adb5',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 4,
        elevation: 6,
    },
    cursorLine: {
        flex: 1,
        width: CURSOR_WIDTH,
        backgroundColor: '#ffffff',
        opacity: 0.85,
        shadowColor: '#00adb5',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 3,
        elevation: 4,
    },
    ruler: {
        height: 22,
        position: 'relative',
        marginTop: 2,
    },
    tickContainer: {
        position: 'absolute',
        alignItems: 'center',
    },
    tickLine: {
        width: 1,
        height: 5,
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    tickLabel: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 9,
        marginTop: 1,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: 'auto',
        alignItems: 'center',
    },
});