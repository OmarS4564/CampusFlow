import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { AppTab, BottomNav } from './src/components/BottomNav';
import { CourseEditor } from './src/components/CourseEditor';
import { EventEditor } from './src/components/EventEditor';
import { Icon } from './src/components/Icon';
import { PlannerProvider, usePlanner } from './src/context/PlannerContext';
import { CalendarScreen } from './src/screens/CalendarScreen';
import { CoursesScreen } from './src/screens/CoursesScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { colors } from './src/theme';
import { Course, PlannerEvent } from './src/types';

function PlannerApp() {
  const { ready, error, courses, saveEvent, deleteEvent, saveCourse, deleteCourse } = usePlanner();
  const [activeTab, setActiveTab] = useState<AppTab>('home');
  const [eventEditorOpen, setEventEditorOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<PlannerEvent | null>(null);
  const [initialDate, setInitialDate] = useState<string | undefined>();
  const [courseEditorOpen, setCourseEditorOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);

  if (!ready) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={styles.loadingLogo}><Icon name="calendar" size={27} color={colors.white} /></View>
        <Text style={styles.loadingTitle}>CampusFlow</Text>
        <ActivityIndicator color={colors.primary} style={styles.spinner} />
        <Text style={styles.loadingText}>Getting your semester ready…</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.centered}>
        <View style={[styles.loadingLogo, { backgroundColor: colors.coral }]}><Icon name="alert" size={27} color={colors.white} /></View>
        <Text style={styles.loadingTitle}>Couldn’t open your planner</Text>
        <Text style={styles.errorText}>{error}</Text>
      </SafeAreaView>
    );
  }

  const openNewEvent = (date?: string) => {
    setEditingEvent(null);
    setInitialDate(date);
    setEventEditorOpen(true);
  };

  const openEvent = (event: PlannerEvent) => {
    setEditingEvent(event);
    setInitialDate(undefined);
    setEventEditorOpen(true);
  };

  const openCourse = (course?: Course) => {
    setEditingCourse(course ?? null);
    setCourseEditorOpen(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="dark" />
      <View style={styles.appFrame}>
        <View style={styles.screenWrap}>
          {activeTab === 'home' && <HomeScreen onOpenEvent={openEvent} onCalendar={() => setActiveTab('calendar')} />}
          {activeTab === 'calendar' && <CalendarScreen onOpenEvent={openEvent} onAddDate={openNewEvent} />}
          {activeTab === 'courses' && <CoursesScreen onAdd={() => openCourse()} onEdit={openCourse} />}
          {activeTab === 'settings' && <SettingsScreen />}
        </View>
        <BottomNav active={activeTab} onChange={setActiveTab} onAdd={() => openNewEvent()} />
      </View>

      <EventEditor
        visible={eventEditorOpen}
        event={editingEvent}
        initialDate={initialDate}
        courses={courses}
        onClose={() => setEventEditorOpen(false)}
        onSave={saveEvent}
        onDelete={deleteEvent}
      />
      <CourseEditor
        visible={courseEditorOpen}
        course={editingCourse}
        onClose={() => setCourseEditorOpen(false)}
        onSave={saveCourse}
        onDelete={deleteCourse}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <PlannerProvider>
        <PlannerApp />
      </PlannerProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  appFrame: { flex: 1, width: '100%', maxWidth: 620, alignSelf: 'center', backgroundColor: colors.background },
  screenWrap: { flex: 1 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background, padding: 30 },
  loadingLogo: { width: 60, height: 60, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  loadingTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', marginTop: 14 },
  spinner: { marginTop: 24 },
  loadingText: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 10 },
  errorText: { color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 9 },
});
