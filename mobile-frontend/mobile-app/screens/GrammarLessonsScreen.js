import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import CustomPopup from './components/CustomPopup';

export default function GrammarLessonsScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    const [lessons, setLessons] = useState([]);
    const [loading, setLoading] = useState(true);

    const [serverIP, setServerIP] = useState('');
    const [expandedTopics, setExpandedTopics] = useState({});
    const [lessonToDelete, setLessonToDelete] = useState(null);
    const [deletePopupVisible, setDeletePopupVisible] = useState(false);
    const [popupMessage, setPopupMessage] = useState('');
    const [popupType, setPopupType] = useState('caution');
    const [popupShowButtons, setPopupShowButtons] = useState(false);

    useEffect(() => {
        loadLessons();
    }, []);

    const loadLessons = async () => {
        try {
            setLoading(true);

            const ip = await getServerIP();
            setServerIP(ip);

            const token = await AsyncStorage.getItem('accessToken');

            if (!token) {
                Alert.alert('Error', 'Please log in to view grammar lessons.');
                return;
            }

            const response = await fetch(
                `http://${ip}:8000/api/grammar/lessons/`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );


            const responseText = await response.text();

            let data;

            try {
                data = JSON.parse(responseText);
            } catch {
                data = { error: responseText };
            }

            if (!response.ok) {
                console.error('Grammar import API response:', {
                    status: response.status,
                    data: data,
                });

                throw new Error(
                    data.error ||
                    data.detail ||
                    JSON.stringify(data) ||
                    'Failed to import lesson.'
                );
            }

            console.log(
                'Grammar lesson ownership:',
                data.map(lesson => ({
                    id: lesson.id,
                    title: lesson.title,
                    is_owner: lesson.is_owner,
                }))
            );


            setLessons(data);

        } catch (err) {
            console.error('Failed to load grammar lessons:', err);
            Alert.alert('Error', err.message || 'Failed to load grammar lessons.');
        } finally {
            setLoading(false);
        }
    };

    const retakeLesson = async (lesson) => {
        try {
            const ip = serverIP || await getServerIP();
            const token = await AsyncStorage.getItem('accessToken');

            if (!token) {
                Alert.alert('Error', 'Please log in first.');
                return;
            }

            const response = await fetch(
                `http://${ip}:8000/api/grammar/lessons/${lesson.id}/attempt/`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ reset: true }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to reset the lesson.');
            }

            await loadLessons();

            Alert.alert('Lesson Reset', 'You can now retake this lesson.');
        } catch (err) {
            console.error('Failed to reset grammar lesson:', err);
            Alert.alert('Error', err.message || 'Failed to reset the lesson.');
        }
    };

    const confirmDeleteLesson = (lesson) => {
        setLessonToDelete(lesson);
        setPopupMessage(`Are you sure you want to delete "${lesson.title}"?`);
        setPopupType('caution');
        setPopupShowButtons(true);
        setDeletePopupVisible(true);
    };

    const deleteLesson = async () => {
        if (!lessonToDelete) return;

        try {
            const ip = serverIP || await getServerIP();
            const token = await AsyncStorage.getItem('accessToken');

            if (!token) {
                throw new Error('Please log in first.');
            }

            const response = await fetch(
                `http://${ip}:8000/api/grammar/lessons/${lessonToDelete.id}/`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            if (!response.ok) {
                const responseText = await response.text();
                let data = {};

                try {
                    data = JSON.parse(responseText);
                } catch {
                    // Response was not JSON.
                }

                throw new Error(
                    data.error || data.detail || 'Failed to delete lesson.'
                );
            }

            setLessons(currentLessons =>
                currentLessons.filter(
                    lesson => lesson.id !== lessonToDelete.id
                )
            );

            setLessonToDelete(null);
            setPopupMessage('Lesson deleted successfully.');
            setPopupType('success');
            setPopupShowButtons(false);
            setDeletePopupVisible(true);

        } catch (err) {
            setLessonToDelete(null);
            setPopupMessage(err.message || 'Failed to delete lesson.');
            setPopupType('error');
            setPopupShowButtons(false);
            setDeletePopupVisible(true);
        }
    };

    const importGrammarLesson = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/json',
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                return;
            }

            const file = result.assets[0];

            if (!file.name.toLowerCase().endsWith('.json')) {
                Alert.alert('Invalid File', 'Please select a JSON file.');
                return;
            }

            const fileContents = await fetch(file.uri).then(response => {
                if (!response.ok) {
                    throw new Error('Could not read the selected JSON file.');
                }

                return response.text();
            });

            const lessonData = JSON.parse(fileContents);

            const ip = serverIP || await getServerIP();
            const token = await AsyncStorage.getItem('accessToken');

            if (!token) {
                Alert.alert('Error', 'Please log in first.');
                return;
            }

            const response = await fetch(
                `http://${ip}:8000/api/grammar/import/`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(lessonData),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || data.detail || 'Failed to import lesson.'
                );
            }

            Alert.alert(
                'Import Successful',
                `${data.title} was imported successfully.`
            );

            await loadLessons();

        } catch (err) {
            console.error('Grammar lesson import failed:', err);

            Alert.alert(
                'Import Failed',
                err.message || 'Could not import the JSON file.'
            );
        }
    };

    const groupedLessons = lessons.reduce((groups, lesson) => {
        const topic = lesson.topic_title || 'Other Lessons';

        if (!groups[topic]) {
            groups[topic] = [];
        }

        groups[topic].push(lesson);

        return groups;
    }, {});

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
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <AntDesign name="left" size={22} color="white" />
                </TouchableOpacity>

                <Text style={styles.headerText}>Grammar Lessons</Text>
            </View>
            <TouchableOpacity
                style={styles.importButton}
                onPress={importGrammarLesson}
            >
                <AntDesign name="upload" size={18} color="white" />
                <Text style={styles.importButtonText}>Import JSON Lesson</Text>
            </TouchableOpacity>

            {loading ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color="#00adb5" />
                    <Text style={styles.message}>Loading grammar lessons...</Text>
                </View>
            ) : lessons.length === 0 ? (
                <View style={styles.centerContent}>
                    <Text style={styles.message}>
                        No grammar lessons are available for your target language yet.
                    </Text>
                </View>
            ) : (

                <ScrollView
                    contentContainerStyle={styles.lessonList}
                    showsVerticalScrollIndicator={false}
                >
                    {Object.entries(groupedLessons).map(([topic, topicLessons]) => {
                        const isExpanded = expandedTopics[topic] ?? false;

                        return (
                            <View key={topic} style={styles.topicGroup}>
                                <TouchableOpacity
                                    style={styles.topicHeader}
                                    onPress={() => {
                                        setExpandedTopics(previous => ({
                                            ...previous,
                                            [topic]: !previous[topic],
                                        }));
                                    }}
                                >
                                    <View style={styles.topicHeaderText}>
                                        <Text style={styles.topicTitle}>
                                            {topic}
                                        </Text>

                                        <Text style={styles.topicCount}>
                                            {topicLessons.length}{' '}
                                            {topicLessons.length === 1 ? 'lesson' : 'lessons'}
                                        </Text>
                                    </View>

                                    <AntDesign
                                        name={isExpanded ? 'up' : 'down'}
                                        size={18}
                                        color="#00adb5"
                                    />
                                </TouchableOpacity>

                                {isExpanded ? (
                                    topicLessons.map(lesson => (
                                        <TouchableOpacity
                                            key={lesson.id}
                                            style={styles.lessonCard}
                                            onPress={() => {
                                                navigation.navigate('GrammarLessonDetail', {
                                                    lessonId: lesson.id,
                                                });
                                            }}
                                        >
                                            <Text style={styles.lessonTitle}>
                                                {lesson.title}
                                            </Text>

                                            <Text style={styles.categoryText}>
                                                {lesson.category_name}
                                            </Text>
                                            <Text
                                                style={{
                                                    color: lesson.completed ? '#4caf50' : '#aaaaaa',
                                                    fontSize: 13,
                                                    marginTop: 5,
                                                }}
                                            >
                                                {lesson.completed ? '✓ Completed' : 'In progress'}
                                            </Text>

                                            <View style={styles.progressBarBackground}>
                                                <View
                                                    style={[
                                                        styles.progressBarFill,
                                                        {
                                                            width: `${lesson.completed
                                                                ? 100
                                                                : Math.max(
                                                                    0,
                                                                    Math.min(100, lesson.progress ?? 0)
                                                                )
                                                                }%`,
                                                        },
                                                    ]}
                                                />
                                            </View>

                                            <Text style={styles.progressText}>
                                                {lesson.completed
                                                    ? '100%'
                                                    : `${Math.round(
                                                        Math.max(0, Math.min(100, lesson.progress ?? 0))
                                                    )}% complete`}
                                            </Text>
                                            {lesson.reading_level ? (
                                                <Text style={styles.levelText}>
                                                    Reading level: {lesson.reading_level}
                                                </Text>
                                            ) : null}

                                            <View style={styles.cardFooter}>
                                                <Text style={styles.openText}>
                                                    View lesson
                                                </Text>

                                                <AntDesign name="right" size={16} color="#00adb5" />

                                            </View>
                                            {lesson.is_owner && (
                                                <TouchableOpacity
                                                    style={styles.deleteButton}
                                                    onPress={() => confirmDeleteLesson(lesson)}
                                                >
                                                    <AntDesign name="close" size={16} color="#e74c3c" />
                                                </TouchableOpacity>
                                            )}
                                            {lesson.completed ? (
                                                <TouchableOpacity
                                                    style={styles.retakeButton}
                                                    onPress={() => retakeLesson(lesson)}
                                                >
                                                    <AntDesign name="reload" size={16} color="white" />
                                                    <Text style={styles.retakeButtonText}>Retake Lesson</Text>
                                                </TouchableOpacity>
                                            ) : null}
                                        </TouchableOpacity>
                                    ))
                                ) : null}
                            </View>
                        );
                    })}
                </ScrollView>

            )}
            <CustomPopup
                visible={deletePopupVisible}
                message={popupMessage}
                type={popupType}
                showButtons={popupShowButtons}
                acceptText="Delete"
                declineText="Cancel"
                onAccept={deleteLesson}
                onDecline={() => setLessonToDelete(null)}
                onClose={() => setDeletePopupVisible(false)}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222831',
        paddingHorizontal: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
        marginBottom: 16,
    },
    backButton: {
        position: 'absolute',
        left: 0,
        padding: 8,
    },
    headerText: {
        color: 'white',
        fontSize: 22,
        fontWeight: 'bold',
    },
    centerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    message: {
        color: '#eeeeee',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 12,
    },
    lessonList: {
        paddingBottom: 24,
    },
    lessonCard: {
        backgroundColor: '#222831',
        borderRadius: 10,
        padding: 16,
        marginBottom: 12,
        marginLeft: 12,
        marginRight: 12,
    },
    lessonTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,

    },
    topicText: {
        color: '#eeeeee',
        fontSize: 15,
        marginBottom: 4,
    },
    categoryText: {
        color: '#aaaaaa',
        fontSize: 13,
        marginBottom: 4,
    },
    levelText: {
        color: '#00adb5',
        fontSize: 13,
        marginTop: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#555b63',
    },
    openText: {
        color: '#00adb5',
        fontSize: 14,
        fontWeight: '600',
    },
    importButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#00adb5',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    importButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    topicGroup: {
        marginBottom: 12,
        backgroundColor: '#393e46',
        borderRadius: 10,
        overflow: 'hidden',
    },
    topicHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,

    },
    topicHeaderText: {
        flex: 1,
    },
    topicTitle: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',

    },
    topicCount: {
        color: '#aaaaaa',
        fontSize: 13,
        marginTop: 4,
    },
    retakeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#e67e22',
        padding: 10,
        borderRadius: 8,
        marginTop: 10,
        gap: 8,
    },
    retakeButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
    progressBarBackground: {
        height: 8,
        backgroundColor: '#555b63',
        borderRadius: 4,
        overflow: 'hidden',
        marginTop: 8,
    },

    progressBarFill: {
        height: '100%',
        backgroundColor: '#00adb5',
        borderRadius: 4,
    },

    progressText: {
        color: '#aaaaaa',
        fontSize: 12,
        marginTop: 4,
    },
    deleteButton: {
        position: 'absolute',
        top: 10,
        right: 10,
        width: 30,
        height: 30,
        borderRadius: 15,
        borderWidth: 1,
        borderColor: '#e74c3c',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    deleteButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
    },
});