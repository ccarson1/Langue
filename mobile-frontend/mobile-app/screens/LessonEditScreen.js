import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Alert,
    ScrollView,
    StyleSheet,
    Switch
} from 'react-native';

import AsyncStorage from '@react-native-async-storage/async-storage';
import AntDesign from '@expo/vector-icons/AntDesign';
import config from '../utils/config';

export default function LessonEditScreen({
    route,
    navigation
}) {

    const { lessonId } = route.params;

    const server = config.SERVER_IP;

    const [title, setTitle] = useState('');
    const [url, setUrl] = useState('');
    const [lessonPrivate, setLessonPrivate] = useState(false);

    const [sentences, setSentences] = useState([]);

    useEffect(() => {
        fetchLesson();
    }, []);

    const fetchLesson = async () => {

        try {

            const token = await AsyncStorage.getItem(
                'accessToken'
            );

            const res = await fetch(
                `http://${server}:8000/api/edit-lesson/${lessonId}/`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            const data = await res.json();

            setTitle(data.title || '');
            setUrl(data.url || '');
            setLessonPrivate(data.lesson_private || false);

            setSentences(data.sentences || []);

        } catch (error) {

            console.error(error);

            Alert.alert(
                'Error',
                'Failed to load lesson'
            );
        }
    };

    const updateSentence = (
        index,
        field,
        value
    ) => {

        const updated = [...sentences];

        updated[index][field] = value;

        setSentences(updated);
    };

    const saveLesson = async () => {

        try {

            const token = await AsyncStorage.getItem(
                'accessToken'
            );

            const res = await fetch(
                `http://${server}:8000/api/edit-lesson/${lessonId}/`,
                {
                    method: 'PUT',

                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },

                    body: JSON.stringify({
                        title,
                        url,
                        lesson_private: lessonPrivate,
                        sentences
                    })
                }
            );

            const data = await res.json();

            if (!res.ok) {
                throw new Error(
                    data.error || 'Update failed'
                );
            }

            Alert.alert(
                'Success',
                'Lesson updated'
            );

            navigation.goBack();

        } catch (error) {

            console.error(error);

            Alert.alert(
                'Error',
                error.message
            );
        }
    };

    return (

        <ScrollView
            contentContainerStyle={styles.container}
        >
            <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
                <AntDesign name="left" size={22} color="white" />
            </TouchableOpacity>
            <Text style={styles.header}>
                Edit Lesson
            </Text>

            <Text style={styles.label}>
                Lesson Title
            </Text>

            <TextInput
                style={styles.input}
                value={title}
                onChangeText={setTitle}
            />

            <Text style={styles.label}>
                Lesson URL
            </Text>

            <TextInput
                style={styles.input}
                value={url}
                onChangeText={setUrl}
            />

            <View style={styles.switchRow}>

                <Text style={styles.label}>
                    Private Lesson
                </Text>

                <Switch
                    value={lessonPrivate}
                    onValueChange={setLessonPrivate}
                />

            </View>

            <Text style={styles.sentencesHeader}>
                Sentences
            </Text>

            <View style={styles.tableHeader}>

                <Text style={styles.headerColumn}>
                    Native
                </Text>

                <Text style={styles.headerColumn}>
                    Translation
                </Text>

            </View>

            {sentences.map((item, index) => (

                <View
                    key={item.id}
                    style={styles.row}
                >

                    <TextInput
                        style={styles.columnInput}
                        multiline
                        value={item.sentence}
                        onChangeText={(text) =>
                            updateSentence(
                                index,
                                'sentence',
                                text
                            )
                        }
                    />

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

                </View>
            ))}

            <TouchableOpacity
                style={styles.saveButton}
                onPress={saveLesson}
            >

                <Text style={styles.saveButtonText}>
                    Save Lesson
                </Text>

            </TouchableOpacity>

        </ScrollView>
    );
}

const styles = StyleSheet.create({

    container: {
        flexGrow: 1,
        backgroundColor: '#222831',
        paddingTop: 80,
        paddingHorizontal: 16,
        paddingBottom: 120,
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
        padding: 14,
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

    sentencesHeader: {
        color: '#eeeeee',
        fontSize: 24,
        fontWeight: '700',
        marginTop: 35,
        marginBottom: 20,
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
        minHeight: 120,
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
        shadowOffset: {
            width: 0,
            height: 6
        },
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

});