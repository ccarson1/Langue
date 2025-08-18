import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Slider from '@react-native-community/slider';

export default function AudioProgressBar({ soundRef, isPlaying }) {
    const [position, setPosition] = useState(0);
    const [duration, setDuration] = useState(1);

    useEffect(() => {
        if (!soundRef?.current) return;

        // only for native (Expo AV)
        if (Platform.OS !== 'web') {
            const subscription = soundRef.current.setOnPlaybackStatusUpdate((status) => {
                if (!status.isLoaded) return;
                setPosition(status.positionMillis / 1000);
                setDuration((status.durationMillis ?? 1000) / 1000);
            });

            return () => {
                // clear listener when component unmounts
                soundRef.current.setOnPlaybackStatusUpdate(null);
            };
        }
    }, [soundRef]);

    const handleSlide = async (value) => {
        if (!soundRef?.current) return;

        if (Platform.OS === 'web') {
            soundRef.current.audioElement.currentTime = value;
            setPosition(value);
        } else {
            await soundRef.current.setPositionAsync(value * 1000);
            setPosition(value);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.timeText}>{formatTime(position)}</Text>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={duration}
                value={position}
                minimumTrackTintColor="#00adb5"
                maximumTrackTintColor="#222"
                thumbTintColor="#00adb5"
                onSlidingComplete={handleSlide}
            />
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
        </View>
    );
}

const formatTime = (seconds) => {
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
    slider: {
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
