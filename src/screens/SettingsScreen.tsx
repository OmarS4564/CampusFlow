import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Icon } from '../components/Icon';
import { usePlanner } from '../context/PlannerContext';
import { colors } from '../theme';

export function SettingsScreen() {
  const { settings, setSetting, events, courses, resetPlanner } = usePlanner();
  const [name, setName] = useState(settings.userName);
  const [term, setTerm] = useState(settings.term);
  const [isResetting, setIsResetting] = useState(false);
  useEffect(() => { setName(settings.userName); setTerm(settings.term); }, [settings]);

  const performReset = async () => {
    setIsResetting(true);
    try {
      await resetPlanner();
      Alert.alert('CampusFlow reset', 'All local data was deleted. CampusFlow is back to its original setup.');
    } catch {
      Alert.alert('Could not reset CampusFlow', 'Your data was not fully cleared. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'Delete all CampusFlow data?',
      'This permanently removes every course, repeating class schedule, planner item, and profile setting stored on this phone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete All', style: 'destructive', onPress: () => { void performReset(); } },
      ],
    );
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <Text style={styles.eyebrow}>CAMPUSFLOW</Text><Text style={styles.title}>Settings</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatar}><Text style={styles.avatarText}>{name.trim().charAt(0).toUpperCase() || 'S'}</Text></View>
        <View style={styles.profileCopy}><Text style={styles.profileTitle}>{settings.userName}</Text><Text style={styles.profileSub}>{courses.length} courses · {events.length} planner items</Text></View>
        <View style={styles.localBadge}><Icon name="phone-portrait-outline" size={14} color={colors.teal} /><Text style={styles.localBadgeText}>LOCAL</Text></View>
      </View>

      <Text style={styles.sectionLabel}>PROFILE</Text>
      <View style={styles.group}>
        <View style={styles.fieldRow}><View style={styles.fieldIcon}><Icon name="person-outline" size={19} color={colors.primary} /></View><View style={styles.fieldCopy}><Text style={styles.fieldLabel}>Your name</Text><TextInput value={name} onChangeText={setName} onBlur={() => setSetting('userName', name.trim() || 'Student')} style={styles.input} /></View></View>
        <View style={styles.divider} />
        <View style={styles.fieldRow}><View style={styles.fieldIcon}><Icon name="calendar-outline" size={19} color={colors.primary} /></View><View style={styles.fieldCopy}><Text style={styles.fieldLabel}>Current term</Text><TextInput value={term} onChangeText={setTerm} onBlur={() => setSetting('term', term.trim() || 'Current Term')} style={styles.input} /></View></View>
      </View>

      <Text style={styles.sectionLabel}>DATA & PRIVACY</Text>
      <View style={styles.infoCard}>
        <View style={styles.lockIcon}><Icon name="shield-checkmark" size={22} color={colors.teal} /></View>
        <View style={styles.infoCopy}><Text style={styles.infoTitle}>Private by default</Text><Text style={styles.infoText}>Your schedule is stored in a SQLite database on this phone. No account or cloud connection is required.</Text></View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Delete all CampusFlow data"
        disabled={isResetting}
        onPress={confirmReset}
        style={({ pressed }) => [styles.deleteCard, pressed && !isResetting && styles.deleteCardPressed]}
      >
        <View style={styles.deleteIcon}><Icon name="trash-outline" size={21} color={colors.danger} /></View>
        <View style={styles.deleteCopy}>
          <Text style={styles.deleteTitle}>{isResetting ? 'Clearing CampusFlow…' : 'Delete all data'}</Text>
          <Text style={styles.deleteText}>Reset courses, planner items, and settings to a fresh install.</Text>
        </View>
        {isResetting
          ? <ActivityIndicator color={colors.danger} size="small" />
          : <Icon name="chevron-forward" size={18} color={colors.danger} />}
      </Pressable>
      <View style={styles.about}><View style={styles.logo}><Icon name="calendar" size={21} color={colors.white} /></View><Text style={styles.aboutName}>CampusFlow</Text><Text style={styles.version}>Version 1.0 · Built for better semesters</Text></View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 18, paddingTop: 14, paddingBottom: 35 },
  eyebrow: { color: colors.primary, fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: colors.ink, fontSize: 27, fontWeight: '900', letterSpacing: -0.8, marginTop: 2, marginBottom: 19 },
  profileCard: { minHeight: 83, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 21, padding: 14, borderWidth: 1, borderColor: colors.line },
  avatar: { width: 49, height: 49, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  avatarText: { color: colors.primary, fontSize: 19, fontWeight: '900' },
  profileCopy: { flex: 1, marginLeft: 12 },
  profileTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  profileSub: { color: colors.muted, fontSize: 10, marginTop: 4 },
  localBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.tealSoft, borderRadius: 9, paddingHorizontal: 8, paddingVertical: 6 },
  localBadgeText: { color: colors.teal, fontSize: 8, fontWeight: '900', letterSpacing: 0.5 },
  sectionLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 1.2, marginTop: 25, marginBottom: 9 },
  group: { backgroundColor: colors.card, borderRadius: 21, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14 },
  fieldRow: { minHeight: 75, flexDirection: 'row', alignItems: 'center' },
  fieldIcon: { width: 39, height: 39, borderRadius: 13, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  fieldCopy: { flex: 1, marginLeft: 12 },
  fieldLabel: { color: colors.softMuted, fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
  input: { color: colors.ink, fontSize: 14, fontWeight: '800', paddingVertical: 5 },
  divider: { height: 1, backgroundColor: colors.line, marginLeft: 51 },
  infoCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: colors.tealSoft, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: '#D5F0EC' },
  lockIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center' },
  infoCopy: { flex: 1, marginLeft: 12 },
  infoTitle: { color: colors.ink, fontSize: 13, fontWeight: '900' },
  infoText: { color: '#5D7775', fontSize: 11, lineHeight: 17, marginTop: 4 },
  deleteCard: { minHeight: 76, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 20, padding: 14, marginTop: 11, borderWidth: 1, borderColor: '#F6D7DB' },
  deleteCardPressed: { opacity: 0.7 },
  deleteIcon: { width: 43, height: 43, borderRadius: 14, backgroundColor: colors.coralSoft, alignItems: 'center', justifyContent: 'center' },
  deleteCopy: { flex: 1, marginHorizontal: 12 },
  deleteTitle: { color: colors.danger, fontSize: 13, fontWeight: '900' },
  deleteText: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 3 },
  about: { alignItems: 'center', marginTop: 38 },
  logo: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  aboutName: { color: colors.ink, fontSize: 15, fontWeight: '900', marginTop: 9 },
  version: { color: colors.softMuted, fontSize: 10, marginTop: 3 },
});
