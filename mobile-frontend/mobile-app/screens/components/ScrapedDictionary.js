import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';

const ScrapedDictionary = ({ dictionaryEntry  }) => {
    const [openPhrases, setOpenPhrases] = useState(true);
    const [openExamples, setOpenExamples] = useState(true);

    if (!dictionaryEntry ) {
        return (
            <View style={styles.scrapedNotFound}>
                <Text style={styles.scrapedNotFoundText}>
                    No scraped dictionary data found.
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.scrapedContainer}>

            {/* ============================================================
                WORD HEADER
            ============================================================ */}

            <View style={styles.scrapedWordHeader}>
                <Text style={styles.scrapedWord}>
                    {dictionaryEntry.word}
                </Text>

                {dictionaryEntry.pronunciation ? (
                    <Text style={styles.scrapedPronunciation}>
                        {dictionaryEntry.pronunciation}
                    </Text>
                ) : null}
            </View>


            {/* ============================================================
                PARTS OF SPEECH
            ============================================================ */}

            {dictionaryEntry.parts_of_speech?.map((part, index) => (
                <View
                    key={index}
                    style={styles.scrapedPartOfSpeech}
                >
                    <View style={styles.scrapedPosHeader}>

                        <Text style={styles.scrapedPosName}>
                            {part.part_of_speech}
                        </Text>

                        {part.abbreviation ? (
                            <View style={styles.scrapedPosAbbreviation}>
                                <Text style={styles.scrapedPosAbbreviationText}>
                                    {part.abbreviation}
                                </Text>
                            </View>
                        ) : null}

                    </View>


                    <View style={styles.scrapedDefinitions}>

                        {part.dictionaryEntry?.map((definition, definitionIndex) => (
                            <View
                                key={definitionIndex}
                                style={styles.scrapedDefinition}
                            >
                                <View style={styles.scrapedDefinitionNumber}>
                                    <Text style={styles.scrapedDefinitionNumberText}>
                                        {definitionIndex + 1}
                                    </Text>
                                </View>

                                <Text style={styles.scrapedDefinitionText}>
                                    {definition}
                                </Text>
                            </View>
                        ))}

                    </View>
                </View>
            ))}


            {/* ============================================================
                PHRASES
            ============================================================ */}

            {dictionaryEntry.phrases?.length > 0 && (
                <View style={styles.scrapedSection}>

                    <TouchableOpacity
                        style={styles.scrapedSectionHeader}
                        onPress={() => setOpenPhrases(!openPhrases)}
                    >
                        <Text style={styles.scrapedSectionHeaderText}>
                            Phrases
                        </Text>

                        <Text style={styles.scrapedSectionArrow}>
                            {openPhrases ? '▼' : '▶'}
                        </Text>
                    </TouchableOpacity>

                    {openPhrases && (
                        <View style={styles.scrapedSectionContent}>

                            {dictionaryEntry.phrases.map((phrase, index) => (
                                <View
                                    key={index}
                                    style={styles.scrapedPhraseItem}
                                >
                                    <Text style={styles.scrapedPhraseSource}>
                                        {phrase.source || phrase.phrase || ''}
                                    </Text>

                                    <Text style={styles.scrapedPhraseArrow}>
                                        →
                                    </Text>

                                    <Text style={styles.scrapedPhraseTranslation}>
                                        {phrase.translation || ''}
                                    </Text>
                                </View>
                            ))}

                        </View>
                    )}

                </View>
            )}


            {/* ============================================================
                EXAMPLES
            ============================================================ */}

            {dictionaryEntry.examples?.length > 0 && (
                <View style={styles.scrapedSection}>

                    <TouchableOpacity
                        style={styles.scrapedSectionHeader}
                        onPress={() => setOpenExamples(!openExamples)}
                    >
                        <Text style={styles.scrapedSectionHeaderText}>
                            Examples
                        </Text>

                        <Text style={styles.scrapedSectionArrow}>
                            {openExamples ? '▼' : '▶'}
                        </Text>
                    </TouchableOpacity>

                    {openExamples && (
                        <View style={styles.scrapedSectionContent}>

                            {dictionaryEntry.examples.map((example, index) => (
                                <View
                                    key={index}
                                    style={styles.scrapedExampleItem}
                                >
                                    <Text style={styles.scrapedExampleSource}>
                                        {example.source || example.example || ''}
                                    </Text>

                                    {example.translation ? (
                                        <Text style={styles.scrapedExampleTranslation}>
                                            {example.translation}
                                        </Text>
                                    ) : null}
                                </View>
                            ))}

                        </View>
                    )}

                </View>
            )}

        </View>
    );
};

const styles = StyleSheet.create({
    scrapedContainer: {
        width: '100%',
        backgroundColor: '#242938',
        borderRadius: 14,
        overflow: 'hidden',
    },

    scrapedWordHeader: {
        padding: 28,
        borderBottomWidth: 1,
        borderBottomColor: '#2c3244',
        backgroundColor: '#242938',
    },

    scrapedWord: {
        fontSize: 38,
        lineHeight: 44,
        fontWeight: '700',
        color: '#ffffff',
    },

    scrapedPronunciation: {
        marginTop: 8,
        fontSize: 17,
        color: '#9da5b5',
    },

    scrapedPartOfSpeech: {
        padding: 24,
        borderBottomWidth: 1,
        borderBottomColor: '#2c3244',
    },

    scrapedPosHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 17,
    },

    scrapedPosName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#ffffff',
    },

    scrapedPosAbbreviation: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 5,
        backgroundColor: '#2c3244',
    },

    scrapedPosAbbreviationText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#9da5b5',
    },

    scrapedDefinitions: {
        flexDirection: 'column',
        gap: 13,
    },

    scrapedDefinition: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },

    scrapedDefinitionNumber: {
        flexShrink: 0,
        width: 24,
        height: 24,
        marginTop: 1,
        borderRadius: 12,
        backgroundColor: '#1b3b40',
        alignItems: 'center',
        justifyContent: 'center',
    },

    scrapedDefinitionNumberText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#00b8c4',
    },

    scrapedDefinitionText: {
        flex: 1,
        fontSize: 16,
        lineHeight: 25,
        color: '#d9dde5',
    },

    scrapedSection: {
        borderBottomWidth: 1,
        borderBottomColor: '#2c3244',
    },

    scrapedSectionHeader: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        backgroundColor: '#242938',
    },

    scrapedSectionHeaderText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#ffffff',
    },

    scrapedSectionArrow: {
        fontSize: 12,
        color: '#9da5b5',
    },

    scrapedSectionContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#242938',
    },

    scrapedPhraseItem: {
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: '#2c3244',
    },

    scrapedPhraseSource: {
        fontSize: 15,
        fontWeight: '600',
        color: '#d9dde5',
    },

    scrapedPhraseArrow: {
        marginVertical: 3,
        fontSize: 18,
        color: '#00b8c4',
    },

    scrapedPhraseTranslation: {
        fontSize: 15,
        color: '#9da5b5',
    },

    scrapedExampleItem: {
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#2c3244',
    },

    scrapedExampleSource: {
        fontSize: 16,
        fontWeight: '600',
        lineHeight: 24,
        color: '#d9dde5',
    },

    scrapedExampleTranslation: {
        marginTop: 5,
        fontSize: 15,
        lineHeight: 23,
        color: '#9da5b5',
    },

    scrapedNotFound: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    scrapedNotFoundText: {
        fontSize: 16,
        color: '#9da5b5',
    },

})

export default ScrapedDictionary;