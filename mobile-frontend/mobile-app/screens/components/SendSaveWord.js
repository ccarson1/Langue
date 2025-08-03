import React, { useState } from 'react';
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/HomeStyles';

export default function SaveWordButton({ payload, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);


  const saveWord = async () => {

    const hasEmptyField = Object.values(payload).some(
      value => value === null || value === undefined || value === ''
    );

    if (hasEmptyField) {
      onError?.('Please fill in all fields.');
      return;
    }

    setLoading(true);
    setButtonDisabled(true);

    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      console.log(accessToken);

      const response = await fetch('http://192.168.1.5:8000/api/save_word/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        onError?.(data.error);
        //Alert.alert('Error', data.error);
      } else {
        onSuccess?.('Word saved successfully!');
        //Alert.alert('Success', 'Word saved successfully!');
        console.log(data);
      }
    } catch (error) {
      console.error('Error saving word:', error);
      onError?.('Failed to save word. Please try again.');
      //Alert.alert('Error', 'Failed to save word. Please try again.');
    } finally {
      setLoading(false);
      setButtonDisabled(false);
    }
  };

  return (
    <View style={styles.saveBtn}>
      <TouchableOpacity

        onPress={saveWord}
        disabled={buttonDisabled}
      >
        <Text style={styles.buttonText}>Save Word</Text>
      </TouchableOpacity>
    </View>

  );
}
