import React, { useState, useEffect } from 'react';
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
import ButtonGroup from './components/ButtonGroup';

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

    const splitOptions = [
        { label: 'Period', value: 'period' },
        { label: 'Manual', value: 'manual' },
    ];

    const [splitType, setSplitType] = useState('period');

    // Holds the rows after Split Text is pressed
    const [sentences, setSentences] = useState([]);

    // Controls whether the original text inputs are visible
    const [isSplit, setIsSplit] = useState(false);

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

                    if (decoded) {
                        setUser(decoded);
                    }
                }
            } catch (err) {
                console.error('Initialization error:', err);
            }
        };

        init();
    }, []);

    const takePhoto = async () => {
        const permission =
            await ImagePicker.requestCameraPermissionsAsync();

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
        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {
            alert('Photo library permission is required');
            return;
        }

        const result =
            await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1,
            });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
        }
    };

    /*
     * Split Native Text and Translation by period.
     *
     * Example:
     *
     * Native:
     * "Hello world. How are you. I am fine."
     *
     * Translation:
     * "Labas pasauli. Kaip tu. Man viskas gerai."
     *
     * becomes:
     *
     * [
     *   {
     *      sentence: "Hello world",
     *      translated_sentence: "Labas pasauli"
     *   },
     *   {
     *      sentence: "How are you",
     *      translated_sentence: "Kaip tu"
     *   },
     *   {
     *      sentence: "I am fine",
     *      translated_sentence: "Man viskas gerai"
     *   }
     * ]
     */
    const handleSplitText = () => {
        if (splitType !== 'period') {
            return;
        }

        const nativeSentences = sentence
            .split('.')
            .map(text => text.trim())
            .filter(text => text.length > 0);

        const translationSentences = translatedSentence
            .split('.')
            .map(text => text.trim())
            .filter(text => text.length > 0);

        const maxLength = Math.max(
            nativeSentences.length,
            translationSentences.length
        );

        const newSentences = [];

        for (let i = 0; i < maxLength; i++) {
            newSentences.push({
                id: Date.now() + i,
                sentence: nativeSentences[i] || '',
                translated_sentence: translationSentences[i] || '',
                start_ms: 0,
                end_ms: 0,
                image: imageUri,
                isNew: true,
            });
        }

        setSentences(newSentences);
        setIsSplit(true);
    };

    /*
     * Update one field in one table row.
     */
    const updateSentence = (index, field, value) => {
        setSentences(prev => {
            const updated = [...prev];

            updated[index] = {
                ...updated[index],
                [field]: value,
            };

            return updated;
        });
    };

    const removeSentence = (index) => {
        setSentences(prev => prev.filter((_, i) => i !== index));
    };

    /*
     * Add all split sentences back to LessonEditScreen.
     */
    const handleAddSentence = () => {
        const newSentence = {
            id: Date.now(),
            sentence,
            translated_sentence: translatedSentence,
            start_ms: parseInt(startMs, 10) || 0,
            end_ms: parseInt(endMs, 10) || 0,
            image: imageUri,
            isNew: true,
        };

        onSave([newSentence]);
        navigation.goBack();
    };

    const handleAddSentences = () => {
        const cleanedSentences = sentences.map(item => ({
            ...item,
            start_ms: parseInt(item.start_ms, 10) || 0,
            end_ms: parseInt(item.end_ms, 10) || 0,
        }));

        onSave(cleanedSentences);
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

            <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.goBack()}
            >
                <AntDesign
                    name="left"
                    size={22}
                    color="white"
                />
            </TouchableOpacity>

            <ScrollView style={styles.container}>

                <Text style={styles.label}>Image</Text>

                <TouchableOpacity
                    style={styles.imageButton}
                    onPress={takePhoto}
                >
                    <Text style={styles.imageButtonText}>
                        Take Picture
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.imageButton}
                    onPress={pickImage}
                >
                    <Text style={styles.imageButtonText}>
                        Choose From Gallery
                    </Text>
                </TouchableOpacity>

                {imageUri && (
                    <Image
                        source={{ uri: imageUri }}
                        style={styles.previewImage}
                    />
                )}

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Translate</Text>

                    <Switch
                        value={translateText}
                        onValueChange={setTranslateText}
                    />
                </View>

                <View style={styles.switchRow}>
                    <Text style={styles.label}>
                        Generate Audio
                    </Text>

                    <Switch
                        value={generateAudio}
                        onValueChange={setGenerateAudio}
                        disabled={true}
                    />
                </View>

                <TouchableOpacity
                    style={styles.imageButton}
                    onPress={runOCR}
                >
                    <Text style={styles.imageButtonText}>
                        Extract Text
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.imageButton}
                >
                    <Text style={styles.imageButtonText}>
                        Retranslate
                    </Text>
                </TouchableOpacity>

                <Text style={styles.label}>
                    Split Text into Sentences
                </Text>

                <ButtonGroup
                    options={splitOptions}
                    selectedValue={splitType}
                    onValueChange={setSplitType}
                />

                <TouchableOpacity
                    style={styles.splitButton}
                    onPress={handleSplitText}
                >
                    <Text style={styles.splitButtonText}>
                        Split Text
                    </Text>
                </TouchableOpacity>

                {/*
                 * Original text inputs.
                 *
                 * These are hidden after Split Text.
                 */}
                {!isSplit && (
                    <>
                        <Text style={styles.label}>
                            Native Text
                        </Text>

                        <TextInput
                            style={styles.input}
                            multiline
                            value={sentence}
                            onChangeText={setSentence}
                        />

                        <Text style={styles.label}>
                            Translation
                        </Text>

                        <TextInput
                            style={styles.input}
                            multiline
                            value={translatedSentence}
                            onChangeText={setTranslatedSentence}
                        />

                        <Text style={styles.label}>
                            Start Time (ms)
                        </Text>

                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={startMs}
                            onChangeText={setStartMs}
                        />

                        <Text style={styles.label}>
                            End Time (ms)
                        </Text>

                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={endMs}
                            onChangeText={setEndMs}
                        />

                        <TouchableOpacity
                            style={styles.saveButton}
                            onPress={handleAddSentence}
                        >
                            <Text style={styles.saveButtonText}>
                                Add Sentence
                            </Text>
                        </TouchableOpacity>


                    </>
                )}

                {/*
                 * Sentence table.
                 *
                 * This intentionally does NOT use drag and drop.
                 */}
                {isSplit && (
                    <View style={styles.table}>

                        {/* Header */}
                        <View style={styles.tableHeader}>

                            <Text style={[
                                styles.headerText,
                                styles.indexColumn
                            ]}>
                                #
                            </Text>

                            <Text style={[
                                styles.headerText,
                                styles.nativeColumn
                            ]}>
                                Native
                            </Text>

                            <Text style={[
                                styles.headerText,
                                styles.translationColumn
                            ]}>
                                Translation
                            </Text>

                            <Text style={[
                                styles.headerText,
                                styles.timeColumn
                            ]}>
                                Start
                            </Text>

                            <Text style={[
                                styles.headerText,
                                styles.timeColumn
                            ]}>
                                End
                            </Text>

                            <Text style={[
                                styles.headerText,
                                styles.removeColumn
                            ]}>
                                Remove
                            </Text>

                        </View>

                        {/* Rows */}
                        {sentences.map((item, index) => (
                            <View
                                key={item.id}
                                style={styles.tableRow}
                            >

                                <Text style={[
                                    styles.indexText,
                                    styles.indexColumn
                                ]}>
                                    {index + 1}
                                </Text>

                                <TextInput
                                    style={[
                                        styles.tableInput,
                                        styles.nativeColumn
                                    ]}
                                    multiline
                                    value={item.sentence}
                                    onChangeText={(value) =>
                                        updateSentence(
                                            index,
                                            'sentence',
                                            value
                                        )
                                    }
                                />

                                <TextInput
                                    style={[
                                        styles.tableInput,
                                        styles.translationColumn
                                    ]}
                                    multiline
                                    value={item.translated_sentence}
                                    onChangeText={(value) =>
                                        updateSentence(
                                            index,
                                            'translated_sentence',
                                            value
                                        )
                                    }
                                />

                                <TextInput
                                    style={[
                                        styles.tableInput,
                                        styles.timeColumn
                                    ]}
                                    keyboardType="numeric"
                                    value={String(item.start_ms)}
                                    onChangeText={(value) =>
                                        updateSentence(
                                            index,
                                            'start_ms',
                                            value
                                        )
                                    }
                                />

                                <TextInput
                                    style={[
                                        styles.tableInput,
                                        styles.timeColumn
                                    ]}
                                    keyboardType="numeric"
                                    value={String(item.end_ms)}
                                    onChangeText={(value) =>
                                        updateSentence(
                                            index,
                                            'end_ms',
                                            value
                                        )
                                    }
                                />

                                <TouchableOpacity
                                    style={styles.removeButton}
                                    onPress={() => removeSentence(index)}
                                >
                                    <AntDesign
                                        name="delete"
                                        size={20}
                                        color="white"
                                    />
                                </TouchableOpacity>

                            </View>
                        ))}

                    </View>
                )}

                {/*
                 * Only show Add Sentences after splitting.
                 */}
                {isSplit && (
                    <TouchableOpacity
                        style={styles.saveButton}
                        onPress={handleAddSentences}
                    >
                        <Text style={styles.saveButtonText}>
                            Add Sentences
                        </Text>
                    </TouchableOpacity>
                )}

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

    splitButton: {
        backgroundColor: '#00adb5',
        marginTop: 20,
        marginBottom: 20,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },

    splitButtonText: {
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

    /*
     * Sentence table
     */
    table: {
        marginTop: 20,
        width: '100%',
    },

    tableHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2c3244',
        borderBottomWidth: 1,
        borderBottomColor: '#555',
        paddingVertical: 10,
    },

    tableRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
        backgroundColor: '#333',
        minHeight: 60,
    },

    headerText: {
        color: 'white',
        fontWeight: 'bold',
        paddingHorizontal: 5,
    },

    indexText: {
        color: 'white',
        paddingHorizontal: 5,
        paddingVertical: 10,
        textAlign: 'center',
    },

    tableInput: {
        color: 'white',
        backgroundColor: '#333',
        padding: 8,
        borderLeftWidth: 1,
        borderLeftColor: '#444',
        minHeight: 60,
    },

    indexColumn: {
        width: 45,
    },

    nativeColumn: {
        flex: 2,
    },

    translationColumn: {
        flex: 2,
    },

    timeColumn: {
        width: 90,
    },
    removeColumn: {
        width: 75,
        textAlign: 'center',
    },

    removeButton: {
        width: 75,
        minHeight: 60,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#444',
    },
});
