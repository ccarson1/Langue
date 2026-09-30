import { StyleSheet, Platform } from 'react-native';

const COLORS = {
    background: '#1b1f2a',
    surface: '#242938',
    surfaceRaised: '#2c3244',
    accent: '#00b8c4',
    accentDark: '#009aa5',
    danger: '#ff4d4d',
    dangerDark: '#5a1a1a',
    text: '#f5f7fa',
    textMuted: 'rgba(245, 247, 250, 0.65)',
    border: 'rgba(245, 247, 250, 0.08)',
};

export const createStyles = (insets) =>
    StyleSheet.create({

        // ============================================================
        // MAIN CONTAINER
        // ============================================================

        container: {
            flex: 1,
            marginTop: insets.top,
            marginBottom: insets.bottom,
            backgroundColor:
                COLORS.background,
        },


        // ============================================================
        // TOOLBAR
        // ============================================================

        toolbar: {
            width: '100%',
            height: 60,

            flexDirection: 'row',
            alignItems: 'center',

            backgroundColor:
                COLORS.surfaceRaised,

            paddingHorizontal: 15,
        },


        contentsButton: {
            paddingHorizontal: 15,
            paddingVertical: 8,

            backgroundColor:
                COLORS.accent,

            borderRadius: 5,

            ...Platform.select({
                web: {
                    cursor: 'pointer',
                },
            }),
        },


        contentsButtonText: {
            color:
                COLORS.text,

            fontWeight: 'bold',
        },


        pageNavigation: {
            flexDirection: 'row',
            alignItems: 'center',

            marginLeft: 'auto',
        },


        pageLabel: {
            color:
                COLORS.text,

            marginHorizontal: 5,
        },


        pageInput: {
            width: 60,

            paddingVertical: 5,
            paddingHorizontal: 8,

            backgroundColor:
                COLORS.text,

            color:
                COLORS.background,

            borderRadius: 4,

            textAlign: 'center',
        },


        // ============================================================
        // MAIN AREA
        // ============================================================

        mainArea: {
            flex: 1,

            flexDirection: 'row',
            minHeight: 0,
            minWidth: 0,
        },


        // ============================================================
        // SIDEBAR
        // ============================================================

        sidebar: {
            width: 280,

            backgroundColor:
                COLORS.surface,

            borderRightWidth: 1,

            borderRightColor:
                COLORS.border,

            zIndex: 5,
        },


        sidebarClosed: {
            width: 0,

            overflow: 'hidden',
        },


        sidebarHeader: {
            height: 50,

            justifyContent: 'center',

            paddingHorizontal: 15,

            backgroundColor:
                COLORS.surfaceRaised,
        },


        sidebarHeaderText: {
            color:
                COLORS.text,

            fontSize: 18,

            fontWeight: 'bold',
        },


        tocList: {
            flex: 1,
        },


        tocEntry: {
            width: '100%',

            flexDirection: 'row',
            alignItems: 'center',

            justifyContent:
                'space-between',

            paddingVertical: 10,
            paddingHorizontal: 12,

            backgroundColor:
                'transparent',

            ...Platform.select({
                web: {
                    cursor: 'pointer',
                },
            }),
        },


        tocEntryActive: {
            backgroundColor:
                COLORS.accent,
        },


        tocEntryText: {
            flex: 1,

            color:
                COLORS.text,

            marginRight: 10,
        },


        tocPageNumber: {
            color:
                COLORS.textMuted,
        },


        // ============================================================
        // VIEWER
        // ============================================================

        viewer: {
            flex: 1,

            minWidth: 0,
            minHeight: 0,

            backgroundColor:
                COLORS.background,
        },


        // ============================================================
        // PAGE CONTAINER
        // ============================================================

        pageContainer: {
            alignItems: 'center',
            justifyContent: 'flex-start',
        },


        // ============================================================
        // PAGE
        // ============================================================

        page: {
            position: 'relative',

            flexShrink: 0,

            backgroundColor:
                COLORS.text,

            shadowColor:
                '#000',

            shadowOffset: {
                width: 0,
                height: 4,
            },

            shadowOpacity: 0.35,

            shadowRadius: 10,

            elevation: 5,
        },


        // ============================================================
        // PAGE IMAGE
        // ============================================================

        pageImage: {
            position: 'absolute',

            resizeMode: 'stretch',
        },


        // ============================================================
        // PAGE TEXT
        // ============================================================

        text: {
            position: 'absolute',

            color:
                '#000000',

            margin: 0,

            padding: 0,

            includeFontPadding:
                true,
        },


        // ============================================================
        // BOTTOM NAVIGATION
        // ============================================================

        bottomNavigation: {
            width: '100%',

            height: 60,

            flexDirection: 'row',

            alignItems: 'center',

            justifyContent:
                'center',

            gap: 30,

            backgroundColor:
                COLORS.background,
        },


        navigationButton: {
            paddingHorizontal: 20,
            paddingVertical: 10,

            backgroundColor:
                COLORS.surfaceRaised,

            borderRadius: 5,

            ...Platform.select({
                web: {
                    cursor: 'pointer',
                },
            }),
        },


        navigationButtonDisabled: {
            opacity: 0.4,
        },


        navigationButtonText: {
            color:
                COLORS.text,

            fontWeight: 'bold',

            fontSize: 16,
        },


        // ============================================================
        // LOADING
        // ============================================================

        loading: {
            flex: 1,

            alignItems: 'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.background,
        },


        loadingText: {
            color:
                COLORS.text,

            fontSize: 18,
        },


        // ============================================================
        // ERROR
        // ============================================================

        error: {
            flex: 1,

            alignItems: 'center',

            justifyContent:
                'center',

            padding: 30,

            backgroundColor:
                COLORS.background,
        },


        errorTitle: {
            color:
                COLORS.text,

            fontSize: 22,

            fontWeight: 'bold',

            marginBottom: 10,
        },


        errorText: {
            color:
                COLORS.textMuted,

            fontSize: 16,

            textAlign: 'center',
        },


        // ============================================================
        // BACK BUTTON
        // ============================================================

        backButton: {
            position: 'absolute',

            top: 40,
            right: 20,

            zIndex: 10,
        },


        // ============================================================
        // PAGE VERTICAL SCROLL
        // ============================================================

        pageVerticalScroll: {
            height: '100%',
            width: '100%',
        },


        pageVerticalContainer: {
            alignItems: 'center',
        },

        // ============================================================
        // BACK BUTTON
        // ============================================================

        backButton: {
            width: 36,
            height: 36,

            borderRadius: 18,

            backgroundColor:
                COLORS.surface,

            justifyContent: 'center',
            alignItems: 'center',

            ...Platform.select({
                web: {
                    cursor: 'pointer',
                    transition:
                        'background-color 0.15s ease',
                },
            }),
        },


        // ============================================================
        // BACK BUTTON HOVER
        // ============================================================

        backButtonHovered: {
            backgroundColor:
                COLORS.surfaceRaised,
        },


        // ============================================================
        // BACK BUTTON PRESSED
        // ============================================================

        backButtonPressed: {
            opacity: 0.75,
        },

    });