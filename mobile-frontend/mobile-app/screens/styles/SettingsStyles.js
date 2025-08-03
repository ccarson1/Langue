import { StyleSheet, Platform } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222831',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backLink: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
  },
  settingsBox: {
    backgroundColor: '#393e46',
    padding: 24,
    borderRadius: 10,
    width: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  heading: {
    fontSize: 24,
    color: '#eeeeee',
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    color: '#eeeeee',
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
  pickerWrapper: {
    position: 'relative',
    backgroundColor: '#222831',
    borderRadius: 6,
    marginTop: 2,
    marginBottom: 2,
    overflow: 'hidden',
  },
  picker: {
    color: '#eeeeee',
    height: 52,
    width: '100%',
    padding: 0,
    margin: 0,
    backgroundColor: '#393e46',
    borderWidth: 0,
    borderRadius: 6,
    ...(Platform.OS === 'web' && {
      appearance: 'none',
      WebkitAppearance: 'none',
      MozAppearance: 'none',
      outline: 'none',
      border: 'none',
      boxShadow: 'none',

    }),
  },
  arrowWrapper: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: [{ translateY: -8 }],
    pointerEvents: 'none', // Let clicks go through to Picker
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 10,
  },
  checkboxLabel: {
    color: '#eeeeee',
    marginLeft: 10,
    fontSize: 15,
  },
  button: {
    backgroundColor: '#00adb5',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 16,
  },
  buttonText: {
    textAlign: 'center',
    color: '#222831',
    fontWeight: '600',
    fontSize: 16,
  },
});
