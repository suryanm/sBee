// Everything is saved on the phone only (AsyncStorage). Nothing is sent anywhere.
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { WordList } from './data/wordlists';

export type WordStat = { tries: number; correct: number; lastMissed?: number };

export type AppData = {
  stars: number;
  bestStreak: number;
  roundsPlayed: number;
  wordStats: Record<string, WordStat>; // keyed by lowercase word
  customLists: WordList[];
  settings: {
    wordsPerRound: number;
    allowOnlineSpeech: boolean; // off by default: voice stays on the device
    childName: string;
  };
};

const KEY = 'sbee:data:v1';

export const DEFAULT_DATA: AppData = {
  stars: 0,
  bestStreak: 0,
  roundsPlayed: 0,
  wordStats: {},
  customLists: [],
  settings: { wordsPerRound: 10, allowOnlineSpeech: false, childName: '' },
};

export async function loadData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULT_DATA;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_DATA, ...parsed, settings: { ...DEFAULT_DATA.settings, ...parsed.settings } };
  } catch {
    return DEFAULT_DATA;
  }
}

export async function saveData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

/** Reward badges unlocked by total stars. */
export const BADGES = [
  { stars: 5, emoji: '🌼', name: 'Busy Bee' },
  { stars: 15, emoji: '🍯', name: 'Honey Maker' },
  { stars: 30, emoji: '🌈', name: 'Rainbow Speller' },
  { stars: 50, emoji: '🚀', name: 'Rocket Speller' },
  { stars: 75, emoji: '🦄', name: 'Word Wizard' },
  { stars: 100, emoji: '👑', name: 'Spelling Royalty' },
];

/** Words missed more often than gotten right, most-missed first. */
export function trickyWords(data: AppData): string[] {
  return Object.entries(data.wordStats)
    .filter(([, s]) => s.tries - s.correct > 0 && s.correct / s.tries < 0.8)
    .sort((a, b) => (b[1].tries - b[1].correct) - (a[1].tries - a[1].correct))
    .map(([word]) => word);
}

/** Parses pasted words: commas, new lines or spaces all work. */
export function parseWordInput(text: string): string[] {
  const seen = new Set<string>();
  return text
    .split(/[\s,;]+/)
    .map((s) => s.trim().replace(/[^A-Za-z'-]/g, ''))
    .filter((s) => s.length > 0 && !seen.has(s.toLowerCase()) && (seen.add(s.toLowerCase()), true));
}
