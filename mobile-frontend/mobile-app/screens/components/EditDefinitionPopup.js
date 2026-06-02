import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function EditDefinitionPopup({ visible, Definition, translationID, server, token, showSuccess, showError, onCancel, onUpdated }) {
    const [editedDefinition, setEditedDefinition] = useState('');
    console.log(visible)
    console.log("This is the ID of the current translation: " + translationID)
    useEffect(() => {
        if (visible) {
            setEditedDefinition(Definition || '');
        }
    }, [visible, Definition]);

    const saveDefinitionEdit = async (definition, translationID) => {
        console.log({ server, token, showSuccess, showError });
        try {
            const response = await fetch(
                `http://${server}:8000/api/update-word-translation/`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        translation_id: translationID,
                        definition: definition,
                    }),
                }
            );

            const data = await response.json();
            if (response.ok) {
                console.log('Updated:', data);
                console.log("✅ SUCCESS BLOCK REACHED");
                showSuccess?.('Definition updated');
                onUpdated?.(translationID, definition);

                onCancel(); // close modal
                
            } else {
                console.error(data);
                if (showError) {
                    showError?.(data.error || 'Failed to update definition');
                }
            }
        } catch (err) {
            console.error(err);
            showError('Failed to update definition');
        }
        
    };

    return (
        <Modal

            visible={visible}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.overlay}>
                <View style={styles.popup}>
                    <Text style={styles.title}>Edit Definition</Text>
                    <TextInput
                        style={styles.input}
                        value={editedDefinition}
                        onChangeText={setEditedDefinition}
                        autoFocus
                    />
                    <View style={styles.buttons}>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={() => saveDefinitionEdit(editedDefinition, translationID)}
                        >
                            <Text style={styles.buttonText}>Save</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={onCancel}
                        >
                            <Text style={styles.buttonText}>Cancel</Text>
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
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    popup: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        width: '80%',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 5,
        padding: 10,
        marginBottom: 20,
        fontSize: 16,
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        flex: 1,
        padding: 10,
        marginHorizontal: 5,
        borderRadius: 5,
        alignItems: 'center',
    },
    saveButton: {
        backgroundColor: '#00adb5',
    },
    cancelButton: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
    },
});
