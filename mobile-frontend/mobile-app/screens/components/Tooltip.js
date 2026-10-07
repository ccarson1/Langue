import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

const Tooltip = ({ text, children }) => {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <TouchableOpacity
        onPress={() => setVisible(!visible)}
        activeOpacity={0.7}
      >
        {children}
      </TouchableOpacity>

      {visible && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipText}>{text}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
  },

  tooltip: {
    position: 'absolute',
    bottom: 30,
    backgroundColor: '#333',
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 5,
    width: 220,
    zIndex: 1000,
    elevation: 5,
  },

  tooltipText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default Tooltip;