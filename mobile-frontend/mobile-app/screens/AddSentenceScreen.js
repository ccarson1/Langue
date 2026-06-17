import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
    View,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Platform,
    Switch,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';

export default function AddSentenceScreen({ route, navigation }) {
    const { onSave } = route.params;

    const [sentence, setSentence] = useState('');
    const [translatedSentence, setTranslatedSentence] = useState('');
    const [startMs, setStartMs] = useState('0');
    const [endMs, setEndMs] = useState('0');
    const [imageUri, setImageUri] = useState(null);
    const [serverIP, setServerIP] = useState('');
    const [token, setToken] = useState(null);
    const [user, setUser] = useState(null);
    const [translateText, setTranslateText] = useState('');
    const [generateAudio, setGenerateAudio] = useState('');


    const decodeToken = (token) => {
        try {
            return jwtDecode(token);
        } catch (err) {
            console.error('Token decode failed:', err);
            return null;
        }
    };

    useEffect(() => {
        const init = async () => {
            try {

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
            }
        };
        init();
    }, []);

    const takePhoto = async () => {
        const permission = await ImagePicker.requestCameraPermissionsAsync();

        if (!permission.granted) {
            alert('Camera permission is required');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const pickImage = async () => {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            alert('Photo library permission is required');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 1,
        });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    const handleSave = () => {
        const newSentence = {
            id: Date.now(),
            sentence,
            translated_sentence: translatedSentence,
            start_ms: parseInt(startMs, 10) || 0,
            end_ms: parseInt(endMs, 10) || 0,
            image: imageUri,
        };

        onSave(newSentence);
        navigation.goBack();
    };

    const webRunOCR = async () => {
        if (!imageUri) {
            alert('Please select an image first');
            return;
        }

        try {
            const responseBlob = await fetch(imageUri);
            const blob = await responseBlob.blob();

            const formData = new FormData();
            formData.append('image', blob, 'image.jpg');
            formData.append('translateText', translateText);
            formData.append('generateAudio', generateAudio);

            const response = await fetch(
                `http://${serverIP}:8000/api/ocr/`,
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
                setSentence(data.text);
                setTranslatedSentence(data.translation);
                console.log(data.translation);
            } else {
                alert(data.error || 'OCR failed');
            }
        } catch (err) {
            console.error(err);
            alert('OCR request failed');
        }
    };

    const nativeRunOCR = async () => {
        if (!imageUri) {
            alert('Please select an image first');
            return;
        }

        try {
            const formData = new FormData();

            formData.append('image', {
                uri: imageUri,
                name: 'image.jpg',
                type: 'image/jpeg',
            });
            formData.append('translateText', translateText);
            formData.append('generateAudio', generateAudio);

            const response = await fetch(
                `http://${serverIP}:8000/api/ocr/`,
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
                setSentence(data.text);
                setTranslatedSentence(data.translation);
                console.log(data.translation);
            } else {
                alert(data.error || 'OCR failed');
            }
        } catch (error) {
            console.error(error);
            alert('OCR request failed');
        }
    };

    const runOCR = () => {
        if (Platform.OS === 'web') {
            webRunOCR();
        } else {
            nativeRunOCR();
        }
    };

    return (
        <View style={styles.screenWrapper}>
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                    <AntDesign name="left" size={22} color="white" />
                </TouchableOpacity>
            <ScrollView style={styles.container}>
                

                <Text style={styles.label}>Image</Text>

                <TouchableOpacity
                    style={styles.imageButton}
                    onPress={takePhoto}
                >
                    <Text style={styles.imageButtonText}>Take Picture</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.imageButton}
                    onPress={pickImage}
                >
                    <Text style={styles.imageButtonText}>Choose From Gallery</Text>
                </TouchableOpacity>

                {imageUri && (
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.previewImage}
                    />
                )}
                <View style={styles.switchRow}>
                    <Text style={styles.label}>Translate</Text>
                    <Switch value={translateText} onValueChange={setTranslateText} />
                </View>
                <View style={styles.switchRow}>
                    <Text style={styles.label}>Generate Audio</Text>
                    <Switch value={generateAudio} onValueChange={setGenerateAudio} />
                </View>
                <TouchableOpacity
                    style={styles.imageButton}
                    onPress={runOCR}
                >
                    <Text style={styles.imageButtonText}>Extract Text</Text>
                </TouchableOpacity>
                <Text style={styles.label}>Native Sentence</Text>
                <TextInput
                    style={styles.input}
                    multiline
                    value={sentence}
                    onChangeText={setSentence}
                />

                <Text style={styles.label}>Translation</Text>
                <TextInput
                    style={styles.input}
                    multiline
                    value={translatedSentence}
                    onChangeText={setTranslatedSentence}
                />

                <Text style={styles.label}>Start Time (ms)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={startMs}
                    onChangeText={setStartMs}
                />

                <Text style={styles.label}>End Time (ms)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={endMs}
                    onChangeText={setEndMs}
                />

                <TouchableOpacity
                    style={styles.saveButton}
                    onPress={handleSave}
                >
                    <Text style={styles.saveButtonText}>Add Sentence</Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    screenWrapper: {
        flex: 1,
        backgroundColor: '#222831',
        marginBottom: 0,
        marginTop: 0,
    },

    container: {

        backgroundColor: '#222831',
        paddingTop: 40,
        paddingHorizontal: 10,

    },
    label: {
        color: 'white',
        marginBottom: 5,
        marginTop: 10,
    },
    input: {
        backgroundColor: '#333',
        color: 'white',
        borderRadius: 8,
        padding: 10,
        minHeight: 50,
    },
    saveButton: {
        backgroundColor: '#00adb5',
        marginTop: 20,
        marginBottom: 70,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    saveButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    imageButton: {
        backgroundColor: '#444',
        padding: 12,
        borderRadius: 8,
        marginTop: 10,
        alignItems: 'center',
    },

    imageButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },

    previewImage: {
        width: '100%',
        height: 200,
        borderRadius: 10,
        marginTop: 10,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    backLink: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 20,
    },
});