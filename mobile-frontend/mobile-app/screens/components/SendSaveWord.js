import React, { useState } from 'react';
import { View, Button, Alert, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SaveWordButton({ payload }) {
  const [loading, setLoading] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);

  const saveWord = async () => {
    setLoading(true);
    setButtonDisabled(true);

    try {
      const accessToken = await AsyncStorage.getItem('accessToken');

      const response = await fetch('http://localhost:8000/api/save_word/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        Alert.alert('Error', data.error);
      } else {
        Alert.alert('Success', 'Word saved successfully!');
        console.log(data);
      }
    } catch (error) {
      console.error('Error saving word:', error);
      Alert.alert('Error', 'Failed to save word. Please try again.');
    } finally {
      setLoading(false);
      setButtonDisabled(false);
    }
  };

  return (
    <View style={{ marginTop: 10 }}>
      <Button title="Save Word" onPress={saveWord} disabled={buttonDisabled} />
      {loading && <ActivityIndicator style={{ marginTop: 5 }} />}
    </View>
  );
}
