
import React, { useCallback, useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    RefreshControl,
    useWindowDimensions,
} from "react-native";
import AntDesign from "@expo/vector-icons/AntDesign";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getServerIP } from "../utils/config";
import { createStyles } from "./styles/RSSStyles";
import AddFeedPopup from "./components/AddFeedPopup";

const colors = {
    accent: "#00adb5",
};

export default function RSSScreen({ navigation }) {
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const styles = createStyles(insets, width);

    const [serverIP, setServerIP] = useState("");
    const [token, setToken] = useState(null);

    const [feeds, setFeeds] = useState([]);
    const [selectedFeed, setSelectedFeed] = useState(null);
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [feedsLoaded, setFeedsLoaded] = useState(false);

    const [feed, setFeed] = useState(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [addFeedVisible, setAddFeedVisible] = useState(false);

    const contentWidth =
        width >= 900 ? 760 : width >= 600 ? 680 : width - 32;

    useEffect(() => {
        const init = async () => {
            try {
                const ip = await getServerIP();
                const storedToken = await AsyncStorage.getItem("accessToken");

                setServerIP(ip);
                setToken(storedToken);

                if (!storedToken) {
                    setError("No access token found. Please log in.");
                    setLoading(false);
                    setFeedsLoaded(true);
                }
            } catch (error) {
                setError("Failed to initialize: " + error.message);
                setLoading(false);
                setFeedsLoaded(true);
            }
        };

        init();
    }, []);

    // Load the feeds available to this user.
    const loadFeeds = useCallback(async () => {
        if (!serverIP || !token) return;

        try {
            const response = await fetch(
                `http://${serverIP}:8000/api/rss/feeds/`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load RSS feeds.");
            }

            setFeeds(data);

            setSelectedFeed((currentFeed) => {
                if (currentFeed) {
                    const stillAvailable = data.find(
                        (item) => item.id === currentFeed.id
                    );

                    if (stillAvailable) return stillAvailable;
                }

                return data.find((item) => item.is_favorite) || data[0] || null;
            });
        } catch (error) {
            console.error("Failed to fetch RSS feeds:", error);
            setError(error.message || "Unable to load RSS feeds.");
        } finally {
            setFeedsLoaded(true);
        }
    }, [serverIP, token]);

    useEffect(() => {
        if (serverIP && token) {
            loadFeeds();
        }
    }, [serverIP, token, loadFeeds]);

    // Load articles for the selected feed.
    const loadFeed = useCallback(async (isRefresh = false) => {
        if (!serverIP || !token) return;

        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }

        setError("");

        try {
            const url = selectedFeed
                ? `http://${serverIP}:8000/api/rss/?feed_id=${selectedFeed.id}`
                : `http://${serverIP}:8000/api/rss/`;

            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                },
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || "Failed to load RSS feed.");
            }

            setFeed(data);
        } catch (error) {
            console.error("Failed to fetch RSS feed:", error);
            setError(error.message || "Unable to connect to the server.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [serverIP, token, selectedFeed]);

    useEffect(() => {
        if (serverIP && token && feedsLoaded) {
            loadFeed();
        }
    }, [serverIP, token, feedsLoaded, loadFeed]);

    const selectFeed = (item) => {
        setSelectedFeed(item);
        setDropdownOpen(false);
    };

    const openAddFeedPopup = () => {
        setAddFeedVisible(true);
    };

    const handleFeedSaved = (newFeed) => {
        setFeeds((currentFeeds) =>
            [...currentFeeds, newFeed].sort((a, b) =>
                a.name.localeCompare(b.name)
            )
        );

        setSelectedFeed(newFeed);
        setError("");
    };

    return (
        <View
            style={[
                styles.screen,
                {
                    paddingTop: insets.top + 12,
                    paddingBottom: insets.bottom,
                },
            ]}
        >
            <TouchableOpacity
                style={styles.backLink}
                onPress={() => navigation.goBack()}
            >
                <AntDesign name="left" size={22} color="white" />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={[
                    styles.container,
                    { width: contentWidth },
                ]}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={() => loadFeed(true)}
                        tintColor={colors.accent}
                        colors={[colors.accent]}
                    />
                }
            >
                <View style={styles.headerRow}>
                    <View style={styles.headerTextContainer}>
                        <Text style={styles.eyebrow}>LANGUE NEWS</Text>
                        <Text style={styles.header}>
                            {selectedFeed?.name ||
                                feed?.feed_title ||
                                "Lithuanian News"}
                        </Text>
                        <Text style={styles.subtitle}>
                            Read and learn Lithuanian.
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={() => loadFeed(true)}
                        accessibilityLabel="Refresh news"
                    >
                        <Text style={styles.refreshButtonText}>↻</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.addFeedButton}
                        onPress={openAddFeedPopup}
                        accessibilityRole="button"
                        accessibilityLabel="Add RSS feed"
                    >
                        <AntDesign
                            name="plus"
                            size={22}
                            color="#00adb5"
                        />
                    </TouchableOpacity>
                </View>

                <View style={styles.feedPickerContainer}>
                    <Text style={styles.feedPickerLabel}>RSS FEED</Text>

                    <TouchableOpacity
                        style={styles.feedPicker}
                        onPress={() => setDropdownOpen((open) => !open)}
                        accessibilityRole="button"
                        accessibilityLabel="Choose RSS feed"
                    >
                        <Text
                            style={styles.feedPickerText}
                            numberOfLines={1}
                        >
                            {selectedFeed?.name ||
                                (feedsLoaded
                                    ? "Default Lithuanian News"
                                    : "Loading feeds...")}
                        </Text>

                        <AntDesign
                            name={dropdownOpen ? "up" : "down"}
                            size={16}
                            color={colors.accent}
                        />
                    </TouchableOpacity>

                    {dropdownOpen && (
                        <View style={styles.feedPickerDropdown}>
                            {feeds.length ? (
                                feeds.map((item) => (
                                    <TouchableOpacity
                                        key={item.id}
                                        style={[
                                            styles.feedPickerOption,
                                            selectedFeed?.id === item.id &&
                                            styles.feedPickerOptionSelected,
                                        ]}
                                        onPress={() => selectFeed(item)}
                                    >
                                        <Text
                                            style={styles.feedPickerOptionText}
                                        >
                                            {item.name}
                                            {item.is_favorite ? "  ★" : ""}
                                        </Text>

                                        {selectedFeed?.id === item.id && (
                                            <AntDesign
                                                name="check"
                                                size={16}
                                                color={colors.accent}
                                            />
                                        )}
                                    </TouchableOpacity>
                                ))
                            ) : (
                                <Text style={styles.feedPickerEmpty}>
                                    No saved RSS feeds are available.
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {loading && !feed ? (
                    <View style={styles.statusContainer}>
                        <ActivityIndicator
                            size="large"
                            color={colors.accent}
                        />
                        <Text style={styles.statusText}>
                            Loading news...
                        </Text>
                    </View>
                ) : error && !feed ? (
                    <View style={styles.statusCard}>
                        <Text style={styles.errorTitle}>
                            Unable to load news
                        </Text>
                        <Text style={styles.statusText}>{error}</Text>

                        <TouchableOpacity
                            style={styles.primaryButton}
                            onPress={() => {
                                loadFeeds();
                                loadFeed();
                            }}
                        >
                            <Text style={styles.primaryButtonText}>
                                Try Again
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {error ? (
                            <Text style={styles.inlineError}>
                                Refresh failed. Showing previously loaded news.
                            </Text>
                        ) : null}

                        {feed?.entries?.length ? (
                            feed.entries.map((item, index) => (
                                <View
                                    key={`${item.url}-${index}`}
                                    style={styles.articleCard}
                                >
                                    {item.image ? (
                                        <Image
                                            source={{ uri: item.image }}
                                            style={styles.articleImage}
                                            resizeMode="cover"
                                        />
                                    ) : null}

                                    <View style={styles.cardContent}>
                                        <Text style={styles.articleDate}>
                                            {item.date || "Date unavailable"}
                                        </Text>

                                        <Text style={styles.articleTitle}>
                                            {item.title}
                                        </Text>

                                        <Text style={styles.articleSummary}>
                                            {item.summary}
                                        </Text>

                                        <TouchableOpacity
                                            style={styles.readButton}
                                            onPress={() =>
                                                navigation.navigate(
                                                    "RSSArticle",
                                                    {
                                                        articleUrl: item.url,
                                                        title: item.title,
                                                    }
                                                )
                                            }
                                            accessibilityRole="button"
                                        >
                                            <Text style={styles.readButtonText}>
                                                Read Article
                                            </Text>
                                            <Text style={styles.arrow}>→</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.statusCard}>
                                <Text style={styles.statusText}>
                                    No news articles were found.
                                </Text>
                            </View>
                        )}
                    </>
                )}
            </ScrollView>
            <AddFeedPopup
                visible={addFeedVisible}
                onClose={() => setAddFeedVisible(false)}
                serverIP={serverIP}
                token={token}
                onSaved={handleFeedSaved}
            />
        </View>
    );
}
