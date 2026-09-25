import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

type Props = { title: string; action?: string; onAction?: () => void };

export function SectionHeader({ title, action, onAction }: Props) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {!!action && <Pressable onPress={onAction}><Text style={styles.action}>{action}</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 19, color: colors.ink, fontWeight: '900', letterSpacing: -0.4 },
  action: { fontSize: 13, color: colors.primary, fontWeight: '800' },
});

