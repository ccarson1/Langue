
import React, { useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Switch,
    ActivityIndicator,
    Platform,
} from "react-native";

export default function AddFeedPopup({
    visible,
    onClose,
    serverIP,
    token,
    onSaved,
}) {
    const [feedName, setFeedName] = useState("");
    const [feedUrl, setFeedUrl] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    const resetForm = () => {
        setFeedName("");
        setFeedUrl("");
        setIsPublic(false);
        setError("");
    };

    const handleClose = () => {
        if (saving) return;
        resetForm();
        onClose();
    };

    const handleSave = async () => {
        if (!feedName.trim() || !feedUrl.trim()) {
            setError("Please enter both a feed name and an RSS URL.");
            return;
        }

        if (!serverIP || !token) {
            setError("Unable to connect. Please log in again.");
            return;
        }

        setSaving(true);
        setError("");

        try {
            const formData = new FormData();
            formData.append("rssfeed_name", feedName.trim());
            formData.append("rssfeed_url", feedUrl.trim());
            formData.append("is_public", String(isPublic));

            const response = await fetch(
                `http://${serverIP}:8000/api/rss/feeds/create/`,
                {
                    method: "POST",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.error || "Failed to save the RSS feed."
                );
            }

            resetForm();
            onClose();

            if (typeof onSaved === "function") {
                onSaved(data);
            }
        } catch (err) {
            setError(err.message || "Unable to save the RSS feed.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={handleClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <Text style={styles.title}>Add RSS Feed</Text>

                    <Text style={styles.label}>Feed Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Enter feed name"
                        placeholderTextColor="#858b98"
                        value={feedName}
                        onChangeText={setFeedName}
                        maxLength={30}
                        editable={!saving}
                    />

                    <Text style={styles.label}>RSS Feed URL</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="https://example.com/rss.xml"
                        placeholderTextColor="#858b98"
                        value={feedUrl}
                        onChangeText={setFeedUrl}
                        autoCapitalize="none"
                        keyboardType="url"
                        autoCorrect={false}
                        editable={!saving}
                    />

                    <View style={styles.switchRow}>
                        <View style={styles.switchTextContainer}>
                            <Text style={styles.label}>Public Feed</Text>
                            <Text style={styles.description}>
                                Allow other users to access this feed.
                            </Text>
                        </View>

                        <Switch
                            value={isPublic}
                            onValueChange={setIsPublic}
                            disabled={saving}
                            trackColor={{
                                false: "#4b525c",
                                true: "#00838a",
                            }}
                            thumbColor={isPublic ? "#00adb5" : "#eeeeee"}
                        />
                    </View>

                    {error ? (
                        <Text style={styles.errorText}>{error}</Text>
                    ) : null}

                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={styles.buttonCancel}
                            onPress={handleClose}
                            disabled={saving}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.buttonSave,
                                saving && styles.buttonDisabled,
                            ]}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#222831" />
                            ) : (
                                <Text style={styles.saveButtonText}>
                                    Save Feed
                                </Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        justifyContent: "center",
        alignItems: "center",
        padding: 16,
    },

    container: {
        width: Platform.OS === "web" ? 500 : "100%",
        maxWidth: 600,
        backgroundColor: "#242938",
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: "#2c3244",
    },

    title: {
        color: "#ffffff",
        fontSize: 18,
        fontWeight: "600",
        marginBottom: 18,
    },

    label: {
        color: "#eeeeee",
        fontSize: 14,
        fontWeight: "600",
        marginBottom: 8,
    },

    input: {
        minHeight: 46,
        backgroundColor: "#1b1f2a",
        color: "#ffffff",
        borderWidth: 1,
        borderColor: "#2c3244",
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 15,
        marginBottom: 16,
    },

    switchRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginTop: 2,
        marginBottom: 12,
    },

    switchTextContainer: {
        flex: 1,
    },

    description: {
        color: "#a0a6ad",
        fontSize: 12,
        lineHeight: 18,
        marginTop: 4,
    },

    errorText: {
        color: "#e05a5a",
        fontSize: 13,
        marginTop: 8,
    },

    buttons: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 18,
        gap: 10,
    },

    buttonCancel: {
        backgroundColor: "#2c3244",
        paddingVertical: 11,
        paddingHorizontal: 18,
        borderRadius: 8,
        justifyContent: "center",
    },

    buttonSave: {
        backgroundColor: "#00adb5",
        paddingVertical: 11,
        paddingHorizontal: 18,
        borderRadius: 8,
        minWidth: 110,
        alignItems: "center",
        justifyContent: "center",
    },

    buttonDisabled: {
        opacity: 0.65,
    },

    buttonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "500",
    },

    saveButtonText: {
        color: "#222831",
        fontSize: 15,
        fontWeight: "700",
    },
});
