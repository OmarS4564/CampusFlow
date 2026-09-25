import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { Icon } from './Icon';

export function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.icon}><Icon name="checkmark-done" color={colors.teal} size={25} /></View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 22, padding: 24, borderWidth: 1, borderColor: colors.line },
  icon: { width: 48, height: 48, borderRadius: 16, backgroundColor: colors.tealSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  title: { color: colors.ink, fontSize: 15, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 5, lineHeight: 18 },
});

