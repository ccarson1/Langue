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
            paddingTop: 8,
            paddingBottom: insets.bottom,
            width: '100%',
        },


        // ─────────────────────────────────────────────────────────────
        // TOP BAR
        // ─────────────────────────────────────────────────────────────

        topBar: {
            width: '100%',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: isSmall ? 12 : 16,
            paddingVertical: 8,
            borderBottomWidth: 1,
            borderBottomColor: colors.borderSubtle,
        },




        topBarTitle: {
            flex: 1,
            color: colors.text,
            fontSize: isSmall ? 15 : 17,
            fontWeight: '700',
            textAlign: 'center',
            marginHorizontal: 12,
        },


        backButtonPlaceholder: {
            width: 42,
        },


        // ─────────────────────────────────────────────────────────────
        // ARTICLE CONTAINER
        // ─────────────────────────────────────────────────────────────

        container: {
            alignSelf: 'center',
            paddingTop: isSmall ? 12 : 20,
            paddingHorizontal: isSmall ? 0 : 4,
            paddingBottom: 40,
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
            padding: isSmall ? 14 : isTablet ? 28 : 22,

            shadowColor: '#000',
            shadowOffset: {
                width: 0,
                height: 5,
            },
            shadowOpacity: 0.22,
            shadowRadius: 8,
            elevation: 4,
        },


        // ─────────────────────────────────────────────────────────────
        // ARTICLE HEADER
        // ─────────────────────────────────────────────────────────────

        eyebrow: {
            color: colors.accent,
            fontSize: isSmall ? 11 : 12,
            fontWeight: '700',
            letterSpacing: 1.3,
            marginBottom: 12,
        },


        articleTitle: {
            color: colors.text,
            fontSize: isSmall ? 22 : isTablet ? 32 : 27,
            fontWeight: '700',
            lineHeight: isSmall ? 30 : isTablet ? 41 : 35,
        },


        articleDate: {
            color: colors.textMuted,
            fontSize: isSmall ? 12 : 13,
            marginTop: 12,
            marginBottom: 16,
        },


        // ─────────────────────────────────────────────────────────────
        // ARTICLE IMAGE
        // ─────────────────────────────────────────────────────────────

        articleImage: {
            width: '100%',
            height: isSmall ? 180 : isTablet ? 360 : 260,
            borderRadius: 10,
            backgroundColor: colors.surfaceElevated,
            marginBottom: 18,
        },


        // ─────────────────────────────────────────────────────────────
        // ARTICLE SUMMARY
        // ─────────────────────────────────────────────────────────────

        summary: {
            color: colors.text,
            fontSize: isSmall ? 15 : isTablet ? 19 : 17,
            fontWeight: '600',
            lineHeight: isSmall ? 24 : isTablet ? 31 : 27,
            marginBottom: 12,
        },


        // ─────────────────────────────────────────────────────────────
        // ARTICLE BODY
        // ─────────────────────────────────────────────────────────────

        divider: {
            height: 1,
            backgroundColor: colors.border,
            marginVertical: 18,
        },


        paragraph: {
            color: colors.text,
            fontSize: isSmall ? 15 : isTablet ? 18 : 16,
            lineHeight: isSmall ? 26 : isTablet ? 32 : 28,
            marginBottom: isSmall ? 16 : 20,
        },


        // ─────────────────────────────────────────────────────────────
        // ORIGINAL ARTICLE BUTTON
        // ─────────────────────────────────────────────────────────────

        originalButton: {
            backgroundColor: colors.accent,
            borderRadius: 10,
            paddingVertical: isSmall ? 13 : 14,
            paddingHorizontal: 16,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 12,
        },


        originalButtonText: {
            color: colors.bg,
            fontSize: isSmall ? 14 : 15,
            fontWeight: '700',
            textAlign: 'center',
        },


        // ─────────────────────────────────────────────────────────────
        // LOADING / STATUS
        // ─────────────────────────────────────────────────────────────

        statusContainer: {
            width: '100%',
            padding: isSmall ? 24 : 30,
            alignItems: 'center',
            justifyContent: 'center',
        },


        statusCard: {
            width: '100%',
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            padding: isSmall ? 16 : 24,
            borderRadius: 14,
            alignItems: 'center',
            justifyContent: 'center',
        },


        statusText: {
            color: colors.textMuted,
            fontSize: isSmall ? 14 : 15,
            lineHeight: isSmall ? 22 : 24,
            textAlign: 'center',
            marginTop: 12,
        },


        errorTitle: {
            color: colors.danger,
            fontSize: isSmall ? 17 : 18,
            fontWeight: '700',
            textAlign: 'center',
        },


        // ─────────────────────────────────────────────────────────────
        // BACK TO NEWS BUTTON
        // ─────────────────────────────────────────────────────────────

        backToNewsButton: {
            backgroundColor: colors.accent,
            borderRadius: 10,
            paddingVertical: 12,
            paddingHorizontal: 20,
            marginTop: 18,
            alignItems: 'center',
            justifyContent: 'center',
        },


        backToNewsText: {
            color: colors.bg,
            fontSize: 15,
            fontWeight: '700',
        },
        

    });
};
