import { StyleSheet } from 'react-native';

// ── Palette (unchanged) ──────────────────────────────────────────────
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
// small  : narrow phones (iPhone SE, etc.)        width < 360
// phone  : standard phones                        360–599
// tablet : iPad mini/portrait tablets and up       600–899
// wide   : landscape tablets / foldables / desktop  >= 900
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

    // Content column caps out on large screens instead of stretching edge to edge
    const contentMaxWidth = isWide ? 1520 : isTablet ? 680 : undefined;

    return StyleSheet.create({
        // Wrapper needed so BottomAudioMenu (position:absolute) anchors correctly
        screenWrapper: {
            flex: 1,
            backgroundColor: colors.bg,
            marginBottom: insets.bottom,
            marginTop: insets.top,
        },

        container: {
            flexGrow: 1,
            backgroundColor: colors.bg,
            paddingTop: isSmall ? 44 : 52,
            paddingHorizontal: isTablet ? 24 : isSmall ? 12 : 16,
            paddingBottom: 100,
            width: '100%',
            maxWidth: contentMaxWidth,
            alignSelf: 'center',
        },

        header: {
            color: colors.text,
            fontSize: isTablet ? 28 : isSmall ? 20 : 24,
            fontWeight: '700',
            letterSpacing: 0.3,
            marginBottom: isTablet ? 22 : 18,
            textAlign: 'center',
        },

        // ── Section grouping ────────────────────────────────────────
        sectionCard: {
            backgroundColor: colors.surface,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            padding: isTablet ? 16 : 12,
            marginBottom: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.18,
            shadowRadius: 6,
            elevation: 2,
        },

        label: {
            color: colors.textMuted,
            fontSize: isSmall ? 12 : 13,
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: 0.6,
            marginBottom: 6,
            marginTop: isTablet ? 14 : 12,
        },

        input: {
            backgroundColor: colors.bg,
            borderRadius: 10,
            paddingVertical: isTablet ? 11 : 10,
            paddingHorizontal: 12,
            color: colors.text,
            fontSize: isSmall ? 15 : 16,
            borderWidth: 1,
            borderColor: colors.border,
        },

        switchRow: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 18,
            marginBottom: 6,
            paddingVertical: 4,
        },

        // ── Sentences table ─────────────────────────────────────────
        // On tablets/wide screens the header only needs to sit above the
        // two text columns, since the drag handle and index sit outside them.
        tableHeader: {
            flexDirection: 'row',
            marginBottom: 10,
            paddingBottom: 10,
            borderBottomWidth: 1,
            borderBottomColor: colors.border,
            gap: 10,
        },

        headerColumn: {
            flex: 1,
            color: colors.accent,
            fontSize: isSmall ? 12 : 13,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            textAlign: 'center',
        },

        headerColumnSmall: {
            flex: 0.1,
            color: colors.accent,
            fontSize: isSmall ? 12 : 13,
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            textAlign: 'center',
        },

        // Default (phone/small): drag handle + index + stacked columns all in one row.
        row: {
            flexDirection: 'row',
            alignItems: isSmall ? 'stretch' : 'center',
            backgroundColor: colors.surfaceElevated,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            padding: isSmall ? 6 : 8,
            marginBottom: 12,
            gap: isSmall ? 6 : 10,
            flexWrap: isSmall ? 'wrap' : 'nowrap',
        },

        // On narrow phones, native/translation inputs stack full-width instead
        // of squeezing two multiline boxes side by side.
        sentenceInputsWrap: {
            flexDirection: isSmall ? 'column' : 'row',
            flex: 1,
            gap: isSmall ? 8 : 10,
        },

        columnInput: {
            flex: 1,
            backgroundColor: colors.bg,
            borderRadius: 10,
            padding: isTablet ? 12 : 10,
            color: colors.text,
            fontSize: isTablet ? 16 : 15,
            lineHeight: 20,
            borderWidth: 1,
            borderColor: colors.border,
            textAlignVertical: 'top',
            minHeight: isSmall ? 56 : undefined,
        },

        // ── Primary buttons ─────────────────────────────────────────
        // On tablets, Save/Add sit side by side instead of stacked full-width.
        actionRow: {
            flexDirection: isTablet ? 'row' : 'column',
            gap: isTablet ? 12 : 0,
            marginTop: isTablet ? 6 : 0,
        },

        saveButton: {
            flex: isTablet ? 1 : undefined,
            backgroundColor: colors.accent,
            paddingVertical: isTablet ? 15 : 13,
            borderRadius: 12,
            alignItems: 'center',
            marginTop: 20,
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.3,
            shadowRadius: 10,
            elevation: 5,
        },

        saveButtonText: {
            color: colors.bg,
            fontWeight: '700',
            fontSize: isTablet ? 17 : 16,
            letterSpacing: 0.3,
        },

        addSentenceButton: {
            flex: isTablet ? 1 : undefined,
            flexDirection: 'row',
            backgroundColor: 'transparent',
            paddingVertical: isTablet ? 13 : 11,
            borderRadius: 12,
            borderWidth: 1.5,
            borderColor: colors.accent,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            marginTop: 16,
        },

        addSentenceButtonText: {
            color: colors.accent,
            fontWeight: '700',
            fontSize: 16,
        },

        backLink: {
            position: 'absolute',
            top: 40,
            left: isTablet ? Math.max(20, (width - contentMaxWidth) / 2) : 20,
            zIndex: 20,
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: 'rgba(57,62,70,0.85)',
            alignItems: 'center',
            justifyContent: 'center',
        },

        downloadRow: {
            flexDirection: 'row',
            justifyContent: 'flex-end',
            marginTop: 12,
        },

        downloadButton: {
            backgroundColor: colors.accent,
            paddingVertical: 10,
            paddingHorizontal: 16,
            borderRadius: 8,
        },

        downloadButtonText: {
            color: colors.bg,
            fontWeight: '700',
            fontSize: 13,
            letterSpacing: 0.3,
        },

        collapseHeader: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: colors.surface,
            borderRadius: 10,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderWidth: 1,
            borderColor: colors.borderSubtle,
            marginTop: 16,
            marginBottom: 12,
        },

        collapseHeaderText: {
            fontSize: 15,
            fontWeight: '700',
            color: colors.text,
            letterSpacing: 0.3,
        },

        sentenceColumn: {
            flex: 1,
        },

        timeInput: {
            marginTop: 6,
            backgroundColor: colors.bg,
            borderRadius: 8,
            paddingVertical: 8,
            paddingHorizontal: 10,
            color: colors.textMuted,
            fontSize: 13,
            borderWidth: 1,
            borderColor: colors.border,
        },

        deleteSentenceButton: {
            width: isSmall ? '100%' : 36,
            alignItems: 'center',
            justifyContent: 'center',
        },

        // ── Danger button ────────────────────────────────────────────
        deleteButton: {
            marginTop: 12,
            marginBottom: 20,
            paddingVertical: 12,
            borderRadius: 12,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            backgroundColor: colors.dangerBg,
            borderWidth: 1,
            borderColor: colors.danger,
            gap: 8,
        },

        deleteButtonText: {
            color: colors.danger,
            fontSize: 15,
            fontWeight: '700',
            letterSpacing: 0.3,
        },

        dragHandle: {
            width: 32,
            justifyContent: 'center',
            alignItems: 'center',
        },

        draggingRow: {
            transform: [{ scale: 1.03 }],
            opacity: 0.92,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.35,
            shadowRadius: 8,
            zIndex: 100,
            elevation: 8,
        },

        dropIndicator: {
            height: 3,
            marginVertical: 4,
            borderRadius: 2,
            backgroundColor: colors.accent,
        },
    });
};