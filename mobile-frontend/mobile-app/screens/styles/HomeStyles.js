import { StyleSheet, Platform } from 'react-native';



// Alternative approach using flex properties for stable layout
export const createStyles = (insets) =>
    StyleSheet.create({

        container: {
            flex: 1,
            marginBottom: insets.bottom,
            marginTop: insets.top,
            alignItems: 'center',
            backgroundColor: '#222831',
            justifyContent: 'space-between', // Distribute space evenly
        },
        middleScroll: {
            flex: 0.7,
            width: '100%',
        },
        // Top section - fixed space
        topSection: {
            flex: 0.28,
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
            top: 40,
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
            flex: 1,
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            paddingBottom: 50,

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
            justifyContent: 'center',
            alignItems: 'center',
            width: Platform.OS === 'web' ? '75%' : "100%",
            height: 120,
            marginBottom: 0,
            paddingHorizontal: 20,
            overflow: 'scroll',
            scrollbarWidth: 'thin',
            scrollbarColor: '#888 #444444',
            overflowX: 'hidden',
        },
        wordScroll: {
            flex: 1,
        },
        wordWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
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
            fontWeight: 'bold',
            top: 20,

        },

        word: {
            fontSize: 20,
            color: 'white',
            paddingHorizontal: 4,
        },
        defHeader: {
            fontSize: 25,
            fontWeight: 'bold',
            fontFamily: 'serif',
        },

        separatorSolid: {
            height: 1,
            backgroundColor: "57, 62, 70",
            marginVertical: 8,
        },
        separatorDotted: {
            borderBottomWidth: 1,
            borderBottomColor: "#888",
            borderStyle: 'dotted',
            marginVertical: 8,
        },

        defContainer: {
            backgroundColor: 'rgb(57, 62, 70)',
            borderRadius: 5,
            padding: 15,
            width: Platform.OS === 'web' ? '80%' : "100%",
            height: '100%',
            minHeight: 250, // Fixed minimum height
            position: 'relative',
            overflowY: 'scroll',
            paddingBottom: 0,
            scrollbarColor: '#888 #444444',
        },



        buttonText: {
            color: 'black',
            fontWeight: 'bold',
        },

        translateBtn: {
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

        textRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 20,
            minHeight: 5, // Fixed height per row
        },

        leftText: {
            fontWeight: 'bold',
            color: 'white',
            flex: 0.4,

        },

        rightText: {
            color: 'white',
            flex: 0.6,
            textAlign: 'left',
            fontSize: 20
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
            color: 'white',
            flexWrap: 'wrap',
            width: '100%',
            paddingTop: 10,
            paddingHorizontal: 8,
            paddingBottom: 30,
        },
        videoPlayer: {
            width: Platform.OS === 'web' ? '80%' : "50%",
            top: 50,
            marginTop: 50,
            paddingTop: 50,
        },
    });
