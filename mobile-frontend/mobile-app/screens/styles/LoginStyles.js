import { StyleSheet } from 'react-native';

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
    flexDirection: 'row',
    alignItems: 'center',
  },

  

  loginBox: {
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
    fontWeight: '600',
    color: '#eeeeee',
    marginBottom: 20,
    textAlign: 'center',
  },

  label: {
    color: '#eeeeee',
    marginBottom: 6,
    marginTop: 12,
    fontSize: 14,
  },

  input: {
    backgroundColor: '#222831',
    color: '#eeeeee',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    fontSize: 16,
  },

  button: {
    backgroundColor: '#00adb5',
    paddingVertical: 12,
    borderRadius: 6,
    marginTop: 20,
  },

  buttonText: {
    textAlign: 'center',
    fontWeight: '600',
    color: '#222831',
    fontSize: 18,
  },

  forgot: {
    textAlign: 'center',
    marginTop: 16,
    fontSize: 13,
    color: '#eeeeeecc',
    textDecorationLine: 'underline',
  },

  signup: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
    color: 'white',
  },
});
