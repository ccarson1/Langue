import React, { useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    Switch,
    StyleSheet,
} from 'react-native';

import Slider from '@react-native-community/slider';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

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
}) {

    const [expanded, setExpanded] = useState(false);

    const slideAnim = useRef(new Animated.Value(35)).current;

    const toggleMenu = () => {

        Animated.timing(slideAnim, {
            toValue: expanded ? 35 : 260,
            duration: 250,
            useNativeDriver: false,
        }).start();

        setExpanded(!expanded);
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    height: slideAnim,
                },
            ]}
        >

            <TouchableOpacity
                style={styles.handle}
                onPress={toggleMenu}
            >
                <MaterialIcons
                    name={expanded ? "keyboard-arrow-down" : "keyboard-arrow-up"}
                    size={30}
                    color="white"
                />
            </TouchableOpacity>

            {expanded && (
                <View style={[styles.content, !showToggles && styles.contentNoToggles]} >

                    {/* LEFT SIDE - SLIDERS */}
                    <View style={[styles.leftColumn, !showToggles && styles.fullWidthColumn]} >

                        {/* Volume */}
                        <View style={styles.sliderCard}>
                            <Text style={styles.label}>
                                Volume
                            </Text>

                            <Text style={styles.value}>
                                {Math.round(volume * 100)}%
                            </Text>

                            <Slider
                                style={styles.slider}
                                minimumValue={0}
                                maximumValue={1}
                                value={volume}
                                onValueChange={setVolume}
                            />
                        </View>

                        {/* Playback Speed */}
                        <View style={styles.sliderCard}>
                            <Text style={styles.label}>
                                Speed
                            </Text>

                            <Text style={styles.value}>
                                {playbackRate.toFixed(1)}x
                            </Text>

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

                    {/* RIGHT SIDE - TOGGLES */}
                    {showToggles && (
                        <View style={styles.rightColumn}>

                            <View style={styles.toggleCard}>
                                <Text style={styles.label}>Repeat</Text>
                                <Switch
                                    value={repeat}
                                    onValueChange={setRepeat}
                                />
                            </View>

                            <View style={styles.toggleCard}>
                                <Text style={styles.label}>Repeat All</Text>
                                <Switch
                                    value={repeatAll}
                                    onValueChange={setRepeatAll}
                                />
                            </View>

                            <View style={styles.toggleCard}>
                                <Text style={styles.label}>Shuffle</Text>
                                <Switch
                                    value={shuffle}
                                    onValueChange={setShuffle}
                                />
                            </View>

                        </View>
                    )}

                </View>
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
        //backgroundColor: 'rgb(57, 62, 70)',
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

    content: {
        flex: 1,
        flexDirection: 'row',
        paddingHorizontal: 10,
        paddingBottom: 14,
        gap: 10,
    },

    leftColumn: {
        flex: 1.9,
    },

    rightColumn: {
        flex: 1,
        justifyContent: 'space-between',
    },

    sliderCard: {
        // backgroundColor: '#1c1c1c',
        // borderRadius: 16,
        padding: 10,
        marginBottom: 10,
    },

    toggleCard: {
        // backgroundColor: '#1c1c1c',
        // borderRadius: 16,
        // padding: 5,
        paddingHorizontal: 5,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',

        minHeight: 20,
    },

    label: {
        color: 'white',
        fontSize: 12,
        marginBottom: 3,
    },

    value: {
        color: '#aaa',
        marginBottom: 3,
        fontSize: 12,
    },

    slider: {
        width: '100%',
        height: 12,
    },
    contentNoToggles: {
        flexDirection: 'column',
    },

    fullWidthColumn: {
        flex: 1,
    },
});