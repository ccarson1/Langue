import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    Alert,
    TextInput,
    useWindowDimensions,
} from 'react-native';

import AntDesign from '@expo/vector-icons/AntDesign';
import styles from "./styles/LessonsStyles";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { getServerIP } from '../utils/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles } from './styles/LessonsStyles';


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

    const [sortOrder, setSortOrder] = useState('newest');

    const [filters, setFilters] = useState({
        audio: false,
        video: false,
        url: false,
        file: false,
    });


    const fetchLessons = async () => {
        try {
            const token = await AsyncStorage.getItem('accessToken');

            const res = await fetch(`http://${serverIP}:8000/api/lessons/`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await res.json();

            const jsonSize = JSON.stringify(data).length;

            console.log("Lessons count:", data.length);
            console.log("Lessons data size:", jsonSize, "characters");
            console.log("Lessons data size:", (jsonSize / 1024).toFixed(2), "KB");

            setLessons(data);
            console.log(data);

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

        fetchLessons();
        fetchLanguages();
        loadTokenAndSettings();

    }, [serverIP]);


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


        // -------------------------
        // SORT
        // -------------------------

        result.sort((a, b) => {

            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();

            if (sortOrder === 'newest') {
                return dateB - dateA;
            }

            return dateA - dateB;
        });


        return result;

    }, [lessons, searchText, filters, sortOrder]);


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
    };


    const hasActiveFilters =
        filters.audio ||
        filters.video ||
        filters.url ||
        filters.file;


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
                                    Object.values(filters).filter(Boolean).length
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
                            {lesson.id}
                        </Text>


                        <Text style={styles.title}>
                            {lesson.title}
                        </Text>


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

                                    const storedToken =
                                        await AsyncStorage.getItem('accessToken');

                                    console.log(storedToken);

                                    if (!storedToken) {
                                        Alert.alert(
                                            "Error",
                                            "No access token found."
                                        );
                                        return;
                                    }


                                    const res = await fetch(
                                        `http://${serverIP}:8000/api/change-lesson/`,
                                        {
                                            method: 'POST',

                                            headers: {
                                                'Content-Type':
                                                    'application/json',

                                                Authorization:
                                                    `Bearer ${storedToken}`
                                            },

                                            body: JSON.stringify({
                                                lesson_id:
                                                    parseInt(lesson.id)
                                            })
                                        }
                                    );


                                    if (!res.ok) {

                                        const errorData =
                                            await res.json();

                                        throw new Error(
                                            errorData.detail ||
                                            'Failed to update progress'
                                        );

                                    } else {

                                        const data =
                                            await res.json();

                                        console.log(data);

                                        navigation.navigate("Home");
                                    }

                                } catch (error) {

                                    console.error(
                                        "Progress update error:",
                                        error
                                    );

                                    Alert.alert(
                                        "Error",
                                        error.message
                                    );
                                }

                            }}
                        >
                            <Text style={styles.buttonText}>
                                Read
                            </Text>
                        </TouchableOpacity>

                    </View>

                ))}


                {/* No search/filter results */}
                {displayedLessons.length === 0 && (
                    <View style={styles.noResults}>
                        <AntDesign
                            name="search1"
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

