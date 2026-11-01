import { lettersFromTranscript as L, checkSpelling as C } from '../src/speech/letters.ts';
import assert from 'node:assert/strict';
const cases: [string, string, string][] = [
  ['B E A S T S', 'beasts', 'beasts'],
  ['bee ee ay ess tee ess', 'beasts', 'beasts'],
  ['beasts. B. E. A. S. T. S. beasts', 'beasts', 'beasts'],
  ['k n i t', 'knit', 'knit'],
  ['I L L N E S S', 'illness', 'illness'],
  ['eye double L N E double S', 'illness', 'illness'],
  ['W O V E N', 'woven', 'woven'],
  ['double u oh vee ee en', 'woven', 'woven'],
  ['see are I G I D', 'rigid', 'crigid'],
  ['are eye gee eye dee', 'rigid', 'rigid'],
  ['um B A M uh B O O', 'bamboo', 'bamboo'],
  ['dee ee see ee em bee ee are', 'December', 'december'],
  ['jay oh vee eye ay el', 'jovial', 'jovial'],
  ['why', 'y', 'y'],
];
for (const [t, w, exp] of cases) assert.equal(L(t, w), exp, `${t} -> ${L(t, w)}`);
assert.equal(C(['beasts'], 'beasts').saidWholeWord, true);
assert.equal(C(['beasts'], 'beasts').correct, false);
assert.equal(C(['b e e s t s', 'b e a s t s'], 'beasts').correct, true);
const r = C(['b e e s t s'], 'beasts');
assert.equal(r.correct, false); assert.equal(r.heard, 'beests');
assert.equal(C(['L E A D'], 'lead').correct, true);
console.log('all letter tests passed');
