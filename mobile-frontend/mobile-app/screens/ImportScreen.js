

import React, { useState, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';

import {
  View,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  Switch,
  Platform,
  ProgressViewIOS,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Picker } from '@react-native-picker/picker';
import { jwtDecode } from 'jwt-decode';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles } from './styles/ImportStyles';
import CustomPopup from './components/CustomPopup';
import LoadingOverlay from './components/LoadingOverlay';
import ButtonGroup from './components/ButtonGroup';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerIP } from '../utils/config';
import ProgressBar from './components/ProgressBar';
import Tooltip from './components/Tooltip';
// import PDFConverterPopup from './components/PDFConverterPopup';

console.log('ButtonGroup:', ButtonGroup);
console.log('CustomPopup:', CustomPopup);
console.log('LoadingOverlay:', LoadingOverlay);

export default function ImportScreen({ navigation, route }) {
  const [url, setUrl] = useState('');
  const [lessonFile, setLessonFile] = useState(null);
  const [mediaFile, setMediaFile] = useState(null);
  const [imageFile, setImageFile] = useState(null)
  const [lessonPrivate, setLessonPrivate] = useState(false);
  const [audioUploaded, setAudioUploaded] = useState(false);
  const [mediaUploaded, setMediaUploaded] = useState(false);
  const [videoFormat, setVideoFormat] = useState(false);
  const [fileUploaded, setFileUploaded] = useState(false);
  const [lessonEmpty, setLessonEmpty] = useState(false);
  const [urlReference, setURLReference] = useState(false);
  const [imageReference, setImageReference] = useState(false);
  const [alwaysGenerateCaptions, setAlwaysGenerateCaptions] = useState(false);
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
  const [confirmPopup, setConfirmPopup] = useState({ visible: false, message: '' });
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');
  const [token, setToken] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [serverIP, setServerIP] = useState('');
  const progressUrl = `http://${serverIP}:8000/api/lesson-import-progress/`;
  const uploadOptions = [{ label: 'Video', value: 'video' }, { label: 'Audio', value: 'audio' }, { label: 'Text Only', value: 'text_only' }, { label: 'Empty', value: 'empty' }]
  const [uploadType, setUploadType] = useState('empty');
  const sourceOptions = [{ label: 'Manual', value: 'manual' }, { label: 'URL', value: 'url' }]
  const [uploadSource, setUploadSource] = useState('manual');
  const fileOptions = [{ label: 'CSV', value: 'csv' }, { label: 'PDF', value: 'pdf' }]
  const [fileType, setFileType] = useState('csv');
  const [translateTarget, setTranslateTarget] = useState(false);
  const { recordId } = route.params || {};
  const [ShowVideoCaptions, setShowVideoCaptions] = useState(false);
  const [ShowVideoView, setShowVideoView] = useState(false);
  const [generateAudio, setGenerateAudio] = useState(false);

  // const [pdfConverterVisible, setPdfConverterVisible] = useState(false);

  const insets = useSafeAreaInsets();
  const styles = createStyles(insets);

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
        const storedToken = await AsyncStorage.getItem('accessToken');
        if (!storedToken) {
          Alert.alert('Error', 'No access token found. Please log in.');
          return;
        }
        setToken(storedToken);

        const decoded = jwtDecode(storedToken);
        console.log('Decoded token:', decoded);

        const response = await fetch(`http://${serverIP}:8000/api/settings/`, {
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
  }, [serverIP]);


  const fetchLanguages = async () => {
    try {
      const res = await fetch(`http://${serverIP}:8000/api/languages/`);
      const data = await res.json();
      setLanguages(data); // assuming data is an array of { id, lang_name }
    } catch (err) {
      console.error('Failed to fetch languages:', err);
      Alert.alert('Error', 'Failed to load language options.');
    }
  };

  const pollProgress = () => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${serverIP}:8000/api/lesson-import-progress/`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setProgress(data.progress);

        if (data.progress >= 100) {
          clearInterval(pollingInterval);
          setLoading(false);
        }

        else if (data.progress < 0) {
          clearInterval(pollingInterval);
          setLoading(false);

          showError("Lesson import failed.");
        }
      } catch (err) {
        console.error(err);
        clearInterval(interval);
        setLoading(false);
      }
    }, 1000);
  };

  useEffect(() => {
    console.log('Route params received:', route.params);
  }, [route.params]);

  const loadRecordingFile = async () => {
    try {
      setLoading(true);
      const ip = await getServerIP();           // get fresh IP
      const storedToken = await AsyncStorage.getItem("accessToken");

      if (!storedToken || !ip) {
        console.warn("Missing IP or token");
        return;
      }

      console.log(`Fetching recording ${recordId} from ${ip}...`);

      const res = await fetch(
        `http://${ip}:8000/api/recordings/${recordId}/`,
        {
          headers: { Authorization: `Bearer ${storedToken}` },
        }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Error body:', errorText);
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      processRecordingData(data, ip);   // ← pass ip here

    } catch (err) {
      console.error("Failed to load recording:", err);
      Alert.alert('Error', 'Failed to load recording details. You can still select media manually.');
    } finally {
      setLoading(false);
    }
  };

  // Helper function - now accepts ip parameter
  const processRecordingData = (data, ip) => {
    const baseUrl = `http://${ip}:8000`;

    const mediaObj = {
      uri: `${baseUrl}${data.record_file}`,
      name: data.title ? `${data.title}.mp4` : `recording-${recordId}.mp4`,
      type: "video/mp4",
      mimeType: "video/mp4",
    };

    let imageObj = null;
    if (data.record_img) {
      imageObj = {
        uri: `${baseUrl}${data.record_img}`,
        name: `thumbnail-${recordId}.jpg`,
        type: "image/jpeg",
        mimeType: "image/jpeg",
      };
    }

    setUploadType('video');
    setUploadSource('manual');
    setMediaFile(mediaObj);
    setMediaUploaded(true);
    setVideoFormat(true);
    setFileUploaded(false);

    if (imageObj) {
      setImageFile(imageObj);
      setImageReference(true);
    }


    console.log('✅ Recording + thumbnail loaded successfully');
  };


  useEffect(() => {
    if (!recordId) return;
    loadRecordingFile();
  }, [recordId]);

  useEffect(() => {
    if (uploadType === 'video') {
      setVideoFormat(true);
      setShowVideoCaptions(true);
      setShowVideoView(true);
    } else {
      setVideoFormat(false);
      setShowVideoCaptions(false);
      setShowVideoView(false);
    }

    if (uploadType === 'audio') {
      setAudioUploaded(true);
    } else {
      setAudioUploaded(false);
    }

    if (uploadType === 'empty') {
      setLessonEmpty(true);
    } else {
      setLessonEmpty(false);
    }
  }, [uploadType]);



  const showSuccess = (message) => {
    setPopup({ visible: true, message: message, type: 'success' });
  };

  const showError = (message) => {
    setPopup({ visible: true, message: message, type: 'error' });
  };

  const handleFilePick = async () => {
    setLoading(true);

    try {
      const fileMimeType =
        fileType === 'csv'
          ? 'text/csv'
          : 'application/pdf';

      const result = await DocumentPicker.getDocumentAsync({
        type: fileMimeType,
      });

      console.log("File upload pressed:", result);

      if (result && result.assets && result.assets.length > 0) {
        const file = result.assets[0];

        console.log("Selected file:", file);

        // Check the file extension
        const fileName = file.name?.toLowerCase() || '';

        const validExtension =
          fileType === 'csv'
            ? fileName.endsWith('.csv')
            : fileName.endsWith('.pdf');

        if (!validExtension) {
          showError(
            `Please select a ${fileType.toUpperCase()} file.`
          );
          setLessonFile(null);
          return;
        }

        setLessonFile(file);
      } else {
        setLessonFile(null);
      }
    } catch (error) {
      showError(`File pick error: ${error}`);
      console.error("File pick error:", error);
      setLessonFile(null);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*' });
      console.log("Image upload pressed:", result);

      if (result && result.assets && result.assets.length > 0) {
        const file = result.assets[0];
        console.log("Selected image:", file);
        setImageFile(file);
      } else {
        setImageFile(null);
      }
    } catch (error) {
      showError(`File pick error: ${error}`)
      console.error("File pick error:", error);
      setImageFile(null);
    }
    setLoading(false);
  };

  const handleMediaPick = async () => {
    setLoading(true)
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*', 'video/*'],
        copyToCacheDirectory: true,
      });

      if (result && result.assets && result.assets.length > 0) {
        const mediaFile = result.assets[0];
        console.log("Selected Media file:", mediaFile);

        setMediaFile(mediaFile);
        // if (audioUploaded) {
        //   showSuccess("Audio uploaded successfully");
        // }
      }
    } catch (error) {
      showError(`Media pick error: ${error}`);
      console.error('Media pick error:', error);
    }
    setLoading(false);
  };

  const saveBase64ToFile = async (base64Data, fileName) => {
    const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(fileUri, base64Data, { encoding: FileSystem.EncodingType.Base64 });
    return fileUri;
  };

  // const handleOpenPDFConverter = () => {
  //   setPdfFile(null);
  //   setPdfPopupVisible(true);
  // };

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

    // WEB
    if (Platform.OS === 'web') {
      // Expo DocumentPicker on web usually provides a browser File object
      if (file.file instanceof File) {
        formData.append(fieldName, file.file);
        return;
      }

      // Fallback: convert blob URI to Blob
      const response = await fetch(file.uri);
      const blob = await response.blob();

      formData.append(fieldName, blob, file.name);
      return;
    }

    // IOS / ANDROID
    formData.append(fieldName, {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });
  }

  const handleImport = () => {
    const hasLessonText = uploadSource === 'manual' && fileUploaded && !!lessonFile;
    const hasManualMedia = uploadSource === 'manual' && mediaUploaded && !!mediaFile;
    const hasUrl = uploadSource === 'url' && urlReference && !!url.trim();

    // Every lesson must have a title.
    if (!title.trim()) {
      showError('Missing title: Please enter a title for this lesson.');
      return;
    }

    if (!nativeLanguage || !targetLanguage) {
      showError('Missing language: Please select both languages.');
      return;
    }

    // Empty lessons do not require a file, URL, or media.
    if (uploadType !== 'empty') {
      if (uploadType === 'text_only') {
        if (!fileUploaded || !lessonFile) {
          showError('Missing lesson file: Please upload a CSV or PDF file.');
          return;
        }
      } else if (uploadSource === 'manual') {
        if (!mediaUploaded || !mediaFile) {
          showError(`Missing ${uploadType} file: Turn on Provide Media and select a media file.`);
          return;
        }

        if (fileUploaded && !lessonFile) {
          showError('Missing captions/text file: Please select the CSV or PDF file, or turn off Upload Lesson File.');
          return;
        }

        if (!hasLessonText && !alwaysGenerateCaptions) {
          showError('Missing captions: Upload a CSV/PDF captions file or enable Generate captions from audio.');
          return;
        }
      } else if (uploadSource === 'url') {
        if (!hasUrl) {
          showError('Missing URL: Turn on Upload Lesson URL and enter a URL.');
          return;
        }

      }
    }

    // Build all overwrite warnings now, but show them only after Import Lesson is pressed.
    const warnings = [];

    if (uploadType === 'video' || uploadType === 'audio') {
      if (hasLessonText && alwaysGenerateCaptions) {
        warnings.push('The uploaded captions/text will be overwritten by captions generated from audio.');
      }

      if ((hasManualMedia || hasUrl) && generateAudio) {
        warnings.push('The existing audio in the video/audio source may be overwritten by generated audio.');
      }

      if (hasLessonText && translateTarget) {
        warnings.push('Existing translations in the uploaded captions/text file may be overwritten.');
      }
    }

    if (warnings.length > 0) {
      setConfirmPopup({
        visible: true,
        message: `Please confirm the following changes:\n\n${warnings.map((warning) => `• ${warning}`).join('\n\n')}\n\nDo you want to continue?`,
      });
      return;
    }

    performImport();
  };

  const performImport = async () => {
    const apiUrl = `http://${serverIP}:8000/api/import-lesson/`;

    try {
      setLoading(true);
      setProgress(0);

      console.log(lessonFile);
      console.log(mediaFile);
      console.log(imageFile);

      const formData = new FormData();
      await appendFileToFormData(formData, 'file', lessonFile);
      await appendFileToFormData(formData, 'media', mediaFile);
      await appendFileToFormData(formData, 'image', imageFile);

      formData.append('url', uploadSource === 'url' && urlReference ? url : '');
      formData.append('nativeLanguage', nativeLanguage);
      formData.append('targetLanguage', targetLanguage);
      formData.append('lessonPrivate', lessonPrivate);
      formData.append('audioUploaded', uploadType === 'audio');
      formData.append('fileUploaded', uploadSource === 'manual' && fileUploaded && !!lessonFile);
      formData.append('urlReference', urlReference);
      formData.append('imageReference', imageReference);
      formData.append('title', title.trim());
      formData.append('lessonEmpty', uploadType === 'empty');
      formData.append('videoFormat', uploadType === 'video');
      formData.append('alwaysGenerateCaptions', uploadType !== 'text_only' && uploadType !== 'empty' && alwaysGenerateCaptions);
      formData.append('translateTarget', uploadType !== 'empty' && translateTarget);
      formData.append('showVideoCaptions', ShowVideoCaptions);
      formData.append('showVideoView', ShowVideoView);
      formData.append('generateAudio', uploadType !== 'empty' && generateAudio);
      formData.append('fileType', fileType);

      // Start polling progress.
      const pollingInterval = setInterval(async () => {
        try {
          const res = await fetch(progressUrl, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/json',
            },
          });

          if (!res.ok) {
            const text = await res.text();
            console.error('Polling error:', text);
            clearInterval(pollingInterval);
            setLoading(false);
            return;
          }

          const data = await res.json();
          setProgress(data.progress);

          if (data.progress >= 100) {
            clearInterval(pollingInterval);
            setLoading(false);
          }
        } catch (err) {
          console.error('Polling fetch error:', err);
          clearInterval(pollingInterval);
          setLoading(false);
        }
      }, 1000);

      // Send the POST request to import the lesson.
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        clearInterval(pollingInterval);
        setLoading(false);
        showError(`Import failed: ${data.error || 'Unknown error'}`);
        return;
      }

      showSuccess('Success: Lesson imported successfully!');
      setProgress(100);
      navigation.goBack();
    } catch (error) {
      showError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handlePDFPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      if (result.assets && result.assets.length > 0) {
        setPdfFile(result.assets[0]);
      }
    } catch (error) {
      console.error('PDF pick error:', error);
      Alert.alert('Error', 'Failed to select PDF.');
    }
  };


  return (
    <ScrollView
      contentContainerStyle={{
        flexGrow: 1,
        paddingBottom: 40,
        paddingTop: 20,
        backgroundColor: '#222831',
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.container}>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={22} color="white" />
        </TouchableOpacity>


        <View style={styles.importBox}>
          <Text style={styles.heading}>Import Lesson</Text>

          <View>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter Title here"
              placeholderTextColor="#aaa"
              value={title}
              onChangeText={setTitle}
              autoCapitalize="none"
            />
          </View>

          <ButtonGroup
            options={uploadOptions}
            selectedValue={uploadType}
            onValueChange={(value) => {
              setUploadType(value);
              if (value === 'text_only') {
                setUploadSource('manual');
                setAlwaysGenerateCaptions(false);
              }
            }}
          />
          {uploadType !== 'empty' && uploadType !== 'text_only' && (
            <ButtonGroup options={sourceOptions} selectedValue={uploadSource} onValueChange={setUploadSource} />
          )}

          {uploadType !== 'empty' && <Text style={styles.label}>Upload Options</Text>}

          {/* ====================== URL SECTION ====================== */}
          {uploadSource === 'url' && uploadType !== 'empty' && uploadType !== 'text_only' && (
            <View>

              <View style={styles.checkboxRow}>
                <Switch
                  value={urlReference}
                  onValueChange={setURLReference}
                  trackColor={{ false: '#777', true: '#00adb5' }}
                  thumbColor={Platform.OS === 'android' ? '#eeeeee' : '#222831'}
                />
                <Text style={styles.checkboxLabel}>Upload Lesson URL</Text>
              </View>

              {urlReference && (
                <View style={{ marginTop: 12 }}>
                  <Text style={styles.label}>Lesson URL (optional)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Paste YouTube URL here"
                    placeholderTextColor="#aaa"
                    value={url}
                    onChangeText={setUrl}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
            </View>
          )}

          {/* ====================== MANUAL FILE SECTION ====================== */}
          {(uploadSource === 'manual' || uploadType === 'text_only') && uploadType !== 'empty' && (
            <View>

              <View style={styles.checkboxRow}>
                <Switch
                  value={fileUploaded}
                  onValueChange={(value) => {
                    setFileUploaded(value);
                    if (!value) setLessonFile(null);
                  }}
                  trackColor={{ false: '#777', true: '#00adb5' }}
                  thumbColor={Platform.OS === 'android' ? '#eeeeee' : '#222831'}
                />
                <Text style={styles.checkboxLabel}>Upload Lesson File <Text style={{ fontSize: 12 }}>(.csv)</Text></Text>
              </View>

              {fileUploaded && (
                <View>
                  <ButtonGroup options={fileOptions} selectedValue={fileType} onValueChange={(value) => { setFileType(value); setLessonFile(null); }} />
                  <Text style={styles.label}>Lesson File</Text>
                  <TouchableOpacity style={styles.button} onPress={handleFilePick}>
                    <Text style={styles.buttonText}>
                      {lessonFile ? `Selected: ${lessonFile.name}` : 'Choose File'}
                    </Text>
                  </TouchableOpacity>
                  {/* <TouchableOpacity
                    style={styles.button}
                    onPress={() => setPdfConverterVisible(true)}
                  >
                    <Text style={styles.buttonText}>Convert PDF to csv</Text>
                  </TouchableOpacity> */}
                </View>
              )}

              {uploadType !== 'text_only' && (
                <>
                  <View style={styles.checkboxRow}>
                    <Switch
                      value={mediaUploaded}
                      onValueChange={(value) => {
                        setMediaUploaded(value);
                        if (!value) setMediaFile(null);
                      }}
                      trackColor={{ false: '#777', true: '#00adb5' }}
                      thumbColor={Platform.OS === 'android' ? '#eeeeee' : '#222831'}
                    />
                    <Text style={styles.checkboxLabel}>Provide Media</Text>
                  </View>
                  {mediaUploaded && (
                    <View>
                      <Text style={styles.label}>Media Upload</Text>
                      <TouchableOpacity style={styles.button} onPress={handleMediaPick}>
                        <Text style={styles.buttonText}>
                          {mediaFile ? `Selected: ${mediaFile.name}` : 'Choose Media'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}

            </View>


          )}







          <View style={styles.labelContainer}>
                    <Text style={styles.label}>Native Language</Text>
                    <Tooltip text="User's native language">
                      <Text style={styles.infoIcon}>
                        <AntDesign name="tool" />
                      </Text>
                    </Tooltip>
                  </View>
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

            {Platform.OS === 'web' && (
              <View style={styles.arrowWrapper}>
                <AntDesign name="down" size={16} color="#eeeeee" />
              </View>
            )}
          </View>

          <Text style={styles.label}>Image Upload</Text>
          <View style={styles.checkboxRow}>
            <Switch
              value={imageReference}
              onValueChange={setImageReference}
              trackColor={{ false: '#777', true: '#00adb5' }}
              thumbColor={Platform.OS === 'android' ? '#eeeeee' : '#222831'}
            />
            <Text style={styles.checkboxLabel}>Upload Lesson Image</Text>
          </View>

          {imageReference && (
            <View>
              <Text style={styles.label}>Lesson Image</Text>
              <TouchableOpacity style={styles.button} onPress={handleImagePick}>
                <Text style={styles.buttonText}>
                  {imageFile ? `Selected: ${imageFile.name}` : 'Choose File'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {uploadType !== 'empty' && (
            <>
              <View style={styles.checkboxRow}>
                <Switch
                  value={alwaysGenerateCaptions}
                  onValueChange={setAlwaysGenerateCaptions}
                  disabled={uploadType === 'text_only'}
                  trackColor={{ false: '#777', true: '#00adb5' }}
                  thumbColor={Platform.OS === 'android' ? '#eeeeee' : '#222831'}
                />
                <Text style={styles.checkboxLabel}>Generate captions from audio</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Switch
                  value={generateAudio}
                  onValueChange={setGenerateAudio}
                  trackColor={{ false: '#777', true: '#00adb5' }}
                  thumbColor={Platform.OS === 'android' ? '#eeeeee' : '#222831'}
                />
                <Text style={styles.checkboxLabel}>Generate audio from captions</Text>
              </View>

              <View style={styles.checkboxRow}>
                <Switch
                  value={translateTarget}
                  onValueChange={setTranslateTarget}
                  disabled={uploadType !== 'text_only' && !(fileUploaded && lessonFile) && !alwaysGenerateCaptions}
                  trackColor={{ false: '#777', true: '#00adb5' }}
                  thumbColor={Platform.OS === 'android' ? '#eeeeee' : '#222831'}
                />
                <Text style={styles.checkboxLabel}>Translate (target Language)</Text>
              </View>
            </>
          )}


          <View style={styles.checkboxRow}>
            <Switch
              value={lessonPrivate}
              onValueChange={setLessonPrivate}
              trackColor={{ false: '#777', true: '#00adb5' }}
              thumbColor={Platform.OS === 'android' ? '#eeeeee' : '#222831'}
            />
            <Text style={styles.checkboxLabel}>Make Lesson Private</Text>
          </View>




          <TouchableOpacity style={styles.button} onPress={handleImport}>
            <Text style={styles.buttonText}>Import Lesson</Text>
          </TouchableOpacity>

          {/* <PDFConverterPopup
            visible={pdfConverterVisible}
            onClose={() => setPdfConverterVisible(false)}
            serverIP={serverIP}
            token={token}
            onConverted={(data) => {
              console.log('Converted CSV:', data);

              // We'll connect the returned CSV to lessonFile here.
            }}
          /> */}

          {popup.visible && popup.message && (
            <CustomPopup
              visible={true}
              message={popup.message}
              type={popup.type}
              onClose={() => setPopup((current) => ({ ...current, visible: false }))}
            />
          )}

          {confirmPopup.visible && (
            <CustomPopup
              visible={true}
              message={confirmPopup.message}
              type="caution"
              showButtons={true}
              acceptText="Accept"
              declineText="Decline"
              onAccept={() => {
                setConfirmPopup({ visible: false, message: '' });
                performImport();
              }}
              onDecline={() => setConfirmPopup({ visible: false, message: '' })}
              onClose={() => setConfirmPopup({ visible: false, message: '' })}
            />
          )}

          <View style={{ flex: 1 }}>

            <LoadingOverlay visible={loading} />

            {loading && (
              <View style={{ marginTop: 20 }}>
                {Platform.OS === 'android' ? (
                  <ProgressBar styleAttr="Horizontal" progress={progress / 100} indeterminate={false} color="#00adb5" />
                ) : (
                  <progress value={progress} max={100} style={{ width: '100%' }} />
                )}
                <Text style={{ color: '#fff' }}>{progress}%</Text>
              </View>
            )}
          </View>

        </View>

      </View>
    </ScrollView>
  );
}