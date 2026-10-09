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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { jwtDecode } from 'jwt-decode';
import { useEvent } from 'expo';
import AntDesign from '@expo/vector-icons/AntDesign';
import { getServerIP } from '../utils/config';
import VideoReader from './components/VideoReader';
import * as DocumentPicker from 'expo-document-picker';
import CustomPopup from './components/CustomPopup';
import TagPopup from './components/TagPopup';
import { createStyles } from './styles/LiveTVStyles';


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

  const insets = useSafeAreaInsets();
  const styles = createStyles(insets);

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
  const insets = useSafeAreaInsets();
  const styles = createStyles(insets);

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
  const insets = useSafeAreaInsets();
  const styles = createStyles(insets);
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
  const [publicRecordings, setPublicRecordings] = useState([]);
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
  const [isChannelPublic, setIsChannelPublic] = useState(false);
  const [isRecordingPublic, setIsRecordingPublic] = useState(false);
  const [showTagPopup, setShowTagPopup] = useState(false);
  const [isNewChannelPublic, setIsNewChannelPublic] = useState(false);



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

  const updateChannelPublic = async (value) => {
    if (!selectedChannel?.id) return;

    // Update UI immediately
    setIsChannelPublic(value);

    try {
      const res = await fetch(
        `${API_BASE}/api/channels/${selectedChannel.id}/`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            is_public: value,
            channel_id: selectedChannel.id,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to update channel public status:', data);

        // Revert UI if backend update failed
        setIsChannelPublic(!value);
        return;
      }

      // Update selected channel with backend response
      setSelectedChannel((current) => ({
        ...current,
        ...data,
      }));

      // Update channel in list
      setChannels((current) =>
        current.map((channel) =>
          channel.id === selectedChannel.id
            ? { ...channel, ...data }
            : channel
        )
      );
    } catch (error) {
      console.error('Update channel public error:', error);
      setIsChannelPublic(!value);
    }
  };

  const updateRecordingPublic = async (value) => {
    if (!selectedChannel?.id) return;

    setIsRecordingPublic(value);

    try {
      const res = await fetch(
        `${API_BASE}/api/recordings/${selectedChannel.id}/`,
        {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            is_public: value,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        console.error('Failed to update recording public status:', data);
        setIsRecordingPublic(!value);
        return;
      }

      setSelectedChannel((current) => ({
        ...current,
        ...data,
      }));

      setRecordings((current) =>
        current.map((recording) =>
          recording.id === selectedChannel.id
            ? { ...recording, ...data }
            : recording
        )
      );

      setPublicRecordings(recordings.filter((item) => item.is_public));

    } catch (error) {
      console.error('Update recording public error:', error);
      setIsRecordingPublic(!value);
    }
  };


  const loadCurrentTags = async () => {
    const target = getCurrentTagTarget();

    if (!target || !token || !serverIP) {
      setTags([]);
      return;
    }

    try {
      const params = new URLSearchParams({
        tag_type: target.tag_type,
        object_id: String(target.object_id),
      });

      const res = await fetch(
        `${API_BASE}/api/tags/?${params.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error('Failed to load current tags:', data);
        setTags([]);
        return;
      }

      const data = await res.json();
      setTags(data);
    } catch (error) {
      console.error('Failed to load current tags:', error);
      setTags([]);
    }
  };



  useEffect(() => {
    loadCurrentTags();
  }, [selectedChannel?.id, recordingSelected, token, serverIP,]);

  const addTag = async (tag) => {
    const target = getCurrentTagTarget();

    if (!target) {
      console.error('No channel or recording selected.');
      return;
    }

    try {
      const body = {
        ...target,
      };

      if (tag.id) {
        body.tag_id = tag.id;
      } else if (tag.name) {
        body.name = tag.name;
      } else {
        return;
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
            (existingTag) => existingTag.id === data.tag.id
          );

          if (exists) {
            return currentTags;
          }

          return [...currentTags, data.tag];
        });

        setAllTags((currentTags) => {
          const exists = currentTags.some(
            (existingTag) => existingTag.id === data.tag.id
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
    const target = getCurrentTagTarget();

    if (!target || !tag?.id) {
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/tags/`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...target,
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
          (currentTag) => currentTag.id !== tag.id
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

  const getCurrentTagTarget = () => {
    if (!selectedChannel?.id) {
      return null;
    }

    if (recordingSelected) {
      return {
        tag_type: 'recording',
        object_id: selectedChannel.id,
      };
    }

    return {
      tag_type: 'channel',
      object_id: selectedChannel.id,
    };
  };

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
      setPublicRecordings(recordings.filter((item) => item.is_public));
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
      formData.append('channel_public', isNewChannelPublic);

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
      setIsNewChannelPublic(false);
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
            <VideoReader
              selectedChannel={selectedChannel}
              recordingSelected={recordingSelected}
              serverIP={serverIP}
            />
          </View>

          <View style={[styles.infoColumn, isWideScreen ? styles.infoColumnWide : styles.infoColumnStacked,]} >

            <View style={styles.actionsBar}>

              {/* LEFT SIDE */}
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

              </View>

              {/* RIGHT SIDE — groups stacked vertically */}
              <View style={styles.reactionColumn}>

                {/* TOP REACTION GROUP */}
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
                </View>

                {/* BOTTOM REACTION GROUP */}
                <View style={styles.reactionGroup}>

                  {/* CHANNEL PUBLIC / TAG CONTROLS */}
                  {!recordingSelected &&
                    Number(selectedChannel?.owner_id) === Number(user?.user_id) && (
                      <View style={styles.toggleCard}>
                        <Text style={styles.label}>Public</Text>

                        <Switch
                          value={isChannelPublic}
                          onValueChange={updateChannelPublic}
                        />

                        <Pressable
                          style={({ hovered }) => [
                            styles.iconButton,
                            hovered && styles.iconButtonHovered,
                          ]}
                          onPress={() => setShowTagPopup(true)}
                        >
                          <AntDesign
                            name="tags"
                            size={16}
                            color={COLORS.text}
                          />
                        </Pressable>
                      </View>
                    )}

                  {/* RECORDING PUBLIC / TAG CONTROLS */}
                  {recordingSelected &&
                    Number(selectedChannel?.user_id) === Number(user?.user_id) && (
                      <View style={styles.toggleCard}>
                        <Text style={styles.label}>Public</Text>

                        <Switch
                          value={isRecordingPublic}
                          onValueChange={updateRecordingPublic}
                        />

                        <Pressable
                          style={({ hovered }) => [
                            styles.iconButton,
                            hovered && styles.iconButtonHovered,
                          ]}
                          onPress={() => setShowTagPopup(true)}
                        >
                          <AntDesign
                            name="tags"
                            size={16}
                            color={COLORS.text}
                          />
                        </Pressable>
                      </View>
                    )}

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

                          navigation.navigate('Import', { recordId: idToPass, });
                        }}
                      >
                        <Text style={styles.buttonText}>
                          Create Lesson
                        </Text>
                      </Pressable>

                      <Pressable
                        style={({ hovered, pressed }) => [
                          styles.buttonSecondary,
                          hovered && styles.buttonSecondaryHovered,
                          pressed && styles.buttonPressed,
                        ]}
                      >
                        <Text style={styles.buttonSecondaryText}>
                          Crop Video
                        </Text>
                      </Pressable>

                    </View>
                  )}

                </View>

              </View>

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

              <Text style={styles.label}>Public</Text>

              <Switch
                value={isNewChannelPublic}
                onValueChange={setIsNewChannelPublic}
              />

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
          data={channels.filter((channel) => Number(channel.owner_id) === Number(user?.user_id))}
          keyExtractor={(item) => item.id.toString()}
          emptyText="No channels yet — add one below."
          renderItem={({ item }) => (
            console.log('Rendering channel:', item),
            <ChannelCard
              item={item}
              active={selectedChannel.id === item.id}
              onPress={() => {
                setSelectedChannel(item);
                setRecordingSelected(false);
                setIsChannelPublic(item.is_public);
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
          title="Public Channels"
          data={channels.filter(channel => channel.is_public)}
          keyExtractor={(item) => item.id.toString()}
          emptyText="No channels yet — add one below."
          renderItem={({ item }) => (

            <ChannelCard
              item={item}
              active={selectedChannel.id === item.id}
              onPress={() => {
                setSelectedChannel(item);
                setRecordingSelected(false);
                setIsChannelPublic(item.is_public);
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
                setIsChannelPublic(item.is_public);
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
                setIsRecordingPublic(item.is_public);
              }}
            />
          )}
        />

        <ScrollableRow
          title="Newest Channels"
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
                setIsChannelPublic(item.is_public);
              }}
            />
          )}
        />

        <ScrollableRow
          title="Newest Recordings"
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
                setIsRecordingPublic(item.is_public);
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
            Number(item.user_id) === Number(user?.user_id) && (
              <Pressable
                style={({ hovered, pressed }) => [
                  styles.card,
                  hovered && styles.cardHovered,
                  pressed && styles.cardPressed,
                ]}
                onPress={() => {
                  setSelectedChannel(item);
                  setRecordingSelected(true);
                  setIsRecordingPublic(item.is_public);
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
            )
          )}
        />


        <ScrollableRow
          title="Public Recordings"
          data={recordings.filter((item) => item.is_public)}
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
                setIsRecordingPublic(item.is_public);
              }}
            >

              {Number(item.user_id) === Number(user?.user_id) && (
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
              )}
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

