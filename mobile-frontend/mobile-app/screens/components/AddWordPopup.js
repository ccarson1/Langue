import React, { useEffect, useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SaveWordButton from './SendSaveWord';

export default function AddWordPopup({
  visible,
  onClose,
  onSubmit,
  selectedText,
  translatedText,
  words,
  nat_id,
  tar_id,
  showSuccess,
  showError,
}) {
  const [word, setWord] = useState('');



  const t_word = (typeof translatedText === "object" && translatedText !== null) ? String(translatedText[0]) : translatedText;

  useEffect(() => {
    if (words && words.length >= 1) {
      setWord('');        // or some other logic
    } else {
      setWord(t_word);
    }
  }, [translatedText]);

  useEffect(() => {
    console.log(`${typeof translatedText[0]}`)
    console.log(`This is the word ${word}`);
    console.log(`This is the words ${words}`);
    console.log(`This is the selected Text ${selectedText}`);
    console.log(`This is the translated Text ${translatedText.length}`);
    console.log(`This is the natural ID ${nat_id}`);
    console.log(`This is the target ID ${tar_id}`);

  })



  const handleLocalSubmit = () => {
    if (word.trim()) {
      onSubmit(word.trim());
      setWord('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Add New Word</Text>
          <TextInput
            style={styles.input}
            placeholder={word}

            value={word}
            onChangeText={setWord}
          />

          <View style={styles.buttons}>
            {/* Cancel button */}
            <TouchableOpacity style={styles.buttonCancel} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            {/* SaveWordButton instead of plain Add */}
            <SaveWordButton
              payload={{
                word: selectedText,   // use manual entry OR selectedText
                definition: word,
                nat_id: nat_id,
                tar_id: tar_id,
              }}
              words={words}
              onSuccess={() => {
                showSuccess?.();
                handleLocalSubmit();
              }}
              onError={showError}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    width: '80%',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  buttonCancel: {
    marginRight: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#999',
    borderRadius: 6,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
