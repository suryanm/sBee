import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BUILT_IN_LISTS, Word, WordList } from './src/data/wordlists';
import { AppData, BADGES, DEFAULT_DATA, loadData, saveData, trickyWords } from './src/storage';
import { C } from './src/components/ui';
import HomeScreen from './src/screens/HomeScreen';
import PlayScreen, { WordResult } from './src/screens/PlayScreen';
import ResultsScreen from './src/screens/ResultsScreen';
import ParentGate from './src/screens/ParentGate';
import ParentScreen from './src/screens/ParentScreen';

type Screen =
  | { name: 'home' }
  | { name: 'play'; list: WordList; words: Word[]; key: number }
  | { name: 'results'; list: WordList; results: WordResult[]; stars: number; newBadge?: { emoji: string; name: string } }
  | { name: 'gate' }
  | { name: 'parent' };

function shuffle<T>(a: T[]): T[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j], b[i]];
  }
  return b;
}

/** Picks a round: words never tried and tricky words first, then the rest, shuffled. */
function buildRound(list: WordList, data: AppData): Word[] {
  const n = Math.min(data.settings.wordsPerRound, list.words.length);
  const score = (w: Word) => {
    const s = data.wordStats[w.word.toLowerCase()];
    if (!s) return 1; // new
    const missRate = 1 - s.correct / s.tries;
    return missRate > 0.2 ? 2 : 0; // tricky > new > known
  };
  return shuffle(list.words)
    .sort((a, b) => score(b) - score(a))
    .slice(0, n)
    .sort(() => Math.random() - 0.5);
}

export default function App() {
  const [data, setData] = useState<AppData | null>(null);
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    loadData().then(setData);
  }, []);

  const update = (d: AppData) => {
    setData(d);
    saveData(d).catch(() => {});
  };

  const allWords = useMemo(() => {
    const map = new Map<string, Word>();
    for (const l of [...BUILT_IN_LISTS, ...(data?.customLists ?? [])])
      for (const w of l.words) if (!map.has(w.word.toLowerCase())) map.set(w.word.toLowerCase(), w);
    return map;
  }, [data?.customLists]);

  if (!data) {
    return (
      <View style={[styles.root, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={C.honeyDark} />
      </View>
    );
  }

  const lists = [...BUILT_IN_LISTS, ...data.customLists];
  const tricky = trickyWords(data);
  const trickyList: WordList = {
    id: 'tricky',
    name: 'My tricky words',
    emoji: '🎯',
    words: tricky.map((t) => allWords.get(t) ?? { word: t }),
  };

  const play = (list: WordList) => setScreen({ name: 'play', list, words: buildRound(list, data), key: Date.now() });

  const finish = (list: WordList, results: WordResult[], starsEarned: number, bestStreak: number) => {
    const wordStats = { ...data.wordStats };
    for (const r of results) {
      const k = r.word.toLowerCase();
      const s = wordStats[k] ?? { tries: 0, correct: 0 };
      wordStats[k] = {
        tries: s.tries + 1,
        correct: s.correct + (r.firstTry ? 1 : 0),
        lastMissed: r.firstTry ? s.lastMissed : Date.now(),
      };
    }
    const stickers = { ...data.stickers };
    for (const r of results) if (r.sticker) stickers[r.sticker] = (stickers[r.sticker] ?? 0) + 1;
    const stars = data.stars + starsEarned;
    const newBadge = BADGES.find((b) => data.stars < b.stars && stars >= b.stars);
    update({ ...data, stars, stickers, wordStats, roundsPlayed: data.roundsPlayed + 1, bestStreak: Math.max(data.bestStreak, bestStreak) });
    setScreen({ name: 'results', list, results, stars: starsEarned, newBadge });
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
        <StatusBar style="dark" />
        {screen.name === 'home' && (
          <HomeScreen
            data={data}
            lists={lists}
            trickyCount={tricky.length}
            onPlay={play}
            onPlayTricky={() => play(trickyList)}
            onParent={() => setScreen({ name: 'gate' })}
          />
        )}
        {screen.name === 'play' && (
          <PlayScreen
            key={screen.key}
            words={screen.words}
            onDeviceOnly={data.settings.onDeviceOnly}
            flashWord={data.settings.flashWord}
            ownedStickers={data.stickers}
            onFinish={(r, s, b) => finish(screen.list, r, s, b)}
            onQuit={() => setScreen({ name: 'home' })}
          />
        )}
        {screen.name === 'results' && (
          <ResultsScreen
            results={screen.results}
            starsEarned={screen.stars}
            newBadge={screen.newBadge}
            onAgain={() => play(screen.list.id === 'tricky' ? trickyList : screen.list)}
            onHome={() => setScreen({ name: 'home' })}
          />
        )}
        {screen.name === 'gate' && <ParentGate onPass={() => setScreen({ name: 'parent' })} onCancel={() => setScreen({ name: 'home' })} />}
        {screen.name === 'parent' && <ParentScreen data={data} onChange={update} onClose={() => setScreen({ name: 'home' })} />}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
});
