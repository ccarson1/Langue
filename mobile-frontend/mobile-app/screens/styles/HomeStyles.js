
import { StyleSheet, Platform } from 'react-native';


// Responsive HomeScreen styles
export const createStyles = (insets) =>
    StyleSheet.create({

        // ============================================================
        // MAIN CONTAINER
        // ============================================================

        container: {
            flex: 1,
            marginBottom: insets.bottom,
            marginTop: insets.top,
            alignItems: 'center',
            backgroundColor: '#222831',
        },


        // ============================================================
        // TOP SECTION
        // ============================================================

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
            height: 50,
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
            fontSize: 18,
            marginVertical: 15,
            color: 'white',
        },


        // ============================================================
        // MIDDLE SCROLL
        // ============================================================

        middleScroll: {
            flex: 1,
            width: '100%',
        },


        // ============================================================
        // MIDDLE SECTION
        //
        // This is the ScrollView content container.
        // It contains middleColumns.
        // ============================================================

        middleSection: {
            width: '100%',
            alignItems: 'center',
            paddingHorizontal: 15,
            paddingBottom: 10,
        },


        // ============================================================
        // RESPONSIVE TWO-COLUMN LAYOUT
        // ============================================================

        middleColumns: {
            width: '100%',
            maxWidth: 1600,
        },

        // Large screens:
        //
        // ┌──────────────────────┬──────────────────────┐
        // │      LEFT COLUMN     │     RIGHT COLUMN     │
        // │                      │                      │
        // │       Video          │     Definition       │
        // │       Progress       │     Translation      │
        // │       Words          │     Information      │
        // │                      │                      │
        // └──────────────────────┴──────────────────────┘

        middleColumnsLarge: {
            flexDirection: 'row',
            alignItems: 'stretch',
            justifyContent: 'center',
            gap: 10,
        },

        // Small screens:
        //
        // ┌──────────────────────────────┐
        // │         LEFT COLUMN          │
        // │ Video / Progress / Words     │
        // ├──────────────────────────────┤
        // │         RIGHT COLUMN         │
        // │ Definition / Translation    │
        // └──────────────────────────────┘

        middleColumnsSmall: {
            flexDirection: 'column',
            alignItems: 'center',
        },


        // ============================================================
        // LEFT COLUMN
        // ============================================================

        leftColumn: {

            alignItems: 'stretch',
        },

        leftColumnLarge: {
            flex: 7,

        },

        leftColumnSmall: {
            width: '100%',

        },


        // ============================================================
        // RIGHT COLUMN
        // ============================================================

        rightColumn: {
            alignItems: 'center',
        },

        rightColumnLarge: {
            flex: 3,
            minHeight: 600,
        },

        rightColumnSmall: {
            width: '100%',
            marginTop: 20,
        },


        // ============================================================
        // LESSON TEXT
        // ============================================================

        lessonText: {
            fontSize: 20,
            color: 'white',
            textAlign: 'center',
            marginBottom: 20,
        },


        // ============================================================
        // VIDEO PLAYER
        // ============================================================

        videoPlayer: {
        },


        // ============================================================
        // WORD CONTAINER
        // ============================================================

        wordContainer: {
            minHeight: 100,
            height: 120,
            width: '100%',

            justifyContent: 'center',
            alignItems: 'center',

            paddingHorizontal: 20,
            marginTop: 10,
            marginBottom: 10,

            overflow: 'scroll',

            // Web-specific scrollbar properties
            scrollbarWidth: 'thin',
            scrollbarColor: '#888 #444444',

            overflowX: 'hidden',
        },

        wordScroll: {
            flex: 1,
            width: '100%',
        },

        wordWrap: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
        },

        word: {
            fontSize: 20,
            color: 'white',
            paddingHorizontal: 4,
        },


        // ============================================================
        // PART OF SPEECH
        // ============================================================

        partOfSpeech: {
            fontStyle: 'italic',
            textAlign: 'right',
            color: '#666',
            fontWeight: 'bold',
            top: 20,
        },


        // ============================================================
        // DEFINITION CONTAINER
        // ============================================================

        defContainer: {
            backgroundColor: 'rgb(57, 62, 70)',
            borderRadius: 5,

            padding: 15,

            width: '100%',
            minHeight: 500,

            position: 'relative',

            overflowY: 'scroll',

            paddingBottom: 20,

            // Web scrollbar
            scrollbarColor: '#888 #444444',
        },

        defHeader: {
            fontSize: 25,
            fontWeight: 'bold',
            fontFamily: 'serif',
        },


        // ============================================================
        // TRANSLATE BUTTON
        // ============================================================

        translateBtn: {
            position: 'absolute',
            top: 10,
            right: 40,

            backgroundColor: '#00adb5',

            padding: 8,

            borderRadius: 5,

            minWidth: 60,

            shadowColor: '#30475e',
            shadowOffset: {
                width: 0,
                height: 2,
            },
            shadowOpacity: 0.3,
            shadowRadius: 6,

            // Android shadow
            elevation: 4,
        },

        buttonText: {
            color: 'black',
            fontWeight: 'bold',
        },

        btnText: {
            textAlign: 'center',
            color: 'white',
            fontWeight: 'bold',
        },


        // ============================================================
        // DEFINITION TEXT
        // ============================================================

        textRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 20,
            minHeight: 5,
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
            fontSize: 20,
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


        // ============================================================
        // SEPARATORS
        // ============================================================

        separatorSolid: {
            height: 1,
            backgroundColor: 'rgb(57, 62, 70)',
            marginVertical: 8,
        },

        separatorDotted: {
            borderBottomWidth: 1,
            borderBottomColor: '#888',
            borderStyle: 'dotted',
            marginVertical: 8,
        },


        // ============================================================
        // COPY BUTTON
        // ============================================================

        copy1: {
            position: 'absolute',
            marginLeft: '80%',
            top: 18,
            width: 'fit-content',
            padding: 3,
        },


        // ============================================================
        // BOTTOM SECTION
        // ============================================================

        bottomSection: {
            height: 100,
            width: '100%',
            marginBottom: 24,
            justifyContent: 'center',
            alignItems: 'center',

            backgroundColor: '#1b1f2a',
        },

        controls: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',

            gap: 40,
        },

        // ============================================================
        // HAMBURGER MENU
        // ============================================================

        hamburgerIcon: {
            position: 'absolute',
            bottom: 20,
            right: 40,

            zIndex: 10,

            justifyContent: 'center',
        },


        // ============================================================
        // SIDE MENU
        // ============================================================

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
            shadowOffset: {
                width: 2,
                height: 2,
            },
            shadowOpacity: 0.2,
            shadowRadius: 4,

            color: 'white',
        },

        menuHeader: {
            color: 'white',
            fontSize: 24,
        },


        // ============================================================
        // BACK LINK
        // ============================================================

        backLink: {
            position: 'absolute',

            top: 40,
            right: 20,

            flexDirection: 'row',
            alignItems: 'center',

            zIndex: 10,
        },

    });

