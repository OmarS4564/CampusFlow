import DateTimePicker, { DateTimePickerAndroid, DateTimePickerChangeEvent } from '@react-native-community/datetimepicker';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, courseColors } from '../theme';
import { Course, CourseDraft } from '../types';
import {
  addDaysToKey,
  formatLongDate,
  formatTime,
  fromDateKey,
  isValidDateKey,
  toDateKey,
  todayKey,
} from '../utils/date';
import { Icon } from './Icon';

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const creditOptions = [1, 2, 3, 4, 5, 6];
type PickerKind = 'startDate' | 'endDate' | 'startTime' | 'endTime';

const blankCourse = (): CourseDraft => {
  const startDate = todayKey();
  return {
    code: '',
    name: '',
    instructor: '',
    room: '',
    color: courseColors[0],
    schedule: '',
    credits: 3,
    meetingDays: [],
    startTime: '09:00',
    endTime: '10:00',
    startDate,
    endDate: addDaysToKey(startDate, 112),
  };
};

function timePickerValue(dateKey: string, time: string, fallbackHour: number) {
  const value = isValidDateKey(dateKey) ? fromDateKey(dateKey) : new Date();
  const [rawHour, rawMinute] = (time || `${fallbackHour}:00`).split(':').map(Number);
  value.setHours(
    Number.isFinite(rawHour) ? Math.max(0, Math.min(23, rawHour)) : fallbackHour,
    Number.isFinite(rawMinute) ? Math.max(0, Math.min(59, rawMinute)) : 0,
    0,
    0,
  );
  return value;
}

function toTimeKey(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

function scheduleLabel(course: CourseDraft) {
  const days = course.meetingDays.map((day) => weekdayNames[day]).filter(Boolean).join('/');
  return days ? `${days} · ${formatTime(course.startTime)}–${formatTime(course.endTime)}` : '';
}

type Props = {
  visible: boolean;
  course?: Course | null;
  onClose: () => void;
  onSave: (course: CourseDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function CourseEditor({ visible, course, onClose, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<CourseDraft>(blankCourse());
  const [activePicker, setActivePicker] = useState<PickerKind | null>(null);
  const [pickerValue, setPickerValue] = useState(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const fallback = blankCourse();
    setDraft(course ? {
      ...course,
      meetingDays: course.meetingDays ?? [],
      startTime: course.startTime || fallback.startTime,
      endTime: course.endTime || fallback.endTime,
      startDate: course.startDate || fallback.startDate,
      endDate: course.endDate || fallback.endDate,
    } : fallback);
    setActivePicker(null);
  }, [visible, course]);

  const update = <K extends keyof CourseDraft>(key: K, value: CourseDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const toggleWeekday = (day: number) => {
    setDraft((current) => ({
      ...current,
      meetingDays: current.meetingDays.includes(day)
        ? current.meetingDays.filter((item) => item !== day)
        : [...current.meetingDays, day].sort(),
    }));
  };

  const applyPickerValue = (kind: PickerKind, value: Date) => {
    if (kind === 'startTime' || kind === 'endTime') {
      update(kind, toTimeKey(value));
      return;
    }

    const date = toDateKey(value);
    if (kind === 'startDate') {
      setDraft((current) => ({
        ...current,
        startDate: date,
        endDate: current.endDate < date ? addDaysToKey(date, 112) : current.endDate,
      }));
      return;
    }
    update('endDate', date);
  };

  const valueForPicker = (kind: PickerKind) => {
    if (kind === 'startDate') return fromDateKey(draft.startDate);
    if (kind === 'endDate') return fromDateKey(draft.endDate);
    return timePickerValue(draft.startDate, kind === 'startTime' ? draft.startTime : draft.endTime, kind === 'startTime' ? 9 : 10);
  };

  const openPicker = (kind: PickerKind) => {
    Keyboard.dismiss();
    const value = valueForPicker(kind);
    const isDate = kind === 'startDate' || kind === 'endDate';

    if (Platform.OS === 'android') {
      if (isDate) {
        DateTimePickerAndroid.open({
          value,
          mode: 'date',
          display: 'calendar',
          minimumDate: kind === 'endDate' ? fromDateKey(draft.startDate) : undefined,
          onValueChange: (_pickerEvent, selected) => applyPickerValue(kind, selected),
          onDismiss: () => undefined,
        });
      } else {
        DateTimePickerAndroid.open({
          value,
          mode: 'time',
          display: 'spinner',
          is24Hour: false,
          onValueChange: (_pickerEvent, selected) => applyPickerValue(kind, selected),
          onDismiss: () => undefined,
        });
      }
      return;
    }

    setPickerValue(value);
    setActivePicker(kind);
  };

  const pickerChanged = (_pickerEvent: DateTimePickerChangeEvent, selected: Date) => {
    setPickerValue(selected);
  };

  const savePicker = () => {
    if (!activePicker) return;
    applyPickerValue(activePicker, pickerValue);
    setActivePicker(null);
  };

  const save = async () => {
    if (!draft.code.trim() || !draft.name.trim()) {
      Alert.alert('Course details needed', 'Add both a course code and a course name.');
      return;
    }
    if (!draft.meetingDays.length) {
      Alert.alert('Choose meeting days', 'Select at least one day so this course can repeat on your calendar.');
      return;
    }
    if (!isValidDateKey(draft.startDate) || !isValidDateKey(draft.endDate) || draft.endDate < draft.startDate) {
      Alert.alert('Check the schedule dates', 'The schedule end date must be the same as or later than the start date.');
      return;
    }
    if (draft.endTime <= draft.startTime) {
      Alert.alert('Check the class time', 'The end time must be later than the start time.');
      return;
    }

    setSaving(true);
    try {
      await onSave({ ...draft, schedule: scheduleLabel(draft) });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!course) return;
    Alert.alert(
      'Delete this course?',
      'Its repeating class meetings will be removed. Assignments and exams will stay in your planner without a course attached.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await onDelete(course.id); onClose(); } },
      ],
    );
  };

  const pickerIsDate = activePicker === 'startDate' || activePicker === 'endDate';
  const pickerTitle = activePicker === 'startDate'
    ? 'Schedule starts'
    : activePicker === 'endDate'
      ? 'Schedule ends'
      : activePicker === 'startTime'
        ? 'Class starts'
        : 'Class ends';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => activePicker ? setActivePicker(null) : onClose()}>
      <View style={styles.modalRoot}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Pressable onPress={onClose} style={styles.iconButton}><Icon name="close" /></Pressable>
              <View style={styles.headerCopy}><Text style={styles.eyebrow}>COURSES</Text><Text style={styles.heading}>{course ? 'Edit course' : 'Add a course'}</Text></View>
              <Pressable onPress={save} disabled={saving} style={styles.saveButton}><Text style={styles.saveText}>{saving ? '...' : 'Save'}</Text></Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <Text style={styles.label}>COURSE CODE</Text>
              <TextInput autoFocus={!course} value={draft.code} onChangeText={(value) => update('code', value)} placeholder="COMPSCI 458" placeholderTextColor={colors.softMuted} style={styles.input} autoCapitalize="characters" />

              <Text style={styles.label}>COURSE NAME</Text>
              <TextInput value={draft.name} onChangeText={(value) => update('name', value)} placeholder="Computer Architecture" placeholderTextColor={colors.softMuted} style={styles.input} />

              <View style={styles.row}>
                <View style={styles.half}><Text style={styles.label}>INSTRUCTOR</Text><TextInput value={draft.instructor} onChangeText={(value) => update('instructor', value)} placeholder="Dr. Rivera" placeholderTextColor={colors.softMuted} style={styles.input} /></View>
                <View style={styles.half}><Text style={styles.label}>ROOM</Text><TextInput value={draft.room} onChangeText={(value) => update('room', value)} placeholder="EMS E145" placeholderTextColor={colors.softMuted} style={styles.input} /></View>
              </View>

              <Text style={styles.label}>CREDITS</Text>
              <View style={styles.creditRow}>
                {creditOptions.map((credits) => {
                  const selected = draft.credits === credits;
                  return (
                    <Pressable key={credits} onPress={() => update('credits', credits)} style={[styles.creditOption, selected && styles.creditOptionActive]}>
                      <Text style={[styles.creditText, selected && styles.creditTextActive]}>{credits}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.scheduleHeading}>
                <View style={styles.scheduleIcon}><Icon name="repeat" size={19} color={colors.primary} /></View>
                <View style={styles.scheduleCopy}>
                  <Text style={styles.scheduleTitle}>Weekly class schedule</Text>
                  <Text style={styles.scheduleHint}>Saving creates each class meeting on your calendar.</Text>
                </View>
              </View>

              <Text style={styles.label}>MEETING DAYS</Text>
              <View style={styles.weekdayRow}>
                {weekdayLabels.map((label, day) => {
                  const selected = draft.meetingDays.includes(day);
                  return (
                    <Pressable key={`${label}-${day}`} onPress={() => toggleWeekday(day)} style={[styles.weekday, selected && styles.weekdayActive]}>
                      <Text style={[styles.weekdayText, selected && styles.weekdayTextActive]}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>CLASS TIME</Text>
              <View style={styles.row}>
                <Pressable onPress={() => openPicker('startTime')} style={[styles.pickerField, styles.half]}>
                  <View style={styles.timeCopy}>
                    <Text style={styles.pickerMiniLabel}>START</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.pickerValue}>{formatTime(draft.startTime)}</Text>
                  </View>
                  <Icon name="chevron-down" size={16} color={colors.softMuted} />
                </Pressable>
                <Pressable onPress={() => openPicker('endTime')} style={[styles.pickerField, styles.half]}>
                  <View style={styles.timeCopy}>
                    <Text style={styles.pickerMiniLabel}>END</Text>
                    <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.pickerValue}>{formatTime(draft.endTime)}</Text>
                  </View>
                  <Icon name="chevron-down" size={16} color={colors.softMuted} />
                </Pressable>
              </View>

              <Text style={styles.label}>SEMESTER DATES</Text>
              <View style={styles.dateStack}>
                <Pressable onPress={() => openPicker('startDate')} style={styles.dateField}>
                  <View style={styles.dateIcon}><Icon name="calendar-outline" size={18} color={colors.primary} /></View>
                  <View style={styles.dateCopy}><Text style={styles.pickerMiniLabel}>SCHEDULE START</Text><Text style={styles.dateValue}>{formatLongDate(draft.startDate)}</Text></View>
                  <Icon name="chevron-down" size={17} color={colors.softMuted} />
                </Pressable>
                <Pressable onPress={() => openPicker('endDate')} style={styles.dateField}>
                  <View style={styles.dateIcon}><Icon name="calendar-outline" size={18} color={colors.primary} /></View>
                  <View style={styles.dateCopy}><Text style={styles.pickerMiniLabel}>SCHEDULE END</Text><Text style={styles.dateValue}>{formatLongDate(draft.endDate)}</Text></View>
                  <Icon name="chevron-down" size={17} color={colors.softMuted} />
                </Pressable>
              </View>

              {!!scheduleLabel(draft) && (
                <View style={styles.schedulePreview}>
                  <Icon name="checkmark-circle" size={18} color={colors.primary} />
                  <Text style={styles.schedulePreviewText}>{scheduleLabel(draft)}</Text>
                </View>
              )}

              <Text style={styles.label}>COLOR</Text>
              <View style={styles.colors}>
                {courseColors.map((color) => (
                  <Pressable key={color} onPress={() => update('color', color)} style={[styles.color, { backgroundColor: color }]}>
                    {draft.color === color && <Icon name="checkmark" size={18} color={colors.white} />}
                  </Pressable>
                ))}
              </View>

              {!!course && <Pressable onPress={confirmDelete} style={styles.delete}><Icon name="trash-outline" size={18} color={colors.danger} /><Text style={styles.deleteText}>Delete course</Text></Pressable>}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {activePicker && Platform.OS !== 'android' && (
          <View style={styles.pickerOverlay}>
            <Pressable style={StyleSheet.absoluteFill} onPress={() => setActivePicker(null)} />
            <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={styles.pickerHeader}>
                <Pressable onPress={() => setActivePicker(null)} style={styles.pickerHeaderAction}><Text style={styles.pickerCancel}>Cancel</Text></Pressable>
                <Text style={styles.pickerTitle}>{pickerTitle}</Text>
                <Pressable onPress={savePicker} style={[styles.pickerHeaderAction, styles.pickerHeaderActionRight]}><Text style={styles.pickerDone}>Done</Text></Pressable>
              </View>
              <View style={styles.pickerBody}>
                {pickerIsDate ? (
                  <DateTimePicker
                    value={pickerValue}
                    mode="date"
                    display="inline"
                    minimumDate={activePicker === 'endDate' ? fromDateKey(draft.startDate) : undefined}
                    accentColor={colors.primary}
                    themeVariant="light"
                    onValueChange={pickerChanged}
                    onDismiss={() => setActivePicker(null)}
                    style={styles.iosDatePicker}
                  />
                ) : (
                  <DateTimePicker
                    value={pickerValue}
                    mode="time"
                    display="spinner"
                    locale="en-US"
                    minuteInterval={1}
                    textColor={colors.ink}
                    themeVariant="light"
                    onValueChange={pickerChanged}
                    onDismiss={() => setActivePicker(null)}
                    style={styles.iosTimePicker}
                  />
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(17,25,42,0.35)' },
  sheet: { maxHeight: '94%', backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D9DDE6', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  iconButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, marginLeft: 12 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heading: { color: colors.ink, fontSize: 18, fontWeight: '900', marginTop: 2 },
  saveButton: { height: 42, paddingHorizontal: 17, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: colors.white, fontWeight: '900', fontSize: 13 },
  body: { padding: 20, paddingBottom: 30 },
  label: { fontSize: 9, color: colors.muted, fontWeight: '900', letterSpacing: 1, marginBottom: 8, marginTop: 17 },
  input: { height: 53, paddingHorizontal: 15, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, color: colors.ink, fontWeight: '700', fontSize: 13 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1 },
  creditRow: { flexDirection: 'row', gap: 7 },
  creditOption: { flex: 1, height: 44, borderRadius: 13, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  creditOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  creditText: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  creditTextActive: { color: colors.primary, fontWeight: '900' },
  scheduleHeading: { flexDirection: 'row', alignItems: 'center', marginTop: 25, padding: 14, borderRadius: 18, backgroundColor: colors.primarySoft },
  scheduleIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  scheduleCopy: { flex: 1, marginLeft: 11 },
  scheduleTitle: { color: colors.ink, fontSize: 14, fontWeight: '900' },
  scheduleHint: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekday: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  weekdayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekdayText: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  weekdayTextActive: { color: colors.white },
  pickerField: { height: 58, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 13 },
  pickerMiniLabel: { color: colors.softMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  timeCopy: { flex: 1, minWidth: 0, marginRight: 7 },
  pickerValue: { color: colors.ink, fontSize: 14, fontWeight: '900', marginTop: 4 },
  dateStack: { gap: 9 },
  dateField: { minHeight: 60, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 13 },
  dateIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  dateCopy: { flex: 1, marginLeft: 11 },
  dateValue: { color: colors.ink, fontSize: 12, fontWeight: '800', marginTop: 4 },
  schedulePreview: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 11, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  schedulePreviewText: { flex: 1, color: colors.primaryDark, fontSize: 11, fontWeight: '800' },
  colors: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  color: { width: 43, height: 43, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  delete: { flexDirection: 'row', height: 50, justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 26 },
  deleteText: { color: colors.danger, fontWeight: '800', fontSize: 13 },
  pickerOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(17,25,42,0.45)', justifyContent: 'flex-end', zIndex: 20 },
  pickerSheet: { backgroundColor: colors.card, borderTopLeftRadius: 26, borderTopRightRadius: 26 },
  pickerHeader: { height: 58, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: colors.line },
  pickerHeaderAction: { width: 64, alignItems: 'flex-start' },
  pickerHeaderActionRight: { alignItems: 'flex-end' },
  pickerCancel: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  pickerTitle: { flex: 1, color: colors.ink, fontSize: 15, fontWeight: '900', textAlign: 'center' },
  pickerDone: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  pickerBody: { width: '100%', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  iosDatePicker: { width: 350, maxWidth: '100%', height: 340, alignSelf: 'center' },
  iosTimePicker: { width: 320, maxWidth: '100%', height: 216, alignSelf: 'center' },
});
