


import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Share,
    Platform,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import * as DocumentPicker from 'expo-document-picker';

import BottomAudioMenu from './components/BottomAudioMenu';          // ← adjust path as needed
import AudioWaveVisualizer from './components/AudioWaveVisualizer';  // ← adjust path as needed

export default function LessonEditScreen({ route, navigation }) {
    const { lessonId } = route.params;

    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [lessonPrivate, setLessonPrivate] = useState(false);
    const [audioFile, setAudioFile] = useState(null);
    const [sentences, setSentences] = useState([]);
    const [sentencesExpanded, setSentencesExpanded] = useState(false);
    const [serverIP, setServerIP] = useState('');

    // ── BottomAudioMenu state (showToggles=false so only sliders are used) ──
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1.0);

    // Duration of the lesson audio – update this if you fetch it from the lesson data
    const [audioDurationMs, setAudioDurationMs] = useState(60000);

    // ── Server IP ────────────────────────────────────────────────────────────
    useEffect(() => {
        const loadIP = async () => {
            const ip = await getServerIP();
            setServerIP(ip);
        };
        loadIP();
    }, []);

    useEffect(() => {
        if (!serverIP) return;
        fetchLesson();
    }, [serverIP]);

    // ── Fetch lesson ─────────────────────────────────────────────────────────
    const fetchLesson = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');

            const res = await fetch(
                `http://${serverIP}:8000/api/edit-lesson/${lessonId}/`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            const data = await res.json();

            setTitle(data.title || '');
            setUrl(data.url || '');
            setLessonPrivate(data.lesson_private || false);
            setSentences(data.sentences || []);

            // If your API returns audio duration, set it here:
            // if (data.audio_duration_ms) setAudioDurationMs(data.audio_duration_ms);

        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to load lesson');
        }
    };

    // ── Sentence helpers ─────────────────────────────────────────────────────
    const updateSentence = (index, field, value) => {
        const updated = [...sentences];
        updated[index][field] = value;
        setSentences(updated);
    };

    // ── Save ─────────────────────────────────────────────────────────────────
    const saveLesson = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');
            const formData = new FormData();

            formData.append('title', title);
            formData.append('url', url);
            formData.append('lesson_private', lessonPrivate);
            formData.append('sentences', JSON.stringify(sentences));

            if (audioFile) {
                if (Platform.OS === 'web') {
                    formData.append('audio_file', audioFile.file);
                } else {
                    formData.append('audio_file', {
                        uri:
                            Platform.OS === 'ios'
                                ? audioFile.uri.replace('file://', '')
                                : audioFile.uri,
                        name: audioFile.name || 'audio.m4a',
                        type: audioFile.mimeType || audioFile.type || 'audio/mp4',
                    });
                }
            }

            const res = await fetch(
                `http://${serverIP}:8000/api/edit-lesson/${lessonId}/`,
                {
                    method: 'PUT',
                    headers: { Authorization: `Bearer ${token}` },
                    body: formData,
                }
            );

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Update failed');

            Alert.alert('Success', 'Lesson updated');
            navigation.goBack();

        } catch (error) {
            console.error(error);
            Alert.alert('Error', error.message);
        }
    };

    // ── Download TXT ─────────────────────────────────────────────────────────
    const downloadTxt = async () => {
        const nativeSection = sentences
            .map((s, i) => `${i + 1}. ${s.sentence}`)
            .join('\n\n');

        const translatedSection = sentences
            .map((s, i) => `${i + 1}. ${s.translated_sentence}`)
            .join('\n\n');

        const content = `${title}\n\n${nativeSection}\n\n${translatedSection}`;

        try {
            if (Platform.OS === 'web') {
                const blob = new Blob([content], { type: 'text/plain' });
                const blobUrl = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = blobUrl;
                a.download = `${title || 'transcript'}.txt`;
                a.click();
                URL.revokeObjectURL(blobUrl);
            } else {
                await Share.share({ title: `${title} transcript`, message: content });
            }
        } catch (error) {
            console.error(error);
            Alert.alert('Error', 'Failed to export transcript');
        }
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <View style={styles.screenWrapper}>
            <ScrollView contentContainerStyle={styles.container}>

                {/* Back */}
                <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                    <AntDesign name="left" size={22} color="white" />
                </TouchableOpacity>

                <Text style={styles.header}>Edit Lesson</Text>

                {/* Title */}
                <Text style={styles.label}>Lesson Title</Text>
                <TextInput style={styles.input} value={title} onChangeText={setTitle} />

                {/* URL */}
                <Text style={styles.label}>Lesson URL</Text>
                <TextInput style={styles.input} value={url} onChangeText={setUrl} />

                {/* Private */}
                <View style={styles.switchRow}>
                    <Text style={styles.label}>Private Lesson</Text>
                    <Switch value={lessonPrivate} onValueChange={setLessonPrivate} />
                </View>

                {/* Download TXT */}
                <View style={styles.downloadRow}>
                    <TouchableOpacity style={styles.downloadButton} onPress={downloadTxt}>
                        <Text style={styles.downloadButtonText}>Download TXT</Text>
                    </TouchableOpacity>
                </View>

                {/* Upload Audio */}
                <View style={styles.downloadRow}>
                    <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={async () => {
                            const result = await DocumentPicker.getDocumentAsync({
                                type: 'audio/*',
                                copyToCacheDirectory: true,
                            });
                            if (result.assets && result.assets.length > 0) {
                                setAudioFile(result.assets[0]);
                            }
                        }}
                    >
                        <Text style={styles.downloadButtonText}>
                            {audioFile ? 'Audio Selected' : 'Upload Audio'}
                        </Text>
                    </TouchableOpacity>
                </View>



                {/* Sentences collapse */}
                <TouchableOpacity
                    style={styles.collapseHeader}
                    onPress={() => setSentencesExpanded(!sentencesExpanded)}
                >
                    <Text style={styles.collapseHeaderText}>
                        Sentences {sentencesExpanded ? '▲' : '▼'}
                    </Text>
                </TouchableOpacity>

                {sentencesExpanded && (
                    <>
                        <View style={styles.tableHeader}>
                            <Text style={styles.headerColumnSmall}>#</Text>
                            <Text style={styles.headerColumn}>Native</Text>
                            <Text style={styles.headerColumn}>Translation</Text>
                        </View>

                        {sentences.map((item, index) => (
                            <View key={item.id} style={styles.row}>
                                <Text style={styles.headerColumnSmall}>{index + 1}</Text>

                                <View style={styles.sentenceColumn}>
                                    <TextInput
                                        style={styles.columnInput}
                                        multiline
                                        value={item.sentence}
                                        onChangeText={(text) =>
                                            updateSentence(index, 'sentence', text)
                                        }
                                    />
                                    <TextInput
                                        style={styles.timeInput}
                                        value={String(item.start_ms)}
                                        onChangeText={(text) =>
                                            updateSentence(
                                                index,
                                                'start_ms',
                                                parseInt(text, 10) || 0
                                            )
                                        }
                                    />
                                </View>

                                <View style={styles.sentenceColumn}>
                                    <TextInput
                                        style={styles.columnInput}
                                        multiline
                                        value={item.translated_sentence}
                                        onChangeText={(text) =>
                                            updateSentence(
                                                index,
                                                'translated_sentence',
                                                text
                                            )
                                        }
                                    />
                                    <TextInput
                                        style={styles.timeInput}
                                        value={String(item.end_ms)}
                                        onChangeText={(text) =>
                                            updateSentence(
                                                index,
                                                'end_ms',
                                                parseInt(text, 10) || 0
                                            )
                                        }
                                    />
                                </View>
                            </View>
                        ))}
                    </>
                )}

                {/* Save */}
                <TouchableOpacity style={styles.saveButton} onPress={saveLesson}>
                    <Text style={styles.saveButtonText}>Save Lesson</Text>
                </TouchableOpacity>

            </ScrollView>

            {/* ── BottomAudioMenu: showToggles=false (no repeat/shuffle/etc) ─ */}
            <BottomAudioMenu
                volume={volume}
                setVolume={setVolume}
                playbackRate={playbackRate}
                setPlaybackRate={setPlaybackRate}
                // Toggles below are unused when showToggles=false but satisfy prop shape
                repeat={false}
                setRepeat={() => {}}
                repeatAll={false}
                setRepeatAll={() => {}}
                shuffle={false}
                setShuffle={() => {}}
                showToggles={false}
                showAudioVisualizer={true}
                lessonId={lessonId}
                audioDurationMs={audioDurationMs}
                
            />
        </View>
    );
}

const styles = StyleSheet.create({
    // Wrapper needed so BottomAudioMenu (position:absolute) anchors correctly
    screenWrapper: {
        flex: 1,
        backgroundColor: '#222831',
    },

    container: {
        flexGrow: 1,
        backgroundColor: '#222831',
        paddingTop: 80,
        paddingHorizontal: 10,
        paddingBottom: 120, // extra room so content clears the BottomAudioMenu
    },

    header: {
        color: '#eeeeee',
        fontSize: 30,
        fontWeight: '700',
        marginBottom: 30,
        textAlign: 'center',
    },

    label: {
        color: '#eeeeee',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
        marginTop: 18,
    },

    input: {
        backgroundColor: '#393e46',
        borderRadius: 10,
        padding: 8,
        color: '#eeeeee',
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#4b525c',
    },

    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },

    tableHeader: {
        flexDirection: 'row',
        marginBottom: 10,
        gap: 10,
    },

    headerColumn: {
        flex: 1,
        color: '#00adb5',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },

    headerColumnSmall: {
        flex: 0.1,
        color: '#00adb5',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },

    row: {
        flexDirection: 'row',
        marginBottom: 15,
        gap: 10,
    },

    columnInput: {
        flex: 1,
        backgroundColor: '#393e46',
        borderRadius: 10,
        padding: 14,
        color: '#eeeeee',
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#4b525c',
        textAlignVertical: 'top',
    },

    saveButton: {
        backgroundColor: '#00adb5',
        padding: 18,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 30,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 5,
    },

    saveButtonText: {
        color: '#222831',
        fontWeight: '700',
        fontSize: 18,
    },

    backLink: {
        position: 'absolute',
        top: 40,
        right: 20,
        zIndex: 20,
    },

    downloadRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 10,
    },

    downloadButton: {
        backgroundColor: '#00adb5',
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 8,
    },

    downloadButtonText: {
        color: '#222831',
        fontWeight: '600',
        fontSize: 14,
    },

    collapseHeader: {
        backgroundColor: '#393e46',
        borderRadius: 10,
        padding: 8,
        borderWidth: 1,
        borderColor: '#4b525c',
        marginTop: 20,
        marginBottom: 20,
    },

    collapseHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#eeeeee',
    },

    sentenceColumn: {
        flex: 1,
    },

    timeInput: {
        marginTop: 5,
        backgroundColor: '#393e46',
        borderRadius: 10,
        padding: 8,
        color: '#eeeeee',
        borderWidth: 1,
        borderColor: '#4b525c',
    },
});