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
        ? 1100
        : isTablet
            ? 900
            : undefined;


    return StyleSheet.create({

        // ─────────────────────────────────────────────────────────────
        // SCREEN
        // ─────────────────────────────────────────────────────────────

        screen: {
            flex: 1,
            backgroundColor: colors.bg,
            paddingTop: 12,
            paddingBottom: insets.bottom,
            paddingHorizontal: isTablet
                ? 24
                : isSmall
                    ? 12
                    : 16,
            width: '100%',
        },


        container: {
            alignSelf: 'center',
            paddingTop: isSmall ? 8 : 12,
            paddingBottom: 40,
            gap: isSmall ? 12 : 16,
        },


        // ─────────────────────────────────────────────────────────────
        // BACK BUTTON
        // ─────────────────────────────────────────────────────────────

        backLink: {
            position: 'absolute',
            top: insets.top + 12,
            left: isTablet ? Math.max(20, (width - contentMaxWidth) / 2) : 20,
            zIndex: 20,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(57,62,70,0.9)',
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },


        // ─────────────────────────────────────────────────────────────
        // HEADER
        // ─────────────────────────────────────────────────────────────

        headerRow: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
            gap: 12,
        },


        headerTextContainer: {
            flex: 1,
            minWidth: 0,
        },


        eyebrow: {
            color: colors.accent,
            fontSize: 11,
            fontWeight: '800',
            letterSpacing: 2,
            marginBottom: 8,
        },


        header: {
            color: colors.text,
            fontSize: isSmall ? 24 : isTablet ? 32 : 28,
            fontWeight: '800',
            lineHeight: isSmall ? 30 : isTablet ? 39 : 34,
            marginBottom: 6,
        },


        subtitle: {
            color: colors.textMuted,
            fontSize: isSmall ? 13 : 15,
            lineHeight: 22,
        },


        // ─────────────────────────────────────────────────────────────
        // REFRESH BUTTON
        // ─────────────────────────────────────────────────────────────

        refreshButton: {
            width: isSmall ? 40 : 44,
            height: isSmall ? 40 : 44,
            borderRadius: 12,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
            justifyContent: 'center',
        },


        refreshButtonText: {
            color: colors.accent,
            fontSize: 28,
            fontWeight: '600',
            lineHeight: 32,
        },


        // ─────────────────────────────────────────────────────────────
        // ARTICLE CARD
        // ─────────────────────────────────────────────────────────────

        articleCard: {
            width: '100%',
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            overflow: 'hidden',
            marginBottom: isSmall ? 12 : 16,

            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 5,
            },
            shadowOpacity: 0.22,
            shadowRadius: 7,
            elevation: 4,
        },


        articleImage: {
            width: '100%',
            height: isSmall ? 175 : isTablet ? 300 : 230,
            backgroundColor: colors.surfaceElevated,
        },


        cardContent: {
            padding: isSmall ? 14 : 20,
        },


        articleDate: {
            color: colors.textMuted,
            fontSize: isSmall ? 12 : 13,
            marginBottom: 8,
        },


        articleTitle: {
            color: colors.text,
            fontSize: isSmall ? 18 : isTablet ? 23 : 20,
            fontWeight: '700',
            lineHeight: isSmall ? 25 : 30,
            marginBottom: 10,
        },


        articleSummary: {
            color: colors.text,
            fontSize: isSmall ? 14 : 16,
            lineHeight: isSmall ? 21 : 25,
            marginBottom: 18,
        },


        // ─────────────────────────────────────────────────────────────
        // READ ARTICLE BUTTON
        // ─────────────────────────────────────────────────────────────

        readButton: {
            width: '100%',
            minHeight: 46,
            backgroundColor: colors.accent,
            borderRadius: 9,
            paddingVertical: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
        },


        readButtonText: {
            color: colors.bg,
            fontSize: isSmall ? 14 : 15,
            fontWeight: '800',
        },


        arrow: {
            color: colors.bg,
            fontSize: 20,
            fontWeight: '700',
        },


        // ─────────────────────────────────────────────────────────────
        // LOADING / STATUS
        // ─────────────────────────────────────────────────────────────

        statusContainer: {
            width: '100%',
            alignItems: 'center',
            justifyContent: 'center',
            paddingTop: 60,
            paddingBottom: 60,
            paddingHorizontal: 20,
        },


        statusCard: {
            width: '100%',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: 14,
            padding: isSmall ? 18 : 24,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 12,
        },


        statusText: {
            color: colors.textMuted,
            fontSize: isSmall ? 14 : 16,
            lineHeight: 23,
            textAlign: 'center',
            marginTop: 10,
        },


        errorTitle: {
            color: colors.danger,
            fontSize: isSmall ? 17 : 19,
            fontWeight: '700',
            textAlign: 'center',
        },


        inlineError: {
            width: '100%',
            color: colors.danger,
            backgroundColor: colors.dangerBg,
            borderWidth: 1,
            borderColor: colors.danger,
            borderRadius: 8,
            padding: 12,
            marginBottom: 12,
            fontSize: 13,
            lineHeight: 20,
        },


        // ─────────────────────────────────────────────────────────────
        // TRY AGAIN BUTTON
        // ─────────────────────────────────────────────────────────────

        primaryButton: {
            minHeight: 44,
            backgroundColor: colors.accent,
            borderRadius: 8,
            paddingVertical: 11,
            paddingHorizontal: 22,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 18,
        },


        primaryButtonText: {
            color: colors.bg,
            fontSize: 15,
            fontWeight: '700',
        },

        feedPickerContainer: {
            marginBottom: 20,
            zIndex: 100,
            position: "relative",
        },

        feedPickerLabel: {
            color: "#a0a6ad",
            fontSize: 11,
            fontWeight: "700",
            letterSpacing: 1.2,
            marginBottom: 8,
        },

        feedPicker: {
            minHeight: 48,
            backgroundColor: "#393e46",
            borderWidth: 1,
            borderColor: "#4b525c",
            borderRadius: 10,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
        },

        feedPickerText: {
            flex: 1,
            color: "#eeeeee",
            fontSize: 15,
        },

        feedPickerDropdown: {
            position: "absolute",
            top: 76,
            left: 0,
            right: 0,
            backgroundColor: "#393e46",
            borderWidth: 1,
            borderColor: "#4b525c",
            borderRadius: 10,
            overflow: "hidden",
            zIndex: 101,
            elevation: 10,
        },

        feedPickerOption: {
            minHeight: 46,
            paddingHorizontal: 14,
            paddingVertical: 12,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            borderBottomWidth: 1,
            borderBottomColor: "#333944",
        },

        feedPickerOptionSelected: {
            backgroundColor: "#333944",
        },

        feedPickerOptionText: {
            flex: 1,
            color: "#eeeeee",
            fontSize: 14,
        },

        feedPickerEmpty: {
            color: "#a0a6ad",
            padding: 14,
            fontSize: 13,
        },


    });
};
