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
const CARD_WIDTH = 220;
const CARD_HEIGHT = 130;

export const createStyles = (insets) =>


StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  scrollContent: {
    paddingBottom: 60,
  },

  loadingScreen: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },

  loadingText: {
    color: COLORS.textMuted,
    fontSize: 15,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'web' ? 20 : 44,
    paddingBottom: 12,
  },

  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
    }),
  },

  backButtonHovered: {
    backgroundColor: COLORS.surfaceRaised,
  },

  backButtonPressed: {
    opacity: 0.75,
  },

  logo: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.4,
    marginLeft: 12,
  },

  headerSpacer: {
    flex: 1,
  },

  // Player layout — stacks on narrow screens, splits into two
  // columns (video / info) once WIDE_LAYOUT_BREAKPOINT is reached.
  playerLayout: {
    flexDirection: 'column',
    marginBottom: 8,
  },

  playerLayoutWide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    gap: 24,
  },

  videoColumn: {
    width: '100%',
  },

  videoColumnWide: {
    flex: 1.6,
    minWidth: 0,
  },

  infoColumn: {
    width: '100%',
  },

  infoColumnStacked: {
    paddingHorizontal: 16,
  },

  infoColumnWide: {
    flex: 1,
    minWidth: 320,
    maxWidth: 420,
    gap: 16,
  },

  actionsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    gap: 12,
    flexWrap: 'wrap',
  },

  actionsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  actionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  reactionGroup: {
    flexDirection: 'row',
    gap: 4,
  },

  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
    }),
  },

  iconButtonHovered: {
    backgroundColor: COLORS.surfaceRaised,
  },

  recordButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'all 0.15s ease' },
    }),
  },

  recordButtonHovered: {
    backgroundColor: COLORS.surfaceRaised,
  },

  recordButtonPressed: {
    opacity: 0.85,
  },

  recordingActive: {
    backgroundColor: COLORS.dangerDark,
    borderColor: COLORS.danger,
  },

  recordDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: COLORS.danger,
  },

  recordText: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },

  streamInfo: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
  },

  streamInfoTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 4,
  },

  streamInfoLine: {
    color: COLORS.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },

  // Section headings
  sectionTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    paddingHorizontal: 16,
    marginBottom: 10,
    letterSpacing: 0.2,
  },

  // Add channel panel
  panel: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    marginTop: 12,
    marginBottom: 26,
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  panelTitle: {
    color: COLORS.text,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },

  panelSubtitle: {
    color: COLORS.textMuted,
    fontSize: 13,
    marginBottom: 16,
  },

  formRow: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    gap: 10,
  },

  // The side column is narrower than the full-width layout, so stack
  // the two inputs vertically instead of squeezing them side by side.
  formRowStacked: {
    flexDirection: 'column',
  },

  input: {
    flex: 1,
    backgroundColor: COLORS.background,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    fontSize: 14,
    ...Platform.select({
      web: { outlineStyle: 'none', transition: 'border-color 0.15s ease' },
    }),
  },

  inputFocused: {
    borderColor: COLORS.accent,
  },

  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },

  button: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
    }),
  },

  buttonHovered: {
    backgroundColor: COLORS.accentDark,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonDisabled: {
    opacity: 0.5,
  },

  buttonText: {
    color: COLORS.background,
    fontWeight: '700',
    fontSize: 13,
  },

  buttonSecondary: {
    backgroundColor: 'transparent',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 240,
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'border-color 0.15s ease' },
    }),
  },

  buttonSecondaryHovered: {
    borderColor: COLORS.accent,
  },

  buttonSecondaryText: {
    color: COLORS.text,
    fontWeight: '600',
    fontSize: 13,
  },

  // Scrollable rows
  rowSection: {
    marginTop: 22,
  },

  rowContainer: {
    position: 'relative',
    justifyContent: 'center',
  },

  row: {
    paddingHorizontal: 16,
    gap: 14,
    flexGrow: 1,
  },

  emptyRow: {
    width: 220,
    height: CARD_HEIGHT,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  emptyRowText: {
    color: COLORS.textMuted,
    fontSize: 12,
    textAlign: 'center',
  },

  scrollArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -18,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(20, 22, 30, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 10,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.35)',
        transition: 'background-color 0.15s ease, transform 0.15s ease',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },

  scrollArrowLeft: {
    left: 6,
  },

  scrollArrowRight: {
    right: 6,
  },

  scrollArrowHovered: {
    backgroundColor: COLORS.accent,
  },

  scrollArrowPressed: {
    transform: [{ scale: 0.92 }],
  },

  // Cards
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: 'transparent',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'transform 0.15s ease, border-color 0.15s ease' },
    }),
  },

  cardBackground: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  cardImage: {
    borderRadius: 12,
  },

  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 12, 18, 0.15)',
  },

  cardHovered: {
    transform: [{ scale: 1.03 }],
    borderColor: COLORS.border,
  },

  cardPressed: {
    opacity: 0.9,
  },

  cardActive: {
    borderColor: COLORS.accent,
  },

  cardTitle: {
    color: COLORS.text,
    fontWeight: '700',
    fontSize: 15,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
    margin: 10,
  },

  recordingMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 10,
    backgroundColor: 'rgba(10, 12, 18, 0.55)',
  },

  recordingSubtext: {
    color: COLORS.textMuted,
    fontSize: 11,
    marginTop: 2,
  },

  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 100,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(10, 12, 18, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: { cursor: 'pointer', transition: 'background-color 0.15s ease' },
    }),
  },

  deleteButtonHovered: {
    backgroundColor: COLORS.danger,
  },
  toggleCard: {
    paddingHorizontal: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 36,

  },
  label: {
    color: 'white',
    fontSize: 13,
    marginBottom: 4,
    marginRight: 15,
  },
  reactionColumn: {
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-start',
  },
});