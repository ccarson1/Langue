import React, { useRef, useState, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    Switch,
    StyleSheet,
    ScrollView,
} from 'react-native';

import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import AudioWaveVisualizer from './AudioWaveVisualizer';
import PronunciationComponent from './PronunciationComponent';

export default function BottomAudioMenu({
    volume,
    setVolume,
    playbackRate,
    setPlaybackRate,
    repeat,
    setRepeat,
    repeatAll,
    setRepeatAll,
    shuffle,
    setShuffle,
    showToggles = true,
    showAudioVisualizer = false,
    lessonId = null,
    audioDurationMs = null,
    targetText = '',
}) {

    const [expanded, setExpanded] = useState(false);
    const [isPhraseMode, setIsPhraseMode] = useState(true);

    // Dynamic height
    const containerHeight = useMemo(() => {
        let height = 260;

        if (showAudioVisualizer) height += 160;
        if (targetText) height += 240;

        return Math.min(height, 620); // Cap max height
    }, [showAudioVisualizer, targetText]);

    const slideAnim = useRef(new Animated.Value(35)).current;

    const toggleMenu = () => {
        Animated.timing(slideAnim, {
            toValue: expanded ? 35 : containerHeight,
            duration: 300,
            useNativeDriver: false,
        }).start();

        setExpanded(!expanded);
    };

    return (
        <Animated.View style={[styles.container, { height: slideAnim }]}>
            <TouchableOpacity style={styles.handle} onPress={toggleMenu}>
                <MaterialIcons
                    name={expanded ? "keyboard-arrow-down" : "keyboard-arrow-up"}
                    size={30}
                    color="white"
                />
            </TouchableOpacity>

            {expanded && (
                <ScrollView 
                    style={styles.scrollContent}
                    contentContainerStyle={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.mainRow}>

                        {/* LEFT: Sliders */}
                        <View style={styles.leftColumn}>
                            <View style={styles.sliderCard}>
                                <Text style={styles.label}>Volume</Text>
                                <Text style={styles.value}>{Math.round(volume * 100)}%</Text>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={0}
                                    maximumValue={1}
                                    value={volume}
                                    onValueChange={setVolume}
                                />
                            </View>

                            <View style={styles.sliderCard}>
                                <Text style={styles.label}>Speed</Text>
                                <Text style={styles.value}>{playbackRate.toFixed(1)}x</Text>
                                <Slider
                                    style={styles.slider}
                                    minimumValue={0.5}
                                    maximumValue={2}
                                    step={0.1}
                                    value={playbackRate}
                                    onValueChange={setPlaybackRate}
                                />
                            </View>
                        </View>

                        {/* RIGHT: Toggles + Pronunciation */}
                        <View style={styles.rightColumn}>
                            {showToggles && (
                                <>
                                    <View style={styles.toggleCard}>
                                        <Text style={styles.label}>Repeat</Text>
                                        <Switch value={repeat} onValueChange={setRepeat} />
                                    </View>
                                    <View style={styles.toggleCard}>
                                        <Text style={styles.label}>Repeat All</Text>
                                        <Switch value={repeatAll} onValueChange={setRepeatAll} />
                                    </View>
                                    <View style={styles.toggleCard}>
                                        <Text style={styles.label}>Shuffle</Text>
                                        <Switch value={shuffle} onValueChange={setShuffle} />
                                    </View>
                                </>
                            )}

                            {targetText && (
                                <View style={styles.pronunciationSection}>
                                    <Text style={styles.sectionTitle}>Pronunciation Practice</Text>

                                    <View style={styles.modeToggleContainer}>
                                        <Text style={styles.toggleLabel}>Word</Text>
                                        <Switch
                                            trackColor={{ false: '#555', true: '#00adb5' }}
                                            thumbColor={isPhraseMode ? '#eeeeee' : '#222831'}
                                            onValueChange={setIsPhraseMode}
                                            value={isPhraseMode}
                                        />
                                        <Text style={styles.toggleLabel}>Phrase</Text>
                                    </View>

                                    <PronunciationComponent
                                        targetText={targetText}
                                        isPhraseMode={isPhraseMode}
                                    />
                                </View>
                            )}
                        </View>
                    </View>

                    {/* FULL WIDTH AUDIO VISUALIZER */}
                    {showAudioVisualizer && (
                        <View style={styles.visualizerContainer}>
                            <Text style={styles.label}>Audio Visualizer</Text>
                            <AudioWaveVisualizer
                                lessonId={lessonId}
                                durationMs={audioDurationMs}
                                volume={volume}
                                playbackRate={playbackRate}
                            />
                        </View>
                    )}
                </ScrollView>
            )}
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgb(48, 71, 94)',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        overflow: 'hidden',
        zIndex: 999,
    },
    handle: {
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 12,
        paddingBottom: 20,
        gap: 12,
    },
    mainRow: {
        flexDirection: 'row',
        gap: 12,
    },
    leftColumn: {
        flex: 1.35,
    },
    rightColumn: {
        flex: 1,
        gap: 10,
    },
    sliderCard: { 
        padding: 8, 
        marginBottom: 8 
    },
    toggleCard: {
        paddingHorizontal: 8,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: 36,
    },
    label: {
        color: 'white',
        fontSize: 13,
        marginBottom: 4,
    },
    value: {
        color: '#aaa',
        marginBottom: 4,
        fontSize: 13,
    },
    slider: { 
        width: '100%', 
        height: 14 
    },

    /* Pronunciation */
    pronunciationSection: {
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#55677f',
    },
    sectionTitle: {
        color: '#eeeeee',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 10,
    },
    modeToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 12,
        backgroundColor: '#2c3a4a',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 30,
    },
    toggleLabel: {
        color: '#eeeeee',
        fontSize: 15,
        fontWeight: '500',
    },

    /* Visualizer */
    visualizerContainer: {
        width: '100%',
        marginTop: 8,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#55677f',
    },
});