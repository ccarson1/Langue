import React, { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import { FontAwesome } from '@expo/vector-icons';
import { View, Text, StyleSheet, Image, TouchableOpacity, Linking, ScrollView, Alert, useWindowDimensions, Platform } from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
//import styles from "./styles/ListeningStyles"
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { getServerIP } from '../utils/config';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import CustomPopup from './components/CustomPopup';
import AudioVisualizer from './components/AudioVisualizer';
import AudioProgressBar from './components/AudioProgressBar';
import ScrollingText from './components/ScrollingText';
import * as FileSystem from 'expo-file-system/legacy';
import { Buffer } from 'buffer';
import LoadingOverlay from './components/LoadingOverlay';
import BottomAudioMenu from './components/BottomAudioMenu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles } from './styles/ListeningStyles';




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
    const [refresh, setRefresh] = useState(0); //help the Visualizer and progress start with the audio
    const [serverIP, setServerIP] = useState('');
    const mediaUrl = `http://${serverIP}/media/`;
    const [playbackStatus, setPlaybackStatus] = useState({});

    const [volume, setVolume] = useState(1.0);
    const [playbackRate, setPlaybackRate] = useState(1.0);

    const [repeat, setRepeat] = useState(false);
    const [repeatAll, setRepeatAll] = useState(false);
    const [shuffle, setShuffle] = useState(false);
    const repeatRef = useRef(false);
    const repeatAllRef = useRef(false);
    const shuffleRef = useRef(false);
    const lessonsRef = useRef([]);
    const [downloadedLessons, setDownloadedLessons] = useState({});
    const initializedRef = useRef(false);
    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);

    const showSuccess = (message) => {
        setPopup({ visible: true, message: message, type: 'success' });
    };

    const showError = (message) => {
        setPopup({ visible: true, message: message, type: 'error' });
    };

    useEffect(() => {
        const loadIP = async () => {
            const ip = await getServerIP();
            setServerIP(ip);
        };
        loadIP();
    }, []);

    const fetchLessons = async () => {
        setLoading(true);
        try {
            const token = await AsyncStorage.getItem('accessToken'); // or wherever you store it
            const res = await fetch(`http://${serverIP}:8000/api/lessons/`, {
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
        } finally {
            setLoading(false);
        }
    };

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

    const saveAudioSettings = async () => {

        try {

            if (!token) return;


            await fetch(`http://${serverIP}:8000/api/settings/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({

                    native_language: nativeLanguage,
                    target_language: targetLanguage,

                    user_set_volume: volume,
                    user_set_speed: playbackRate,

                    repeat_audio: repeat,
                    repeat_audio_all: repeatAll,
                    shuffle_audio: shuffle,
                }),
            });

        } catch (e) {

            console.error("Failed to save audio settings:", e);
        }
    };

    const stopAndUnloadAllAudio = async () => {

        try {

            for (const [id, sound] of Object.entries(soundRefs.current)) {

                // WEB
                if (Platform.OS === 'web') {

                    if (sound.audioElement) {

                        sound.audioElement.pause();

                        sound.audioElement.currentTime = 0;

                        sound.audioElement.src = '';

                        sound.audioElement.load();
                    }

                    // MOBILE
                } else {

                    try {

                        await sound.stopAsync();

                    } catch (e) { }

                    try {

                        await sound.unloadAsync();

                    } catch (e) { }
                }
            }

            soundRefs.current = {};

            setIsPlaying(false);

            setCurrentLesson(null);

        } catch (e) {

            console.error("Audio cleanup error:", e);
        }
    };

    const getAudioPath = (lessonID) => {
        return FileSystem.documentDirectory + `lesson-${lessonID}.mp3`;
    };

    const isDownloaded = async (lessonID) => {
        if (Platform.OS === 'web') {
            return false;
        }

        const info = await FileSystem.getInfoAsync(
            getAudioPath(lessonID)
        );

        return info.exists;
    };

    const downloadAudio = async (lessonID) => {
        try {

            setLoading(true);

            const response = await fetch(
                `http://${serverIP}:8000/api/audio/`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        lesson_id: lessonID,
                        full_audio: true
                    }),
                }
            );

            if (!response.ok) {
                throw new Error("Download failed");
            }

            // WEB DOWNLOAD
            if (Platform.OS === 'web') {

                const blob = await response.blob();

                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');

                a.href = url;
                a.download = `lesson-${lessonID}.mp3`;

                document.body.appendChild(a);

                a.click();

                document.body.removeChild(a);

                URL.revokeObjectURL(url);

                return;
            }

            // MOBILE DOWNLOAD
            const arrayBuffer = await response.arrayBuffer();

            const base64Data =
                Buffer.from(arrayBuffer).toString('base64');

            const path = getAudioPath(lessonID);

            await FileSystem.writeAsStringAsync(
                path,
                base64Data,
                {
                    encoding: 'base64',
                }
            );

            setDownloadedLessons(prev => ({
                ...prev,
                [lessonID]: true
            }));

            showSuccess("Audio downloaded");

        } catch (e) {

            console.error(e);

            showError("Download failed");

        } finally {

            setLoading(false);
        }
    };

    const loadDownloadedStatus = async () => {

        if (Platform.OS === 'web') return;

        const downloaded = {};

        for (const lesson of lessons) {

            const info = await FileSystem.getInfoAsync(
                getAudioPath(lesson.id)
            );

            downloaded[lesson.id] = info.exists;
        }

        setDownloadedLessons(downloaded);
    };

    useEffect(() => {

        if (lessons.length) {
            loadDownloadedStatus();
        }

    }, [lessons]);

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
                //console.log('Decoded token:', decoded);

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

                setVolume(
                    settings.user_set_volume !== null
                        ? parseFloat(settings.user_set_volume)
                        : 1.0
                );

                setPlaybackRate(
                    settings.user_set_speed !== null
                        ? parseFloat(settings.user_set_speed)
                        : 1.0
                );

                setRepeat(settings.repeat_audio ?? false);

                setRepeatAll(settings.repeat_audio_all ?? false);

                setShuffle(settings.shuffle_audio ?? false);

                initializedRef.current = true;


            } catch (err) {
                Alert.alert('Error', 'Failed to load settings: ' + err.message);
            }
        };

        fetchLessons();
        fetchLanguages(); // <--- fetch language options
        loadTokenAndSettings(); // <--- fetch user settings
    }, [serverIP]);

    useEffect(() => {

        const updateAudioSettings = async () => {

            if (!currentLesson) return;

            const sound = soundRefs.current[currentLesson];

            if (!sound) return;

            try {

                if (Platform.OS === 'web') {

                    sound.audioElement.volume = volume;
                    sound.audioElement.playbackRate = playbackRate;

                } else {

                    await sound.setVolumeAsync(volume);

                    await sound.setRateAsync(
                        playbackRate,
                        true
                    );
                }

            } catch (e) {
                console.error(e);
            }
        };

        updateAudioSettings();

    }, [volume, playbackRate]);

    useEffect(() => {
        repeatRef.current = repeat;
    }, [repeat]);

    useEffect(() => {
        repeatAllRef.current = repeatAll;
    }, [repeatAll]);

    useEffect(() => {
        shuffleRef.current = shuffle;
    }, [shuffle]);

    useEffect(() => {
        lessonsRef.current = lessons;
    }, [lessons]);

    useEffect(() => {

        return () => {

            stopAndUnloadAllAudio();
        };

    }, []);

    useEffect(() => {

        if (!token) return;
        if (!initializedRef.current) return;

        const timeout = setTimeout(() => {

            saveAudioSettings();

        }, 400);

        return () => clearTimeout(timeout);

    }, [
        volume,
        playbackRate,
        repeat,
        repeatAll,
        shuffle
    ]);

    const playNextLesson = async (currentLessonID) => {

        const currentLessons = lessonsRef.current;

        if (!currentLessons.length) return;

        const currentIndex = currentLessons.findIndex(
            l => l.id === currentLessonID
        );

        let nextLesson;

        // SHUFFLE MODE
        if (shuffleRef.current) {

            if (currentLessons.length === 1) {
                nextLesson = currentLessons[0];
            } else {

                let randomIndex;

                do {
                    randomIndex = Math.floor(
                        Math.random() * currentLessons.length
                    );
                } while (
                    currentLessons[randomIndex].id === currentLessonID
                );

                nextLesson = currentLessons[randomIndex];
            }

        } else {

            // NORMAL NEXT TRACK
            const nextIndex =
                (currentIndex + 1) % currentLessons.length;

            nextLesson = currentLessons[nextIndex];
        }

        if (nextLesson) {
            await playAudio(nextLesson.id);
        }
    };

    const playAudio = async (lessonID) => {
        setCurrentLesson(lessonID);
        setIsPlaying(true);

        try {

            // Pause all other lessons
            for (const [id, sound] of Object.entries(soundRefs.current)) {
                if (parseInt(id) !== lessonID) {
                    if (Platform.OS === 'web') sound.audioElement?.pause();
                    else await sound.pauseAsync();
                }
            }

            // MOBILE
            if (Platform.OS !== 'web') {


                if (!soundRefs.current[lessonID]) {

                    let path;

                    const downloaded = await isDownloaded(lessonID);

                    if (downloaded) {

                        path = getAudioPath(lessonID);

                    } else {

                        setLoading(true);
                        const response = await fetch(`http://${serverIP}:8000/api/audio/`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ lesson_id: lessonID, full_audio: true }),
                        });

                        if (!response.ok) {
                            throw new Error(`Failed to fetch audio: ${response.status}`);
                        }

                        const arrayBuffer = await response.arrayBuffer();

                        const base64Data = Buffer.from(arrayBuffer).toString('base64');

                        path = FileSystem.cacheDirectory + `audio-${lessonID}.mp3`;

                        await FileSystem.writeAsStringAsync(path, base64Data, {
                            encoding: 'base64',
                        });
                    }
                    const { sound, status } = await Audio.Sound.createAsync(
                        { uri: path },
                        {
                            shouldPlay: false,
                            progressUpdateIntervalMillis: 100,
                        }
                    );

                    await sound.setVolumeAsync(volume);

                    await sound.setRateAsync(
                        playbackRate,
                        true
                    );

                    const fileInfo = await FileSystem.getInfoAsync(path);
                    console.log(fileInfo);
                    console.log("🎧 SOUND CREATED for lesson:", lessonID);
                    // Immediately store the initial status
                    setPlaybackStatus(prev => ({
                        ...prev,
                        [lessonID]: status,
                    }));

                    soundRefs.current[lessonID] = sound;

                    sound.setOnPlaybackStatusUpdate(async (status) => {
                        //console.log("RAW STATUS:", { isLoaded: status.isLoaded, durationMillis: status.durationMillis, positionMillis: status.positionMillis, playableDurationMillis: status.playableDurationMillis, uri: status.uri, });

                        if (status.isLoaded && status.durationMillis <= 1) {
                            console.warn("⚠️ BAD METADATA DETECTED - duration not resolved yet");
                        }

                        //console.log( "⏱ position:", status.positionMillis, "duration:", status.durationMillis );

                        setPlaybackStatus(prev => ({
                            ...prev,
                            [lessonID]: status,
                        }));

                        if (status.didJustFinish) {

                            console.log("TRACK FINISHED");

                            // REPEAT CURRENT TRACK
                            if (repeatRef.current) {

                                console.log("REPEAT CURRENT TRACK");

                                await sound.setPositionAsync(0);
                                await sound.playAsync();

                                return;
                            }

                            // REPEAT PLAYLIST / SHUFFLE
                            if (repeatAllRef.current || shuffleRef.current) {

                                console.log("PLAY NEXT TRACK");

                                await playNextLesson(lessonID);

                                return;
                            }

                            // STOP PLAYBACK
                            setIsPlaying(false);
                        }
                    });

                    // Force metadata refresh
                    const updatedStatus = await sound.getStatusAsync();

                    setPlaybackStatus(prev => ({
                        ...prev,
                        [lessonID]: updatedStatus,
                    }));

                    //console.log("▶️ Calling playAsync for:", lessonID);
                    await sound.playAsync();
                    //console.log("▶️ playAsync returned for:", lessonID);

                } else {

                    await soundRefs.current[lessonID].playAsync();
                }

                setRefresh(x => x + 1);

            } else {

                if (!soundRefs.current[lessonID]) {
                    setLoading(true);
                    const response = await fetch(`http://${serverIP}:8000/api/audio/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({ lesson_id: lessonID, full_audio: true }),
                    });

                    const blob = await response.blob();

                    const uri = URL.createObjectURL(blob);

                    const audioElement = new window.Audio();

                    audioElement.src = uri;
                    audioElement.volume = volume;
                    audioElement.playbackRate = playbackRate;
                    audioElement.preload = 'auto';
                    audioElement.crossOrigin = 'anonymous';

                    await new Promise((resolve) => {
                        audioElement.onloadedmetadata = resolve;
                    });

                    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

                    const src = audioCtx.createMediaElementSource(audioElement);

                    const analyser = audioCtx.createAnalyser();

                    src.connect(analyser);
                    analyser.connect(audioCtx.destination);

                    analyser.fftSize = 64;

                    soundRefs.current[lessonID] = {
                        audioElement,
                        analyser,
                    };

                    const updateStatus = () => {

                        setPlaybackStatus(prev => ({
                            ...prev,
                            [lessonID]: {
                                isLoaded: true,
                                isPlaying: !audioElement.paused,
                                positionMillis: audioElement.currentTime * 1000,
                                durationMillis: audioElement.duration * 1000,
                            }
                        }));
                    };

                    audioElement.addEventListener('timeupdate', updateStatus);

                    audioElement.addEventListener('loadedmetadata', updateStatus);

                    audioElement.addEventListener('play', updateStatus);

                    audioElement.addEventListener('pause', updateStatus);

                    audioElement.onended = async () => {

                        console.log("WEB TRACK FINISHED");

                        updateStatus();

                        // REPEAT CURRENT TRACK
                        if (repeatRef.current) {

                            console.log("WEB REPEAT CURRENT");

                            audioElement.currentTime = 0;
                            await audioElement.play();

                            return;
                        }

                        // NEXT TRACK / SHUFFLE
                        if (repeatAllRef.current || shuffleRef.current) {

                            console.log("WEB NEXT TRACK");

                            await playNextLesson(lessonID);

                            return;
                        }

                        setIsPlaying(false);
                    };

                    await audioElement.play();

                } else {

                    await soundRefs.current[lessonID].audioElement.play();
                }

                setRefresh(x => x + 1);
            }
        } catch (e) {
            console.error('Audio error:', e);
        } finally {
            setLoading(false);
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
            <LoadingOverlay visible={loading} />
            <TouchableOpacity style={styles.backLink} onPress={async () => { await stopAndUnloadAllAudio(); navigation.goBack(); }}>
                <AntDesign name="left" size={22} color="white" />
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
                                soundRef={{ current: soundRefs.current[lesson.id] }}
                                playbackStatus={playbackStatus[lesson.id]}
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
                                playbackStatus={playbackStatus[lesson.id]}
                            />

                        </View>
                        <TouchableOpacity
                            onPress={() => downloadAudio(lesson.id)}
                            style={{ marginLeft: 10 }}
                        >
                            <MaterialIcons
                                name={
                                    downloadedLessons[lesson.id]
                                        ? "download-done"
                                        : "download"
                                }
                                size={24}
                                color="white"
                            />
                        </TouchableOpacity>
                    </View>
                ))}
            </ScrollView>
            <BottomAudioMenu
                volume={volume}
                setVolume={setVolume}

                playbackRate={playbackRate}
                setPlaybackRate={setPlaybackRate}

                repeat={repeat}
                setRepeat={setRepeat}

                repeatAll={repeatAll}
                setRepeatAll={setRepeatAll}

                shuffle={shuffle}
                setShuffle={setShuffle}
            />
        </View>
    );


}




