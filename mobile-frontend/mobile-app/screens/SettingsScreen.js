import React, { useState } from 'react';
import {
  View,
  Text,
  Switch,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AntDesign from '@expo/vector-icons/AntDesign';
import styles from './styles/SettingsStyles';

export default function SettingsScreen({ navigation }) {
  const [nativeLanguage, setNativeLanguage] = useState('english');
  const [targetLanguage, setTargetLanguage] = useState('spanish');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [profilePrivate, setProfilePrivate] = useState(false);

  const handleSave = async () => {
    try {
      const response = await fetch('https://your-api.com/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nativeLanguage,
          targetLanguage,
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

        <Text style={styles.label}>Language</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={nativeLanguage}
            onValueChange={setNativeLanguage}
            style={styles.picker}
            dropdownIconColor="white"
          >
            <Picker.Item label="English" value="english" />
            <Picker.Item label="Spanish" value="spanish" />
            <Picker.Item label="French" value="french" />
          </Picker>
        </View>

        <Text style={styles.label}>Language Learning</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={targetLanguage}
            onValueChange={setTargetLanguage}
            style={styles.picker}
            dropdownIconColor="white"
          >
            <Picker.Item label="English" value="english" />
            <Picker.Item label="Spanish" value="spanish" />
            <Picker.Item label="French" value="french" />
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

        <View style={styles.checkboxRow}>
          <Switch
            value={profilePrivate}
            onValueChange={setProfilePrivate}
            trackColor={{ false: '#777', true: '#00adb5' }}
            thumbColor={Platform.OS === 'android' ? '#eeeeee' : ''}
          />
          <Text style={styles.checkboxLabel}>Make Profile Private</Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave}>
          <Text style={styles.buttonText}>Save Settings</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
