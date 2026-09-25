import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { Icon } from '../components/Icon';
import { usePlanner } from '../context/PlannerContext';
import { colors } from '../theme';
import { PlannerEvent } from '../types';
import { buildMonthGrid, changeMonth, formatLongDate, monthTitle, sortEventDateTime, toDateKey, todayKey } from '../utils/date';

type Props = { onOpenEvent: (event: PlannerEvent) => void; onAddDate: (date: string) => void };

export function CalendarScreen({ onOpenEvent, onAddDate }: Props) {
  const { events, courses, toggleEvent } = usePlanner();
  const [month, setMonth] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const days = useMemo(() => buildMonthGrid(month), [month]);
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const eventsByDate = useMemo(() => {
    const map = new Map<string, PlannerEvent[]>();
    events.forEach((event) => map.set(event.date, [...(map.get(event.date) ?? []), event]));
    return map;
  }, [events]);
  const selectedEvents = [...(eventsByDate.get(selectedDate) ?? [])].sort(sortEventDateTime);

  const moveMonth = (amount: number) => {
    const next = changeMonth(month, amount);
    setMonth(next);
    setSelectedDate(toDateKey(new Date(next.getFullYear(), next.getMonth(), 1)));
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.titleRow}>
        <View><Text style={styles.eyebrow}>YOUR SCHEDULE</Text><Text style={styles.title}>Calendar</Text></View>
        <Pressable onPress={() => { setMonth(new Date()); setSelectedDate(todayKey()); }} style={styles.todayButton}><Text style={styles.todayText}>Today</Text></Pressable>
      </View>

      <View style={styles.calendarCard}>
        <View style={styles.monthHeader}>
          <Pressable onPress={() => moveMonth(-1)} style={styles.arrow}><Icon name="chevron-back" size={19} /></Pressable>
          <Text style={styles.month}>{monthTitle(month)}</Text>
          <Pressable onPress={() => moveMonth(1)} style={styles.arrow}><Icon name="chevron-forward" size={19} /></Pressable>
        </View>
        <View style={styles.weekdays}>{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, index) => <Text key={`${day}-${index}`} style={styles.weekday}>{day}</Text>)}</View>
        <View style={styles.grid}>
          {days.map((day) => {
            const key = toDateKey(day);
            const active = key === selectedDate;
            const today = key === todayKey();
            const inMonth = day.getMonth() === month.getMonth();
            const dayEvents = eventsByDate.get(key) ?? [];
            return (
              <Pressable key={key} onPress={() => setSelectedDate(key)} style={styles.dayCell}>
                <View style={[styles.dayNumber, active && styles.dayNumberActive, today && !active && styles.todayOutline]}>
                  <Text style={[styles.dayText, !inMonth && styles.outsideText, active && styles.activeText]}>{day.getDate()}</Text>
                </View>
                <View style={styles.dots}>
                  {dayEvents.slice(0, 3).map((event) => <View key={event.id} style={[styles.dot, { backgroundColor: event.courseId ? courseById.get(event.courseId)?.color ?? colors.blue : colors.blue }]} />)}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.agendaHeader}>
        <View><Text style={styles.agendaTitle}>{formatLongDate(selectedDate)}</Text><Text style={styles.agendaCount}>{selectedEvents.length || 'No'} {selectedEvents.length === 1 ? 'item' : 'items'}</Text></View>
        <Pressable onPress={() => onAddDate(selectedDate)} style={styles.addSmall}><Icon name="add" size={22} color={colors.white} /></Pressable>
      </View>
      <View style={styles.list}>
        {selectedEvents.length ? selectedEvents.map((event) => (
          <EventCard key={event.id} event={event} course={event.courseId ? courseById.get(event.courseId) : undefined} showDate={false} onPress={() => onOpenEvent(event)} onToggle={() => toggleEvent(event.id, !event.completed)} />
        )) : <EmptyState title="Nothing scheduled" subtitle="This day is open. Tap + to add a class, assignment, or plan." />}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 30 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 19 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 2 },
  todayButton: { borderRadius: 12, backgroundColor: colors.primarySoft, paddingHorizontal: 14, paddingVertical: 9 },
  todayText: { color: colors.primary, fontSize: 11, fontWeight: '900' },
  calendarCard: { backgroundColor: colors.card, borderRadius: 25, padding: 14, borderWidth: 1, borderColor: colors.line },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 4, marginBottom: 12 },
  arrow: { width: 37, height: 37, borderRadius: 13, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' },
  month: { color: colors.ink, fontSize: 16, fontWeight: '900' },
  weekdays: { flexDirection: 'row', marginBottom: 5 },
  weekday: { width: '14.285%', textAlign: 'center', color: colors.softMuted, fontSize: 10, fontWeight: '900' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  dayCell: { width: '14.285%', height: 52, alignItems: 'center', justifyContent: 'center' },
  dayNumber: { width: 33, height: 33, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  dayNumberActive: { backgroundColor: colors.primary },
  todayOutline: { borderWidth: 1.5, borderColor: colors.primary },
  dayText: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  outsideText: { color: '#CBD0DB' },
  activeText: { color: colors.white, fontWeight: '900' },
  dots: { flexDirection: 'row', gap: 2, height: 4, marginTop: 2 },
  dot: { width: 3.5, height: 3.5, borderRadius: 2 },
  agendaHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  agendaTitle: { color: colors.ink, fontSize: 17, fontWeight: '900', letterSpacing: -0.3 },
  agendaCount: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 3 },
  addSmall: { width: 39, height: 39, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  list: { gap: 10 },
});
