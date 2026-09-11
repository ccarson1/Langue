import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    Pressable,
    PanResponder,
    ActivityIndicator,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';

function Player({ source }) {
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const barWidthRef = useRef(0);
    const barXRef = useRef(0);
    const shouldAutoPlayRef = useRef(false);


    const progressWidthRef = useRef(0);
    const progressXRef = useRef(0);
    const progressDraggingRef = useRef(false);
    const progressPointerIdRef = useRef(null);

    // Measured explicitly via onLayout rather than relying on CSS
    // aspect-ratio — on web, expo-video's underlying <video> element can
    // lag behind a live container resize and get clipped by
    // overflow:hidden until something forces a re-measure. Driving both
    // the wrapper height and the video's pixel size off the same
    // onLayout callback keeps them in sync on every resize event.
    const [containerWidth, setContainerWidth] = useState(0);
    const containerHeight = containerWidth * (9 / 16);
    const MIN_BUFFER_SECONDS = 6;
    const [hasRetried, setHasRetried] = useState(false);


    const handleWrapperLayout = (event) => {
        const { width: measuredWidth } = event.nativeEvent.layout;
        if (measuredWidth !== containerWidth) {
            setContainerWidth(measuredWidth);
        }
    };

    const isHLS = source?.includes('.m3u8');

    const player = useVideoPlayer(
        {
            uri: source,
            ...(isHLS ? { contentType: 'hls' } : {}),
        },
        (player) => {
            player.timeUpdateEventInterval = 0.25;
        }
    );


    const { status } = useEvent(player, 'statusChange', {
        status: 'loading',
    });

    const { currentTime = 0 } = useEvent(player, 'timeUpdate', {
        currentTime: 0,
    });

    useEffect(() => {
        console.log('Video status:', status);

        if (status === 'loading') {
            console.log('Video is loading');

            // Do not show the loading overlay if playback is already running.
            if (!player.playing) {
                setIsLoading(true);
            }

            return;
        }

        if (status === 'error') {
            console.error('VIDEO ERROR:', player.error);
            console.error('VIDEO ERROR JSON:', JSON.stringify(player.error));
            console.error('VIDEO ERROR MESSAGE:', player.error?.message);
            console.error('VIDEO ERROR CODE:', player.error?.code);
            console.error('VIDEO SOURCE:', source);

            if (!hasRetried) {
                console.log('VIDEO ERROR - RETRYING STREAM');

                setHasRetried(true);
                setIsLoading(true);

                player.pause();

                player.replace({
                    uri: source,
                    ...(isHLS ? { contentType: 'hls' } : {}),
                });

                return;
            }

            console.error('VIDEO ERROR - RETRY FAILED');

            setIsLoading(false);
            return;
        }

        if (status === 'readyToPlay') {
            console.log('Video is ready');

            // If playback is already running, the stream is already usable.
            if (player.playing) {
                setIsLoading(false);
                return;
            }

            setIsLoading(true);

            let timer = null;

            const checkBuffer = async () => {
                const buffered = player.bufferedPosition;
                const current = player.currentTime;

                console.log(
                    'BUFFER CHECK:',
                    'current =', current,
                    'buffered =', buffered,
                    'ahead =', buffered - current
                );

                if (
                    Number.isFinite(buffered) &&
                    Number.isFinite(current) &&
                    buffered - current >= MIN_BUFFER_SECONDS
                ) {
                    console.log(
                        'BUFFER READY:',
                        buffered - current,
                        'seconds'
                    );

                    setIsLoading(false);
                    if (shouldAutoPlayRef.current && !player.playing) {
                        console.log('BUFFER READY - AUTO PLAYING');

                        try {
                            await player.play();
                            console.log('AUTO PLAY COMPLETED');
                        } catch (error) {
                            console.error('AUTO PLAY ERROR:', error);
                        }
                    }
                    return;
                }

                timer = setTimeout(checkBuffer, 250);
            };

            checkBuffer();

            return () => {
                if (timer !== null) {
                    clearTimeout(timer);
                }
            };
        }
    }, [status, player, source]);



    const rawDuration = player.duration;
    const duration = Number.isFinite(rawDuration) && rawDuration > 0
        ? rawDuration
        : 0;

    const formatTime = (seconds = 0) => {
        if (!isFinite(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleProgressBarLayout = (event) => {
        const { width, x } = event.nativeEvent.layout;

        progressWidthRef.current = width;
        progressXRef.current = x;
    };

    const seekFromX = (x, width = progressWidthRef.current) => {
        if (!Number.isFinite(x)) return;
        if (!Number.isFinite(width) || width <= 0) return;
        if (!Number.isFinite(duration) || duration <= 0) return;

        const ratio = Math.min(
            Math.max(x / width, 0),
            1
        );

        const newTime = ratio * duration;

        if (!Number.isFinite(newTime)) return;

        try {
            player.currentTime = newTime;
        } catch (error) {
            console.warn('Seek failed:', error);
        }
    };

    const handleProgressGesture = (pageX) => {
        const width = progressWidthRef.current;
        const barX = progressXRef.current;

        if (!width || !duration) return;

        const x = pageX - barX;

        seekFromX(x);
    };

    const handlePlayPause = async () => {
        console.log('PLAY BUTTON PRESSED');
        console.log('Status at play:', status);
        console.log('Player playing:', player.playing);

        try {
            if (player.playing) {
                shouldAutoPlayRef.current = false;
                player.pause();
            } else {
                shouldAutoPlayRef.current = true;

                console.log('Calling player.play()...');
                await player.play();
                console.log('player.play() completed');
            }
        } catch (error) {
            console.error('Video playback error:', error);
        }
    };

    const handleToggleMute = () => {
        const next = !muted;
        setMuted(next);
        player.muted = next;
    };

    const handleVolumeBarLayout = (event) => {
        const { width, x } = event.nativeEvent.layout;

        barWidthRef.current = width;
        barXRef.current = x;
    };

    const setVolumeFromX = (x) => {
        const width = barWidthRef.current;

        if (!width) return;

        const ratio = Math.min(
            Math.max(x / width, 0),
            1
        );

        setVolume(ratio);
        player.volume = ratio;

        // Automatically unmute when volume is raised
        if (ratio > 0 && muted) {
            setMuted(false);
            player.muted = false;
        }
    };

    const handleVolumeGesture = (pageX) => {
        const width = barWidthRef.current;
        const barX = barXRef.current;

        if (!width) return;

        const x = pageX - barX;

        setVolumeFromX(x);
    };

    const volumePanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,

            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (event) => {
                handleVolumeGesture(event.nativeEvent.pageX);
            },

            onPanResponderMove: (event) => {
                handleVolumeGesture(event.nativeEvent.pageX);
            },
        })
    ).current;

    const progressPanResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,

            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (event) => {
                handleProgressGesture(
                    event.nativeEvent.pageX
                );
            },

            onPanResponderMove: (event) => {
                handleProgressGesture(
                    event.nativeEvent.pageX
                );
            },
        })
    ).current;

    const handleVolumePointerDown = (event) => {
        event.currentTarget.setPointerCapture?.(event.pointerId);

        const rect = event.currentTarget.getBoundingClientRect();

        const x = event.clientX - rect.left;

        setVolumeFromX(x);
    };

    const handleVolumePointerMove = (event) => {
        if (event.buttons !== 1) return;

        const rect = event.currentTarget.getBoundingClientRect();

        const x = event.clientX - rect.left;

        setVolumeFromX(x);
    };

    const handleVolumePointerUp = (event) => {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
    };

    const handleProgressPointerDown = (event) => {
        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();

        const width = rect.width;

        if (!Number.isFinite(width) || width <= 0) return;
        if (!Number.isFinite(duration) || duration <= 0) return;

        progressDraggingRef.current = true;
        progressPointerIdRef.current = event.pointerId;

        element.setPointerCapture?.(event.pointerId);

        const x = event.clientX - rect.left;

        seekFromX(x, width);
    };

    const handleProgressPointerMove = (event) => {
        if (!progressDraggingRef.current) return;

        if (
            progressPointerIdRef.current !== null &&
            event.pointerId !== progressPointerIdRef.current
        ) {
            return;
        }

        const element = event.currentTarget;
        const rect = element.getBoundingClientRect();

        const width = rect.width;

        if (!Number.isFinite(width) || width <= 0) return;
        if (!Number.isFinite(duration) || duration <= 0) return;

        const x = event.clientX - rect.left;

        seekFromX(x, width);
    };

    const handleProgressPointerUp = (event) => {
        const element = event.currentTarget;

        progressDraggingRef.current = false;

        try {
            if (
                progressPointerIdRef.current !== null &&
                element.hasPointerCapture?.(progressPointerIdRef.current)
            ) {
                element.releasePointerCapture(
                    progressPointerIdRef.current
                );
            }
        } catch (error) {
            // Pointer may already have been released.
        }

        progressPointerIdRef.current = null;
    };
    const effectiveVolume = muted ? 0 : volume;

    return (
        <View
            style={[
                styles.playerWrapper,
                containerWidth > 0 && { height: containerHeight },
            ]}
            onLayout={handleWrapperLayout}
        >
            {/*
              pointerEvents="none" stops the native video surface from
              swallowing touches on iOS/Android. Without this, wrapping
              VideoView in a Pressable doesn't reliably register taps on
              native — only on web, where video is a normal DOM element.
            */}
            <VideoView
                style={[
                    styles.video,
                    containerWidth > 0 && {
                        width: containerWidth,
                        height: containerHeight,
                    },
                ]}
                player={player}
                nativeControls={false}
                contentFit="contain"
                pointerEvents="none"
            />

            {isLoading && (
                <View style={styles.loadingOverlay} pointerEvents="auto">
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.loadingText}>
                        Loading stream...
                    </Text>
                </View>
            )}

            {/*
              Dedicated tap-to-toggle layer, rendered as a sibling ON TOP
              of the video rather than wrapping it. Being a plain RN
              Pressable (not a native video surface), it reliably
              receives touch on both web and native.
            */}
            <Pressable
                style={styles.tapLayer}
                onPress={handlePlayPause}
            >
                {!player.playing && !isLoading && (
                    <View style={styles.centerIconWrapper} pointerEvents="none">
                        <View style={styles.centerIconCircle}>
                            <Text style={styles.centerIcon}>▶</Text>
                        </View>
                    </View>
                )}
            </Pressable>

            {/* Scrim + controls render after the tap layer, so they sit
                above it and intercept their own touches first. */}
            <View style={styles.scrim} pointerEvents="none" />


            <View style={styles.controls}>
                <View
                    style={styles.progressBarTrack}
                    onLayout={handleProgressBarLayout}
                    {...(Platform.OS === 'web'
                        ? {
                            onPointerDown: handleProgressPointerDown,
                            onPointerMove: handleProgressPointerMove,
                            onPointerUp: handleProgressPointerUp,
                        }
                        : progressPanResponder.panHandlers
                    )}
                >
                    <View style={styles.progressBarBackground} />

                    <View
                        style={[
                            styles.progressBarFill,
                            {
                                width:
                                    Number.isFinite(duration) && duration > 0 && Number.isFinite(currentTime)
                                        ? `${Math.min((currentTime / duration) * 100, 100)}%`
                                        : '0%',
                            },
                        ]}
                    />

                    <View
                        style={[
                            styles.progressBarThumb,
                            {
                                left:
                                    Number.isFinite(duration) && duration > 0 && Number.isFinite(currentTime)
                                        ? `${Math.min((currentTime / duration) * 100, 100)}%`
                                        : '0%',
                            },
                        ]}
                    />
                </View>

                <View style={styles.controlRow}>
                    <View style={styles.timeBadge}>
                        <Text style={styles.time}>
                            {formatTime(currentTime)}
                            {duration > 0
                                ? ` / ${formatTime(duration)}`
                                : ''}
                        </Text>
                    </View>

                    <View style={styles.volumeControl}>
                        <Pressable style={styles.volumeIconButton} onPress={handleToggleMute}>
                            <Text style={styles.volumeIcon}>
                                {effectiveVolume === 0 ? '🔇' : effectiveVolume < 0.5 ? '🔉' : '🔊'}
                            </Text>
                        </Pressable>

                        {Platform.OS === 'web' ? (
                            <View
                                style={styles.volumeBarTrack}
                                onLayout={handleVolumeBarLayout}
                                onPointerDown={handleVolumePointerDown}
                                onPointerMove={handleVolumePointerMove}
                                onPointerUp={handleVolumePointerUp}
                            >
                                <View style={styles.volumeBarBackground} />

                                <View
                                    style={[
                                        styles.volumeBarFill,
                                        {
                                            width: `${effectiveVolume * 100}%`,
                                        },
                                    ]}
                                />

                                <View
                                    style={[
                                        styles.volumeBarThumb,
                                        {
                                            left: `${effectiveVolume * 100}%`,
                                        },
                                    ]}
                                />
                            </View>
                        ) : (
                            <View
                                style={styles.volumeBarTrack}
                                onLayout={handleVolumeBarLayout}
                                {...volumePanResponder.panHandlers}
                            >
                                <View style={styles.volumeBarBackground} />

                                <View
                                    style={[
                                        styles.volumeBarFill,
                                        {
                                            width: `${effectiveVolume * 100}%`,
                                        },
                                    ]}
                                />

                                <View
                                    style={[
                                        styles.volumeBarThumb,
                                        {
                                            left: `${effectiveVolume * 100}%`,
                                        },
                                    ]}
                                />
                            </View>
                        )}
                    </View>
                </View>
            </View>

        </View>
    );
}

export default function VideoReader({
    selectedChannel,
    recordingSelected,
    serverIP,
}) {
    if (!selectedChannel) {
        return null;
    }

    const API_BASE = `http://${serverIP}:8000`;

    const source = recordingSelected
        ? selectedChannel.record_file?.startsWith('http')
            ? selectedChannel.record_file
            : `${API_BASE}${selectedChannel.record_file}`
        : selectedChannel.url;

    if (!source) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Player
                key={source}
                source={source}
            />
        </View>
    );
}

const COLORS = {
    background: '#1b1f2a',
    accent: '#00b8c4',
    text: '#f5f7fa',
    textMuted: 'rgba(245, 247, 250, 0.75)',
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
    },

    playerWrapper: {
        width: '100%',
        // Fallback size before the first onLayout measurement comes in;
        // replaced immediately by the measured height once available.
        aspectRatio: 16 / 9,
        backgroundColor: COLORS.background,
        borderRadius: Platform.OS === 'web' ? 12 : 0,
        overflow: 'hidden',

        ...Platform.select({
            web: {
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
            },
            default: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.25,
                shadowRadius: 8,
                elevation: 5,
            },
        }),
    },

    video: {
        position: 'absolute',
        top: 0,
        left: 0,
    },

    tapLayer: {
        ...StyleSheet.absoluteFillObject,
        ...Platform.select({
            web: { cursor: 'pointer' },
        }),
    },

    centerIconWrapper: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },

    centerIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    centerIcon: {
        color: COLORS.text,
        fontSize: 20,
        marginLeft: 3, // optical centering for the play triangle
    },

    scrim: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: 82,
        backgroundColor: 'rgba(10, 12, 18, 0.65)',
    },

    overlay: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    timeBadge: {
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
    },

    time: {
        color: COLORS.text,
        fontSize: 13,
        fontVariant: ['tabular-nums'],
        fontWeight: '500',
    },

    volumeControl: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    volumeIconButton: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        ...Platform.select({
            web: { cursor: 'pointer' },
        }),
    },

    volumeIcon: {
        fontSize: 14,
    },

    volumeBarTrack: {
        width: 80,
        height: 30,
        justifyContent: 'center',

        ...Platform.select({
            web: {
                cursor: 'pointer',
                touchAction: 'none',
            },
        }),
    },

    volumeBarBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },

    volumeBarFill: {
        position: 'absolute',
        left: 0,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.accent,
    },

    volumeBarThumb: {
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: COLORS.text,
        marginLeft: -5,
        ...Platform.select({
            web: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
            },
        }),
    },
    controls: {
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
    },
    progressBarTrack: {
        width: '100%',
        height: 24,
        justifyContent: 'center',

        ...Platform.select({
            web: {
                cursor: 'pointer',
                touchAction: 'none',
                userSelect: 'none',
            },
        }),
    },

    progressBarBackground: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
    },

    progressBarFill: {
        position: 'absolute',
        left: 0,
        height: 4,
        borderRadius: 2,
        backgroundColor: COLORS.accent,
    },

    progressBarThumb: {
        position: 'absolute',
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: COLORS.text,
        marginLeft: -6,

        ...Platform.select({
            web: {
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
            },
        }),
    },

    controlRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    loadingText: {
        color: COLORS.text,
        fontSize: 14,
        marginTop: 10,
    },

});