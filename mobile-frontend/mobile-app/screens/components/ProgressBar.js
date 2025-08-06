import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';

const ProgressBar = ({ progress }) => {
    const animatedWidth = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(animatedWidth, {
            toValue: progress,
            duration: 300, // Duration in ms
            useNativeDriver: false, // Width cannot use native driver
        }).start();
    }, [progress]);

    const widthInterpolated = animatedWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View style={styles.container}>
            <Animated.View style={[styles.progress, { width: widthInterpolated }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 10,
        width: '100%',
        backgroundColor: '#e0e0e0',
        borderRadius: 5,
        overflow: 'hidden',
        marginVertical: 10,
    },
    progress: {
        height: '100%',
        backgroundColor: '#4caf50',
    },
});

export default ProgressBar;