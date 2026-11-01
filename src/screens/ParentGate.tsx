// A simple grown-ups-only check before the parent area (Google Families policy expects one).
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BigButton, C } from '../components/ui';

export default function ParentGate({ onPass, onCancel }: { onPass: () => void; onCancel: () => void }) {
  const [misses, setMisses] = useState(0);
  const q = useMemo(() => {
    const a = 6 + Math.floor(Math.random() * 7);
    const b = 6 + Math.floor(Math.random() * 7);
    const answer = a * b;
    const opts = new Set([answer]);
    while (opts.size < 4) opts.add(answer + (Math.floor(Math.random() * 21) - 10) || answer + 11);
    return { a, b, answer, opts: [...opts].sort(() => Math.random() - 0.5) };
  }, [misses]);

  return (
    <View style={styles.root}>
      <Text style={styles.title}>👪 Grown-ups only</Text>
      <Text style={styles.q}>
        What is {q.a} × {q.b}?
      </Text>
      <View style={styles.row}>
        {q.opts.map((o) => (
          <Pressable key={o} style={styles.opt} onPress={() => (o === q.answer ? onPass() : setMisses((m) => m + 1))}>
            <Text style={styles.optText}>{o}</Text>
          </Pressable>
        ))}
      </View>
      {misses > 0 && <Text style={styles.hint}>Ask a grown-up to help.</Text>}
      <BigButton label="← Back" color={C.sky} onPress={onCancel} style={{ marginTop: 24, minWidth: 180 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { fontSize: 30, fontWeight: '900', color: C.brown },
  q: { fontSize: 26, fontWeight: '700', color: C.brown, marginVertical: 20 },
  row: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', justifyContent: 'center' },
  opt: { width: 80, height: 64, borderRadius: 16, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.honey },
  optText: { fontSize: 24, fontWeight: '800', color: C.brown },
  hint: { marginTop: 16, color: C.gray, fontSize: 15 },
});
