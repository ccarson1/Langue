// DefinitionList.js
import React, { useState, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AddDefinitionPopup from './AddDefinitionPopup';
import EditDefinitionPopup from './EditDefinitionPopup';

export default function DefinitionList({ definitions = [], translationIDs = [], onWordPress, onAddDefinition, translatedText, selectedText, nat_id, tar_id, popup, server, token, showSuccess, showError, onDefinitionUpdated, onRefreshTranslation }) {
    const [isPopupVisible, setPopupVisible] = useState(false);
    const [isEditVisible, setEditVisible] = useState(false);
    const [wordCursor, setWordCursor] = useState('')
    const [translationID, setTranslationID] = useState(null);


    // useEffect(() => {
    //     console.log(`Definition List translated text ${definitions}`);
    //     console.log(`Definition Cursor ${wordCursor}`)
    //     console.log(`Definition List translation IDs ${translationIDs}`)
    // })


    const editClickedDefinition = (definition, translationID) => {
        const definitionAsString = Array.isArray(definition) ? definition.join(", ") : String(definition);
        console.log(`Clicked definition: ${definitionAsString}, Translation ID: ${translationID}`);
        setWordCursor(definitionAsString);
        setTranslationID(translationID);
        setEditVisible(true);
    };




    return (
        <View style={styles.wrapper}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                {definitions.map((definition, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => editClickedDefinition(definition, translationIDs[index])}
                        style={styles.wordWrapper}

                    >
                        <Text style={styles.wordText}>
                            {Array.isArray(definition) ? definition.join(", ") : definition}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Add Button */}
            <TouchableOpacity style={styles.addButton} onPress={() => setPopupVisible(true)}>
                <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>

            {/* Popup */}
            <AddDefinitionPopup
                visible={isPopupVisible}
                onClose={() => setPopupVisible(false)}
                onSubmit={onAddDefinition} // calls parent handler
                selectedText={selectedText}
                translatedText={translatedText}
                definitions={definitions}
                nat_id={nat_id}
                tar_id={tar_id}
                popup={popup}
                server={server}
                token={token}
                showSuccess={showSuccess}
                showError={showError}
            />

            {isEditVisible && (
                <EditDefinitionPopup
                    visible={isEditVisible}
                    Definition={wordCursor}
                    translationID={translationID}
                    server={server}
                    token={token}
                    showSuccess={showSuccess}
                    showError={showError}
                    onCancel={() => setEditVisible(false)}
                    onUpdated={(id, def) => {
                        onDefinitionUpdated?.(id, def);
                        onRefreshTranslation?.(selectedText);
                    }}
                />
            )}

        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        height: 160,
        borderWidth: 1,
        borderColor: '#ccc',
        borderRadius: 8,
        overflow: 'hidden',
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 5,
    },
    wordWrapper: {
        backgroundColor: '#00adb5',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginVertical: 4,
        borderRadius: 5,
        width: '100%',
        alignSelf: 'stretch',
    },
    wordText: {
        color: 'white',
        fontSize: 16,
    },
    addButton: {
        backgroundColor: '#0077b6',
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
});
