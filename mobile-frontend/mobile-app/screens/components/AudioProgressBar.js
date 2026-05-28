import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';

export default function AudioProgressBar({
    soundRef,
    playbackStatus,
}) {

    const position =
        (playbackStatus?.positionMillis || 0) / 1000;

    const duration =
        playbackStatus?.isLoaded && playbackStatus?.durationMillis > 0
            ? playbackStatus.durationMillis / 1000
            : 0;

    const safeDuration = Math.max(duration, position, 1);

    const handleSlide = async (value) => {

        if (!soundRef?.current) return;

        try {

            if (Platform.OS === 'web') {

                soundRef.current.audioElement.currentTime = value;

            } else {

                await soundRef.current.setPositionAsync(
                    value * 1000
                );
            }

        } catch (e) {
            console.error("Seek error:", e);
        }
    };

    return (
        <View style={styles.container}>

            <Text style={styles.timeText}>
                {formatTime(position)}
            </Text>

            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={Math.max(duration, 1)}
                value={Math.min(position, duration || 0)}
                minimumTrackTintColor="#00adb5"
                maximumTrackTintColor="#222"
                thumbTintColor="#00adb5"
                onSlidingComplete={handleSlide}
            />

            <Text style={styles.timeText}>
                {formatTime(duration)}
            </Text>

        </View>
    );
}

const formatTime = (seconds) => {

    if (!isFinite(seconds)) return '0:00';

    const mins = Math.floor(seconds / 60);

    const secs = Math.floor(seconds % 60);

    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        paddingHorizontal: 10,
    },

    slider: Platform.OS === 'web'
        ? {
            width: 300,
            marginHorizontal: 10,
        }
        : {
            flex: 1,
            marginHorizontal: 10,
        },

    timeText: {
        color: 'white',
        fontSize: 12,
        width: 40,
        textAlign: 'center',
    },
});