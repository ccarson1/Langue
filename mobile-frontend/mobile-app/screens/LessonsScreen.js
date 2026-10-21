import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    useWindowDimensions,
    Platform,
    ActivityIndicator
} from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { getServerIP } from '../utils/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles } from './styles/LessonsStyles';
import * as FileSystem from 'expo-file-system/legacy';
import {
    saveOfflineLesson,
    getDownloadedLessonIds,
    getOfflineLesson
} from '../utils/offlineLessons';

import {
    initLocalDatabase,
    getLocalDatabase,
} from '../utils/localDatabase';

export default function LessonsScreen({ navigation }) {
    const [languages, setLanguages] = useState([]);
    const [token, setToken] = useState(null);
    const [nativeLanguage, setNativeLanguage] = useState('');
    const [targetLanguage, setTargetLanguage] = useState('');
    const [lessons, setLessons] = useState([]);
    const [serverIP, setServerIP] = useState('');
    const mediaUrl = `http://${serverIP}/media/`;
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const styles = createStyles(insets, width);
    const [user, setUser] = useState(null);

    // Search / sort / filter state
    const [searchText, setSearchText] = useState('');
    const [sortMenuVisible, setSortMenuVisible] = useState(false);
    const [filterMenuVisible, setFilterMenuVisible] = useState(false);
    const [selectedReadingLevels, setSelectedReadingLevels] = useState([]);
    const [includeNoReadingLevel, setIncludeNoReadingLevel] = useState(false);
    const [downloadedLessons, setDownloadedLessons] = useState([]);
    const [downloadingLesson, setDownloadingLesson] = useState(null);
    const [offlineMode, setOfflineMode] = useState(false);

    const [sortOrder, setSortOrder] = useState('newest');

    const [filters, setFilters] = useState({
        audio: false,
        video: false,
        url: false,
        file: false,
    });


    const fetchLessons = async () => {
        try {
            const storedOfflineMode = await AsyncStorage.getItem('offlineMode');
            const isOffline = storedOfflineMode === 'true';

            setOfflineMode(isOffline);


            if (isOffline) {
                await initLocalDatabase();

                const db = await getLocalDatabase();

                const lessonIds = await getDownloadedLessonIds();

                const offlineLessons = (
                    await Promise.all(
                        lessonIds.map(id => getOfflineLesson(id))
                    )
                ).filter(Boolean);



                const progressRows = await db.getAllAsync(
                    `SELECT lesson_id, current_lesson_index, is_completed,
            num_of_times_read, total_time_read
     FROM user_lessons_progress
     WHERE user_id IN (0, 1)`
                );

                const progressByLesson = new Map(
                    progressRows.map(progress => [
                        Number(progress.lesson_id),
                        progress,
                    ])
                );

                const lessonsWithProgress = await Promise.all(
                    offlineLessons.map(async lesson => {
                        const progress = progressByLesson.get(Number(lesson.id));

                        const sentenceCount = await db.getFirstAsync(
                            `SELECT COUNT(*) AS sentence_count
                 FROM sentences
                 WHERE lesson_id = ?`,
                            Number(lesson.id)
                        );

                        return {
                            ...lesson,
                            current_lesson_index: progress
                                ? progress.current_lesson_index
                                : Number(lesson.current_lesson_index) || 0,
                            is_completed: progress
                                ? Boolean(progress.is_completed)
                                : Boolean(lesson.is_completed),
                            num_of_times_read: progress
                                ? progress.num_of_times_read
                                : Number(lesson.num_of_times_read) || 0,
                            total_time_read: progress
                                ? progress.total_time_read
                                : Number(lesson.total_time_read) || 0,
                            sentence_count: sentenceCount?.sentence_count
                                ?? lesson.sentence_count
                                ?? lesson.sentences?.length
                                ?? 0,
                        };
                    })
                );

                setLessons(lessonsWithProgress);

                console.log('Offline lessons loaded:', lessonsWithProgress.length);
                console.log(
                    'Offline lesson progress:',
                    lessonsWithProgress.map(lesson => ({
                        id: lesson.id,
                        title: lesson.title,
                        current_lesson_index: lesson.current_lesson_index,
                        is_completed: lesson.is_completed,
                        sentence_count: lesson.sentence_count,
                    }))
                );

                return;
            }


            if (!serverIP) return;

            const token = await AsyncStorage.getItem('accessToken');

            const res = await fetch(`http://${serverIP}:8000/api/lessons/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to load lessons: ${res.status}`);
            }

            const data = await res.json();

            console.log('LESSON DOWNLOAD DATA:', JSON.stringify(data[0], null, 2));
            console.log('Lessons count:', data.length);

            setLessons(data);

        } catch (err) {
            console.error('Failed to fetch Lessons:', err);
            Alert.alert('Error', 'Failed to load Lesson options.');
        }
    };


    const fetchLanguages = async () => {
        try {
            const res = await fetch(`http://${serverIP}:8000/api/languages/`);
            const data = await res.json();

            setLanguages(data);

        } catch (err) {
            console.error('Failed to fetch languages:', err);
            Alert.alert('Error', 'Failed to load language options.');
        }
    };


    useEffect(() => {
        const loadIP = async () => {
            const ip = await getServerIP();
            setServerIP(ip);
        };

        loadIP();
    }, []);


    useEffect(() => {
        if (!serverIP) return;

        const loadTokenAndSettings = async () => {
            try {
                const storedToken = await AsyncStorage.getItem('accessToken');

                if (!storedToken) {
                    Alert.alert('Error', 'No access token found. Please log in.');
                    return;
                }

                setToken(storedToken);

                const decoded = jwtDecode(storedToken);
                console.log('Decoded token:', decoded);

                const response = await fetch(`http://${serverIP}:8000/api/settings/`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${storedToken}`,
                    },
                });

                const settings = await response.json();

                setNativeLanguage(settings.native_language);
                setTargetLanguage(settings.target_language);

            } catch (err) {
                Alert.alert('Error', 'Failed to load settings: ' + err.message);
            }
        };

        const loadScreenData = async () => {
            const offline = await AsyncStorage.getItem('offlineMode');

            await fetchLessons();

            if (offline !== 'true') {
                fetchLanguages();
                loadTokenAndSettings();
            }
        };

        loadScreenData();

    }, [serverIP]);

    useFocusEffect(
        useCallback(() => {
            fetchLessons();
        }, [serverIP])
    );


    const decodeToken = (token) => {
        try {
            return jwtDecode(token);
        } catch (err) {
            console.error('Token decode failed:', err);
            return null;
        }
    };


    // --- Initialization ---
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


    const downloadLesson = async (lesson) => {
        try {
            setDownloadingLesson(lesson.id);

            const storedToken = await AsyncStorage.getItem('accessToken');

            if (!storedToken) {
                throw new Error('Please log in before downloading lessons.');
            }

            // Retrieve the lesson and its sentences.
            const response = await fetch(
                `http://${serverIP}:8000/api/lesson/${lesson.id}/`,
                {
                    headers: {
                        Authorization: `Bearer ${storedToken}`,
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Could not retrieve lesson details.');
            }

            const detail = await response.json();

            // Keep files in persistent app storage, not temporary cache.
            const folder = `${FileSystem.documentDirectory}offline-lessons/${lesson.id}/`;

            await FileSystem.makeDirectoryAsync(folder, {
                intermediates: true,
            });

            const downloadFile = async (url, filename) => {
                if (!url) return null;

                const fullUrl = url.startsWith('http')
                    ? url
                    : `http://${serverIP}:8000${url}`;

                const path = `${folder}${filename}`;

                const result = await FileSystem.downloadAsync(fullUrl, path);

                if (result.status < 200 || result.status >= 300) {
                    throw new Error(`Failed to download ${filename}.`);
                }

                return result.uri;
            };

            const audioPath = await downloadFile(
                lesson.media_file || detail.audio_file,
                'audio.mp3'
            );

            const imagePath = await downloadFile(
                lesson.image,
                'image'
            );

            const docPath = await downloadFile(
                lesson.doc_file || detail.doc_file,
                'document'
            );

            // Preserve the lesson fields and add local file locations.
            await saveOfflineLesson({
                ...lesson,
                ...detail,
                id: lesson.id,
                audio_path: audioPath,
                image_path: imagePath,
                doc_path: docPath,
            });

            const ids = await getDownloadedLessonIds();
            setDownloadedLessons(ids);

            Alert.alert('Download complete', `${lesson.title} is saved offline.`);
        } catch (error) {
            console.error('Lesson download failed:', error);
            Alert.alert('Download failed', error.message);
        } finally {
            setDownloadingLesson(null);
        }
    };



    // ---------------------------------------------------------
    // FILTER / SORT LESSONS
    // ---------------------------------------------------------

    const displayedLessons = useMemo(() => {

        let result = [...lessons];

        // -------------------------
        // SEARCH
        // -------------------------

        if (searchText.trim()) {
            const search = searchText.trim().toLowerCase();

            result = result.filter((lesson) =>
                (lesson.title || '').toLowerCase().includes(search)
            );
        }


        // -------------------------
        // FILTERS
        // -------------------------

        if (filters.audio) {
            result = result.filter((lesson) =>
                lesson.audioUploaded === true
            );
        }

        if (filters.video) {
            result = result.filter((lesson) =>
                lesson.videoFormat === true
            );
        }

        if (filters.url) {
            result = result.filter((lesson) =>
                lesson.urlReference === true
            );
        }

        if (filters.file) {
            result = result.filter((lesson) =>
                lesson.fileUploaded === true
            );
        }

        if (selectedReadingLevels.length > 0 || includeNoReadingLevel) {
            result = result.filter((lesson) => {
                if (!lesson.reading_level) {
                    return includeNoReadingLevel;
                }

                return selectedReadingLevels.includes(lesson.reading_level.name);
            });
        }



        // -------------------------
        // SORT
        // -------------------------

        result.sort((a, b) => {
            if (sortOrder === 'reading_level_asc' ||
                sortOrder === 'reading_level_desc') {

                const levelA = Number(a.reading_level?.value);
                const levelB = Number(b.reading_level?.value);

                const missingA = a.reading_level?.value == null;
                const missingB = b.reading_level?.value == null;

                // Put lessons without a reading level at the end.
                if (missingA && missingB) return 0;
                if (missingA) return 1;
                if (missingB) return -1;

                return sortOrder === 'reading_level_asc'
                    ? levelA - levelB
                    : levelB - levelA;
            }

            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();

            if (sortOrder === 'newest') {
                return dateB - dateA;
            }

            return dateA - dateB;
        });


        return result;

    }, [lessons, searchText, filters, sortOrder, selectedReadingLevels, includeNoReadingLevel]);


    // ---------------------------------------------------------
    // FILTER HANDLERS
    // ---------------------------------------------------------

    const toggleFilter = (filterName) => {

        setFilters((current) => ({
            ...current,
            [filterName]: !current[filterName],
        }));
    };


    const clearFilters = () => {

        setFilters({
            audio: false,
            video: false,
            url: false,
            file: false,
        });

        setSelectedReadingLevels([]);
        setIncludeNoReadingLevel(false);
    };

    useEffect(() => {
        if (Platform.OS === 'web') return;

        getDownloadedLessonIds()
            .then(setDownloadedLessons)
            .catch(error =>
                console.error('Failed to load downloaded lessons:', error)
            );
    }, []);


    const hasActiveFilters =
        filters.audio ||
        filters.video ||
        filters.url ||
        filters.file ||
        selectedReadingLevels.length > 0 || includeNoReadingLevel;


    // ---------------------------------------------------------
    // RENDER
    // ---------------------------------------------------------

    return (
        <View style={styles.container}>

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


            {/* =====================================================
                SEARCH / SORT / FILTER BAR
            ===================================================== */}

            <View style={styles.toolbar}>

                {/* Search */}
                <View style={styles.searchContainer}>

                    <AntDesign
                        name="search"
                        size={20}
                        color="#777"
                    />

                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search lessons..."
                        placeholderTextColor="#888"
                        value={searchText}
                        onChangeText={setSearchText}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />

                    {searchText.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchText('')}
                        >
                            <AntDesign
                                name="closecircle"
                                size={18}
                                color="#888"
                            />
                        </TouchableOpacity>
                    )}

                </View>


                {/* Sort button */}
                <TouchableOpacity
                    style={styles.toolbarButton}
                    onPress={() => {
                        setSortMenuVisible(!sortMenuVisible);
                        setFilterMenuVisible(false);
                    }}
                >
                    <AntDesign
                        name="swap"
                        size={23}
                        color="white"
                    />
                </TouchableOpacity>


                {/* Filter button */}
                <TouchableOpacity
                    style={[
                        styles.toolbarButton,
                        hasActiveFilters && styles.activeButton
                    ]}
                    onPress={() => {
                        setFilterMenuVisible(!filterMenuVisible);
                        setSortMenuVisible(false);
                    }}
                >
                    <AntDesign
                        name="filter"
                        size={21}
                        color="white"
                    />

                    {hasActiveFilters && (
                        <View style={styles.filterBadge}>
                            <Text style={styles.filterBadgeText}>
                                {
                                    Object.values(filters).filter(Boolean).length + (selectedReadingLevels.length > 0 || includeNoReadingLevel ? 1 : 0)
                                }
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>

            </View>


            {/* =====================================================
                SORT DROPDOWN
            ===================================================== */}

            {sortMenuVisible && (
                <View style={styles.dropdown}>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setSortOrder('newest');
                            setSortMenuVisible(false);
                        }}
                    >
                        <AntDesign
                            name={
                                sortOrder === 'newest'
                                    ? 'check'
                                    : 'down'
                            }
                            size={18}
                            color="white"
                        />

                        <Text style={styles.menuText}>
                            Newest
                        </Text>
                    </TouchableOpacity>


                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setSortOrder('oldest');
                            setSortMenuVisible(false);
                        }}
                    >
                        <AntDesign
                            name={
                                sortOrder === 'oldest'
                                    ? 'check'
                                    : 'up'
                            }
                            size={18}
                            color="white"
                        />

                        <Text style={styles.menuText}>
                            Oldest
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setSortOrder('reading_level_asc');
                            setSortMenuVisible(false);
                        }}
                    >
                        <AntDesign
                            name={sortOrder === 'reading_level_asc' ? 'check' : 'down'}
                            size={18}
                            color="white"
                        />
                        <Text style={styles.menuText}>
                            Reading Level (Lowest First)
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            setSortOrder('reading_level_desc');
                            setSortMenuVisible(false);
                        }}
                    >
                        <AntDesign
                            name={sortOrder === 'reading_level_desc' ? 'check' : 'up'}
                            size={18}
                            color="white"
                        />
                        <Text style={styles.menuText}>
                            Reading Level (Highest First)
                        </Text>
                    </TouchableOpacity>

                </View>
            )}


            {/* =====================================================
                FILTER DROPDOWN
            ===================================================== */}

            {filterMenuVisible && (
                <View style={styles.filterDropdown}>

                    {/* No Filter */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => {
                            clearFilters();
                            setFilterMenuVisible(false);
                        }}
                    >

                        <View style={styles.checkbox}>
                            {!hasActiveFilters && (
                                <AntDesign
                                    name="check"
                                    size={16}
                                    color="white"
                                />
                            )}
                        </View>

                        <Text style={styles.menuText}>
                            No Filter
                        </Text>

                    </TouchableOpacity>


                    {/* Has Audio */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => toggleFilter('audio')}
                    >

                        <View style={styles.checkbox}>
                            {filters.audio && (
                                <AntDesign
                                    name="check"
                                    size={16}
                                    color="white"
                                />
                            )}
                        </View>

                        <Text style={styles.menuText}>
                            Has Audio
                        </Text>

                    </TouchableOpacity>


                    {/* Has Video */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => toggleFilter('video')}
                    >

                        <View style={styles.checkbox}>
                            {filters.video && (
                                <AntDesign
                                    name="check"
                                    size={16}
                                    color="white"
                                />
                            )}
                        </View>

                        <Text style={styles.menuText}>
                            Has Video
                        </Text>

                    </TouchableOpacity>


                    {/* URL Reference */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => toggleFilter('url')}
                    >

                        <View style={styles.checkbox}>
                            {filters.url && (
                                <AntDesign
                                    name="check"
                                    size={16}
                                    color="white"
                                />
                            )}
                        </View>

                        <Text style={styles.menuText}>
                            URL Ref
                        </Text>

                    </TouchableOpacity>


                    {/* File Reference */}
                    <TouchableOpacity
                        style={styles.menuItem}
                        onPress={() => toggleFilter('file')}
                    >

                        <View style={styles.checkbox}>
                            {filters.file && (
                                <AntDesign
                                    name="check"
                                    size={16}
                                    color="white"
                                />
                            )}
                        </View>

                        <Text style={styles.menuText}>
                            File Ref
                        </Text>

                    </TouchableOpacity>


                    {/* Reading Level */}
                    <View style={{ paddingVertical: 6 }}>
                        <Text style={[styles.menuText, { marginBottom: 8 }]}>
                            Reading Level
                        </Text>

                        <ScrollView
                            style={{ maxHeight: 160 }}
                            nestedScrollEnabled={true}
                            showsVerticalScrollIndicator={true}
                        >
                            {/* All Levels */}
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    setSelectedReadingLevels([]);
                                    setIncludeNoReadingLevel(false);
                                }}
                            >
                                <View style={styles.checkbox}>
                                    {selectedReadingLevels.length === 0 &&
                                        !includeNoReadingLevel && (
                                            <AntDesign name="check" size={16} color="white" />
                                        )}
                                </View>
                                <Text style={styles.menuText}>All Levels</Text>
                            </TouchableOpacity>

                            {/* Available Reading Levels */}
                            {[...new Map(
                                lessons
                                    .filter((lesson) => lesson.reading_level)
                                    .map((lesson) => [
                                        lesson.reading_level.name,
                                        lesson.reading_level,
                                    ])
                            ).values()]
                                .sort((a, b) => a.value - b.value)
                                .map((level) => (
                                    <TouchableOpacity
                                        key={level.id}
                                        style={styles.menuItem}
                                        onPress={() => {
                                            setSelectedReadingLevels((current) =>
                                                current.includes(level.name)
                                                    ? current.filter((name) => name !== level.name)
                                                    : [...current, level.name]
                                            );
                                        }}
                                    >
                                        <View style={styles.checkbox}>
                                            {selectedReadingLevels.includes(level.name) && (
                                                <AntDesign name="check" size={16} color="white" />
                                            )}
                                        </View>
                                        <Text style={styles.menuText}>{level.name}</Text>
                                    </TouchableOpacity>
                                ))}

                            {/* No Reading Level */}
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => setIncludeNoReadingLevel((current) => !current)}
                            >
                                <View style={styles.checkbox}>
                                    {includeNoReadingLevel && (
                                        <AntDesign name="check" size={16} color="white" />
                                    )}
                                </View>
                                <Text style={styles.menuText}>No Reading Level</Text>
                            </TouchableOpacity>
                        </ScrollView>
                    </View>

                    {/* Close */}
                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={() => setFilterMenuVisible(false)}
                    >
                        <Text style={styles.doneText}>
                            Done
                        </Text>
                    </TouchableOpacity>

                </View>
            )}


            {/* =====================================================
                LESSON COUNT
            ===================================================== */}

            <Text style={styles.lessonCount}>
                {displayedLessons.length} lesson
                {displayedLessons.length !== 1 ? 's' : ''}
            </Text>


            {/* =====================================================
                LESSON GRID
            ===================================================== */}

            <ScrollView contentContainerStyle={styles.gridWrapper}>

                {displayedLessons.map((lesson) => (

                    <View
                        key={lesson.id}
                        style={styles.card}
                    >
                        {Platform.OS !== 'web' && !offlineMode && (
                            <TouchableOpacity
                                onPress={() => downloadLesson(lesson)}
                                style={{
                                    backgroundColor: '#393e46',
                                    padding: 12,
                                    borderRadius: 8,
                                    marginTop: 10,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <AntDesign name="download" size={18} color="#00adb5" />
                                <Text style={{
                                    color: '#eeeeee',
                                    marginLeft: 8,
                                    fontWeight: '600',
                                }}>
                                    Download for Offline
                                </Text>
                            </TouchableOpacity>
                        )}

                        {user &&
                            Number(lesson.user) === Number(user.user_id) && (

                                <TouchableOpacity
                                    style={styles.editButton}
                                    onPress={() =>
                                        navigation.navigate("LessonEdit", {
                                            lessonId: lesson.id
                                        })
                                    }
                                >
                                    <AntDesign
                                        name="edit"
                                        size={20}
                                        color="white"
                                    />
                                </TouchableOpacity>

                            )}


                        <Text style={styles.title}>
                            {lesson.title}
                        </Text>

                        {/* Times Read */}
                        {Number(lesson.num_of_times_read) > 0 && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    alignSelf: 'flex-start',
                                    gap: 6,
                                    marginTop: 6,
                                    marginBottom: 4,
                                }}
                            >
                                <AntDesign
                                    name="check-circle"
                                    size={16}
                                    color="#00adb5"
                                />

                                <Text
                                    style={{
                                        color: '#00adb5',
                                        fontSize: 12,
                                        fontWeight: '600',
                                    }}
                                >
                                    Read {lesson.num_of_times_read}{' '}
                                    {Number(lesson.num_of_times_read) === 1
                                        ? 'time'
                                        : 'times'}
                                </Text>
                            </View>
                        )}


                        {lesson.reading_level && (
                            <View style={{
                                alignSelf: 'flex-start',
                                backgroundColor: '#E8F5E9',
                                borderRadius: 12,
                                paddingHorizontal: 10,
                                paddingVertical: 5,
                                marginTop: 6,
                                marginBottom: 8,
                                flexDirection: 'row',
                                alignItems: 'center',
                            }}>
                                <Text style={{
                                    color: '#388E3C',
                                    fontSize: 11,
                                    fontWeight: '600',
                                    marginRight: 5,
                                }}>
                                    READING LEVEL
                                </Text>

                                <Text style={{
                                    color: '#1B5E20',
                                    fontSize: 12,
                                    fontWeight: 'bold',
                                }}>
                                    {lesson.reading_level.name}
                                </Text>
                            </View>
                        )}


                        {lesson.image && (
                            <Image
                                source={{ uri: lesson.image }}
                                style={styles.image}
                                resizeMode="cover"
                            />
                        )}


                        <TouchableOpacity
                            style={styles.button}
                            onPress={async () => {
                                try {
                                    const offlineMode = await AsyncStorage.getItem('offlineMode');

                                    // Offline: open the downloaded lesson directly.
                                    if (offlineMode === 'true') {
                                        navigation.navigate('Home', {
                                            lessonId: Number(lesson.id),
                                        });
                                        return;
                                    }

                                    // Online: keep the existing server behavior.
                                    const storedToken = await AsyncStorage.getItem('accessToken');

                                    if (!storedToken) {
                                        Alert.alert('Error', 'No access token found.');
                                        return;
                                    }

                                    const res = await fetch(
                                        `http://${serverIP}:8000/api/change-lesson/`,
                                        {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                Authorization: `Bearer ${storedToken}`,
                                            },
                                            body: JSON.stringify({
                                                lesson_id: Number(lesson.id),
                                            }),
                                        }
                                    );

                                    if (!res.ok) {
                                        const errorData = await res.json();
                                        throw new Error(
                                            errorData.detail || 'Failed to update progress'
                                        );
                                    }

                                    navigation.navigate('Home');

                                } catch (error) {
                                    console.error('Progress update error:', error);
                                    Alert.alert('Error', error.message);
                                }
                            }}
                        >
                            <Text style={styles.buttonText}>
                                Read
                            </Text>
                        </TouchableOpacity>


                        {/* Lesson Progress */}
                        <View style={{ width: '100%', marginTop: 10 }}>
                            <Text style={{
                                color: 'white',
                                fontSize: 12,
                                marginBottom: 5,
                            }}>
                                {Math.min(
                                    Math.max(Number(lesson.current_lesson_index) || 0, 0),
                                    Number(lesson.sentence_count) || 0
                                )} / {Number(lesson.sentence_count) || 0}

                                {'  '}
                                {Number(lesson.sentence_count) > 0
                                    ? Math.round(
                                        Math.min(
                                            Math.max(Number(lesson.current_lesson_index) || 0, 0),
                                            Number(lesson.sentence_count)
                                        ) / Number(lesson.sentence_count) * 100
                                    )
                                    : 0}%
                            </Text>

                            <View style={{
                                height: 8,
                                backgroundColor: '#444',
                                borderRadius: 4,
                                overflow: 'hidden',
                            }}>
                                <View style={{
                                    height: '100%',
                                    width: `${Number(lesson.sentence_count) > 0
                                        ? Math.min(
                                            Math.max(Number(lesson.current_lesson_index) || 0, 0),
                                            Number(lesson.sentence_count)
                                        ) / Number(lesson.sentence_count) * 100
                                        : 0
                                        }%`,
                                    backgroundColor: '#4CAF50',
                                    borderRadius: 4,
                                }} />
                            </View>
                        </View>


                    </View>

                ))}


                {/* No search/filter results */}
                {displayedLessons.length === 0 && (
                    <View style={styles.noResults}>
                        <AntDesign
                            name="file-search"
                            size={35}
                            color="#888"
                        />

                        <Text style={styles.noResultsText}>
                            No lessons found
                        </Text>
                    </View>
                )}

            </ScrollView>

        </View>
    );
}

