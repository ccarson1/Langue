
import React, { useCallback, useEffect, useState } from "react";

import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    TextInput,
} from "react-native";

import {
    LineChart,
    PieChart
} from "react-native-chart-kit";

import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { Dimensions } from "react-native";
import { createStyles } from './styles/HomeStyles';
import { getServerIP } from '../utils/config';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AntDesign from '@expo/vector-icons/AntDesign';
import CustomPopup from './components/CustomPopup';

const screenWidth = Dimensions.get("window").width;


export default function StatisticsScreen({ navigation }) {

    const insets = useSafeAreaInsets();
    const styles = createStyles(insets);

    const [stats, setStats] = useState(null);
    const [token, setToken] = useState(null);
    const [serverIP, setServerIP] = useState('');
    const [user, setUser] = useState(null);
    const [selectedLanguage, setSelectedLanguage] = useState(null);
    const [timeRange, setTimeRange] = useState("all");
    const [periodOffset, setPeriodOffset] = useState(0);

    // Vocabulary state
    const [vocabulary, setVocabulary] = useState([]);
    const [vocabularyPage, setVocabularyPage] = useState(1);
    const [vocabularyCount, setVocabularyCount] = useState(0);
    const [vocabularyTotalPages, setVocabularyTotalPages] = useState(0);
    const [languages, setLanguages] = useState([]);
    const [editedWords, setEditedWords] = useState({});
    const [editedLanguages, setEditedLanguages] = useState({});
    const [openLanguageDropdown, setOpenLanguageDropdown] = useState(null);

    const [deletingItem, setDeletingItem] = useState(null);
    const [vocabularyBusy, setVocabularyBusy] = useState(false);
    const [vocabularyRefresh, setVocabularyRefresh] = useState(0);

    const [popupVisible, setPopupVisible] = useState(false);
    const [popupMessage, setPopupMessage] = useState("");
    const [popupType, setPopupType] = useState("success");
    const [popupShowButtons, setPopupShowButtons] = useState(false);
    const [openActionsMenu, setOpenActionsMenu] = useState(null);



    const decodeToken = (token) => {
        try {
            return jwtDecode(token);
        } catch (err) {
            console.error('Token decode failed:', err);
            return null;
        }
    };

    // Initialize server IP and authentication
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

    // Load user settings
    useEffect(() => {
        if (!serverIP || !token) return;

        const loadSettings = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/settings/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (response.ok && data.target_language) {
                    setSelectedLanguage(data.target_language);
                }
            } catch (err) {
                console.error("Error loading settings:", err);
            }
        };

        loadSettings();
    }, [serverIP, token]);

    // Load statistics
    useEffect(() => {
        if (!serverIP || !token || !selectedLanguage) return;

        const loadStatistics = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/statistics/?language=${encodeURIComponent(selectedLanguage)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (response.ok) {
                    setStats(data);
                } else {
                    console.error("Failed to load statistics:", data);
                }
            } catch (err) {
                console.error("Error loading statistics:", err);
            }
        };

        loadStatistics();
    }, [serverIP, token, selectedLanguage]);

    // Load vocabulary with pagination
    useEffect(() => {
        if (!serverIP || !token) return;

        const loadVocabulary = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/vocabulary/?page=${vocabularyPage}&page_size=25`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    }
                );

                const data = await response.json();

                if (response.ok) {
                    setVocabulary(data.results || []);
                    setVocabularyCount(data.count || 0);
                    setVocabularyTotalPages(data.total_pages || 0);
                } else {
                    console.error("Failed to load vocabulary:", data);
                }
            } catch (err) {
                console.error("Error loading vocabulary:", err);
            }
        };

        loadVocabulary();
    }, [serverIP, token, vocabularyPage, vocabularyRefresh]);

    useEffect(() => {
        if (!serverIP || !token) return;

        const loadLanguages = async () => {
            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/languages/`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                const data = await response.json();

                if (response.ok) {
                    setLanguages(
                        Array.isArray(data) ? data : data.results || []
                    );
                } else {
                    console.error("Failed to load languages:", data);
                }
            } catch (err) {
                console.error("Error loading languages:", err);
            }
        };

        loadLanguages();
    }, [serverIP, token]);

    // Filter words for the chart
    const filteredWords = (stats?.words_over_time || []).filter(item => {
        if (timeRange === "all") return true;

        const itemDate = new Date(item.date);
        const today = new Date();

        if (timeRange === "year") {
            const year = today.getFullYear() + periodOffset;
            return itemDate.getFullYear() === year;
        }

        if (timeRange === "month") {
            const date = new Date(
                today.getFullYear(),
                today.getMonth() + periodOffset,
                1
            );

            return (
                itemDate.getFullYear() === date.getFullYear() &&
                itemDate.getMonth() === date.getMonth()
            );
        }

        if (timeRange === "week") {
            const startOfWeek = new Date(today);

            startOfWeek.setDate(
                today.getDate() - ((today.getDay() + 6) % 7)
                + periodOffset * 7
            );

            startOfWeek.setHours(0, 0, 0, 0);

            const endOfWeek = new Date(startOfWeek);
            endOfWeek.setDate(startOfWeek.getDate() + 7);

            return itemDate >= startOfWeek && itemDate < endOfWeek;
        }

        return true;
    });

    const graphWidth = Math.max(screenWidth - 20, filteredWords.length * 60);

    const showVocabularyPopup = (
        message,
        type = "success",
        showButtons = false
    ) => {
        setPopupMessage(message);
        setPopupType(type);
        setPopupShowButtons(showButtons);
        setPopupVisible(false);

        // Allow the popup to reopen if it was already visible.
        setTimeout(() => setPopupVisible(true), 50);
    };

    const closeVocabularyPopup = useCallback(() => {
        setPopupVisible(false);
    }, []);

    const saveVocabularyEdit = async (item) => {
        if (vocabularyBusy) return;

        const word = (editedWords[item.id] ?? item.word ?? "").trim();

        const languageId =
            editedLanguages[item.id] ??
            item.language_id ??
            languages.find(lang => lang.lang_name === item.language)?.id;

        if (!word) {
            showVocabularyPopup("Please enter a word.", "error");
            return;
        }

        if (!languageId) {
            showVocabularyPopup("Please select a language.", "error");
            return;
        }

        setVocabularyBusy(true);

        try {
            const response = await fetch(
                `http://${serverIP}:8000/api/vocabulary/${item.id}/`,
                {
                    method: "PUT",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        word,
                        language_id: languageId,
                    }),
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showVocabularyPopup(
                    data.error || "Failed to update vocabulary.",
                    "error"
                );
                return;
            }

            setEditedWords(previous => {
                const updated = { ...previous };
                delete updated[item.id];
                return updated;
            });

            setEditedLanguages(previous => {
                const updated = { ...previous };
                delete updated[item.id];
                return updated;
            });

            setOpenLanguageDropdown(null);
            setVocabularyRefresh(value => value + 1);

            showVocabularyPopup("Vocabulary updated successfully.");
        } catch (err) {
            console.error("Error updating vocabulary:", err);
            showVocabularyPopup("Could not connect to the server.", "error");
        } finally {
            setVocabularyBusy(false);
        }
    };

    const confirmDeleteVocabulary = async () => {
        if (!deletingItem || vocabularyBusy) return;

        setVocabularyBusy(true);

        try {
            const response = await fetch(
                `http://${serverIP}:8000/api/vocabulary/${deletingItem.id}/delete/`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                showVocabularyPopup(
                    data.error || "Failed to delete vocabulary.",
                    "error"
                );
                return;
            }

            const deletedId = deletingItem.id;

            setDeletingItem(null);

            setEditedWords(previous => {
                const updated = { ...previous };
                delete updated[deletedId];
                return updated;
            });

            setEditedLanguages(previous => {
                const updated = { ...previous };
                delete updated[deletedId];
                return updated;
            });

            if (vocabulary.length === 1 && vocabularyPage > 1) {
                setVocabularyPage(page => page - 1);
            } else {
                setVocabularyRefresh(value => value + 1);
            }

            showVocabularyPopup("Vocabulary record deleted.");
        } catch (err) {
            console.error("Error deleting vocabulary:", err);
            showVocabularyPopup("Could not connect to the server.", "error");
        } finally {
            setVocabularyBusy(false);
        }
    };

    if (!stats) {
        return (
            <View style={{ flex: 1, backgroundColor: "#222831", padding: 20 }}>
                <Text style={{ color: "white" }}>
                    Loading...
                </Text>
            </View>
        );
    }

    return (
        <ScrollView style={{ backgroundColor: "#222831" }}>

            <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.goBack()}
            >
                <AntDesign name="left" size={22} color="white" />
            </TouchableOpacity>

            <Text
                style={{
                    color: "white",
                    fontSize: 28,
                    textAlign: "center",
                    margin: 20
                }}
            >
                Statistics
            </Text>

            {/* Language selection */}
            <Text
                style={{
                    color: "white",
                    fontSize: 22,
                    margin: 20
                }}
            >
                Select Language
            </Text>

            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center"
                }}
            >
                {(stats.languages || []).map((item, index) => {
                    const language = item.word__language__lang_name;

                    const colors = [
                        "#00ADB5",
                        "#FF6B6B",
                        "#06D6A0",
                        "#6C63FF",
                        "#FFD166",
                        "#F78C6B",
                        "#C77DFF",
                        "#4D96FF",
                    ];

                    const color = colors[index % colors.length];
                    const selected = selectedLanguage === language;

                    return (
                        <TouchableOpacity
                            key={language}
                            onPress={() => setSelectedLanguage(language)}
                            style={{
                                backgroundColor: selected ? color : "#393e46",
                                borderWidth: 2,
                                borderColor: color,
                                paddingVertical: 10,
                                paddingHorizontal: 16,
                                margin: 5,
                                borderRadius: 10,
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "bold" }}>
                                {language}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Summary cards */}
            <View
                style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    justifyContent: "center"
                }}
            >
                {Object.entries(stats.summary || {}).map(([key, value]) => (
                    <View
                        key={key}
                        style={{
                            backgroundColor: "#393e46",
                            width: 150,
                            height: 100,
                            margin: 10,
                            borderRadius: 10,
                            justifyContent: "center",
                            alignItems: "center"
                        }}
                    >
                        <Text
                            style={{
                                color: "#00adb5",
                                fontSize: 30
                            }}
                        >
                            {value}
                        </Text>

                        <Text style={{ color: "white" }}>
                            {key}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Words learned chart */}
            <Text
                style={{
                    color: "white",
                    fontSize: 22,
                    margin: 20
                }}
            >
                Words Learned
            </Text>

            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    flexWrap: "wrap",
                    marginBottom: 10
                }}
            >
                {[
                    { label: "All", value: "all" },
                    { label: "Year", value: "year" },
                    { label: "Month", value: "month" },
                    { label: "Week", value: "week" },
                ].map(option => {
                    const selected = timeRange === option.value;

                    return (
                        <TouchableOpacity
                            key={option.value}
                            onPress={() => {
                                setTimeRange(option.value);
                                setPeriodOffset(0);
                            }}
                            style={{
                                backgroundColor: selected ? "#00ADB5" : "#393e46",
                                paddingVertical: 10,
                                paddingHorizontal: 18,
                                marginHorizontal: 4,
                                marginVertical: 4,
                                borderRadius: 8
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "bold" }}>
                                {option.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {timeRange !== "all" && (
                <View
                    style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 10
                    }}
                >
                    <TouchableOpacity
                        onPress={() => setPeriodOffset(offset => offset - 1)}
                        style={{ padding: 10 }}
                    >
                        <AntDesign name="left" size={22} color="white" />
                    </TouchableOpacity>

                    <Text
                        style={{
                            color: "white",
                            fontSize: 16,
                            marginHorizontal: 15
                        }}
                    >
                        {timeRange === "year" &&
                            new Date().getFullYear() + periodOffset}

                        {timeRange === "month" &&
                            new Date(
                                new Date().getFullYear(),
                                new Date().getMonth() + periodOffset,
                                1
                            ).toLocaleDateString("en-US", {
                                month: "long",
                                year: "numeric"
                            })}

                        {timeRange === "week" &&
                            (() => {
                                const start = new Date();

                                start.setDate(
                                    start.getDate() - ((start.getDay() + 6) % 7)
                                    + periodOffset * 7
                                );

                                const end = new Date(start);
                                end.setDate(start.getDate() + 6);

                                return `${start.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric"
                                })} - ${end.toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                })}`;
                            })()}
                    </Text>

                    <TouchableOpacity
                        onPress={() => setPeriodOffset(offset => Math.min(offset + 1, 0))}
                        disabled={periodOffset === 0}
                        style={{
                            padding: 10,
                            opacity: periodOffset === 0 ? 0.3 : 1
                        }}
                    >
                        <AntDesign name="right" size={22} color="white" />
                    </TouchableOpacity>
                </View>
            )}

            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={true}
                style={{ marginHorizontal: 10 }}
            >
                <LineChart
                    data={{
                        labels: filteredWords.map(item =>
                            new Date(item.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                timeZone: "UTC"
                            })
                        ),
                        datasets: [
                            {
                                data: filteredWords.length
                                    ? filteredWords.map(item => item.count)
                                    : [0]
                            }
                        ]
                    }}
                    width={graphWidth}
                    height={220}
                    chartConfig={{
                        backgroundColor: "#393e46",
                        backgroundGradientFrom: "#393e46",
                        backgroundGradientTo: "#393e46",
                        color: () => "#00adb5",
                        labelColor: () => "#ffffff",
                        decimalPlaces: 0
                    }}
                    style={{
                        borderRadius: 10
                    }}
                />
            </ScrollView>

            {/* Languages chart */}
            <Text
                style={{
                    color: "white",
                    fontSize: 22,
                    margin: 20
                }}
            >
                Languages
            </Text>

            <PieChart
                data={(stats.languages || []).map((item, index) => {
                    const colors = [
                        "#00ADB5",
                        "#FF6B6B",
                        "#06D6A0",
                        "#6C63FF",
                        "#FFD166",
                        "#F78C6B",
                        "#C77DFF",
                        "#4D96FF",
                    ];

                    return {
                        name: item.word__language__lang_name,
                        population: item.count,
                        color: colors[index % colors.length],
                    };
                })}
                width={screenWidth}
                height={220}
                chartConfig={{
                    color: () => "#ffffff",
                    labelColor: () => "#ffffff",
                }}
                accessor="population"
                backgroundColor="transparent"
            />


            {/* Vocabulary Section */}
            <Text
                style={{
                    color: "white",
                    fontSize: 22,
                    margin: 20,
                    fontWeight: "bold",
                }}
            >
                Vocabulary ({vocabularyCount} words)
            </Text>

            <View style={{ flexDirection: "row", marginHorizontal: 10 }}>
                {/* Scrollable vocabulary columns */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={true}
                    style={{ flex: 1 }}
                >
                    <View>
                        {/* Table Header */}
                        <View
                            style={{
                                flexDirection: "row",
                                backgroundColor: "#00ADB5",
                                height: 42,
                                alignItems: "center",
                            }}
                        >
                            {[
                                { label: "ID", width: 65 },
                                { label: "Word", width: 160 },
                                { label: "Language", width: 120 },
                                { label: "Word Frequency", width: 130 },
                                { label: "User Frequency", width: 130 },
                                { label: "Clicks", width: 80 },
                                { label: "Created", width: 150 },
                                { label: "Review Date", width: 150 },
                                { label: "Last Seen", width: 150 },
                                { label: "Username", width: 130 },
                            ].map(column => (
                                <Text
                                    key={column.label}
                                    style={{
                                        width: column.width,
                                        paddingHorizontal: 8,
                                        color: "#222831",
                                        fontWeight: "bold",
                                        fontSize: 13,
                                    }}
                                >
                                    {column.label}
                                </Text>
                            ))}
                        </View>

                        {/* Table Rows */}
                        {vocabulary.map((item, index) => {
                            const currentLanguageId =
                                editedLanguages[item.id] ??
                                item.language_id ??
                                languages.find(
                                    lang => lang.lang_name === item.language
                                )?.id;

                            return (
                                <View
                                    key={item.id}
                                    style={{
                                        flexDirection: "row",
                                        height: 59,
                                        backgroundColor:
                                            index % 2 === 0 ? "#393e46" : "#2d333b",
                                        borderBottomWidth: 1,
                                        borderBottomColor: "#555b63",
                                        alignItems: "center",
                                    }}
                                >
                                    <Text
                                        style={{
                                            width: 65,
                                            padding: 8,
                                            color: "white",
                                            fontSize: 13,
                                        }}
                                    >
                                        {item.id}
                                    </Text>

                                    {/* Editable Word */}
                                    <View style={{ width: 160, paddingHorizontal: 5 }}>
                                        <TextInput
                                            value={editedWords[item.id] ?? item.word ?? ""}
                                            onChangeText={value =>
                                                setEditedWords(previous => ({
                                                    ...previous,
                                                    [item.id]: value,
                                                }))
                                            }
                                            maxLength={30}
                                            style={{
                                                backgroundColor: "#222831",
                                                color: "white",
                                                borderWidth: 1,
                                                borderColor: "#555b63",
                                                borderRadius: 5,
                                                paddingHorizontal: 8,
                                                paddingVertical: 6,
                                                fontSize: 13,
                                            }}
                                        />
                                    </View>

                                    {/* Language Dropdown */}
                                    <View
                                        style={{
                                            width: 120,
                                            paddingHorizontal: 5,
                                            zIndex:
                                                openLanguageDropdown === item.id ? 1000 : 1,
                                            elevation:
                                                openLanguageDropdown === item.id ? 10 : 0,
                                        }}
                                    >
                                        <TouchableOpacity
                                            onPress={() =>
                                                setOpenLanguageDropdown(
                                                    openLanguageDropdown === item.id
                                                        ? null
                                                        : item.id
                                                )
                                            }
                                            style={{
                                                backgroundColor: "#222831",
                                                borderWidth: 1,
                                                borderColor: "#555b63",
                                                borderRadius: 5,
                                                padding: 8,
                                                minHeight: 34,
                                                flexDirection: "row",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                        >
                                            <Text
                                                numberOfLines={1}
                                                style={{
                                                    color: "white",
                                                    fontSize: 12,
                                                    flex: 1,
                                                }}
                                            >
                                                {languages.find(
                                                    lang => lang.id === currentLanguageId
                                                )?.lang_name || item.language || "Select"}
                                            </Text>

                                            <AntDesign name="down" size={12} color="white" />
                                        </TouchableOpacity>

                                        {openLanguageDropdown === item.id && (
                                            <View
                                                style={{
                                                    position: "absolute",
                                                    top: 40,
                                                    left: 5,
                                                    right: 5,
                                                    zIndex: 1001,
                                                    elevation: 11,
                                                    backgroundColor: "#222831",
                                                    borderWidth: 1,
                                                    borderColor: "#00ADB5",
                                                    borderRadius: 5,
                                                    maxHeight: 180,
                                                }}
                                            >
                                                <ScrollView nestedScrollEnabled>
                                                    {languages.map(language => (
                                                        <TouchableOpacity
                                                            key={language.id}
                                                            onPress={() => {
                                                                setEditedLanguages(previous => ({
                                                                    ...previous,
                                                                    [item.id]: language.id,
                                                                }));
                                                                setOpenLanguageDropdown(null);
                                                            }}
                                                            style={{
                                                                backgroundColor:
                                                                    currentLanguageId === language.id
                                                                        ? "#00ADB5"
                                                                        : "#222831",
                                                                padding: 8,
                                                            }}
                                                        >
                                                            <Text
                                                                style={{
                                                                    color: "white",
                                                                    fontSize: 12,
                                                                }}
                                                            >
                                                                {language.lang_name}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>
                                        )}
                                    </View>

                                    {/* Read-only columns */}
                                    {[
                                        { value: item.word_frequency, width: 130 },
                                        { value: item.frequency, width: 130 },
                                        { value: item.clicks, width: 80 },
                                        { value: item.creation_date, width: 150 },
                                        { value: item.review_date, width: 150 },
                                        { value: item.last_seen, width: 150 },
                                        { value: item.username, width: 130 },
                                    ].map((column, columnIndex) => (
                                        <Text
                                            key={columnIndex}
                                            selectable
                                            style={{
                                                width: column.width,
                                                paddingHorizontal: 8,
                                                paddingVertical: 8,
                                                color: "white",
                                                fontSize: 13,
                                            }}
                                        >
                                            {column.value == null || column.value === ""
                                                ? "—"
                                                : String(column.value)}
                                        </Text>
                                    ))}
                                </View>
                            );
                        })}

                        {vocabulary.length === 0 && (
                            <Text
                                style={{
                                    color: "white",
                                    padding: 15,
                                    backgroundColor: "#393e46",
                                }}
                            >
                                No vocabulary found.
                            </Text>
                        )}
                    </View>
                </ScrollView>

                {/* Fixed Actions Column */}
                <View style={{ width: 180 }}>
                    <View
                        style={{
                            height: 42,
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#00ADB5",
                            paddingHorizontal: 8,
                        }}
                    >
                        <Text
                            style={{
                                color: "#222831",
                                fontWeight: "bold",
                                fontSize: 13,
                            }}
                        >
                            Actions
                        </Text>
                    </View>

                    {vocabulary.map((item, index) => (
                        <View
                            key={item.id}
                            style={{
                                height: 59,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 8,
                                paddingHorizontal: 8,
                                backgroundColor: index % 2 === 0 ? "#393e46" : "#2d333b",
                                borderBottomWidth: 1,
                                borderBottomColor: "#555b63",
                                position: "relative",
                                zIndex: openActionsMenu === item.id ? 1000 : 0,
                                elevation: openActionsMenu === item.id ? 10 : 0,
                            }}
                        >
                            <TouchableOpacity
                                style={styles.actionButton}
                                onPress={() => {
                                    setOpenLanguageDropdown(null);
                                    setOpenActionsMenu(
                                        openActionsMenu === item.id ? null : item.id
                                    );
                                }}
                            >
                                <Text style={styles.actionButtonText}>Actions ▼</Text>
                            </TouchableOpacity>

                            {openActionsMenu === item.id && (
                                <View style={styles.actionsMenu}>
                                    <TouchableOpacity
                                        style={styles.actionsMenuItem}
                                        onPress={() => {
                                            setOpenActionsMenu(null);
                                            setEditedWords(prev => ({
                                                ...prev,
                                                [item.id]: item.word,
                                            }));
                                            setEditedLanguages(prev => ({
                                                ...prev,
                                                [item.id]: item.language_id,
                                            }));
                                        }}
                                    >
                                        <Text style={styles.actionsMenuText}>Edit</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.actionsMenuItem}
                                        onPress={() => {
                                            setOpenActionsMenu(null);
                                            setDeletingItem(item);
                                            showVocabularyPopup(
                                                "Are you sure you want to delete this vocabulary record?",
                                                "warning",
                                                true
                                            );
                                        }}
                                    >
                                        <Text
                                            style={[
                                                styles.actionsMenuText,
                                                { color: "#FF6B6B" },
                                            ]}
                                        >
                                            Delete
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            </View>


            {/* Pagination */}
            <View
                style={{
                    flexDirection: "row",
                    justifyContent: "center",
                    alignItems: "center",
                    marginVertical: 20,
                    gap: 15,
                }}
            >
                <TouchableOpacity
                    onPress={() =>
                        setVocabularyPage(page => Math.max(1, page - 1))
                    }
                    disabled={vocabularyPage === 1}
                    style={{
                        backgroundColor:
                            vocabularyPage === 1 ? "#393e46" : "#00ADB5",
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 6,
                        opacity: vocabularyPage === 1 ? 0.5 : 1,
                    }}
                >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                        Previous
                    </Text>
                </TouchableOpacity>

                <Text style={{ color: "white" }}>
                    Page {vocabularyPage} of {vocabularyTotalPages}
                </Text>

                <TouchableOpacity
                    onPress={() =>
                        setVocabularyPage(page =>
                            Math.min(vocabularyTotalPages, page + 1)
                        )
                    }
                    disabled={vocabularyPage >= vocabularyTotalPages}
                    style={{
                        backgroundColor:
                            vocabularyPage >= vocabularyTotalPages
                                ? "#393e46"
                                : "#00ADB5",
                        paddingVertical: 10,
                        paddingHorizontal: 16,
                        borderRadius: 6,
                        opacity:
                            vocabularyPage >= vocabularyTotalPages ? 0.5 : 1,
                    }}
                >
                    <Text style={{ color: "white", fontWeight: "bold" }}>
                        Next
                    </Text>
                </TouchableOpacity>
            </View>
            <CustomPopup
                visible={popupVisible}
                message={popupMessage}
                type={popupType}
                showButtons={popupShowButtons}
                acceptText="Delete"
                declineText="Cancel"
                onAccept={confirmDeleteVocabulary}
                onDecline={() => setDeletingItem(null)}
                onClose={closeVocabularyPopup}
            />

        </ScrollView>
    );
}
