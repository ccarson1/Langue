// components/AnimatedVisualizer.js
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

export default function AudioVisualizer({ frequencies, width = 200, height = 50, barWidth = 4 }) {
    const [bars, setBars] = useState(frequencies || []);

    // Animate by updating bars periodically
    useEffect(() => {
        const interval = setInterval(() => {
            // Randomize for now (replace this with real FFT data)
            const newBars = frequencies.map(val => Math.min(255, Math.max(0, val + (Math.random() * 20 - 10))));
            setBars(newBars);
        }, 50); // update 20x/sec
        return () => clearInterval(interval);
    }, [frequencies]);

    const barGap = 2;
    const totalBarWidth = barWidth + barGap;

    return (
        <Svg width={width} height={height}>
            {bars.map((value, index) => {
                const barHeight = (value / 255) * height;
                return (
                    <Rect
                        key={index}
                        x={index * totalBarWidth}
                        y={height - barHeight}
                        width={barWidth}
                        height={barHeight}
                        fill="#00adb5"
                        rx={2}
                    />
                );
            })}
        </Svg>
    );
}
