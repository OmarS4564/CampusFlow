import * as Haptics from 'expo-haptics';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadow } from '../theme';
import { Icon } from './Icon';

export type AppTab = 'home' | 'calendar' | 'courses' | 'settings';

const items: { key: AppTab; label: string; icon: string; activeIcon: string }[] = [
  { key: 'home', label: 'Today', icon: 'home-outline', activeIcon: 'home' },
  { key: 'calendar', label: 'Calendar', icon: 'calendar-outline', activeIcon: 'calendar' },
  { key: 'courses', label: 'Courses', icon: 'library-outline', activeIcon: 'library' },
  { key: 'settings', label: 'More', icon: 'settings-outline', activeIcon: 'settings' },
];

type Props = {
  active: AppTab;
  onChange: (tab: AppTab) => void;
  onAdd: () => void;
};

export function BottomNav({ active, onChange, onAdd }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.row}>
        {items.map((item, index) => (
          <React.Fragment key={item.key}>
            {index === 2 && (
              <View style={styles.addSlot}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add item"
                  onPress={() => {
                    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    onAdd();
                  }}
                  style={({ pressed }) => [styles.addButton, pressed && styles.pressed]}
                >
                  <Icon name="add" size={30} color={colors.white} />
                </Pressable>
                <Text style={styles.addLabel}>Add</Text>
              </View>
            )}
            <Pressable
              accessibilityRole="tab"
              accessibilityState={{ selected: active === item.key }}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(item.key);
              }}
              style={styles.item}
            >
              <Icon
                name={active === item.key ? item.activeIcon : item.icon}
                size={22}
                color={active === item.key ? colors.primary : colors.softMuted}
              />
              <Text style={[styles.label, active === item.key && styles.labelActive]}>{item.label}</Text>
              {active === item.key && <View style={styles.activeDot} />}
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.card,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.line,
    ...shadow,
  },
  row: { height: 64, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 6 },
  item: { flex: 1, height: 58, alignItems: 'center', justifyContent: 'center', gap: 3 },
  label: { color: colors.softMuted, fontSize: 10, fontWeight: '700' },
  labelActive: { color: colors.primary },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.primary, marginTop: 1 },
  addSlot: { width: 64, alignItems: 'center', alignSelf: 'flex-end', paddingBottom: 3 },
  addButton: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -25,
    borderWidth: 4,
    borderColor: colors.background,
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  addLabel: { fontSize: 10, fontWeight: '700', color: colors.softMuted, marginTop: 2 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.96 }] },
});

