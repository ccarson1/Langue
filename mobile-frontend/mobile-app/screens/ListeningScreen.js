import React, { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView, Alert, useWindowDimensions, Platform } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import styles from "./styles/ListeningStyles"
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import config from '../utils/config';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomPopup from './components/CustomPopup';
import AudioVisualizer from './components/AudioVisualizer';
import AudioProgressBar from './components/AudioProgressBar';
import ScrollingText from './components/ScrollingText';
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
    const soundRefs = useRef({});
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
            // Pause all other lessons
            for (const [id, sound] of Object.entries(soundRefs.current)) {
                if (id !== lessonID.toString()) {
                    if (Platform.OS === 'web') sound.audioElement?.pause();
                    else await sound.pauseAsync();
                }
            }

            // MOBILE
            if (Platform.OS !== 'web') {
                if (!soundRefs.current[lessonID]) {
                    // fetch audio and create sound (same as before)
                    console.log(lessonID);
                    const response = await fetch(`http://${server}:8000/api/audio/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ lesson_id: lessonID, full_audio: true }),
                    });
                    const blob = await response.blob();
                    const reader = new FileReader();
                    reader.onloadend = async () => {
                        const base64Data = reader.result.split(',')[1];
                        const path = FileSystem.cacheDirectory + `audio-${lessonID}.mp3`;

                        await FileSystem.writeAsStringAsync(path, base64Data, {
                            encoding: FileSystem.EncodingType.Base64,
                        });

                        const { sound } = await Audio.Sound.createAsync(
                            { uri: path },
                            { shouldPlay: true }
                        );
                        soundRefs.current[lessonID] = sound;

                        sound.setOnPlaybackStatusUpdate(status => {
                            if (status.didJustFinish) setIsPlaying(false);
                        });
                    };
                    reader.readAsDataURL(blob);
                } else {
                    await soundRefs.current[lessonID].playAsync(); // resume existing
                }
            } else {
                // WEB
                console.log(lessonID);
                if (!soundRefs.current[lessonID]) {
                    const response = await fetch(`http://${server}:8000/api/audio/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ lesson_id: lessonID, full_audio: true }),
                    });
                    const blob = await response.blob();
                    const uri = URL.createObjectURL(blob);
                    const audioElement = new window.Audio(uri);
                    audioElement.crossOrigin = 'anonymous';
                    await audioElement.play();

                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                    const src = audioCtx.createMediaElementSource(audioElement);
                    const analyser = audioCtx.createAnalyser();
                    src.connect(analyser);
                    analyser.connect(audioCtx.destination);
                    analyser.fftSize = 64;

                    soundRefs.current[lessonID] = { audioElement, analyser };

                    audioElement.onended = () => setIsPlaying(false);
                } else {
                    await soundRefs.current[lessonID].audioElement.play();
                }
            }
        } catch (e) {
            console.error('Audio error:', e);
        }
    };

    const pauseAudio = async () => {
        setIsPlaying(false);
        try {
            if (!currentLesson || !soundRefs.current[currentLesson]) return;

            const sound = soundRefs.current[currentLesson];

            if (Platform.OS === 'web') {
                sound.audioElement?.pause();
            } else {
                await sound.pauseAsync();
            }
        } catch (e) {
            console.error('Pause error:', e);
        }
    };




    const [frequencies, setFrequencies] = useState(Array(20).fill(0));

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                <AntDesign name="back" size={22} color="white" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.gridWrapper}>
                {lessons.map((lesson) => (
                    <View key={lesson.id} style={styles.card}>
                        <View style={styles.topCard}>
                            <ScrollingText
                                text={lesson.title}
                                isPlaying={currentLesson === lesson.id && isPlaying}
                                width={200}
                                speed={40}
                            />

                            <AudioVisualizer
                                soundRef={{ current: soundRefs.current[lesson.id] }} // wrap in {current: ...} so visualizer works
                                isPlaying={currentLesson === lesson.id && isPlaying}
                                onPlay={() => playAudio(lesson.id)}
                                onPause={pauseAudio}
                                width={120}
                                height={40}
                            />
                        </View>
                        <View style={styles.bottomCard}>
                            <AudioProgressBar
                                soundRef={{ current: soundRefs.current[lesson.id] }}
                                isPlaying={currentLesson === lesson.id && isPlaying}
                            />

                        </View>

                    </View>
                ))}
            </ScrollView>
        </View>
    );


}




