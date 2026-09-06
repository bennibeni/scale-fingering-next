'use client';

import clsx from 'clsx';
import { AlertTriangle, GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { type ArpeggioDataset, type ArpeggioTableKey } from '@/app/lib/arpeggio-definitions';
import { getUnverifiedNotes } from '@/app/lib/arpeggio-data';
import { ARPEGGIO_PRACTICE_SELECTION_EVENT, arpeggioPracticeSelectionHref, saveArpeggioPracticeSelection, type ArpeggioMode, type ArpeggioPracticeSelection, readArpeggioPracticeSelection } from '@/app/lib/arpeggio-practice-selection';

const sequence = (values: number[]) => values.join('–');
const tableKeyFor = (mode: ArpeggioMode, octaves: 1 | 2): ArpeggioTableKey => mode === 'maggiori'
  ? (octaves === 2 ? 'arpeggi_maggiori_2_ottave' : 'arpeggi_maggiori_1_ottava')
  : (octaves === 2 ? 'arpeggi_minori_2_ottave' : 'arpeggi_minori_1_ottava');

export default function ArpeggioExplorer({ data }: { data: ArpeggioDataset }) {
  const router = useRouter();
  const [mode, setMode] = useState<ArpeggioMode>('maggiori');
  const [octaves, setOctaves] = useState<1 | 2>(1);
  const [selectedAccordo, setSelectedAccordo] = useState('Do');
  const active = tableKeyFor(mode, octaves);
  const table = data.tabelle[active];
  const unverified = getUnverifiedNotes(data);

  useEffect(() => {
    const applySelection = (selection: ArpeggioPracticeSelection) => {
      setMode(selection.mode);
      setOctaves(selection.octaves);
      setSelectedAccordo(selection.accordo);
    };
    applySelection(readArpeggioPracticeSelection());
    const update = (event: Event) => applySelection((event as CustomEvent<ArpeggioPracticeSelection>).detail);
    window.addEventListener(ARPEGGIO_PRACTICE_SELECTION_EVENT, update);
    return () => window.removeEventListener(ARPEGGIO_PRACTICE_SELECTION_EVENT, update);
  }, []);

  const selectOctaves = (nextOctaves: 1 | 2) => {
    setOctaves(nextOctaves);
    saveArpeggioPracticeSelection({ accordo: selectedAccordo, mode, octaves: nextOctaves });
  };
  // Selezionare un accordo qui equivale a scegliere una scala nel Circle of Fifths della
  // sidebar: aggiorna la selezione condivisa e porta direttamente in Studio arpeggi a
  // esercitarsi, un solo click invece di selezionare e poi cercare il link in menu.
  const practiceAccordo = (accordo: string) => {
    const selection: ArpeggioPracticeSelection = { accordo, mode, octaves };
    setSelectedAccordo(accordo);
    saveArpeggioPracticeSelection(selection);
    router.push(arpeggioPracticeSelectionHref('/studio-arpeggi', selection));
  };

  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-300 bg-white/55 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="eyebrow">Estensione</p><p className="mt-1 text-sm text-stone-600">Arpeggio di triade, stato fondamentale · {mode === 'maggiori' ? 'maggiore' : 'minore'} <span className="text-stone-400">(cambia modo dal Circolo delle quinte)</span></p></div>
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Estensione dell'arpeggio">
          {([1, 2] as const).map((value) => <button key={value} role="tab" aria-selected={octaves === value} onClick={() => selectOctaves(value)} className={clsx('rounded-xl border px-5 py-2.5 text-sm font-semibold transition', octaves === value ? 'border-moss-900 bg-moss-900 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-moss-500')}>{value === 2 ? '2 ottave' : '1 ottava'}</button>)}
        </div>
      </div>

      {unverified.length > 0 && <div className="mb-4 rounded-2xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 shrink-0" />Punti da verificare in questo dataset ({unverified.length})</div>
        <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
          {unverified.map((item, index) => <li key={index}><b>{item.accordo}</b> ({item.tableTitle}): {item.nota}</li>)}
        </ul>
        <p className="mt-2 text-xs text-amber-700">Controllare questi punti prima di ogni nuova implementazione che si appoggia a questi dati (Studio, Verifica, esportazioni) e correggerli nel JSON quando confermati — l&apos;elenco sopra si aggiorna da solo.</p>
      </div>}

      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-stone-200 px-5 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-7">
          <div><p className="eyebrow mb-2">{table.foglio_origine}</p><h2 className="whitespace-nowrap font-sans text-xl font-semibold tracking-[-0.025em] sm:text-2xl md:text-3xl">{table.titolo}</h2><p className="mt-2 text-sm text-stone-600">{table.descrizione}</p></div>
          <div className="flex flex-wrap gap-1.5">{Object.entries(data.convenzione_dita).map(([n, label]) => <span key={n} className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs text-stone-600"><b className="text-moss-900">{n}</b> {label}</span>)}</div>
        </div>

        <div className="hidden lg:block"><table className="w-full border-collapse table-fixed"><colgroup><col className="w-[14%]" /><col className="w-[21%]" /><col className="w-[14.5%]" /><col className="w-[14.5%]" /><col className="w-[14.5%]" /><col className="w-[14.5%]" /><col className="w-[7%]" /></colgroup><thead><tr className="bg-moss-700 text-left font-mono text-[11px] uppercase tracking-[.08em] text-white"><th className="px-4 py-3.5">Accordo</th><th className="px-4 py-3.5">Note in salita</th><th className="px-4 py-3.5">MD salita</th><th className="px-4 py-3.5">MS salita</th><th className="px-4 py-3.5">MD discesa</th><th className="px-4 py-3.5">MS discesa</th><th className="px-4 py-3.5"/></tr></thead><tbody>{table.righe.map((r) => <tr key={r.accordo} aria-current={r.accordo === selectedAccordo ? 'true' : undefined} className={clsx('border-b border-stone-200 transition hover:bg-moss-50', r.accordo === selectedAccordo && 'bg-brass-100/70 shadow-[inset_4px_0_0_#b48b46]')}><th scope="row" className="px-4 py-3.5 text-left"><div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold text-moss-900">{r.accordo}</span>{r.nota && <span title={r.nota} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" /></span>}{r.accordo === selectedAccordo && <span className="rounded-full bg-brass-500 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-moss-950">selezionato</span>}</div></th><td className="break-words px-4 py-3.5 text-sm text-stone-500">{r.note_salita.join(' · ')}</td><td className="break-words px-4 py-3.5 font-mono text-sm tabular-nums">{sequence(r.mano_destra_salita)}</td><td className="break-words px-4 py-3.5 font-mono text-sm tabular-nums">{sequence(r.mano_sinistra_salita)}</td><td className="break-words px-4 py-3.5 font-mono text-sm tabular-nums">{sequence(r.mano_destra_discesa)}</td><td className="break-words px-4 py-3.5 font-mono text-sm tabular-nums">{sequence(r.mano_sinistra_discesa)}</td><td className="px-2 py-3.5 text-right"><button type="button" onClick={() => practiceAccordo(r.accordo)} aria-label={`Pratica l'arpeggio di ${r.accordo} in Studio arpeggi`} title="Pratica in Studio arpeggi" className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-moss-500 text-moss-700 transition hover:bg-moss-100"><GraduationCap className="h-4 w-4" /></button></td></tr>)}</tbody></table></div>

        <div className="divide-y divide-stone-200 lg:hidden">{table.righe.map((r) => <div key={r.accordo} className={clsx('p-4', r.accordo === selectedAccordo && 'bg-brass-100/70 shadow-[inset_4px_0_0_#b48b46]')}><div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold text-moss-900">{r.accordo}</span>{r.nota && <span title={r.nota} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" /></span>}{r.accordo === selectedAccordo && <span className="rounded-full bg-brass-500 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-moss-950">selezionato</span>}<button type="button" onClick={() => practiceAccordo(r.accordo)} className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-moss-500 px-3 py-1 text-xs font-semibold text-moss-700 transition hover:bg-moss-100"><GraduationCap className="h-3.5 w-3.5" />Pratica</button></div><p className="mt-1 break-words text-sm text-stone-500">{r.note_salita.join(' · ')}</p><dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">{([['MD salita', r.mano_destra_salita], ['MS salita', r.mano_sinistra_salita], ['MD discesa', r.mano_destra_discesa], ['MS discesa', r.mano_sinistra_discesa]] as const).map(([label, values]) => <div key={label}><dt className="font-mono text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</dt><dd className="font-mono text-sm tabular-nums">{sequence(values)}</dd></div>)}</dl></div>)}</div>

        <div className="bg-brass-100 px-5 py-4 text-sm leading-relaxed text-brass-700 lg:px-7"><p>{table.nota}</p></div>
      </section>
    </>
  );
}
