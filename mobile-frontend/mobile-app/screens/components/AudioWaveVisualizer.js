import React, { useRef, useState, useEffect, useCallback, } from 'react';
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


const WAVEFORM_HEIGHT = 90;
const BAR_WIDTH = 3;
const BAR_GAP = 1.5;
const BAR_UNIT = BAR_WIDTH + BAR_GAP;
const PIXELS_PER_SECOND = 60; // how wide 1 second of audio is in pixels
const CURSOR_WIDTH = 2;

/**
 * Generates a fake-but-plausible waveform array of `count` values (0..1).
 * Replace this with real decoded PCM data if you have access to audio bytes.
 */
function buildFakeWaveform(durationMs, barCount) {
    // Creates a smoothly-varying waveform using sin + noise
    const result = [];
    for (let i = 0; i < barCount; i++) {
        const t = i / barCount;
        const base =
            0.3 * Math.abs(Math.sin(t * Math.PI * 8)) +
            0.25 * Math.abs(Math.sin(t * Math.PI * 23 + 1.2)) +
            0.15 * Math.abs(Math.sin(t * Math.PI * 47 + 0.5)) +
            0.1 * Math.random();
        result.push(Math.min(1, base));
    }
    return result;
}

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



    // Total waveform width in pixels
    const totalDurationSec = durationMs / 1000;
    const totalWidth = Math.max(
        screenWidth,
        totalDurationSec * PIXELS_PER_SECOND
    );
    const barCount = Math.floor(totalWidth / BAR_UNIT);

    useEffect(() => {
        const loadToken = async () => {
            const token_g =
                await AsyncStorage.getItem('accessToken');

            console.log(
                "Loaded accessToken:",
                token_g
            );

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

    useEffect(() => {

        if (!soundRef.current) {
            return;
        }
        if (Platform.OS === 'web') {
            soundRef.current.volume = volume;

        } else {
            soundRef.current.setVolumeAsync(volume);
        }

    }, [volume]);

    useEffect(() => {
        if (!soundRef.current) {
            return;
        }
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

    // Build waveform bars on mount / when duration changes
    useEffect(() => {
        setWaveformData(buildFakeWaveform(durationMs, barCount));
    }, [durationMs, barCount]);

    useEffect(() => {
        if (durationMs <= 0 || isDragging) {
            return;
        }

        const newCursorX =
            (positionMillis / durationMs) * totalWidth;

        setCursorX(newCursorX);

    }, [
        positionMillis,
        durationMs,
        totalWidth,
        isDragging,
    ]);

    useEffect(() => {
        if (
            !scrollRef.current ||
            isDragging
        ) {
            return;
        }

        const desiredOffset =
            Math.max(
                0,
                cursorX - screenWidth / 2
            );

        scrollRef.current.scrollTo({
            x: desiredOffset,
            animated: false,
        });

    }, [
        cursorX,
        screenWidth,
        isDragging,
    ]);

    // Convert absolute cursor X → time string "ss.mmm"
    const xToTime = useCallback(
        (x) => {
            const clampedX = Math.max(0, Math.min(x, totalWidth));
            const totalMs = (clampedX / PIXELS_PER_SECOND) * 1000;
            const secs = Math.floor(totalMs / 1000);
            const ms = Math.floor(totalMs % 1000);
            return `${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
        },
        [totalWidth]
    );

    // Keep scrollOffsetX up-to-date inside panResponder callbacks
    const scrollOffsetRef = useRef(0);
    const handleScroll = (e) => {
        const x = e.nativeEvent.contentOffset.x;
        scrollOffsetRef.current = x;
        setScrollOffsetX(x);
    };

    // Patch panResponder to read from ref so closure stays fresh
    const freshPan = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                setIsDragging(true);
                const absX = evt.nativeEvent.locationX + scrollOffsetRef.current;
                setCursorX(Math.max(0, Math.min(absX, totalWidth)));
            },
            onPanResponderMove: (evt) => {
                const absX = evt.nativeEvent.locationX + scrollOffsetRef.current;
                setCursorX(Math.max(0, Math.min(absX, totalWidth)));
            },
            onPanResponderRelease: async () => {

                const seekMillis =
                    (cursorX / totalWidth) *
                    durationMs;

                if (soundRef.current) {

                    if (Platform.OS === 'web') {

                        soundRef.current.currentTime =
                            seekMillis / 1000;

                    } else {

                        await soundRef.current
                            .setPositionAsync(
                                seekMillis
                            );
                    }
                }

                setPositionMillis(seekMillis);
                setIsDragging(false);
            },
            onPanResponderTerminate: () => setIsDragging(false),
        })
    ).current;

    // Cursor position relative to current scroll view (for rendering)
    const cursorScreenX = cursorX - scrollOffsetX;
    const timeLabel = xToTime(cursorX);

    const getAudioPath = (lessonID) => {
        return FileSystem.documentDirectory + `lesson-${lessonID}.mp3`;
    };

    const isDownloaded = async (lessonID) => {
        if (Platform.OS === 'web') {
            return false;
        }

        const info = await FileSystem.getInfoAsync(
            getAudioPath(lessonID)
        );

        return info.exists;
    };

    const playAudio = async () => {

        if (!token) {
            console.log(
                "Token has not loaded yet"
            );
            return;
        }

        try {

            // Already loaded -> resume playback
            if (soundRef.current) {

                if (Platform.OS === 'web') {
                    await soundRef.current.play();
                } else {
                    await soundRef.current.playAsync();
                }

                setIsPlaying(true);
                return;
            }

            // Fetch audio from backend
            const response = await fetch(
                `http://${serverIP}:8000/api/audio/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        lesson_id: lessonId,
                        full_audio: true,
                    }),
                }
            );

            if (!response.ok) {
                throw new Error(
                    `Failed to fetch audio: ${response.status}`
                );
            }

            // ---------------- WEB ----------------
            if (Platform.OS === 'web') {

                const blob = await response.blob();
                const audioUrl = URL.createObjectURL(blob);

                const audio = new window.Audio(audioUrl);
                audio.volume = volume;
                audio.playbackRate = playbackRate;
                audio.preload = 'auto';

                audio.addEventListener('loadedmetadata', () => {
                    setDurationMs(audio.duration * 1000);
                }
                );

                audio.addEventListener('timeupdate', () => {
                    setPositionMillis(audio.currentTime * 1000);
                }
                );

                audio.addEventListener('ended', () => {
                    setIsPlaying(false);
                    setPositionMillis(0);
                }
                );

                soundRef.current = audio;

                await audio.play();

                setIsPlaying(true);
            }

            // ---------------- MOBILE ----------------
            else {

                const arrayBuffer =
                    await response.arrayBuffer();

                const base64Data =
                    Buffer.from(arrayBuffer)
                        .toString('base64');

                const path =
                    FileSystem.cacheDirectory +
                    `audio-${lessonId}.mp3`;

                await FileSystem.writeAsStringAsync(
                    path,
                    base64Data,
                    {
                        encoding: 'base64',
                    }
                );

                const { sound } = await Audio.Sound.createAsync(
                    { uri: path },
                    {
                        shouldPlay: false,
                        progressUpdateIntervalMillis: 50,
                    }
                );

                await sound.setVolumeAsync(volume);

                await sound.setRateAsync(
                    playbackRate,
                    true,
                    Audio.PitchCorrectionQuality.Medium
                );

                sound.setOnPlaybackStatusUpdate(
                    (status) => {

                        if (!status.isLoaded) {
                            return;
                        }

                        setPositionMillis(
                            status.positionMillis
                        );

                        setDurationMs(
                            status.durationMillis || 0
                        );

                        if (
                            status.didJustFinish
                        ) {
                            setIsPlaying(false);
                            setPositionMillis(0);
                        }
                    }
                );

                soundRef.current = sound;

                await sound.playAsync();

                setIsPlaying(true);
            }

        } catch (err) {

            console.error(
                'playAudio error:',
                err
            );

            setIsPlaying(false);
        }
    };

    const pauseAudio = async () => {

        try {

            if (!soundRef.current) {
                return;
            }

            if (Platform.OS === 'web') {

                soundRef.current.pause();

            } else {

                await soundRef.current.pauseAsync();
            }

            setIsPlaying(false);

        } catch (err) {

            console.error(
                'pauseAudio error:',
                err
            );
        }
    };

    const skipForward = async () => {

        if (!soundRef.current) {
            return;
        }

        const newPosition =
            Math.min(
                positionMillis + 2000,
                durationMs
            );

        if (Platform.OS === 'web') {

            soundRef.current.currentTime =
                newPosition / 1000;

        } else {

            await soundRef.current
                .setPositionAsync(
                    newPosition
                );
        }

        setPositionMillis(
            newPosition
        );
    };

    const skipBackward = async () => {

        if (!soundRef.current) {
            return;
        }

        const newPosition =
            Math.max(
                positionMillis - 2000,
                0
            );

        if (Platform.OS === 'web') {

            soundRef.current.currentTime =
                newPosition / 1000;

        } else {

            await soundRef.current
                .setPositionAsync(
                    newPosition
                );
        }

        setPositionMillis(
            newPosition
        );
    };


    return (
        <View>
            <View style={styles.controls}>
                <AntDesign name="plus-circle" size={24} color="white" />
                <AntDesign name="minus-circle" size={24} color="white" />
            </View>

            <View style={styles.wrapper}>
                {/* Header label */}

                <View style={styles.headerRow}>
                    <Text style={styles.headerLabel}>Audio Waveform</Text>
                    <View style={styles.timeBadge}>
                        <Text style={styles.timeBadgeText}>{timeLabel}s</Text>
                    </View>
                </View>

                {/* Scrollable waveform area */}
                <View style={styles.scrollContainer}>
                    <ScrollView
                        ref={scrollRef}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        scrollEventThrottle={16}
                        onScroll={handleScroll}
                        // Disable scroll while dragging cursor so only the cursor moves
                        scrollEnabled={!isDragging}
                        style={styles.scroll}
                    >
                        {/* Waveform + tap target */}
                        <View
                            style={[styles.waveformCanvas, { width: totalWidth }]}
                            {...freshPan.panHandlers}
                        >
                            {/* Bars */}
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

                    {/* Cursor — rendered as an overlay OUTSIDE the ScrollView */}
                    <View
                        pointerEvents="none"
                        style={[
                            styles.cursor,
                            {
                                left: cursorScreenX - CURSOR_WIDTH / 2,
                                // hide cursor when scrolled off screen
                                opacity:
                                    cursorScreenX >= 0 && cursorScreenX <= screenWidth ? 1 : 0,
                            },
                        ]}
                    >
                        {/* Top diamond handle */}
                        <View style={styles.cursorHandle} />
                        {/* Vertical line */}
                        <View style={styles.cursorLine} />
                    </View>
                </View>

                {/* Time ruler ticks */}
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
        const x = t * PIXELS_PER_SECOND - scrollOffsetX;
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

    // Scroll + waveform
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

    // Cursor
    cursor: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        width: CURSOR_WIDTH + 12, // extra width for touch / handle
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

    // Ruler
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