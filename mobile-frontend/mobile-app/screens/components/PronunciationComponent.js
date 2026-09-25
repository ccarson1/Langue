import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import { getServerIP } from '../../utils/config';

export default function PronunciationComponent({
  targetText,
  isPhraseMode = true,
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState(null);
  const [recordingUri, setRecordingUri] = useState(null);
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);

  const mode = isPhraseMode ? 'word' : 'phrase';

  const startRecording = async () => {
    try {
      // Stop any previous playback
      if (sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
      }

      setRecordingUri(null);

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

      console.log("RECORDING URI:", uri);

      // Keep the temporary recording available for playback
      setRecordingUri(uri);

      const serverIP = await getServerIP();
      const token = await AsyncStorage.getItem('accessToken');

      const formData = new FormData();

      if (Platform.OS === 'web') {
        const blob = await fetch(uri).then(response => response.blob());

        formData.append(
          'audio',
          new File([blob], 'recording.m4a', {
            type: 'audio/m4a',
          })
        );
      } else {
        formData.append('audio', {
          uri,
          type: 'audio/m4a',
          name: 'recording.m4a',
        });
      }

      formData.append('text', targetText);
      formData.append('mode', mode);

      const response = await fetch(
        `http://${serverIP}:8000/api/practice/evaluate/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

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

  const playRecording = async () => {
    if (!recordingUri) return;

    try {
      // If currently playing, stop it
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // If sound already exists, play it
      if (sound) {
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      console.log("PLAYING RECORDING:", recordingUri);

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recordingUri },
        { shouldPlay: true }
      );

      setSound(newSound);
      setIsPlaying(true);

      // Detect when playback finishes
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.didJustFinish) {
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error("PLAYBACK ERROR:", error);
      Alert.alert('Error', 'Could not play recording');
    }
  };

  return (
    <View style={styles.container}>

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

      {/* Play temporary recording */}
      {recordingUri && !isRecording && (
        <TouchableOpacity
          style={styles.playButton}
          onPress={playRecording}
          disabled={isLoading}
        >
          <Ionicons
            name={isPlaying ? "pause-circle" : "play-circle"}
            size={28}
            color="#00adb5"
          />

          <Text style={styles.playText}>
            {isPlaying ? "PAUSE" : "PLAY"}
          </Text>
        </TouchableOpacity>
      )}

      {result && (
        <View
          style={[
            styles.resultBox,
            result.correct
              ? styles.correctResult
              : styles.incorrectResult,
          ]}
        >
          <Text style={styles.resultTitle}>
            {result.correct ? "✅ Great!" : "❌ Try Again"}
          </Text>

          <Text style={styles.resultMessage}>
            {result.message}
          </Text>

          {result.score !== undefined && (
            <Text style={styles.score}>
              Score: {result.score}%
            </Text>
          )}
        </View>
      )}

      {isLoading && (
        <Text style={styles.loadingText}>
          Evaluating...
        </Text>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 12,
  },

  recordButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#222831',
    borderWidth: 4,
    borderColor: '#00adb5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
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

  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginBottom: 10,
  },

  playText: {
    color: '#eeeeee',
    fontWeight: '600',
    fontSize: 13,
    marginLeft: 5,
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