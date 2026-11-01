import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import Mascot from '../components/Mascot';
import Celebration from '../components/Celebration';
import { BigButton, C } from '../components/ui';
import type { WordResult } from './PlayScreen';

export default function ResultsScreen({
  results,
  starsEarned,
  newBadge,
  onAgain,
  onHome,
}: {
  results: WordResult[];
  starsEarned: number;
  newBadge?: { emoji: string; name: string };
  onAgain: () => void;
  onHome: () => void;
}) {
  const right = results.filter((r) => r.correct).length;
  const missed = results.filter((r) => !r.firstTry);
  const headline =
    right === results.length ? 'Perfect round! 🏆' : right >= results.length * 0.7 ? 'Awesome work! 🎉' : 'Great practice! 💪';

  useEffect(() => {
    Speech.speak(
      `${headline.replace(/[^\w\s!]/g, '')} You spelled ${right} out of ${results.length} words and earned ${starsEarned} stars!` +
        (newBadge ? ` You unlocked the ${newBadge.name} badge!` : ''),
      { language: 'en-US', rate: 0.9, pitch: 1.1 },
    );
    return () => {
      Speech.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <ScrollView contentContainerStyle={styles.content}>
        <Mascot mood="happy" size={160} />
        <Text style={styles.title}>{headline}</Text>
        <Text style={styles.score}>
          {right} / {results.length} words right
        </Text>
        <Text style={styles.stars}>+{starsEarned} ⭐</Text>
        {results.some((r) => r.sticker) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Stickers you won 🎁</Text>
            <Text style={styles.stickers}>{results.map((r) => r.sticker ?? '').join(' ')}</Text>
          </View>
        )}
        {newBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeEmoji}>{newBadge.emoji}</Text>
            <Text style={styles.badgeText}>New badge: {newBadge.name}!</Text>
          </View>
        )}
        {missed.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Words to practice 🎯</Text>
            {missed.map((m) => (
              <Text key={m.word} style={styles.word}>
                {m.word}
              </Text>
            ))}
          </View>
        )}
        <BigButton label="🔁 Play again" onPress={onAgain} style={styles.btn} />
        <BigButton label="🏠 Home" color={C.sky} onPress={onHome} style={styles.btn} />
      </ScrollView>
      <Celebration trigger={1} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { alignItems: 'center', padding: 20, paddingTop: 56, paddingBottom: 40 },
  title: { fontSize: 32, fontWeight: '900', color: C.brown, marginTop: 8, textAlign: 'center' },
  score: { fontSize: 22, fontWeight: '700', color: C.brown, marginTop: 6 },
  stars: { fontSize: 44, fontWeight: '900', color: C.honeyDark, marginVertical: 8 },
  badge: { alignItems: 'center', backgroundColor: C.white, borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 3, borderColor: C.honey },
  badgeEmoji: { fontSize: 54 },
  badgeText: { fontSize: 20, fontWeight: '800', color: C.brown },
  card: { backgroundColor: C.white, borderRadius: 20, padding: 16, width: '100%', maxWidth: 360, marginBottom: 12, borderWidth: 3, borderColor: '#F1E3B8' },
  cardTitle: { fontSize: 20, fontWeight: '900', color: C.brown, marginBottom: 6, textAlign: 'center' },
  stickers: { fontSize: 40, textAlign: 'center', lineHeight: 52 },
  word: { fontSize: 22, fontWeight: '700', color: C.purple, textAlign: 'center', marginVertical: 2 },
  btn: { width: '100%', maxWidth: 320 },
});
