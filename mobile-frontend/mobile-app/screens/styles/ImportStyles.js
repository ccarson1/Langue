import { StyleSheet, Platform, } from 'react-native';

export default StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#222831',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  backLink: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 100,
  },
  importBox: {
    backgroundColor: '#393e46',
    padding: 24,
    borderRadius: 10,
    width: '100%',
    maxWidth: 400,
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
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#222831',
    color: '#eeeeee',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    fontSize: 16,
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
  button: {
    backgroundColor: '#00adb5',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#222831',
    fontWeight: '600',
    fontSize: 16,
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
});

