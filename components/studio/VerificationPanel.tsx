'use client';

import clsx from 'clsx';
import { Check, Keyboard, RotateCcw, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { readStorage, writeStorage } from '@/app/lib/storage';

// Un'ottava: schema invariato (A...K, la K è il Do di arrivo).
const whiteKeysOneOctave = [['A','Do'],['S','Re'],['D','Mi'],['F','Fa'],['G','Sol'],['H','La'],['J','Si'],['K','Do']] as const;
const blackKeysOneOctave = [['W','Do♯',1],['E','Re♯',2],['T','Fa♯',4],['Y','Sol♯',5],['U','La♯',6]] as const;
// Due ottave: 15 tasti fisici distinti invece di ripremere A...K una seconda volta
// (funzionava perché il controllo guarda solo la classe di altezza, ma per l'utente non
// era chiaro che dopo K si dovesse ripartire da S). Riga home per la prima ottava, riga
// inferiore per la seconda: a s d f g h j · z x c v b n m ,
const whiteKeysTwoOctaves = [
  ['A','Do'],['S','Re'],['D','Mi'],['F','Fa'],['G','Sol'],['H','La'],['J','Si'],
  ['Z','Do'],['X','Re'],['C','Mi'],['V','Fa'],['B','Sol'],['N','La'],['M','Si'],[',','Do'],
] as const;
// Diesis della seconda ottava: proseguono sulla riga superiore dopo w/e/t/y/u (stesso
// principio "riga superiore = alterazioni" dello schema a 1 ottava). Scelta arbitraria in
// assenza di una convenzione data — modificabile se preferisci altre lettere.
const blackKeysTwoOctaves = [
  ['W','Do♯',1],['E','Re♯',2],['T','Fa♯',4],['Y','Sol♯',5],['U','La♯',6],
  ['Q','Do♯',8],['R','Re♯',9],['I','Fa♯',11],['O','Sol♯',12],['P','La♯',13],
] as const;
const bases: Record<string, number> = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11 };

function pitchClass(note: string) {
  const normalized = note.toLowerCase();
  const name = Object.keys(bases).find((value) => normalized.startsWith(value)) ?? 'do';
  const accidental = normalized.includes('♯') || normalized.includes('#') ? 1 : normalized.includes('♭') || normalized.endsWith('b') ? -1 : 0;
  return (bases[name] + accidental + 12) % 12;
}

type HistoryEntry = { scale: string; accuracy: number; errors: number; seconds: number; date: string };

const HISTORY_KEY = 'verification-history';
const HISTORY_LIMIT = 5;
const isHistoryEntry = (value: unknown): value is HistoryEntry => typeof value === 'object' && value !== null
  && typeof (value as HistoryEntry).scale === 'string'
  && typeof (value as HistoryEntry).accuracy === 'number'
  && typeof (value as HistoryEntry).errors === 'number'
  && typeof (value as HistoryEntry).seconds === 'number'
  && typeof (value as HistoryEntry).date === 'string';
const parseHistory = (value: unknown): HistoryEntry[] => (Array.isArray(value) ? value.filter(isHistoryEntry) : []);

export default function VerificationPanel({ notes, step, scale, description, disabled, onStepChange, onCorrectAnswer, onActiveChange, historyKey = HISTORY_KEY }: { notes: string[]; step: number; scale: string; description: string; disabled: boolean; onStepChange: (step: number) => void; onCorrectAnswer: (step: number) => void; onActiveChange: (active: boolean) => void; historyKey?: string }) {
  const whiteKeys = notes.length > 8 ? whiteKeysTwoOctaves : whiteKeysOneOctave;
  const blackKeys = notes.length > 8 ? blackKeysTwoOctaves : blackKeysOneOctave;
  // Più stretti per lo schema a 2 ottave (15 tasti anziché 8): 15×52px non ci stava senza
  // scroll orizzontale sulla maggior parte degli schermi.
  const whiteKeyWidth = whiteKeys.length > 8 ? 28 : 44;
  const blackKeyWidth = Math.round(whiteKeyWidth * 0.65);
  // Solo i tasti dello schema attivo sono validi: prima un keyMap unico condivideva le
  // lettere di entrambi gli schemi, così ad es. "K" (schema a 1 ottava) veniva accettato
  // anche con lo schema a 2 ottave attivo, pur non comparendo più sulla tastierina.
  const activeKeyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [key, note] of [...whiteKeys, ...blackKeys]) map[key.toLowerCase()] = pitchClass(note);
    return map;
  }, [whiteKeys, blackKeys]);
  const [status, setStatus] = useState<'idle'|'active'|'complete'>('idle');
  const [attempts, setAttempts] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [errors, setErrors] = useState(0);
  const [feedback, setFeedback] = useState<'correct'|'wrong'|null>(null);
  const [startedAt, setStartedAt] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setHistory(readStorage(historyKey, parseHistory) ?? []);
  }, [historyKey]);

  useEffect(() => {
    if (status !== 'active') return;
    const timer = window.setInterval(() => setElapsed(Math.floor((Date.now() - startedAt) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt, status]);

  const finish = useCallback((nextAttempts: number, nextCorrect: number, nextErrors: number) => {
    const seconds = Math.max(1, Math.floor((Date.now() - startedAt) / 1000));
    const entry: HistoryEntry = { scale: `${scale} · ${description}`, accuracy: Math.round((nextCorrect / Math.max(nextAttempts, 1)) * 100), errors: nextErrors, seconds, date: new Date().toLocaleDateString('it-IT') };
    setHistory((current) => {
      const next = [entry, ...current].slice(0, HISTORY_LIMIT);
      writeStorage(historyKey, next);
      return next;
    });
    setElapsed(seconds); setStatus('complete'); onActiveChange(false);
  }, [description, historyKey, onActiveChange, scale, startedAt]);

  const [lastPressedKey, setLastPressedKey] = useState<string | null>(null);

  const submitPitch = useCallback((key: string) => {
    if (status !== 'active') return;
    const pitch = activeKeyMap[key];
    if (pitch === undefined) return;
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);
    setLastPressedKey(key);
    if (pitch !== pitchClass(notes[step])) {
      setErrors((value) => value + 1); setFeedback('wrong');
      window.setTimeout(() => { setFeedback(null); setLastPressedKey(null); }, 350);
      return;
    }
    const nextCorrect = correct + 1;
    setCorrect(nextCorrect); setFeedback('correct');
    onCorrectAnswer(step);
    window.setTimeout(() => { setFeedback(null); setLastPressedKey(null); }, 350);
    if (step >= notes.length - 1) finish(nextAttempts, nextCorrect, errors);
    else onStepChange(step + 1);
  }, [activeKeyMap, attempts, correct, errors, finish, notes, onCorrectAnswer, onStepChange, status, step]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
      const key = event.key.toLowerCase();
      if (activeKeyMap[key] === undefined) return;
      event.preventDefault(); submitPitch(key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [submitPitch]);

  const start = () => { onStepChange(0); setAttempts(0); setCorrect(0); setErrors(0); setElapsed(0); setStartedAt(Date.now()); setFeedback(null); setLastPressedKey(null); setStatus('active'); onActiveChange(true); };
  const stop = () => { setStatus('idle'); setFeedback(null); setLastPressedKey(null); onActiveChange(false); onStepChange(0); };
  const accuracy = Math.round((correct / Math.max(attempts, 1)) * 100);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Modalità keyboard</p><p className="mt-1 text-sm text-stone-600">{status==='complete'?'Verifica completata — i risultati sono qui sotto.':'Suona la nota attesa con i tasti indicati. Diesis e bemolli equivalenti sono riconosciuti.'}</p></div><Keyboard className="h-6 w-6 text-brass-600" /></div>
          {status==='complete'&&<div role="status" className="mt-4 flex items-center gap-2 rounded-xl bg-moss-100 px-4 py-3 text-sm font-semibold text-moss-800"><Check className="h-5 w-5 shrink-0"/>Verifica completata: {accuracy}% di precisione, {errors} {errors===1?'errore':'errori'}, in {elapsed}s.</div>}
          <div className="mt-5 overflow-x-auto rounded-xl bg-stone-200 p-3 pb-4 shadow-inner">
            <div className="relative h-28" style={{ width: whiteKeys.length * whiteKeyWidth }}>
              <div className="absolute inset-0 flex">{whiteKeys.map(([key,note])=>{const k=key.toLowerCase();const pressed=lastPressedKey===k;return <button key={key} type="button" disabled={status!=='active'} onClick={()=>submitPitch(k)} style={{width: whiteKeyWidth}} className={clsx('flex h-28 shrink-0 flex-col items-center justify-end rounded-b-lg border pb-2 text-center shadow-sm transition hover:bg-brass-50 active:translate-y-0.5 disabled:opacity-70',pressed?feedback==='correct'?'border-moss-600 bg-moss-200':'border-red-500 bg-red-200':'border-stone-400 bg-white')}><strong className={clsx('font-mono text-moss-900',whiteKeyWidth<52?'text-xs':'text-sm')}>{key}</strong><span className="text-[9px] text-stone-500">{note}</span></button>;})}</div>
              {blackKeys.map(([key,note,precedingWhites])=>{const k=key.toLowerCase();const pressed=lastPressedKey===k;return <button key={key} type="button" disabled={status!=='active'} onClick={()=>submitPitch(k)} style={{width: blackKeyWidth, left: precedingWhites*whiteKeyWidth-blackKeyWidth/2}} className={clsx('absolute top-0 z-10 flex h-[72px] flex-col items-center justify-end rounded-b-md border pb-2 text-center text-white shadow-lg transition hover:bg-stone-700 active:translate-y-0.5 disabled:opacity-80',pressed?feedback==='correct'?'border-moss-400 bg-moss-700':'border-red-400 bg-red-700':'border-black bg-stone-900')}><strong className="font-mono text-xs">{key}</strong><span className="text-[8px] text-stone-300">{note}</span></button>;})}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {status==='active'?<><button className="rounded-xl bg-stone-800 px-4 py-2.5 text-sm font-semibold text-white" onClick={stop}>Termina</button><span className="font-mono text-xs text-stone-500">Nota {step+1}/{notes.length} · Errori {errors}</span></>:<button disabled={disabled} className="rounded-xl bg-moss-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40" onClick={start}>{status==='complete'?<><RotateCcw className="mr-2 inline h-4 w-4"/>Riprova</>:<>Avvia verifica</>}</button>}
            {feedback && <span role="status" className={clsx('inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold', feedback==='correct'?'bg-moss-100 text-moss-800':'bg-red-100 text-red-700')}>{feedback==='correct'?<><Check className="h-4 w-4"/>Corretta</>:<><X className="h-4 w-4"/>Riprova</>}</span>}
          </div>
        </div>
        <aside className="rounded-2xl bg-stone-100 p-4">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-stone-500">Risultato</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center"><div><strong className="block text-xl text-moss-900">{accuracy}%</strong><span className="text-[10px] text-stone-500">precisione</span></div><div><strong className="block text-xl text-moss-900">{errors}</strong><span className="text-[10px] text-stone-500">errori</span></div><div><strong className="block text-xl text-moss-900">{elapsed}s</strong><span className="text-[10px] text-stone-500">tempo</span></div></div>
          {(status==='active'||history.length>0)&&<div className="mt-4 border-t border-stone-300 pt-3">
            <p className="mb-2 text-xs font-semibold text-stone-700">Ultime sessioni</p>
            {status==='active'&&<div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-stone-200 py-2 text-[10px]">
              <span className="truncate text-stone-600">{scale} · {description}</span>
              <span className="flex items-center gap-2 whitespace-nowrap"><span className="font-mono text-brass-700">{Math.floor(elapsed/60)}:{String(elapsed%60).padStart(2,"0")}</span><strong className="text-moss-800">{accuracy}%</strong></span>
            </div>}
            {history.slice(0,status==='active'?2:3).map((item,index)=><div key={`${item.date}-${index}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-stone-200 py-2 text-[10px]"><span className="truncate text-stone-500">{item.scale}</span><span className="flex items-center gap-2 whitespace-nowrap"><span className="font-mono text-stone-500">{Math.floor(item.seconds/60)}:{String(item.seconds%60).padStart(2,"0")}</span><strong className="text-moss-800">{item.accuracy}%</strong></span></div>)}
          </div>}
        </aside>
    </div>
  );
}
