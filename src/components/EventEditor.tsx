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
import { colors } from '../theme';
import { Course, EventDraft, EventType, PlannerEvent, Priority, RepeatMode } from '../types';
import {
  addDaysKey,
  addDaysToKey,
  formatLongDate,
  formatTime,
  fromDateKey,
  isValidDateKey,
  toDateKey,
  todayKey,
  weekdayForKey,
} from '../utils/date';
import { Icon } from './Icon';

const quickAddEventTypes: { key: EventType; label: string; icon: string }[] = [
  { key: 'assignment', label: 'Task', icon: 'document-text-outline' },
  { key: 'exam', label: 'Exam', icon: 'flash-outline' },
  { key: 'personal', label: 'Personal', icon: 'sparkles-outline' },
];

const classEventType: { key: EventType; label: string; icon: string } = {
  key: 'class', label: 'Class', icon: 'school-outline',
};

const priorities: { key: Priority; label: string; color: string }[] = [
  { key: 'low', label: 'Low', color: colors.teal },
  { key: 'medium', label: 'Medium', color: colors.amber },
  { key: 'high', label: 'High', color: colors.coral },
];

const repeatOptions: { key: RepeatMode; label: string; icon: string }[] = [
  { key: 'none', label: 'Never', icon: 'remove-circle-outline' },
  { key: 'daily', label: 'Daily', icon: 'today-outline' },
  { key: 'weekly', label: 'Weekly', icon: 'repeat-outline' },
];

const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
type DatePickerKind = 'date' | 'until';
type TimePickerKind = 'start' | 'end';
type PickerKind = DatePickerKind | TimePickerKind;

const emptyDraft = (): EventDraft => ({
  title: '',
  date: todayKey(),
  time: '17:00',
  endTime: '18:00',
  type: 'assignment',
  courseId: null,
  location: '',
  notes: '',
  completed: false,
  priority: 'medium',
  seriesId: null,
  repeatMode: 'none',
  repeatDays: [],
  repeatUntil: '',
});

function eventToDraft(event?: PlannerEvent | null): EventDraft {
  if (!event) return emptyDraft();
  const { createdAt: _createdAt, ...draft } = event;
  return { ...draft, originalDate: event.date };
}

function datePickerValue(kind: DatePickerKind, draft: EventDraft) {
  return fromDateKey(kind === 'date' ? draft.date : draft.repeatUntil || addDaysToKey(draft.date, 112));
}

function timePickerValue(dateKey: string, time: string, fallbackHour: number) {
  const value = isValidDateKey(dateKey) ? fromDateKey(dateKey) : new Date();
  const [rawHour, rawMinute] = (time || `${fallbackHour}:00`).split(':').map(Number);
  const hour = Number.isFinite(rawHour) ? Math.max(0, Math.min(23, rawHour)) : fallbackHour;
  const minute = Number.isFinite(rawMinute) ? Math.max(0, Math.min(59, rawMinute)) : 0;
  value.setHours(hour, minute, 0, 0);
  return value;
}

function toTimeKey(value: Date) {
  return `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`;
}

type Props = {
  visible: boolean;
  event?: PlannerEvent | null;
  initialDate?: string;
  courses: Course[];
  onClose: () => void;
  onSave: (event: EventDraft) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
};

export function EventEditor({ visible, event, initialDate, courses, onClose, onSave, onDelete }: Props) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<EventDraft>(emptyDraft());
  const [activePicker, setActivePicker] = useState<PickerKind | null>(null);
  const [pickerValue, setPickerValue] = useState(new Date());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const next = eventToDraft(event);
    if (!event && initialDate) next.date = initialDate;
    setDraft(next);
    setActivePicker(null);
  }, [visible, event, initialDate]);

  const update = <K extends keyof EventDraft>(key: K, value: EventDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const changeDate = (date: string) => {
    setDraft((current) => {
      const previousDay = weekdayForKey(current.date);
      const nextDay = weekdayForKey(date);
      const shouldMoveDay = current.repeatMode === 'weekly'
        && (current.repeatDays.length === 0 || (current.repeatDays.length === 1 && current.repeatDays[0] === previousDay));
      return {
        ...current,
        date,
        repeatDays: shouldMoveDay ? [nextDay] : current.repeatDays,
        repeatUntil: current.repeatMode !== 'none' && current.repeatUntil < date ? addDaysToKey(date, 112) : current.repeatUntil,
      };
    });
  };

  const applyDatePickerValue = (kind: DatePickerKind, value: Date) => {
    if (kind === 'date') changeDate(toDateKey(value));
    if (kind === 'until') update('repeatUntil', toDateKey(value));
  };

  const applyPickerValue = (kind: PickerKind, value: Date) => {
    if (kind === 'date' || kind === 'until') {
      applyDatePickerValue(kind, value);
      return;
    }
    update(kind === 'start' ? 'time' : 'endTime', toTimeKey(value));
  };

  const openDatePicker = (kind: DatePickerKind) => {
    Keyboard.dismiss();
    const value = datePickerValue(kind, draft);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'date',
        display: 'calendar',
        minimumDate: kind === 'until' ? fromDateKey(draft.date) : undefined,
        onValueChange: (_pickerEvent, selected) => applyDatePickerValue(kind, selected),
        onDismiss: () => undefined,
      });
      return;
    }
    setPickerValue(value);
    setActivePicker(kind);
  };

  const openTimePicker = (kind: TimePickerKind) => {
    Keyboard.dismiss();
    const value = timePickerValue(draft.date, kind === 'start' ? draft.time : draft.endTime, kind === 'start' ? 17 : 18);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value,
        mode: 'time',
        display: 'spinner',
        is24Hour: false,
        onValueChange: (_pickerEvent, selected) => applyPickerValue(kind, selected),
        onDismiss: () => undefined,
      });
      return;
    }
    setPickerValue(value);
    setActivePicker(kind);
  };

  const savePicker = () => {
    if (!activePicker) return;
    applyPickerValue(activePicker, pickerValue);
    setActivePicker(null);
  };

  const changeRepeatMode = (repeatMode: RepeatMode) => {
    setDraft((current) => ({
      ...current,
      repeatMode,
      repeatDays: repeatMode === 'weekly' ? (current.repeatDays.length ? current.repeatDays : [weekdayForKey(current.date)]) : [],
      repeatUntil: repeatMode === 'none' ? '' : (current.repeatUntil || addDaysToKey(current.date, 112)),
    }));
  };

  const toggleWeekday = (day: number) => {
    setDraft((current) => {
      const selected = current.repeatDays.includes(day);
      if (selected && current.repeatDays.length === 1) return current;
      return { ...current, repeatDays: selected ? current.repeatDays.filter((item) => item !== day) : [...current.repeatDays, day].sort() };
    });
  };

  const handleSave = async () => {
    if (!draft.title.trim()) {
      Alert.alert('Add a title', 'Give this item a short name so you can spot it later.');
      return;
    }
    if (!isValidDateKey(draft.date)) return;
    if (draft.repeatMode !== 'none' && (!isValidDateKey(draft.repeatUntil) || draft.repeatUntil < draft.date)) {
      Alert.alert('Check the repeat end date', 'The repeat-until date must be the same as or later than the start date.');
      return;
    }
    setSaving(true);
    try {
      await onSave(draft);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!event) return;
    Alert.alert(
      'Delete this item?',
      event.seriesId ? 'This removes only this occurrence. Other repeating dates will stay.' : 'This removes it from your planner.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => { await onDelete(event.id); onClose(); } },
      ],
    );
  };

  const pickerChanged = (_pickerEvent: DateTimePickerChangeEvent, selected: Date) => {
    setPickerValue(selected);
  };

  const pickerIsDate = activePicker === 'date' || activePicker === 'until';
  const eventTypes = event?.type === 'class'
    ? [...quickAddEventTypes.slice(0, 2), classEventType, ...quickAddEventTypes.slice(2)]
    : quickAddEventTypes;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Pressable onPress={onClose} style={styles.headerButton}><Icon name="close" size={23} /></Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.eyebrow}>{event ? 'EDIT ITEM' : 'QUICK ADD'}</Text>
                <Text style={styles.heading}>{event ? 'Update your plan' : 'What’s coming up?'}</Text>
              </View>
              <Pressable onPress={handleSave} disabled={saving} style={styles.saveButton}><Text style={styles.saveText}>{saving ? '...' : 'Save'}</Text></Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <TextInput autoFocus={!event} value={draft.title} onChangeText={(value) => update('title', value)} placeholder="Name this item" placeholderTextColor={colors.softMuted} style={styles.titleInput} />

              <Text style={styles.label}>TYPE</Text>
              <View style={styles.typeRow}>
                {eventTypes.map((item) => {
                  const selected = draft.type === item.key;
                  return <Pressable key={item.key} onPress={() => update('type', item.key)} style={[styles.typeChip, selected && styles.typeChipActive]}><Icon name={item.icon} size={17} color={selected ? colors.primary : colors.muted} /><Text style={[styles.typeText, selected && styles.typeTextActive]}>{item.label}</Text></Pressable>;
                })}
              </View>

              <Text style={styles.label}>DATE & TIME</Text>
              <View style={styles.quickDates}>
                {[{ label: 'Today', value: todayKey() }, { label: 'Tomorrow', value: addDaysKey(1) }, { label: '+ 1 week', value: addDaysKey(7) }].map((item) => (
                  <Pressable key={item.label} onPress={() => changeDate(item.value)} style={[styles.datePill, draft.date === item.value && styles.datePillActive]}><Text style={[styles.datePillText, draft.date === item.value && styles.datePillTextActive]}>{item.label}</Text></Pressable>
                ))}
              </View>
              <Pressable onPress={() => openDatePicker('date')} style={styles.pickerField}>
                <View style={styles.pickerIcon}><Icon name="calendar-outline" size={19} color={colors.primary} /></View>
                <View style={styles.pickerCopy}><Text style={styles.inputMiniLabel}>DATE</Text><Text style={styles.pickerValue}>{formatLongDate(draft.date)}</Text></View>
                <Icon name="chevron-down" size={18} color={colors.softMuted} />
              </Pressable>
              <View style={styles.timeRow}>
                <Pressable onPress={() => openTimePicker('start')} style={styles.timeField}>
                  <View style={styles.timeCopy}><Text style={styles.inputMiniLabel}>START TIME</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.timeValue}>{formatTime(draft.time)}</Text></View>
                  <Icon name="chevron-down" size={17} color={colors.softMuted} />
                </Pressable>
                <Pressable onPress={() => openTimePicker('end')} style={styles.timeField}>
                  <View style={styles.timeCopy}><Text style={styles.inputMiniLabel}>END TIME</Text><Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.timeValue}>{draft.endTime ? formatTime(draft.endTime) : 'No end time'}</Text></View>
                  <Icon name="chevron-down" size={17} color={colors.softMuted} />
                </Pressable>
              </View>
              {!!draft.endTime && <Pressable onPress={() => update('endTime', '')} style={styles.clearEnd}><Text style={styles.clearEndText}>Remove end time</Text></Pressable>}

              <Text style={styles.label}>REPEAT</Text>
              <View style={styles.repeatRow}>
                {repeatOptions.map((item) => {
                  const selected = draft.repeatMode === item.key;
                  return <Pressable key={item.key} onPress={() => changeRepeatMode(item.key)} style={[styles.repeatOption, selected && styles.repeatOptionActive]}><Icon name={item.icon} size={17} color={selected ? colors.primary : colors.muted} /><Text style={[styles.repeatText, selected && styles.repeatTextActive]}>{item.label}</Text></Pressable>;
                })}
              </View>
              {draft.repeatMode === 'weekly' && (
                <View style={styles.weekdayRow}>
                  {weekdayLabels.map((label, day) => {
                    const selected = draft.repeatDays.includes(day);
                    return <Pressable key={`${label}-${day}`} onPress={() => toggleWeekday(day)} style={[styles.weekday, selected && styles.weekdayActive]}><Text style={[styles.weekdayText, selected && styles.weekdayTextActive]}>{label}</Text></Pressable>;
                  })}
                </View>
              )}
              {draft.repeatMode !== 'none' && (
                <Pressable onPress={() => openDatePicker('until')} style={[styles.pickerField, styles.repeatUntil]}>
                  <View style={styles.pickerIcon}><Icon name="calendar-outline" size={19} color={colors.primary} /></View>
                  <View style={styles.pickerCopy}><Text style={styles.inputMiniLabel}>REPEAT UNTIL</Text><Text style={styles.pickerValue}>{formatLongDate(draft.repeatUntil)}</Text></View>
                  <Icon name="chevron-down" size={18} color={colors.softMuted} />
                </Pressable>
              )}

              <Text style={styles.label}>COURSE</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.courseRow}>
                <Pressable onPress={() => update('courseId', null)} style={[styles.courseChip, !draft.courseId && styles.courseChipNeutralActive]}><Text style={[styles.courseChipText, !draft.courseId && { color: colors.ink }]}>None</Text></Pressable>
                {courses.map((course) => {
                  const selected = draft.courseId === course.id;
                  return <Pressable key={course.id} onPress={() => update('courseId', course.id)} style={[styles.courseChip, selected && { backgroundColor: `${course.color}18`, borderColor: course.color }]}><View style={[styles.courseDot, { backgroundColor: course.color }]} /><Text style={[styles.courseChipText, selected && { color: course.color }]}>{course.code}</Text></Pressable>;
                })}
              </ScrollView>

              <Text style={styles.label}>PRIORITY</Text>
              <View style={styles.priorityRow}>
                {priorities.map((item) => {
                  const selected = draft.priority === item.key;
                  return <Pressable key={item.key} onPress={() => update('priority', item.key)} style={[styles.priority, selected && { borderColor: item.color, backgroundColor: `${item.color}12` }]}><View style={[styles.priorityDot, { backgroundColor: item.color }]} /><Text style={[styles.priorityText, selected && { color: item.color }]}>{item.label}</Text></Pressable>;
                })}
              </View>

              <View style={styles.fieldWithIcon}><Icon name="location-outline" size={19} color={colors.muted} /><TextInput value={draft.location} onChangeText={(value) => update('location', value)} placeholder="Location or link (optional)" placeholderTextColor={colors.softMuted} style={styles.flexInput} /></View>
              <View style={[styles.fieldWithIcon, styles.notesField]}><Icon name="reader-outline" size={19} color={colors.muted} /><TextInput value={draft.notes} onChangeText={(value) => update('notes', value)} placeholder="Notes (optional)" placeholderTextColor={colors.softMuted} multiline style={[styles.flexInput, styles.notesInput]} /></View>

              {!!event && <Pressable onPress={confirmDelete} style={styles.deleteButton}><Icon name="trash-outline" size={18} color={colors.danger} /><Text style={styles.deleteText}>Delete {event.seriesId ? 'this occurrence' : 'item'}</Text></Pressable>}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>

        {activePicker && Platform.OS !== 'android' && (
          <View style={styles.pickerOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setActivePicker(null)} />
          <View style={[styles.pickerSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.pickerHeader}>
              <Pressable onPress={() => setActivePicker(null)} style={styles.pickerHeaderAction}><Text style={styles.pickerCancel}>Cancel</Text></Pressable>
              <Text style={styles.pickerTitle}>
                {activePicker === 'date' ? 'Choose date' : activePicker === 'until' ? 'Repeat until' : activePicker === 'start' ? 'Start time' : 'End time'}
              </Text>
              <Pressable onPress={savePicker} style={[styles.pickerHeaderAction, styles.pickerHeaderActionRight]}><Text style={styles.pickerDone}>Done</Text></Pressable>
            </View>
            <View style={styles.pickerBody}>
              {pickerIsDate ? (
                <DateTimePicker
                  value={pickerValue}
                  mode="date"
                  display="inline"
                  minimumDate={activePicker === 'until' ? fromDateKey(draft.date) : undefined}
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
  overlay: { flex: 1, backgroundColor: 'rgba(17, 25, 42, 0.35)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '94%', backgroundColor: colors.background, borderTopLeftRadius: 30, borderTopRightRadius: 30 },
  handle: { width: 42, height: 5, borderRadius: 3, backgroundColor: '#D9DDE6', alignSelf: 'center', marginTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: 1, borderBottomColor: colors.line },
  headerButton: { width: 42, height: 42, borderRadius: 14, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: 12 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  heading: { color: colors.ink, fontSize: 17, fontWeight: '900', marginTop: 2 },
  saveButton: { minWidth: 58, height: 42, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  saveText: { color: colors.white, fontSize: 13, fontWeight: '900' },
  body: { padding: 20, paddingBottom: 32 },
  titleInput: { backgroundColor: colors.card, borderRadius: 18, minHeight: 64, paddingHorizontal: 18, fontSize: 20, fontWeight: '800', color: colors.ink, borderWidth: 1, borderColor: colors.line },
  seriesNotice: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.primarySoft, borderRadius: 13, padding: 11, marginTop: 10 },
  seriesNoticeText: { color: colors.primary, fontSize: 10, fontWeight: '700', flex: 1 },
  label: { color: colors.muted, fontSize: 10, fontWeight: '900', letterSpacing: 1.1, marginTop: 22, marginBottom: 10 },
  typeRow: { flexDirection: 'row', gap: 7 },
  typeChip: { flex: 1, minHeight: 61, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', gap: 4 },
  typeChipActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  typeText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  typeTextActive: { color: colors.primary },
  quickDates: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  datePill: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
  datePillActive: { backgroundColor: colors.primarySoft, borderColor: colors.primary },
  datePillText: { color: colors.muted, fontWeight: '700', fontSize: 11 },
  datePillTextActive: { color: colors.primary },
  pickerField: { minHeight: 62, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 13 },
  pickerIcon: { width: 38, height: 38, borderRadius: 12, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  pickerCopy: { flex: 1, marginLeft: 11 },
  inputMiniLabel: { color: colors.softMuted, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  pickerValue: { color: colors.ink, fontSize: 13, fontWeight: '800', marginTop: 4 },
  timeRow: { flexDirection: 'row', gap: 9, marginTop: 9 },
  timeField: { flex: 1, minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 13 },
  timeCopy: { flex: 1, minWidth: 0, marginRight: 7 },
  timeValue: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 4 },
  clearEnd: { alignSelf: 'flex-end', paddingVertical: 7, paddingHorizontal: 3 },
  clearEndText: { color: colors.muted, fontSize: 10, fontWeight: '700' },
  repeatRow: { flexDirection: 'row', gap: 8 },
  repeatOption: { flex: 1, height: 48, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  repeatOptionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  repeatText: { color: colors.muted, fontSize: 10, fontWeight: '800' },
  repeatTextActive: { color: colors.primary },
  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
  weekday: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  weekdayActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  weekdayText: { color: colors.muted, fontSize: 11, fontWeight: '900' },
  weekdayTextActive: { color: colors.white },
  repeatUntil: { marginTop: 10 },
  courseRow: { gap: 8, paddingRight: 20 },
  courseChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, paddingHorizontal: 13, paddingVertical: 11, borderRadius: 13 },
  courseChipNeutralActive: { backgroundColor: '#EFF1F5', borderColor: colors.muted },
  courseDot: { width: 8, height: 8, borderRadius: 4 },
  courseChipText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priority: { flex: 1, height: 42, borderRadius: 13, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  priorityDot: { width: 7, height: 7, borderRadius: 4 },
  priorityText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  fieldWithIcon: { minHeight: 54, marginTop: 12, paddingHorizontal: 15, borderRadius: 16, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, flexDirection: 'row', alignItems: 'center', gap: 10 },
  flexInput: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: '600', paddingVertical: 13 },
  notesField: { alignItems: 'flex-start', paddingTop: 14 },
  notesInput: { minHeight: 66, textAlignVertical: 'top', paddingTop: 0 },
  deleteButton: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 22 },
  deleteText: { color: colors.danger, fontSize: 13, fontWeight: '800' },
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
