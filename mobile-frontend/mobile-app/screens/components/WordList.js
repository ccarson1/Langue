// WordList.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function WordList({ words = [], onWordPress }) {
    if (!words || words.length === 0) return null;

    return (
        <View style={styles.container}>
            {words.map((word, index) => (
                <TouchableOpacity
                    key={index}
                    onPress={() => onWordPress(word)}
                    style={styles.wordWrapper}
                >
                    <Text style={styles.wordText}>{word}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginVertical: 10,
    },
    wordWrapper: {
        backgroundColor: '#00adb5',
        paddingHorizontal: 10,
        paddingVertical: 5,
        margin: 3,
        borderRadius: 5,
    },
    wordText: {
        color: 'white',
        fontSize: 14,
    },
});
