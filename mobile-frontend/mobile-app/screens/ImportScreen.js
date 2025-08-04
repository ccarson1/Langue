import React, { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';

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
import { jwtDecode } from 'jwt-decode';
import styles from './styles/ImportStyles';
import CustomPopup from './components/CustomPopup';
import LoadingOverlay from './components/LoadingOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ImportLessonScreen({ navigation }) {
  const [url, setUrl] = useState('');
  const [lessonFile, setLessonFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const [lessonPrivate, setLessonPrivate] = useState(false);
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [urlReference, setURLReference] = useState(false);
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [token, setToken] = useState(null);
  const [languages, setLanguages] = useState([]);


  const fetchLanguages = async () => {
    try {
      const res = await fetch('http://192.168.1.5:8000/api/languages/');
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

        const response = await fetch('http://192.168.1.5:8000/api/settings/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${storedToken}`,
          },
        });

        const settings = await response.json();
        setNativeLanguage(settings.native_language);
        setTargetLanguage(settings.target_language);

      } catch (err) {
        Alert.alert('Error', 'Failed to load settings: ' + err.message);
      }
    };

    fetchLanguages(); // <--- fetch language options
    loadTokenAndSettings(); // <--- fetch user settings
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

  const saveBase64ToFile = async (base64Data, fileName) => {
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
    return fileUri;
  };

  function dataURLtoBlob(dataurl) {
    const arr = dataurl.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }

  async function appendFileToFormData(formData, fieldName, file) {
    if (!file) return;

    if (file.uri.startsWith('data:')) {
      if (Platform.OS === 'web') {
        const blob = dataURLtoBlob(file.uri);
        formData.append(fieldName, blob, file.name);
      } else {
        const base64Content = file.uri.split(',')[1];
        const fileUri = `${FileSystem.cacheDirectory}${file.name}`;
        await FileSystem.writeAsStringAsync(fileUri, base64Content, { encoding: FileSystem.EncodingType.Base64 });
        formData.append(fieldName, {
          uri: fileUri,
          name: file.name,
          type: file.mimeType || 'application/octet-stream',
        });
      }
    } else {
      formData.append(fieldName, {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/octet-stream',
      });
    }
  }

  const handleImport = async () => {
    if (!url && !lessonFile) {
      showError(`Missing input: Please provide a URL or upload a file.`);
      Alert.alert('Missing input', 'Please provide a URL or upload a file.');
      return;
    }

    if (!nativeLanguage || !targetLanguage) {
      showError(`Missing language: Please select both languages.`);
      Alert.alert('Missing language', 'Please select both languages.');
      return;
    }

    const apiUrl = 'http://192.168.1.5:8000/api/import-lesson/';

    try {
      setLoading(true);

      const formData = new FormData();

      await appendFileToFormData(formData, 'file', lessonFile);
      await appendFileToFormData(formData, 'audio', audioFile);

      formData.append('url', url || '');
      formData.append('nativeLanguage', nativeLanguage);
      formData.append('targetLanguage', targetLanguage);
      formData.append('lessonPrivate', lessonPrivate.toString());
      formData.append('audioUploaded', audioUploaded);
      formData.append('fileUploaded', fileUploaded);
      formData.append('urlReference', urlReference);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json',
          // 👇 DON'T include Content-Type header here! Let fetch set it automatically
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
      showError(`Error: ${error.message}`);
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
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

