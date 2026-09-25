import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { PlannerEvent } from '../types';
import { formatTime, fromDateKey, isValidDateKey } from '../utils/date';

const CHANNEL_ID = 'campusflow-reminders';
const REMINDER_MINUTES = 15;
const REMINDER_LEAD_MS = REMINDER_MINUTES * 60 * 1000;
const MAX_SCHEDULED_REMINDERS = 60;

let notificationWork: Promise<void> = Promise.resolve();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function enqueueNotificationWork(work: () => Promise<void>) {
  notificationWork = notificationWork.catch(() => undefined).then(work);
  return notificationWork;
}

function permissionAllowsNotifications(permission: Notifications.NotificationPermissionsStatus) {
  return permission.granted
    || permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

async function configureNotifications(requestPermission: boolean) {
  if (Platform.OS === 'web') return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Class and task reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#E94F9D',
      sound: 'default',
    });
  }

  let permission = await Notifications.getPermissionsAsync();
  if (!permissionAllowsNotifications(permission) && requestPermission && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: true,
      },
    });
  }
  return permissionAllowsNotifications(permission);
}

function eventStartDate(event: PlannerEvent) {
  if (!isValidDateKey(event.date) || !/^\d{2}:\d{2}$/.test(event.time)) return null;
  const [hour, minute] = event.time.split(':').map(Number);
  if (!Number.isInteger(hour) || !Number.isInteger(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  const date = fromDateKey(event.date);
  date.setHours(hour, minute, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

function reminderDetails(event: PlannerEvent, now: number) {
  if (event.completed) return null;
  const startsAt = eventStartDate(event);
  if (!startsAt || startsAt.getTime() <= now) return null;
  const preferredReminder = startsAt.getTime() - REMINDER_LEAD_MS;
  const remindsEarly = preferredReminder > now + 1000;
  return {
    event,
    fireAt: new Date(remindsEarly ? preferredReminder : startsAt.getTime()),
    remindsEarly,
  };
}

function notificationPresentation(event: PlannerEvent, remindsEarly: boolean) {
  const timing = remindsEarly ? `in ${REMINDER_MINUTES} min` : 'now';

  if (event.type === 'class') {
    return { emoji: '📚', message: `Class starts ${timing}` };
  }
  if (event.type === 'assignment') {
    return { emoji: '✅', message: `Task is due ${timing}` };
  }
  if (event.type === 'exam') {
    return { emoji: '⚡️', message: `Exam starts ${timing}` };
  }
  return { emoji: '✨', message: `Event starts ${timing}` };
}

function isCampusFlowRequest(request: Notifications.NotificationRequest) {
  return request.content.data?.campusFlow === true;
}

async function cancelScheduledCampusFlowReminders() {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  for (const request of scheduled) {
    if (isCampusFlowRequest(request)) {
      await Notifications.cancelScheduledNotificationAsync(request.identifier);
    }
  }
}

async function performNotificationSync(events: PlannerEvent[], requestPermission: boolean) {
  if (Platform.OS === 'web') return;

  const hasFutureReminder = events.some((event) => Boolean(reminderDetails(event, Date.now())));
  await cancelScheduledCampusFlowReminders();
  if (!hasFutureReminder) {
    return;
  }

  const allowed = await configureNotifications(requestPermission);
  if (!allowed) return;

  const now = Date.now();
  const reminders = events
    .map((event) => reminderDetails(event, now))
    .filter((reminder): reminder is NonNullable<typeof reminder> => Boolean(reminder))
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime())
    .slice(0, MAX_SCHEDULED_REMINDERS);

  for (const reminder of reminders) {
    const { event, fireAt, remindsEarly } = reminder;
    const presentation = notificationPresentation(event, remindsEarly);
    const location = event.location.trim();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `${presentation.emoji} ${event.title}`,
        subtitle: `CampusFlow · ${formatTime(event.time)}`,
        body: location ? `${presentation.message} · ${location}` : presentation.message,
        sound: 'default',
        interruptionLevel: 'active',
        data: {
          campusFlow: true,
          eventId: event.id,
          eventType: event.type,
          seriesId: event.seriesId ?? '',
        },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireAt,
        channelId: CHANNEL_ID,
      },
    });
  }
}

export function syncEventNotifications(events: PlannerEvent[], requestPermission = false) {
  return enqueueNotificationWork(async () => {
    try {
      await performNotificationSync(events, requestPermission);
    } catch {
      // Planner changes should still succeed if the OS notification service is unavailable.
    }
  });
}

export function clearEventNotifications() {
  return enqueueNotificationWork(async () => {
    if (Platform.OS === 'web') return;
    try {
      await cancelScheduledCampusFlowReminders();
      await Notifications.dismissAllNotificationsAsync();
    } catch {
      // The database reset remains valid even if Notification Center is unavailable.
    }
  });
}
