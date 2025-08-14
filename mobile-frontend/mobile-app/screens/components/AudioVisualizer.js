import React, { useEffect, useState, useRef } from 'react';
import { TouchableOpacity, View, Platform } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Svg, { Rect } from 'react-native-svg';

export default function AudioVisualizer({
  soundRef,       // <-- pass soundRef from LessonsScreen
  isPlaying,
  onPlay,
  onPause,
  width = 200,
  height = 100,
  barWidth = 4,
  barCount = 16,
}) {
  const [bars, setBars] = useState(Array(barCount).fill(0));
  const animationRef = useRef(null);

  useEffect(() => {
    if (!isPlaying || !soundRef?.current) {
      setBars(Array(barCount).fill(0));
      return;
    }

    if (Platform.OS === 'web') {
      // WEB: use analyser attached to the audio element
      const analyser = soundRef.current.analyser;
      if (!analyser) return;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const frame = () => {
        analyser.getByteFrequencyData(dataArray);
        setBars(Array.from(dataArray).slice(0, barCount));
        animationRef.current = requestAnimationFrame(frame);
      };
      frame();

      return () => cancelAnimationFrame(animationRef.current);
    } else {
      // MOBILE: fake visualizer using random values while audio is playing
      const update = () => {
        if (soundRef.current) {
          setBars(Array.from({ length: barCount }, () =>
            Math.floor(Math.random() * 255)
          ));
          animationRef.current = setTimeout(update, 100);
        }
      };
      update();

      return () => clearTimeout(animationRef.current);
    }
  }, [isPlaying, soundRef]);

  const barGap = 2;
  const totalBarWidth = barWidth + barGap;

  return (
    <TouchableOpacity onPress={isPlaying ? onPause : onPlay}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
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
        <FontAwesome
          name={isPlaying ? "pause" : "play"}
          size={24}
          color="white"
          style={{ marginLeft: -50 }}
        />
      </View>
    </TouchableOpacity>
  );
}
