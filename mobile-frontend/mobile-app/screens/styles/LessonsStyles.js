import { StyleSheet } from 'react-native';

// ── Palette ─────────────────────────────────────────────────────────
const colors = {
    bg: '#222831',
    surface: '#393e46',
    surfaceElevated: '#3f454e',
    border: '#4b525c',
    borderSubtle: '#333944',
    text: '#eeeeee',
    textMuted: '#a0a6ad',
    accent: '#00adb5',
    accentDark: '#00838a',
    danger: '#e05a5a',
    dangerBg: '#3a2a2c',
};


// ── Breakpoints ─────────────────────────────────────────────────────
export const getBreakpoint = (width) => {
    if (width >= 700) return 'wide';
    if (width >= 600) return 'tablet';
    if (width >= 360) return 'phone';
    return 'small';
};


export const createStyles = (insets, width = 390) => {
    const bp = getBreakpoint(width);

    const isSmall = bp === 'small';
    const isTablet = bp === 'tablet' || bp === 'wide';
    const isWide = bp === 'wide';

    const contentMaxWidth = isWide
        ? 1520
        : isTablet
            ? 1200
            : undefined;


    return StyleSheet.create({

        // ─────────────────────────────────────────────────────────────
        // SCREEN
        // ─────────────────────────────────────────────────────────────

        container: {
            flex: 1,
            backgroundColor: colors.bg,
            paddingTop: isSmall ? 44 : 52,
            paddingHorizontal: isTablet
                ? 24
                : isSmall
                    ? 12
                    : 16,
            marginBottom: insets.bottom,
            marginTop: insets.top,
            width: '100%',
        },


        // ─────────────────────────────────────────────────────────────
        // BACK BUTTON
        // ─────────────────────────────────────────────────────────────

        backLink: {
            position: 'absolute',
            top: 40,
            right: isTablet ? 24 : 20,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(57,62,70,0.9)',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
        },


        // ─────────────────────────────────────────────────────────────
        // SEARCH / SORT / FILTER TOOLBAR
        // ─────────────────────────────────────────────────────────────

        toolbar: {
            flexDirection: 'row',
            alignItems: 'center',
            width: '100%',
            maxWidth: 1100,
            alignSelf: 'center',
            paddingHorizontal: isSmall ? 0 : 4,
            marginTop: isSmall ? 8 : 10,
            marginBottom: 8,
            gap: isSmall ? 6 : 8,
        },


        searchContainer: {
            flex: 1,
            height: isSmall ? 42 : 44,
            minWidth: 0,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: isSmall ? 10 : 12,
        },


        searchInput: {
            flex: 1,
            height: isSmall ? 42 : 44,
            marginLeft: 8,
            color: colors.text,
            fontSize: isSmall ? 14 : 16,
            outlineStyle: 'none',
        },


        toolbarButton: {
            width: isSmall ? 42 : 44,
            height: isSmall ? 42 : 44,
            borderRadius: 10,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            justifyContent: 'center',
            alignItems: 'center',
            position: 'relative',
        },


        toolbarButtonPressed: {
            backgroundColor: colors.surfaceElevated,
        },


        activeButton: {
            backgroundColor: colors.accentDark,
            borderColor: colors.accent,
        },


        // ─────────────────────────────────────────────────────────────
        // FILTER BADGE
        // ─────────────────────────────────────────────────────────────

        filterBadge: {
            position: 'absolute',
            right: -4,
            top: -5,
            minWidth: 18,
            height: 18,
            borderRadius: 9,
            backgroundColor: colors.accent,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 3,
        },


        filterBadgeText: {
            color: colors.bg,
            fontSize: 11,
            fontWeight: '800',
        },


        // ─────────────────────────────────────────────────────────────
        // DROPDOWN MENUS
        // ─────────────────────────────────────────────────────────────

        dropdown: {
            position: 'absolute',
            top: isSmall ? 105 : 112,
            right: isTablet ? 68 : 58,
            width: isSmall ? 145 : 160,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 5,
            zIndex: 1000,
            elevation: 10,

            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 5,
            },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },


        filterDropdown: {
            position: 'absolute',
            top: isSmall ? 105 : 112,
            right: isTablet ? 24 : 16,
            width: isSmall ? 180 : 200,
            backgroundColor: colors.surface,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: colors.border,
            paddingVertical: 5,
            zIndex: 1000,
            elevation: 10,

            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 5,
            },
            shadowOpacity: 0.3,
            shadowRadius: 8,
        },


        menuItem: {
            minHeight: isSmall ? 40 : 44,
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
        },


        menuItemPressed: {
            backgroundColor: colors.surfaceElevated,
        },


        menuText: {
            color: colors.text,
            fontSize: isSmall ? 14 : 15,
            marginLeft: 10,
        },


        menuTextSelected: {
            color: colors.accent,
            fontWeight: '700',
        },


        // ─────────────────────────────────────────────────────────────
        // CHECKBOX
        // ─────────────────────────────────────────────────────────────

        checkbox: {
            width: 20,
            height: 20,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 4,
            backgroundColor: colors.bg,
            justifyContent: 'center',
            alignItems: 'center',
        },


        checkboxChecked: {
            backgroundColor: colors.accent,
            borderColor: colors.accent,
        },


        // ─────────────────────────────────────────────────────────────
        // FILTER MENU DONE BUTTON
        // ─────────────────────────────────────────────────────────────

        doneButton: {
            borderTopWidth: 1,
            borderTopColor: colors.border,
            marginTop: 5,
            paddingVertical: 10,
            alignItems: 'center',
        },


        doneText: {
            color: colors.accent,
            fontWeight: '700',
            fontSize: 14,
        },


        // ─────────────────────────────────────────────────────────────
        // LESSON COUNT
        // ─────────────────────────────────────────────────────────────

        lessonCount: {
            width: '100%',
            maxWidth: 1100,
            alignSelf: 'center',
            color: colors.textMuted,
            fontSize: isSmall ? 13 : 14,
            marginTop: 2,
            marginBottom: 4,
            paddingHorizontal: 4,
        },


        // ─────────────────────────────────────────────────────────────
        // LESSON GRID
        // ─────────────────────────────────────────────────────────────

        gridWrapper: {
            paddingTop: isSmall ? 12 : 18,
            paddingHorizontal: isSmall ? 0 : 8,
            paddingBottom: 40,

            flexDirection: 'row',
            flexWrap: 'wrap',
            justifyContent: 'center',

            gap: isSmall ? 10 : 16,

            width: '100%',
        },


        // ─────────────────────────────────────────────────────────────
        // LESSON CARD
        // ─────────────────────────────────────────────────────────────

        card: {
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.borderSubtle,

            padding: isSmall ? 14 : 20,

            margin: isSmall ? 4 : 10,

            width: isSmall
                ? '100%'
                : isTablet
                    ? 320
                    : 320,

            maxWidth: 400,

            alignItems: 'center',

            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 6,
            },
            shadowOpacity: 0.25,
            shadowRadius: 8,

            elevation: 5,
        },


        // ─────────────────────────────────────────────────────────────
        // LESSON TITLE
        // ─────────────────────────────────────────────────────────────

        title: {
            color: colors.text,
            fontSize: isSmall ? 16 : 18,
            fontWeight: '600',
            marginBottom: 12,
            textAlign: 'center',
        },


        // ─────────────────────────────────────────────────────────────
        // LESSON IMAGE
        // ─────────────────────────────────────────────────────────────

        image: {
            width: '100%',
            height: isSmall ? 160 : 180,
            borderRadius: 8,
            marginBottom: 12,
        },


        // ─────────────────────────────────────────────────────────────
        // READ BUTTON
        // ─────────────────────────────────────────────────────────────

        button: {
            backgroundColor: colors.accent,
            paddingVertical: 12,
            paddingHorizontal: 24,
            borderRadius: 8,
            width: '100%',
            alignItems: 'center',

            shadowColor: colors.accent,
            shadowOffset: {
                width: 0,
                height: 4,
            },
            shadowOpacity: 0.2,
            shadowRadius: 6,

            elevation: 3,
        },


        buttonText: {
            color: colors.bg,
            fontWeight: '700',
            fontSize: isSmall ? 15 : 16,
        },


        // ─────────────────────────────────────────────────────────────
        // EDIT BUTTON
        // ─────────────────────────────────────────────────────────────

        editButton: {
            position: 'absolute',
            top: 10,
            right: 10,
            zIndex: 10,

            backgroundColor: colors.surfaceElevated,

            padding: 7,
            borderRadius: 20,

            borderWidth: 1,
            borderColor: colors.border,
        },


        // ─────────────────────────────────────────────────────────────
        // NO RESULTS
        // ─────────────────────────────────────────────────────────────

        noResults: {
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 60,
            paddingBottom: 60,
        },


        noResultsText: {
            color: colors.textMuted,
            fontSize: isSmall ? 16 : 17,
            marginTop: 10,
        },


        // ─────────────────────────────────────────────────────────────
        // DELETE SENTENCE BUTTON
        // ─────────────────────────────────────────────────────────────

        deleteSentenceButton: {
            width: 60,
            minHeight: 100,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: colors.surfaceElevated,
        },

    });
};
