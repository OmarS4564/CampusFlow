import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Course, PlannerEvent } from '../types';
import { colors } from '../theme';
import { formatShortDate, formatTime } from '../utils/date';
import { Icon } from './Icon';

const typeMeta = {
  assignment: { label: 'Assignment', icon: 'document-text-outline' },
  exam: { label: 'Exam', icon: 'flash-outline' },
  class: { label: 'Class', icon: 'school-outline' },
  personal: { label: 'Personal', icon: 'sparkles-outline' },
};

type Props = {
  event: PlannerEvent;
  course?: Course;
  showDate?: boolean;
  onPress: () => void;
  onToggle: () => void;
};

export function EventCard({ event, course, showDate = true, onPress, onToggle }: Props) {
  const accent = course?.color ?? colors.blue;
  const meta = typeMeta[event.type];
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: event.completed }}
        onPress={(pressEvent) => {
          pressEvent.stopPropagation();
          onToggle();
        }}
        style={[styles.check, event.completed && { backgroundColor: accent, borderColor: accent }]}
      >
        {event.completed && <Icon name="checkmark" size={15} color={colors.white} />}
      </Pressable>
      <View style={styles.content}>
        <View style={styles.topLine}>
          <Text numberOfLines={1} style={[styles.title, event.completed && styles.completed]}>{event.title}</Text>
          {event.priority === 'high' && !event.completed && <View style={styles.priorityDot} />}
        </View>
        <Text style={[styles.course, { color: accent }]}>{course?.code ?? meta.label}</Text>
        <View style={styles.metaRow}>
          {event.repeatMode !== 'none' && <Icon name="repeat" size={13} color={accent} />}
          <Icon name="time-outline" size={14} color={colors.muted} />
          <Text style={styles.metaText}>{showDate ? `${formatShortDate(event.date)} · ` : ''}{formatTime(event.time)}</Text>
          {!!event.location && (
            <>
              <Text style={styles.separator}>·</Text>
              <Icon name="location-outline" size={14} color={colors.muted} />
              <Text numberOfLines={1} style={[styles.metaText, styles.location]}>{event.location}</Text>
            </>
          )}
        </View>
      </View>
      <Icon name="chevron-forward" size={17} color={colors.softMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 94,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 20,
    paddingVertical: 15,
    paddingRight: 14,
    paddingLeft: 19,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#EEF0F5',
  },
  pressed: { opacity: 0.76 },
  accent: { position: 'absolute', left: 0, top: 16, bottom: 16, width: 4, borderRadius: 4 },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  content: { flex: 1 },
  topLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: colors.ink, letterSpacing: -0.2 },
  completed: { color: colors.softMuted, textDecorationLine: 'line-through' },
  priorityDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.coral },
  course: { fontSize: 11, fontWeight: '800', marginTop: 4, marginBottom: 7, letterSpacing: 0.3 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: colors.muted, fontWeight: '500' },
  separator: { color: colors.softMuted, marginHorizontal: 1 },
  location: { flexShrink: 1 },
});
