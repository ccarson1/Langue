import React, { useState } from 'react';

import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Picker } from '@react-native-picker/picker';
import styles from './styles/ImportStyles';

export default function ImportLessonScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [lessonFile, setLessonFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [nativeLang, setNativeLang] = useState('');
  const [targetLang, setTargetLang] = useState('');
  const [lessonPrivate, setLessonPrivate] = useState(false);
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [urlReference, setURLReference] = useState(false);

  const handleFilePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      console.log("File upload pressed:", result);

      if (result && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log("Selected file:", file);
        setLessonFile(file);
      } else {
        setLessonFile(null);
      }
    } catch (error) {
      console.error("File pick error:", error);
      setLessonFile(null);
    }
  };

  const handleAudioPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result && result.assets && result.assets.length > 0) {
        const audioFile = result.assets[0];
        console.log("Selected audio file:", audioFile);
        setAudioFile(audioFile);
      }
    } catch (error) {
      console.error('Audio pick error:', error);
    }
  };

  const handleImport = async () => {
    if (!url && !file) {
      Alert.alert('Missing input', 'Please provide a URL or upload a file.');
      return;
    }

    if (!nativeLang || !targetLang) {
      Alert.alert('Missing language', 'Please select both languages.');
      return;
    }

    try {
      const formData = new FormData();

      if (lessonFile) {
        formData.append('file', {
          uri: lessonFile.uri,
          name: lessonFile.name,
          type: lessonFile.mimeType || 'application/octet-stream',
        });
      }

      if (audioFile) {
        formData.append('audio', {
          uri: audioFile.uri,
          name: audioFile.name,
          type: audioFile.mimeType || 'audio/mpeg',
        });
      }

      formData.append('url', url);
      formData.append('nativeLang', nativeLang);
      formData.append('targetLang', targetLang);

      const response = await fetch('https://your-api.com/api/import-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        Alert.alert('Import failed', data.error || 'Unknown error');
      } else {
        Alert.alert('Success', 'Lesson imported successfully!');
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
        <AntDesign name="back" size={22} color="white" />
      </TouchableOpacity>

      <View style={styles.importBox}>
        <Text style={styles.heading}>Import Lesson</Text>

        <View style={styles.checkboxRow}>
          <Switch
            value={urlReference}
            onValueChange={setURLReference}
            trackColor={{ false: '#777', true: '#00adb5' }}
            thumbColor={Platform.OS === 'android' ? '#eeeeee' : ''}
          />
          <Text style={styles.checkboxLabel}>Upload Lesson URL</Text>
        </View>
        {urlReference && (
          <View>
            <Text style={styles.label}>Lesson URL (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Paste URL here"
              placeholderTextColor="#aaa"
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
            />
          </View>
        )}


        <View style={styles.checkboxRow}>
          <Switch
            value={fileUploaded}
            onValueChange={setFileUploaded}
            trackColor={{ false: '#777', true: '#00adb5' }}
            thumbColor={Platform.OS === 'android' ? '#eeeeee' : ''}
          />
          <Text style={styles.checkboxLabel}>Upload Lesson File</Text>
        </View>

        {fileUploaded && (
          <View>
            <Text style={styles.label}>Lesson File</Text>
            <TouchableOpacity style={styles.button} onPress={handleFilePick}>
              <Text style={styles.buttonText}>
                {lessonFile ? `Selected: ${lessonFile.name}` : 'Choose File'}
              </Text>
            </TouchableOpacity>
          </View>
        )}




        <Text style={styles.label}>Native Language</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={nativeLang}
            onValueChange={setNativeLang}
            style={styles.picker}
            dropdownIconColor="white"
          >
            <Picker.Item label="Select Language" value="" />
            <Picker.Item label="English" value="en" />
            <Picker.Item label="Spanish" value="es" />
            <Picker.Item label="French" value="fr" />
            <Picker.Item label="German" value="de" />
            {/* Add more as needed */}
          </Picker>
        </View>

        <Text style={styles.label}>Target Language</Text>
        <View style={styles.pickerWrapper}>
          <Picker
            selectedValue={targetLang}
            onValueChange={setTargetLang}
            style={styles.picker}
            dropdownIconColor="white"
          >
            <Picker.Item label="Select Language" value="" />
            <Picker.Item label="English" value="en" />
            <Picker.Item label="Spanish" value="es" />
            <Picker.Item label="French" value="fr" />
            <Picker.Item label="German" value="de" />
            {/* Add more as needed */}
          </Picker>
        </View>
        <View style={styles.checkboxRow}>
          <Switch
            value={lessonPrivate}
            onValueChange={setLessonPrivate}
            trackColor={{ false: '#777', true: '#00adb5' }}
            thumbColor={Platform.OS === 'android' ? '#eeeeee' : ''}
          />
          <Text style={styles.checkboxLabel}>Make Lesson Private</Text>
        </View>

        <View style={styles.checkboxRow}>
          <Switch
            value={audioUploaded}
            onValueChange={setAudioUploaded}
            trackColor={{ false: '#777', true: '#00adb5' }}
            thumbColor={Platform.OS === 'android' ? '#eeeeee' : ''}
          />
          <Text style={styles.checkboxLabel}>Provide Audio</Text>
        </View>
        {audioUploaded && (
          <View>
            <Text style={styles.label}>Audio Upload</Text>
            <TouchableOpacity style={styles.button} onPress={handleAudioPick}>
              <Text style={styles.buttonText}>
                {audioFile ? `Selected: ${audioFile.name}` : 'Choose Audio'}
              </Text>
            </TouchableOpacity>
          </View>
        )}


        <TouchableOpacity style={styles.button} onPress={handleImport}>
          <Text style={styles.buttonText}>Import Lesson</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

