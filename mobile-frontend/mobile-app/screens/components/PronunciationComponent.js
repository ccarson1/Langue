import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getServerIP } from '../../utils/config';

export default function PronunciationComponent({
  targetText,        // Required: the word or phrase to practice
  isPhraseMode = true,   // 'word' or 'phrase' (sent to backend)
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const mode = isPhraseMode ? 'phrase' : 'word';

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);
      setIsRecording(true);
      setResult(null);
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Could not start recording');
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setIsRecording(false);
    setIsLoading(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      const serverIP = await getServerIP();
      const token = await AsyncStorage.getItem('accessToken');

      const formData = new FormData();
      formData.append('audio', {
        uri,
        type: 'audio/m4a',
        name: 'recording.m4a',
      });
      formData.append('text', targetText);
      formData.append('mode', mode);

      const response = await fetch(`http://${serverIP}:8000/api/practice/evaluate/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          correct: data.correct || false,
          message: data.message || data.feedback,
          score: data.score,
          recognized: data.recognized,
        });
      } else {
        Alert.alert('Error', data.error || 'Failed to evaluate');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to send recording');
    } finally {
      setRecording(null);
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* <Text style={styles.targetText}>{targetText}</Text> */}

      <TouchableOpacity
        style={[
          styles.recordButton,
          isRecording && styles.recordingActive,
        ]}
        onPress={isRecording ? stopRecording : startRecording}
        disabled={isLoading || !targetText}
      >
        <Ionicons
          name={isRecording ? "stop-circle" : "mic"}
          size={42}
          color={isRecording ? "#ff4757" : "#00adb5"}
        />
        <Text style={styles.recordText}>
          {isRecording ? "STOP" : "RECORD"}
        </Text>
      </TouchableOpacity>

      {result && (
        <View style={[
          styles.resultBox,
          result.correct ? styles.correctResult : styles.incorrectResult
        ]}>
          <Text style={styles.resultTitle}>
            {result.correct ? "✅ Great!" : "❌ Try Again"}
          </Text>
          <Text style={styles.resultMessage}>{result.message}</Text>
          {result.score !== undefined && (
            <Text style={styles.score}>Score: {result.score}%</Text>
          )}
        </View>
      )}

      {isLoading && <Text style={styles.loadingText}>Evaluating...</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  // targetText: {
  //   fontSize: 18,
  //   color: '#eeeeee',
  //   fontWeight: '500',
  //   textAlign: 'center',
  //   marginBottom: 16,
  //   paddingHorizontal: 10,
  // },
  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#222831',
    borderWidth: 4,
    borderColor: '#00adb5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  recordingActive: {
    borderColor: '#ff4757',
    backgroundColor: '#3a2c2c',
  },
  recordText: {
    color: '#eeeeee',
    fontWeight: '600',
    marginTop: 6,
    fontSize: 14,
  },
  resultBox: {
    padding: 14,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
    marginTop: 8,
  },
  correctResult: {
    backgroundColor: '#1e3a2f',
    borderWidth: 1,
    borderColor: '#00adb5',
  },
  incorrectResult: {
    backgroundColor: '#3a2c2c',
    borderWidth: 1,
    borderColor: '#ff4757',
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 6,
  },
  resultMessage: {
    color: '#eeeeee',
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  score: {
    marginTop: 6,
    color: '#00adb5',
    fontWeight: '600',
  },
  loadingText: {
    color: '#00adb5',
    marginTop: 8,
  },
});