import React, { useEffect, useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import SaveDefinitionButton  from './SaveDefinitionButton ';

export default function AddDefinitionPopup({
  visible,
  onClose,
  onSubmit,
  selectedText,
  translatedText,
  definitions,
  nat_id,
  tar_id,
  server,
  token,
  showSuccess,
  showError,
}) {
  const [definition, setDefinition] = useState('');



  const t_definition = (typeof translatedText === "object" && translatedText !== null) ? String(translatedText[0]) : translatedText;

  useEffect(() => {
    if (definitions && definitions.length >= 1) {
      setDefinition('');        // or some other logic
    } else {
      setDefinition(t_definition);
    }
  }, [translatedText]);

  // useEffect(() => {
  //   console.log(`${typeof translatedText[0]}`)
  //   console.log(`This is the definition ${definition}`);
  //   console.log(`This is the definitions ${definitions}`);
  //   console.log(`This is the selected Text ${selectedText}`);
  //   console.log(`This is the translated Text ${translatedText.length}`);
  //   console.log(`This is the natural ID ${nat_id}`);
  //   console.log(`This is the target ID ${tar_id}`);

  // })



  const handleLocalSubmit = () => {
    if (definition.trim()) {
      onSubmit(definition.trim());
      setDefinition('');
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>Add New Definition</Text>
          <TextInput
            style={styles.input}
            placeholder={definition}

            value={definition}
            onChangeText={setDefinition}
          />

          <View style={styles.buttons}>
            {/* Cancel button */}
            <TouchableOpacity style={styles.buttonCancel} onPress={onClose}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            {/* SaveDefinitionButton instead of plain Add */}
            <SaveDefinitionButton
              payload={{
                word: selectedText,
                definition: definition,
                nat_id: nat_id,
                tar_id: tar_id,
              }}
              definitions={definitions}
              showSuccess={(msg) => {
                if (typeof showSuccess === 'function') showSuccess(msg);
                handleLocalSubmit();
                onClose();
              }}
              showError={(msg) => {
                if (typeof showError === 'function') showError(msg);
              }}
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
