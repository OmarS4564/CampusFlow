import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Icon } from '../components/Icon';
import { usePlanner } from '../context/PlannerContext';
import { colors } from '../theme';
import { Course } from '../types';
import { todayKey } from '../utils/date';

type Props = { onAdd: () => void; onEdit: (course: Course) => void };

export function CoursesScreen({ onAdd, onEdit }: Props) {
  const { courses, events, settings } = usePlanner();
  const counts = useMemo(() => {
    const map = new Map<string, number>();
    events.filter((event) => !event.completed && event.type !== 'class' && event.date >= todayKey()).forEach((event) => {
      if (event.courseId) map.set(event.courseId, (map.get(event.courseId) ?? 0) + 1);
    });
    return map;
  }, [events]);
  const credits = courses.reduce((sum, course) => sum + course.credits, 0);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View><Text style={styles.eyebrow}>{settings.term.toUpperCase()}</Text><Text style={styles.title}>My courses</Text></View>
        <Pressable onPress={onAdd} style={styles.addButton}><Icon name="add" size={24} color={colors.white} /></Pressable>
      </View>
      <View style={styles.summary}>
        <View style={styles.summaryIcon}><Icon name="layers" size={22} color={colors.primary} /></View>
        <View style={styles.summaryCopy}><Text style={styles.summaryTitle}>{courses.length} active courses</Text><Text style={styles.summarySub}>{credits} credits this term</Text></View>
        <View style={styles.termPill}><Text style={styles.termPillText}>IN PROGRESS</Text></View>
      </View>

      <Text style={styles.sectionTitle}>COURSE LIST</Text>
      <View style={styles.list}>
        {!courses.length && (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}><Icon name="library-outline" size={25} color={colors.primary} /></View>
            <Text style={styles.emptyTitle}>Add your first course</Text>
            <Text style={styles.emptyText}>Add credits and a weekly schedule to place every class meeting on your calendar.</Text>
          </View>
        )}
        {courses.map((course) => (
          <Pressable key={course.id} onPress={() => onEdit(course)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.75 }]}>
            <View style={[styles.colorBlock, { backgroundColor: course.color }]}>
              <Text style={styles.codeShort}>{course.code.split(' ')[0].slice(0, 3)}</Text>
              <View style={styles.colorGlow} />
            </View>
            <View style={styles.cardBody}>
              <View style={styles.cardTop}><Text style={[styles.code, { color: course.color }]}>{course.code}</Text><Icon name="ellipsis-horizontal" size={18} color={colors.softMuted} /></View>
              <Text style={styles.name}>{course.name}</Text>
              <View style={styles.detail}><Icon name="person-outline" size={14} color={colors.muted} /><Text style={styles.detailText}>{course.instructor || 'No instructor'}</Text></View>
              <View style={styles.detail}><Icon name="location-outline" size={14} color={colors.muted} /><Text style={styles.detailText}>{course.room || 'Room TBD'}</Text></View>
              <View style={styles.detail}><Icon name="repeat-outline" size={14} color={colors.muted} /><Text style={styles.detailText}>{course.schedule || 'Edit to add weekly class times'}</Text></View>
              <View style={styles.footer}>
                <View style={[styles.taskBadge, { backgroundColor: `${course.color}14` }]}><Text style={[styles.taskText, { color: course.color }]}>{counts.get(course.id) ?? 0} upcoming tasks</Text></View>
                <Text style={styles.credits}>{course.credits} {course.credits === 1 ? 'credit' : 'credits'}</Text>
              </View>
            </View>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={onAdd} style={styles.addCourse}><Icon name="add-circle-outline" size={21} color={colors.primary} /><Text style={styles.addCourseText}>Add another course</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 32 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  summary: { minHeight: 78, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, padding: 14, flexDirection: 'row', alignItems: 'center' },
  summaryIcon: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  summaryCopy: { flex: 1, marginLeft: 12 },
  summaryTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  summarySub: { color: colors.muted, fontSize: 11, marginTop: 3 },
  termPill: { backgroundColor: colors.tealSoft, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 8 },
  termPillText: { color: colors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  sectionTitle: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 24, marginBottom: 10 },
  list: { gap: 12 },
  emptyCard: { alignItems: 'center', backgroundColor: colors.card, borderRadius: 23, padding: 27, borderWidth: 1, borderColor: colors.line },
  emptyIcon: { width: 50, height: 50, borderRadius: 17, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 16, fontWeight: '900', marginTop: 12 },
  emptyText: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', maxWidth: 250, marginTop: 5 },
  card: { minHeight: 195, flexDirection: 'row', borderRadius: 23, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  colorBlock: { width: 72, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  codeShort: { color: colors.white, fontSize: 13, fontWeight: '900', transform: [{ rotate: '-90deg' }], letterSpacing: 1.5 },
  colorGlow: { position: 'absolute', width: 90, height: 90, borderRadius: 45, borderWidth: 20, borderColor: 'rgba(255,255,255,0.08)', bottom: -40, left: -45 },
  cardBody: { flex: 1, padding: 16 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  name: { color: colors.ink, fontSize: 17, fontWeight: '900', marginTop: 5, marginBottom: 13, letterSpacing: -0.3 },
  detail: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 7 },
  detailText: { color: colors.muted, fontSize: 11, fontWeight: '600', flexShrink: 1 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  taskBadge: { borderRadius: 9, paddingHorizontal: 10, paddingVertical: 6 },
  taskText: { fontSize: 9, fontWeight: '900' },
  credits: { color: colors.softMuted, fontSize: 10, fontWeight: '800' },
  addCourse: { marginTop: 15, height: 54, borderRadius: 17, borderWidth: 1.5, borderColor: '#F5C3DA', borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  addCourseText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
});
