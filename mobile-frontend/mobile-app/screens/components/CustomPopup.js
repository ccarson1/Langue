import React, { useEffect } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

const CustomPopup = ({ visible, message, type = 'success', duration = 3000, onClose }) => {
  const translateY = new Animated.Value(-100); // start hidden above screen

  useEffect(() => {
    if (visible) {
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(duration),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onClose) onClose();
      });
    }
  }, [visible]);

  const bgColor = type === 'success' ? '#4CAF50' : '#F44336';

  return (
    <Animated.View style={[styles.container, { transform: [{ translateY }], backgroundColor: bgColor }]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    zIndex: 1000,
    elevation: 4,
  },
  text: {
    color: 'white',
    fontWeight: '600',
    fontSize: 16,
  },
});

export default CustomPopup;
