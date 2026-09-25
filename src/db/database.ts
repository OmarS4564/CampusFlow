import * as SQLite from 'expo-sqlite';
import { Course, CourseDraft, EventDraft, PlannerEvent, PlannerSettings } from '../types';
import { addDays, formatTime, fromDateKey, isValidDateKey, toDateKey } from '../utils/date';

let databasePromise: ReturnType<typeof SQLite.openDatabaseAsync> | null = null;

function getDatabase() {
  if (!databasePromise) databasePromise = SQLite.openDatabaseAsync('campusflow.db');
  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY NOT NULL,
      code TEXT NOT NULL,
      name TEXT NOT NULL,
      instructor TEXT NOT NULL DEFAULT '',
      room TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL,
      schedule TEXT NOT NULL DEFAULT '',
      credits INTEGER NOT NULL DEFAULT 3,
      meeting_days TEXT NOT NULL DEFAULT '',
      start_time TEXT NOT NULL DEFAULT '09:00',
      end_time TEXT NOT NULL DEFAULT '10:00',
      start_date TEXT NOT NULL DEFAULT '',
      end_date TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL DEFAULT '',
      end_time TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL,
      course_id TEXT,
      location TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      completed INTEGER NOT NULL DEFAULT 0,
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL,
      series_id TEXT,
      repeat_mode TEXT NOT NULL DEFAULT 'none',
      repeat_days TEXT NOT NULL DEFAULT '',
      repeat_until TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE SET NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY NOT NULL,
      value TEXT NOT NULL
    );
  `);

  const eventColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(events)');
  const existingColumns = new Set(eventColumns.map((column) => column.name));
  const migrations = [
    ['series_id', 'ALTER TABLE events ADD COLUMN series_id TEXT'],
    ['repeat_mode', "ALTER TABLE events ADD COLUMN repeat_mode TEXT NOT NULL DEFAULT 'none'"],
    ['repeat_days', "ALTER TABLE events ADD COLUMN repeat_days TEXT NOT NULL DEFAULT ''"],
    ['repeat_until', "ALTER TABLE events ADD COLUMN repeat_until TEXT NOT NULL DEFAULT ''"],
  ] as const;
  for (const [column, statement] of migrations) {
    if (!existingColumns.has(column)) await db.execAsync(statement);
  }
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_events_series ON events(series_id, date);');

  const courseColumns = await db.getAllAsync<{ name: string }>('PRAGMA table_info(courses)');
  const existingCourseColumns = new Set(courseColumns.map((column) => column.name));
  const courseMigrations = [
    ['meeting_days', "ALTER TABLE courses ADD COLUMN meeting_days TEXT NOT NULL DEFAULT ''"],
    ['start_time', "ALTER TABLE courses ADD COLUMN start_time TEXT NOT NULL DEFAULT '09:00'"],
    ['end_time', "ALTER TABLE courses ADD COLUMN end_time TEXT NOT NULL DEFAULT '10:00'"],
    ['start_date', "ALTER TABLE courses ADD COLUMN start_date TEXT NOT NULL DEFAULT ''"],
    ['end_date', "ALTER TABLE courses ADD COLUMN end_date TEXT NOT NULL DEFAULT ''"],
  ] as const;
  for (const [column, statement] of courseMigrations) {
    if (!existingCourseColumns.has(column)) await db.execAsync(statement);
  }

  await db.runAsync(
    `UPDATE courses
     SET color = CASE UPPER(color)
       WHEN '#6C5CE7' THEN '#E94F9D'
       WHEN '#A75DE8' THEN '#C43F89'
       ELSE color
     END`,
  );

  const cleanup = await db.getFirstAsync<{ value: string }>("SELECT value FROM settings WHERE key = 'removed_starter_data_v2'");
  if (!cleanup) {
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `DELETE FROM events
         WHERE id IN ('event-architecture', 'event-web-class', 'event-quiz', 'event-project', 'event-study')
            OR course_id IN ('course-cs458', 'course-ist440', 'course-ling100')`,
      );
      await db.runAsync("DELETE FROM courses WHERE id IN ('course-cs458', 'course-ist440', 'course-ling100')");
      await db.runAsync("INSERT INTO settings (key, value) VALUES ('removed_starter_data_v2', 'true')");
    });
  }
}

type CourseRow = Omit<Course, 'meetingDays' | 'startTime' | 'endTime' | 'startDate' | 'endDate'> & {
  meeting_days: string;
  start_time: string;
  end_time: string;
  start_date: string;
  end_date: string;
};

export async function getCourses(): Promise<Course[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<CourseRow>('SELECT * FROM courses ORDER BY code');
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    name: row.name,
    instructor: row.instructor,
    room: row.room,
    color: row.color,
    schedule: row.schedule,
    credits: row.credits,
    meetingDays: row.meeting_days
      ? row.meeting_days.split(',').map(Number).filter((day) => day >= 0 && day <= 6)
      : [],
    startTime: row.start_time || '09:00',
    endTime: row.end_time || '10:00',
    startDate: row.start_date || '',
    endDate: row.end_date || '',
  }));
}

type EventRow = Omit<PlannerEvent, 'courseId' | 'endTime' | 'createdAt' | 'completed' | 'seriesId' | 'repeatMode' | 'repeatDays' | 'repeatUntil'> & {
  course_id: string | null;
  end_time: string;
  created_at: string;
  completed: number;
  series_id: string | null;
  repeat_mode: PlannerEvent['repeatMode'];
  repeat_days: string;
  repeat_until: string;
};

export async function getEvents(): Promise<PlannerEvent[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<EventRow>('SELECT * FROM events ORDER BY date, time');
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    date: row.date,
    time: row.time,
    endTime: row.end_time,
    type: row.type,
    courseId: row.course_id,
    location: row.location,
    notes: row.notes,
    completed: Boolean(row.completed),
    priority: row.priority,
    createdAt: row.created_at,
    seriesId: row.series_id,
    repeatMode: row.repeat_mode || 'none',
    repeatDays: row.repeat_days ? row.repeat_days.split(',').map(Number).filter((day) => day >= 0 && day <= 6) : [],
    repeatUntil: row.repeat_until || '',
  }));
}

function getOccurrenceDates(event: EventDraft) {
  if (event.repeatMode === 'none') return [event.date];
  const until = isValidDateKey(event.repeatUntil) && event.repeatUntil >= event.date
    ? event.repeatUntil
    : event.date;
  const selectedDays = event.repeatDays.length ? event.repeatDays : [fromDateKey(event.date).getDay()];
  const dates: string[] = [];
  let cursor = fromDateKey(event.date);
  const end = fromDateKey(until);
  while (cursor <= end && dates.length < 400) {
    if (event.repeatMode === 'daily' || selectedDays.includes(cursor.getDay())) dates.push(toDateKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return dates.length ? dates : [event.date];
}

async function writeEventOccurrence(
  db: Awaited<ReturnType<typeof getDatabase>>,
  event: EventDraft,
  id: string,
  date: string,
  seriesId: string | null,
) {
  const createdAt = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO events (id, title, date, time, end_time, type, course_id, location, notes, completed, priority, created_at, series_id, repeat_mode, repeat_days, repeat_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       title = excluded.title, date = excluded.date, time = excluded.time,
       end_time = excluded.end_time, type = excluded.type, course_id = excluded.course_id,
       location = excluded.location, notes = excluded.notes, completed = excluded.completed,
       priority = excluded.priority, series_id = excluded.series_id,
       repeat_mode = excluded.repeat_mode, repeat_days = excluded.repeat_days,
       repeat_until = excluded.repeat_until`,
    id,
    event.title.trim(),
    date,
    event.time,
    event.endTime,
    event.type,
    event.courseId,
    event.location.trim(),
    event.notes.trim(),
    date === event.date && event.completed ? 1 : 0,
    event.priority,
    createdAt,
    seriesId,
    event.repeatMode,
    event.repeatDays.join(','),
    event.repeatUntil,
  );
}

export async function upsertEvent(event: EventDraft) {
  const db = await getDatabase();
  const editingSeries = Boolean(event.seriesId);
  const seriesId = event.repeatMode === 'none'
    ? null
    : event.seriesId ?? `series-${Date.now()}-${Math.random().toString(16).slice(2)}`;

  await db.withTransactionAsync(async () => {
    if (editingSeries) {
      await db.runAsync('DELETE FROM events WHERE series_id = ? AND date >= ?', event.seriesId!, event.originalDate ?? event.date);
    } else if (event.id && event.repeatMode !== 'none') {
      await db.runAsync('DELETE FROM events WHERE id = ?', event.id);
    }

    if (event.repeatMode === 'none') {
      const id = event.id ?? `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      await writeEventOccurrence(db, { ...event, seriesId: null, repeatDays: [], repeatUntil: '' }, id, event.date, null);
      return;
    }

    const dates = getOccurrenceDates(event);
    for (const date of dates) {
      await writeEventOccurrence(db, event, `${seriesId}-${date}`, date, seriesId);
    }
  });
}

export async function removeEvent(id: string) {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM events WHERE id = ?', id);
}

export async function setEventCompleted(id: string, completed: boolean) {
  const db = await getDatabase();
  await db.runAsync('UPDATE events SET completed = ? WHERE id = ?', completed ? 1 : 0, id);
}

const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function courseScheduleLabel(meetingDays: number[], startTime: string, endTime: string) {
  const days = meetingDays.map((day) => weekdayNames[day]).filter(Boolean).join('/');
  return days ? `${days} · ${formatTime(startTime)}–${formatTime(endTime)}` : '';
}

function courseSeriesId(courseId: string) {
  return `course-schedule-${courseId}`;
}

export async function upsertCourse(course: CourseDraft) {
  const db = await getDatabase();
  const id = course.id ?? `course-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const code = course.code.trim().toUpperCase();
  const name = course.name.trim();
  const instructor = course.instructor.trim();
  const room = course.room.trim();
  const meetingDays = [...new Set(course.meetingDays)].filter((day) => day >= 0 && day <= 6).sort();
  const schedule = courseScheduleLabel(meetingDays, course.startTime, course.endTime);
  const seriesId = courseSeriesId(id);

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO courses (
         id, code, name, instructor, room, color, schedule, credits,
         meeting_days, start_time, end_time, start_date, end_date
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET code = excluded.code, name = excluded.name,
         instructor = excluded.instructor, room = excluded.room, color = excluded.color,
         schedule = excluded.schedule, credits = excluded.credits,
         meeting_days = excluded.meeting_days, start_time = excluded.start_time,
         end_time = excluded.end_time, start_date = excluded.start_date,
         end_date = excluded.end_date`,
      id,
      code,
      name,
      instructor,
      room,
      course.color,
      schedule,
      course.credits,
      meetingDays.join(','),
      course.startTime,
      course.endTime,
      course.startDate,
      course.endDate,
    );

    await db.runAsync('DELETE FROM events WHERE series_id = ?', seriesId);

    if (
      meetingDays.length
      && isValidDateKey(course.startDate)
      && isValidDateKey(course.endDate)
      && course.endDate >= course.startDate
    ) {
      const classEvent: EventDraft = {
        title: name,
        date: course.startDate,
        time: course.startTime,
        endTime: course.endTime,
        type: 'class',
        courseId: id,
        location: room,
        notes: instructor ? `Instructor: ${instructor}` : '',
        completed: false,
        priority: 'low',
        seriesId,
        repeatMode: 'weekly',
        repeatDays: meetingDays,
        repeatUntil: course.endDate,
      };
      for (const date of getOccurrenceDates(classEvent)) {
        await writeEventOccurrence(db, classEvent, `${seriesId}-${date}`, date, seriesId);
      }
    }
  });

  return id;
}

export async function removeCourse(id: string) {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM events WHERE series_id = ?', courseSeriesId(id));
    await db.runAsync('DELETE FROM courses WHERE id = ?', id);
  });
}

export async function getSettings(): Promise<PlannerSettings> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: keyof PlannerSettings; value: string }>('SELECT * FROM settings');
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    userName: stored.userName || 'Student',
    term: stored.term || 'Fall 2026',
  };
}

export async function updateSetting(key: keyof PlannerSettings, value: string) {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
    key,
    value,
  );
}

export async function clearPlannerData() {
  const db = await getDatabase();
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM events');
    await db.runAsync('DELETE FROM courses');
    await db.runAsync('DELETE FROM settings');
  });
}
