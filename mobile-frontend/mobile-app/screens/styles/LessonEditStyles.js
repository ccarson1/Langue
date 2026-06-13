import { StyleSheet } from 'react-native';


export const createStyles = (insets) =>
    StyleSheet.create({
        // Wrapper needed so BottomAudioMenu (position:absolute) anchors correctly
        screenWrapper: {
            flex: 1,
            backgroundColor: '#222831',
            marginBottom: insets.bottom,
            marginTop: insets.top,
        },

        container: {
            flexGrow: 1,
            backgroundColor: '#222831',
            paddingTop: 80,
            paddingHorizontal: 10,
            paddingBottom: 120, // extra room so content clears the BottomAudioMenu
            
        },

        header: {
            color: '#eeeeee',
            fontSize: 30,
            fontWeight: '700',
            marginBottom: 30,
            textAlign: 'center',
        },

        label: {
            color: '#eeeeee',
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8,
            marginTop: 18,
        },

        input: {
            backgroundColor: '#393e46',
            borderRadius: 10,
            padding: 8,
            color: '#eeeeee',
            fontSize: 16,
            borderWidth: 1,
            borderColor: '#4b525c',
        },

        switchRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 20,
            marginBottom: 10,
        },

        tableHeader: {
            flexDirection: 'row',
            marginBottom: 10,
            gap: 10,
        },

        headerColumn: {
            flex: 1,
            color: '#00adb5',
            fontSize: 18,
            fontWeight: '700',
            textAlign: 'center',
        },

        headerColumnSmall: {
            flex: 0.1,
            color: '#00adb5',
            fontSize: 18,
            fontWeight: '700',
            textAlign: 'center',
        },

        row: {
            flexDirection: 'row',
            marginBottom: 15,
            gap: 10,
        },

        columnInput: {
            flex: 1,
            backgroundColor: '#393e46',
            borderRadius: 10,
            padding: 14,
            color: '#eeeeee',
            fontSize: 15,
            borderWidth: 1,
            borderColor: '#4b525c',
            textAlignVertical: 'top',
        },

        saveButton: {
            backgroundColor: '#00adb5',
            padding: 18,
            borderRadius: 10,
            alignItems: 'center',
            marginTop: 30,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.4,
            shadowRadius: 8,
            elevation: 5,
        },

        saveButtonText: {
            color: '#222831',
            fontWeight: '700',
            fontSize: 18,
        },

        backLink: {
            position: 'absolute',
            top: 40,
            right: 20,
            zIndex: 20,
        },

        downloadRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: 10,
        },

        downloadButton: {
            backgroundColor: '#00adb5',
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 8,
        },

        downloadButtonText: {
            color: '#222831',
            fontWeight: '600',
            fontSize: 14,
        },

        collapseHeader: {
            backgroundColor: '#393e46',
            borderRadius: 10,
            padding: 8,
            borderWidth: 1,
            borderColor: '#4b525c',
            marginTop: 20,
            marginBottom: 20,
        },

        collapseHeaderText: {
            fontSize: 16,
            fontWeight: 'bold',
            color: '#eeeeee',
        },

        sentenceColumn: {
            flex: 1,
        },

        timeInput: {
            marginTop: 5,
            backgroundColor: '#393e46',
            borderRadius: 10,
            padding: 8,
            color: '#eeeeee',
            borderWidth: 1,
            borderColor: '#4b525c',
        },
    });