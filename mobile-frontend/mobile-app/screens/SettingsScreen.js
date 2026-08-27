import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Picker } from '@react-native-picker/picker';
import AntDesign from '@expo/vector-icons/AntDesign';
import { jwtDecode } from 'jwt-decode';
import styles from './styles/SettingsStyles';
import { getServerIP } from '../utils/config';


export default function SettingsScreen({ navigation }) {
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [dictionaries, setDictionaries] = useState([]);
  const [selectedDictionary, setSelectedDictionary] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [loadedModels, setLoadedModels] = useState([]);
  const [profilePrivate, setProfilePrivate] = useState(false);
  const [token, setToken] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [serverIP, setServerIP] = useState('');

  const fetchLanguages = async () => {
    if (!serverIP) return;
    try {
      const res = await fetch(`http://${serverIP}:8000/api/languages/`);
      const data = await res.json();
      setLanguages(data); // assuming data is an array of { id, lang_name }
    } catch (err) {
      console.error('Failed to fetch languages:', err);
      Alert.alert('Error', 'Failed to load language options.');
    }
  };

  const fetchTranslationModels = async () => {
    try {
      const storedToken = await AsyncStorage.getItem(
        'accessToken'
      );

      const res = await fetch(
        `http://${serverIP}:8000/api/translation-models/`,
        {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.detail || 'Failed to load translation models'
        );
      }

      setLoadedModels(data);

    } catch (err) {
      console.error(
        'Failed to fetch translation models:',
        err
      );

      Alert.alert(
        'Error',
        'Failed to load translation models.'
      );
    }
  };

  const fetchDictionaries = async (language) => {

    try {

      const token = await AsyncStorage.getItem(
        'accessToken'
      );

      const res = await fetch(
        `http://${serverIP}:8000/api/dictionaries/?language=${language}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      const data = await res.json();

      setDictionaries(data);

    } catch (err) {

      console.error(err);

      Alert.alert(
        'Error',
        'Failed to load dictionaries'
      );
    }
  };

  useEffect(() => {
    const loadIP = async () => {
      const ip = await getServerIP();
      setServerIP(ip);
    };
    loadIP();
  }, []);

  useEffect(() => {
    if (!serverIP) return;
    const loadTokenAndSettings = async () => {

      try {

        const storedToken = await AsyncStorage.getItem(
          'accessToken'
        );

        if (!storedToken) {

          Alert.alert(
            'Error',
            'No access token found. Please log in.'
          );

          return;
        }

        setToken(storedToken);

        const response = await fetch(
          `http://${serverIP}:8000/api/settings/`,
          {
            method: 'GET',

            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${storedToken}`,
            },
          }
        );

        const settings = await response.json();

        setNativeLanguage(settings.native_language);
        setTargetLanguage(settings.target_language);
        setNotificationsEnabled(settings.notifications ?? false);
        setProfilePrivate(settings.privacy ?? false);
        setSelectedDictionary(settings.dictionary_name || '');

      } catch (err) {

        Alert.alert(
          'Error',
          'Failed to load settings: ' + err.message
        );
      }
    };

    fetchLanguages();
    fetchTranslationModels();
    loadTokenAndSettings();

  }, [serverIP]);

  useEffect(() => {

    if (targetLanguage) {

      fetchDictionaries(targetLanguage);
    }

  }, [targetLanguage]);

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Error', 'No access token found. Please log in.');
      return;
    }

    try {
      const response = await fetch(`http://${serverIP}:8000/api/settings/`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          native_language: nativeLanguage,
          target_language: targetLanguage,
          notifications: notificationsEnabled,
          dictionary_name: selectedDictionary,
          privacy: profilePrivate,
          translation_model: selectedModel,
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
        <AntDesign name="left" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.settingsBox}>
        <Text style={styles.heading}>Settings</Text>

        <Text style={styles.label}>Native Language</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={nativeLanguage}
            onValueChange={(value) => {

              setNativeLanguage(value);

              setSelectedDictionary('');
              setDictionaries([]);
            }}
            style={styles.picker}
            dropdownIconColor="white"
          >
            {languages.map((lang) => (
              <Picker.Item key={lang.id} label={lang.lang_name} value={lang.lang_name} />
            ))}
          </Picker>


        </View>


        <Text style={styles.label}>Target Language</Text>
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




        </View>

        <Text style={styles.label}>
          Dictionary
        </Text>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedDictionary}
            onValueChange={setSelectedDictionary}
            style={styles.picker}
            dropdownIconColor="white"
          >
            <Picker.Item
              label="AI Dictionary"
              value=""
            />

            {dictionaries.map((dict) => (

              <Picker.Item
                key={dict.value}
                label={dict.label}
                value={dict.value}
              />
            ))}

          </Picker>
        </View>

        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={selectedModel}
            onValueChange={setSelectedModel}
            style={styles.picker}
            dropdownIconColor="white"
          >
            <Picker.Item
              label="Translation Model"
              value=""
            />

            {loadedModels.map((mod) => (

              <Picker.Item
                key={mod.id}
                label={mod.name}
                value={mod.id}
              />
            ))}

          </Picker>
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
