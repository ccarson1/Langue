import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';

export default function PDFConverterPopup({
  visible,
  onClose,
  serverIP,
  token,
  onConverted,
}) {
  const [pdfFile, setPdfFile] = useState(null);
  const [converting, setConverting] = useState(false);

  const handlePDFPick = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      if (result.assets && result.assets.length > 0) {
        setPdfFile(result.assets[0]);
      }
    } catch (error) {
      console.error('PDF pick error:', error);
      Alert.alert('Error', 'Failed to select PDF.');
    }
  };

  const handleConvert = async () => {
    if (!pdfFile) return;

    try {
      setConverting(true);

      const formData = new FormData();

      if (pdfFile.file) {
        // Web
        formData.append('pdf', pdfFile.file);
      } else {
        // Android / iOS
        formData.append('pdf', {
          uri: pdfFile.uri,
          name: pdfFile.name,
          type: pdfFile.mimeType || 'application/pdf',
        });
      }

      const response = await fetch(
        `http://${serverIP}:8000/api/convert-pdf-to-csv/`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/json',
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        throw new Error(
          errorData.error || 'PDF conversion failed.'
        );
      }

      const data = await response.json();

      console.log('PDF conversion response:', data);

      onConverted(data);

      setPdfFile(null);
      onClose();

    } catch (error) {
      console.error('PDF conversion error:', error);

      Alert.alert(
        'Conversion Failed',
        error.message
      );
    } finally {
      setConverting(false);
    }
  };

  const handleClose = () => {
    if (converting) return;

    setPdfFile(null);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.popup}>

          <Text style={styles.title}>
            Convert PDF to CSV
          </Text>

          <Text style={styles.description}>
            Upload a PDF textbook and convert it into a lesson CSV.
          </Text>

          <TouchableOpacity
            style={styles.selectButton}
            onPress={handlePDFPick}
            disabled={converting}
          >
            <Text style={styles.selectButtonText}>
              {pdfFile ? 'Choose Different PDF' : 'Choose PDF'}
            </Text>
          </TouchableOpacity>

          {pdfFile && (
            <View style={styles.fileBox}>
              <Text style={styles.fileName}>
                {pdfFile.name}
              </Text>
            </View>
          )}

          <View style={styles.buttonRow}>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleClose}
              disabled={converting}
            >
              <Text style={styles.cancelText}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.convertButton,
                !pdfFile && styles.convertButtonDisabled,
              ]}
              onPress={handleConvert}
              disabled={!pdfFile || converting}
            >
              <Text style={styles.convertText}>
                {converting ? 'Converting...' : 'Convert'}
              </Text>
            </TouchableOpacity>

          </View>

        </View>
      </View>
    </Modal>
  );
}

const colors = {
  bg: '#222831',
  surface: '#393e46',
  surfaceElevated: '#3f454e',
  border: '#4b525c',
  borderSubtle: '#333944',
  text: '#eeeeee',
  textMuted: '#a0a6ad',
  accent: '#00adb5',
  accentDark: '#00838a',
  danger: '#e05a5a',
  dangerBg: '#3a2a2c',
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },

  popup: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
  },

  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
  },

  description: {
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 20,
  },

  selectButton: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 13,
    paddingHorizontal: 16,
    alignItems: 'center',
  },

  selectButtonText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  fileBox: {
    marginTop: 14,
    padding: 12,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },

  fileName: {
    color: colors.text,
    fontSize: 14,
  },

  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 24,
  },

  cancelButton: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 18,
  },

  cancelText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },

  convertButton: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },

  convertButtonDisabled: {
    backgroundColor: colors.accentDark,
    opacity: 0.5,
  },

  convertText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
});