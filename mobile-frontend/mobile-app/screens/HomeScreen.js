// HomeScreen.js
import React, { useEffect, useState, useRef } from 'react';

import { View, Text, Button, StyleSheet, TouchableOpacity, ScrollView, Animated, Image, Alert, TextInput } from 'react-native';
import { Audio } from 'expo-av';

import logo from '../assets/favicon.png';
import { FontAwesome } from '@expo/vector-icons';
import AntDesign from '@expo/vector-icons/AntDesign';
import StatusIndicator from './components/StatusIndicator';
import ExitConfirmationModal from './components/ExitConfirmationModal';
import styles from './styles/HomeStyles';
import { Entypo } from '@expo/vector-icons';
import { BackHandler } from 'react-native';
import * as Font from 'expo-font';
import SaveWordButton from './components/SendSaveWord';
import LoadingOverlay from './components/LoadingOverlay';
import ProgressBar from './components/ProgressBar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import * as Clipboard from 'expo-clipboard';
import CustomPopup from './components/CustomPopup';
import config from '../utils/config';


import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

export default function HomeScreen({ navigation }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [translatedText, setTranslatedText] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [rows, setRows] = useState([]);
    const [index, setIndex] = useState(0);
    const [currentLesson, setCurrentLesson] = useState(null)
    const [currentAudio, setCurrentAudio] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const [showExitModal, setShowExitModal] = useState(false);
    const [appIsReady, setAppIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });
    const [nativeText, setNativeText] = useState('');
    const [description, setDescription] = useState('This is a description of the definition.');
    const server = config.SERVER_IP;

    const soundRef = useRef(null);


    const showSuccess = (message) => {
        setPopup({ visible: true, message: message, type: 'success' });
    };

    const showError = (message) => {
        setPopup({ visible: true, message: message, type: 'error' });
    };

    const updateLessonProgress = async () => {
        if (!token) return;

        try {
            const res = await fetch(`http://${server}:8000/api/user-progress/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lesson_id: currentLesson,
                    current_lesson_index: index,
                }),
            });

            if (!res.ok) {
                const err = await res.text();
                console.error('Failed to update lesson progress:', err);
                showError('Failed to update lesson progress');
                return;
            }

            const data = await res.json();
            //showSuccess('Lesson progress updated');

            console.log('Lesson progress response:', data);
        } catch (e) {
            console.error('Error updating lesson progress:', e);
            showError('Error updating lesson progress');
        }
    };



    const cleanText = (text) => {
        return text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'<>@\[\]\\|]/g, '').trim();
    };

    const displaySelectedText = async (word) => {
        console.log('Clicked word:', word);
        const cleanedWord = cleanText(word);
        setSelectedText(cleanedWord);

        const translation = await translateWord(cleanedWord); // pass word to function
        setTranslatedText(translation);
    };

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(selectedText);
        showSuccess('Text has been copied to clipboard.')
        //Alert.alert('Copied!', 'Text has been copied to clipboard.');
    };


    const playAudio = async () => {
        if (!currentAudio) return;
        setIsPlaying(true);

        try {
            // Unload previous sound
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            // Fetch audio as blob
            const response = await fetch(`http://localhost:8000/api/audio/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    lesson_id: currentLesson,
                    current_lesson_index: index,
                }),
            });

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

        } catch (e) {
            showError('Audio error:', e);
            console.error('Audio error:', e);
        }
    };



    const translateWord = async (word) => {
        setLoading(true)
        try {
            const response = await fetch(`http://${server}:8000/api/translate/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    text: word,
                    native_id: 1,
                    target_id: 2,
                }),
            });

            const data = await response.json();
            setLoading(false)
            if (response.ok) {
                console.log('Translation:', data.translated);

                return data.translated; // return the translated text
            } else {
                showError('API Error:', data.error || data)
                console.error('API Error:', data.error || data);
                return 'Translation error';
            }
        } catch (error) {
            showError('Fetch Error:', error)
            console.error('Fetch Error:', error);
            return 'Error connecting to API';
        }
    };

    const pauseAudio = async () => {
        setIsPlaying(false)
        try {
            if (soundRef.current) {
                await soundRef.current.pauseAsync();
            }
        } catch (e) {
            console.error('Pause error:', e);
        }
    };

    const next = () => {
        if (index < rows.length - 1) {
            setIndex(index + 1);
            setCurrentAudio(rows[index + 1]?.[0]?.split('|')[0]);
            console.log(currentAudio);
            updateLessonProgress()
            setDescription('');
        }
    };

    const back = () => {
        if (index > 0) {
            setIndex(index - 1);
            setCurrentAudio(rows[index - 1]?.[0]?.split('|')[0]);
            console.log(currentAudio);
            updateLessonProgress()
            setDescription('');
        }
    };

    const toggleMenu = () => {
        if (menuOpen) {
            // Slide out
            Animated.timing(slideAnim, {
                toValue: -200,
                duration: 500, // <-- Slow it down (in ms)
                useNativeDriver: true,
            }).start(() => setMenuOpen(false)); // hide after animation
        } else {
            setMenuOpen(true);
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500, // <-- Slow it down (in ms)
                useNativeDriver: true,
            }).start();
        }
    };

    useEffect(() => {
        const init = async () => {
            const storedToken = await AsyncStorage.getItem('accessToken');
            if (!storedToken) return;

            setToken(storedToken);

            try {
                const decoded = jwtDecode(storedToken);
                // Optional: setUser(decoded);
            } catch (err) {
                console.error('Failed to decode token:', err);
            }

            await Font.loadAsync({
                'PlaywriteHU-Regular': require('../assets/fonts/PlaywriteHU-Regular.ttf'),
            });

            setAppIsReady(true);
            await SplashScreen.hideAsync();
        };

        init();
    }, []);

    useEffect(() => {
        if (!token) return;

        const fetchAll = async () => {
            try {
                // 1. Fetch user profile and get current lesson
                const profileRes = await fetch(`http://${server}:8000/api/profile/`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (!profileRes.ok) throw new Error(await profileRes.text());
                const userData = await profileRes.json();
                setUser(userData);
                setCurrentLesson(userData.current_lesson); // ✅ this triggers next useEffect

            } catch (err) {
                console.error('Error fetching profile:', err);
            }
        };

        fetchAll();
    }, [token]);

    useEffect(() => {
        if (!token || !currentLesson) return;

        const fetchProgressAndLesson = async () => {
            try {
                // 2. Fetch lesson progress
                const progressRes = await fetch(`http://${server}:8000/api/user-progress/?lesson_id=${currentLesson}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });

                if (progressRes.ok) {
                    const progressData = await progressRes.json();
                    console.log('Fetched progress:', progressData);
                    setIndex(progressData.current_lesson_index || 0);
                } else {
                    console.warn('No previous progress found.');
                }

                // 3. Fetch lesson data LAST
                await fetchLessonData();

            } catch (err) {
                console.error('Error fetching lesson data:', err);
            }
        };

        fetchProgressAndLesson();
    }, [currentLesson, token]);

    const fetchLessonData = async () => {
        try {
            const res = await fetch(`http://${server}:8000/api/lesson/${currentLesson}/`, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error('Network response was not ok');

            const data = await res.json();
            const parsed = (data.sentences || []).map(s => [
                s.audio_file,
                s.sentence,
                s.translated_sentence
            ]);

            setRows(parsed);
            setCurrentAudio(parsed[0]?.[0] || '');
            console.log(parsed);
        } catch (err) {
            console.error('Fetch error:', err);
        }
    };

    return (
        <View style={styles.container}>
            {/* Top Section */}
            <View style={styles.topSection}>
                <View style={styles.logoContainer}>
                    {/* <Image source={logo} style={styles.logo} /> */}
                </View>
                <Text style={styles.topNavText}>Langue</Text>
                {user && (
                    <Text style={{ color: 'white', position: 'absolute', left: 10 }}>
                        Hello, {user.username}
                    </Text>
                )}
                <TouchableOpacity onPress={toggleMenu} style={styles.hamburgerIcon}>
                    <Entypo name="menu" size={40} color="white" />
                </TouchableOpacity>

            </View>

            {/* Middle Section */}
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
                    <SaveWordButton
                        payload={{
                            word: selectedText,
                            definition: translatedText,
                            nat_id: 1,   // You can adjust as needed
                            tar_id: 2,   // Adjust this too
                        }}
                        onSuccess={showSuccess}
                        onError={showError}
                    />

                    

                    <StatusIndicator />
                    <Text style={styles.partOfSpeech}>adjective</Text>
                    <View style={styles.separatorSolid} />

                    <View style={styles.textRow}>
                        <Text style={styles.leftText}>Target:</Text>
                        <TouchableOpacity style={styles.copy1} onPress={copyToClipboard}>
                            <AntDesign name="copy1" size={24} color="black" />
                        </TouchableOpacity>

                        <Text style={styles.rightText}>{selectedText}</Text>
                    </View>

                    <View style={styles.textRow}>
                        <Text style={styles.leftText}>Native:</Text>
                        <TextInput
                            style={styles.rightText}
                            value={translatedText}
                            onChangeText={setTranslatedText}
                        />

                    </View>
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
                    <View style={styles.translateBtn}>
                        <TouchableOpacity
                            onPress={() => {
                            setDescription(rows[index]?.[2]);
                        }}
                            
                        >
                            <Text style={styles.buttonText}>Translate Sentence</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {menuOpen && (
                <Animated.View style={[styles.sideMenu, { transform: [{ translateX: slideAnim }] }]}>
                    <Text style={styles.menuHeader}>Menu</Text>
                    <View style={styles.separatorSolid} />
                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate('Import');
                            setMenuOpen(false);
                        }}
                    >
                        <Text style={styles.navText}>Import</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate('Lessons');
                            setMenuOpen(false);
                        }}
                    >
                        <Text style={styles.navText}>Lessons</Text>
                    </TouchableOpacity>
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


                    <TouchableOpacity
                        onPress={() => {
                            navigation.navigate('Settings');
                            setMenuOpen(false);
                        }}
                    >
                        <Text style={styles.navText}>Settings</Text>
                    </TouchableOpacity>



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
