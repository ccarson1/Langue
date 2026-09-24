


import React, { useEffect, useState, useRef } from 'react';

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
    Image,
    PanResponder,
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import * as DocumentPicker from 'expo-document-picker';

import BottomAudioMenu from './components/BottomAudioMenu';
import AudioWaveVisualizer from './components/AudioWaveVisualizer';


import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles } from './styles/LessonEditStyles';
import LoadingOverlay from './components/LoadingOverlay';
import CustomPopup from './components/CustomPopup';

export default function LessonEditScreen({ route, navigation }) {
    const { lessonId } = route.params;

    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [lessonPrivate, setLessonPrivate] = useState(false);
    const [audioFile, setAudioFile] = useState(null);
    const [audioName, setAudioName] = useState('');
    const [imageFile, setImageFile] = useState(null);
    const [lessonImage, setLessonImage] = useState(null);
    const [imageName, setImageName] = useState('');
    const [creationDate, setcreationDate] = useState(null);
    const [sentences, setSentences] = useState([]);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragY, setDragY] = useState(0);
    const [dropIndex, setDropIndex] = useState(null);
    const [sentencesExpanded, setSentencesExpanded] = useState(false);
    const [serverIP, setServerIP] = useState('');
    const [deleting, setDeleting] = useState(false);
    const [showDeletePopup, setShowDeletePopup] = useState(false);

    // ── BottomAudioMenu state (showToggles=false so only sliders are used) ──
    const [volume, setVolume] = useState(1);
    const [playbackRate, setPlaybackRate] = useState(1.0);

    // Duration of the lesson audio – update this if you fetch it from the lesson data
    const [audioDurationMs, setAudioDurationMs] = useState(60000);

    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);
    const rowHeight = 100;
    const dragStartY = useRef(0);
    const draggedIndexRef = useRef(null);
    const dragActivated = useRef(false);
    const dragThreshold = 15;
    const dragYRef = useRef(0);


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
            console.log(data)

            setTitle(data.title || '');
            setUrl(data.url || '');
            setLessonPrivate(data.lesson_private || false);
            setSentences(data.sentences || []);
            setLessonImage(data.image_data);
            setImageName(data.image_name)
            setAudioName(data.audio_name)
            setcreationDate(data.created_at);

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

    const deleteSentence = async (sentenceId, index, isNew) => {
        try {
            if (isNew) {
                setSentences((prev) =>
                    prev.filter((_, i) => i !== index)
                );
                return;
            }

            const token = await AsyncStorage.getItem('accessToken');

            const url =
                `http://${serverIP}:8000/api/edit-lesson/${lessonId}/sentence/${sentenceId}/`;

            console.log('DELETE URL:', url);
            console.log('DELETE TOKEN EXISTS:', !!token);

            const res = await fetch(url, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            console.log('DELETE STATUS:', res.status);

            const responseText = await res.text();

            console.log('DELETE RESPONSE:', responseText);

            if (!res.ok) {
                throw new Error(
                    `Delete failed (${res.status}): ${responseText}`
                );
            }

            setSentences((prev) =>
                prev.filter((_, i) => i !== index)
            );

        } catch (error) {
            console.error('Delete sentence error:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to delete sentence'
            );
        }
    };

    const startDragging = (index, pageY) => {
        setDraggedIndex(index);
        draggedIndexRef.current = index;

        dragStartY.current = pageY;

        setDragY(0);
        dragYRef.current = 0;

        setDropIndex(index);
    };

    const finishDragging = () => {
        const fromIndex = draggedIndexRef.current;

        if (fromIndex === null) return;

        const offset = Math.round(
            dragYRef.current / rowHeight
        );

        const dropIndex = Math.max(
            0,
            Math.min(
                sentences.length - 1,
                fromIndex + offset
            )
        );

        let toIndex = dropIndex;

        // If moving downward, the dragged item is removed
        // from the array before it is inserted.
        if (toIndex > fromIndex) {
            toIndex -= 1;
        }

        if (fromIndex !== toIndex) {
            setSentences((prev) => {
                const updated = [...prev];

                const [movedSentence] = updated.splice(
                    fromIndex,
                    1
                );

                updated.splice(
                    toIndex,
                    0,
                    movedSentence
                );

                return updated;
            });
        }

        setDraggedIndex(null);
        draggedIndexRef.current = null;

        setDragY(0);
        dragYRef.current = 0;

        setDropIndex(null);
    };

    const createDragResponder = (index) => {
        return PanResponder.create({

            onStartShouldSetPanResponder: () => true,

            onPanResponderGrant: (event) => {
                startDragging(
                    index,
                    event.nativeEvent.pageY
                );
            },

            onPanResponderMove: (event) => {
                if (draggedIndexRef.current === null) {
                    return;
                }

                const distance =
                    event.nativeEvent.pageY - dragStartY.current;

                dragYRef.current = distance;
                setDragY(distance);

                const fromIndex = draggedIndexRef.current;

                // Determine how many row positions the dragged item has moved.
                const indexOffset = Math.round(
                    distance / rowHeight
                );

                const newDropIndex = Math.max(
                    0,
                    Math.min(
                        sentences.length - 1,
                        fromIndex + indexOffset
                    )
                );

                setDropIndex(newDropIndex);
            },

            onPanResponderRelease: () => {
                finishDragging();
            },

            onPanResponderTerminate: () => {
                finishDragging();
            },
        });
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

            if (imageFile) {
                if (Platform.OS === 'web') {
                    formData.append('image', imageFile.file);
                } else {
                    formData.append('image', {
                        uri:
                            Platform.OS === 'ios'
                                ? imageFile.uri.replace('file://', '')
                                : imageFile.uri,
                        name: imageFile.name || 'image.jpg',
                        type: imageFile.mimeType || 'image/jpeg',
                    });
                }
            }

            if (audioFile) {
                if (Platform.OS === 'web') {
                    formData.append('media_file', audioFile.file);
                } else {
                    formData.append('media_file', {
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

    // ── Delete Lesson ─────────────────────────────────────────────
    const deleteLesson = async () => {
        try {
            setDeleting(true);

            const token = await AsyncStorage.getItem('accessToken');

            const res = await fetch(
                `http://${serverIP}:8000/api/edit-lesson/${lessonId}/`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'Delete failed');
            }

            // Go directly to the Home screen
            navigation.reset({
                index: 0,
                routes: [{ name: 'Home' }],
            });

        } catch (error) {
            console.error('Delete lesson error:', error);

            setDeleting(false);

            Alert.alert(
                'Error',
                error.message || 'Failed to delete lesson'
            );
        }
    };

    const confirmDeleteLesson = () => {
        setShowDeletePopup(true);
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


                <Text style={styles.label}>Image Name</Text>
                <TextInput style={styles.input} value={imageName} onChangeText={setImageName} />
                <Image
                    source={{
                        uri: `data:image/jpeg;base64,${lessonImage}`
                    }}
                    style={{ width: 200, height: 200 }}
                />
                <TouchableOpacity
                    style={styles.downloadButton}
                    onPress={async () => {
                        const result = await DocumentPicker.getDocumentAsync({
                            type: 'image/*',
                            copyToCacheDirectory: true,
                        });

                        if (result.assets && result.assets.length > 0) {
                            setImageFile(result.assets[0]);
                            setImageName(result.assets[0].name);
                        }
                    }}
                >
                    <Text style={styles.downloadButtonText}>
                        {imageFile ? 'Image Selected' : 'Upload Image'}
                    </Text>
                </TouchableOpacity>






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
                <Text style={styles.label}>{audioName}</Text>
                <View style={styles.downloadRow}>
                    <TouchableOpacity
                        style={styles.downloadButton}
                        onPress={async () => {
                            const result = await DocumentPicker.getDocumentAsync({
                                type: ['audio/*', 'video/*'],
                                copyToCacheDirectory: true,
                            });
                            if (result.assets && result.assets.length > 0) {
                                setAudioFile(result.assets[0]);
                            }
                        }}
                    >
                        <Text style={styles.downloadButtonText}>
                            {audioFile ? 'Media Selected' : 'Upload Media'}
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

                <View style={styles.downloadRow}>
                    <TouchableOpacity
                        style={styles.downloadButton}

                    >
                        <Text style={styles.downloadButtonText}>
                            Retranslate Sentences
                        </Text>
                    </TouchableOpacity>

                </View>


                {sentencesExpanded && (
                    <>
                        <View style={styles.tableHeader}>
                            <Text style={styles.headerColumnSmall}>#</Text>
                            <Text style={styles.headerColumn}>Native</Text>
                            <Text style={styles.headerColumn}>Translation</Text>
                            <Text style={styles.headerColumnSmall}>Delete</Text>
                        </View>

                        {sentences.map((item, index) => {
                            const dragResponder = createDragResponder(index);

                            return (

                                <React.Fragment key={item.id}>

                                    {draggedIndex !== null &&
                                        dropIndex === index &&
                                        draggedIndex !== index && (
                                            <View style={styles.dropIndicator} />
                                        )}

                                    <View
                                        style={[
                                            styles.row,
                                            draggedIndex === index && styles.draggingRow,
                                            draggedIndex === index && {
                                                transform: [{ translateY: dragY }],
                                            },
                                        ]}
                                    >
                                        <View {...dragResponder.panHandlers} style={styles.dragHandle} >
                                            <AntDesign name="menu" size={24} color="white" />
                                        </View>
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
                                        <TouchableOpacity
                                            style={styles.deleteSentenceButton}
                                            onPress={() => deleteSentence(item.id, index, item.isNew)}
                                        >
                                            <AntDesign name="delete" size={22} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                </React.Fragment>
                            );
                        })}

                    </>
                )
                }
                <TouchableOpacity
                    style={styles.addSentenceButton}
                    onPress={() =>
                        navigation.navigate('AddSentence', {
                            onSave: (newSentences) => {
                                setSentences((prev) => [...prev, ...newSentences]);
                            },
                        })
                    }
                >
                    <AntDesign name="plus-circle" size={24} color="white" />
                    <Text style={styles.addSentenceButtonText}>Add Sentence</Text>
                </TouchableOpacity>
                {/* Save */}
                < TouchableOpacity style={styles.saveButton} onPress={saveLesson} >
                    <Text style={styles.saveButtonText}>Save Lesson</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={confirmDeleteLesson}
                >
                    <AntDesign name="delete" size={20} color="white" />

                    <Text style={styles.deleteButtonText}>
                        Delete Lesson
                    </Text>
                </TouchableOpacity>

            </ScrollView>

            <LoadingOverlay visible={deleting} />

            <CustomPopup
                visible={showDeletePopup}
                message={`Are you sure you want to delete "${title}"? This cannot be undone.`}
                type="caution"
                showButtons={true}
                acceptText="Delete"
                declineText="Cancel"
                onAccept={() => {
                    setShowDeletePopup(false);
                    deleteLesson();
                }}
                onDecline={() => {
                    setShowDeletePopup(false);
                }}
            />

            {/* ── BottomAudioMenu: showToggles=false (no repeat/shuffle/etc) ─ */}
            <BottomAudioMenu
                volume={volume}
                setVolume={setVolume}
                playbackRate={playbackRate}
                setPlaybackRate={setPlaybackRate}
                // Toggles below are unused when showToggles=false but satisfy prop shape
                repeat={false}
                setRepeat={() => { }}
                repeatAll={false}
                setRepeatAll={() => { }}
                shuffle={false}
                setShuffle={() => { }}
                showToggles={false}
                showAudioVisualizer={true}
                lessonId={lessonId}
                audioDurationMs={audioDurationMs}

            />
        </View>
    );
};
