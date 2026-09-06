'use client';

import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, Square, Volume1, Volume2, VolumeX } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AudioEngine } from '@/app/lib/audio-engine';
import { createSampleEngine, createSynthEngine } from '@/app/lib/audio-engine';
import { ARPEGGIO_TABLE_KEYS, type ArpeggioDataset, type ArpeggioTableKey } from '@/app/lib/arpeggio-definitions';
import { ARPEGGIO_PRACTICE_SELECTION_EVENT, arpeggioPracticeSelectionHref, type ArpeggioMode, type ArpeggioPracticeSelection, readArpeggioPracticeSelection, saveArpeggioPracticeSelection } from '@/app/lib/arpeggio-practice-selection';
import { buildPitches } from '@/app/lib/pitch';
import { readStorage, writeStorage } from '@/app/lib/storage';
import PianoKeyboard from '../studio/PianoKeyboard';
import VerificationPanel from '../studio/VerificationPanel';

type Hand = 'mano_destra' | 'mano_sinistra';
type Direction = 'salita' | 'discesa';
type PracticeStatus = 'idle' | 'countdown' | 'running' | 'turnaround' | 'complete';

declare global {
  interface Document {
    modelContext?: {
      registerTool(tool: { name: string; title?: string; description: string; inputSchema: object; annotations?: { readOnlyHint?: boolean; untrustedContentHint?: boolean }; execute(input: unknown): unknown }, options?: { signal?: AbortSignal }): void | Promise<void>;
    };
  }
}

const tableKeyFor = (mode: ArpeggioMode, twoOctaves: boolean): ArpeggioTableKey => mode === 'maggiori'
  ? (twoOctaves ? 'arpeggi_maggiori_2_ottave' : 'arpeggi_maggiori_1_ottava')
  : (twoOctaves ? 'arpeggi_minori_2_ottave' : 'arpeggi_minori_1_ottava');

const speedOptions = [
  { label: 'Lento', value: 1100 },
  { label: 'Medio', value: 700 },
  { label: 'Veloce', value: 420 },
];

// Impostazioni di metronomo e volume condivise con Studio scale (stesse chiavi di storage):
// non c'è motivo che BPM e volume preferiti differiscano tra i due studi.
type GuidedPracticeSettings = { bpm?: number; repetitions?: number; pauseBeats?: number };
const GUIDED_PRACTICE_KEY = 'guided-practice';
const parseGuidedPracticeSettings = (value: unknown): GuidedPracticeSettings => (typeof value === 'object' && value !== null ? value as GuidedPracticeSettings : {});
const AUDIO_VOLUME_KEY = 'studio-audio-volume';
const DEFAULT_VOLUME = 80;
const parseVolume = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : DEFAULT_VOLUME);

export default function ArpeggioStudyPanel({ data }: { data: ArpeggioDataset }) {
  const router = useRouter();
  const [tableKey, setTableKey] = useState<ArpeggioTableKey>('arpeggi_maggiori_1_ottava');
  const [accordo, setAccordo] = useState('Do');
  const [hand, setHand] = useState<Hand>('mano_destra');
  const [direction, setDirection] = useState<Direction>('salita');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const [bpm, setBpm] = useState(60);
  const [repetitions, setRepetitions] = useState(3);
  const [pauseBeats, setPauseBeats] = useState(1);
  const [practiceStatus, setPracticeStatus] = useState<PracticeStatus>('idle');
  const [practicePaused, setPracticePaused] = useState(false);
  const [countdown, setCountdown] = useState(4);
  const [turnaroundLeft, setTurnaroundLeft] = useState(0);
  const [pendingDirection, setPendingDirection] = useState<Direction>('salita');
  const [currentRepetition, setCurrentRepetition] = useState(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [beatCount, setBeatCount] = useState(0);
  const [verificationActive, setVerificationActive] = useState(false);
  const [practiceMode, setPracticeMode] = useState<'libera' | 'metronomo' | 'verifica'>('libera');
  const [volumePopoverOpen, setVolumePopoverOpen] = useState(false);
  const volumeControlRef = useRef<HTMLDivElement | null>(null);

  const table = data.tabelle[tableKey];
  const row = table.righe.find((item) => item.accordo === accordo) ?? table.righe[0];
  const fingers = row[`${hand}_${direction}`];
  const notes = useMemo(() => (direction === 'discesa' ? [...row.note_salita].reverse() : row.note_salita), [direction, row.note_salita]);

  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const audioEnabled = volume > 0;

  const sampleEngineRef = useRef<AudioEngine | null>(null);
  const getSampleEngine = useCallback(() => {
    if (!sampleEngineRef.current) sampleEngineRef.current = createSampleEngine({ sampleBasePath: '/samples/piano', ext: 'wav' });
    return sampleEngineRef.current;
  }, []);
  const synthEngineRef = useRef<AudioEngine | null>(null);
  const getSynthEngine = useCallback(() => {
    if (!synthEngineRef.current) synthEngineRef.current = createSynthEngine({ waveform: 'triangle', maxVoices: 8 });
    return synthEngineRef.current;
  }, []);
  const unlockAudio = useCallback(() => { void getSampleEngine().unlock(); }, [getSampleEngine]);

  useEffect(() => {
    setVolume(readStorage(AUDIO_VOLUME_KEY, parseVolume) ?? DEFAULT_VOLUME);
  }, []);
  useEffect(() => {
    writeStorage(AUDIO_VOLUME_KEY, volume);
    getSampleEngine().setMasterGain(volume / 100);
    getSynthEngine().setMasterGain(volume / 100);
    if (volume === 0) { sampleEngineRef.current?.stopAll(); synthEngineRef.current?.stopAll(); }
  }, [getSampleEngine, getSynthEngine, volume]);
  useEffect(() => () => { sampleEngineRef.current?.dispose(); synthEngineRef.current?.dispose(); }, []);

  useEffect(() => {
    if (!volumePopoverOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (volumeControlRef.current && !volumeControlRef.current.contains(event.target as Node)) setVolumePopoverOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') setVolumePopoverOpen(false); };
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [volumePopoverOpen]);

  const pitches = useMemo(() => buildPitches(notes, direction), [notes, direction]);
  useEffect(() => {
    if (!audioEnabled || !pitches.length) return;
    void getSampleEngine().preload(pitches);
  }, [audioEnabled, getSampleEngine, pitches]);

  const lastPlayedStepRef = useRef<number | null>(0);
  const playPitchAtStep = useCallback((index: number) => {
    if (!audioEnabled) return;
    const pitch = pitches[index];
    if (pitch === undefined) return;
    lastPlayedStepRef.current = index;
    void (async () => {
      try {
        await getSampleEngine().playNote(pitch, { durationMs: 320, velocity: 0.85 });
      } catch {
        getSynthEngine().playNote(pitch, { durationMs: 320, velocity: 0.8 });
      }
    })();
  }, [audioEnabled, getSampleEngine, getSynthEngine, pitches]);
  useEffect(() => {
    if (!audioEnabled || lastPlayedStepRef.current === step) return;
    playPitchAtStep(step);
  }, [audioEnabled, playPitchAtStep, step]);

  const stopAndReset = useCallback(() => {
    lastPlayedStepRef.current = 0;
    setPlaying(false);
    setStep(0);
  }, []);

  useEffect(() => {
    const stored = readStorage(GUIDED_PRACTICE_KEY, parseGuidedPracticeSettings) ?? {};
    if (stored.bpm && stored.bpm >= 40 && stored.bpm <= 180) setBpm(stored.bpm);
    if (stored.repetitions && [1, 3, 5].includes(stored.repetitions)) setRepetitions(stored.repetitions);
    if (stored.pauseBeats !== undefined && [0, 1, 2].includes(stored.pauseBeats)) setPauseBeats(stored.pauseBeats);
  }, []);
  useEffect(() => {
    writeStorage(GUIDED_PRACTICE_KEY, { bpm, repetitions, pauseBeats });
  }, [bpm, pauseBeats, repetitions]);

  useEffect(() => {
    if (!table.righe.some((item) => item.accordo === accordo)) setAccordo(table.righe[0].accordo);
    stopAndReset();
  }, [table, accordo, hand, direction, stopAndReset]);

  useEffect(() => {
    const applySelection = (selection: ArpeggioPracticeSelection) => {
      const nextKey = tableKeyFor(selection.mode, selection.octaves === 2);
      if (data.tabelle[nextKey].righe.some((item) => item.accordo === selection.accordo)) setAccordo(selection.accordo);
      setTableKey(nextKey);
      stopAndReset();
    };
    applySelection(readArpeggioPracticeSelection());
    const update = (event: Event) => applySelection((event as CustomEvent<ArpeggioPracticeSelection>).detail);
    window.addEventListener(ARPEGGIO_PRACTICE_SELECTION_EVENT, update);
    return () => window.removeEventListener(ARPEGGIO_PRACTICE_SELECTION_EVENT, update);
  }, [data, stopAndReset]);

  const selectMode = (mode: ArpeggioMode) => {
    const selection: ArpeggioPracticeSelection = { accordo, mode, octaves: tableKey.includes('2_ottave') ? 2 : 1 };
    saveArpeggioPracticeSelection(selection);
    router.replace(arpeggioPracticeSelectionHref('/studio-arpeggi', selection), { scroll: false });
  };
  const selectOctaves = (octaves: 1 | 2) => {
    const selection: ArpeggioPracticeSelection = { accordo, mode: tableKey.includes('minori') ? 'minori' : 'maggiori', octaves };
    saveArpeggioPracticeSelection(selection);
    router.replace(arpeggioPracticeSelectionHref('/studio-arpeggi', selection), { scroll: false });
  };
  const selectAccordo = (nextAccordo: string) => {
    const selection: ArpeggioPracticeSelection = { accordo: nextAccordo, mode: tableKey.includes('minori') ? 'minori' : 'maggiori', octaves: tableKey.includes('2_ottave') ? 2 : 1 };
    setAccordo(nextAccordo);
    saveArpeggioPracticeSelection(selection);
    router.replace(arpeggioPracticeSelectionHref('/studio-arpeggi', selection), { scroll: false });
  };

  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      if (step >= fingers.length - 1) setPlaying(false);
      else setStep((current) => current + 1);
    }, speed);
    return () => window.clearTimeout(timer);
  }, [fingers.length, playing, speed, step]);

  const beatDuration = 60000 / bpm;
  const practiceActive = practiceStatus !== 'idle' && practiceStatus !== 'complete';
  const anyModeActive = playing || practiceActive || verificationActive;
  const structuredModeActive = practiceActive || verificationActive;

  useEffect(() => {
    if (!practiceActive || practicePaused) return;
    const timer = window.setInterval(() => setElapsedSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [practiceActive, practicePaused]);

  useEffect(() => {
    if (practiceStatus !== 'countdown' || practicePaused) return;
    const timer = window.setTimeout(() => {
      setBeatCount((value) => value + 1);
      if (countdown <= 1) { playPitchAtStep(step); setPracticeStatus('running'); }
      else setCountdown((value) => value - 1);
    }, beatDuration);
    return () => window.clearTimeout(timer);
  }, [beatDuration, countdown, playPitchAtStep, practicePaused, practiceStatus, step]);

  useEffect(() => {
    if (practiceStatus !== 'running' || practicePaused) return;
    const timer = window.setTimeout(() => {
      setBeatCount((value) => value + 1);
      if (step < fingers.length - 1) {
        setStep((value) => value + 1);
        return;
      }
      if (direction === 'salita') {
        setPendingDirection('discesa');
        setTurnaroundLeft(pauseBeats);
        setPracticeStatus(pauseBeats ? 'turnaround' : 'running');
        setDirection('discesa');
        setStep(0);
        return;
      }
      if (currentRepetition < repetitions) {
        setCurrentRepetition((value) => value + 1);
        setPendingDirection('salita');
        setTurnaroundLeft(pauseBeats);
        setPracticeStatus(pauseBeats ? 'turnaround' : 'running');
        setDirection('salita');
        setStep(0);
      } else {
        setPracticeStatus('complete');
      }
    }, beatDuration);
    return () => window.clearTimeout(timer);
  }, [beatDuration, currentRepetition, direction, fingers.length, pauseBeats, practicePaused, practiceStatus, repetitions, step]);

  useEffect(() => {
    if (practiceStatus !== 'turnaround' || practicePaused) return;
    const timer = window.setTimeout(() => {
      setBeatCount((value) => value + 1);
      if (turnaroundLeft <= 1) {
        setDirection(pendingDirection);
        setStep(0);
        setPracticeStatus('running');
      } else setTurnaroundLeft((value) => value - 1);
    }, beatDuration);
    return () => window.clearTimeout(timer);
  }, [beatDuration, pendingDirection, practicePaused, practiceStatus, turnaroundLeft]);

  const startPractice = () => {
    unlockAudio();
    setPlaying(false); setDirection('salita'); setStep(0); setCurrentRepetition(1);
    setElapsedSeconds(0); setCountdown(4); setPracticePaused(false); setPracticeStatus('countdown');
  };
  const stopPractice = () => {
    setPracticeStatus('idle'); setPracticePaused(false); setDirection('salita'); setStep(0);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (practiceActive || verificationActive) return;
      if (event.target instanceof HTMLSelectElement) return;
      if (event.key === 'ArrowRight') setStep((current) => Math.min(current + 1, fingers.length - 1));
      if (event.key === 'ArrowLeft') setStep((current) => Math.max(current - 1, 0));
      if (event.code === 'Space') { event.preventDefault(); if (step === fingers.length - 1) setStep(0); setPlaying((current) => !current); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [fingers.length, practiceActive, step, verificationActive]);

  useEffect(() => {
    const context = document.modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(context.registerTool({
      name: 'select_arpeggio_lesson', title: 'Configura lezione di arpeggio',
      description: 'Seleziona tabella, accordo, mano e direzione nella modalità Studio arpeggi e torna alla prima nota.',
      inputSchema: { type: 'object', properties: { table: { type: 'string', enum: ARPEGGIO_TABLE_KEYS }, accordo: { type: 'string' }, hand: { type: 'string', enum: ['mano_destra', 'mano_sinistra'] }, direction: { type: 'string', enum: ['salita', 'discesa'] } }, required: ['table', 'accordo', 'hand', 'direction'], additionalProperties: false },
      annotations: { readOnlyHint: false, untrustedContentHint: false },
      execute(input) {
        const value = input as { table: ArpeggioTableKey; accordo: string; hand: Hand; direction: Direction };
        if (!data.tabelle[value.table]?.righe.some((item) => item.accordo === value.accordo)) throw new Error('Selezione non valida');
        setTableKey(value.table); setAccordo(value.accordo); setHand(value.hand); setDirection(value.direction); stopAndReset();
        return { selected: true, ...value };
      },
    }, { signal: lifecycle.signal })).catch(() => {});
    return () => lifecycle.abort();
  }, [data, stopAndReset]);

  const progress = ((step + 1) / fingers.length) * 100;

  return (
    <div className="space-y-5">
      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between xl:px-7">
          <div>
            <p className="eyebrow">Estensione</p>
            <p className="mt-1 text-sm text-stone-600"><strong className="text-moss-900">{row.accordo}</strong> · {tableKey.includes('minori') ? 'minore' : 'maggiore'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Modo">
              {(['maggiori', 'minori'] as const).map((value) => <button key={value} role="tab" aria-selected={tableKey.includes(value)} onClick={() => selectMode(value)} className={clsx('rounded-xl border px-5 py-2.5 text-sm font-semibold capitalize transition', tableKey.includes(value) ? 'border-moss-900 bg-moss-900 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-moss-500')}>{value}</button>)}
            </div>
            <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Estensione dell'arpeggio">
              {[false, true].map((twoOctaves) => {
                const active = tableKey.includes('2_ottave') === twoOctaves;
                return <button key={String(twoOctaves)} role="tab" aria-selected={active} onClick={() => selectOctaves(twoOctaves ? 2 : 1)} className={clsx('rounded-xl border px-5 py-2.5 text-sm font-semibold transition', active ? 'border-moss-900 bg-moss-900 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-moss-500')}>{twoOctaves ? '2 ottave' : '1 ottava'}</button>;
              })}
            </div>
          </div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-4 xl:p-7">
          <label className="grid gap-2 font-mono text-xs font-bold uppercase tracking-wide text-stone-500">Accordo<select className="control font-sans normal-case" value={accordo} onChange={(event) => selectAccordo(event.target.value)}>{table.righe.map((item) => <option key={item.accordo} value={item.accordo}>{item.accordo}</option>)}</select></label>
          <fieldset><legend className="mb-2 font-mono text-xs font-bold uppercase tracking-wide text-stone-500">Mano</legend><div className="grid grid-cols-2 gap-2">{(['mano_destra','mano_sinistra'] as Hand[]).map((value)=><button key={value} onClick={()=>setHand(value)} className={clsx('control',hand===value&&'border-moss-900 bg-moss-100 text-moss-900')}>{value==='mano_destra'?'Destra':'Sinistra'}</button>)}</div></fieldset>
          <fieldset><legend className="mb-2 font-mono text-xs font-bold uppercase tracking-wide text-stone-500">Direzione</legend><div className="grid grid-cols-2 gap-2">{(['salita','discesa'] as Direction[]).map((value)=><button key={value} onClick={()=>setDirection(value)} className={clsx('control capitalize',direction===value&&'border-moss-900 bg-moss-100 text-moss-900')}>{value}</button>)}</div></fieldset>
          <label className="grid gap-2 font-mono text-xs font-bold uppercase tracking-wide text-stone-500">Velocità<select className="control font-sans normal-case" value={speed} onChange={(event)=>setSpeed(Number(event.target.value))}>{speedOptions.map((option)=><option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-stone-200 p-4 sm:flex-row sm:items-center sm:justify-between xl:px-7">
          <p className="eyebrow">Pratica</p>
          <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Modalità di pratica">
            {([
              { value: 'libera' as const, label: 'Libera' },
              { value: 'metronomo' as const, label: 'Metronomo' },
              { value: 'verifica' as const, label: 'Verifica' },
            ]).map(({ value, label }) => {
              const isActive = practiceMode === value;
              return <button key={value} role="tab" aria-selected={isActive} disabled={anyModeActive && !isActive} onClick={() => setPracticeMode(value)} className={clsx('rounded-xl border px-4 py-2 text-sm font-semibold transition disabled:opacity-40', isActive ? 'border-moss-900 bg-moss-900 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-moss-500')}>{label}</button>;
            })}
          </div>
        </div>

        {practiceMode === 'libera' && <div className="p-5 xl:p-7">
          <p className="mb-4 text-sm text-stone-600">Scorri l&apos;arpeggio nota per nota con le frecce, oppure avvia la riproduzione automatica alla velocità scelta in alto.</p>
          <div className="flex flex-wrap items-center gap-2">
            <button className="control inline-flex items-center gap-2" onClick={stopAndReset}><RotateCcw className="h-4 w-4"/>Ricomincia</button>
            <button className="control grid h-11 w-11 place-items-center p-0 disabled:opacity-40" disabled={step===0} onClick={()=>{unlockAudio();setPlaying(false);setStep((current)=>Math.max(current-1,0))}} aria-label="Nota precedente"><ChevronLeft className="h-5 w-5"/></button>
            <button className="inline-flex h-11 min-w-32 items-center justify-center gap-2 rounded-xl bg-moss-900 px-5 font-semibold text-white transition hover:bg-moss-700" onClick={()=>{unlockAudio();if(playing){setPlaying(false);return}if(step===fingers.length-1)setStep(0);else playPitchAtStep(step);setPlaying(true)}}>{playing?<><Pause className="h-5 w-5"/>Pausa</>:<><Play className="h-5 w-5"/>Riproduci</>}</button>
            <button className="control grid h-11 w-11 place-items-center p-0 disabled:opacity-40" disabled={step===fingers.length-1} onClick={()=>{unlockAudio();setPlaying(false);setStep((current)=>Math.min(current+1,fingers.length-1))}} aria-label="Nota successiva"><ChevronRight className="h-5 w-5"/></button>
            <div className="relative" ref={volumeControlRef}>
              <button type="button" onClick={()=>setVolumePopoverOpen((open)=>!open)} aria-expanded={volumePopoverOpen} aria-label={`Volume, ${volume} per cento`} className="control grid h-11 w-11 place-items-center p-0">
                {volume === 0 ? <VolumeX className="h-5 w-5 text-stone-400"/> : volume < 60 ? <Volume1 className="h-5 w-5"/> : <Volume2 className="h-5 w-5"/>}
              </button>
              {volumePopoverOpen && <div role="dialog" aria-label="Livello del volume" className="absolute bottom-[calc(100%+8px)] left-1/2 z-30 w-48 -translate-x-1/2 rounded-xl border border-stone-300 bg-white p-4 shadow-xl">
                <div className="mb-2 flex items-center justify-between font-mono text-xs text-stone-500"><span>Volume</span><span className="font-semibold text-moss-900">{volume}%</span></div>
                <input type="range" min={0} max={100} step={5} value={volume} onChange={(event)=>setVolume(Number(event.target.value))} className="w-full accent-moss-900" aria-label="Livello del volume" />
              </div>}
            </div>
            <span className="ml-auto hidden font-mono text-xs text-stone-500 md:block">← → cambia nota · spazio avvia/pausa</span>
          </div>
        </div>}

        {practiceMode === 'metronomo' && <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center xl:p-7">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <span className={clsx('h-3 w-3 rounded-full transition-transform duration-150', beatCount % 2 ? 'scale-150 bg-brass-500' : 'bg-moss-300')} aria-hidden="true" />
              <span className="font-mono text-xs text-stone-500">{bpm} BPM</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="grid gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-stone-500">Metronomo<select className="control font-sans normal-case" value={bpm} disabled={practiceActive} onChange={(event) => setBpm(Number(event.target.value))}>{[50,60,72,84,96,108,120].map((value)=><option key={value} value={value}>{value} BPM</option>)}</select></label>
              <label className="grid gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-stone-500">Ripetizioni<select className="control font-sans normal-case" value={repetitions} disabled={practiceActive} onChange={(event) => setRepetitions(Number(event.target.value))}>{[1,3,5].map((value)=><option key={value} value={value}>{value}</option>)}</select></label>
              <label className="grid gap-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-stone-500">Pausa al giro<select className="control font-sans normal-case" value={pauseBeats} disabled={practiceActive} onChange={(event) => setPauseBeats(Number(event.target.value))}>{[0,1,2].map((value)=><option key={value} value={value}>{value} {value===1?'battito':'battiti'}</option>)}</select></label>
            </div>
          </div>
          <div className="min-w-56 rounded-2xl bg-moss-900 p-4 text-white">
            {practiceStatus === 'complete' ? <><p className="font-mono text-xs uppercase text-brass-100">Esercizio completato</p><p className="mt-2 text-2xl font-semibold">{Math.floor(elapsedSeconds/60)}:{String(elapsedSeconds%60).padStart(2,'0')}</p><button className="mt-3 w-full rounded-xl bg-white px-4 py-2 text-sm font-semibold text-moss-900" onClick={startPractice}>Ripeti</button></> : <><div className="flex items-center justify-between"><span className="font-mono text-xs text-moss-100">Ripetizione {currentRepetition}/{repetitions}</span><span className="font-mono text-xs text-moss-100">{Math.floor(elapsedSeconds/60)}:{String(elapsedSeconds%60).padStart(2,'0')}</span></div><p className="my-4 text-center text-2xl font-semibold">{practiceStatus==='countdown'?`Pronti: ${countdown}`:practiceStatus==='turnaround'?'Cambio direzione':practiceStatus==='running'?(practicePaused?'In pausa':direction):'Pronto'}</p><div className="flex gap-2">{practiceActive?<><button className="flex-1 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-moss-900" onClick={()=>setPracticePaused((value)=>!value)}>{practicePaused?'Riprendi':'Pausa'}</button><button className="grid h-10 w-10 place-items-center rounded-xl border border-moss-500" onClick={stopPractice} aria-label="Termina esercizio"><Square className="h-4 w-4"/></button></>:<button className="w-full rounded-xl bg-brass-500 px-4 py-2.5 font-semibold text-moss-950" onClick={startPractice}><Play className="mr-2 inline h-4 w-4"/>Inizia</button>}</div></>}
          </div>
        </div>}

        {practiceMode === 'verifica' && <div className="p-5 xl:p-7">
          <VerificationPanel notes={notes} step={step} scale={row.accordo} description={`${tableKey.includes('minori')?'minore':'maggiore'} · ${tableKey.includes('2_ottave')?'2 ottave':'1 ottava'} · ${hand==='mano_destra'?'mano destra':'mano sinistra'} · ${direction}`} disabled={false} onStepChange={(value)=>{lastPlayedStepRef.current=value;setPlaying(false);setStep(value)}} onCorrectAnswer={playPitchAtStep} onActiveChange={(active)=>{if(active)unlockAudio();setVerificationActive(active)}} historyKey="arpeggio-verification-history" />
        </div>}
      </section>

      <section className="surface overflow-hidden">
        <div className="p-5 xl:p-8">
          <div className="min-w-0">
            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-stone-200"><div className="h-full rounded-full bg-brass-500 transition-all duration-300" style={{ width: `${progress}%` }}/></div>
            <div className="overflow-x-auto pb-3"><div className="grid min-w-max gap-1.5" style={{gridTemplateColumns:`repeat(${fingers.length},${fingers.length>8?44:56}px)`}}>{fingers.map((finger,index)=><button key={index} disabled={structuredModeActive} onClick={()=>{unlockAudio();setPlaying(false);playPitchAtStep(index);setStep(index)}} aria-label={`Passo ${index+1}: ${notes[index]}, dito ${finger}`} className={clsx('rounded-xl border p-1.5 text-center transition disabled:opacity-60',index===step?'border-brass-500 bg-brass-100 shadow-sm':index<step?'border-moss-100 bg-moss-50':'border-stone-200 bg-white')}><span className="block truncate font-mono text-[10px] text-stone-500">{notes[index]}</span><span className={clsx('mx-auto mt-1 grid h-7 w-7 place-items-center rounded-full font-mono text-sm font-bold',index===step?'bg-moss-900 text-white':'bg-stone-100 text-stone-600')}>{finger}</span></button>)}</div></div>
          </div>
        </div>
        <div className="border-t border-stone-200 px-5 pb-6 xl:px-8 xl:pb-8">
          <PianoKeyboard notes={notes} fingers={fingers} step={step} direction={direction} hand={hand} onStepSelect={(index) => { if (!structuredModeActive) { unlockAudio(); setPlaying(false); playPitchAtStep(index); setStep(index); } }} />
        </div>
      </section>
    </div>
  );
}
