import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { BigButton, C } from '../components/ui';
import { BUILT_IN_LISTS, WordList } from '../data/wordlists';
import { AppData, DEFAULT_DATA, parseWordInput, trickyWords } from '../storage';
import { useSpellListener } from '../speech/useSpellListener';

type Tab = 'progress' | 'lists' | 'settings';

export default function ParentScreen({
  data,
  onChange,
  onClose,
}: {
  data: AppData;
  onChange: (d: AppData) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('progress');
  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>Parent area</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={styles.close}>Done</Text>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        {(['progress', 'lists', 'settings'] as Tab[]).map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.tab, tab === t && styles.tabOn]}>
            <Text style={[styles.tabText, tab === t && styles.tabTextOn]}>
              {t === 'progress' ? '📊 Progress' : t === 'lists' ? '📝 Word lists' : '⚙️ Settings'}
            </Text>
          </Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {tab === 'progress' && <Progress data={data} />}
        {tab === 'lists' && <Lists data={data} onChange={onChange} />}
        {tab === 'settings' && <Settings data={data} onChange={onChange} />}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function Progress({ data }: { data: AppData }) {
  const stats = Object.entries(data.wordStats);
  const tries = stats.reduce((n, [, s]) => n + s.tries, 0);
  const correct = stats.reduce((n, [, s]) => n + s.correct, 0);
  const mastered = stats.filter(([, s]) => s.correct >= 2 && s.correct / s.tries >= 0.8).length;
  const tricky = trickyWords(data);
  const lists = [...BUILT_IN_LISTS, ...data.customLists];

  return (
    <>
      <View style={styles.statRow}>
        <Stat label="Stars" value={data.stars} />
        <Stat label="Rounds" value={data.roundsPlayed} />
        <Stat label="Best streak" value={data.bestStreak} />
      </View>
      <View style={styles.statRow}>
        <Stat label="Words tried" value={stats.length} />
        <Stat label="First-try accuracy" value={tries ? `${Math.round((correct / tries) * 100)}%` : '–'} />
        <Stat label="Mastered" value={mastered} />
      </View>

      <Text style={styles.h2}>By word list</Text>
      {lists.map((l) => {
        const ws = l.words.map((w) => data.wordStats[w.word.toLowerCase()]).filter(Boolean);
        const done = ws.length;
        const acc = ws.reduce((n, s) => n + s.correct, 0) / Math.max(1, ws.reduce((n, s) => n + s.tries, 0));
        return (
          <View key={l.id} style={styles.listRow}>
            <Text style={styles.listName}>{l.name}</Text>
            <Text style={styles.listMeta}>
              {done}/{l.words.length} practiced{done ? ` · ${Math.round(acc * 100)}% right` : ''}
            </Text>
            <View style={styles.bar}>
              <View style={[styles.barFill, { width: `${(done / Math.max(1, l.words.length)) * 100}%` }]} />
            </View>
          </View>
        );
      })}

      <Text style={styles.h2}>Tricky words</Text>
      {tricky.length === 0 ? (
        <Text style={styles.muted}>No tricky words yet. Words missed on the first try show up here.</Text>
      ) : (
        tricky.map((w) => {
          const s = data.wordStats[w];
          return (
            <View key={w} style={styles.trickyRow}>
              <Text style={styles.trickyWord}>{w}</Text>
              <Text style={styles.muted}>
                {s.correct}/{s.tries} right
              </Text>
            </View>
          );
        })
      )}
      <Text style={styles.privacy}>🔒 All progress is stored only on this phone.</Text>
    </>
  );
}

function Lists({ data, onChange }: { data: AppData; onChange: (d: AppData) => void }) {
  const [editing, setEditing] = useState<WordList | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const startNew = () => {
    setEditing({ id: `custom-${Date.now()}`, name: '', emoji: '⭐', words: [], custom: true });
    setName('');
    setText('');
  };
  const startEdit = (l: WordList) => {
    setEditing(l);
    setName(l.name);
    setText(l.words.map((w) => w.word).join('\n'));
  };
  const save = () => {
    if (!editing) return;
    const words = parseWordInput(text);
    if (!name.trim() || words.length === 0) return;
    const list: WordList = { ...editing, name: name.trim(), words: words.map((word) => ({ word })) };
    const exists = data.customLists.some((l) => l.id === list.id);
    onChange({
      ...data,
      customLists: exists ? data.customLists.map((l) => (l.id === list.id ? list : l)) : [...data.customLists, list],
    });
    setEditing(null);
  };
  const remove = (id: string) => onChange({ ...data, customLists: data.customLists.filter((l) => l.id !== id) });
  const saveTricky = () => {
    const tricky = trickyWords(data);
    if (!tricky.length) return;
    setEditing({ id: `custom-${Date.now()}`, name: '', emoji: '🎯', words: [], custom: true });
    setName('Practice list');
    setText(tricky.join('\n'));
  };

  if (editing) {
    const count = parseWordInput(text).length;
    return (
      <>
        <Text style={styles.h2}>{data.customLists.some((l) => l.id === editing.id) ? 'Edit list' : 'New word list'}</Text>
        <Text style={styles.label}>List name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Week 5 words" />
        <Text style={styles.label}>Words (one per line, or separated by commas)</Text>
        <TextInput
          style={[styles.input, styles.multi]}
          value={text}
          onChangeText={setText}
          multiline
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={'apple\nbanana\ncherry'}
        />
        <Text style={styles.muted}>{count} words</Text>
        <BigButton label="💾 Save list" color={C.green} textColor={C.white} onPress={save} disabled={!name.trim() || count === 0} />
        <BigButton label="Cancel" color="#EEE" onPress={() => setEditing(null)} small />
      </>
    );
  }

  return (
    <>
      <BigButton label="➕ New word list" onPress={startNew} />
      {trickyWords(data).length > 0 && <BigButton small label="🎯 Make a list from tricky words" color={C.purple} textColor={C.white} onPress={saveTricky} />}
      <Text style={styles.h2}>Your lists</Text>
      {data.customLists.length === 0 && <Text style={styles.muted}>No custom lists yet. Add your child's weekly words!</Text>}
      {data.customLists.map((l) => (
        <View key={l.id} style={styles.listRow}>
          <Pressable onPress={() => setOpen(open === l.id ? null : l.id)}>
            <Text style={styles.listName}>
              {l.emoji} {l.name}
            </Text>
            <Text style={styles.listMeta}>{l.words.length} words · tap to view</Text>
          </Pressable>
          {open === l.id && <Text style={styles.wordsPreview}>{l.words.map((w) => w.word).join(', ')}</Text>}
          <View style={styles.rowBtns}>
            <BigButton small label="✏️ Edit" color={C.sky} onPress={() => startEdit(l)} />
            <BigButton small label="🗑 Delete" color="#FFD6D6" onPress={() => remove(l.id)} />
          </View>
        </View>
      ))}
      <Text style={styles.h2}>Built-in lists</Text>
      {BUILT_IN_LISTS.map((l) => (
        <View key={l.id} style={styles.listRow}>
          <Pressable onPress={() => setOpen(open === l.id ? null : l.id)}>
            <Text style={styles.listName}>
              {l.emoji} {l.name}
            </Text>
            <Text style={styles.listMeta}>{l.words.length} words · Scripps 2026–27 study list · tap to view</Text>
          </Pressable>
          {open === l.id && <Text style={styles.wordsPreview}>{l.words.map((w) => w.word).join(', ')}</Text>}
        </View>
      ))}
    </>
  );
}

function Settings({ data, onChange }: { data: AppData; onChange: (d: AppData) => void }) {
  const [confirmReset, setConfirmReset] = useState(false);
  const set = (patch: Partial<AppData['settings']>) => onChange({ ...data, settings: { ...data.settings, ...patch } });
  return (
    <>
      <Text style={styles.label}>Child's first name (optional, shown on the home screen)</Text>
      <TextInput style={styles.input} value={data.settings.childName} onChangeText={(childName) => set({ childName })} placeholder="Name" />

      <Text style={styles.label}>Words per round</Text>
      <View style={styles.rowBtns}>
        {[5, 10, 15, 20].map((n) => (
          <BigButton key={n} small label={`${n}`} color={data.settings.wordsPerRound === n ? C.honey : '#EEE'} onPress={() => set({ wordsPerRound: n })} />
        ))}
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listName}>Show the word while it's read aloud</Text>
          <Text style={styles.muted}>The word flashes on screen while Buzzy says it, then hides before your child spells. Turn off for harder, listen-only practice.</Text>
        </View>
        <Switch value={data.settings.flashWord} onValueChange={(flashWord) => set({ flashWord })} />
      </View>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.listName}>On-device voice only</Text>
          <Text style={styles.muted}>
            The app always tries the phone's offline speech first, so the voice stays on the phone. If offline English isn't installed, it uses the phone's
            standard speech service (Google or Apple) instead. Turn this on to never use the online service; voice then only works once the offline English
            pack is downloaded.
          </Text>
        </View>
        <Switch value={data.settings.onDeviceOnly} onValueChange={(onDeviceOnly) => set({ onDeviceOnly })} />
      </View>

      <MicTest onDeviceOnly={data.settings.onDeviceOnly} />

      <Text style={styles.h2}>Reset</Text>
      <BigButton
        small
        label={confirmReset ? 'Tap again to erase all stars and progress' : '♻️ Reset stars and progress'}
        color={confirmReset ? C.red : '#EEE'}
        textColor={confirmReset ? C.white : C.brown}
        onPress={() => {
          if (!confirmReset) return setConfirmReset(true);
          onChange({ ...data, stars: 0, bestStreak: 0, roundsPlayed: 0, wordStats: DEFAULT_DATA.wordStats });
          setConfirmReset(false);
        }}
      />
      <Text style={styles.privacy}>🔒 No ads, no accounts, no tracking. Nothing leaves this phone.</Text>
    </>
  );
}

function MicTest({ onDeviceOnly }: { onDeviceOnly: boolean }) {
  const [result, setResult] = useState('');
  const l = useSpellListener({ word: '', onDeviceOnly, onDone: (alts) => setResult(alts[0] ?? '(nothing heard)') });
  const listening = l.status === 'listening';
  return (
    <View style={styles.listRow}>
      <Text style={styles.listName}>🎤 Test the microphone</Text>
      <Text style={styles.muted}>Tap Start and say "B E E". You should see the bar move and the words appear.</Text>
      <BigButton
        small
        label={listening ? '⏹️ Stop' : '▶️ Start test'}
        color={listening ? C.red : C.green}
        textColor={C.white}
        onPress={() => {
          if (listening) l.stop();
          else {
            setResult('');
            l.start();
          }
        }}
      />
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${l.volume * 10}%` }]} />
      </View>
      <Text style={styles.diag}>Status: {l.status}{l.mode ? ` · ${l.mode === 'on-device' ? 'offline (on this phone)' : 'standard speech service'}` : ''}</Text>
      {(l.rawText || result) ? <Text style={styles.diag}>Heard: “{l.rawText || result}”</Text> : null}
      {l.lastError ? <Text style={styles.diag}>Last error: {l.lastError}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  diag: { fontSize: 14, color: C.brown, marginTop: 6 },
  root: { flex: 1, backgroundColor: '#FAFAF7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  title: { fontSize: 26, fontWeight: '900', color: C.brown },
  close: { fontSize: 18, fontWeight: '800', color: C.purple },
  tabs: { flexDirection: 'row', paddingHorizontal: 12, gap: 6 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 12, backgroundColor: '#EEE', alignItems: 'center' },
  tabOn: { backgroundColor: C.honey },
  tabText: { fontSize: 14, fontWeight: '700', color: C.gray },
  tabTextOn: { color: C.brown },
  content: { padding: 16, paddingBottom: 60 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  stat: { flex: 1, backgroundColor: C.white, borderRadius: 14, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EEE' },
  statValue: { fontSize: 24, fontWeight: '900', color: C.brown },
  statLabel: { fontSize: 12, color: C.gray, textAlign: 'center' },
  h2: { fontSize: 19, fontWeight: '900', color: C.brown, marginTop: 18, marginBottom: 8 },
  listRow: { backgroundColor: C.white, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EEE' },
  listName: { fontSize: 17, fontWeight: '800', color: C.brown },
  listMeta: { fontSize: 13, color: C.gray, marginTop: 2 },
  bar: { height: 8, borderRadius: 4, backgroundColor: '#EEE', marginTop: 8, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: C.green },
  trickyRow: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: C.white, borderRadius: 12, padding: 10, marginBottom: 6 },
  trickyWord: { fontSize: 17, fontWeight: '700', color: C.purple },
  muted: { fontSize: 14, color: C.gray },
  privacy: { fontSize: 13, color: C.gray, marginTop: 24, textAlign: 'center' },
  label: { fontSize: 15, fontWeight: '700', color: C.brown, marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: C.white, borderRadius: 12, borderWidth: 1, borderColor: '#DDD', padding: 12, fontSize: 17 },
  multi: { minHeight: 180, textAlignVertical: 'top' },
  rowBtns: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  wordsPreview: { fontSize: 14, color: C.brown, marginTop: 8, lineHeight: 20 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 20, backgroundColor: C.white, padding: 12, borderRadius: 14 },
});
