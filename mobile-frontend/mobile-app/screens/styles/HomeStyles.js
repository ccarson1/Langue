import { StyleSheet } from 'react-native';
import { HoverEffect } from 'react-native-gesture-handler';

// Alternative approach using flex properties for stable layout
export default StyleSheet.create({
    container: {
        flex: 1,
        padding: 0,
        alignItems: 'center',
        backgroundColor: '#222831',
        justifyContent: 'space-between', // Distribute space evenly

    },

    // Top section - fixed space
    topSection: {
        flex: 0.2,
        alignItems: 'right',
        width: '100%',
        textAlign: 'center',
        backgroundColor: '#30475e',
        justifyContent: 'center',
        padding: 0,
        margin: 0,
        top: -80,
    },

    topNavText: {
        textAlign: 'first',
        justifyContent: 'center',
        color: 'white',
        fontStyle: 'bold',
        fontSize: 22,
        top: 50,
        left: 40,
        fontFamily: 'PlaywriteHU-Regular',
        height: 50
    },

    logoContainer: {
        flex: 1,
        justifyContent: 'center',
        top: 60,
    },



    navContainer: {
        display: 'flex',
    },

    navText: {
        color: 'white',
    },

    // Middle section - main content with fixed space
    middleSection: {
        flex: 0.6,
        width: 300,
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Bottom section - controls with fixed space
    bottomSection: {
        flex: 0.2,
        justifyContent: 'center',

    },

    lessonText: {
        fontSize: 20,
        color: 'white',
        textAlign: 'center',
        marginBottom: 20,
    },

    // Word container with fixed dimensions
    wordContainer: {
        minHeight: 100,
        width: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    btnText: {
        textAlign: 'center',
        color: 'white',
        fontWeight: 'bold',
    },
    partOfSpeech: {
        fontStyle: 'italic',
        textAlign: 'right',
        color: '$666',
        fontWeight: 'bold'
    },

    word: {
        fontSize: 20,
        color: 'white',
        textAlign: 'center',
        paddingHorizontal: 10,
    },
    defHeader: {
        fontSize: 25,
        fontWeight: 'bold',
        fontFamily: 'serif',
    },

    separatorSolid: {
        height: 1,
        backgroundColor: "#ccc",
        marginVertical: 8,
    },
    separatorDotted: {
        borderBottomWidth: 1,
        borderBottomColor: "#888",
        borderStyle: 'dotted',
        marginVertical: 8,
    },

    defContainer: {
        backgroundColor: 'white',
        borderRadius: 5,
        padding: 20,
        width: '120%',
        height: '70%',
        minHeight: 250, // Fixed minimum height
        position: 'relative',
    },

    saveBtn: {
        position: 'absolute',
        top: 10,
        right: 40,
        backgroundColor: '#00adb5',
        padding: 8,
        borderRadius: 5,
        minWidth: 60,
        shadowColor: '#30475e',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,


        // Android shadow
        elevation: 4,
    },

    buttonText: {
        color: 'black',
        fontWeight: 'bold',
    },

    translateBtn: {
        position: 'absolute',
        top: 275,
        right: 20,
        backgroundColor: '#00adb5',
        padding: 8,
        borderRadius: 5,
        minWidth: 60,
        shadowColor: '#30475e',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,


        // Android shadow
        elevation: 4,
    },

    textRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        minHeight: 5, // Fixed height per row
    },

    leftText: {
        fontWeight: 'bold',
        color: '#444444',
        flex: 0.4,

    },

    rightText: {
        color: '#444444',
        flex: 0.6,
        textAlign: 'left',
    },

    controls: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: 400,
        alignItems: 'center',
    },

    hamburgerIcon: {
        position: 'absolute',
        bottom: 20,
        right: 40,
        zIndex: 10,
        justifyContent: 'center',
    },

    sideMenu: {
        position: 'absolute',
        top: 0,
        left: 0,
        width: 200,
        height: '100%',
        backgroundColor: '#393e46',
        paddingTop: 60,
        paddingHorizontal: 20,
        zIndex: 9,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        color: 'white',
    },

    navText: {
        fontSize: 18,
        marginVertical: 15,
        color: 'white',
    },

    menuHeader: {
        color: 'white',
        fontSize: 24,
    },

    copy1: {
        position: 'absolute',
        marginLeft: "80%",
        top: 18,
        width: 'fit-content',

        padding: 3
    },

    defDescription: {
        fontSize: 16,
        lineHeight: 22,
        color: '#333',
        flexWrap: 'wrap',
        width: '100%',
        padding: 8,
    },
});
