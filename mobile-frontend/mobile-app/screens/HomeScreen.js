// HomeScreen.js
import React, { useEffect, useState, useRef } from 'react';

import { View, Text, Button, StyleSheet, TouchableOpacity, ScrollView, Animated, Image, Alert } from 'react-native';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import * as Clipboard from 'expo-clipboard';
import CustomPopup from './components/CustomPopup';


import * as SplashScreen from 'expo-splash-screen';
SplashScreen.preventAutoHideAsync();

export default function HomeScreen({ navigation }) {
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [translatedText, setTranslatedText] = useState('');
    const [selectedText, setSelectedText] = useState('');
    const [rows, setRows] = useState([]);
    const [index, setIndex] = useState(0);
    const [currentAudio, setCurrentAudio] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const slideAnim = useRef(new Animated.Value(-200)).current;
    const [showExitModal, setShowExitModal] = useState(false);
    const [appIsReady, setAppIsReady] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [popup, setPopup] = useState({ visible: false, message: '', type: 'success' });

    const soundRef = useRef(null);


    const showSuccess = (message) => {
        setPopup({ visible: true, message: message, type: 'success' });
    };

    const showError = (message) => {
        setPopup({ visible: true, message: message, type: 'error' });
    };

    useEffect(() => {

        const fetchToken = async () => {
            const storedToken = await AsyncStorage.getItem('accessToken');
            setToken(storedToken);

            if (storedToken) {
                try {
                    const decoded = jwtDecode(storedToken);
                    // Save decoded user info (e.g., id, username, etc.)
                    fetchUserProfile();
                    console.log(user)
                } catch (err) {
                    console.error('Failed to decode token:', err);
                }
            }
        };
        fetchToken();

        const fetchUserProfile = async () => {
            const token = await AsyncStorage.getItem('accessToken');
            if (!token) return;

            try {
                const res = await fetch('http://localhost:8000/api/profile/', {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });

                if (!res.ok) {
                    console.error('Unauthorized or error:', await res.text());
                    return;
                }

                const data = await res.json();
                setUser(data);  // Now should include username, email, etc.
            } catch (err) {
                console.error('Fetch error:', err);
            }
        };




        async function prepare() {
            try {
                await Font.loadAsync({
                    'PlaywriteHU-Regular': require('../assets/fonts/PlaywriteHU-Regular.ttf'),
                });
            } catch (e) {
                console.warn(e);
            } finally {
                setAppIsReady(true);
                await SplashScreen.hideAsync();
            }
        }

        prepare();
        fetch('https://langue.pages.dev/metadata.csv')
            .then(res => res.text())
            .then(text => {

                let parsed = text.trim().split('\n').map(row => row.split('|'));

                setRows(parsed);
                setCurrentAudio(parsed[0]?.[0]?.split('|')[0]);
                console.log(currentAudio);
            });

    }, []);

    if (!appIsReady) {
        return null;
    }

    const displaySelectedText = async (word) => {
        console.log('Clicked word:', word);
        setSelectedText(word);

        const translation = await translateWord(word); // pass word to function
        setTranslatedText(translation);
    };

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(selectedText);
        showSuccess('Text has been copied to clipboard.')
        //Alert.alert('Copied!', 'Text has been copied to clipboard.');
    };

    const playAudio = async () => {
        if (!currentAudio) return;
        setIsPlaying(true)
        try {
            // Unload previous sound if one exists
            if (soundRef.current) {
                await soundRef.current.unloadAsync();
                soundRef.current = null;
            }

            const { sound } = await Audio.Sound.createAsync({
                uri: `https://langue.pages.dev/audio/${currentAudio}`
            });

            soundRef.current = sound;  // Save reference
            await sound.playAsync();
            sound.setOnPlaybackStatusUpdate(status => {
                if (status.didJustFinish) {
                    setIsPlaying(false)
                }
            })
        } catch (e) {
            showError('Audio error:', e)
            console.error('Audio error:', e);
        }
    };

    const translateWord = async (word) => {
        setLoading(true)
        try {
            const response = await fetch('http://localhost:8000/api/translate/', {
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
        }
    };

    const back = () => {
        if (index > 0) {
            setIndex(index - 1);
            setCurrentAudio(rows[index - 1]?.[0]?.split('|')[0]);
            console.log(currentAudio);
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
                {/* Fixed-height word container */}
                <View style={styles.wordContainer}>
                    <Text>
                        {rows[index]?.[2].split(' ').map((word, i) => (
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
                        <Text style={styles.rightText}>{translatedText}</Text>
                    </View>
                    <View style={styles.separatorDotted} />
                    <View>
                        <Text style={styles.defDescription}>This is a description of the definition.</Text>
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
