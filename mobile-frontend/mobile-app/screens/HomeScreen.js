// HomeScreen.js
import React, { useEffect, useState, useRef } from 'react';
import { Platform, BackHandler, Animated, TouchableOpacity, TextInput, Text, View, useWindowDimensions } from 'react-native';
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
import WordList from './components/WordList';
import EditWordPopup from './components/EditWordPopup';

import styles from './styles/HomeStyles';
import config from '../utils/config';

SplashScreen.preventAutoHideAsync();

export default function HomeScreen({ navigation }) {
    const { width, height } = useWindowDimensions();
    const server = config.SERVER_IP;

    // State
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [appIsReady, setAppIsReady] = useState(false);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
    const [rows, setRows] = useState([]);
    const [index, setIndex] = useState(0);
    const [currentLesson, setCurrentLesson] = useState(null);
    const [currentAudio, setCurrentAudio] = useState(null);
    const [selectedText, setSelectedText] = useState('');
    const [translatedText, setTranslatedText] = useState('');
    const [multiDefinition, setMultiDefinition] = useState(false);
    const [multiDefDisplay, setMultiDefDisplay] = useState('');
    const [nativeLanguage, setNativeLanguage] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('');
    const [isPlaying, setIsPlaying] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const [showExitModal, setShowExitModal] = useState(false);
    const [description, setDescription] = useState('');

    const soundRef = useRef(null);

    // --- Popup helpers ---
    const showSuccess = (message) => setPopup({ visible: true, message, type: 'success' });
    const showError = (message) => setPopup({ visible: true, message, type: 'error' });

    const handleAddWord = (newWord) => {
        // Ensure translatedText is an array
        setTranslatedText(prev => {
            if (Array.isArray(prev)) {
                return [...prev, newWord]; // append new word
            } else {
                return [newWord]; // start fresh with the new word
            }
        });
        showSuccess('Word added!');
    };

    // --- Clipboard helper ---
    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(selectedText);
        showSuccess('Text copied to clipboard!');
    };

    // --- Audio helpers ---
    const playAudio = async () => {
        if (!currentAudio) return;
        setIsPlaying(true);

        try {
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            const response = await fetch(`http://${server}:8000/api/audio/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ lesson_id: currentLesson, current_lesson_index: index, full_audio: false }),
            });

            const blob = await response.blob();

            if (Platform.OS === "web") {
            // Web: No FileSystem support
            const url = URL.createObjectURL(blob);
            const { sound } = await Audio.Sound.createAsync({ uri: url }, { shouldPlay: true });
            soundRef.current = sound;

            sound.setOnPlaybackStatusUpdate(status => {
                if (status.didJustFinish) setIsPlaying(false);
            });

        } else {
            // Native: Use FileSystem
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64Data = reader.result.split(",")[1];
                const path = FileSystem.cacheDirectory + `audio-${Date.now()}.mp3`;

                await FileSystem.writeAsStringAsync(path, base64Data, {
                    encoding: FileSystem.EncodingType.Base64,
                });

                const { sound } = await Audio.Sound.createAsync({ uri: path }, { shouldPlay: true });
                soundRef.current = sound;

                sound.setOnPlaybackStatusUpdate(status => {
                    if (status.didJustFinish) setIsPlaying(false);
                });
            };
            reader.readAsDataURL(blob);
        }

        } catch (e) {
            console.error('Audio error:', e);
            showError('Audio playback failed');
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
        const translation = await translateWord(cleanedWord);
        setTranslatedText(translation);
    };

    const translateWord = async (word) => {
        setLoading(true);
        try {
            const response = await fetch(`http://${server}:8000/api/translate/`, {
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
            setCurrentAudio(rows[index + 1]?.[0] || '');
            setDescription('');
        }
    };
    const back = () => {
        if (index > 0) {
            setIndex(index - 1);
            setCurrentAudio(rows[index - 1]?.[0] || '');
            setDescription('');
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

    // --- Initialization ---
    useEffect(() => {
        const init = async () => {
            try {
                // Load fonts (if any)
                await Font.loadAsync({
                    // Example: 'Roboto': require('../assets/fonts/Roboto-Regular.ttf')
                });

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
            }
        };
        init();
    }, []);

    // --- Fetch user and lesson data ---
    useEffect(() => {
        if (!token) return;

        const fetchUserProfile = async () => {
            try {
                const res = await fetch(`http://${server}:8000/api/profile/`, { headers: { Authorization: `Bearer ${token}` } });
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
                const progressRes = await fetch(`http://${server}:8000/api/user-progress/?lesson_id=${currentLesson}`, { headers: { Authorization: `Bearer ${token}` } });
                if (progressRes.ok) {
                    const progressData = await progressRes.json();
                    setNativeLanguage(progressData.native_lang);
                    setTargetLanguage(progressData.target_lang);
                    setIndex(progressData.current_lesson_index || 0);
                }

                const lessonRes = await fetch(`http://${server}:8000/api/lesson/${currentLesson}/`, { headers: { Authorization: `Bearer ${token}` } });
                if (lessonRes.ok) {
                    const lessonData = await lessonRes.json();
                    const parsed = (lessonData.sentences || []).map(s => [s.audio_file, s.sentence, s.translated_sentence]);
                    setRows(parsed);
                    setCurrentAudio(parsed[0]?.[0] || '');
                }
            } catch (err) {
                console.error(err);
            }
        };
        fetchLessonData();
    }, [token, currentLesson]);

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
                    padding: 10, // optional padding
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
                    <Text>
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
                    </Text>
                </View>
                {/* Fixed-height definition container */}
                <View style={styles.defContainer}>
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



                    <StatusIndicator />
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
                    <WordList
                        words={Array.isArray(translatedText) ? translatedText : []}
                        onWordPress={displaySelectedText}
                        onAddWord={handleAddWord}
                        selectedText={selectedText}
                        translatedText={translatedText}
                        nat_id={nativeLanguage}
                        tar_id={targetLanguage}
                        popup={popup}
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
                </View>
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

            <LoadingOverlay visible={loading} />

        </View>
    );
}
