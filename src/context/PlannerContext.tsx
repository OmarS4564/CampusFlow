import * as Haptics from 'expo-haptics';
import React, { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import {
  clearPlannerData,
  getCourses,
  getEvents,
  getSettings,
  initializeDatabase,
  removeCourse,
  removeEvent,
  setEventCompleted,
  updateSetting,
  upsertCourse,
  upsertEvent,
} from '../db/database';
import { clearEventNotifications, syncEventNotifications } from '../services/notifications';
import { Course, CourseDraft, EventDraft, PlannerEvent, PlannerSettings } from '../types';

type PlannerContextValue = {
  ready: boolean;
  error: string | null;
  courses: Course[];
  events: PlannerEvent[];
  settings: PlannerSettings;
  saveEvent: (event: EventDraft) => Promise<void>;
  deleteEvent: (id: string) => Promise<void>;
  toggleEvent: (id: string, completed: boolean) => Promise<void>;
  saveCourse: (course: CourseDraft) => Promise<void>;
  deleteCourse: (id: string) => Promise<void>;
  setSetting: (key: keyof PlannerSettings, value: string) => Promise<void>;
  resetPlanner: () => Promise<void>;
};

const PlannerContext = createContext<PlannerContextValue | null>(null);

export function PlannerProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [events, setEvents] = useState<PlannerEvent[]>([]);
  const [settings, setSettings] = useState<PlannerSettings>({ userName: 'Student', term: 'Fall 2026' });

  const refresh = async () => {
    const [nextCourses, nextEvents, nextSettings] = await Promise.all([
      getCourses(),
      getEvents(),
      getSettings(),
    ]);
    setCourses(nextCourses);
    setEvents(nextEvents);
    setSettings(nextSettings);
    return nextEvents;
  };

  useEffect(() => {
    (async () => {
      try {
        await initializeDatabase();
        const nextEvents = await refresh();
        void syncEventNotifications(nextEvents, nextEvents.length > 0);
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Could not open the local database.');
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const value = useMemo<PlannerContextValue>(() => ({
    ready,
    error,
    courses,
    events,
    settings,
    saveEvent: async (event) => {
      await upsertEvent(event);
      const nextEvents = await refresh();
      void syncEventNotifications(nextEvents, true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    deleteEvent: async (id) => {
      await removeEvent(id);
      const nextEvents = await refresh();
      void syncEventNotifications(nextEvents);
    },
    toggleEvent: async (id, completed) => {
      await setEventCompleted(id, completed);
      const nextEvents = await getEvents();
      setEvents(nextEvents);
      void syncEventNotifications(nextEvents);
      void Haptics.selectionAsync();
    },
    saveCourse: async (course) => {
      await upsertCourse(course);
      const nextEvents = await refresh();
      void syncEventNotifications(nextEvents, true);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
    deleteCourse: async (id) => {
      await removeCourse(id);
      const nextEvents = await refresh();
      void syncEventNotifications(nextEvents);
    },
    setSetting: async (key, settingValue) => {
      await updateSetting(key, settingValue);
      setSettings((current) => ({ ...current, [key]: settingValue }));
    },
    resetPlanner: async () => {
      await clearPlannerData();
      await clearEventNotifications();
      await refresh();
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  }), [ready, error, courses, events, settings]);

  return <PlannerContext.Provider value={value}>{children}</PlannerContext.Provider>;
}

export function usePlanner() {
  const context = useContext(PlannerContext);
  if (!context) throw new Error('usePlanner must be used inside PlannerProvider');
  return context;
}
