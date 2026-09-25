import { LinearGradient } from 'expo-linear-gradient';
import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePlanner } from '../context/PlannerContext';
import { colors, shadow } from '../theme';
import { PlannerEvent } from '../types';
import { daysUntil, formatLongDate, sortEventDateTime, todayKey } from '../utils/date';
import { EmptyState } from '../components/EmptyState';
import { EventCard } from '../components/EventCard';
import { Icon } from '../components/Icon';
import { SectionHeader } from '../components/SectionHeader';

type Props = {
  onOpenEvent: (event: PlannerEvent) => void;
  onCalendar: () => void;
};

export function HomeScreen({ onOpenEvent, onCalendar }: Props) {
  const { events, courses, settings, toggleEvent } = usePlanner();
  const today = todayKey();
  const courseById = useMemo(() => new Map(courses.map((course) => [course.id, course])), [courses]);
  const upcoming = useMemo(
    () => events.filter((event) => event.date >= today).sort(sortEventDateTime),
    [events, today],
  );
  const todayEvents = upcoming.filter((event) => event.date === today);
  const laterEvents = upcoming.filter((event) => event.date > today).slice(0, 4);
  const dueThisWeek = upcoming.filter((event) => !event.completed && event.type !== 'class' && daysUntil(event.date) <= 7).length;
  const actionable = events.filter((event) => event.type !== 'class');
  const completed = actionable.filter((event) => event.completed).length;
  const progress = actionable.length ? Math.round((completed / actionable.length) * 100) : 0;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={styles.kicker}>
            {formatLongDate(today).toUpperCase()}
          </Text>
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72} style={styles.greeting}>
            {greeting}, {settings.userName}
          </Text>
        </View>
        <View style={styles.avatar}><Text style={styles.avatarText}>{settings.userName.trim().charAt(0).toUpperCase() || 'S'}</Text><View style={styles.online} /></View>
      </View>

      <LinearGradient colors={['#F06AAA', '#D73F8C']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        <View style={styles.orbOne} />
        <View style={styles.orbTwo} />
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}><Icon name="sparkles" size={18} color="#FFE0EE" /></View>
          <Text style={styles.heroTerm}>{settings.term}</Text>
        </View>
        <Text style={styles.heroTitle}>{dueThisWeek ? `${dueThisWeek} things need your focus` : 'You’re all caught up'}</Text>
        <Text style={styles.heroSubtitle}>{dueThisWeek ? 'A little progress today makes the week lighter.' : 'Nothing urgent in the next seven days.'}</Text>
        <View style={styles.heroBottom}>
          <View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${progress}%` }]} /></View>
          <Text style={styles.progressText}>{progress}% complete</Text>
        </View>
      </LinearGradient>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.coralSoft }]}><Icon name="flame" size={20} color={colors.coral} /></View>
          <View><Text style={styles.statValue}>{dueThisWeek}</Text><Text style={styles.statLabel}>Due this week</Text></View>
        </View>
        <View style={styles.statCard}>
          <View style={[styles.statIcon, { backgroundColor: colors.tealSoft }]}><Icon name="school" size={20} color={colors.teal} /></View>
          <View><Text style={styles.statValue}>{courses.length}</Text><Text style={styles.statLabel}>Active courses</Text></View>
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Today" action="Calendar" onAction={onCalendar} />
        <View style={styles.eventList}>
          {todayEvents.length ? todayEvents.map((event) => (
            <EventCard key={event.id} event={event} course={event.courseId ? courseById.get(event.courseId) : undefined} showDate={false} onPress={() => onOpenEvent(event)} onToggle={() => toggleEvent(event.id, !event.completed)} />
          )) : <EmptyState title="Clear day ahead" subtitle="Add a class, task, or study block whenever you’re ready." />}
        </View>
      </View>

      <View style={styles.section}>
        <SectionHeader title="Coming up" action="See all" onAction={onCalendar} />
        <View style={styles.eventList}>
          {laterEvents.length ? laterEvents.map((event) => (
            <EventCard key={event.id} event={event} course={event.courseId ? courseById.get(event.courseId) : undefined} onPress={() => onOpenEvent(event)} onToggle={() => toggleEvent(event.id, !event.completed)} />
          )) : <EmptyState title="No upcoming items" subtitle="Your next assignment or event will appear here." />}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 28 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 19 },
  headerCopy: { flex: 1, minWidth: 0, paddingRight: 14 },
  kicker: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  greeting: { color: colors.ink, fontSize: 25, lineHeight: 31, fontWeight: '900', letterSpacing: -0.8, marginTop: 4 },
  avatar: { width: 48, height: 48, flexShrink: 0, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  avatarText: { color: colors.primary, fontSize: 18, fontWeight: '900' },
  online: { position: 'absolute', right: -1, bottom: -1, width: 13, height: 13, borderRadius: 7, backgroundColor: colors.teal, borderWidth: 3, borderColor: colors.background },
  hero: { borderRadius: 26, padding: 21, minHeight: 198, overflow: 'hidden', ...shadow },
  orbOne: { position: 'absolute', width: 170, height: 170, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.07)', right: -40, top: -60 },
  orbTwo: { position: 'absolute', width: 100, height: 100, borderRadius: 50, borderWidth: 18, borderColor: 'rgba(255,255,255,0.06)', right: 35, bottom: -50 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroIcon: { width: 31, height: 31, borderRadius: 11, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  heroTerm: { color: '#FFE7F1', fontSize: 11, fontWeight: '800', letterSpacing: 0.4 },
  heroTitle: { color: colors.white, fontSize: 23, lineHeight: 29, fontWeight: '900', letterSpacing: -0.6, marginTop: 17, maxWidth: '80%' },
  heroSubtitle: { color: '#FFE0EC', fontSize: 12, lineHeight: 18, fontWeight: '500', marginTop: 6, maxWidth: '82%' },
  heroBottom: { flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 18 },
  progressTrack: { flex: 1, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.18)', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: '#FFC1DD' },
  progressText: { color: colors.white, fontSize: 10, fontWeight: '800' },
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 13 },
  statCard: { flex: 1, minHeight: 82, borderRadius: 19, backgroundColor: colors.card, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1, borderColor: colors.line },
  statIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  statValue: { color: colors.ink, fontSize: 18, fontWeight: '900' },
  statLabel: { color: colors.muted, fontSize: 10, fontWeight: '600', marginTop: 2 },
  section: { marginTop: 26 },
  eventList: { gap: 10 },
});
