import React, { useEffect, useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, Pressable, } from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';


function Player({ source }) {
    const player = useVideoPlayer(source, (player) => {
        player.play();
        player.timeUpdateEventInterval = 0.25;
    });

    const { currentTime = 0 } = useEvent(player, 'timeUpdate', {
        currentTime: 0,
    });

    const formatTime = (seconds = 0) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <View style={styles.playerWrapper}>
            <VideoView style={styles.video} player={player} />

            <View style={styles.overlay}>
                <Pressable
                    style={styles.playButton}
                    onPress={() => {
                        player.playing ? player.pause() : player.play();
                    }}
                >
                    <Text style={styles.playText}>
                        {player.playing ? 'Pause' : 'Play'}
                    </Text>
                </Pressable>

                <Text style={styles.time}>{formatTime(currentTime)}</Text>
            </View>
        </View>
    );
}


export default function VideoReader({ selectedChannel }) {
    if (!selectedChannel?.url) {
        return null; // or a loading UI
    }

    return (
        <View>
            <Player key={selectedChannel.url} source={selectedChannel.url} />
        </View>
    );
}

const styles = StyleSheet.create({
    playerWrapper: {
        width: '100%',
        height: Platform.OS === 'web' ? 520 : 220,
        backgroundColor: '#30475e',
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#00adb5',
    },

    video: {
        width: '100%',
        height: '100%',
    },

    // Overlay controls (clean glass panel feel)
    overlay: {
        position: 'absolute',
        bottom: 10,
        left: 10,
        right: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    playButton: {
        backgroundColor: '#00adb5',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 6,

        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },

    playText: {
        color: '#222831',
        fontWeight: 'bold',
    },
    time: {
    color: 'white',
    fontSize: 14,
  },


});