import { StyleSheet, Platform } from 'react-native';

export const createStyles = (insets) =>
    StyleSheet.create({
        container: {
            flex: 1,
            marginTop: insets.top,
            marginBottom: insets.bottom,
            backgroundColor: '#222831',
        },

        loadingText: {
            color: 'white',
            fontSize: 20,
            textAlign: 'center',
            marginTop: 50,
        },

        header: {
            backgroundColor: '#30475e',
            paddingVertical: 20,
            alignItems: 'center',
            justifyContent: 'center',
        },

        headerText: {
            color: 'white',
            fontSize: 28,
            fontFamily: 'PlaywriteHU-Regular',
        },

        menu: {
            flexDirection: 'row',
            justifyContent: 'center',
            alignItems: 'center',
            paddingVertical: 12,
            gap: 10,
            backgroundColor: '#222831',
        },

        menuButton: {
            paddingVertical: 10,
            paddingHorizontal: 30,
            borderRadius: 8,
            backgroundColor: '#393e46',
        },

        menuButtonActive: {
            backgroundColor: '#00adb5',
        },

        menuText: {
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
        },

        menuTextActive: {
            color: 'white',
        },

        scrollContent: {
            padding: 20,
            alignItems: 'center',
        },

        description: {
            color: 'white',
            fontSize: 16,
            textAlign: 'center',
            marginBottom: 20,
            maxWidth: 700,
        },

        grid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',
            width: '100%',
            gap: 12,
        },

        card: {
            backgroundColor: '#393e46',
            borderRadius: 12,
            padding: 16,
            width: Platform.OS === 'web' ? 180 : '46%',
            minHeight: 140,
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
            userSelect: 'none',
        },

        letter: {
            fontSize: 36,
            color: '#00adb5',
            fontWeight: 'bold',
            marginBottom: 8,
        },

        name: {
            color: 'white',
            fontSize: 18,
            fontWeight: '600',
            textAlign: 'center',
            marginBottom: 6,
        },

        pronunciation: {
            color: '#eeeeee',
            fontSize: 16,
            textAlign: 'center',
        },

        backLink: {
            position: 'absolute',
            top: 40,
            right: 20,
            flexDirection: 'row',
            alignItems: 'center',
            zIndex: 10,
        },
        libraryLink: {
            position: 'absolute',
            top: 40,
            left: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            zIndex: 10,
        },

        libraryLinkText: {
            color: 'white',
            fontSize: 16,
            fontWeight: '600',
        },
    });
