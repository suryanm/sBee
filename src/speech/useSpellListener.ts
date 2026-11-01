// Listens to the child spelling out loud, using the phone's own speech recognizer.
// By default it only runs on-device, so the child's voice never leaves the phone.
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { LETTER_HINTS, lettersFromTranscript } from './letters';

export type ListenStatus =
  | 'idle'
  | 'listening'
  | 'no-permission'
  | 'offline-unavailable' // on-device English isn't installed and online speech is off
  | 'error';

const LANG = 'en-US';
const SILENCE_MS = 2800; // stop after this long with nothing new heard
const MAX_MS = 30000;
const START_GRACE_MS = 7000;

export function useSpellListener(opts: {
  word: string;
  allowOnline: boolean;
  onDone: (alternatives: string[]) => void;
}) {
  const [status, setStatus] = useState<ListenStatus>('idle');
  const [liveLetters, setLiveLetters] = useState('');
  const committed = useRef(''); // Android continuous mode: finished segments so far
  const lastAlts = useRef<string[]>([]);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const clearTimers = () => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    if (maxTimer.current) clearTimeout(maxTimer.current);
    silenceTimer.current = maxTimer.current = null;
  };

  const stop = useCallback(() => {
    clearTimers();
    if (active.current) ExpoSpeechRecognitionModule.stop();
  }, []);

  const bumpSilence = (ms = SILENCE_MS) => {
    if (silenceTimer.current) clearTimeout(silenceTimer.current);
    silenceTimer.current = setTimeout(() => stop(), ms);
  };

  useSpeechRecognitionEvent('result', (ev) => {
    const alts = ev.results.map((r) => r.transcript).filter(Boolean);
    if (!alts.length) return;
    const prefix = Platform.OS === 'android' ? committed.current : '';
    lastAlts.current = alts.map((a) => `${prefix} ${a}`.trim());
    if (ev.isFinal && Platform.OS === 'android') committed.current = `${prefix} ${alts[0]}`.trim();
    setLiveLetters(lettersFromTranscript(lastAlts.current[0], optsRef.current.word));
    bumpSilence();
  });

  useSpeechRecognitionEvent('end', () => {
    clearTimers();
    if (!active.current) return;
    active.current = false;
    setStatus((s) => (s === 'listening' ? 'idle' : s));
    optsRef.current.onDone(lastAlts.current);
  });

  useSpeechRecognitionEvent('error', (ev) => {
    if (ev.error === 'no-speech' || ev.error === 'aborted') return; // 'end' follows
    if (ev.error === 'not-allowed') setStatus('no-permission');
    else if (
      !optsRef.current.allowOnline &&
      (ev.error === 'language-not-supported' || ev.error === 'service-not-allowed' || ev.error === 'network')
    )
      setStatus('offline-unavailable');
    else setStatus('error');
  });

  const start = useCallback(async () => {
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setStatus('no-permission');
      return;
    }
    const { allowOnline } = optsRef.current;
    let onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    if (onDevice && Platform.OS === 'android') {
      try {
        const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({});
        if (!installedLocales.some((l) => l.toLowerCase().startsWith('en'))) {
          onDevice = false;
          if (!allowOnline) {
            // Ask Android to download the offline English model, then tell the parent.
            ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: LANG }).catch(() => {});
          }
        }
      } catch {
        // Older Android: can't check. Try on-device anyway.
      }
    }
    if (!onDevice && !allowOnline) {
      setStatus('offline-unavailable');
      return;
    }
    committed.current = '';
    lastAlts.current = [];
    setLiveLetters('');
    active.current = true;
    setStatus('listening');
    ExpoSpeechRecognitionModule.start({
      lang: LANG,
      interimResults: true,
      maxAlternatives: 5,
      continuous: true,
      requiresOnDeviceRecognition: onDevice,
      contextualStrings: [...LETTER_HINTS, optsRef.current.word],
      addsPunctuation: false,
      iosTaskHint: 'dictation',
    });
    maxTimer.current = setTimeout(() => stop(), MAX_MS);
    bumpSilence(START_GRACE_MS); // give the child time to begin
  }, [stop]);

  const reset = useCallback(() => {
    setStatus('idle');
    setLiveLetters('');
  }, []);

  return { status, liveLetters, start, stop, reset };
}
