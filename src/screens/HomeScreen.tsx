import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Mascot from '../components/Mascot';
import { BigButton, C } from '../components/ui';
import type { WordList } from '../data/wordlists';
import { AppData, BADGES } from '../storage';

export default function HomeScreen({
  data,
  lists,
  trickyCount,
  onPlay,
  onPlayTricky,
  onParent,
}: {
  data: AppData;
  lists: WordList[];
  trickyCount: number;
  onPlay: (list: WordList) => void;
  onPlayTricky: () => void;
  onParent: () => void;
}) {
  const earned = BADGES.filter((b) => data.stars >= b.stars);
  const nextBadge = BADGES.find((b) => data.stars < b.stars);
  const name = data.settings.childName.trim();

  return (
    <ScrollView style={{ backgroundColor: C.bg }} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.starCount}>⭐ {data.stars}</Text>
        <Pressable onPress={onParent} accessibilityLabel="Grown-ups" hitSlop={10} style={styles.parentBtn}>
          <Text style={styles.parentText}>👪 Grown-ups</Text>
        </Pressable>
      </View>

      <Mascot mood="idle" size={170} />
      <Text style={styles.title}>Spelling Bee</Text>
      <Text style={styles.subtitle}>{name ? `Hi ${name}! ` : ''}Pick a word list and let's spell! 🐝</Text>

      {lists.map((l) => (
        <BigButton key={l.id} label={`${l.emoji} ${l.name}`} onPress={() => onPlay(l)} style={styles.listBtn} />
      ))}
      {trickyCount > 0 && (
        <BigButton label={`🎯 My tricky words (${trickyCount})`} color={C.purple} textColor={C.white} onPress={onPlayTricky} style={styles.listBtn} />
      )}

      <View style={styles.badgeCard}>
        <Text style={styles.badgeTitle}>My badges</Text>
        <View style={styles.badgeRow}>
          {BADGES.map((b) => {
            const has = data.stars >= b.stars;
            return (
              <View key={b.name} style={styles.badge}>
                <Text style={[styles.badgeEmoji, !has && styles.locked]}>{has ? b.emoji : '🔒'}</Text>
                <Text style={styles.badgeName}>{b.name}</Text>
              </View>
            );
          })}
        </View>
        {nextBadge ? (
          <Text style={styles.nextBadge}>
            {nextBadge.stars - data.stars} more ⭐ to unlock {nextBadge.emoji} {nextBadge.name}!
          </Text>
        ) : (
          <Text style={styles.nextBadge}>You unlocked every badge! 👑</Text>
        )}
        {earned.length === 0 && <Text style={styles.hint}>Spell words right to earn stars.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', padding: 20, paddingBottom: 48 },
  header: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  starCount: { fontSize: 24, fontWeight: '900', color: C.brown },
  parentBtn: { backgroundColor: '#F1E3B8', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
  parentText: { fontSize: 15, fontWeight: '700', color: C.brown },
  title: { fontSize: 40, fontWeight: '900', color: C.brown, marginTop: 4 },
  subtitle: { fontSize: 18, color: C.brown, marginBottom: 16, textAlign: 'center' },
  listBtn: { width: '100%', maxWidth: 380 },
  badgeCard: { marginTop: 20, backgroundColor: C.white, borderRadius: 22, padding: 16, width: '100%', maxWidth: 380, borderWidth: 3, borderColor: '#F1E3B8' },
  badgeTitle: { fontSize: 20, fontWeight: '900', color: C.brown, marginBottom: 8, textAlign: 'center' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  badge: { width: 100, alignItems: 'center', marginVertical: 6 },
  badgeEmoji: { fontSize: 36 },
  locked: { opacity: 0.5 },
  badgeName: { fontSize: 12, fontWeight: '700', color: C.gray, textAlign: 'center' },
  nextBadge: { fontSize: 16, fontWeight: '700', color: C.brown, textAlign: 'center', marginTop: 8 },
  hint: { fontSize: 14, color: C.gray, textAlign: 'center', marginTop: 4 },
});
