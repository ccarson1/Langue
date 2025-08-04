import React, { useState, useEffect } from 'react';

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
import CustomPopup from './components/CustomPopup';
import LoadingOverlay from './components/LoadingOverlay';

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
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
  const [accessToken, setAccessToken] = useState(null);




  useEffect(() => {
    setPopup({ visible: false, message: '', type: 'success' });

    const fetchToken = async () => {
      const storedToken = await AsyncStorage.getItem('accessToken');
      setAccessToken(storedToken);  // save token to state here

      if (storedToken) {
        try {
          const decoded = jwtDecode(storedToken);
          // You can save decoded info or fetch user profile here
        } catch (err) {
          console.error('Failed to decode token:', err);
        }
      }
    };
    fetchToken();

  }, []);

  const showSuccess = (message) => {
    setPopup({ visible: true, message: message, type: 'success' });
  };

  const showError = (message) => {
    setPopup({ visible: true, message: message, type: 'error' });
  };

  const handleFilePick = async () => {
    setLoading(true);
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
      showError(`File pick error: ${error}`)
      console.error("File pick error:", error);
      setLessonFile(null);
    }
    setLoading(false);
  };

  const handleAudioPick = async () => {
    setLoading(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
      });

      if (result && result.assets && result.assets.length > 0) {
        const audioFile = result.assets[0];
        console.log("Selected audio file:", audioFile);

        setAudioFile(audioFile);
        // if (audioUploaded) {
        //   showSuccess("Audio uploaded successfully");
        // }
      }
    } catch (error) {
      showError(`Audio pick error: ${error}`);
      console.error('Audio pick error:', error);
    }
    setLoading(false);
  };

  const handleImport = async () => {
    if (!url && !file) {
      showError(`Missing input: Please provide a URL or upload a file.`);
      Alert.alert('Missing input', 'Please provide a URL or upload a file.');
      return;
    }

    if (!nativeLang || !targetLang) {
      showError(`Missing language: Please select both languages.`);
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
      formData.append('lessonPrivate', lessonPrivate);

      const response = await fetch('http://localhost:8000/api/import-lesson', {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        showError(`Import failed: ${data.error || 'Unknown error'}`);
        Alert.alert('Import failed', data.error || 'Unknown error');
      } else {
        showSuccess(`Success: Lesson imported successfully!`);
        Alert.alert('Success', 'Lesson imported successfully!');
        navigation.goBack();
      }
    } catch (error) {
      showError(`Error ${error.message}`);
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

        {popup.visible && popup.message && (
          <CustomPopup
            visible={true}
            message={popup.message}
            type={popup.type}
            onClose={() => setPopup({ ...popup, visible: false })}
          />
        )}

        <LoadingOverlay visible={loading} />

      </View>
    </View>
  );
}

