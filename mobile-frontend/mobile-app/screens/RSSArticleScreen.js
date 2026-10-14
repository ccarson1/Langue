
import React, { useEffect, useState } from "react";
import {
    View,
    Text,
    Image,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    StyleSheet,
    Linking,
    useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AntDesign from '@expo/vector-icons/AntDesign';
import { createStyles } from './styles/RSSArticleStyles';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerIP } from '../utils/config';


const colors = {
    bg: "#222831",
    surface: "#393e46",
    surfaceElevated: "#3f454e",
    border: "#4b525c",
    borderSubtle: "#333944",
    text: "#eeeeee",
    textMuted: "#a0a6ad",
    accent: "#00adb5",
    danger: "#e05a5a",
};

export default function RSSArticleScreen({ route, navigation }) {
    const { articleUrl, title } = route.params;
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const styles = createStyles(insets, width);
    const [serverIP, setServerIP] = useState('');
    const [token, setToken] = useState(null);

    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const contentWidth = width >= 900 ? 760 : width >= 600 ? 680 : width - 32;

    useEffect(() => {
        const init = async () => {
            const ip = await getServerIP();
            const storedToken = await AsyncStorage.getItem('accessToken');

            setServerIP(ip);
            setToken(storedToken);
        };

        init();
    }, []);

    useEffect(() => {
        if (!serverIP || !token || !articleUrl) return;

        let cancelled = false;

        async function loadArticle() {
            setLoading(true);
            setError("");
            setArticle(null);

            try {
                const response = await fetch(
                    `http://${serverIP}:8000/api/rss/article/?url=${encodeURIComponent(articleUrl)}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                            "Content-Type": "application/json",
                        },
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.error || "Could not load this article."
                    );
                }

                if (!cancelled) {
                    setArticle(data);
                }
            } catch (err) {
                if (!cancelled) {
                    setError(
                        err.message || "Unable to connect to the server."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        loadArticle();

        return () => {
            cancelled = true;
        };
    }, [serverIP, token, articleUrl]);

    return (
        <View
            style={[
                styles.screen,
                {
                    paddingTop: insets.top + 8,
                    paddingBottom: insets.bottom,
                },
            ]}
        >
            <View style={styles.topBar}>


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

                <Text style={styles.topBarTitle} numberOfLines={1}>
                    Article
                </Text>

                <View style={styles.backButtonPlaceholder} />
            </View>

            <ScrollView
                contentContainerStyle={[
                    styles.container,
                    { width: contentWidth },
                ]}
            >
                {loading ? (
                    <View style={styles.statusContainer}>
                        <ActivityIndicator
                            size="large"
                            color={colors.accent}
                        />
                        <Text style={styles.statusText}>
                            Loading article...
                        </Text>
                    </View>
                ) : error ? (
                    <View style={styles.statusCard}>
                        <Text style={styles.errorTitle}>
                            Unable to load article
                        </Text>
                        <Text style={styles.statusText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.backToNewsButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Text style={styles.backToNewsText}>
                                Back to News
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : article ? (
                    <View style={styles.articleCard}>
                        <Text style={styles.eyebrow}>LITHUANIAN READING</Text>

                        <Text style={styles.articleTitle}>
                            {article.title || title}
                        </Text>

                        <Text style={styles.articleDate}>
                            {article.date || "Date unavailable"}
                        </Text>

                        {article.image ? (
                            <Image
                                source={{ uri: article.image }}
                                style={styles.articleImage}
                                resizeMode="cover"
                            />
                        ) : null}

                        {article.summary ? (
                            <Text style={styles.summary}>
                                {article.summary}
                            </Text>
                        ) : null}

                        <View style={styles.divider} />

                        {article.text
                            ? article.text
                                .split(/\n\s*\n/)
                                .filter(paragraph => paragraph.trim())
                                .map((paragraph, index) => (
                                    <Text
                                        key={index}
                                        style={styles.paragraph}
                                    >
                                        {paragraph.trim()}
                                    </Text>
                                ))
                            : (
                                <Text style={styles.statusText}>
                                    No article text was found.
                                </Text>
                            )}

                        <TouchableOpacity
                            style={styles.originalButton}
                            onPress={() => Linking.openURL(article.url)}
                        >
                            <Text style={styles.originalButtonText}>
                                Open Original Article ↗
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}
            </ScrollView>
        </View>
    );
}
