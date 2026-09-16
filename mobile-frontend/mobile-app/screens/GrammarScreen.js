import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    Platform,
    TouchableOpacity,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';

export default function AlphabetScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    const [alphabet, setAlphabet] = useState([]);
    const [numbers, setNumbers] = useState([]);

    const [selectedType, setSelectedType] = useState('alphabet');

    const [serverIP, setServerIP] = useState('');
    const [token, setToken] = useState(null);
    const [loading, setLoading] = useState(true);

    const [sound, setSound] = useState(null);

    useEffect(() => {
        initialize();
    }, []);

    useEffect(() => {
        if (token && serverIP) {
            loadLanguageItems(selectedType);
        }
    }, [token, serverIP, selectedType]);

    useEffect(() => {
        return () => {
            if (sound) {
                sound.unloadAsync();
            }
        };
    }, [sound]);

    const initialize = async () => {
        try {
            const ip = await getServerIP();
            setServerIP(ip);

            const storedToken =
                await AsyncStorage.getItem('accessToken');

            if (storedToken) {
                setToken(storedToken);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const loadLanguageItems = async (itemType) => {
        try {
            setLoading(true);

            const response = await fetch(
                `http://${serverIP}:8000/api/${itemType}/`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                console.error(data);
                return null;
            }

            console.log(`${itemType} loaded:`, data);

            if (itemType === 'alphabet') {
                setAlphabet(data.alphabet || []);
            } else if (itemType === 'numbers') {
                setNumbers(data.numbers || []);
            }

            return data;

        } catch (err) {
            console.error(`Failed to load ${itemType}:`, err);
            return null;

        } finally {
            setLoading(false);
        }
    };

    const playAudio = async (audioUrl) => {
        console.log(audioUrl);

        try {
            if (!audioUrl) return;

            const fullUrl = audioUrl.startsWith('http')
                ? audioUrl
                : `http://${serverIP}:8000${audioUrl}`;

            console.log("Playing:", fullUrl);

            if (Platform.OS === 'web') {
                const audio = new window.Audio(fullUrl);
                audio.crossOrigin = "anonymous";
                await audio.play();
                return;
            }

            if (sound) {
                await sound.unloadAsync();
            }

            const { sound: newSound } = await Audio.Sound.createAsync(
                { uri: fullUrl },
                { shouldPlay: true }
            );

            setSound(newSound);

        } catch (err) {
            console.error('Audio error:', err);
        }
    };

    if (loading) {
        return (
            <View
                style={[
                    styles.container,
                    {
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    },
                ]}
            >
                <Text style={styles.loadingText}>
                    Loading {selectedType}...
                </Text>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                {
                    paddingTop: insets.top,
                    paddingBottom: insets.bottom,
                },
            ]}
        >
            <View style={styles.header}>
                <Text style={styles.headerText}>
                    {selectedType === 'alphabet' ? 'Alphabet' : 'Numbers'}
                </Text>
            </View>

            <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.goBack()}
            >
                <AntDesign name="left" size={22} color="white" />
            </TouchableOpacity>

            {/* Alphabet / Numbers menu */}
            <View style={styles.menu}>
                <TouchableOpacity
                    style={[
                        styles.menuButton,
                        selectedType === 'alphabet' && styles.menuButtonActive,
                    ]}
                    onPress={() => setSelectedType('alphabet')}
                >
                    <Text
                        style={[
                            styles.menuText,
                            selectedType === 'alphabet' && styles.menuTextActive,
                        ]}
                    >
                        Alphabet
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.menuButton,
                        selectedType === 'numbers' && styles.menuButtonActive,
                    ]}
                    onPress={() => setSelectedType('numbers')}
                >
                    <Text
                        style={[
                            styles.menuText,
                            selectedType === 'numbers' && styles.menuTextActive,
                        ]}
                    >
                        Numbers
                    </Text>
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {selectedType === 'alphabet' ? (
                    <>
                        <Text style={styles.description}>
                            Tap a letter to hear its pronunciation.
                        </Text>

                        <View style={styles.grid}>
                            {alphabet.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.card}
                                    onPress={() => {
                                        console.log(
                                            "CARD CLICKED:",
                                            item.letter
                                        );
                                        playAudio(item.audio);
                                    }}
                                >
                                    <Text style={styles.letter}>
                                        {item.letter}
                                    </Text>

                                    <Text style={styles.name}>
                                        {item.name}
                                    </Text>

                                    <Text style={styles.pronunciation}>
                                        {item.pronunciation}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                ) : (
                    <>
                        <Text style={styles.description}>
                            Tap a number to hear its pronunciation.
                        </Text>

                        <View style={styles.grid}>
                            {numbers.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    style={styles.card}
                                    onPress={() => {
                                        console.log(
                                            "NUMBER CARD CLICKED:",
                                            item.name
                                        );
                                        playAudio(item.audio);
                                    }}
                                >
                                    <Text style={styles.letter}>
                                        {item.name}
                                    </Text>

                                    <Text style={styles.name}>
                                        {item.lithuanian}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222831',
    },

    loadingText: {
        color: 'white',
        fontSize: 20,
        textAlign: 'center',
        marginTop: 50,
    },

    header: {
        backgroundColor: '#30475e',
        paddingVertical: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerText: {
        color: 'white',
        fontSize: 28,
        fontFamily: 'PlaywriteHU-Regular',
    },

    menu: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 10,
        backgroundColor: '#222831',
    },

    menuButton: {
        paddingVertical: 10,
        paddingHorizontal: 30,
        borderRadius: 8,
        backgroundColor: '#393e46',
    },

    menuButtonActive: {
        backgroundColor: '#00adb5',
    },

    menuText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },

    menuTextActive: {
        color: 'white',
    },

    scrollContent: {
        padding: 20,
        alignItems: 'center',
    },

    description: {
        color: 'white',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        maxWidth: 700,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        width: '100%',
        gap: 12,
    },

    card: {
        backgroundColor: '#393e46',
        borderRadius: 12,
        padding: 16,
        width: Platform.OS === 'web' ? 180 : '46%',
        minHeight: 140,
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        userSelect: 'none',
    },

    letter: {
        fontSize: 36,
        color: '#00adb5',
        fontWeight: 'bold',
        marginBottom: 8,
    },

    name: {
        color: 'white',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 6,
    },

    pronunciation: {
        color: '#eeeeee',
        fontSize: 16,
        textAlign: 'center',
    },

    backLink: {
        position: 'absolute',
        top: 40,
        right: 20,
        flexDirection: 'row',
        alignItems: 'center',
        zIndex: 10,
    },
});
