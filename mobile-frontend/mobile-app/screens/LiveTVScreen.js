import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  Platform,
  ScrollView,
  Switch,
  TextInput,
  Animated,
  ImageBackground,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { jwtDecode } from 'jwt-decode';
import { useEvent } from 'expo';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import VideoReader from './components/VideoReader';
import * as DocumentPicker from 'expo-document-picker';
import CustomPopup from './components/CustomPopup';
import TagPopup from './components/TagPopup';


// Screens at or above this width get the side-by-side video / info layout.
// Below it, everything stacks in a single column for phones and narrow web views.
const WIDE_LAYOUT_BREAKPOINT = 900;
// Print ALL available names for AntDesign

// Shared palette — kept consistent with the VideoReader/Player component
const COLORS = {
  background: '#1b1f2a',
  surface: '#242938',
  surfaceRaised: '#2c3244',
  accent: '#00b8c4',
  accentDark: '#009aa5',
  danger: '#ff4d4d',
  dangerDark: '#5a1a1a',
  text: '#f5f7fa',
  textMuted: 'rgba(245, 247, 250, 0.65)',
  border: 'rgba(245, 247, 250, 0.08)',
};

const formatDuration = (seconds) => {
  if (!seconds) return '0:00';

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

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

/**
 * Horizontal FlatList wrapper that adds left/right arrow buttons for
 * scrolling through overflow content. Arrows auto-hide at the start/end
 * of the list and whenever the content doesn't overflow the container.
 */
function ScrollableRow({
  title,
  data,
  renderItem,
  keyExtractor,
  emptyText,
  scrollAmount = 320,
}) {
  const listRef = useRef(null);
  const [scrollX, setScrollX] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);

  const maxScroll = Math.max(0, contentWidth - containerWidth);
  const canScrollLeft = scrollX > 4;
  const canScrollRight = scrollX < maxScroll - 4;
  const isScrollable = maxScroll > 4;

  const scrollBy = (amount) => {
    const nextX = Math.min(Math.max(scrollX + amount, 0), maxScroll);
    listRef.current?.scrollToOffset({ offset: nextX, animated: true });
  };

  return (
    <View style={styles.rowSection}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}

      <View
        style={styles.rowContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        <FlatList
          ref={listRef}
          data={data}
          horizontal
          keyExtractor={keyExtractor}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={renderItem}
          scrollEventThrottle={16}
          onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
          onContentSizeChange={(w) => setContentWidth(w)}
          ListEmptyComponent={
            emptyText ? (
              <View style={styles.emptyRow}>
                <Text style={styles.emptyRowText}>{emptyText}</Text>
              </View>
            ) : null
          }
        />

        {isScrollable && canScrollLeft && (
          <Pressable
            onPress={() => scrollBy(-scrollAmount)}
            style={({ hovered, pressed }) => [
              styles.scrollArrow,
              styles.scrollArrowLeft,
              hovered && styles.scrollArrowHovered,
              pressed && styles.scrollArrowPressed,
            ]}
          >
            <AntDesign name="left" size={16} color={COLORS.text} />
          </Pressable>
        )}

        {isScrollable && canScrollRight && (
          <Pressable
            onPress={() => scrollBy(scrollAmount)}
            style={({ hovered, pressed }) => [
              styles.scrollArrow,
              styles.scrollArrowRight,
              hovered && styles.scrollArrowHovered,
              pressed && styles.scrollArrowPressed,
            ]}
          >
            <AntDesign name="right" size={16} color={COLORS.text} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

function ChannelCard({ item, active, onPress, imageSource }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ hovered, pressed }) => [
        styles.card,
        active && styles.cardActive,
        hovered && styles.cardHovered,
        pressed && styles.cardPressed,
      ]}
    >
      <ImageBackground
        source={imageSource}
        style={styles.cardBackground}
        imageStyle={styles.cardImage}
      >
        <View style={styles.cardOverlay} />
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.name}
        </Text>
      </ImageBackground>
    </Pressable>
  );
}

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
  const [recordingSelected, setRecordingSelected] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelUrl, setNewChannelUrl] = useState('');
  const [addingChannel, setAddingChannel] = useState(false);
  const [channelImage, setChannelImage] = useState(null);
  const [nameFocused, setNameFocused] = useState(false);
  const [urlFocused, setUrlFocused] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeletePopup, setShowDeletePopup] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [isPublic, setIsPublic] = useState(false);
  const [showTagPopup, setShowTagPopup] = useState(false);

  const { width } = useWindowDimensions();
  const isWideScreen = width >= WIDE_LAYOUT_BREAKPOINT;

  const [tags, setTags] = useState([]);
  const [allTags, setAllTags] = useState([]);

  const loadAllTags = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/tags/`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!res.ok) {
        throw new Error('Failed to load tags');
      }

      const data = await res.json();

      setAllTags(data);
    } catch (error) {
      console.error('Failed to load all tags:', error);
    }
  };

  const favoriteChannels = React.useMemo(
    () =>
      channels.filter(
        (c) =>
          c.is_favorite &&
          Number(c.owner_id) === Number(user.user_id)
      ),
    [channels, user]
  );

  const decodeToken = (token) => {
    try {
      return jwtDecode(token);
    } catch (err) {
      console.error('Token decode failed:', err);
      return null;
    }
  };


  const getTagTarget = () => {
    if (!selectedChannel?.id) {
      return null;
    }

    if (recordingSelected) {
      return {
        tagType: 'recording',
        objectId: selectedChannel.id,
      };
    }

    return {
      tagType: 'channel',
      objectId: selectedChannel.id,
    };
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
    if (!token || !serverIP) return;

    loadAllTags();
  }, [token, serverIP]);

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

        if (data.length > 0) {
          setSelectedChannel(data[0]);
        }
      } catch (err) {
        console.error('Failed to load channels:', err);
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


  const loadCurrentTags = async () => {
    const target = getTagTarget();

    if (!target) {
      setTags([]);
      return;
    }

    try {
      const res = await fetch(
        `${API_BASE}/api/tags/?tag_type=${target.tagType}&object_id=${target.objectId}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to load current tags:', data);
        setTags([]);
        return;
      }

      setTags(data);
    } catch (error) {
      console.error('Failed to load current tags:', error);
      setTags([]);
    }
  };



  useEffect(() => {
    if (!selectedChannel?.id || !token || !serverIP) {
      setTags([]);
      return;
    }

    loadCurrentTags();
  }, [selectedChannel, recordingSelected, token, serverIP]);

  const addTag = async (tag) => {
    const target = getTagTarget();

    if (!target) {
      return;
    }

    try {
      const body = {
        tag_type: target.tagType,
        object_id: target.objectId,
      };

      // Existing tag
      if (tag.id) {
        body.tag_id = tag.id;
      }

      // New tag
      else if (tag.name) {
        body.name = tag.name;
      }

      const res = await fetch(`${API_BASE}/api/tags/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to add tag:', data);
        return;
      }

      if (data.tag) {
        setTags((currentTags) => {
          const exists = currentTags.some(
            (existingTag) =>
              existingTag.id === data.tag.id
          );

          if (exists) {
            return currentTags;
          }

          return [...currentTags, data.tag];
        });

        // Keep the global list of available tags updated.
        setAllTags((currentTags) => {
          const exists = currentTags.some(
            (existingTag) =>
              existingTag.id === data.tag.id
          );

          if (exists) {
            return currentTags;
          }

          return [...currentTags, data.tag];
        });
      }
    } catch (error) {
      console.error('Add tag error:', error);
    }
  };


  const removeTag = async (tag) => {
    const target = getTagTarget();

    if (!target || !tag?.id) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tags/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          tag_type: target.tagType,
          object_id: target.objectId,
          tag_id: tag.id,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to remove tag:', data);
        return;
      }

      setTags((currentTags) =>
        currentTags.filter(
          (currentTag) =>
            currentTag.id !== tag.id
        )
      );
    } catch (error) {
      console.error('Remove tag error:', error);
    }
  };


  const loadRecordings = async () => {
    try {
      const ip = await getServerIP();
      const storedToken = await AsyncStorage.getItem('accessToken');

      const res = await fetch(`http://${ip}:8000/api/recordings/`, {
        headers: {
          Authorization: `Bearer ${storedToken}`,
        },
      });

      const data = await res.json();
      setRecordings(data);
    } catch (err) {
      console.error('Failed to load recordings:', err);
    }
  };

  useEffect(() => {
    loadRecordings();
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      const ip = await getServerIP();
      const storedToken = await AsyncStorage.getItem('accessToken');

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
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  const startRecording = async () => {
    try {
      setRecording(true);

      const res = await fetch(`${API_BASE}/api/record/start/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          url: selectedChannel.url,
          channel_id: selectedChannel.id,
          language_id: targetLanguage,
        }),
      });

      const data = await res.json();

      setRecordingId(data.recording_id);
    } catch (err) {
      console.error('Start recording failed:', err);
      setRecording(false);
    }
  };

  const stopRecording = async () => {
    try {
      if (!recordingId) return;

      const res = await fetch(`${API_BASE}/api/record/stop/`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          recording_id: recordingId,
          channel_id: selectedChannel.id,
          language_id: targetLanguage,
        }),
      });

      const data = await res.json();

      setRecording(false);
      setRecordingId(null);
      await loadRecordings();
    } catch (err) {
      console.error('Stop recording failed:', err);
    }
  };

  const deleteRecording = async (recordingId) => {

    try {
      setDeleting(true);
      const ip = await getServerIP();
      const token = await AsyncStorage.getItem('accessToken');

      const res = await fetch(
        `http://${ip}:8000/api/recordings/${recordingId}/`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        throw new Error('Failed to delete recording');
      }

      setRecordings((prev) => prev.filter((r) => r.id !== recordingId));
    } catch (err) {

      console.error(err);
      setDeleting(false);
    }
  };

  const confirmDeleteRecording = () => {
    setShowDeletePopup(true);
  };

  async function appendFileToFormData(formData, fieldName, file) {
    if (!file) return;

    if (Platform.OS === 'web') {
      if (file.file instanceof File) {
        formData.append(fieldName, file.file);
        return;
      }

      const response = await fetch(file.uri);
      const blob = await response.blob();

      formData.append(fieldName, blob, file.name);
      return;
    }

    formData.append(fieldName, {
      uri: file.uri,
      name: file.name,
      type: file.mimeType || 'application/octet-stream',
    });
  }

  const handleChannelImagePick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets?.length > 0) {
        setChannelImage(result.assets[0]);
      }
    } catch (error) {
      console.error('Channel image pick error:', error);
    }
  };

  const addChannel = async () => {
    if (!newChannelName.trim()) {
      console.log('Channel name is required');
      return;
    }

    if (!newChannelUrl.trim()) {
      console.log('Channel URL is required');
      return;
    }

    try {
      setAddingChannel(true);

      const formData = new FormData();

      formData.append('channel_name', newChannelName.trim());
      formData.append('channel_url', newChannelUrl.trim());

      if (channelImage) {
        await appendFileToFormData(formData, 'channel_img', channelImage);
      }

      const res = await fetch(`${API_BASE}/api/channels/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
        },
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to add channel:', data);
        return;
      }

      setChannels((prev) => [...prev, data]);
      setSelectedChannel(data);

      setNewChannelName('');
      setNewChannelUrl('');
      setChannelImage(null);
    } catch (error) {
      console.error('Add channel error:', error);
    } finally {
      setAddingChannel(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingText}>Loading channels…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={({ hovered, pressed }) => [
              styles.backButton,
              hovered && styles.backButtonHovered,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => navigation.goBack()}
          >
            <AntDesign name="left" size={18} color={COLORS.text} />
          </Pressable>

          <Text style={styles.logo}>Live TV</Text>

          <View style={styles.headerSpacer} />
        </View>

        {/*
          Responsive layout: video sits in the left column with the info
          column (actions, stream info, add-channel) beside it once the
          screen is wide enough. Below the breakpoint everything stacks
          in a single column, in the same order, for phones and narrow
          web views.
        */}
        <View
          style={[
            styles.playerLayout,
            isWideScreen && styles.playerLayoutWide,
          ]}
        >
          <View
            style={[
              styles.videoColumn,
              isWideScreen && styles.videoColumnWide,
            ]}
          >
            <VideoReader selectedChannel={selectedChannel} />
          </View>

          <View
            style={[
              styles.infoColumn,
              isWideScreen ? styles.infoColumnWide : styles.infoColumnStacked,
            ]}
          >
            <View style={styles.actionsBar}>
              <View style={styles.actionsLeft}>
                {!recordingSelected && (
                  <Pressable
                    onPress={recording ? stopRecording : startRecording}
                    style={({ hovered, pressed }) => [
                      styles.recordButton,
                      recording && styles.recordingActive,
                      hovered && styles.recordButtonHovered,
                      pressed && styles.recordButtonPressed,
                    ]}
                  >
                    <Animated.View
                      style={[
                        styles.recordDot,
                        recording && { transform: [{ scale: pulseAnim }] },
                      ]}
                    />
                    <Text style={styles.recordText}>
                      {recording ? 'STOP' : 'REC'}
                    </Text>
                  </Pressable>
                )}

                <View style={styles.reactionGroup}>
                  <Pressable
                    style={({ hovered }) => [
                      styles.iconButton,
                      hovered && styles.iconButtonHovered,
                    ]}
                  >
                    <AntDesign name="like" size={16} color={COLORS.text} />
                  </Pressable>
                  <Pressable
                    style={({ hovered }) => [
                      styles.iconButton,
                      hovered && styles.iconButtonHovered,
                    ]}
                  >
                    <AntDesign name="dislike" size={16} color={COLORS.text} />
                  </Pressable>
                  <Pressable
                    style={({ hovered }) => [
                      styles.iconButton,
                      hovered && styles.iconButtonHovered,
                    ]}
                  >
                    <AntDesign name="star" size={16} color={COLORS.text} />
                  </Pressable>
                  {console.log("USER:", user.user_id)}
                  {console.log("SELECTED CHANNEL:", selectedChannel.owner_id)}
                  {Number(selectedChannel.owner_id) === Number(user.user_id) && (
                    <View style={styles.toggleCard}>

                      <Text style={styles.label}>Public</Text>
                      <Switch value={isPublic} onValueChange={setIsPublic} />

                      <Pressable
                        style={({ hovered }) => [styles.iconButton, hovered && styles.iconButtonHovered,]} onPress={() => setShowTagPopup(true)} >
                        <AntDesign name="tags" size={16} color={COLORS.text} />
                      </Pressable>
                    </View>
                  )}



                </View>
              </View>

              {recordingSelected && (
                <View style={styles.actionsRight}>
                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.button,
                      hovered && styles.buttonHovered,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => {
                      let idToPass = null;

                      if (recordingId) {
                        idToPass = recordingId;
                      } else if (selectedChannel?.id) {
                        idToPass = selectedChannel.id;
                      }

                      if (!idToPass) {
                        Alert.alert('Error', 'No recording ID available');
                        return;
                      }

                      navigation.navigate('Import', {
                        recordId: idToPass,
                      });
                    }}
                  >
                    <Text style={styles.buttonText}>Create Lesson</Text>
                  </Pressable>

                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.buttonSecondary,
                      hovered && styles.buttonSecondaryHovered,
                      pressed && styles.buttonPressed,
                    ]}
                  >
                    <Text style={styles.buttonSecondaryText}>Crop Video</Text>
                  </Pressable>
                </View>
              )}
            </View>

            {metadata && (
              <View style={styles.streamInfo}>
                <Text style={styles.streamInfoTitle}>Stream Info</Text>
                <Text style={styles.streamInfoLine}>
                  Segments: {metadata.segments.length}
                </Text>
                {metadata.tags.length > 0 && (
                  <Text style={styles.streamInfoLine} numberOfLines={5}>
                    Tags: {metadata.tags.slice(0, 5).join('  •  ')}
                  </Text>
                )}
              </View>
            )}

            {/* ADD CHANNEL PANEL */}
            <View style={styles.panel}>
              <Text style={styles.panelTitle}>Add a Channel</Text>
              <Text style={styles.panelSubtitle}>
                Add a new stream by name and URL, with an optional
                thumbnail.
              </Text>

              <View
                style={[
                  styles.formRow,
                  isWideScreen && styles.formRowStacked,
                ]}
              >
                <TextInput
                  style={[styles.input, nameFocused && styles.inputFocused]}
                  placeholder="Channel name"
                  placeholderTextColor={COLORS.textMuted}
                  value={newChannelName}
                  onChangeText={setNewChannelName}
                  onFocus={() => setNameFocused(true)}
                  onBlur={() => setNameFocused(false)}
                />

                <TextInput
                  style={[styles.input, urlFocused && styles.inputFocused]}
                  placeholder="Channel URL (.m3u8)"
                  placeholderTextColor={COLORS.textMuted}
                  value={newChannelUrl}
                  onChangeText={setNewChannelUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setUrlFocused(true)}
                  onBlur={() => setUrlFocused(false)}
                />
              </View>

              <View style={styles.formActions}>
                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.buttonSecondary,
                    hovered && styles.buttonSecondaryHovered,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleChannelImagePick}
                >
                  <Text style={styles.buttonSecondaryText} numberOfLines={1}>
                    {channelImage
                      ? `Selected: ${channelImage.name}`
                      : 'Choose Thumbnail'}
                  </Text>
                </Pressable>

                <Pressable
                  style={({ hovered, pressed }) => [
                    styles.button,
                    hovered && styles.buttonHovered,
                    pressed && styles.buttonPressed,
                    addingChannel && styles.buttonDisabled,
                  ]}
                  onPress={addChannel}
                  disabled={addingChannel}
                >
                  <Text style={styles.buttonText}>
                    {addingChannel ? 'Adding…' : 'Add Channel'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>

        {/* ROWS */}
        <ScrollableRow
          title="Favorites"
          data={favoriteChannels}
          keyExtractor={(item) => item.id.toString()}
          emptyText="Mark channels as favorites to see them here."
          renderItem={({ item }) => (
            <ChannelCard
              item={item}
              active={selectedChannel.id === item.id}
              onPress={() => setSelectedChannel(item)}
              imageSource={item.image ? { uri: item.image } : undefined}
            />
          )}
        />

        <ScrollableRow
          title="Channels"
          data={channels}
          keyExtractor={(item) => item.id.toString()}
          emptyText="No channels yet — add one below."
          renderItem={({ item }) => (
            <ChannelCard
              item={item}
              active={selectedChannel.id === item.id}
              onPress={() => {
                setSelectedChannel(item);
                setRecordingSelected(false);
              }}
              imageSource={
                item.image
                  ? { uri: `${API_BASE}/media/${item.image}` }
                  : undefined
              }
            />
          )}
        />

        <ScrollableRow
          title="Most Liked Channels"
          data={[]}
          keyExtractor={(item) => item.id}
          emptyText="Nothing here yet."
          renderItem={({ item }) => (
            <ChannelCard
              item={item}
              active={selectedChannel.id === item.id}
              onPress={() => {
                setSelectedChannel(item);
                setRecordingSelected(false);
              }}
            />
          )}
        />
        <ScrollableRow
          title="Most Liked Recordings"
          data={[]}
          keyExtractor={(item) => item.id}
          emptyText="Nothing here yet."
          renderItem={({ item }) => (
            <ChannelCard
              item={item}
              active={selectedChannel.id === item.id}
              onPress={() => {
                setSelectedChannel(item);
                setRecordingSelected(false);
              }}
            />
          )}
        />

        <ScrollableRow
          title="Newest"
          data={[]}
          keyExtractor={(item) => item.id}
          emptyText="Nothing here yet."
          renderItem={({ item }) => (
            <ChannelCard
              item={item}
              active={selectedChannel.id === item.id}
              onPress={() => {
                setSelectedChannel(item);
                setRecordingSelected(false);
              }}
            />
          )}
        />

        <ScrollableRow
          title="Recordings"
          data={recordings}
          keyExtractor={(item) => item.id.toString()}
          emptyText="Recordings you make will show up here."
          renderItem={({ item }) => (
            <Pressable
              style={({ hovered, pressed }) => [
                styles.card,
                hovered && styles.cardHovered,
                pressed && styles.cardPressed,
              ]}
              onPress={() => {
                setSelectedChannel(item);
                setRecordingSelected(true);
              }}
            >
              <Pressable
                style={({ hovered }) => [
                  styles.deleteButton,
                  hovered && styles.deleteButtonHovered,
                ]}
                onPress={() => {
                  setDeletingItem(item);
                  confirmDeleteRecording();
                }}
              >
                <AntDesign name="delete" size={13} color={COLORS.text} />
              </Pressable>

              <ImageBackground
                source={{ uri: `http://${serverIP}:8000${item.record_img}` }}
                style={styles.cardBackground}
                imageStyle={styles.cardImage}
              >
                <View style={styles.cardOverlay} />
              </ImageBackground>

              <View style={styles.recordingMeta}>
                <Text style={styles.cardTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.recordingSubtext}>
                  {new Date(item.created_at).toLocaleDateString()} •{' '}
                  {formatDuration(item.duration)}
                </Text>
              </View>
            </Pressable>
          )}
        />

        <ScrollableRow
          title="Public Recordings"
          data={[]}
          keyExtractor={(item) => item.id}
          emptyText="Nothing here yet."
          renderItem={({ item }) => (
            <ChannelCard
              item={item}
              active={selectedChannel.id === item.id}
              onPress={() => {
                setSelectedChannel(item);
                setRecordingSelected(false);
              }}
            />
          )}
        />

      </ScrollView>


      <TagPopup
        visible={showTagPopup}
        tags={tags}
        availableTags={allTags}
        onClose={() => setShowTagPopup(false)}
        onRemoveTag={removeTag}
        onAddTag={addTag}
      />

      <CustomPopup
        visible={showDeletePopup}
        message={`Are you sure you want to delete this record? This cannot be undone.`}
        type="caution"
        showButtons={true}
        acceptText="Delete"
        declineText="Cancel"
        onAccept={() => {
          setShowDeletePopup(false);

          deleteRecording(deletingItem.id);
        }}
        onDecline={() => {
          setShowDeletePopup(false);
        }}
      />
    </View>
  );
}

const CARD_WIDTH = 220;
const CARD_HEIGHT = 130;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 60,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 20 : 44,
    paddingBottom: 12,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
    }),
  },

  backButtonHovered: {
    backgroundColor: COLORS.surfaceRaised,
  },

  backButtonPressed: {
    opacity: 0.75,
  },

  logo: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginLeft: 12,
  },

  headerSpacer: {
    flex: 1,
  },

  // Player layout — stacks on narrow screens, splits into two
  // columns (video / info) once WIDE_LAYOUT_BREAKPOINT is reached.
  playerLayout: {
    flexDirection: 'column',
    marginBottom: 8,
  },

  playerLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    gap: 24,
  },

  videoColumn: {
    width: '100%',
  },

  videoColumnWide: {
    flex: 1.6,
    minWidth: 0,
  },

  infoColumn: {
    width: '100%',
  },

  infoColumnStacked: {
    paddingHorizontal: 16,
  },

  infoColumnWide: {
    flex: 1,
    minWidth: 320,
    maxWidth: 420,
    gap: 16,
  },

  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
    flexWrap: 'wrap',
  },

  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  reactionGroup: {
    flexDirection: 'row',
    gap: 4,
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
    }),
  },

  iconButtonHovered: {
    backgroundColor: COLORS.surfaceRaised,
  },

  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.15s ease' },
    }),
  },

  recordButtonHovered: {
    backgroundColor: COLORS.surfaceRaised,
  },

  recordButtonPressed: {
    opacity: 0.85,
  },

  recordingActive: {
    backgroundColor: COLORS.dangerDark,
    borderColor: COLORS.danger,
  },

  recordDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
  },

  recordText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },

  streamInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },

  streamInfoTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },

  streamInfoLine: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  // Section headings
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  // Add channel panel
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  panelTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },

  panelSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },

  formRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 10,
  },

  // The side column is narrower than the full-width layout, so stack
  // the two inputs vertically instead of squeezing them side by side.
  formRowStacked: {
    flexDirection: 'column',
  },

  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    ...Platform.select({
      web: { outlineStyle: 'none', transition: 'border-color 0.15s ease' },
    }),
  },

  inputFocused: {
    borderColor: COLORS.accent,
  },

  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },

  button: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
    }),
  },

  buttonHovered: {
    backgroundColor: COLORS.accentDark,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 13,
  },

  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 240,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'border-color 0.15s ease' },
    }),
  },

  buttonSecondaryHovered: {
    borderColor: COLORS.accent,
  },

  buttonSecondaryText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },

  // Scrollable rows
  rowSection: {
    marginTop: 22,
  },

  rowContainer: {
    position: 'relative',
    justifyContent: 'center',
  },

  row: {
    paddingHorizontal: 16,
    gap: 14,
    flexGrow: 1,
  },

  emptyRow: {
    width: 220,
    height: CARD_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  emptyRowText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },

  scrollArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 22, 30, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
        transition: 'background-color 0.15s ease, transform 0.15s ease',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },

  scrollArrowLeft: {
    left: 6,
  },

  scrollArrowRight: {
    right: 6,
  },

  scrollArrowHovered: {
    backgroundColor: COLORS.accent,
  },

  scrollArrowPressed: {
    transform: [{ scale: 0.92 }],
  },

  // Cards
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'transform 0.15s ease, border-color 0.15s ease' },
    }),
  },

  cardBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  cardImage: {
    borderRadius: 12,
  },

  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 18, 0.15)',
  },

  cardHovered: {
    transform: [{ scale: 1.03 }],
    borderColor: COLORS.border,
  },

  cardPressed: {
    opacity: 0.9,
  },

  cardActive: {
    borderColor: COLORS.accent,
  },

  cardTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    margin: 10,
  },

  recordingMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: 'rgba(10, 12, 18, 0.55)',
  },

  recordingSubtext: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 100,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10, 12, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
    }),
  },

  deleteButtonHovered: {
    backgroundColor: COLORS.danger,
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
    marginRight: 15,
  },
});