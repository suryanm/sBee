import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import Mascot, { Mood } from '../components/Mascot';
import Celebration from '../components/Celebration';
import { BigButton, C } from '../components/ui';
import type { Word } from '../data/wordlists';
import { checkSpelling } from '../speech/letters';
import { pickSticker, Sticker } from '../data/stickers';
import { useSpellListener } from '../speech/useSpellListener';

export type WordResult = { word: string; correct: boolean; firstTry: boolean; sticker?: string };

type Phase = 'ask' | 'right' | 'retry' | 'reveal';

const CHEERS = ['Great job!', 'You got it!', 'Bee-autiful spelling!', 'Amazing!', 'Super speller!', 'Buzz-tastic!'];
const ALMOST = ['So close! Try again.', 'Almost! Give it another try.', 'Nice try! One more time.'];
const pick = (a: string[]) => a[Math.floor(Math.random() * a.length)];

function say(text: string, rate = 0.9, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, { language: 'en-US', rate, pitch: 1.1, onDone, onStopped: onDone, onError: onDone });
}

export default function PlayScreen({
  words,
  allowOnline,
  flashWord,
  ownedStickers,
  onFinish,
  onQuit,
}: {
  words: Word[];
  allowOnline: boolean;
  flashWord: boolean;
  ownedStickers: Record<string, number>;
  onFinish: (results: WordResult[], starsEarned: number, bestStreak: number) => void;
  onQuit: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('ask');
  const [mood, setMood] = useState<Mood>('idle');
  const [heard, setHeard] = useState('');
  const [message, setMessage] = useState('');
  const [typing, setTyping] = useState(false);
  const [typed, setTyped] = useState('');
  const [celebrate, setCelebrate] = useState(0);
  const [stars, setStars] = useState(0);
  const [streak, setStreak] = useState(0);
  const bestStreak = useRef(0);
  const results = useRef<WordResult[]>([]);

  const flash = useRef(new Animated.Value(0)).current;
  const [flashing, setFlashing] = useState(false);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = words[index];
  const [sticker, setSticker] = useState<(Sticker & { isNew: boolean }) | null>(null);
  const stickerAnim = useRef(new Animated.Value(0)).current;

  /** Says the word and, if enabled, flashes it big on screen until the voice finishes. */
  const sayWord = (text: string, rate = 0.9) => {
    if (!flashWord) return say(text, rate);
    if (flashTimer.current) clearTimeout(flashTimer.current);
    setFlashing(true);
    flash.stopAnimation();
    Animated.spring(flash, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true }).start();
    const hide = () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => {
        Animated.timing(flash, { toValue: 0, duration: 250, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() =>
          setFlashing(false),
        );
      }, 700);
    };
    say(text, rate, hide);
    flashTimer.current = setTimeout(hide, 5000); // safety net if the voice never reports done
  };
  const target = current.word.toLowerCase().replace(/[^a-z]/g, '');

  const evaluate = useCallback(
    (correct: boolean, heardLetters: string, saidWholeWord = false) => {
      if (saidWholeWord) {
        setMood('idle');
        setMessage('I heard the word! Now spell it letter by letter. 🔤');
        say('I heard the word! Now spell it, letter by letter.');
        return;
      }
      setHeard(heardLetters);
      if (correct) {
        const firstTry = phase === 'ask';
        const newStreak = streak + 1;
        const bonus = newStreak % 3 === 0 ? 1 : 0;
        setStreak(newStreak);
        bestStreak.current = Math.max(bestStreak.current, newStreak);
        setStars((s) => s + 1 + bonus);
        const roundStickers = results.current.map((r) => r.sticker).filter(Boolean) as string[];
        const st = pickSticker(ownedStickers, roundStickers);
        const isNew = !ownedStickers[st.emoji] && !roundStickers.includes(st.emoji);
        results.current.push({ word: current.word, correct: true, firstTry, sticker: st.emoji });
        setSticker({ ...st, isNew });
        stickerAnim.setValue(0);
        Animated.spring(stickerAnim, { toValue: 1, friction: 4, tension: 90, delay: 350, useNativeDriver: true }).start();
        setPhase('right');
        setMood('happy');
        setCelebrate((c) => c + 1);
        const cheer = pick(CHEERS);
        setMessage(bonus ? `${cheer} 🔥 ${newStreak} in a row: bonus star!` : cheer);
        say(`${cheer} You won a ${st.name} sticker!`);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      } else if (phase === 'ask') {
        setPhase('retry');
        setMood('oops');
        const m = heardLetters ? pick(ALMOST) : "I didn't catch any letters. Try again!";
        setMessage(m);
        say(m);
      } else {
        setStreak(0);
        results.current.push({ word: current.word, correct: false, firstTry: false });
        setPhase('reveal');
        setMood('idle');
        setMessage(`That's okay! "${current.word}" is spelled:`);
        say(`That's okay! ${current.word} is spelled ${target.split('').join(', ')}. ${current.word}.`, 0.8);
      }
    },
    [phase, streak, current, target],
  );

  const listener = useSpellListener({
    word: target,
    allowOnline,
    onDone: (alts) => {
      setMood('idle');
      if (!alts.length) {
        evaluate(false, '');
        return;
      }
      const r = checkSpelling(alts, target);
      evaluate(r.correct, r.heard, r.saidWholeWord);
    },
  });

  // New word: reset and read it out.
  useEffect(() => {
    setPhase('ask');
    setSticker(null);
    setMood('idle');
    setHeard('');
    setTyped('');
    setMessage('');
    listener.reset();
    const t = setTimeout(() => sayWord(`Spell: ${current.word}.`), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => () => {
    Speech.stop();
    listener.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (listener.status === 'offline-unavailable' || listener.status === 'no-permission' || listener.status === 'error') {
      setMood('idle');
      setTyping(true);
    }
  }, [listener.status]);

  const next = () => {
    Speech.stop();
    if (index + 1 >= words.length) onFinish(results.current, stars, bestStreak.current);
    else setIndex(index + 1);
  };

  const startListening = () => {
    Speech.stop();
    setMessage('');
    setHeard('');
    setMood('listening');
    listener.start();
  };

  const checkTyped = () => {
    if (!typed) return;
    evaluate(typed === target, typed);
    setTyped('');
  };

  const listening = listener.status === 'listening';
  const answering = phase === 'ask' || phase === 'retry';
  const shownLetters = listening ? listener.liveLetters : phase === 'reveal' ? target : heard;

  return (
    <View style={styles.root}>
      <View style={styles.topBar}>
        <Pressable onPress={onQuit} accessibilityLabel="Quit round" hitSlop={12}>
          <Text style={styles.quit}>✕</Text>
        </Pressable>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${(index / words.length) * 100}%` }]} />
        </View>
        <Text style={styles.stars}>⭐ {stars}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.count}>
          Word {index + 1} of {words.length}
          {streak >= 2 ? `   🔥 ${streak}` : ''}
        </Text>
        <Mascot mood={mood} size={150} />

        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>
            {listening ? "I'm listening… spell it out loud! 👂" : message || 'Listen to the word, then spell it!'}
          </Text>
        </View>

        {shownLetters ? (
          <View style={styles.tiles}>
            {shownLetters.split('').map((ch, i) => {
              const ok = phase === 'reveal' || phase === 'right' || listening ? null : ch === target[i];
              return (
                <View key={i} style={[styles.tile, ok === true && styles.tileOk, ok === false && styles.tileBad, phase === 'right' && styles.tileOk]}>
                  <Text style={styles.tileText}>{ch.toUpperCase()}</Text>
                </View>
              );
            })}
          </View>
        ) : null}

        {listener.status === 'offline-unavailable' && (
          <Text style={styles.note}>
            Voice needs the phone's offline English speech pack. A grown-up can download it in the phone's Settings (search "offline speech"), or turn on online speech in the Parent area. For now, tap the letters!
          </Text>
        )}
        {listener.status === 'no-permission' && (
          <Text style={styles.note}>The microphone is off for this app. A grown-up can turn it on in the phone's Settings. For now, tap the letters!</Text>
        )}
        {listener.status === 'error' && <Text style={styles.note}>The microphone had a hiccup. Try again, or tap the letters!</Text>}

        {answering && (
          <View style={styles.helpRow}>
            <BigButton small label="🔊 Again" color={C.sky} onPress={() => sayWord(`${current.word}.`)} />
            <BigButton small label="🐢 Slow" color={C.sky} onPress={() => sayWord(current.word, 0.5)} />
            {current.sentence ? (
              <BigButton small label="💬 Sentence" color={C.sky} onPress={() => say(`${current.sentence} ${current.word}.`)} />
            ) : null}
          </View>
        )}

        {answering && !typing && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={listening ? 'Done spelling' : 'Tap to spell'}
              onPress={listening ? listener.stop : startListening}
              style={({ pressed }) => [styles.mic, listening && styles.micOn, { transform: [{ scale: pressed ? 0.94 : 1 }] }]}
            >
              <Text style={styles.micIcon}>{listening ? '✋' : '🎤'}</Text>
              <Text style={styles.micLabel}>{listening ? "I'm done" : 'Tap & spell'}</Text>
            </Pressable>
            <Pressable onPress={() => setTyping(true)} hitSlop={10}>
              <Text style={styles.link}>⌨️ Tap letters instead</Text>
            </Pressable>
          </>
        )}

        {answering && typing && (
          <View style={styles.keyboard}>
            <View style={styles.typedBox}>
              <Text style={styles.typedText}>{typed.toUpperCase() || ' '}</Text>
            </View>
            <View style={styles.keys}>
              {'abcdefghijklmnopqrstuvwxyz'.split('').map((k) => (
                <Pressable key={k} onPress={() => setTyped((t) => t + k)} style={({ pressed }) => [styles.key, pressed && { backgroundColor: C.honey }]}>
                  <Text style={styles.keyText}>{k.toUpperCase()}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => setTyped((t) => t.slice(0, -1))} style={[styles.key, styles.keyWide]}>
                <Text style={styles.keyText}>⌫</Text>
              </Pressable>
            </View>
            <BigButton label="✅ Check" color={C.green} textColor={C.white} onPress={checkTyped} disabled={!typed} />
            {listener.status === 'idle' && (
              <Pressable onPress={() => setTyping(false)} hitSlop={10}>
                <Text style={styles.link}>🎤 Use my voice</Text>
              </Pressable>
            )}
          </View>
        )}

        {phase === 'right' && sticker && (
          <Animated.View
            style={[
              styles.stickerCard,
              {
                opacity: stickerAnim,
                transform: [
                  { scale: stickerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
                  { rotate: stickerAnim.interpolate({ inputRange: [0, 1], outputRange: ['-30deg', '0deg'] }) },
                ],
              },
            ]}
          >
            <Text style={styles.stickerEmoji}>{sticker.emoji}</Text>
            <Text style={styles.stickerText}>
              {sticker.isNew ? `New sticker: ${sticker.name}!` : `${sticker.name} sticker!`}
            </Text>
          </Animated.View>
        )}

        {(phase === 'right' || phase === 'reveal') && (
          <BigButton label={index + 1 >= words.length ? '🏁 See my stars' : 'Next word ➜'} onPress={next} color={C.green} textColor={C.white} style={{ minWidth: 220 }} />
        )}
      </ScrollView>
      {flashing && (
        <View pointerEvents="none" style={styles.flashWrap}>
          <Animated.View
            style={[
              styles.flashCard,
              { opacity: flash, transform: [{ scale: flash.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1] }) }] },
            ]}
          >
            <Text style={styles.flashText} adjustsFontSizeToFit numberOfLines={1}>
              {current.word}
            </Text>
          </Animated.View>
        </View>
      )}
      <Celebration trigger={celebrate} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  stickerCard: { alignItems: 'center', backgroundColor: C.white, borderRadius: 24, paddingVertical: 10, paddingHorizontal: 22, marginTop: 14, borderWidth: 4, borderColor: C.purple, borderStyle: 'dashed' },
  stickerEmoji: { fontSize: 72 },
  stickerText: { fontSize: 18, fontWeight: '800', color: C.purple },
  flashWrap: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,225,0.6)' },
  flashCard: { backgroundColor: C.white, borderRadius: 28, paddingVertical: 28, paddingHorizontal: 30, borderWidth: 5, borderColor: C.honey, maxWidth: '90%', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 },
  flashText: { fontSize: 56, fontWeight: '900', color: C.brown, textAlign: 'center' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8, gap: 12 },
  quit: { fontSize: 26, color: C.gray, fontWeight: '800' },
  progressTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: '#F1E3B8', overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.honeyDark, borderRadius: 7 },
  stars: { fontSize: 20, fontWeight: '800', color: C.brown },
  content: { alignItems: 'center', padding: 16, paddingBottom: 40 },
  count: { fontSize: 16, color: C.gray, fontWeight: '700', marginBottom: 4 },
  bubble: { backgroundColor: C.white, borderRadius: 22, paddingVertical: 14, paddingHorizontal: 18, marginTop: 6, maxWidth: 360, borderWidth: 3, borderColor: '#F1E3B8' },
  bubbleText: { fontSize: 20, fontWeight: '700', color: C.brown, textAlign: 'center' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14, gap: 6 },
  tile: { minWidth: 38, height: 46, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.honey, paddingHorizontal: 4 },
  tileOk: { backgroundColor: '#C8F7C5', borderColor: C.green },
  tileBad: { backgroundColor: '#FFD6D6', borderColor: C.red },
  tileText: { fontSize: 24, fontWeight: '900', color: C.brown },
  note: { fontSize: 15, color: C.brown, backgroundColor: '#FFF0C2', padding: 12, borderRadius: 14, marginTop: 12, maxWidth: 380, textAlign: 'center' },
  helpRow: { flexDirection: 'row', gap: 8, marginTop: 14, flexWrap: 'wrap', justifyContent: 'center' },
  mic: { marginTop: 16, width: 150, height: 150, borderRadius: 75, backgroundColor: C.purple, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 8, borderColor: 'rgba(0,0,0,0.2)' },
  micOn: { backgroundColor: C.red },
  micIcon: { fontSize: 54 },
  micLabel: { fontSize: 18, color: C.white, fontWeight: '800', marginTop: 2 },
  link: { fontSize: 17, color: C.purple, fontWeight: '700', marginTop: 14 },
  keyboard: { alignItems: 'center', marginTop: 12, width: '100%', maxWidth: 420 },
  typedBox: { minHeight: 54, minWidth: 220, borderRadius: 14, backgroundColor: C.white, borderWidth: 3, borderColor: C.honey, justifyContent: 'center', paddingHorizontal: 12, marginBottom: 10 },
  typedText: { fontSize: 28, fontWeight: '900', letterSpacing: 4, color: C.brown, textAlign: 'center' },
  keys: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  key: { width: 42, height: 48, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 3, borderColor: '#E0D2A8' },
  keyWide: { width: 90 },
  keyText: { fontSize: 22, fontWeight: '800', color: C.brown },
});
