'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ARPEGGIO_PRACTICE_SELECTION_EVENT, arpeggioPracticeSelectionHref, DEFAULT_ARPEGGIO_PRACTICE_SELECTION, readArpeggioPracticeSelection, saveArpeggioPracticeSelection, type ArpeggioPracticeSelection } from '@/app/lib/arpeggio-practice-selection';
import { DEFAULT_PRACTICE_SELECTION, PRACTICE_SELECTION_EVENT, practiceSelectionHref, readPracticeSelection, savePracticeSelection, type PracticeSelection, type ScaleMode } from '@/app/lib/practice-selection';

// Le stesse 12 toniche funzionano identiche per scale e arpeggi (stesso circolo delle
// quinte): un solo widget, il contesto (pagina corrente) decide se il click aggiorna la
// selezione delle scale o quella degli arpeggi. Due posizioni (le enarmoniche in basso al
// cerchio) cambiano nome tra maggiore e minore nei dati stessi — Re♭ maggiore ma Do♯ minore,
// La♭ maggiore ma Sol♯ minore — quindi qui sono coppie [nome in maggiore, nome in minore]
// invece di un'unica stringa fissa.
const fifths: [string, string][] = [
  ['Do', 'Do'], ['Sol', 'Sol'], ['Re', 'Re'], ['La', 'La'], ['Mi', 'Mi'], ['Si', 'Si'],
  ['Fa♯', 'Fa♯'], ['Re♭', 'Do♯'], ['La♭', 'Sol♯'], ['Mi♭', 'Mi♭'], ['Si♭', 'Si♭'], ['Fa', 'Fa'],
];

export default function CircleOfFifths() {
  const pathname = usePathname();
  const router = useRouter();
  const isArpeggioContext = pathname === '/arpeggi' || pathname === '/studio-arpeggi';

  const [selection, setSelection] = useState<PracticeSelection>(DEFAULT_PRACTICE_SELECTION);
  const [arpeggioSelection, setArpeggioSelection] = useState<ArpeggioPracticeSelection>(DEFAULT_ARPEGGIO_PRACTICE_SELECTION);

  useEffect(() => {
    setSelection(readPracticeSelection());
    setArpeggioSelection(readArpeggioPracticeSelection());
    const update = (event: Event) => setSelection((event as CustomEvent<PracticeSelection>).detail);
    const updateArpeggio = (event: Event) => setArpeggioSelection((event as CustomEvent<ArpeggioPracticeSelection>).detail);
    window.addEventListener(PRACTICE_SELECTION_EVENT, update);
    window.addEventListener(ARPEGGIO_PRACTICE_SELECTION_EVENT, updateArpeggio);
    return () => {
      window.removeEventListener(PRACTICE_SELECTION_EVENT, update);
      window.removeEventListener(ARPEGGIO_PRACTICE_SELECTION_EVENT, updateArpeggio);
    };
  }, []);

  const mode: 'maggiori' | 'minori' = isArpeggioContext ? arpeggioSelection.mode : (selection.mode === 'maggiori' ? 'maggiori' : 'minori');
  const currentTonic = isArpeggioContext ? arpeggioSelection.accordo : selection.scale;
  const modeLabel = (value: 'maggiori' | 'minori') => value === 'maggiori' ? 'Maggiori' : 'Minori';

  const selectMode = (nextMode: 'maggiori' | 'minori') => {
    if (isArpeggioContext) {
      const next = { ...arpeggioSelection, mode: nextMode };
      saveArpeggioPracticeSelection(next);
      if (pathname === '/studio-arpeggi') router.replace(arpeggioPracticeSelectionHref(pathname, next), { scroll: false });
      return;
    }
    const next = { ...selection, mode: (nextMode === 'maggiori' ? 'maggiori' : 'minori_naturali') as ScaleMode };
    savePracticeSelection(next);
    if (pathname === '/studio' || pathname === '/scale') router.replace(practiceSelectionHref(pathname, next), { scroll: false });
  };

  const hrefFor = (note: string) => isArpeggioContext
    ? arpeggioPracticeSelectionHref(pathname === '/arpeggi' ? '/arpeggi' : '/studio-arpeggi', { ...arpeggioSelection, accordo: note })
    : practiceSelectionHref(pathname === '/scale' ? '/scale' : '/studio', { ...selection, scale: note });
  const onSelect = (note: string) => {
    if (isArpeggioContext) saveArpeggioPracticeSelection({ ...arpeggioSelection, accordo: note });
    else savePracticeSelection({ ...selection, scale: note });
  };

  return (
    <section className="mt-5" aria-labelledby="circle-title">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 id="circle-title" className="font-mono text-[10px] font-bold uppercase tracking-[.14em] text-stone-500">Circolo delle quinte</h2>
        <span className="font-mono text-[9px] font-bold text-brass-700">{modeLabel(mode)}</span>
      </div>
      <div className="relative mx-auto aspect-square w-[220px] rounded-full border border-stone-300 bg-white/45 shadow-inner">
        <div className="absolute inset-[40px] rounded-full border border-dashed border-brass-500/60" />
        <div className="absolute inset-1/2 z-20 grid h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 grid-rows-2 overflow-hidden rounded-full border-2 border-moss-900 bg-white shadow-sm" aria-label={isArpeggioContext ? 'Tipo di arpeggio' : 'Tipo di scala'}>
          {(['maggiori', 'minori'] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => selectMode(value)}
              aria-pressed={mode === value}
              className={clsx('px-1 font-mono text-[8px] font-bold uppercase leading-tight transition', mode === value ? 'bg-moss-900 text-white' : 'bg-[#f8f7f2] text-stone-500 hover:bg-moss-100')}
            >{modeLabel(value)}</button>
          ))}
        </div>
        {fifths.map(([majorNote, minorNote], index) => {
          const note = mode === 'maggiori' ? majorNote : minorNote;
          const angle = (index * 30 - 90) * Math.PI / 180;
          const left = (50 + Math.cos(angle) * 39).toFixed(3);
          const top = (50 + Math.sin(angle) * 39).toFixed(3);
          return (
            <Link
              key={index}
              href={hrefFor(note)}
              onClick={() => onSelect(note)}
              aria-current={currentTonic === note ? 'true' : undefined}
              className={clsx(
                'absolute z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border text-[11px] font-bold shadow-sm transition hover:z-20 hover:scale-110 focus-visible:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brass-500',
                currentTonic === note
                  ? 'scale-110 border-brass-600 bg-brass-500 text-moss-950 ring-4 ring-brass-100'
                  : 'border-stone-300 bg-[#f8f7f2] text-moss-900 hover:border-brass-500 hover:bg-brass-100',
              )}
              style={{ left: `${left}%`, top: `${top}%` }}
              aria-label={isArpeggioContext ? `Apri l'arpeggio ${mode === 'maggiori' ? 'maggiore' : 'minore'} di ${note}` : `Apri la scala ${mode === 'maggiori' ? 'maggiore' : 'minore naturale'} di ${note}`}
            >
              {note}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
