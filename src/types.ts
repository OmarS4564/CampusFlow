export type EventType = 'assignment' | 'exam' | 'class' | 'personal';
export type Priority = 'low' | 'medium' | 'high';
export type RepeatMode = 'none' | 'daily' | 'weekly';

export type Course = {
  id: string;
  code: string;
  name: string;
  instructor: string;
  room: string;
  color: string;
  schedule: string;
  credits: number;
  meetingDays: number[];
  startTime: string;
  endTime: string;
  startDate: string;
  endDate: string;
};

export type PlannerEvent = {
  id: string;
  title: string;
  date: string;
  time: string;
  endTime: string;
  type: EventType;
  courseId: string | null;
  location: string;
  notes: string;
  completed: boolean;
  priority: Priority;
  createdAt: string;
  seriesId: string | null;
  repeatMode: RepeatMode;
  repeatDays: number[];
  repeatUntil: string;
};

export type PlannerSettings = {
  userName: string;
  term: string;
};

export type EventDraft = Omit<PlannerEvent, 'id' | 'createdAt'> & {
  id?: string;
  originalDate?: string;
};

export type CourseDraft = Omit<Course, 'id'> & { id?: string };
