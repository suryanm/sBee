// Listens to the child spelling out loud, using the phone's own speech recognizer.
// It tries on-device recognition first (voice stays on the phone). If that isn't available,
// it falls back to the phone's standard recognizer, unless a parent chose "on-device only".
import { useCallback, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { LETTER_HINTS, lettersFromTranscript } from './letters';

export type ListenStatus =
  | 'idle'
  | 'listening'
  | 'no-permission'
  | 'offline-unavailable' // on-device English isn't available and the parent chose on-device only
  | 'unavailable' // no speech recognizer on this phone
  | 'error';

export type ListenMode = 'on-device' | 'standard';

const LANG = 'en-US';
const SILENCE_MS = 3000; // stop after this long with nothing new heard
const MAX_MS = 30000;
const START_GRACE_MS = 8000; // time for the child to begin
const ANDROID_ON_DEVICE_SERVICE = 'com.google.android.as';

let downloadAsked = false;
function askOfflineDownloadOnce() {
  if (Platform.OS !== 'android' || downloadAsked) return;
  downloadAsked = true;
  ExpoSpeechRecognitionModule.androidTriggerOfflineModelDownload({ locale: LANG }).catch(() => {});
}

const canContinuous = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 33);

async function androidHasOfflineEnglish(): Promise<boolean> {
  try {
    const { installedLocales } = await ExpoSpeechRecognitionModule.getSupportedLocales({
      androidRecognitionServicePackage: ANDROID_ON_DEVICE_SERVICE,
    });
    return installedLocales.some((l) => l.toLowerCase().replace('_', '-').startsWith('en'));
  } catch {
    return false;
  }
}

export function useSpellListener(opts: { word: string; onDeviceOnly: boolean; onDone: (alternatives: string[]) => void }) {
  const [status, setStatus] = useState<ListenStatus>('idle');
  const [liveLetters, setLiveLetters] = useState('');
  const [rawText, setRawText] = useState('');
  const [volume, setVolume] = useState(0);
  const [mode, setMode] = useState<ListenMode | null>(null);
  const [lastError, setLastError] = useState('');
  const committed = useRef(''); // Android continuous mode: finished segments so far
  const lastAlts = useRef<string[]>([]);
  const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const retryStandard = useRef(false);
  const modeRef = useRef<ListenMode>('standard');
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

  const launch = (m: ListenMode) => {
    modeRef.current = m;
    setMode(m);
    committed.current = '';
    lastAlts.current = [];
    active.current = true;
    setStatus('listening');
    ExpoSpeechRecognitionModule.start({
      lang: LANG,
      interimResults: true,
      maxAlternatives: 5,
      continuous: canContinuous,
      requiresOnDeviceRecognition: m === 'on-device',
      androidRecognitionServicePackage: Platform.OS === 'android' && m === 'on-device' ? ANDROID_ON_DEVICE_SERVICE : undefined,
      contextualStrings: [...LETTER_HINTS, optsRef.current.word].filter(Boolean),
      addsPunctuation: false,
      iosTaskHint: 'dictation',
      volumeChangeEventOptions: { enabled: true, intervalMillis: 200 },
    });
    clearTimers();
    maxTimer.current = setTimeout(() => stop(), MAX_MS);
    bumpSilence(START_GRACE_MS);
  };

  useSpeechRecognitionEvent('result', (ev) => {
    const alts = ev.results.map((r) => r.transcript).filter(Boolean);
    if (!alts.length) return;
    const prefix = Platform.OS === 'android' && canContinuous ? committed.current : '';
    lastAlts.current = alts.map((a) => `${prefix} ${a}`.trim());
    if (ev.isFinal && Platform.OS === 'android' && canContinuous) committed.current = `${prefix} ${alts[0]}`.trim();
    setRawText(lastAlts.current[0]);
    setLiveLetters(lettersFromTranscript(lastAlts.current[0], optsRef.current.word));
    bumpSilence();
  });

  useSpeechRecognitionEvent('volumechange', (ev) => setVolume(Math.max(0, Math.min(10, ev.value))));

  useSpeechRecognitionEvent('end', () => {
    clearTimers();
    setVolume(0);
    if (retryStandard.current) {
      // On-device failed: try the phone's standard recognizer instead.
      retryStandard.current = false;
      setTimeout(() => launch('standard'), 150);
      return;
    }
    if (!active.current) return;
    active.current = false;
    setStatus((s) => (s === 'listening' ? 'idle' : s));
    optsRef.current.onDone(lastAlts.current);
  });

  useSpeechRecognitionEvent('error', (ev) => {
    setLastError(`${ev.error}: ${ev.message}`);
    if (ev.error === 'no-speech' || ev.error === 'aborted') return; // 'end' follows
    if (ev.error === 'not-allowed') {
      setStatus('no-permission');
      return;
    }
    if (modeRef.current === 'on-device') {
      askOfflineDownloadOnce();
      if (!optsRef.current.onDeviceOnly && lastAlts.current.length === 0) {
        retryStandard.current = true;
        return;
      }
      setStatus('offline-unavailable');
      return;
    }
    setStatus('error');
  });

  const start = useCallback(async () => {
    setLastError('');
    setRawText('');
    setLiveLetters('');
    retryStandard.current = false;
    const perm = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!perm.granted) {
      setStatus('no-permission');
      return;
    }
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) {
      setStatus('unavailable');
      return;
    }
    let onDevice = ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
    if (onDevice && Platform.OS === 'android') onDevice = await androidHasOfflineEnglish();
    if (!onDevice) {
      askOfflineDownloadOnce();
      if (optsRef.current.onDeviceOnly) {
        setStatus('offline-unavailable');
        return;
      }
    }
    launch(onDevice ? 'on-device' : 'standard');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stop]);

  const reset = useCallback(() => {
    setStatus('idle');
    setLiveLetters('');
    setRawText('');
  }, []);

  return { status, liveLetters, rawText, volume, mode, lastError, start, stop, reset };
}
