import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';

import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';

const CHANNELS = [
  {
    id: '1',
    name: 'radijas',
    url: 'https://stream-live.lrt.lt/radijas/stream03/streamPlaylist.m3u8',
  },
  {
    id: '2',
    name: 'opus',
    url: 'https://stream-live.lrt.lt/opus/stream03/streamPlaylist.m3u8',
  },
  {
    id: '3',
    name: 'klasika',
    url: 'https://stream-live.lrt.lt/klasika/stream03/streamPlaylist.m3u8',
  },
];

function Player({ source }) {
  const player = useVideoPlayer(source, (player) => {
    player.play();
    player.timeUpdateEventInterval = 0.25;
  });

  const { currentTime = 0 } = useEvent(player, 'timeUpdate', {
    currentTime: 0,
  });

  const { status } = useEvent(player, 'statusChange', {
    status: player.status,
  });

  const formatTime = (seconds = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <View>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        allowsPictureInPicture
      />

      <View style={styles.controls}>
        <Pressable
          style={styles.button}
          onPress={() => {
            if (player.playing) {
              player.pause();
            } else {
              player.play();
            }
          }}
        >
          <Text style={styles.buttonText}>
            {player.playing ? 'Pause' : 'Play'}
          </Text>
        </Pressable>

        <Text style={styles.time}>
          {formatTime(currentTime)}
        </Text>
      </View>
    </View>
  );
}

export default function LiveTVPlayer() {
  const [selectedChannel, setSelectedChannel] = useState(CHANNELS[0]);

  return (
    <FlatList
      data={CHANNELS}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      ListHeaderComponent={
        <>
          <Text style={styles.heading}>Live TV Demo</Text>

          <Player
            key={selectedChannel.url}
            source={selectedChannel.url}
          />

          <Text style={styles.channelTitle}>Channels</Text>
        </>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[
            styles.channelButton,
            selectedChannel.id === item.id && styles.selectedChannel,
          ]}
          onPress={() => setSelectedChannel(item)}
        >
          <Text style={styles.channelText}>{item.name}</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 15,
    backgroundColor: '#111',
  },

  heading: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 15,
  },

  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: 'black',
    borderRadius: 8,
  },

  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    justifyContent: 'space-between',
  },

  button: {
    backgroundColor: '#1976d2',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 6,
  },

  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },

  time: {
    color: 'white',
    fontSize: 16,
  },

  channelTitle: {
    color: 'white',
    fontSize: 20,
    marginTop: 25,
    marginBottom: 10,
  },

  channelButton: {
    padding: 12,
    backgroundColor: '#222',
    marginBottom: 8,
    borderRadius: 6,
  },

  selectedChannel: {
    backgroundColor: '#1976d2',
  },

  channelText: {
    color: 'white',
    fontSize: 16,
  },
});