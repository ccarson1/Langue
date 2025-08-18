import { StyleSheet } from 'react-native';

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#222831',
        paddingTop: 80,
    },

    gridWrapper: {
        paddingTop: 60,
        paddingHorizontal: 16,


        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#393e46',
        color: 'white',
        borderRadius: 10,
        padding: 10,
        margin: 5,
        width: "auto",
        
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 10,
        elevation: 5,

    },
    topCard: {
        flexDirection: 'row',
        width: "90%",
        justifyContent: 'space-between',
        alignItems: 'center',
        color: 'white'
    },
    title: {
        color: '#eeeeee',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        marginRight: 5,
        
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