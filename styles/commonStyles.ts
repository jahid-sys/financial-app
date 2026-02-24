import { StyleSheet } from 'react-native';

// Financial App Color Palette - Professional and Modern
export const colors = {
  // Light theme
  background: '#F8FAFC',
  card: '#FFFFFF',
  text: '#1E293B',
  textSecondary: '#64748B',
  primary: '#10B981', // Green for positive/income
  secondary: '#3B82F6', // Blue for savings
  accent: '#8B5CF6', // Purple for investments
  highlight: '#F59E0B', // Amber for highlights
  danger: '#EF4444', // Red for expenses
  border: '#E2E8F0',
  
  // Dark theme
  darkBackground: '#0F172A',
  darkCard: '#1E293B',
  darkText: '#F1F5F9',
  darkTextSecondary: '#94A3B8',
  darkBorder: '#334155',

  // Legacy aliases (kept for backward compatibility)
  backgroundAlt: '#162133',
  grey: '#90CAF9',
};

export const buttonStyles = StyleSheet.create({
  instructionsButton: {
    backgroundColor: colors.primary,
    alignSelf: 'center',
    width: '100%',
  },
  backButton: {
    backgroundColor: colors.backgroundAlt,
    alignSelf: 'center',
    width: '100%',
  },
});

export const commonStyles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 800,
    width: '100%',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    color: colors.text,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  text: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginBottom: 8,
    lineHeight: 24,
    textAlign: 'center',
  },
  section: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  buttonContainer: {
    width: '100%',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  icon: {
    width: 60,
    height: 60,
    tintColor: "white",
  },
});
