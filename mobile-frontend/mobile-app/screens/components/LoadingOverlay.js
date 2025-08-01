import React from 'react';
import { View, ActivityIndicator, StyleSheet, Modal } from 'react-native';

const LoadingOverlay = ({ visible }) => {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
    >
      <View style={styles.overlay}>
        <ActivityIndicator size="large" color="#ffffff" />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // semi-transparent black
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default LoadingOverlay;
