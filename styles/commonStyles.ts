
import { StyleSheet } from 'react-native';

// Financial App Color Palette - Black Glassy Dark Theme
export const colors = {
  // Dark theme - Black Glassy Design
  background: '#000000', // Pure black background
  card: 'rgba(25, 25, 40, 0.7)', // Dark, slightly transparent for glassy effect
  text: '#E0E0E0', // Light grey text
  textSecondary: '#A0A0A0', // Medium grey for secondary text
  primary: '#1A1A2E', // Dark blue/purple for accents
  secondary: '#16213E', // Even darker blue/purple
  accent: '#2A2A4E', // Subtle accent
  highlight: '#3A3A5E', // Lighter highlight
  danger: '#F44336', // Red for errors/danger
  border: '#333344', // Subtle dark border
  success: '#4CAF50', // Green for positive values
  
  // Gradient colors for glassy cards
  gradientStart: '#1A1A2E',
  gradientEnd: '#0F0F1A',
  
  // Legacy aliases (kept for backward compatibility)
  backgroundAlt: '#1A1A2E',
  grey: '#A0A0A0',
  
  // Additional glassy colors
  glassBackground: 'rgba(25, 25, 40, 0.6)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  glassHighlight: 'rgba(255, 255, 255, 0.05)',
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
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
