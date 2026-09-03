import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
} from 'react-native';
import { AntDesign } from '@expo/vector-icons';

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

const TagPopup = ({
  visible,
  tags = [],
  availableTags = [],
  onClose,
  onRemoveTag,
  onAddTag,
}) => {
  const [newTag, setNewTag] = useState('');

  const searchText = newTag.trim();

  // Existing tags that match the search
  const filteredTags = availableTags.filter((availableTag) => {
    const availableName =
      availableTag.name ?? availableTag;

    const alreadyAdded = tags.some((tag) => {
      const existingName =
        tag.name ?? tag;

      return (
        existingName.toLowerCase() ===
        availableName.toLowerCase()
      );
    });

    return (
      !alreadyAdded &&
      availableName
        .toLowerCase()
        .includes(searchText.toLowerCase())
    );
  });

  // Check whether the typed tag already exists anywhere
  const tagAlreadyExists = availableTags.some((tag) => {
    const tagName = tag.name ?? tag;

    return (
      tagName.toLowerCase() ===
      searchText.toLowerCase()
    );
  });

  // Check whether the tag is already assigned
  const tagAlreadyAdded = tags.some((tag) => {
    const tagName = tag.name ?? tag;

    return (
      tagName.toLowerCase() ===
      searchText.toLowerCase()
    );
  });

  const handleAddExistingTag = (tag) => {
    onAddTag?.(tag);
    setNewTag('');
  };

  const handleCreateTag = () => {
    if (!searchText || tagAlreadyExists) {
      return;
    }

    // Create a new tag object.
    // The parent can send this to the backend.
    const newTagObject = {
      name: searchText,
    };

    onAddTag?.(newTagObject);

    setNewTag('');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
      >
        <Pressable
          style={styles.popup}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>
              Tags
            </Text>

            <Pressable
              style={styles.closeButton}
              onPress={onClose}
            >
              <AntDesign
                name="close"
                size={18}
                color="#777"
              />
            </Pressable>
          </View>

          {/* Current Tags */}
          <View style={styles.currentTags}>
            {tags.length === 0 ? (
              <Text style={styles.noTags}>
                No tags added
              </Text>
            ) : (
              tags.map((tag, index) => (
                <View
                  key={tag.id ?? index}
                  style={styles.tag}
                >
                  <Text style={styles.tagText}>
                    {tag.name ?? tag}
                  </Text>

                  <Pressable
                    style={({ hovered, pressed }) => [
                      styles.removeButton,
                      hovered &&
                        styles.removeButtonHovered,
                      pressed &&
                        styles.removeButtonPressed,
                    ]}
                    onPress={() =>
                      onRemoveTag?.(tag)
                    }
                  >
                    <AntDesign
                      name="close"
                      size={11}
                      color="#555"
                    />
                  </Pressable>
                </View>
              ))
            )}
          </View>

          {/* Add Tag */}
          <View style={styles.addSection}>
            <Text style={styles.addTitle}>
              Add Tag
            </Text>

            <TextInput
              value={newTag}
              onChangeText={setNewTag}
              placeholder="Enter a tag..."
              placeholderTextColor="#999"
              style={styles.input}
              autoCapitalize="none"
            />

            {/* Suggestions */}
            {searchText.length > 0 && (
              <View style={styles.suggestions}>

                {/* Existing tag suggestions */}
                {filteredTags.map((tag, index) => (
                  <Pressable
                    key={tag.id ?? index}
                    style={({ hovered, pressed }) => [
                      styles.suggestion,
                      hovered &&
                        styles.suggestionHovered,
                      pressed &&
                        styles.suggestionPressed,
                    ]}
                    onPress={() =>
                      handleAddExistingTag(tag)
                    }
                  >
                    <Text style={styles.suggestionText}>
                      {tag.name ?? tag}
                    </Text>

                    <AntDesign
                      name="plus"
                      size={14}
                      color="#666"
                    />
                  </Pressable>
                ))}

                {/* Create new tag */}
                {!tagAlreadyExists &&
                  !tagAlreadyAdded && (
                    <Pressable
                      style={({ hovered, pressed }) => [
                        styles.createSuggestion,
                        hovered &&
                          styles.suggestionHovered,
                        pressed &&
                          styles.suggestionPressed,
                      ]}
                      onPress={handleCreateTag}
                    >
                      <View style={styles.createContent}>
                        <AntDesign
                          name="plus"
                          size={14}
                          color="#555"
                        />

                        <Text style={styles.createText}>
                          Create "{searchText}"
                        </Text>
                      </View>
                    </Pressable>
                  )}

                {/* Already added message */}
                {tagAlreadyAdded && (
                  <Text style={styles.alreadyAdded}>
                    This tag is already added
                  </Text>
                )}

                {/* No results */}
                {filteredTags.length === 0 &&
                  tagAlreadyExists &&
                  !tagAlreadyAdded && (
                    <Text style={styles.noResults}>
                      This tag already exists
                    </Text>
                  )}
              </View>
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  popup: {
    width: 350,
    maxWidth: '90%',
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 20,

    elevation: 8,

    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },

  title: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text
  },

  closeButton: {
    padding: 5,
  },

  currentTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  tag: {
    flexDirection: 'row',
    alignItems: 'center',

    paddingLeft: 12,
    paddingRight: 5,
    paddingVertical: 6,

    borderRadius: 15,
    backgroundColor: COLORS.accent,
  },

  tagText: {
    fontSize: 14,
    color: COLORS.text,
    marginRight: 6,
  },

  removeButton: {
    width: 22,
    height: 22,
    borderRadius: 11,

    justifyContent: 'center',
    alignItems: 'center',
  },

  removeButtonHovered: {
    backgroundColor: COLORS.text,
  },

  removeButtonPressed: {
    backgroundColor: COLORS.text,
  },

  noTags: {
    color: COLORS.text,
    marginBottom: 5,
  },

  addSection: {
    marginTop: 20,
  },

  addTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: COLORS.text,
  },

  input: {
    height: 40,
    borderWidth: 1,
    borderColor: COLORS.surfaceRaised,
    borderRadius: 6,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
  },

  suggestions: {
    marginTop: 5,
    borderWidth: 1,
    borderColor: COLORS.surfaceRaised,
    borderRadius: 6,
    overflow: 'hidden',
  },

  suggestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',

    paddingHorizontal: 12,
    paddingVertical: 10,

    backgroundColor: COLORS.surfaceRaised,
  },

  createSuggestion: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: COLORS.surfaceRaised,
  },

  createContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  suggestionHovered: {
    backgroundColor: COLORS.surface,
  },

  suggestionPressed: {
    backgroundColor: COLORS.surfaceRaised,
  },

  suggestionText: {
    fontSize: 14,
    color: COLORS.text,
  },

  createText: {
    fontSize: 14,
    color: COLORS.text,
  },

  alreadyAdded: {
    padding: 12,
    fontSize: 13,
    color: '#888',
  },

  noResults: {
    padding: 12,
    fontSize: 13,
    color: '#888',
  },
});

export default TagPopup;

