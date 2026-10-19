
import React, { useEffect, useState, useRef } from 'react';

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
    StyleSheet,
    Platform,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import CustomPopup from './components/CustomPopup';
import { Audio } from 'expo-av';

export default function GrammarLessonDetailScreen({ navigation, route }) {
    const insets = useSafeAreaInsets();
    const lessonId = route.params?.lessonId;
    const [audioTimestamps, setAudioTimestamps] = useState({});
    const [audioSound, setAudioSound] = useState(null);

    const [lesson, setLesson] = useState(null);
    const [loading, setLoading] = useState(true);
    const [answers, setAnswers] = useState({});
    const [checkedAnswers, setCheckedAnswers] = useState({});
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [savingProgress, setSavingProgress] = useState(false);
    const [submissionScore, setSubmissionScore] = useState(null);
    const [popup, setPopup] = useState({
        visible: false,
        message: '',
        type: 'success',
    });

    const webAudioRef = useRef(null);
    const rafRef = useRef(null);

    const showPopup = (message, type = 'success') => {
        setPopup({
            visible: true,
            message,
            type,
        });
    };



    const playTargetText = async (segmentId) => {
        const timestamp = audioTimestamps[segmentId];

        if (!timestamp) {
            console.warn('Timestamp not found:', segmentId);
            return;
        }

        if (Platform.OS !== 'web' && !audioSound) {
            console.warn('Audio not ready:', segmentId);
            return;
        }

        if (Platform.OS === 'web') {
            const audio = webAudioRef.current;

            if (!audio) {
                console.warn('Browser audio is not ready.');
                return;
            }

            cancelAnimationFrame(rafRef.current);
            audio.pause();

            const begin = () => {
                audio.play().catch(err =>
                    console.error('Failed to play grammar audio:', err)
                );

                const tick = () => {
                    if (audio.paused) return;

                    if (audio.currentTime >= timestamp.end) {
                        audio.pause();
                        return;
                    }
                    rafRef.current = requestAnimationFrame(tick);
                };
                rafRef.current = requestAnimationFrame(tick);
            };

            const seekAndPlay = () => {
                audio.currentTime = timestamp.start;

                if (audio.seeking) {
                    audio.addEventListener('seeked', begin, { once: true });
                } else {
                    begin();
                }
            };

            if (audio.readyState < 1) {
                audio.addEventListener('loadedmetadata', seekAndPlay, { once: true });
                audio.load();
            } else {
                seekAndPlay();
            }

            return;
        }
        const startMs = Math.max(0, timestamp.start * 1000);
        const endMs = timestamp.end * 1000;

        if (endMs <= startMs) {
            console.warn('Invalid audio timestamps:', timestamp);
            return;
        }

        try {
            // Stop any previous segment.
            audioSound.setOnPlaybackStatusUpdate(null);
            await audioSound.pauseAsync();

            // Seek to the requested start timestamp.
            await audioSound.setPositionAsync(startMs);
            console.log('Sound properties:', Object.keys(audioSound));
            console.log('Sound internals:', audioSound._native);
            const position = await audioSound.getStatusAsync();

            console.log('Playing segment:', segmentId);
            console.log('Requested start:', startMs, 'ms');
            console.log('Actual position:', position.positionMillis, 'ms');
            console.log('End:', endMs, 'ms');

            if (
                !position.isLoaded ||
                Math.abs(position.positionMillis - startMs) > 150
            ) {
                console.warn('Audio did not seek to the requested position.');
                return;
            }

            let hasPaused = false;

            audioSound.setOnPlaybackStatusUpdate((status) => {
                if (
                    status.isLoaded &&
                    status.isPlaying &&
                    !hasPaused &&
                    status.positionMillis >= endMs
                ) {
                    hasPaused = true;
                    audioSound.pauseAsync();
                }
            });

            await audioSound.playAsync();

        } catch (err) {
            console.error('Failed to play grammar audio:', err);
        }
    };




    const renderLessonText = (content, keyPrefix = 'text') => {
        // Keep existing lessons that use plain strings compatible.
        if (typeof content === 'string' || typeof content === 'number') {
            return content;
        }

        // Render arrays of text segments inline.
        if (Array.isArray(content)) {
            return content.map((item, index) => (
                <React.Fragment key={`${keyPrefix}-${index}`}>
                    {renderLessonText(item, `${keyPrefix}-${index}`)}
                </React.Fragment>
            ));
        }

        // Handle structured text objects.
        if (content && typeof content === 'object') {
            if (content.type === 'target_text') {
                return (
                    <Text
                        key={content.id || keyPrefix}
                        style={styles.targetText}
                        onPress={() => playTargetText(content.id)}
                    >
                        {content.text || ''}
                    </Text>
                );
            }

            if (content.type === 'text') {
                return content.text || '';
            }
        }

        return '';
    };



    useEffect(() => {
        loadLesson();
    }, [lessonId]);
    const loadLesson = async () => {
        try {
            setLoading(true);

            const ip = await getServerIP();
            const token = await AsyncStorage.getItem('accessToken');

            if (!token) {
                showPopup('Please log in to view this lesson.', 'error');
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
            console.log('Grammar lesson loaded:', data.id);
            console.log('Audio directory:', data.audio_directory);

            // Load audio timestamps returned by the lesson detail API.
            setAudioTimestamps(data.audio_timestamps || {});

            console.log(
                'Loaded audio timestamp IDs:',
                Object.keys(data.audio_timestamps || {})
            );

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

            showPopup(err.message || 'Failed to load grammar lesson.', 'error');
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        let sound = null;
        let blobUrl = null;
        let cancelled = false;

        const loadAudio = async () => {
            if (!lesson?.audio_directory) return;

            try {
                const ip = await getServerIP();
                const audioUrl = `http://${ip}:8000/${lesson.audio_directory}/audio.wav`;

                if (Platform.OS === 'web') {
                    const res = await fetch(audioUrl);
                    if (!res.ok) throw new Error(`Audio fetch failed: ${res.status}`);

                    const blob = await res.blob();
                    if (cancelled) return;

                    blobUrl = URL.createObjectURL(blob);
                    const audio = new window.Audio(blobUrl);
                    audio.preload = 'auto';
                    webAudioRef.current = audio;
                    return;
                }

                const result = await Audio.Sound.createAsync(
                    { uri: audioUrl },
                    { shouldPlay: false }
                );
                sound = result.sound;

                if (cancelled) {
                    await sound.unloadAsync();
                    return;
                }

                await sound.setProgressUpdateIntervalAsync(50);
                setAudioSound(sound);
            } catch (err) {
                console.error('Failed to load grammar audio:', err);
            }
        };

        setAudioSound(null);
        loadAudio();

        return () => {
            cancelled = true;
            cancelAnimationFrame(rafRef.current);

            if (webAudioRef.current) {
                webAudioRef.current.pause();
                webAudioRef.current = null;
            }
            if (blobUrl) URL.revokeObjectURL(blobUrl);

            if (sound) {
                sound.setOnPlaybackStatusUpdate(null);
                sound.unloadAsync();
            }
        };
    }, [lesson?.audio_directory]);



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
            showPopup('Please enter or select an answer.', 'caution');
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
                showPopup('Please log in first.', 'error');
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

                const exercises = lesson?.exercises || [];
                let correct = 0;

                exercises.forEach(exercise => {
                    const userAnswer = String(
                        answers[exercise.id] || ''
                    ).trim().toLowerCase();

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

                    const isCorrect = acceptedAnswers.some(
                        answer =>
                            String(answer).trim().toLowerCase() === userAnswer
                    );

                    if (isCorrect) {
                        correct++;
                    }
                });

                const total = exercises.length;

                setSubmissionScore({
                    correct,
                    total,
                    percentage: total > 0
                        ? Math.round((correct / total) * 100)
                        : 0,
                });
            } else {
                showPopup('Your progress has been saved.', 'success');

                setTimeout(() => {
                    navigation.navigate('GrammarLessons', {
                        refresh: Date.now(),
                    });
                }, 1000);
            }


        } catch (err) {
            console.error('Failed to save grammar progress:', err);

            showPopup(err.message || 'Failed to save grammar progress.', 'error');
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
                    {renderLessonText(
                        exercise.instruction,
                        `instruction-${exercise.id}`
                    )}
                </Text>

                <Text style={styles.question}>
                    {renderLessonText(
                        exercise.question,
                        `question-${exercise.id}`
                    )}
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
                                    disabled={
                                        isSubmitted ||
                                        (checked === false && !exercise.correctable)
                                    }
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
                                            {renderLessonText(option, `option-${exercise.id}-${optionIndex}`)}
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
                        editable={
                            !isSubmitted &&
                            !(checked === false && !exercise.correctable)
                        }
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
                    disabled={
                        checked === false &&
                        !exercise.correctable
                    }
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
                            {checked
                                ? 'Correct!'
                                : exercise.correctable
                                    ? 'Not quite. Try again.'
                                    : 'Incorrect.'}
                        </Text>

                        {!checked && (
                            <Text style={styles.correctAnswer}>
                                Correct answer: {renderLessonText(
                                    exercise.correct_answer,
                                    `correct-answer-${exercise.id}`
                                )}
                            </Text>
                        )}

                        {exercise.explanation ? (
                            <Text style={styles.explanationText}>
                                {renderLessonText(
                                    exercise.explanation,
                                    `exercise-explanation-${exercise.id}`
                                )}
                            </Text>
                        ) : null}

                        {exercise.translation ? (
                            <Text style={styles.translationText}>
                                Translation: {renderLessonText(
                                    exercise.translation,
                                    `exercise-translation-${exercise.id}`
                                )}
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
                                            {renderLessonText(objective, `objective-${index}`)}
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
                                {renderLessonText(
                                    section.heading || `Section ${index + 1}`,
                                    `heading-${index}`
                                )}
                            </Text>

                            <Text style={styles.bodyText}>
                                {renderLessonText(section.content, `section-${index}`)}
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
                                        {renderLessonText(example.sentence, `example-${index}`)}
                                    </Text>

                                    {example.translation ? (
                                        <Text style={styles.translationText}>
                                            {renderLessonText(
                                                example.translation,
                                                `example-translation-${index}`
                                            )}
                                        </Text>
                                    ) : null}

                                    {example.explanation ? (
                                        <Text style={styles.explanationText}>
                                            {renderLessonText(
                                                example.explanation,
                                                `example-explanation-${index}`
                                            )}
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
            {submissionScore !== null && (
                <View style={styles.popupOverlay}>
                    <View style={styles.submissionPopup}>
                        <AntDesign
                            name={
                                submissionScore.percentage >= 70
                                    ? 'check-circle'
                                    : 'close-circle'
                            }
                            size={58}
                            color={
                                submissionScore.percentage >= 70
                                    ? '#00adb5'
                                    : '#ff8a80'
                            }
                        />

                        <Text style={styles.popupTitle}>
                            Lesson Submitted!
                        </Text>

                        <Text style={styles.popupScore}>
                            {submissionScore.percentage}%
                        </Text>

                        <Text style={styles.popupDetails}>
                            You answered {submissionScore.correct} out of{' '}
                            {submissionScore.total} exercises correctly.
                        </Text>

                        <TouchableOpacity
                            style={styles.popupButton}
                            onPress={() => {
                                setSubmissionScore(null);
                                navigation.navigate('GrammarLessons', {
                                    refresh: Date.now(),
                                });
                            }}
                        >
                            <Text style={styles.popupButtonText}>
                                Return to Lessons
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
            <CustomPopup
                visible={popup.visible}
                message={popup.message}
                type={popup.type}
                duration={3000}
                onClose={() => {
                    setPopup(previous => ({
                        ...previous,
                        visible: false,
                    }));
                }}
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
    popupOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 1000,
    },
    submissionPopup: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: '#2d333b',
        borderRadius: 16,
        padding: 28,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#555b63',
    },
    popupTitle: {
        color: 'white',
        fontSize: 23,
        fontWeight: 'bold',
        marginTop: 16,
        textAlign: 'center',
    },
    popupScore: {
        color: '#00adb5',
        fontSize: 48,
        fontWeight: 'bold',
        marginTop: 12,
    },
    popupDetails: {
        color: '#eeeeee',
        fontSize: 16,
        lineHeight: 24,
        textAlign: 'center',
        marginTop: 8,
    },
    popupButton: {
        backgroundColor: '#00adb5',
        borderRadius: 8,
        paddingVertical: 13,
        paddingHorizontal: 20,
        alignItems: 'center',
        width: '100%',
        marginTop: 24,
    },
    popupButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    targetText: {
        color: '#00adb5',
        textDecorationLine: 'underline',
    },
});
