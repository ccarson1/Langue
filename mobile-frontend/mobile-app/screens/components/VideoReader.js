import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Platform,
    Pressable,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';

function Player({ source }) {
    const [volume, setVolume] = useState(1);
    const [muted, setMuted] = useState(false);
    const barWidthRef = useRef(0);

    // Measured explicitly via onLayout rather than relying on CSS
    // aspect-ratio — on web, expo-video's underlying <video> element can
    // lag behind a live container resize and get clipped by
    // overflow:hidden until something forces a re-measure. Driving both
    // the wrapper height and the video's pixel size off the same
    // onLayout callback keeps them in sync on every resize event.
    const [containerWidth, setContainerWidth] = useState(0);
    const containerHeight = containerWidth * (9 / 16);

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

    const { currentTime = 0 } = useEvent(player, 'timeUpdate', {
        currentTime: 0,
    });

    const duration = player.duration || 0;

    const formatTime = (seconds = 0) => {
        if (!isFinite(seconds) || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePlayPause = async () => {
        try {
            if (player.playing) {
                player.pause();
            } else {
                await player.play();
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
        barWidthRef.current = event.nativeEvent.layout.width;
    };

    const handleVolumeChange = (event) => {
        const width = barWidthRef.current;
        if (!width) return;

        const x = event.nativeEvent.locationX;
        const ratio = Math.min(Math.max(x / width, 0), 1);

        setVolume(ratio);
        player.volume = ratio;

        // Unmute automatically if user drags volume up from 0
        if (ratio > 0 && muted) {
            setMuted(false);
            player.muted = false;
        }
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
                {!player.playing && (
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

            <View style={styles.overlay}>
                <View style={styles.timeBadge}>
                    <Text style={styles.time}>
                        {formatTime(currentTime)}
                        {duration > 0 ? ` / ${formatTime(duration)}` : ''}
                    </Text>
                </View>

                <View style={styles.volumeControl}>
                    <Pressable style={styles.volumeIconButton} onPress={handleToggleMute}>
                        <Text style={styles.volumeIcon}>
                            {effectiveVolume === 0 ? '🔇' : effectiveVolume < 0.5 ? '🔉' : '🔊'}
                        </Text>
                    </Pressable>

                    <Pressable
                        style={styles.volumeBarTrack}
                        onLayout={handleVolumeBarLayout}
                        onPress={handleVolumeChange}
                    >
                        <View style={styles.volumeBarBackground} />
                        <View
                            style={[
                                styles.volumeBarFill,
                                { width: `${effectiveVolume * 100}%` },
                            ]}
                        />
                        <View
                            style={[
                                styles.volumeBarThumb,
                                { left: `${effectiveVolume * 100}%` },
                            ]}
                        />
                    </Pressable>
                </View>
            </View>
        </View>
    );
}

export default function VideoReader({ selectedChannel }) {
    if (!selectedChannel?.url) {
        return null;
    }

    return (
        <View style={styles.container}>
            <Player key={selectedChannel.url} source={selectedChannel.url} />
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
        height: 56,
        backgroundColor: 'rgba(10, 12, 18, 0.55)',
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
        height: 20,
        justifyContent: 'center',
        ...Platform.select({
            web: { cursor: 'pointer' },
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
});