import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import AntDesign from '@expo/vector-icons/AntDesign';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/SettingsStyles';
import config from '../utils/config';

export default function SettingsScreen({ navigation }) {
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [profilePrivate, setProfilePrivate] = useState(false);
  const [token, setToken] = useState(null);
  const [languages, setLanguages] = useState([]);
  const server = config.SERVER_IP;

  const fetchLanguages = async () => {
    try {
      const res = await fetch(`http://${server}:8000/api/languages/`);
      const data = await res.json();
      setLanguages(data); // assuming data is an array of { id, lang_name }
    } catch (err) {
      console.error('Failed to fetch languages:', err);
      Alert.alert('Error', 'Failed to load language options.');
    }
  };

  useEffect(() => {
    const loadTokenAndSettings = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('accessToken');
        if (!storedToken) {
          Alert.alert('Error', 'No access token found. Please log in.');
          return;
        }
        setToken(storedToken);

        const decoded = jwtDecode(storedToken);
        console.log('Decoded token:', decoded);

        const response = await fetch(`http://${server}:8000/api/settings/`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`,
          },
        });

        const settings = await response.json();
        setNativeLanguage(settings.native_language);
        setTargetLanguage(settings.target_language);
        setNotificationsEnabled(settings.notifications ?? false);
        setProfilePrivate(settings.privacy ?? false);

      } catch (err) {
        Alert.alert('Error', 'Failed to load settings: ' + err.message);
      }
    };

    fetchLanguages(); // <--- fetch language options
    loadTokenAndSettings(); // <--- fetch user settings
  }, []);

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Error', 'No access token found. Please log in.');
      return;
    }

    try {
      const response = await fetch(`http://${server}:8000/api/settings/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          native_language: nativeLanguage,
          target_language: targetLanguage,
          notifications: notificationsEnabled,
          privacy: profilePrivate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Save Failed', data.error || 'Unknown error');
      } else {
        Alert.alert('Success', 'Settings saved successfully.');
      }
    } catch (err) {
      Alert.alert('Error', err.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <AntDesign name="back" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.settingsBox}>
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={nativeLanguage}
            onValueChange={setNativeLanguage}
            style={styles.picker}
            dropdownIconColor="white"
          >
            {languages.map((lang) => (
              <Picker.Item key={lang.id} label={lang.lang_name} value={lang.lang_name} />
            ))}
          </Picker>

          {Platform.OS === 'web' && (
            <View style={styles.arrowWrapper}>
              <AntDesign name="down" size={16} color="#eeeeee" />
            </View>
          )}
        </View>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={targetLanguage}
            onValueChange={setTargetLanguage}
            style={styles.picker}
            dropdownIconColor="white"
          >
            {languages.map((lang) => (
              <Picker.Item key={lang.id} label={lang.lang_name} value={lang.lang_name} />
            ))}
          </Picker>

          {Platform.OS === 'web' && (
            <View style={styles.arrowWrapper}>
              <AntDesign name="down" size={16} color="#eeeeee" />
            </View>
          )}
        </View>



        <View style={styles.checkboxRow}>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#777', true: '#00adb5' }}
            thumbColor={Platform.OS === 'android' ? '#eeeeee' : ''}
          />
          <Text style={styles.checkboxLabel}>Enable Notifications</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
