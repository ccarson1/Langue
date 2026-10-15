
import React, { useEffect, useState } from 'react';

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    Alert,
    StyleSheet,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import { useFocusEffect } from '@react-navigation/native';

export default function GrammarLessonDetailScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const lessonId = route.params?.lessonId;

    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [checkedAnswers, setCheckedAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [savingProgress, setSavingProgress] = useState(false);


    useEffect(() => {
        loadLesson();
    }, [lessonId]);
    const loadLesson = async () => {
        try {
            setLoading(true);

            const ip = await getServerIP();
            const token = await AsyncStorage.getItem('accessToken');

            if (!token) {
                Alert.alert('Error', 'Please log in to view this lesson.');
                return;
            }

            const headers = {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json',
            };

            // Load the lesson.
            const response = await fetch(
                `http://${ip}:8000/api/grammar/lessons/${lessonId}/`,
                {
                    method: 'GET',
                    headers,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    data.detail ||
                    'Failed to load grammar lesson.'
                );
            }

            setLesson(data);

            // Load saved progress.
            const progressResponse = await fetch(
                `http://${ip}:8000/api/grammar/lessons/${lessonId}/attempt/`,
                {
                    method: 'GET',
                    headers,
                }
            );

            const progressData = await progressResponse.json();

            if (!progressResponse.ok) {
                throw new Error(
                    progressData.error ||
                    'Failed to load saved progress.'
                );
            }

            setAnswers(progressData.answers || {});
            setIsSubmitted(progressData.is_submitted || false);

            // Restore feedback for submitted exercises.
            const restoredFeedback = {};

            if (progressData.is_submitted) {
                (data.exercises || []).forEach(exercise => {
                    const userAnswer =
                        (progressData.answers || {})[String(exercise.id)] || '';

                    const acceptedAnswers = [
                        exercise.correct_answer,
                        ...(exercise.accepted_answers || []),
                    ];

                    if (
                        exercise.exercise_type === 'sentence_correction' &&
                        exercise.corrected_sentence
                    ) {
                        acceptedAnswers.push(exercise.corrected_sentence);
                    }

                    restoredFeedback[exercise.id] = acceptedAnswers.some(
                        answer =>
                            String(answer).trim().toLowerCase() ===
                            userAnswer.trim().toLowerCase()
                    );
                });
            }

            setCheckedAnswers(restoredFeedback);

        } catch (err) {
            console.error('Failed to load grammar lesson:', err);

            Alert.alert(
                'Error',
                err.message || 'Failed to load grammar lesson.'
            );
        } finally {
            setLoading(false);
        }
    };


    const updateAnswer = (exerciseId, answer) => {
        setAnswers(previous => ({
            ...previous,
            [exerciseId]: answer,
        }));

        setCheckedAnswers(previous => ({
            ...previous,
            [exerciseId]: undefined,
        }));
    };

    const checkAnswer = (exercise) => {
        const userAnswer = (answers[exercise.id] || '').trim();

        if (!userAnswer) {
            Alert.alert('Answer Required', 'Please enter or select an answer.');
            return;
        }

        let acceptedAnswers = [
            exercise.correct_answer,
            ...(exercise.accepted_answers || []),
        ];

        if (
            exercise.exercise_type === 'sentence_correction' &&
            exercise.corrected_sentence
        ) {
            acceptedAnswers.push(exercise.corrected_sentence);
        }

        const isCorrect = acceptedAnswers.some(
            answer =>
                String(answer).trim().toLowerCase() ===
                userAnswer.toLowerCase()
        );

        setCheckedAnswers(previous => ({
            ...previous,
            [exercise.id]: isCorrect,
        }));
    };


    const allAnswersCompleted = () => {
        const exercises = lesson?.exercises || [];

        return exercises.length > 0 && exercises.every(exercise =>
            (answers[exercise.id] || '').trim().length > 0
        );
    };


    const handleProgressButton = async () => {
        console.log('Save Progress button pressed');
        const completed = allAnswersCompleted();
        const isSubmitting = completed && !isSubmitted;

        try {
            setSavingProgress(true);

            const ip = await getServerIP();
            console.log('Server IP:', ip);

            const token = await AsyncStorage.getItem('accessToken');
            console.log('Access token found:', !!token);

            if (!token) {
                Alert.alert('Error', 'Please log in first.');
                return;
            }

            const response = await fetch(
                `http://${ip}:8000/api/grammar/lessons/${lessonId}/attempt/`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        answers,
                        submit: isSubmitting,
                    }),
                }
            );

            const data = await response.json();
            console.log('Progress API response:', response.status, data);

            if (!response.ok) {
                throw new Error(
                    data.error ||
                    (isSubmitting
                        ? 'Failed to submit answers.'
                        : 'Failed to save progress.')
                );
            }

            if (isSubmitting) {
                setIsSubmitted(true);
            }

            if (isSubmitting) {
                setIsSubmitted(true);
            }

            window.alert(
                isSubmitting
                    ? 'Your lesson has been submitted.'
                    : 'Your progress has been saved.'
            );

            navigation.navigate('GrammarLessons', {
                refresh: Date.now(),
            });
        } catch (err) {
            console.error('Failed to save grammar progress:', err);

            Alert.alert(
                'Error',
                err.message || 'Failed to save grammar progress.'
            );
        } finally {
            setSavingProgress(false);
        }
    };


    const renderExercise = (exercise, index) => {
        const answer = answers[exercise.id] || '';
        const checked = checkedAnswers[exercise.id];

        return (
            <View key={exercise.id} style={styles.exerciseCard}>
                <Text style={styles.exerciseNumber}>
                    Exercise {index + 1}
                </Text>

                <Text style={styles.exerciseType}>
                    {exercise.exercise_type === 'multiple_choice'
                        ? 'Multiple Choice'
                        : exercise.exercise_type === 'fill_in_the_blank'
                            ? 'Fill in the Blank'
                            : 'Sentence Correction'}
                </Text>

                <Text style={styles.exerciseInstruction}>
                    {exercise.instruction}
                </Text>

                <Text style={styles.question}>
                    {exercise.question}
                </Text>

                {exercise.exercise_type === 'multiple_choice' ? (
                    <View style={styles.optionsContainer}>
                        {(exercise.options || []).map((option, optionIndex) => {
                            const selected = answer === option;

                            return (
                                <TouchableOpacity
                                    key={optionIndex}
                                    style={[
                                        styles.optionButton,
                                        selected && styles.selectedOption,
                                    ]}
                                    onPress={() =>
                                        updateAnswer(exercise.id, option)
                                    }
                                    disabled={isSubmitted}
                                >
                                    <View style={styles.optionRow}>
                                        <View
                                            style={[
                                                styles.radioCircle,
                                                selected && styles.radioSelected,
                                            ]}
                                        >
                                            {selected && (
                                                <View style={styles.radioDot} />
                                            )}
                                        </View>

                                        <Text style={styles.optionText}>
                                            {option}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                ) : (
                    <TextInput
                        style={styles.answerInput}
                        value={answer}
                        onChangeText={value =>
                            updateAnswer(exercise.id, value)
                        }
                        editable={!isSubmitted}
                        placeholder={
                            exercise.exercise_type === 'fill_in_the_blank'
                                ? 'Enter the missing word'
                                : 'Enter the corrected sentence'
                        }
                        placeholderTextColor="#aaaaaa"
                        autoCapitalize="sentences"
                        multiline={
                            exercise.exercise_type === 'sentence_correction'
                        }
                    />
                )}

                <TouchableOpacity
                    style={styles.checkButton}
                    onPress={() => checkAnswer(exercise)}
                >
                    <Text style={styles.checkButtonText}>
                        Check Answer
                    </Text>
                </TouchableOpacity>

                {checked !== undefined && (
                    <View
                        style={[
                            styles.feedbackBox,
                            checked
                                ? styles.correctFeedback
                                : styles.incorrectFeedback,
                        ]}
                    >
                        <Text
                            style={[
                                styles.feedbackTitle,
                                { color: checked ? '#81c784' : '#ff8a80' },
                            ]}
                        >
                            {checked ? 'Correct!' : 'Not quite. Try again.'}
                        </Text>

                        {!checked && (
                            <Text style={styles.correctAnswer}>
                                Correct answer: {exercise.correct_answer}
                            </Text>
                        )}

                        {exercise.explanation ? (
                            <Text style={styles.explanationText}>
                                {exercise.explanation}
                            </Text>
                        ) : null}

                        {exercise.translation ? (
                            <Text style={styles.translationText}>
                                Translation: {exercise.translation}
                            </Text>
                        ) : null}
                    </View>
                )}
            </View>
        );
    };

    if (loading) {
        return (
            <View
                style={[
                    styles.container,
                    styles.centerContent,
                    {
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    },
                ]}
            >
                <ActivityIndicator size="large" color="#00adb5" />
                <Text style={styles.message}>Loading grammar lesson...</Text>
            </View>
        );
    }

    if (!lesson) {
        return (
            <View
                style={[
                    styles.container,
                    styles.centerContent,
                    {
                        paddingTop: insets.top,
                        paddingBottom: insets.bottom,
                    },
                ]}
            >
                <Text style={styles.message}>
                    This grammar lesson could not be loaded.
                </Text>

                <TouchableOpacity
                    style={styles.checkButton}
                    onPress={loadLesson}
                >
                    <Text style={styles.checkButtonText}>Try Again</Text>
                </TouchableOpacity>
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
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <AntDesign name="left" size={22} color="white" />
                </TouchableOpacity>

                <Text style={styles.headerText}>Grammar Lesson</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.titleCard}>
                    <Text style={styles.lessonTitle}>
                        {lesson.title}
                    </Text>

                    {lesson.topic_title ? (
                        <Text style={styles.topicText}>
                            {lesson.topic_title}
                        </Text>
                    ) : null}

                    {lesson.category_name ? (
                        <Text style={styles.categoryText}>
                            {lesson.category_name}
                        </Text>
                    ) : null}

                    {lesson.reading_level ? (
                        <Text style={styles.levelText}>
                            Reading level: {lesson.reading_level}
                        </Text>
                    ) : null}
                </View>

                {Array.isArray(lesson.learning_objectives) &&
                    lesson.learning_objectives.length > 0 && (
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                Learning Objectives
                            </Text>

                            {lesson.learning_objectives.map(
                                (objective, index) => (
                                    <View
                                        key={index}
                                        style={styles.objectiveRow}
                                    >
                                        <AntDesign
                                            name="check-circle"
                                            size={17}
                                            color="#00adb5"
                                        />

                                        <Text style={styles.bodyText}>
                                            {objective}
                                        </Text>
                                    </View>
                                )
                            )}
                        </View>
                    )}

                {Array.isArray(lesson.sections) &&
                    lesson.sections.map((section, index) => (
                        <View key={index} style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                {section.heading || `Section ${index + 1}`}
                            </Text>

                            <Text style={styles.bodyText}>
                                {section.content || ''}
                            </Text>
                        </View>
                    ))}

                {Array.isArray(lesson.examples) &&
                    lesson.examples.length > 0 && (
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                Examples
                            </Text>

                            {lesson.examples.map((example, index) => (
                                <View
                                    key={index}
                                    style={styles.exampleCard}
                                >
                                    <Text style={styles.exampleNumber}>
                                        Example {index + 1}
                                    </Text>

                                    <Text style={styles.exampleSentence}>
                                        {example.sentence}
                                    </Text>

                                    {example.translation ? (
                                        <Text style={styles.translationText}>
                                            {example.translation}
                                        </Text>
                                    ) : null}

                                    {example.explanation ? (
                                        <Text style={styles.explanationText}>
                                            {example.explanation}
                                        </Text>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    )}

                {Array.isArray(lesson.exercises) &&
                    lesson.exercises.length > 0 && (
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>
                                Practice Exercises
                            </Text>

                            <Text style={styles.bodyText}>
                                Complete each exercise and check your answer.
                            </Text>

                            {lesson.exercises.map(renderExercise)}

                            <TouchableOpacity
                                style={[
                                    styles.checkButton,
                                    (savingProgress || isSubmitted) && { opacity: 0.6 },
                                ]}
                                onPress={handleProgressButton}
                                disabled={savingProgress || isSubmitted}
                            >
                                <Text style={styles.checkButtonText}>
                                    {savingProgress
                                        ? 'Saving...'
                                        : isSubmitted
                                            ? 'Submitted'
                                            : allAnswersCompleted()
                                                ? 'Submit'
                                                : 'Save Progress'}
                                </Text>
                            </TouchableOpacity>

                        </View>

                    )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222831',
        paddingHorizontal: 16,
    },
    centerContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 56,
        marginBottom: 12,
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
    content: {
        paddingBottom: 28,
    },
    titleCard: {
        backgroundColor: '#393e46',
        borderRadius: 10,
        padding: 18,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#00adb5',
    },
    lessonTitle: {
        color: 'white',
        fontSize: 23,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    topicText: {
        color: '#eeeeee',
        fontSize: 16,
        marginBottom: 5,
    },
    categoryText: {
        color: '#aaaaaa',
        fontSize: 14,
        marginBottom: 5,
    },
    levelText: {
        color: '#00adb5',
        fontSize: 14,
        marginTop: 5,
    },
    sectionCard: {
        backgroundColor: '#2d333b',
        borderRadius: 10,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        color: '#00adb5',
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    bodyText: {
        color: '#eeeeee',
        fontSize: 15,
        lineHeight: 23,
        flex: 1,
    },
    objectiveRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        marginBottom: 10,
    },
    exampleCard: {
        backgroundColor: '#393e46',
        borderRadius: 8,
        padding: 14,
        marginBottom: 12,
    },
    exampleNumber: {
        color: '#00adb5',
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    exampleSentence: {
        color: 'white',
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 7,
    },
    translationText: {
        color: '#c5d8d9',
        fontSize: 14,
        lineHeight: 21,
        marginTop: 7,
    },
    explanationText: {
        color: '#eeeeee',
        fontSize: 14,
        lineHeight: 21,
        marginTop: 8,
    },
    exerciseCard: {
        backgroundColor: '#393e46',
        borderRadius: 8,
        padding: 14,
        marginTop: 14,
    },
    exerciseNumber: {
        color: 'white',
        fontSize: 17,
        fontWeight: 'bold',
    },
    exerciseType: {
        color: '#00adb5',
        fontSize: 13,
        marginTop: 4,
        marginBottom: 12,
    },
    exerciseInstruction: {
        color: '#eeeeee',
        fontSize: 14,
        marginBottom: 8,
    },
    question: {
        color: 'white',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 12,
    },
    optionsContainer: {
        gap: 8,
    },
    optionButton: {
        backgroundColor: '#222831',
        borderWidth: 1,
        borderColor: '#555b63',
        borderRadius: 8,
        padding: 12,
    },
    selectedOption: {
        borderColor: '#00adb5',
        backgroundColor: '#263b40',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#aaaaaa',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioSelected: {
        borderColor: '#00adb5',
    },
    radioDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#00adb5',
    },
    optionText: {
        color: 'white',
        fontSize: 15,
        flex: 1,
    },
    answerInput: {
        backgroundColor: '#222831',
        color: 'white',
        borderWidth: 1,
        borderColor: '#555b63',
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        minHeight: 46,
        textAlignVertical: 'top',
    },
    checkButton: {
        backgroundColor: '#00adb5',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
    },
    checkButtonText: {
        color: 'white',
        fontSize: 15,
        fontWeight: 'bold',
    },
    feedbackBox: {
        borderRadius: 8,
        padding: 12,
        marginTop: 12,
    },
    correctFeedback: {
        backgroundColor: '#263b32',
    },
    incorrectFeedback: {
        backgroundColor: '#402c30',
    },
    feedbackTitle: {
        fontSize: 15,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    correctAnswer: {
        color: '#eeeeee',
        fontSize: 14,
        marginTop: 4,
    },
    message: {
        color: '#eeeeee',
        fontSize: 16,
        textAlign: 'center',
        marginTop: 12,
    },
});
