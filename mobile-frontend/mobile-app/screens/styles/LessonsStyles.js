import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222831',
        paddingTop: 40,
    },

    gridWrapper: {
        paddingTop: 60,
        paddingHorizontal: 16,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 16,
    },
    card: {
        backgroundColor: '#393e46',
        borderRadius: 10,
        padding: 20,
        margin: 10,
        width: 320,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,
    },
    title: {
        color: '#eeeeee',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 12,
    },
    image: {
        width: '100%',
        height: 180,
        borderRadius: 6,
        marginBottom: 12,
    },
    button: {
        backgroundColor: '#00adb5',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 6,
        width: '100%',
        alignItems: 'center',
    },
    buttonText: {
        color: '#222831',
        fontWeight: '600',
        fontSize: 16,
    },

    backLink: {
    position: 'absolute',
    top: 40,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
});