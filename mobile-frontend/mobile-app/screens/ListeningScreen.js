
import React, { useState, useEffect, useRef } from 'react';
import { Audio } from 'expo-av';
import {
    View,
    TouchableOpacity,
    ScrollView,
    Alert,
    Platform,
} from 'react-native';
import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import { getServerIP } from '../utils/config';
import LoadingOverlay from './components/LoadingOverlay';
import AudioVisualizer from './components/AudioVisualizer';
import AudioProgressBar from './components/AudioProgressBar';
import ScrollingText from './components/ScrollingText';
import BottomAudioMenu from './components/BottomAudioMenu';
import CustomPopup from './components/CustomPopup';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles } from './styles/ListeningStyles';

export default function ListeningScreen({ navigation }) {
    const [lessons, setLessons] = useState([]);
    const [token, setToken] = useState(null);
    const [serverIP, setServerIP] = useState('');
    const [offlineMode, setOfflineMode] = useState(false);
    const [loading, setLoading] = useState(false);

    const [isPlaying, setIsPlaying] = useState(false);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [playbackStatus, setPlaybackStatus] = useState({});
    const [refresh, setRefresh] = useState(0);

    const [volume, setVolume] = useState(1.0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [repeat, setRepeat] = useState(false);
    const [repeatAll, setRepeatAll] = useState(false);
    const [shuffle, setShuffle] = useState(false);

    const [popup, setPopup] = useState({
        visible: false,
        message: '',
        type: 'error',
    });

    const soundRefs = useRef({});
    const lessonsRef = useRef([]);
    const repeatRef = useRef(false);
    const repeatAllRef = useRef(false);
    const shuffleRef = useRef(false);
    const initializedRef = useRef(false);

    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);

    const showError = (message) => {
        setPopup({ visible: true, message, type: 'error' });
    };

    useEffect(() => {
        const initialize = async () => {
            try {
                const ip = await getServerIP();
                setServerIP(ip);

                const storedToken = await AsyncStorage.getItem('accessToken');
                setToken(storedToken);

                const storedOfflineMode =
                    await AsyncStorage.getItem('offlineMode');

                const isOffline = storedOfflineMode === 'true';
                setOfflineMode(isOffline);

                const cachedSettings = await AsyncStorage.getItem(
                    'cachedListeningSettings'
                );

                if (cachedSettings) {
                    const settings = JSON.parse(cachedSettings);

                    setVolume(Number(settings.user_set_volume ?? 1));
                    setPlaybackRate(Number(settings.user_set_speed ?? 1));
                    setRepeat(settings.repeat_audio ?? false);
                    setRepeatAll(settings.repeat_audio_all ?? false);
                    setShuffle(settings.shuffle_audio ?? false);
                }

                // Load the lessons that LessonsScreen already downloaded.
                const db = await SQLite.openDatabaseAsync(
                    'langue_progress.db'
                );

                const rows = await db.getAllAsync(`
                    SELECT lesson_id, lesson_data, audio_path
                    FROM offline_lessons
                    ORDER BY downloaded_at DESC
                `);

                const downloadedLessons = rows.map((row) => {
                    const lessonData =
                        typeof row.lesson_data === 'string'
                            ? JSON.parse(row.lesson_data)
                            : row.lesson_data;

                    return {
                        ...lessonData,
                        id: row.lesson_id,
                        audio_path: row.audio_path,
                    };
                });

                setLessons(downloadedLessons);
                lessonsRef.current = downloadedLessons;

                // Update settings from the server only when online.
                if (!isOffline && storedToken && ip) {
                    try {
                        const response = await fetch(
                            `http://${ip}:8000/api/settings/`,
                            {
                                headers: {
                                    Authorization: `Bearer ${storedToken}`,
                                    'Content-Type': 'application/json',
                                },
                            }
                        );

                        if (response.ok) {
                            const settings = await response.json();

                            await AsyncStorage.setItem(
                                'cachedListeningSettings',
                                JSON.stringify(settings)
                            );

                            setVolume(Number(settings.user_set_volume ?? 1));
                            setPlaybackRate(
                                Number(settings.user_set_speed ?? 1)
                            );
                            setRepeat(settings.repeat_audio ?? false);
                            setRepeatAll(settings.repeat_audio_all ?? false);
                            setShuffle(settings.shuffle_audio ?? false);
                        }
                    } catch (error) {
                        console.log(
                            'Using cached listening settings:',
                            error.message
                        );
                    }
                }

                initializedRef.current = true;
            } catch (error) {
                console.error('ListeningScreen initialization failed:', error);
                Alert.alert(
                    'Error',
                    'Could not load downloaded lessons. Check the offline database.'
                );
            }
        };

        initialize();
    }, []);

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

    const saveAudioSettings = async () => {
        if (offlineMode || !token || !serverIP) return;

        try {
            const settings = {
                user_set_volume: volume,
                user_set_speed: playbackRate,
                repeat_audio: repeat,
                repeat_audio_all: repeatAll,
                shuffle_audio: shuffle,
            };

            await AsyncStorage.setItem(
                'cachedListeningSettings',
                JSON.stringify(settings)
            );

            await fetch(`http://${serverIP}:8000/api/settings/`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(settings),
            });
        } catch (error) {
            console.error('Failed to save audio settings:', error);
        }
    };

    useEffect(() => {
        if (!initializedRef.current) return;

        const timeout = setTimeout(saveAudioSettings, 400);
        return () => clearTimeout(timeout);
    }, [volume, playbackRate, repeat, repeatAll, shuffle]);

    useEffect(() => {
        const updateAudioSettings = async () => {
            if (currentLesson == null) return;

            const sound = soundRefs.current[currentLesson];
            if (!sound) return;

            try {
                if (Platform.OS === 'web') {
                    sound.audioElement.volume = volume;
                    sound.audioElement.playbackRate = playbackRate;
                } else {
                    await sound.setVolumeAsync(volume);
                    await sound.setRateAsync(playbackRate, true);
                }
            } catch (error) {
                console.error('Failed to update audio settings:', error);
            }
        };

        updateAudioSettings();
    }, [volume, playbackRate, currentLesson]);

    const stopAndUnloadAllAudio = async () => {
        try {
            for (const sound of Object.values(soundRefs.current)) {
                if (Platform.OS === 'web') {
                    if (sound.audioElement) {
                        sound.audioElement.pause();
                        sound.audioElement.currentTime = 0;
                        sound.audioElement.src = '';
                        sound.audioElement.load();
                    }
                } else {
                    try {
                        await sound.stopAsync();
                    } catch {}

                    try {
                        await sound.unloadAsync();
                    } catch {}
                }
            }

            soundRefs.current = {};
            setPlaybackStatus({});
            setIsPlaying(false);
            setCurrentLesson(null);
        } catch (error) {
            console.error('Audio cleanup error:', error);
        }
    };

    useEffect(() => {
        return () => {
            stopAndUnloadAllAudio();
        };
    }, []);

    const playNextLesson = async (currentLessonID) => {
        const currentLessons = lessonsRef.current;
        if (!currentLessons.length) return;

        const currentIndex = currentLessons.findIndex(
            (lesson) => lesson.id === currentLessonID
        );

        let nextLesson;

        if (shuffleRef.current && currentLessons.length > 1) {
            const choices = currentLessons.filter(
                (lesson) => lesson.id !== currentLessonID
            );

            nextLesson = choices[
                Math.floor(Math.random() * choices.length)
            ];
        } else {
            const nextIndex = (currentIndex + 1) % currentLessons.length;
            nextLesson = currentLessons[nextIndex];
        }

        if (nextLesson) {
            await playAudio(nextLesson.id);
        }
    };

    const playAudio = async (lessonID) => {
        const lesson = lessonsRef.current.find(
            (item) => item.id === lessonID
        );

        if (!lesson) return;

        // This path must be the local audio file saved by LessonsScreen.
        const audioPath = lesson.audio_path;

        if (!audioPath) {
            showError(
                `No downloaded audio path was saved for "${lesson.title}".`
            );
            return;
        }

        setCurrentLesson(lessonID);
        setIsPlaying(true);

        try {
            // Pause other tracks.
            for (const [id, sound] of Object.entries(soundRefs.current)) {
                if (Number(id) !== lessonID) {
                    if (Platform.OS === 'web') {
                        sound.audioElement?.pause();
                    } else {
                        await sound.pauseAsync();
                    }
                }
            }

            if (!soundRefs.current[lessonID]) {
                setLoading(true);

                if (Platform.OS !== 'web') {
                    // Play the existing downloaded file. No API request.
                    const { sound, status } = await Audio.Sound.createAsync(
                        { uri: audioPath },
                        {
                            shouldPlay: false,
                            progressUpdateIntervalMillis: 100,
                            volume,
                            rate: playbackRate,
                        }
                    );

                    soundRefs.current[lessonID] = sound;

                    setPlaybackStatus((prev) => ({
                        ...prev,
                        [lessonID]: status,
                    }));

                    sound.setOnPlaybackStatusUpdate(async (status) => {
                        if (!status.isLoaded) return;

                        setPlaybackStatus((prev) => ({
                            ...prev,
                            [lessonID]: status,
                        }));

                        if (status.didJustFinish) {
                            if (repeatRef.current) {
                                await sound.setPositionAsync(0);
                                await sound.playAsync();
                            } else if (
                                repeatAllRef.current ||
                                shuffleRef.current
                            ) {
                                await playNextLesson(lessonID);
                            } else {
                                setIsPlaying(false);
                            }
                        }
                    });

                    await sound.playAsync();
                } else {
                    // Web can only play this if audio_path is a usable
                    // browser-accessible local URL.
                    const audioElement = new window.Audio(audioPath);

                    audioElement.volume = volume;
                    audioElement.playbackRate = playbackRate;
                    audioElement.preload = 'auto';

                    const updateStatus = () => {
                        setPlaybackStatus((prev) => ({
                            ...prev,
                            [lessonID]: {
                                isLoaded: true,
                                isPlaying: !audioElement.paused,
                                positionMillis: audioElement.currentTime * 1000,
                                durationMillis: audioElement.duration * 1000,
                            },
                        }));
                    };

                    audioElement.addEventListener('timeupdate', updateStatus);
                    audioElement.addEventListener('loadedmetadata', updateStatus);
                    audioElement.addEventListener('play', updateStatus);
                    audioElement.addEventListener('pause', updateStatus);

                    audioElement.onended = async () => {
                        if (repeatRef.current) {
                            audioElement.currentTime = 0;
                            await audioElement.play();
                        } else if (
                            repeatAllRef.current ||
                            shuffleRef.current
                        ) {
                            await playNextLesson(lessonID);
                        } else {
                            setIsPlaying(false);
                        }
                    };

                    soundRefs.current[lessonID] = { audioElement };
                    await audioElement.play();
                }
            } else {
                const sound = soundRefs.current[lessonID];

                if (Platform.OS === 'web') {
                    await sound.audioElement.play();
                } else {
                    await sound.playAsync();
                }
            }

            setRefresh((value) => value + 1);
        } catch (error) {
            console.error('Audio playback error:', error);
            setIsPlaying(false);
            showError(
                'Could not play this downloaded audio file. It may be missing or unavailable.'
            );
        } finally {
            setLoading(false);
        }
    };

    const pauseAudio = async () => {
        setIsPlaying(false);

        try {
            if (currentLesson == null) return;

            const sound = soundRefs.current[currentLesson];
            if (!sound) return;

            if (Platform.OS === 'web') {
                sound.audioElement?.pause();
            } else {
                await sound.pauseAsync();
            }
        } catch (error) {
            console.error('Pause error:', error);
        }
    };

    return (
        <View style={styles.container}>
            <LoadingOverlay visible={loading} />

            <TouchableOpacity
                style={styles.backLink}
                onPress={async () => {
                    await stopAndUnloadAllAudio();
                    navigation.goBack();
                }}
            >
                <AntDesign name="left" size={22} color="white" />
            </TouchableOpacity>

            <ScrollView contentContainerStyle={styles.gridWrapper}>
                {lessons.map((lesson) => (
                    <View key={lesson.id} style={styles.card}>
                        <View style={styles.topCard}>
                            <ScrollingText
                                text={lesson.title}
                                isPlaying={
                                    currentLesson === lesson.id && isPlaying
                                }
                                width={200}
                                speed={40}
                            />

                            <AudioVisualizer
                                soundRef={{
                                    current: soundRefs.current[lesson.id],
                                }}
                                playbackStatus={playbackStatus[lesson.id]}
                                isPlaying={
                                    currentLesson === lesson.id && isPlaying
                                }
                                onPlay={() => playAudio(lesson.id)}
                                onPause={pauseAudio}
                                width={120}
                                height={40}
                            />
                        </View>

                        <View style={styles.bottomCard}>
                            <AudioProgressBar
                                soundRef={{
                                    current: soundRefs.current[lesson.id],
                                }}
                                playbackStatus={playbackStatus[lesson.id]}
                            />
                        </View>
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

            <CustomPopup
                visible={popup.visible}
                message={popup.message}
                type={popup.type}
                onClose={() =>
                    setPopup((prev) => ({ ...prev, visible: false }))
                }
            />
        </View>
    );
}
