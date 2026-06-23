// HomeScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { Platform, BackHandler, Animated, TouchableOpacity, TextInput, Text, ScrollView, View, useWindowDimensions } from 'react-native';
import { Audio } from 'expo-av';
import * as Font from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

import { FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import { Entypo } from '@expo/vector-icons';

import StatusIndicator from './components/StatusIndicator';
import ExitConfirmationModal from './components/ExitConfirmationModal';
import LoadingOverlay from './components/LoadingOverlay';
import ProgressBar from './components/ProgressBar';
import CustomPopup from './components/CustomPopup';
import DefinitionList from './components/DefinitionList';


//import styles from './styles/HomeStyles';
import { getServerIP } from '../utils/config';
import BottomAudioMenu from "./components/BottomAudioMenu";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles } from './styles/HomeStyles';
//SplashScreen.preventAutoHideAsync();

export default function HomeScreen({ navigation }) {
    const { width, height } = useWindowDimensions();


    // State
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [serverIP, setServerIP] = useState('');
    const [appIsReady, setAppIsReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
    const [rows, setRows] = useState([]);
    const [index, setIndex] = useState(0);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [startMs, setStartMs] = useState(0);
    const [endMs, setEndMs] = useState(0);
    const [selectedText, setSelectedText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [translationIDs, setTranslationIDs] = useState([]);
    const [multiDefinition, setMultiDefinition] = useState(false);
    const [multiDefDisplay, setMultiDefDisplay] = useState('');
    const [nativeLanguage, setNativeLanguage] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const [showExitModal, setShowExitModal] = useState(false);
    const [description, setDescription] = useState('');
    const [lessonAudio, setLessonAudio] = useState(null);
    const [hasAudio, setHasAudio] = useState(true);

    const soundRef = useRef(null);
    const [volume, setVolume] = useState(1.0);
    const [playbackRate, setPlaybackRate] = useState(1.0);
    const [wordFrequencies, setWordFrequencies] = useState([]);
    const [selectedFrequency, setSelectedFrequency] = useState(0);

    // --- Popup helpers ---
    const showSuccess = (message) => setPopup({ visible: true, message, type: 'success' });
    const showError = (message) => setPopup({ visible: true, message, type: 'error' });

    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);

    const fetchWordFrequencies = async (sentenceId) => {
        try {
            const response = await fetch(
                `http://${serverIP}:8000/api/sentence-word-frequency/`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        sentence_id: sentenceId,
                    }),
                }
            );

            const data = await response.json();
            console.log("Sentence data:", data);

            if (response.ok) {
                setWordFrequencies(data);
            } else {
                console.error(data);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleAddDefinition = (newDefinition) => {
        // Ensure translatedText is an array
        setTranslatedText(prev => {
            if (Array.isArray(prev)) {
                return [...prev, newDefinition]; // append new definition
            } else {
                return [newDefinition]; // start fresh with the new definition
            }
        });
        showSuccess('Definition added!');
    };



    const refreshTranslation = async (word) => {
        const translation = await translateWord(word);
        setTranslatedText(translation);
    };

    const handleUpdateDefinition = (id, def) => {
        setTranslatedText(prev => {
            if (!Array.isArray(prev)) return prev;
            return prev.map(item =>
                item.translation_id === id
                    ? { ...item, definition: def }
                    : item
            );
        });
    };

    // --- Clipboard helper ---
    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(selectedText);
        showSuccess('Text copied to clipboard!');
    };

    const updateLessonProgress = async (newIndex) => {
        if (!token || !currentLesson) return;

        try {
            await fetch(`http://${serverIP}:8000/api/user-progress/`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lesson_id: currentLesson,
                    current_lesson_index: newIndex,
                }),
            });
        } catch (err) {
            console.error("Failed to update lesson progress:", err);
        }
    };

    // --- Audio helpers ---
    const playAudio = async () => {
        console.log("Playing index:", index);
        console.log("segmentStart:", rows[index][3]);
        if (!lessonAudio || !rows[index]) return;

        try {
            if (!soundRef.current) {
                const { sound } = await Audio.Sound.createAsync(
                    { uri: lessonAudio },
                    {
                        shouldPlay: false,
                        volume,
                        rate: playbackRate,
                        shouldCorrectPitch: true,
                    }
                );

                soundRef.current = sound;
            }

            const sound = soundRef.current;
            sound.setOnPlaybackStatusUpdate(null);
            await sound.stopAsync();


            const segmentStart = rows[index][3];
            const segmentEnd = rows[index][4];

            setStartMs(segmentStart);
            setEndMs(segmentEnd);

            await sound.setPositionAsync(segmentStart);
            await sound.playAsync();

            setIsPlaying(true);

            const currentIndex = index;

            sound.setOnPlaybackStatusUpdate(async (status) => {
                if (!status.isLoaded) return;

                // ignore callback from old play requests
                if (currentIndex !== index) return;

                if (status.positionMillis >= segmentEnd) {
                    await sound.pauseAsync();
                    await sound.setPositionAsync(segmentStart);
                    setIsPlaying(false);
                }
            });

        } catch (e) {
            console.error("Audio error:", e);
        }
    };

    const pauseAudio = async () => {
        setIsPlaying(false);
        if (soundRef.current) await soundRef.current.pauseAsync();
    };

    // --- Word translation ---
    const cleanText = (text) => text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>@\[\]\\|]/g, '').trim();

    const displaySelectedText = async (word) => {
        const cleanedWord = cleanText(word);
        setSelectedText(cleanedWord);
        const match = wordFrequencies.find(w => w.word.toLowerCase() === cleanedWord.toLowerCase());
        setSelectedFrequency(() => match?.frequency ?? 0);
        const translation = await translateWord(cleanedWord);
        setTranslatedText(translation);

        console.log("Clicked word:", cleanedWord);
        console.log("Matches:", wordFrequencies);
        console.log("Found:", match);
    };

    const translateWord = async (word) => {
        setLoading(true);
        try {
            const response = await fetch(`http://${serverIP}:8000/api/translate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ text: word, native_id: nativeLanguage, target_id: targetLanguage }),
            });
            const data = await response.json();
            setLoading(false);

            if (response.ok) {
                if (data.translated.length > 1 && Array.isArray(data.translated)) {
                    setMultiDefinition(true);
                    setMultiDefDisplay(data.translated[0]);
                } else {
                    setMultiDefinition(false);
                }
                setTranslationIDs(data.translation_ids || []);
                console.log("Translation response:", data.translated[0].definition);
                return data.translated;
            } else {
                showError('Translation API error');
                return 'Translation error';
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
            return 'Error connecting to API';
        }
    };

    // --- Navigation helpers ---
    const next = () => {
        if (index < rows.length - 1) {
            setIndex(index + 1);
            setDescription('');
            updateLessonProgress(index + 1);
        }
    };
    const back = () => {
        if (index > 0) {
            setIndex(index - 1);
            setDescription('');
            updateLessonProgress(index - 1);
        }
    };

    // --- Menu toggle ---
    const toggleMenu = () => {
        if (menuOpen) {
            Animated.timing(slideAnim, { toValue: -200, duration: 500, useNativeDriver: true }).start(() => setMenuOpen(false));
        } else {
            setMenuOpen(true);
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }).start();
        }
    };

    const decodeToken = (token) => {
        try {
            return jwtDecode(token);
        } catch (err) {
            console.error('Token decode failed:', err);
            return null;
        }
    };

    const saveAudioSettings = async () => {
        if (!token || !nativeLanguage || !targetLanguage) { return; }
        try {
            console.log({
                nativeLanguage,
                targetLanguage,
                volume,
                playbackRate
            });
            const response = await fetch(
                `http://${serverIP}:8000/api/settings/`,
                {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        user_set_volume: volume,
                        user_set_speed: playbackRate,
                        native_language: nativeLanguage.lang_name,
                        target_language: targetLanguage.lang_name,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(data);
            }
        } catch (e) {
            console.error(e);
        }
    };



    useEffect(() => {
        if (!token || !serverIP) return;
        const fetchSettings = async () => {
            try {
                const res = await fetch(`http://${serverIP}:8000/api/settings/`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (res.ok) {
                    const data = await res.json();

                    setVolume(data.user_set_volume ?? 1.0);
                    setPlaybackRate(data.user_set_speed ?? 1.0);
                }
            } catch (e) {
                console.error("Failed to load settings:", e);
            }
        };

        fetchSettings();
    }, [token]);


    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            try {
                // Load fonts (if any)
                await Font.loadAsync({
                    // Example: 'Roboto': require('../assets/fonts/Roboto-Regular.ttf')
                });

                const ip = await getServerIP();
                setServerIP(ip);

                const storedToken = await AsyncStorage.getItem('accessToken');
                if (storedToken) {
                    setToken(storedToken);
                    const decoded = decodeToken(storedToken);
                    if (decoded) setUser(decoded);
                }
            } catch (err) {
                console.error('Initialization error:', err);
            } finally {
                setAppIsReady(true);
                await SplashScreen.hideAsync();
                setAppIsReady(true);
            }
        };
        init();
    }, []);

    // --- Fetch user and lesson data ---
    useEffect(() => {
        if (!token) return;

        const fetchUserProfile = async () => {
            try {
                const res = await fetch(`http://${serverIP}:8000/api/profile/`, { headers: { Authorization: `Bearer ${token}` } });
                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData);
                    setCurrentLesson(userData.current_lesson);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchUserProfile();
    }, [token]);

    useEffect(() => {
        if (!token || !currentLesson) return;

        const fetchLessonData = async () => {
            try {
                const progressRes = await fetch(`http://${serverIP}:8000/api/user-progress/?lesson_id=${currentLesson}`, { headers: { Authorization: `Bearer ${token}` } });
                if (progressRes.ok) {
                    const progressData = await progressRes.json();
                    console.log("nativeLanguage:", nativeLanguage);
                    console.log("targetLanguage:", targetLanguage);
                    setNativeLanguage(progressData.native_lang);
                    setTargetLanguage(progressData.target_lang);
                    setIndex(progressData.current_lesson_index || 0);

                }

                const lessonRes = await fetch(`http://${serverIP}:8000/api/lesson/${currentLesson}/`, { headers: { Authorization: `Bearer ${token}` } });
                if (lessonRes.ok) {
                    const lessonData = await lessonRes.json();
                    const parsed = (lessonData.sentences || []).map(s => [s.id, s.sentence, s.translated_sentence, s.start_ms, s.end_ms]);
                    console.log("Fetched lesson data:", parsed);
                    console.log("Current Lesson:", lessonData);
                    setRows(parsed);
                    setHasAudio(lessonData.audioUploaded);
                    console.log(lessonData.audioUploaded);
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchLessonData();
    }, [token, currentLesson]);

    useEffect(() => {
        if (!token || !currentLesson || !serverIP) return;
        //if (hasAudio === false) return;

        const fetchAudio = async () => {
            if (hasAudio === false) return;
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/audio/`,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            lesson_id: currentLesson,
                            current_lesson_index: index,
                            full_audio: true,
                        }),
                    }
                );

                if (response.status === 404) {
                    console.log("No audio for this lesson");
                    setLessonAudio(null);
                    return;
                }

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const blob = await response.blob();

                if (Platform.OS === 'web') {
                    const url = URL.createObjectURL(blob);
                    setLessonAudio(url);
                } else {
                    const reader = new FileReader();

                    reader.onloadend = async () => {
                        const base64Data = reader.result.split(',')[1];

                        const path =
                            FileSystem.cacheDirectory +
                            `lesson-audio-${currentLesson}.mp3`;

                        await FileSystem.writeAsStringAsync(path, base64Data, {
                            encoding: FileSystem.EncodingType.Base64,
                        });

                        setLessonAudio(path);
                    };

                    reader.readAsDataURL(blob);
                }
            } catch (e) {
                console.error('Audio fetch failed:', e);
            }
        };

        fetchAudio();
    }, [token, currentLesson, serverIP]);

    useEffect(() => {
        const updateAudioSettings = async () => {
            if (!soundRef.current) return;

            try {
                if (Platform.OS === 'web') {
                    const status = await soundRef.current.getStatusAsync();

                    if (status.isLoaded) {
                        await soundRef.current.setVolumeAsync(volume);
                        await soundRef.current.setRateAsync(
                            playbackRate,
                            true
                        );
                    }
                } else {
                    await soundRef.current.setVolumeAsync(volume);

                    await soundRef.current.setRateAsync(
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
        if (!rows.length || !token) return;

        const sentenceId = rows[index]?.[0];

        if (sentenceId) {
            fetchWordFrequencies(sentenceId);
        }

    }, [index, rows, token]);

    // --- Save settings ---
    useEffect(() => {
        if (!token) return;

        const timeout = setTimeout(() => {
            saveAudioSettings();
        }, 400);

        return () => clearTimeout(timeout);

    }, [
        volume,
        playbackRate
    ]);

    // --- Render ---
    if (!appIsReady) return null; // splash screen remains

    return (

        <View style={styles.container}>
            {/* Top Section */}
            <View style={styles.topSection}>

                <Text style={styles.topNavText}>Langue</Text>

                <TouchableOpacity onPress={toggleMenu} style={styles.hamburgerIcon}>
                    <Entypo name="menu" size={40} color="white" />
                </TouchableOpacity>

            </View>

            {/* Middle Section */}
            {user && (
                <View style={{
                    position: 'absolute',
                    top: height / 9,
                    right: 0,
                    padding: 10,
                }}>
                    <Text style={{
                        color: 'white',
                        fontSize: width * 0.02,

                    }}>
                        Hello, {user.username}
                    </Text>
                </View>
            )}

            <View style={styles.middleSection}>

                <ProgressBar progress={rows.length > 1 ? index / (rows.length - 1) : 0} />

                {/* Fixed-height word container */}
                <View style={styles.wordContainer}>
                    <ScrollView
                        style={styles.wordScroll}
                        contentContainerStyle={styles.wordWrap}
                        showsVerticalScrollIndicator={true}
                    >
                        {rows[index]?.[1].split(' ').map((word, i) => (
                            <Text
                                key={i}
                                style={styles.word}
                                onPress={() => {
                                    // handle word click here
                                    displaySelectedText(word)

                                    // or call a function: onWordPress(word)
                                }}
                            >
                                {word}
                                {/* Add a space after each word */}
                                {i < rows[index]?.[2].split(' ').length - 1 ? ' ' : ''}
                            </Text>
                        ))}
                    </ScrollView>
                </View>
                {/* Fixed-height definition container */}
                <ScrollView style={styles.defContainer}>
                    <View>
                        <Text style={styles.defHeader}>Definition</Text>
                    </View>


                    <View style={styles.translateBtn}>
                        <TouchableOpacity
                            onPress={() => {
                                setDescription(rows[parseInt(index)][2]);
                                console.log(index)
                                console.log(rows[index][2])
                            }}

                        >
                            <Text style={styles.buttonText}>Translate Sentence</Text>
                        </TouchableOpacity>
                    </View>



                    <StatusIndicator frequency={selectedFrequency} />
                    <Text style={styles.partOfSpeech}>adjective</Text>


                    <View style={styles.textRow}>
                        {/* <Text style={styles.leftText}>Target:</Text> */}
                        <TouchableOpacity style={styles.copy1} onPress={copyToClipboard}>
                            <AntDesign name="copy" size={24} color="black" />
                        </TouchableOpacity>

                        <Text style={styles.rightText}>
                            {selectedText} : {multiDefinition ? multiDefDisplay : translatedText}
                        </Text>
                    </View>
                    <View style={styles.separatorSolid} />
                    {/* <View style={styles.textRow}>
                        <Text style={styles.leftText}>Native:</Text>
                        <TextInput
                            style={styles.rightText}
                            value={translatedText}
                            onChangeText={setTranslatedText}
                        />
                        

                    </View> */}
                    <DefinitionList
                        definitions={Array.isArray(translatedText) ? translatedText : []}
                        translationIDs={translationIDs}
                        onWordPress={displaySelectedText}
                        onAddDefinition={handleAddDefinition}
                        selectedText={selectedText}
                        translatedText={translatedText}
                        nat_id={nativeLanguage}
                        tar_id={targetLanguage}
                        popup={popup}
                        token={token}
                        server={serverIP}
                        showSuccess={showSuccess}
                        showError={showError}
                        onDefinitionUpdated={handleUpdateDefinition}
                        onRefreshTranslation={refreshTranslation}
                    />

                    <View style={styles.separatorDotted} />
                    <View>
                        {/* <TextInput
                            style={styles.defDescription}
                            value={description}
                            onChangeText={''}
                        /> */}
                        <Text
                            style={styles.defDescription}

                        >{description}</Text>
                    </View>
                    {/* <View style={styles.translateBtn}>
                        <TouchableOpacity
                            onPress={() => {
                                setDescription(rows[parseInt(index)][2]);
                                console.log(index)
                                console.log(rows[index][2])
                            }}

                        >
                            <Text style={styles.buttonText}>Translate Sentence</Text>
                        </TouchableOpacity>
                    </View> */}
                </ScrollView>
            </View>

            {menuOpen && (
                <Animated.View style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}>

                    <Text style={styles.menuHeader}>Menu {user && <Text style={{ fontSize: 10 }}>{user.username}</Text>}</Text>
                    <View style={styles.separatorSolid} />

                    {user && (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('Import');
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.navText}>Import</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate('Lessons');
                            setMenuOpen(false);
                        }}
                    >
                        <Text style={styles.navText}>Lessons</Text>
                    </TouchableOpacity>

                    {user && (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('Listening');
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.navText}>Listening</Text>
                        </TouchableOpacity>
                    )}

                    {user && (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('LiveTVScreen');
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.navText}>Live TV</Text>
                        </TouchableOpacity>
                    )}

                    {user && (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('Alphabet');
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.navText}>Alphabet</Text>
                        </TouchableOpacity>
                    )}

                    {user ? (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('Account');
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.navText}>Account</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('Login');
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.navText}>Login</Text>
                        </TouchableOpacity>
                    )}

                    {!user && (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('Signup');
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.navText}>Signup</Text>
                        </TouchableOpacity>
                    )}

                    {user && (
                        <TouchableOpacity
                            onPress={() => {
                                navigation.navigate('Settings');
                                setMenuOpen(false);
                            }}
                        >
                            <Text style={styles.navText}>Settings</Text>
                        </TouchableOpacity>
                    )}




                    <TouchableOpacity onPress={() => setShowExitModal(true)}>
                        <Text style={styles.navText}>Exit</Text>
                    </TouchableOpacity>
                </Animated.View>
            )}
            {/* Bottom Section */}
            <View style={styles.bottomSection}>

                <View style={styles.controls}>
                    <AntDesign name="left" size={24} color="white" onPress={back} />
                    {isPlaying ? (
                        <FontAwesome name="pause" size={24} color="white" onPress={pauseAudio} />
                    ) : (
                        <FontAwesome name="play" size={24} color="white" onPress={playAudio} />
                    )
                    }

                    <AntDesign name="right" size={24} color="white" onPress={next} />
                </View>
            </View>

            <ExitConfirmationModal
                visible={showExitModal}
                onCancel={() => setShowExitModal(false)}
                onConfirm={() => {
                    setShowExitModal(false);
                    BackHandler.exitApp();
                }}
            />


            <CustomPopup
                visible={popup.visible}
                message={popup.message}
                type={popup.type}
                onClose={() => setPopup({ ...popup, visible: false })}
            />

            <BottomAudioMenu
                volume={volume}
                setVolume={setVolume}
                playbackRate={playbackRate}
                setPlaybackRate={setPlaybackRate}
                showToggles={false}
            />

            <LoadingOverlay visible={loading} />

        </View>
    );
}
