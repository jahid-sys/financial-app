
import { StyleSheet } from 'react-native';

// Financial App Color Palette - Pink/Purple Gradient Theme (from design reference)
export const colors = {
  // Light theme - Pink/Purple Gradient Design
  background: '#F5E6F0', // Soft pink background
  card: '#FFFFFF',
  text: '#2D1B3D', // Deep purple text
  textSecondary: '#8B7A99', // Muted purple
  primary: '#D4A5D8', // Soft purple/pink
  secondary: '#B88BB8', // Medium purple
  accent: '#9B6B9E', // Deep purple accent
  highlight: '#E8B4E8', // Light pink highlight
  danger: '#E85D75', // Soft red
  border: '#E8D4E8',
  success: '#A8D5BA', // Soft green for positive values
  
  // Gradient colors for cards
  gradientStart: '#D4A5D8',
  gradientEnd: '#B88BB8',
  
  // Dark theme
  darkBackground: '#1A0F24',
  darkCard: '#2D1B3D',
  darkText: '#F5E6F0',
  darkTextSecondary: '#B8A8C8',
  darkBorder: '#3D2B4D',

  // Legacy aliases (kept for backward compatibility)
  backgroundAlt: '#2D1B3D',
  grey: '#B8A8C8',
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
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#9B6B9E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
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
