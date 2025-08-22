import React, { useState } from 'react';
import { View, Alert, Text, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import styles from '../styles/HomeStyles';
import config from '../../utils/config';
import CustomPopup from './CustomPopup';


export default function SaveWordButton({ payload, words, onSuccess, onError }) {
  const [loading, setLoading] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
  console.log(`SendSaveWord popup: `)
  console.log(popup)
  const server = config.SERVER_IP;
  console.log(payload);
  console.log(words);
  const showSuccess = (message) => {
    setPopup({ visible: true, message: message, type: 'success' });
  };

  const showError = (message) => {
    setPopup({ visible: true, message: message, type: 'error' });
  };


  const saveWord = async () => {

    const hasEmptyField = Object.values(payload).some(
      value => value === null || value === undefined || value === ''
    );

    if (hasEmptyField) {
      onError?.('Please fill in all fields.');
      return;
    }
    console.log(payload);
    console.log(words);

    setLoading(true);
    setButtonDisabled(true);

    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      console.log(accessToken);

      const response = await fetch(`http://${server}:8000/api/save_word/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.error) {
        //onError?.(data.error);
        showError(data.error);
        //Alert.alert('Error', data.error);
      } else {
        //onSuccess?.('Word saved successfully!');
        showSuccess('Word saved successfully!');
        words.push(payload["definition"])
        //Alert.alert('Success', 'Word saved successfully!');
        console.log(data);
      }
    } catch (error) {
      console.error('Error saving word:', error);
      //onError?.('Failed to save word. Please try again.');
      showError('Error saving word:', error);
      //Alert.alert('Error', 'Failed to save word. Please try again.');
    } finally {
      setLoading(false);
      setButtonDisabled(false);
    }
  };

  return (
    <View>
      <View style={styles.saveBtn}>
        <TouchableOpacity

          onPress={saveWord}
          disabled={buttonDisabled}
        >
          <Text style={styles.buttonText}>Save Word</Text>
        </TouchableOpacity>
      </View>
      <View>
        <CustomPopup
          visible={popup.visible}
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup({ ...popup, visible: false })}
        />
      </View>
    </View>


  );
}
