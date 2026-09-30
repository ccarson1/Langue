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
        // LIBRARY
        // ============================================================

        library: {
            flex: 1,
            width: '100%',
            marginTop: insets.top,
            marginBottom: insets.bottom,
            padding: 30,
            backgroundColor: COLORS.background,

            ...Platform.select({
                web: {
                    boxSizing: 'border-box',
                },
            }),
        },


        // ============================================================
        // HEADER
        // ============================================================

        libraryHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',

            marginBottom: 25,
        },


        libraryTitle: {
            margin: 0,

            fontSize: 32,
            fontWeight: '700',

            color: COLORS.text,
        },


        libraryCount: {
            fontSize: 16,

            color: COLORS.textMuted,
        },


        // ============================================================
        // BOOK LIST
        // ============================================================

        libraryList: {
            width: '100%',
            maxWidth: 900,

            gap: 10,
        },


        // ============================================================
        // BOOK ITEM
        // ============================================================

        libraryItem: {
            width: '100%',

            flexDirection: 'row',
            alignItems: 'center',

            gap: 15,

            paddingVertical: 18,
            paddingHorizontal: 20,

            borderWidth: 1,
            borderColor: COLORS.border,
            borderRadius: 8,

            backgroundColor: COLORS.surface,

            ...Platform.select({
                web: {
                    cursor: 'pointer',
                },
            }),
        },


        // ============================================================
        // BOOK ICON
        // ============================================================

        libraryItemIcon: {
            fontSize: 28,

            flexShrink: 0,
        },


        // ============================================================
        // BOOK CONTENT
        // ============================================================

        libraryItemContent: {
            flex: 1,
        },


        libraryItemTitle: {
            fontSize: 18,
            fontWeight: '600',

            color: COLORS.text,
        },


        // ============================================================
        // BOOK ARROW
        // ============================================================

        libraryItemArrow: {
            fontSize: 22,

            color: COLORS.textMuted,
        },


        // ============================================================
        // ERROR
        // ============================================================

        libraryError: {
            fontSize: 16,

            color: COLORS.danger,
        },


        // ============================================================
        // EMPTY
        // ============================================================

        libraryEmpty: {
            fontSize: 16,

            color: COLORS.textMuted,
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