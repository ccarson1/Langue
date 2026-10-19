
import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Modal,
    Alert,
    StyleSheet,
} from 'react-native';

import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AntDesign from '@expo/vector-icons/AntDesign';
import * as DocumentPicker from 'expo-document-picker';
import { getServerIP } from '../utils/config';
import LoadingOverlay from './components/LoadingOverlay';

const COLORS = {
    background: '#222831',
    surface: '#393e46',
    accent: '#00adb5',
    text: '#ffffff',
    muted: '#aaaaaa',
    danger: '#e74c3c',
};

const FALLBACK_EXERCISE_TYPES = [
    { name: 'Multiple Choice', code: 'multiple_choice' },
    { name: 'Fill in the Blank', code: 'fill_in_the_blank' },
    { name: 'Sentence Correction', code: 'sentence_correction' },
];

const EMPTY_EXERCISE = {
    exercise_type: 'multiple_choice',
    correctable: true,
    instruction: '',
    question: '',
    options: ['', '', ''],
    correct_answer: '',
    accepted_answers: [],
    explanation: '',
    translation: '',
    missing_word: '',
    complete_answer: '',
    incorrect_sentence: '',
    corrected_sentence: '',
};

export default function ImportGrammarScreen({ navigation }) {
    const insets = useSafeAreaInsets();

    const [serverIP, setServerIP] = useState('');
    const [loading, setLoading] = useState(false);
    const [showValidation, setShowValidation] = useState(false);

    const [categories, setCategories] = useState([]);
    const [topics, setTopics] = useState([]);
    const [exerciseTypes, setExerciseTypes] = useState(
        FALLBACK_EXERCISE_TYPES
    );
    const [languages, setLanguages] = useState([]);
    const [readingLevels, setReadingLevels] = useState([]);

    const [targetLanguage, setTargetLanguage] = useState('');
    const [explanationLanguage, setExplanationLanguage] = useState('');
    const [readingLevel, setReadingLevel] = useState('A1');

    const [selectedTopic, setSelectedTopic] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [newTopic, setNewTopic] = useState(false);
    const [newCategory, setNewCategory] = useState(false);
    const [newTopicTitle, setNewTopicTitle] = useState('');
    const [newTopicDescription, setNewTopicDescription] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newCategoryDescription, setNewCategoryDescription] = useState('');

    const [lessonTitle, setLessonTitle] = useState('');
    const [lessonDescription, setLessonDescription] = useState('');
    const [learningObjectives, setLearningObjectives] = useState([]);

    const [sections, setSections] = useState([]);
    const [examples, setExamples] = useState([]);
    const [exercises, setExercises] = useState([]);

    const [pickerVisible, setPickerVisible] = useState(false);
    const [pickerTitle, setPickerTitle] = useState('');
    const [pickerOptions, setPickerOptions] = useState([]);
    const [pickerCallback, setPickerCallback] = useState(null);

    const [expandedSections, setExpandedSections] = useState({});
    const [newObjective, setNewObjective] = useState('');

    useEffect(() => {
        loadInitialData();
    }, []);

    const getToken = async () => {
        const token = await AsyncStorage.getItem('accessToken');

        if (!token) {
            throw new Error('Please log in first.');
        }

        return token;
    };

    const apiRequest = async (path, options = {}) => {
        const ip = serverIP || await getServerIP();

        if (!serverIP) {
            setServerIP(ip);
        }

        const token = await getToken();

        const response = await fetch(
            `http://${ip}:8000/api/${path}`,
            {
                ...options,
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    ...options.headers,
                },
            }
        );

        const responseText = await response.text();
        let data = {};

        try {
            data = responseText ? JSON.parse(responseText) : {};
        } catch {
            data = { error: responseText };
        }

        if (!response.ok) {
            throw new Error(
                data.error ||
                data.detail ||
                `Request failed (${response.status}).`
            );
        }

        return data;
    };

    const loadInitialData = async () => {
        try {
            setLoading(true);

            const ip = await getServerIP();
            setServerIP(ip);

            const token = await getToken();

            const fetchData = async (path) => {
                const response = await fetch(
                    `http://${ip}:8000/api/${path}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            'Content-Type': 'application/json',
                        },
                    }
                );

                if (!response.ok) {
                    throw new Error(`Could not load ${path}.`);
                }

                return response.json();
            };

            const results = await Promise.allSettled([
                fetchData('grammar/categories/'),
                fetchData('grammar/topics/'),
                fetchData('languages/'),
                fetchData('grammar/exercise-types/'),
                fetchData('reading-levels/'),
            ]);

            if (results[0].status === 'fulfilled') {
                setCategories(results[0].value);
            }

            if (results[1].status === 'fulfilled') {
                setTopics(results[1].value);
            }

            if (results[2].status === 'fulfilled') {
                const data = results[2].value;
                setLanguages(data);

                // The target language can be chosen manually if needed.
                const defaultLanguage = data.find(
                    language => language.lang_name === 'Lithuanian'
                );

                if (defaultLanguage) {
                    setTargetLanguage(defaultLanguage.lang_name);
                }

                const english = data.find(
                    language => language.lang_name === 'English'
                );

                if (english) {
                    setExplanationLanguage(english.lang_name);
                }
            }

            if (results[3].status === 'fulfilled') {
                const data = results[3].value;

                if (Array.isArray(data) && data.length > 0) {
                    setExerciseTypes(data);
                }
            }

            if (results[4].status === 'fulfilled') {
                const data = results[4].value;
                setReadingLevels(
                    Array.isArray(data)
                        ? data.map(level => level.name)
                        : []
                );
            }
        } catch (error) {
            Alert.alert('Error', error.message || 'Could not load editor data.');
        } finally {
            setLoading(false);
        }
    };

    const showPicker = (title, options, callback) => {
        setPickerTitle(title);
        setPickerOptions(options);
        setPickerCallback(() => callback);
        setPickerVisible(true);
    };

    const chooseTopic = (topic) => {
        setSelectedTopic(topic);
        setSelectedCategory(
            categories.find(category => category.id === topic.category_id) || null
        );

        setNewTopic(false);
        setNewTopicTitle(topic.title);
        setNewTopicDescription(topic.description || '');
        setTargetLanguage(topic.target_language || targetLanguage);
    };

    const chooseCategory = (category) => {
        setSelectedCategory(category);
        setNewCategory(false);
        setNewCategoryName(category.name);
        setNewCategoryDescription(category.description || '');

        // A newly selected category means the topic must be selected or created.
        setSelectedTopic(null);
        setNewTopicTitle('');
        setNewTopicDescription('');
    };

    const startNewTopic = () => {
        setSelectedTopic(null);
        setNewTopic(true);
        setNewTopicTitle('');
        setNewTopicDescription('');
    };

    const startNewCategory = () => {
        setSelectedCategory(null);
        setNewCategory(true);
        setNewCategoryName('');
        setNewCategoryDescription('');
        setSelectedTopic(null);
        setNewTopic(true);
    };

    const addSection = () => {
        showPicker(
            'Add lesson content',
            [
                { label: 'Explanation section', value: 'explanation' },
                { label: 'Example', value: 'example' },
                { label: 'Exercise', value: 'exercise' },
            ],
            (value) => {
                if (value === 'explanation') {
                    const number = sections.length + 1;

                    setSections(current => [
                        ...current,
                        {
                            heading: `Section ${number}`,
                            content: [
                                { type: 'text', text: '' },
                            ],
                        },
                    ]);

                    setExpandedSections(current => ({
                        ...current,
                        [`section-${sections.length}`]: true,
                    }));
                }

                if (value === 'example') {
                    setExamples(current => [
                        ...current,
                        {
                            sentence: [],
                            translation: '',
                            grammar_focus: '',
                            explanation: [],
                        },
                    ]);
                }

                if (value === 'exercise') {
                    setExercises(current => [
                        ...current,
                        { ...EMPTY_EXERCISE, options: ['', '', ''] },
                    ]);
                }
            }
        );
    };

    const updateSection = (index, field, value) => {
        setSections(current =>
            current.map((section, i) =>
                i === index ? { ...section, [field]: value } : section
            )
        );
    };

    const updateSectionContent = (index, value) => {
        setSections(current =>
            current.map((section, i) =>
                i === index
                    ? {
                        ...section,
                        content: [
                            {
                                type: 'text',
                                text: value,
                            },
                        ],
                    }
                    : section
            )
        );
    };

    const updateExample = (index, field, value) => {
        setExamples(current =>
            current.map((example, i) =>
                i === index ? { ...example, [field]: value } : example
            )
        );
    };

    const updateExampleSentence = (index, value) => {
        setExamples(current =>
            current.map((example, i) =>
                i === index
                    ? {
                        ...example,
                        sentence: [
                            {
                                type: 'target_text',
                                id: `example_${index + 1}_sentence`,
                                text: value,
                            },
                        ],
                    }
                    : example
            )
        );
    };

    const updateExercise = (index, field, value) => {
        setExercises(current =>
            current.map((exercise, i) =>
                i === index
                    ? { ...exercise, [field]: value }
                    : exercise
            )
        );
    };

    const updateExerciseOption = (exerciseIndex, optionIndex, value) => {
        setExercises(current =>
            current.map((exercise, i) => {
                if (i !== exerciseIndex) return exercise;

                const options = [...(exercise.options || [])];
                options[optionIndex] = value;

                return { ...exercise, options };
            })
        );
    };

    const addExerciseOption = (index) => {
        setExercises(current =>
            current.map((exercise, i) =>
                i === index
                    ? {
                        ...exercise,
                        options: [...(exercise.options || []), ''],
                    }
                    : exercise
            )
        );
    };

    const removeItem = (setter, index) => {
        setter(current => current.filter((_, i) => i !== index));
    };

    const addObjective = () => {
        if (!newObjective.trim()) return;

        setLearningObjectives(current => [
            ...current,
            {
                type: 'text',
                text: newObjective.trim(),
            },
        ]);

        setNewObjective('');
    };

    const importJsonFile = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: ['application/json', 'text/json'],
                copyToCacheDirectory: true,
            });

            if (result.canceled) return;

            const file = result.assets[0];

            if (!file.name.toLowerCase().endsWith('.json')) {
                Alert.alert('Invalid File', 'Please select a JSON file.');
                return;
            }

            setLoading(true);

            const response = await fetch(file.uri);

            if (!response.ok) {
                throw new Error('Could not read the selected JSON file.');
            }

            const rawText = await response.text();
            const data = JSON.parse(rawText);

            if (!data || typeof data !== 'object' || Array.isArray(data)) {
                throw new Error('The JSON file must contain one lesson object.');
            }

            setLessonTitle(data.title || '');
            setLessonDescription(data.topic_description || '');
            setTargetLanguage(data.target_language || targetLanguage);
            setExplanationLanguage(
                data.explanation_language || explanationLanguage
            );
            setReadingLevel(data.reading_level || 'A1');

            setLearningObjectives(
                Array.isArray(data.learning_objectives)
                    ? data.learning_objectives
                    : []
            );

            setSections(
                Array.isArray(data.sections) ? data.sections : []
            );

            setExamples(
                Array.isArray(data.examples) ? data.examples : []
            );

            setExercises(
                Array.isArray(data.exercises)
                    ? data.exercises.map(exercise => ({
                        ...EMPTY_EXERCISE,
                        ...exercise,
                        options: exercise.options || [],
                        accepted_answers: exercise.accepted_answers || [],
                        correctable: exercise.correctable !== false,
                    }))
                    : []
            );

            const categoryName = data.category || '';
            const topicTitle = data.topic || '';

            const existingCategory = categories.find(
                category =>
                    category.name.toLowerCase() === categoryName.toLowerCase()
            );

            if (existingCategory) {
                setSelectedCategory(existingCategory);
                setNewCategory(false);
            } else if (categoryName) {
                setSelectedCategory(null);
                setNewCategory(true);
                setNewCategoryName(categoryName);
            }

            const existingTopic = topics.find(
                topic =>
                    topic.title.toLowerCase() === topicTitle.toLowerCase() &&
                    (!categoryName || topic.category_name === categoryName)
            );

            if (existingTopic) {
                setSelectedTopic(existingTopic);
                setSelectedCategory(
                    categories.find(
                        category => category.id === existingTopic.category_id
                    ) || existingCategory || null
                );
                setNewTopic(false);
            } else if (topicTitle) {
                setSelectedTopic(null);
                setNewTopic(true);
                setNewTopicTitle(topicTitle);
                setNewTopicDescription(data.topic_description || '');
            }

            Alert.alert(
                'JSON Loaded',
                'The lesson has been loaded into the editor. Review it and select Import Lesson when ready.'
            );
        } catch (error) {
            Alert.alert(
                'JSON Import Failed',
                error.message || 'Could not load the JSON file.'
            );
        } finally {
            setLoading(false);
        }
    };

    const validateLesson = () => {
        if (!targetLanguage) {
            return 'Please select a target language.';
        }

        if (!explanationLanguage) {
            return 'Please select an explanation language.';
        }

        if (!selectedCategory && !newCategoryName.trim()) {
            return 'Please select or create a category.';
        }

        if (!selectedTopic && !newTopicTitle.trim()) {
            return 'Please select or enter a grammar topic.';
        }

        if (!lessonTitle.trim()) {
            return 'Please enter a lesson title.';
        }


        for (let i = 0; i < exercises.length; i++) {
            const exercise = exercises[i];
            const missingFields = [];

            if (!exercise.exercise_type) {
                missingFields.push('Exercise Type');
            }

            if (!exercise.instruction?.trim()) {
                missingFields.push('Instruction');
            }

            if (!exercise.question?.trim()) {
                missingFields.push('Question');
            }

            if (!exercise.correct_answer?.trim()) {
                missingFields.push('Correct Answer');
            }

            if (!exercise.explanation?.trim()) {
                missingFields.push('Explanation');
            }

            if (missingFields.length > 0) {
                return `Exercise ${i + 1} is missing: ${missingFields.join(', ')}.`;
            }
        }


        return null;
    };


    const importLesson = async () => {
        setShowValidation(true);
        const validationError = validateLesson();

        if (validationError) {
            console.error('Lesson validation failed:', validationError);
            window.alert(`Incomplete Lesson: ${validationError}`);
            return;
        }

        const categoryName = newCategory
            ? newCategoryName.trim()
            : selectedCategory?.name;

        const topicTitle = newTopic
            ? newTopicTitle.trim()
            : selectedTopic?.title;

        const lessonData = {
            target_language: targetLanguage,
            explanation_language: explanationLanguage,
            category: categoryName,
            topic: topicTitle,
            topic_description: newTopic
                ? newTopicDescription
                : selectedTopic?.description || lessonDescription,
            title: lessonTitle.trim(),
            reading_level: readingLevel || undefined,
            learning_objectives: learningObjectives,
            sections,
            examples,
            exercises: exercises.map(exercise => ({
                ...exercise,
                options: (exercise.options || [])
                    .map(option => option.trim())
                    .filter(Boolean),
            })),
        };

        console.log('Importing grammar lesson:', lessonData);

        try {
            setLoading(true);

            const data = await apiRequest('grammar/import/', {
                method: 'POST',
                body: JSON.stringify(lessonData),
            });

            console.log('Grammar import successful:', data);

            window.alert(
                `"${data.title}" was imported successfully.`
            );

            navigation.navigate('GrammarLessons');
        } catch (error) {
            console.error('Grammar lesson import failed:', error);

            window.alert(
                `Import Failed: ${error.message || 'Unknown error'}`
            );
        } finally {
            setLoading(false);
        }
    };



    const renderInput = (
        label,
        value,
        onChangeText,
        placeholder,
        multiline = false,
        hasError = false
    ) => (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
                style={[
                    styles.input,
                    multiline && styles.multilineInput,
                    hasError && styles.inputError,
                ]}
                value={value == null ? '' : String(value)}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={COLORS.muted}
                multiline={multiline}
                textAlignVertical={multiline ? 'top' : 'center'}
                autoCapitalize="sentences"
            />
            {hasError && (
                <Text style={styles.errorText}>This field is required.</Text>
            )}
        </View>
    );



    const renderDropdown = (
        label,
        value,
        options,
        onSelect,
        placeholder,
        hasError = false
    ) => (
        <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TouchableOpacity
                style={[
                    styles.dropdown,
                    hasError && styles.inputError,
                ]}
                onPress={() => showPicker(label, options, onSelect)}
            >
                <Text
                    style={[
                        styles.dropdownText,
                        !value && styles.placeholderText,
                    ]}
                >
                    {value || placeholder}
                </Text>
                <AntDesign name="down" size={16} color={COLORS.accent} />
            </TouchableOpacity>
            {hasError && (
                <Text style={styles.errorText}>Please select an option.</Text>
            )}
        </View>
    );


    const languageOptions = languages.map(language => ({
        label: language.lang_name,
        value: language.lang_name,
    }));

    const categoryOptions = [
        ...categories.map(category => ({
            label: category.name,
            value: category.id,
            item: category,
        })),
        { label: '+ Create new category', value: '__new_category__' },
    ];

    const topicOptions = [
        ...topics
            .filter(topic => {
                return !selectedCategory ||
                    topic.category_id === selectedCategory.id;
            })
            .map(topic => ({
                label: topic.title,
                value: topic.id,
                item: topic,
            })),
        { label: '+ Create new topic', value: '__new_topic__' },
    ];

    const exerciseTypeOptions = exerciseTypes.map(type => ({
        label: type.name,
        value: type.code,
    }));

    const readingLevelOptions = (
        readingLevels.length > 0
            ? readingLevels
            : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']
    ).map(level => ({
        label: level,
        value: level,
    }));

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

                <Text style={styles.headerText}>Import Grammar Lesson</Text>
            </View>

            <TouchableOpacity
                style={styles.importJsonButton}
                onPress={importJsonFile}
            >
                <AntDesign name="upload" size={18} color="white" />
                <Text style={styles.buttonText}>Import JSON into Editor</Text>
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Lesson Details</Text>

                    {renderDropdown(
                        'Target Language',
                        targetLanguage,
                        languageOptions,
                        setTargetLanguage,
                        'Select target language'
                    )}

                    {renderDropdown(
                        'Explanation Language',
                        explanationLanguage,
                        languageOptions,
                        setExplanationLanguage,
                        'Select explanation language'
                    )}

                    {renderDropdown(
                        'Grammar Category',
                        newCategory
                            ? `New: ${newCategoryName || '(enter name below)'}`
                            : selectedCategory?.name,
                        categoryOptions,
                        (value) => {
                            if (value === '__new_category__') {
                                startNewCategory();
                            } else {
                                const option = categoryOptions.find(
                                    item => item.value === value
                                );
                                if (option?.item) chooseCategory(option.item);
                            }
                        },
                        'Select category'
                    )}

                    {newCategory && (
                        <>
                            {renderInput(
                                'New Category Name',
                                newCategoryName,
                                setNewCategoryName,
                                'Enter category name'
                            )}
                            {renderInput(
                                'Category Description',
                                newCategoryDescription,
                                setNewCategoryDescription,
                                'Enter category description',
                                true
                            )}
                            <TouchableOpacity
                                style={styles.smallButton}
                                onPress={() => {
                                    if (!newCategoryName.trim()) {
                                        Alert.alert(
                                            'Category Required',
                                            'Enter a category name.'
                                        );
                                        return;
                                    }

                                    setSelectedCategory({
                                        name: newCategoryName.trim(),
                                        description: newCategoryDescription,
                                    });
                                    setNewCategory(false);
                                }}
                            >
                                <Text style={styles.buttonText}>
                                    Use New Category
                                </Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {renderDropdown(
                        'Grammar Topic',
                        newTopic
                            ? `New: ${newTopicTitle || '(enter title below)'}`
                            : selectedTopic?.title,
                        topicOptions,
                        (value) => {
                            if (value === '__new_topic__') {
                                startNewTopic();
                            } else {
                                const option = topicOptions.find(
                                    item => item.value === value
                                );
                                if (option?.item) chooseTopic(option.item);
                            }
                        },
                        'Select topic'
                    )}

                    {newTopic && (
                        <>
                            {renderInput(
                                'New Topic Title',
                                newTopicTitle,
                                setNewTopicTitle,
                                'Enter grammar topic'
                            )}
                            {renderInput(
                                'Topic Description',
                                newTopicDescription,
                                setNewTopicDescription,
                                'Describe the grammar topic',
                                true
                            )}
                            <TouchableOpacity
                                style={styles.smallButton}
                                onPress={() => {
                                    if (!newTopicTitle.trim()) {
                                        Alert.alert(
                                            'Topic Required',
                                            'Enter a topic title.'
                                        );
                                        return;
                                    }

                                    if (!selectedCategory && !newCategoryName.trim()) {
                                        Alert.alert(
                                            'Category Required',
                                            'Select or create a category first.'
                                        );
                                        return;
                                    }

                                    setSelectedTopic({
                                        title: newTopicTitle.trim(),
                                        description: newTopicDescription,
                                        category_id: selectedCategory?.id,
                                        target_language: targetLanguage,
                                    });

                                    setNewTopic(false);
                                }}
                            >
                                <Text style={styles.buttonText}>Use New Topic</Text>
                            </TouchableOpacity>
                        </>
                    )}

                    {renderInput(
                        'Lesson Title',
                        lessonTitle,
                        setLessonTitle,
                        'Enter lesson title'
                    )}

                    {renderInput(
                        'Lesson Description',
                        lessonDescription,
                        setLessonDescription,
                        'Describe what the lesson teaches',
                        true
                    )}

                    {renderDropdown(
                        'Reading Level',
                        readingLevel,
                        readingLevelOptions,
                        setReadingLevel,
                        'Select reading level'
                    )}

                    <Text style={styles.label}>Learning Objectives</Text>

                    {learningObjectives.map((objective, index) => (
                        <View key={`objective-${index}`} style={styles.objectiveRow}>
                            <Text style={styles.objectiveText}>
                                {objective.text || ''}
                            </Text>
                            <TouchableOpacity
                                onPress={() =>
                                    removeItem(setLearningObjectives, index)
                                }
                            >
                                <AntDesign
                                    name="close-circle"
                                    size={20}
                                    color={COLORS.danger}
                                />
                            </TouchableOpacity>
                        </View>
                    ))}

                    {renderInput(
                        'New Objective',
                        newObjective,
                        setNewObjective,
                        'Enter a learning objective'
                    )}

                    <TouchableOpacity
                        style={styles.smallButton}
                        onPress={addObjective}
                    >
                        <AntDesign name="plus" size={16} color="white" />
                        <Text style={styles.buttonText}>Add Objective</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.sectionHeading}>Lesson Content</Text>

                {sections.map((section, index) => (
                    <View key={`section-${index}`} style={styles.card}>
                        <View style={styles.itemHeader}>
                            <Text style={styles.cardTitle}>
                                Explanation {index + 1}
                            </Text>
                            <TouchableOpacity
                                onPress={() => removeItem(setSections, index)}
                            >
                                <AntDesign
                                    name="delete"
                                    size={20}
                                    color={COLORS.danger}
                                />
                            </TouchableOpacity>
                        </View>

                        {renderInput(
                            'Section Heading',
                            section.heading,
                            value => updateSection(index, 'heading', value),
                            'Enter heading'
                        )}

                        {renderInput(
                            'Explanation Text',
                            (section.content || [])
                                .map(item => item.text || '')
                                .join('\n'),
                            value => updateSectionContent(index, value),
                            'Write the grammar explanation',
                            true
                        )}
                    </View>
                ))}

                {examples.map((example, index) => {
                    const sentenceText = (example.sentence || [])
                        .map(item => typeof item === 'string' ? item : item.text || '')
                        .join('');

                    const explanationText = (example.explanation || [])
                        .map(item => typeof item === 'string' ? item : item.text || '')
                        .join('\n');

                    return (
                        <View key={`example-${index}`} style={styles.card}>
                            <View style={styles.itemHeader}>
                                <Text style={styles.cardTitle}>
                                    Example {index + 1}
                                </Text>
                                <TouchableOpacity
                                    onPress={() => removeItem(setExamples, index)}
                                >
                                    <AntDesign
                                        name="delete"
                                        size={20}
                                        color={COLORS.danger}
                                    />
                                </TouchableOpacity>
                            </View>

                            {renderInput(
                                'Target Language Sentence',
                                sentenceText,
                                value => updateExampleSentence(index, value),
                                'Enter sentence'
                            )}

                            {renderInput(
                                'Translation',
                                example.translation,
                                value => updateExample(index, 'translation', value),
                                'Enter translation'
                            )}

                            {renderInput(
                                'Grammar Focus',
                                example.grammar_focus,
                                value => updateExample(index, 'grammar_focus', value),
                                'What does this example teach?'
                            )}

                            {renderInput(
                                'Explanation',
                                explanationText,
                                value => updateExample(index, 'explanation', [
                                    { type: 'text', text: value },
                                ]),
                                'Explain the example',
                                true
                            )}
                        </View>
                    );
                })}

                {exercises.map((exercise, index) => (
                    <View key={`exercise-${index}`} style={styles.card}>
                        <View style={styles.itemHeader}>
                            <Text style={styles.cardTitle}>
                                Exercise {index + 1}
                            </Text>
                            <TouchableOpacity
                                onPress={() => removeItem(setExercises, index)}
                            >
                                <AntDesign
                                    name="delete"
                                    size={20}
                                    color={COLORS.danger}
                                />
                            </TouchableOpacity>
                        </View>

                        {renderDropdown(
                            'Exercise Type',
                            exerciseTypes.find(
                                type => type.code === exercise.exercise_type
                            )?.name || exercise.exercise_type,
                            exerciseTypeOptions,
                            value => updateExercise(
                                index,
                                'exercise_type',
                                value
                            ),
                            'Select exercise type',
                            showValidation && !exercise.exercise_type
                        )}

                        {renderInput(
                            'Instruction',
                            exercise.instruction,
                            value => updateExercise(index, 'instruction', value),
                            'Tell the learner what to do',
                            false,
                            showValidation && !exercise.instruction?.trim()
                        )}

                        {renderInput(
                            'Question',
                            exercise.question,
                            value => updateExercise(index, 'question', value),
                            'Enter the question',
                            true,
                            showValidation && !exercise.question?.trim()
                        )}

                        {exercise.exercise_type === 'multiple_choice' && (
                            <>
                                <Text style={styles.label}>Answer Options</Text>

                                {(exercise.options || []).map((option, optionIndex) => (
                                    <View
                                        key={`option-${index}-${optionIndex}`}
                                        style={styles.optionRow}
                                    >
                                        <TextInput
                                            style={[styles.input, styles.optionInput]}
                                            value={option}
                                            onChangeText={value =>
                                                updateExerciseOption(
                                                    index,
                                                    optionIndex,
                                                    value
                                                )
                                            }
                                            placeholder={`Option ${optionIndex + 1}`}
                                            placeholderTextColor={COLORS.muted}
                                        />
                                        <TouchableOpacity
                                            onPress={() =>
                                                updateExercise(
                                                    index,
                                                    'options',
                                                    exercise.options.filter(
                                                        (_, i) => i !== optionIndex
                                                    )
                                                )
                                            }
                                        >
                                            <AntDesign
                                                name="close-circle"
                                                size={20}
                                                color={COLORS.danger}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                ))}

                                <TouchableOpacity
                                    style={styles.smallButton}
                                    onPress={() => addExerciseOption(index)}
                                >
                                    <AntDesign name="plus" size={16} color="white" />
                                    <Text style={styles.buttonText}>Add Option</Text>
                                </TouchableOpacity>
                            </>
                        )}

                        {renderInput(
                            'Correct Answer',
                            exercise.correct_answer,
                            value => updateExercise(index, 'correct_answer', value),
                            'Enter the correct answer',
                            false,
                            showValidation && !exercise.correct_answer?.trim()
                        )}

                        {renderInput(
                            'Accepted Answers (comma separated)',
                            (exercise.accepted_answers || []).join(', '),
                            value => updateExercise(
                                index,
                                'accepted_answers',
                                value.split(',').map(item => item.trim()).filter(Boolean)
                            ),
                            'Alternative acceptable answers'
                        )}

                        {renderInput(
                            'Explanation',
                            exercise.explanation,
                            value => updateExercise(index, 'explanation', value),
                            'Explain the answer',
                            true,
                            showValidation && !exercise.explanation?.trim()
                        )}

                        {renderInput(
                            'Translation',
                            exercise.translation,
                            value => updateExercise(index, 'translation', value),
                            'Optional translation'
                        )}

                        {exercise.exercise_type === 'fill_in_the_blank' && (
                            <>
                                {renderInput(
                                    'Missing Word',
                                    exercise.missing_word,
                                    value => updateExercise(index, 'missing_word', value),
                                    'Enter missing word'
                                )}
                                {renderInput(
                                    'Complete Answer',
                                    exercise.complete_answer,
                                    value => updateExercise(index, 'complete_answer', value),
                                    'Enter complete sentence'
                                )}
                            </>
                        )}

                        {exercise.exercise_type === 'sentence_correction' && (
                            <>
                                {renderInput(
                                    'Incorrect Sentence',
                                    exercise.incorrect_sentence,
                                    value => updateExercise(index, 'incorrect_sentence', value),
                                    'Enter incorrect sentence',
                                    true
                                )}
                                {renderInput(
                                    'Corrected Sentence',
                                    exercise.corrected_sentence,
                                    value => updateExercise(index, 'corrected_sentence', value),
                                    'Enter corrected sentence',
                                    true
                                )}
                            </>
                        )}

                        <TouchableOpacity
                            style={styles.toggleRow}
                            onPress={() => updateExercise(
                                index,
                                'correctable',
                                !exercise.correctable
                            )}
                        >
                            <AntDesign
                                name={exercise.correctable ? 'check-square' : 'border'}
                                size={20}
                                color={COLORS.accent}
                            />
                            <Text style={styles.toggleText}>
                                Allow learner to retry after an incorrect answer
                            </Text>
                        </TouchableOpacity>
                    </View>
                ))}

                <TouchableOpacity
                    style={styles.addSectionButton}
                    onPress={addSection}
                >
                    <AntDesign name="plus-circle" size={20} color={COLORS.accent} />
                    <Text style={styles.addSectionText}>Add Section</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.submitButton}
                    onPress={importLesson}
                >
                    <AntDesign name="cloud-upload" size={20} color="white" />
                    <Text style={styles.buttonText}>Import Lesson</Text>
                </TouchableOpacity>
            </ScrollView>

            <Modal
                visible={pickerVisible}
                transparent
                animationType="fade"
                onRequestClose={() => setPickerVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <Text style={styles.modalTitle}>{pickerTitle}</Text>

                        <ScrollView style={{ maxHeight: 360 }}>
                            {pickerOptions.map((option, index) => (
                                <TouchableOpacity
                                    key={`${option.value}-${index}`}
                                    style={styles.modalOption}
                                    onPress={() => {
                                        setPickerVisible(false);
                                        if (pickerCallback) {
                                            pickerCallback(option.value);
                                        }
                                    }}
                                >
                                    <Text style={styles.modalOptionText}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>

                        <TouchableOpacity
                            style={styles.modalCancel}
                            onPress={() => setPickerVisible(false)}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <LoadingOverlay visible={loading} />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
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
        color: COLORS.text,
        fontSize: 21,
        fontWeight: 'bold',
    },
    content: {
        paddingBottom: 32,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 10,
        padding: 14,
        marginBottom: 14,
    },
    cardTitle: {
        color: COLORS.text,
        fontSize: 17,
        fontWeight: 'bold',
        flex: 1,
    },
    sectionHeading: {
        color: COLORS.accent,
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 12,
        marginTop: 8,
    },
    field: {
        marginBottom: 12,
    },
    label: {
        color: '#eeeeee',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 6,
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#555b63',
        color: COLORS.text,
        paddingHorizontal: 12,
        paddingVertical: 11,
        fontSize: 15,
        minHeight: 44,
    },
    multilineInput: {
        minHeight: 90,
    },
    dropdown: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.background,
        borderRadius: 7,
        borderWidth: 1,
        borderColor: '#555b63',
        paddingHorizontal: 12,
        paddingVertical: 13,
        minHeight: 46,
    },
    dropdownText: {
        color: COLORS.text,
        fontSize: 15,
        flex: 1,
    },
    placeholderText: {
        color: COLORS.muted,
    },
    importJsonButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.accent,
        padding: 13,
        borderRadius: 8,
        marginBottom: 14,
    },
    submitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.accent,
        padding: 15,
        borderRadius: 8,
        marginTop: 18,
    },
    buttonText: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: 'bold',
    },
    smallButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 7,
        backgroundColor: '#50565f',
        padding: 10,
        borderRadius: 7,
        marginBottom: 12,
    },
    addSectionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        padding: 14,
        borderWidth: 1,
        borderColor: COLORS.accent,
        borderRadius: 8,
        marginTop: 2,
    },
    addSectionText: {
        color: COLORS.accent,
        fontSize: 16,
        fontWeight: 'bold',
    },
    itemHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 14,
        gap: 12,
    },
    objectiveRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 7,
        padding: 10,
        marginBottom: 7,
        gap: 8,
    },
    objectiveText: {
        color: COLORS.text,
        flex: 1,
        fontSize: 14,
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginBottom: 8,
    },
    optionInput: {
        flex: 1,
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginTop: 5,
        paddingVertical: 8,
    },
    toggleText: {
        color: COLORS.text,
        fontSize: 14,
        flex: 1,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.65)',
        justifyContent: 'center',
        padding: 24,
    },
    modalCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 16,
    },
    modalTitle: {
        color: COLORS.text,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    modalOption: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#555b63',
    },
    modalOptionText: {
        color: COLORS.text,
        fontSize: 15,
    },
    modalCancel: {
        alignItems: 'center',
        backgroundColor: '#50565f',
        borderRadius: 7,
        padding: 12,
        marginTop: 14,
    },
    inputError: {
        borderColor: COLORS.danger,
        borderWidth: 2,
    },
    errorText: {
        color: COLORS.danger,
        fontSize: 12,
        marginTop: 4,
    },
});
