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
    useWindowDimensions,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import ButtonGroup from './components/ButtonGroup';
import LoadingOverlay from './components/LoadingOverlay';


// ── Palette ─────────────────────────────────────────────────────────

const colors = {
    bg: '#222831',
    surface: '#393e46',
    surfaceElevated: '#3f454e',
    border: '#4b525c',
    borderSubtle: '#333944',
    text: '#eeeeee',
    textMuted: '#a0a6ad',
    accent: '#00adb5',
    accentDark: '#00838a',
    danger: '#e05a5a',
    dangerBg: '#3a2a2c',
};


// ── Breakpoints ─────────────────────────────────────────────────────

const getBreakpoint = (width) => {
    if (width >= 700) return 'wide';
    if (width >= 600) return 'tablet';
    if (width >= 360) return 'phone';
    return 'small';
};


// ── Styles ──────────────────────────────────────────────────────────

const createStyles = (width = 390) => {
    const bp = getBreakpoint(width);

    const isSmall = bp === 'small';
    const isTablet = bp === 'tablet' || bp === 'wide';
    const isWide = bp === 'wide';

    const contentMaxWidth = isWide
        ? 1520
        : isTablet
            ? 680
            : undefined;

    return StyleSheet.create({

        // ─────────────────────────────────────────────────────────
        // Main screen
        // ─────────────────────────────────────────────────────────

        screenWrapper: {
            flex: 1,
            backgroundColor: colors.bg,
        },

        scrollView: {
            flex: 1,
        },

        container: {
            flexGrow: 1,
            backgroundColor: colors.bg,

            paddingTop: isSmall
                ? 88
                : isTablet
                    ? 96
                    : 88,

            paddingHorizontal: isTablet
                ? 24
                : isSmall
                    ? 12
                    : 16,

            paddingBottom: 100,

            width: '100%',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
        },


        // ─────────────────────────────────────────────────────────
        // Section cards
        // ─────────────────────────────────────────────────────────

        sectionCard: {
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.borderSubtle,

            padding: isTablet ? 16 : 12,

            marginBottom: 14,

            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 3,
            },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 2,
        },

        sectionTitle: {
            color: colors.text,

            fontSize: isTablet
                ? 18
                : isSmall
                    ? 15
                    : 16,

            fontWeight: '700',
            letterSpacing: 0.3,
            marginBottom: 12,
        },


        // ─────────────────────────────────────────────────────────
        // Labels / inputs
        // ─────────────────────────────────────────────────────────

        label: {
            color: colors.textMuted,

            fontSize: isSmall
                ? 12
                : 13,

            fontWeight: '600',

            textTransform: 'uppercase',
            letterSpacing: 0.6,

            marginBottom: 6,
            marginTop: 12,
        },

        input: {
            backgroundColor: colors.bg,

            borderRadius: 10,

            paddingVertical: isTablet
                ? 12
                : 10,

            paddingHorizontal: 12,

            color: colors.text,

            fontSize: isSmall
                ? 15
                : 16,

            borderWidth: 1,
            borderColor: colors.border,

            minHeight: 52,

            textAlignVertical: 'top',
        },


        // ─────────────────────────────────────────────────────────
        // Image / OCR
        // ─────────────────────────────────────────────────────────

        imageButtonRow: {
            flexDirection: isTablet
                ? 'row'
                : 'column',

            gap: 10,
        },

        imageButton: {
            flex: isTablet
                ? 1
                : undefined,

            flexDirection: 'row',

            backgroundColor: colors.surfaceElevated,

            paddingVertical: isTablet
                ? 13
                : 12,

            paddingHorizontal: 14,

            borderRadius: 10,

            borderWidth: 1,
            borderColor: colors.border,

            alignItems: 'center',
            justifyContent: 'center',

            gap: 8,
        },

        imageButtonText: {
            color: colors.text,
            fontWeight: '700',
            fontSize: 15,
        },

        buttonIcon: {
            color: colors.text,
        },

        previewImage: {
            width: '100%',

            height: isSmall
                ? 160
                : isTablet
                    ? 300
                    : 220,

            borderRadius: 10,

            marginTop: 12,

            resizeMode: 'contain',

            backgroundColor: colors.bg,
        },


        // ─────────────────────────────────────────────────────────
        // Switches
        // ─────────────────────────────────────────────────────────

        switchRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',

            marginTop: 18,
            marginBottom: 6,

            paddingVertical: 4,
        },

        switchLabel: {
            color: colors.text,
            fontSize: 15,
            fontWeight: '600',
        },


        // ─────────────────────────────────────────────────────────
        // Buttons
        // ─────────────────────────────────────────────────────────

        actionRow: {
            flexDirection: isTablet
                ? 'row'
                : 'column',

            gap: 10,

            marginTop: 14,
        },

        primaryButton: {
            backgroundColor: colors.accent,

            paddingVertical: isTablet
                ? 15
                : 13,

            borderRadius: 12,

            alignItems: 'center',
            justifyContent: 'center',

            marginTop: 16,

            shadowColor: colors.accent,

            shadowOffset: {
                width: 0,
                height: 6,
            },

            shadowOpacity: 0.3,
            shadowRadius: 10,

            elevation: 5,
        },

        primaryButtonText: {
            color: colors.bg,

            fontWeight: '700',

            fontSize: isTablet
                ? 17
                : 16,

            letterSpacing: 0.3,
        },

        secondaryButton: {
            flex: isTablet
                ? 1
                : undefined,

            flexDirection: 'row',

            backgroundColor: 'transparent',

            paddingVertical: isTablet
                ? 13
                : 11,

            borderRadius: 12,

            borderWidth: 1.5,
            borderColor: colors.accent,

            alignItems: 'center',
            justifyContent: 'center',

            gap: 8,
        },

        secondaryButtonText: {
            color: colors.accent,

            fontWeight: '700',
            fontSize: 15,
        },


        // ─────────────────────────────────────────────────────────
        // Back button
        // ─────────────────────────────────────────────────────────

        backLink: {
            position: 'absolute',

            top: 40,

            left: isTablet
                ? Math.max(
                    20,
                    (width - contentMaxWidth) / 2
                )
                : 20,

            zIndex: 20,

            width: 38,
            height: 38,

            borderRadius: 19,

            backgroundColor: 'rgba(57,62,70,0.85)',

            alignItems: 'center',
            justifyContent: 'center',
        },


        // ─────────────────────────────────────────────────────────
        // Split sentence table
        // ─────────────────────────────────────────────────────────

        table: {
            marginTop: 4,

            minWidth: isSmall
                ? 620
                : isTablet
                    ? 1400
                    : 700,
        },

        tableHeader: {
            flexDirection: 'row',

            alignItems: 'center',

            backgroundColor: colors.surfaceElevated,

            borderBottomWidth: 1,
            borderBottomColor: colors.border,

            paddingVertical: 10,

            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
        },

        tableRow: {
            flexDirection: 'row',

            alignItems: 'stretch',

            backgroundColor: colors.surfaceElevated,

            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,

            minHeight: isSmall
                ? 70
                : 64,
        },

        headerText: {
            color: colors.accent,

            fontSize: isSmall
                ? 11
                : 12,

            fontWeight: '700',

            textTransform: 'uppercase',

            letterSpacing: 0.5,

            paddingHorizontal: 5,

            textAlign: 'center',
        },

        indexText: {
            color: colors.text,

            paddingHorizontal: 5,
            paddingVertical: 12,

            textAlign: 'center',

            fontWeight: '600',
        },

        tableInput: {
            color: colors.text,

            backgroundColor: colors.bg,

            padding: isSmall
                ? 7
                : 8,

            borderLeftWidth: 1,
            borderLeftColor: colors.border,

            minHeight: isSmall
                ? 70
                : 64,

            textAlignVertical: 'top',
        },

        indexColumn: {
            width: isSmall
                ? 42
                : 48,
        },

        nativeColumn: {
            width: isSmall ? 240 : 300,
        },
        translationColumn: {
            width: isSmall ? 240 : 300,
        },

        timeColumn: {
            width: isSmall
                ? 80
                : 90,
        },

        removeColumn: {
            width: isSmall
                ? 70
                : 75,

            textAlign: 'center',
        },

        removeButton: {
            width: isSmall
                ? 70
                : 75,

            minHeight: isSmall
                ? 70
                : 64,

            alignItems: 'center',
            justifyContent: 'center',

            backgroundColor: colors.dangerBg,

            borderLeftWidth: 1,
            borderLeftColor: colors.border,
        },

    });
};


export default function AddSentenceScreen({ route, navigation }) {

    const { onSave } = route.params;

    const { width } = useWindowDimensions();

    const styles = createStyles(width);

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
    const [loading, setLoading] = useState(false);

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

                const storedToken =
                    await AsyncStorage.getItem('accessToken');

                if (storedToken) {

                    setToken(storedToken);

                    const decoded =
                        decodeToken(storedToken);

                    if (decoded) {
                        setUser(decoded);
                    }
                }

            } catch (err) {

                console.error(
                    'Initialization error:',
                    err
                );

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

        const result =
            await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 1,
            });

        if (!result.canceled) {

            setImageUri(result.assets[0].uri);
            setIsSplit(false);
            setSentences([]);

        }
    };


    const pickImage = async () => {

        const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();

        if (!permission.granted) {

            alert(
                'Photo library permission is required'
            );

            return;
        }

        const result =
            await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 1,
            });

        if (!result.canceled) {
            setImageUri(result.assets[0].uri);
            setIsSplit(false);
            setSentences([]);
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

        setLoading(true);

        if (splitType !== 'period') {

            setLoading(false);

            return;
        }

        const nativeSentences =
            sentence
                .split('.')
                .map(text => text.trim())
                .filter(text => text.length > 0);

        const translationSentences =
            translatedSentence
                .split('.')
                .map(text => text.trim())
                .filter(text => text.length > 0);

        const maxLength =
            Math.max(
                nativeSentences.length,
                translationSentences.length
            );

        const newSentences = [];

        for (
            let i = 0;
            i < maxLength;
            i++
        ) {

            newSentences.push({

                id: Date.now() + i,

                sentence:
                    nativeSentences[i] || '',

                translated_sentence:
                    translationSentences[i] || '',

                start_ms: 0,

                end_ms: 0,

                image: imageUri,

                isNew: true,

            });

        }

        setLoading(false);

        setSentences(newSentences);

        setIsSplit(true);
    };


    /*
     * Update one field in one table row.
     */

    const updateSentence = (
        index,
        field,
        value
    ) => {

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

        setSentences(
            prev =>
                prev.filter(
                    (_, i) => i !== index
                )
        );

    };


    /*
     * Add all split sentences back to LessonEditScreen.
     */

    const handleAddSentence = () => {

        const newSentence = {

            id: Date.now(),

            sentence,

            translated_sentence:
                translatedSentence,

            start_ms:
                parseInt(startMs, 10) || 0,

            end_ms:
                parseInt(endMs, 10) || 0,

            image: imageUri,

            isNew: true,

        };

        onSave([newSentence]);

        navigation.goBack();

    };


    const handleAddSentences = () => {

        const cleanedSentences =
            sentences.map(item => ({

                ...item,

                start_ms:
                    parseInt(
                        item.start_ms,
                        10
                    ) || 0,

                end_ms:
                    parseInt(
                        item.end_ms,
                        10
                    ) || 0,

            }));

        onSave(cleanedSentences);

        navigation.goBack();

    };


    const webRunOCR = async () => {

        setLoading(true);

        if (!imageUri) {

            alert(
                'Please select an image first'
            );

            return;
        }

        try {

            const responseBlob =
                await fetch(imageUri);

            const blob =
                await responseBlob.blob();

            const formData =
                new FormData();

            formData.append(
                'image',
                blob,
                'image.jpg'
            );

            formData.append(
                'translateText',
                translateText
            );

            formData.append(
                'generateAudio',
                generateAudio
            );

            const response =
                await fetch(
                    `http://${serverIP}:8000/api/ocr/`,
                    {
                        method: 'POST',

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },

                        body: formData,
                    }
                );

            const data =
                await response.json();

            setLoading(false);

            if (response.ok) {
                setSentence(data.text);
                setTranslatedSentence(data.translation);

                setIsSplit(false);
                setSentences([]);

                console.log(data.translation);
            } else {

                alert(
                    data.error ||
                    'OCR failed'
                );

            }

        } catch (err) {

            console.error(err);

            alert(
                'OCR request failed'
            );

        }

    };


    const nativeRunOCR = async () => {

        setLoading(true);

        if (!imageUri) {

            alert(
                'Please select an image first'
            );

            return;
        }

        try {

            const formData =
                new FormData();

            formData.append(
                'image',
                {
                    uri: imageUri,
                    name: 'image.jpg',
                    type: 'image/jpeg',
                }
            );

            formData.append(
                'translateText',
                translateText
            );

            formData.append(
                'generateAudio',
                generateAudio
            );

            const response =
                await fetch(
                    `http://${serverIP}:8000/api/ocr/`,
                    {
                        method: 'POST',

                        headers: {
                            Authorization:
                                `Bearer ${token}`,
                        },

                        body: formData,
                    }
                );

            const data =
                await response.json();

            setLoading(false);

            if (response.ok) {
                setSentence(data.text);
                setTranslatedSentence(data.translation);

                setIsSplit(false);
                setSentences([]);

                console.log(data.translation);
            } else {

                alert(
                    data.error ||
                    'OCR failed'
                );

            }

        } catch (error) {

            console.error(error);

            alert(
                'OCR request failed'
            );

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
                onPress={() =>
                    navigation.goBack()
                }
            >

                <AntDesign
                    name="left"
                    size={22}
                    color="white"
                />

            </TouchableOpacity>


            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.container}
            >

                {/* =====================================================
                    IMAGE / OCR
                ====================================================== */}

                <View style={styles.sectionCard}>

                    <Text style={styles.sectionTitle}>
                        Image & OCR
                    </Text>


                    <Text style={styles.label}>
                        Image
                    </Text>


                    <View style={styles.imageButtonRow}>

                        <TouchableOpacity
                            style={styles.imageButton}
                            onPress={takePhoto}
                        >

                            <AntDesign
                                name="camera"
                                size={20}
                                color={styles.buttonIcon.color}
                            />

                            <Text
                                style={
                                    styles.imageButtonText
                                }
                            >
                                Take Picture
                            </Text>

                        </TouchableOpacity>


                        <TouchableOpacity
                            style={styles.imageButton}
                            onPress={pickImage}
                        >

                            <AntDesign
                                name="picture"
                                size={20}
                                color={styles.buttonIcon.color}
                            />

                            <Text
                                style={
                                    styles.imageButtonText
                                }
                            >
                                Choose From Gallery
                            </Text>

                        </TouchableOpacity>

                    </View>


                    {imageUri && (

                        <Image
                            source={{
                                uri: imageUri
                            }}
                            style={
                                styles.previewImage
                            }
                        />

                    )}


                    <View style={styles.switchRow}>

                        <Text style={styles.switchLabel}>
                            Translate
                        </Text>

                        <Switch
                            value={translateText}
                            onValueChange={
                                setTranslateText
                            }
                        />

                    </View>


                    <View style={styles.switchRow}>

                        <Text style={styles.switchLabel}>
                            Generate Audio
                        </Text>

                        <Switch
                            value={generateAudio}
                            onValueChange={
                                setGenerateAudio
                            }
                            disabled={true}
                        />

                    </View>


                    <View style={styles.actionRow}>

                        <TouchableOpacity
                            style={
                                styles.secondaryButton
                            }
                            onPress={runOCR}
                        >

                            <AntDesign
                                name="scan"
                                size={19}
                                color="white"
                            />

                            <Text
                                style={
                                    styles.secondaryButtonText
                                }
                            >
                                Extract Text
                            </Text>

                        </TouchableOpacity>


                        <TouchableOpacity
                            style={
                                styles.secondaryButton
                            }
                        >

                            <AntDesign
                                name="retweet"
                                size={19}
                                color="white"
                            />

                            <Text
                                style={
                                    styles.secondaryButtonText
                                }
                            >
                                Retranslate
                            </Text>

                        </TouchableOpacity>

                    </View>

                </View>


                {/* =====================================================
                    SPLIT OPTIONS
                ====================================================== */}

                <View style={styles.sectionCard}>

                    <Text style={styles.sectionTitle}>
                        Split Text into Sentences
                    </Text>


                    <ButtonGroup
                        options={splitOptions}
                        selectedValue={splitType}
                        onValueChange={
                            setSplitType
                        }
                    />


                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleSplitText}
                    >

                        <Text
                            style={
                                styles.primaryButtonText
                            }
                        >
                            Split Text
                        </Text>

                    </TouchableOpacity>

                </View>


                {/* =====================================================
                    ORIGINAL SENTENCE INPUTS
                ====================================================== */}

                {!isSplit && (

                    <View style={styles.sectionCard}>

                        <Text style={styles.sectionTitle}>
                            Sentence
                        </Text>


                        <Text style={styles.label}>
                            Native Text
                        </Text>

                        <TextInput
                            style={styles.input}
                            multiline
                            value={sentence}
                            onChangeText={
                                setSentence
                            }
                        />


                        <Text style={styles.label}>
                            Translation
                        </Text>

                        <TextInput
                            style={styles.input}
                            multiline
                            value={
                                translatedSentence
                            }
                            onChangeText={
                                setTranslatedSentence
                            }
                        />


                        <Text style={styles.label}>
                            Start Time (ms)
                        </Text>

                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={startMs}
                            onChangeText={
                                setStartMs
                            }
                        />


                        <Text style={styles.label}>
                            End Time (ms)
                        </Text>

                        <TextInput
                            style={styles.input}
                            keyboardType="numeric"
                            value={endMs}
                            onChangeText={
                                setEndMs
                            }
                        />


                        <TouchableOpacity
                            style={
                                styles.primaryButton
                            }
                            onPress={
                                handleAddSentence
                            }
                        >

                            <Text
                                style={
                                    styles.primaryButtonText
                                }
                            >
                                Add Sentence
                            </Text>

                        </TouchableOpacity>

                    </View>

                )}


                {/* =====================================================
                    SPLIT SENTENCE TABLE
                ====================================================== */}

                {isSplit && (

                    <View style={styles.sectionCard}>

                        <Text style={styles.sectionTitle}>
                            Sentences
                        </Text>


                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={
                                true
                            }
                        >

                            <View style={styles.table}>

                                {/* Header */}

                                <View
                                    style={
                                        styles.tableHeader
                                    }
                                >

                                    <Text
                                        style={[
                                            styles.headerText,
                                            styles.indexColumn,
                                        ]}
                                    >
                                        #
                                    </Text>


                                    <Text
                                        style={[
                                            styles.headerText,
                                            styles.nativeColumn,
                                        ]}
                                    >
                                        Native
                                    </Text>


                                    <Text
                                        style={[
                                            styles.headerText,
                                            styles.translationColumn,
                                        ]}
                                    >
                                        Translation
                                    </Text>


                                    <Text
                                        style={[
                                            styles.headerText,
                                            styles.timeColumn,
                                        ]}
                                    >
                                        Start
                                    </Text>


                                    <Text
                                        style={[
                                            styles.headerText,
                                            styles.timeColumn,
                                        ]}
                                    >
                                        End
                                    </Text>


                                    <Text
                                        style={[
                                            styles.headerText,
                                            styles.removeColumn,
                                        ]}
                                    >
                                        Remove
                                    </Text>

                                </View>


                                {/* Rows */}

                                {sentences.map(
                                    (item, index) => (

                                        <View
                                            key={item.id}
                                            style={
                                                styles.tableRow
                                            }
                                        >

                                            <Text
                                                style={[
                                                    styles.indexText,
                                                    styles.indexColumn,
                                                ]}
                                            >
                                                {index + 1}
                                            </Text>


                                            <TextInput
                                                style={[
                                                    styles.tableInput,
                                                    styles.nativeColumn,
                                                ]}
                                                multiline
                                                value={
                                                    item.sentence
                                                }
                                                onChangeText={
                                                    (value) =>
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
                                                    styles.translationColumn,
                                                ]}
                                                multiline
                                                value={
                                                    item.translated_sentence
                                                }
                                                onChangeText={
                                                    (value) =>
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
                                                    styles.timeColumn,
                                                ]}
                                                keyboardType="numeric"
                                                value={
                                                    String(
                                                        item.start_ms
                                                    )
                                                }
                                                onChangeText={
                                                    (value) =>
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
                                                    styles.timeColumn,
                                                ]}
                                                keyboardType="numeric"
                                                value={
                                                    String(
                                                        item.end_ms
                                                    )
                                                }
                                                onChangeText={
                                                    (value) =>
                                                        updateSentence(
                                                            index,
                                                            'end_ms',
                                                            value
                                                        )
                                                }
                                            />


                                            <TouchableOpacity
                                                style={
                                                    styles.removeButton
                                                }
                                                onPress={() =>
                                                    removeSentence(
                                                        index
                                                    )
                                                }
                                            >

                                                <AntDesign
                                                    name="delete"
                                                    size={20}
                                                    color={
                                                        colors.danger
                                                    }
                                                />

                                            </TouchableOpacity>

                                        </View>

                                    )
                                )}

                            </View>

                        </ScrollView>

                    </View>

                )}


                {/* =====================================================
                    ADD SPLIT SENTENCES
                ====================================================== */}

                {isSplit && (

                    <TouchableOpacity
                        style={
                            styles.primaryButton
                        }
                        onPress={
                            handleAddSentences
                        }
                    >

                        <Text
                            style={
                                styles.primaryButtonText
                            }
                        >
                            Add Sentences
                        </Text>

                    </TouchableOpacity>

                )}

            </ScrollView>


            <LoadingOverlay
                visible={loading}
            />

        </View>

    );
}
