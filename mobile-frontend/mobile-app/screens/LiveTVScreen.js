import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  TextInput,
  Animated,
  ImageBackground
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
// import { VideoView, useVideoPlayer } from 'expo-video';
import { useEvent } from 'expo';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import VideoReader from './components/VideoReader';

const { width } = Dimensions.get('window');



async function getM3U8Metadata(url) {
  const res = await fetch(url);
  const text = await res.text();

  const lines = text.split('\n');

  const metadata = {
    variants: [],
    segments: [],
    tags: [],
  };

  for (const line of lines) {
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      metadata.variants.push(line);
    }

    if (line.startsWith('#EXTINF')) {
      metadata.segments.push(line);
    }

    if (line.startsWith('#EXT-X-')) {
      metadata.tags.push(line);
    }
  }

  return metadata;
}



// function Player({ source }) {
//   const player = useVideoPlayer(source, (player) => {
//     player.play();
//     player.timeUpdateEventInterval = 0.25;
//   });

//   const { currentTime = 0 } = useEvent(player, 'timeUpdate', {
//     currentTime: 0,
//   });

//   const formatTime = (seconds = 0) => {
//     const mins = Math.floor(seconds / 60);
//     const secs = Math.floor(seconds % 60);
//     return `${mins}:${secs.toString().padStart(2, '0')}`;
//   };

//   return (
//     <View style={styles.playerWrapper}>
//       <VideoView style={styles.video} player={player} />

//       <View style={styles.overlay}>
//         <Pressable
//           style={styles.playButton}
//           onPress={() => {
//             player.playing ? player.pause() : player.play();
//           }}
//         >
//           <Text style={styles.playText}>
//             {player.playing ? 'Pause' : 'Play'}
//           </Text>
//         </Pressable>

//         <Text style={styles.time}>{formatTime(currentTime)}</Text>
//       </View>
//     </View>
//   );
// }

export default function LiveTVPlayer({ navigation }) {
  const [token, setToken] = useState(null);
  const [serverIP, setServerIP] = useState('');
  const [recording, setRecording] = useState(false);
  const [recordingId, setRecordingId] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [user, setUser] = useState(null);
  const [metadata, setMetadata] = useState(null);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recordings, setRecordings] = useState([]);
  const [nativeLanguage, setNativeLanguage] = useState('');
  const [targetLanguage, setTargetLanguage] = useState('');

  const favoriteChannels = React.useMemo(
    () => channels.filter(c => c.is_favorite),
    [channels]
  );

  const decodeToken = (token) => {
    try {
      return jwtDecode(token);
    } catch (err) {
      console.error('Token decode failed:', err);
      return null;
    }
  };

  useEffect(() => {
    const init = async () => {
      try {

        const ip = await getServerIP();
        setServerIP(ip);

        const storedToken = await AsyncStorage.getItem('accessToken');
        if (storedToken) {
          setToken(storedToken);
          const decoded = decodeToken(storedToken);
          if (decoded) setUser(decoded);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    };
    init();
  }, []);



  useEffect(() => {
    const loadChannels = async () => {
      try {
        setLoading(true);

        const ip = await getServerIP();
        setServerIP(ip);

        const storedToken = await AsyncStorage.getItem('accessToken');

        const res = await fetch(`http://${ip}:8000/api/channels/`, {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        const data = await res.json();

        setChannels(data);

        console.log("FIRST CHANNEL:", data[0]);

        // IMPORTANT: set default selected channel safely
        if (data.length > 0) {
          setSelectedChannel(data[0]);
        }

      } catch (err) {
        console.error("Failed to load channels:", err);
      } finally {
        setLoading(false);
      }
    };

    loadChannels();
  }, []);

  useEffect(() => {
    if (!selectedChannel?.url) return;

    const loadMetadata = async () => {
      try {
        const data = await getM3U8Metadata(selectedChannel.url);
        setMetadata(data);
      } catch (err) {
        console.error('Metadata fetch failed:', err);
      }
    };

    loadMetadata();
  }, [selectedChannel]);

  const loadRecordings = async () => {
    try {
      const ip = await getServerIP();
      const storedToken = await AsyncStorage.getItem("accessToken");

      const res = await fetch(`http://${ip}:8000/api/recordings/`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      const data = await res.json();
      console.log("Recordings:", data)

      setRecordings(data);

    } catch (err) {
      console.error("Failed to load recordings:", err);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const ip = await getServerIP();
      const storedToken = await AsyncStorage.getItem("accessToken");

      const res = await fetch(`http://${ip}:8000/api/settings/`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      const settings = await res.json();

      setNativeLanguage(settings.native_language);
      setTargetLanguage(settings.target_language);
    };

    loadSettings();
  }, []);

  useEffect(() => {
    let loop;

    if (recording) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );

      loop.start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => loop && loop.stop();
  }, [recording]);

  const API_BASE = `http://${serverIP}:8000`;

  const getAuthHeaders = () => ({
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const startRecording = async () => {
    try {
      setRecording(true);

      const res = await fetch(`${API_BASE}/api/record/start/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          url: selectedChannel.url,
          channel_id: selectedChannel.id,
          language_id: targetLanguage
        }),
      });

      const data = await res.json();

      setRecordingId(data.recording_id);

    } catch (err) {
      console.error("Start recording failed:", err);
      setRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingId) return;

      console.log("language_ID:", targetLanguage)

      const res = await fetch(`${API_BASE}/api/record/stop/`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recording_id: recordingId,
          channel_id: selectedChannel.id,
          language_id: targetLanguage,
        }),
      });

      console.log("language_ID:", targetLanguage)

      const data = await res.json();

      console.log("Saved video URL:", data.file_url);

      setRecording(false);
      setRecordingId(null);

    } catch (err) {
      console.error("Stop recording failed:", err);
    }
  };



  if (loading || !selectedChannel) {
    return (
      <View style={{ flex: 1, backgroundColor: '#222831', justifyContent: 'center', alignItems: 'center' }}>
        <Text style={{ color: 'white' }}>Loading channels...</Text>
      </View>
    );
  }

  return (

    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* HERO SECTION (Netflix featured style) */}
        <Text style={styles.logo}>LIVE TV</Text>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()}>
          <AntDesign name="left" size={22} color="white" />
        </TouchableOpacity>
        {/* <Player key={selectedChannel.url} source={selectedChannel.url} /> */}
        
        <VideoReader selectedChannel={selectedChannel}></VideoReader>

        <TouchableOpacity
          onPress={recording ? stopRecording : startRecording}
          style={[
            styles.recordButton,
            recording && styles.recordingActive,
          ]}
        >
          <Animated.View
            style={[
              styles.recordDot,
              recording && { transform: [{ scale: pulseAnim }] },
            ]}
          />

          <Text style={styles.recordText}>
            {recording ? "STOP" : "REC"}
          </Text>
        </TouchableOpacity>

        {metadata && (
          <View style={{ padding: 10 }}>
            <Text style={{ color: 'white', fontWeight: 'bold' }}>
              Stream Info
            </Text>

            <Text style={{ color: '#ccc' }}>
              Segments: {metadata.segments.length}
            </Text>

            <Text style={{ color: '#ccc' }}>
              Tags: {metadata.tags.slice(0, 5).join('\n')}
            </Text>
          </View>
        )}

        <View>
          <Text style={styles.sectionTitle}>
            Add Channel
          </Text>
          <View style={styles.row}>
            <TextInput style={styles.TvInput} />

            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Add Channel</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Favorites</Text>

        {/* Horizontal Netflix-style row */}
        <FlatList
          data={favoriteChannels}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => {
            const active = selectedChannel.id === item.id;

            return (
              <Pressable
                onPress={() => setSelectedChannel(item)}
                style={[
                  styles.card,
                  active && styles.cardActive,
                ]}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.cardGlow} />
              </Pressable>
            );
          }}
        />

        <Text style={styles.sectionTitle}>Channels</Text>

        {/* Horizontal Netflix-style row */}
        <FlatList
          data={channels}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => {
            const active = selectedChannel.id === item.id;

            return (
              <Pressable
                onPress={() => {
                  console.log(item);
                  setSelectedChannel(item);
                }}
                style={[
                  styles.card,
                  active && styles.cardActive,
                ]}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.cardGlow} />
              </Pressable>
            );
          }}
        />

        <Text style={styles.sectionTitle}>Most Liked</Text>

        {/* Horizontal Netflix-style row */}
        <FlatList
          data={[]}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => {
            const active = selectedChannel.id === item.id;

            return (
              <Pressable
                onPress={() => setSelectedChannel(item)}
                style={[
                  styles.card,
                  active && styles.cardActive,
                ]}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.cardGlow} />
              </Pressable>
            );
          }}
        />

        <Text style={styles.sectionTitle}>Newest</Text>

        {/* Horizontal Netflix-style row */}
        <FlatList
          data={[]}
          horizontal
          keyExtractor={(item) => item.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => {
            const active = selectedChannel.id === item.id;

            return (
              <Pressable
                onPress={() => setSelectedChannel(item)}
                style={[
                  styles.card,
                  active && styles.cardActive,
                ]}
              >
                <Text style={styles.cardTitle}>{item.name}</Text>
                <View style={styles.cardGlow} />
              </Pressable>
            );
          }}
        />

        <Text style={styles.sectionTitle}>Recordings</Text>

        {/* Horizontal Netflix-style row */}
        <FlatList
          data={recordings}
          horizontal
          keyExtractor={(item) => item.id.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => (

            <Pressable
              style={styles.card}
              onPress={() => {
                setSelectedChannel(item)
                console.log(item);
              }}
            >
              <ImageBackground
                source={{
                  uri: `http://${serverIP}:8000${item.record_img}`,
                }}
                style={styles.cardBackground}
                imageStyle={styles.cardImage}
              ></ImageBackground>
              <Text style={styles.cardTitle}>
                {item.title}
              </Text>

              <Text
                style={{
                  color: "#ccc",
                  fontSize: 12,
                  margin: 5,
                }}
              >
                {new Date(item.created_at).toLocaleDateString()}
              </Text>

            </Pressable>

          )}
        />

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222831',
    paddingTop: 30,
  },

  // Header (matches topSection feel)
  logo: {
    color: 'white',
    fontSize: 22,
    fontWeight: 'bold',
    fontFamily: 'PlaywriteHU-Regular',
    paddingHorizontal: 15,
    marginBottom: 10,
  },

  
  sectionTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 15,
    marginTop: 20,
    marginBottom: 10,
  },

  // Channel row container
  row: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    gap: 12,
  },

  // Channel cards (matches sideMenu + panels)
  card: {
    width: 220,
    height: 130,
    marginRight: 15,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: '#393e46',
  },
  cardBackground: {
    flex: 1,
    justifyContent: "flex-end",
    padding: 10,
  },

  // cardImage: {
  //   borderRadius: 10,
  // },

  cardActive: {
    backgroundColor: '#30475e',
    borderColor: '#00adb5',
    transform: [{ scale: 1.05 }],
  },

  cardTitle: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
    textShadowColor: "#000",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    margin: 5,
  },

  cardGlow: {
    position: 'absolute',
    bottom: 0,
    height: 25,
    width: '100%',
    backgroundColor: 'rgba(0, 173, 181, 0.15)',
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  backLink: {
    position: 'absolute',
    top: 0,
    right: 20,
    zIndex: 20,
  },
  TvInput: {
    flex: 1,                // takes remaining space
    backgroundColor: '#393e46',
    color: 'white',
    padding: 10,
    borderRadius: 6,
    marginRight: 10,        // spacing between input and button
  },

  button: {
    backgroundColor: '#00adb5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  buttonText: {
    color: '#222831',
    fontWeight: 'bold',
  },
  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#393e46',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
    gap: 8,
  },

  recordingActive: {
    backgroundColor: '#5a1a1a',
    borderWidth: 1,
    borderColor: '#ff3b3b',
  },

  recordDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ff3b3b',
  },

  recordText: {
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});