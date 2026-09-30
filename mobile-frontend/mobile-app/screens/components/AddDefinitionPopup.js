// import React, { useEffect, useState } from 'react';
// import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
// import SaveDefinitionButton from './SaveDefinitionButton ';

// export default function AddDefinitionPopup({
//   visible,
//   onClose,
//   onSubmit,
//   selectedText,
//   translatedText,
//   definitions,
//   definition: scrapedDefinition,
//   nat_id,
//   tar_id,
//   server,
//   token,
//   showSuccess,
//   showError,
//   onWordSaved,
// }) {
//   const [definition, setDefinition] = useState('');



//   const t_definition = (typeof translatedText === "object" && translatedText !== null) ? String(translatedText[0]) : translatedText;

//   useEffect(() => {
//     if (scrapedDefinition) {
//       setDefinition(scrapedDefinition);
//     } else if (definitions && definitions.length >= 1) {
//       setDefinition('');
//     } else {
//       setDefinition(t_definition);
//     }
//   }, [translatedText, scrapedDefinition]);

//   // useEffect(() => {
//   //   console.log(`${typeof translatedText[0]}`)
//   //   console.log(`This is the definition ${definition}`);
//   //   console.log(`This is the definitions ${definitions}`);
//   //   console.log(`This is the selected Text ${selectedText}`);
//   //   console.log(`This is the translated Text ${translatedText.length}`);
//   //   console.log(`This is the natural ID ${nat_id}`);
//   //   console.log(`This is the target ID ${tar_id}`);

//   // })



//   const handleLocalSubmit = () => {
//     if (definition.trim()) {
//       onSubmit(definition.trim());
//       setDefinition('');
//       onClose();
//     }
//   };

//   return (
//     <Modal visible={visible} transparent animationType="fade">
//       <View style={styles.overlay}>
//         <View style={styles.container}>
//           <Text style={styles.title}>Add New Definition</Text>
//           <TextInput
//             style={styles.input}
//             placeholder={definition}

//             value={definition}
//             onChangeText={setDefinition}
//           />

//           <View style={styles.buttons}>
//             {/* Cancel button */}
//             <TouchableOpacity style={styles.buttonCancel} onPress={onClose}>
//               <Text style={styles.buttonText}>Cancel</Text>
//             </TouchableOpacity>

//             {/* SaveDefinitionButton instead of plain Add */}
//             <SaveDefinitionButton
//               payload={{
//                 word: selectedText,
//                 definition: definition,
//                 nat_id: nat_id,
//                 tar_id: tar_id,
//               }}
//               definitions={definitions}
//               onWordSaved={onWordSaved}
//               showSuccess={(msg) => {
//                 if (typeof showSuccess === 'function') showSuccess(msg);
//                 handleLocalSubmit();
//                 //onClose();
//               }}
//               showError={(msg) => {
//                 if (typeof showError === 'function') showError(msg);
//               }}
//             />
//           </View>
//         </View>
//       </View>
//     </Modal>
//   );
// }

// const styles = StyleSheet.create({
//   overlay: {
//     flex: 1,
//     backgroundColor: 'rgba(0,0,0,0.5)',
//     justifyContent: 'center',
//     alignItems: 'center',
//   },
//   container: {
//     backgroundColor: '#242938',
//     padding: 20,
//     borderRadius: 10,
//     width: '80%',
//     borderColor: "#2c3244",
//   },
//   title: {
//     color: "#ffffff",
//     fontSize: 18,
//     fontWeight: 'bold',
//     marginBottom: 12,
//   },
//   input: {
//     borderWidth: 1,
//     backgroundColor: "#1b1f2a",
//     color: "#ffffff",
//     borderWidth: 1,
//     borderColor: "#2c3244",
//     borderRadius: 8,
//     padding: 12,
//     fontSize: 16,
//     textAlignVertical: "top",
//   },
//   buttons: {
//     flexDirection: 'row',
//     justifyContent: 'flex-end',
//   },
//   buttonCancel: {
//     backgroundColor: "#2c3244",
//     paddingVertical: 10,
//     paddingHorizontal: 18,
//     borderRadius: 8,
//   },
//   buttonText: {
//     color: 'white',
//     fontWeight: 'bold',
//   },
// });

import React, { useEffect, useState } from 'react';
import { Modal, View, TextInput, TouchableOpacity, Text, StyleSheet, Platform, } from 'react-native';
import SaveDefinitionButton from './SaveDefinitionButton ';

export default function AddDefinitionPopup({
  visible,
  onClose,
  onSubmit,
  selectedText,
  translatedText,
  definitions,
  definition: scrapedDefinition,
  nat_id,
  tar_id,
  server,
  token,
  showSuccess,
  showError,
  onWordSaved,
}) {
  const [definition, setDefinition] = useState('');



  const t_definition = (typeof translatedText === "object" && translatedText !== null) ? String(translatedText[0]) : translatedText;

  useEffect(() => {
    if (scrapedDefinition) {
      setDefinition(scrapedDefinition);
    } else if (definitions && definitions.length >= 1) {
      setDefinition('');
    } else {
      setDefinition(t_definition);
    }
  }, [translatedText, scrapedDefinition]);

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
              onWordSaved={onWordSaved}
              showSuccess={(msg) => {
                if (typeof showSuccess === 'function') showSuccess(msg);
                handleLocalSubmit();
                //onClose();
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
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  container: {
    width: Platform.OS === "web" ? 500 : "90%",
    maxWidth: 600,
    backgroundColor: "#242938",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2c3244",
  },

  title: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 15,
  },

  input: {
    minHeight: 120,
    maxHeight: 250,
    backgroundColor: "#1b1f2a",
    color: "#ffffff",
    borderWidth: 1,
    borderColor: "#2c3244",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    textAlignVertical: "top",
  },

  buttons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 15,
    gap: 10,
  },

  buttonCancel: {
    backgroundColor: "#2c3244",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },

  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
  },
});