import React, { useEffect, useState } from "react";
import {
    Modal,
    View,
    Text,
    TextInput,
    Pressable,
    StyleSheet,
    Platform,
} from "react-native";

const EditSentence = ({
    visible,
    sentence,
    onSave,
    onCancel,
}) => {
    const [text, setText] = useState(sentence || "");

    useEffect(() => {
        if (visible) {
            setText(sentence || "");
        }
    }, [visible, sentence]);

    const handleSave = () => {
        onSave?.(text);
    };

    return (
        <Modal
            transparent={true}
            visible={visible}
            animationType="fade"
            onRequestClose={onCancel}
        >
            <View style={styles.overlay}>
                <View style={styles.popup}>
                    <Text style={styles.title}>
                        Edit Sentence
                    </Text>

                    <TextInput
                        value={text}
                        onChangeText={setText}
                        multiline={true}
                        style={styles.input}
                        autoFocus={true}
                    />

                    <View style={styles.buttonRow}>
                        <Pressable
                            style={styles.cancelButton}
                            onPress={onCancel}
                        >
                            <Text style={styles.buttonText}>
                                Cancel
                            </Text>
                        </Pressable>

                        <Pressable
                            style={styles.saveButton}
                            onPress={handleSave}
                        >
                            <Text style={styles.buttonText}>
                                Save
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        justifyContent: "center",
        alignItems: "center",
    },

    popup: {
        width: Platform.OS === "web" ? 500 : "90%",
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
        marginBottom: 15,
    },

    input: {
        minHeight: 120,
        maxHeight: 250,
        backgroundColor: "#1b1f2a",
        color: "#ffffff",
        borderWidth: 1,
        borderColor: "#2c3244",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        textAlignVertical: "top",
    },

    buttonRow: {
        flexDirection: "row",
        justifyContent: "flex-end",
        marginTop: 15,
        gap: 10,
    },

    cancelButton: {
        backgroundColor: "#2c3244",
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
    },

    saveButton: {
        backgroundColor: "#00b8c4",
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 8,
    },

    buttonText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "500",
    },
});

export default EditSentence;