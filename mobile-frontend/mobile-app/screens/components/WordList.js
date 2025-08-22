// WordList.js
import React, { useState, useEffect } from 'react';
import { ScrollView, Text, TouchableOpacity, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AddWordPopup from './AddWordPopup';
import EditWordPopup from './EditWordPopup';

export default function WordList({ words = [], onWordPress, onAddWord, translatedText, selectedText, nat_id, tar_id, popup }) {
    const [isPopupVisible, setPopupVisible] = useState(false);
    const [isEditVisible, setEditVisible] = useState(false);
    const [wordCursor, setWordCursor] = useState('')

    useEffect(() => {
        console.log(`Word List translated text ${words}`)
        console.log(`Word Cursor ${wordCursor}`)
    })


    const editClickedWord = (word) => {
        const wordAsString = Array.isArray(word) ? word.join(", ") : String(word);
        setWordCursor(wordAsString);
        setEditVisible(true);
    };

    return (
        <View style={styles.wrapper}>
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={true}
            >
                {words.map((word, index) => (
                    <TouchableOpacity
                        key={index}
                        onPress={() => editClickedWord(word)}
                        style={styles.wordWrapper}

                    >
                        <Text style={styles.wordText}>
                            {Array.isArray(word) ? word.join(", ") : word}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Add Button */}
            <TouchableOpacity style={styles.addButton} onPress={() => setPopupVisible(true)}>
                <Ionicons name="add" size={24} color="white" />
            </TouchableOpacity>

            {/* Popup */}
            <AddWordPopup
                visible={isPopupVisible}
                onClose={() => setPopupVisible(false)}
                onSubmit={onAddWord} // calls parent handler
                selectedText={selectedText}
                translatedText={translatedText}
                words={words}
                nat_id={nat_id}
                tar_id={tar_id}
                popup={popup}
            />

            {isEditVisible && (
                <EditWordPopup
                    visible={isEditVisible}
                    word={wordCursor}
                    onSave={(newWord) => {
                        // handle saving here (update parent state or DB)
                        console.log("Saved word:", newWord);
                        setEditVisible(false);
                    }}
                    onCancel={() => setEditVisible(false)}
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
