import React from 'react';
import { Pressable, StyleSheet, Text, ViewStyle, TextStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

export const C = {
  bg: '#FFF8E1',
  honey: '#FFD23F',
  honeyDark: '#F4A300',
  brown: '#3B2A1A',
  sky: '#6EC6FF',
  green: '#4CAF50',
  red: '#EF5350',
  purple: '#8E6CEF',
  white: '#FFFFFF',
  gray: '#8A7F72',
};

export function BigButton({
  label,
  onPress,
  color = C.honey,
  textColor = C.brown,
  style,
  textStyle,
  disabled,
  small,
}: {
  label: string;
  onPress: () => void;
  color?: string;
  textColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.btn,
        small && styles.small,
        { backgroundColor: color, opacity: disabled ? 0.45 : 1, transform: [{ scale: pressed ? 0.95 : 1 }] },
        style,
      ]}
    >
      <Text style={[styles.label, small && styles.smallLabel, { color: textColor }, textStyle]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 24,
    paddingVertical: 16,
    paddingHorizontal: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 5,
    borderColor: 'rgba(0,0,0,0.18)',
    marginVertical: 6,
  },
  small: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, borderBottomWidth: 4 },
  label: { fontSize: 22, fontWeight: '800' },
  smallLabel: { fontSize: 17 },
});
