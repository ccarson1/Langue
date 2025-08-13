import React, { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView, Alert, useWindowDimensions, Platform } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import styles from "./styles/ListeningStyles"
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import config from '../utils/config';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomPopup from './components/CustomPopup';
import AudioVisualizer from './components/AudioVisualizer';
import * as FileSystem from 'expo-file-system';





export default function LessonsScreen({ navigation }) {
    const [languages, setLanguages] = useState([]);
    const [token, setToken] = useState(null);
    const [nativeLanguage, setNativeLanguage] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('');
    const [lessons, setLessons] = useState([]);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(null)
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
    const soundRef = useRef(null);
    const server = config.SERVER_IP;
    const mediaUrl = `http://${server}/media/`;

    const showSuccess = (message) => {
        setPopup({ visible: true, message: message, type: 'success' });
    };

    const showError = (message) => {
        setPopup({ visible: true, message: message, type: 'error' });
    };

    const fetchLessons = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken'); // or wherever you store it
            const res = await fetch(`http://${server}:8000/api/lessons/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            const data = await res.json();
            setLessons(data);
        } catch (err) {
            console.error('Failed to fetch Lessons:', err);
            Alert.alert('Error', 'Failed to load Lesson options.');
        }
    };

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


            } catch (err) {
                Alert.alert('Error', 'Failed to load settings: ' + err.message);
            }
        };

        fetchLessons();
        fetchLanguages(); // <--- fetch language options
        loadTokenAndSettings(); // <--- fetch user settings
    }, []);

    const playAudio = async (lessonID) => {
        setCurrentLesson(lessonID);
        setIsPlaying(true);

        try {
            // Unload previous sound
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            // Fetch audio as blob
            const response = await fetch(`http://${server}:8000/api/audio/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lesson_id: lessonID,
                    full_audio: true,
                }),
            });

            if (Platform.OS === 'web') {
                const blob = await response.blob();
                const uri = URL.createObjectURL(blob); // only works in web

                // If you're on React Native (not web), you must save the blob to a file:
                // Use expo-file-system for that (see further below if needed)

                // Load and play the audio
                const { sound } = await Audio.Sound.createAsync(
                    { uri },
                    { shouldPlay: true }
                );
                soundRef.current = sound;

                sound.setOnPlaybackStatusUpdate(status => {
                    if (status.didJustFinish) {
                        setIsPlaying(false);
                    }
                });
            }
            else {
                const blob = await response.blob();

                // Convert blob to base64
                const reader = new FileReader();
                reader.onloadend = async () => {
                    const base64Data = reader.result.split(',')[1]; // strip `data:audio/...;base64,`

                    const path = FileSystem.cacheDirectory + `audio-${Date.now()}.mp3`;

                    await FileSystem.writeAsStringAsync(path, base64Data, {
                        encoding: FileSystem.EncodingType.Base64,
                    });

                    const { sound } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true });
                    soundRef.current = sound;

                    sound.setOnPlaybackStatusUpdate(status => {
                        if (status.didJustFinish) {
                            setIsPlaying(false);
                        }
                    });
                };

                reader.readAsDataURL(blob); // This triggers reader.onloadend
            }



        } catch (e) {
            showError('Audio error:', e);
            console.error('Audio error:', e);
        }
    };

    const playLesson = async (lessonID) => {
        setCurrentLesson(lessonID)
        alert(`Currently playing lesson ${currentLesson}`);
    }

    const [frequencies, setFrequencies] = useState(Array(20).fill(0));

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                <AntDesign name="back" size={22} color="white" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.gridWrapper}>
                {lessons.map((lesson) => (
                    <TouchableOpacity onPress={() => playAudio(lesson.id)}>
                        <View key={lesson.id} style={styles.card}>
                            <Text style={styles.title}>{lesson.id}</Text>
                            <Text style={styles.title}>{lesson.title}</Text>
                            <Text style={styles.title}>{lesson.image}</Text>
                            <AudioVisualizer
                                frequencies={frequencies}
                                width={120}
                                height={40}
                            />

                            <MaterialIcons name="audiotrack" size={24} color="white" />
                        </View>

                    </TouchableOpacity>

                ))}
            </ScrollView>
        </View>
    );


}




