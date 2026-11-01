// Turns what the speech recognizer heard ("bee ee ay ess tee ess", "B. E. A. S. T. S.",
// "double L", ...) into the letters a child spelled, then checks them against the word.

const LETTER_NAMES: Record<string, string> = {
  a: 'a', ay: 'a', aye: 'a', eh: 'a', hey: 'a',
  b: 'b', be: 'b', bee: 'b', bea: 'b',
  c: 'c', see: 'c', sea: 'c', cee: 'c', si: 'c',
  d: 'd', dee: 'd', de: 'd', di: 'd',
  e: 'e', ee: 'e', ea: 'e',
  f: 'f', ef: 'f', eff: 'f', iff: 'f',
  g: 'g', gee: 'g', ji: 'g', jee: 'g', gi: 'g',
  h: 'h', aitch: 'h', haitch: 'h', age: 'h', each: 'h', ach: 'h',
  i: 'i', eye: 'i', ai: 'i',
  j: 'j', jay: 'j', jae: 'j',
  k: 'k', kay: 'k', okay: 'k', ok: 'k', cay: 'k',
  l: 'l', el: 'l', ell: 'l', elle: 'l', al: 'l',
  m: 'm', em: 'm', emm: 'm',
  n: 'n', en: 'n', enn: 'n',
  o: 'o', oh: 'o', owe: 'o', ou: 'o',
  p: 'p', pee: 'p', pea: 'p', pe: 'p',
  q: 'q', queue: 'q', cue: 'q', kew: 'q', kyu: 'q', qu: 'q',
  r: 'r', are: 'r', ar: 'r', our: 'r', arr: 'r',
  s: 's', es: 's', ess: 's', is: 's',
  t: 't', tee: 't', tea: 't', ti: 't', te: 't',
  u: 'u', you: 'u', yu: 'u', yoo: 'u', ewe: 'u',
  v: 'v', vee: 'v', ve: 'v', vi: 'v',
  w: 'w', doubleu: 'w', doubleyou: 'w',
  x: 'x', ex: 'x', ecks: 'x', eggs: 'x',
  y: 'y', why: 'y', wye: 'y', wy: 'y',
  z: 'z', zee: 'z', zed: 'z', zi: 'z',
};

const FILLER = new Set(['um', 'uh', 'umm', 'uhh', 'hmm', 'and', 'the', 'then', 'capital', 'letter', 'like']);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** The letters a child spelled, or '' if nothing letter-like was heard. */
export function lettersFromTranscript(transcript: string, targetWord?: string): string {
  const target = (targetWord ?? '').toLowerCase();
  const tokens = tokenize(transcript);
  let out = '';
  for (let i = 0; i < tokens.length; i++) {
    let tok = tokens[i];
    // "double u" / "double you" is W; "double l" is "ll"
    if (tok === 'double' && i + 1 < tokens.length) {
      const next = tokens[i + 1];
      if (next === 'u' || next === 'you' || next === 'yu') {
        out += 'w';
        i++;
        continue;
      }
      const l = LETTER_NAMES[next];
      if (l) {
        out += l + l;
        i++;
        continue;
      }
    }
    // Kids often say the word before and after spelling it (bee style): skip it.
    if (target && tok === target && target.length > 1) continue;
    if (FILLER.has(tok) && tok !== target) continue;
    const letter = LETTER_NAMES[tok];
    if (letter) {
      out += letter;
      continue;
    }
    // Some recognizers glue fast letters together ("BEASTS" or "bea sts"): keep raw letters.
    out += tok;
  }
  return out;
}

export type SpellCheck = {
  correct: boolean;
  heard: string; // best letters we heard
  saidWholeWord: boolean; // child said the word but did not spell it
};

/** Checks every alternative transcript the recognizer gave us; any match counts. */
export function checkSpelling(alternatives: string[], word: string): SpellCheck {
  const target = word.toLowerCase().replace(/[^a-z]/g, '');
  const candidates = alternatives.map((t) => lettersFromTranscript(t, target));
  if (candidates.some((c) => c === target)) {
    return { correct: true, heard: target, saidWholeWord: false };
  }
  const saidWholeWord =
    candidates.every((c) => c === '') &&
    alternatives.some((t) => tokenize(t).includes(target));
  // Show the candidate closest to the target so the child sees what we heard.
  const best = candidates
    .filter(Boolean)
    .sort((a, b) => distance(a, target) - distance(b, target))[0] ?? '';
  return { correct: false, heard: best, saidWholeWord };
}

function distance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
  return dp[a.length][b.length];
}

/** Words to bias the recognizer toward letter names. */
export const LETTER_HINTS = 'abcdefghijklmnopqrstuvwxyz'.split('').map((c) => c.toUpperCase());
