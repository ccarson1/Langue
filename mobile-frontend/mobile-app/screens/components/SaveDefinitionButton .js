import React, { useState, useEffect } from 'react';
import { View, Alert, Text, TouchableOpacity,StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerIP } from '../../utils/config';
import CustomPopup from './CustomPopup';


export default function SaveDefinitionButton({ payload, definitions, showSuccess, showError }) {
  const [loading, setLoading] = useState(false);
  const [buttonDisabled, setButtonDisabled] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
  console.log(`SendSaveDefinition popup: `)
  console.log(popup)
  const [serverIP, setServerIP] = useState('');
  console.log(payload);
  console.log(definitions);
  // const showSuccess = (message) => {
  //   setPopup({ visible: true, message: message, type: 'success' });
  // };

  // const showError = (message) => {
  //   setPopup({ visible: true, message: message, type: 'error' });
  // };

  useEffect(() => {
    const loadIP = async () => {
      const ip = await getServerIP();
      setServerIP(ip);
    };
    loadIP();
  }, []);

  const saveDefinition = async () => {

    const hasEmptyField = Object.values(payload).some(
      value => value === null || value === undefined || value === ''
    );

    if (hasEmptyField) {
      //onError?.('Please fill in all fields.');
      showError(data.error);
      return;
    }
    console.log(payload);
    console.log(definitions);

    setLoading(true);
    setButtonDisabled(true);

    try {
      const accessToken = await AsyncStorage.getItem('accessToken');
      console.log(accessToken);

      const response = await fetch(`http://${serverIP}:8000/api/save_word/`, {
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
        showSuccess('Definition saved successfully!');
        definitions.push(payload["definition"])
        //Alert.alert('Success', 'Word saved successfully!');
        console.log(data);
      }
    } catch (error) {
      console.error('Error saving definition:', error);
      //onError?.('Failed to save definition. Please try again.');
      showError('Error saving definition:', error);
      //Alert.alert('Error', 'Failed to save definition. Please try again.');
    } finally {
      setLoading(false);
      setButtonDisabled(false);
    }
  };

  return (
    <View>
      <View style={styles.saveBtn}>
        <TouchableOpacity

          onPress={saveDefinition}
          disabled={buttonDisabled}
        >
          <Text style={styles.buttonText}>Save Definition</Text>
        </TouchableOpacity>
      </View>
      {/* <View>
        <CustomPopup
          visible={popup.visible}
          message={popup.message}
          type={popup.type}
          onClose={() => setPopup({ ...popup, visible: false })}
        />
      </View> */}
    </View>


  );
}
const styles = StyleSheet.create({
  saveBtn: {
    position: 'absolute',
    // top: 10,
    right: 100,
    backgroundColor: '#00adb5',
    padding: 10,
    borderRadius: 5,
    minWidth: 130,
    shadowColor: '#30475e',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,

    // Android shadow
    elevation: 4,
  },
  buttonText: {
            color: 'black',
            fontWeight: 'bold',
        },

});

