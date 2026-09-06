'use client';

import clsx from 'clsx';
import { AlertTriangle, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { type FingeringDataset, type ScaleRow, type TableKey } from '@/app/lib/definitions';
import { FINGERING_ALTERNATIVES } from '@/app/lib/fingering-alternatives';
import { getUnverifiedScaleNotes } from '@/app/lib/fingering-data';
import { PRACTICE_SELECTION_EVENT, practiceSelectionHref, readPracticeSelection, savePracticeSelection, type FingeringVariantSelection, type PracticeSelection, type ScaleMode } from '@/app/lib/practice-selection';

type MinorType = 'naturale' | 'armonica' | 'melodica';
const sequence = (values: number[]) => values.join('–');
const tableKeyFor = (mode: ScaleMode, twoOctaves: boolean, minorType: MinorType): TableKey => {
  if (mode === 'maggiori') return twoOctaves ? 'scale_maggiori_2_o_piu_ottave' : 'scale_maggiori_1_ottava';
  if (minorType === 'armonica') return twoOctaves ? 'scale_minori_armoniche_2_o_piu_ottave' : 'scale_minori_armoniche_1_ottava';
  if (minorType === 'melodica') return twoOctaves ? 'scale_minori_melodiche_2_o_piu_ottave' : 'scale_minori_melodiche_1_ottava';
  return twoOctaves ? 'scale_minori_naturali_2_o_piu_ottave' : 'scale_minori_naturali_1_ottava';
};

// Gruppo di diteggiatura, calcolato dai dati stessi (non da un elenco scritto a mano): si
// individua lo schema più comune nella tabella (mano destra + mano sinistra) e si confronta
// ogni scala con quello schema. Le lettere corrispondono anche a un ordine di difficoltà
// crescente, quindi non serve un'indicazione separata:
// A = diteggiatura identica allo schema comune a entrambe le mani (la più facile/frequente)
// B = una sola mano coincide con lo schema comune, l'altra è specifica di quella scala
// C = diteggiatura specifica in entrambe le mani (la più impegnativa da imparare)
type FingeringGroup = 'A' | 'B' | 'C';
function computeFingeringGroups(rows: ScaleRow[]): Record<string, FingeringGroup> {
  const sameSequence = (a: number[], b: number[]) => a.length === b.length && a.every((value, index) => value === b[index]);
  const counts = new Map<string, { rh: number[]; lh: number[]; count: number }>();
  for (const row of rows) {
    const key = `${row.mano_destra_salita.join(',')}|${row.mano_sinistra_salita.join(',')}`;
    const entry = counts.get(key);
    if (entry) entry.count += 1;
    else counts.set(key, { rh: row.mano_destra_salita, lh: row.mano_sinistra_salita, count: 1 });
  }
  let common = { rh: rows[0]?.mano_destra_salita ?? [], lh: rows[0]?.mano_sinistra_salita ?? [], count: -1 };
  for (const entry of counts.values()) if (entry.count > common.count) common = entry;

  const groups: Record<string, FingeringGroup> = {};
  for (const row of rows) {
    const rhMatches = sameSequence(row.mano_destra_salita, common.rh);
    const lhMatches = sameSequence(row.mano_sinistra_salita, common.lh);
    groups[row.scala] = rhMatches && lhMatches ? 'A' : rhMatches || lhMatches ? 'B' : 'C';
  }
  return groups;
}
const GROUP_STYLES: Record<FingeringGroup, string> = {
  A: 'bg-moss-100 text-moss-700',
  B: 'bg-brass-100 text-brass-700',
  C: 'bg-red-100 text-red-700',
};
const GROUP_RULES: Record<FingeringGroup, string> = {
  A: 'Gruppo A — schema comune\nDiteggiatura standard: il pollice (1) parte sempre dalla tonica in entrambe le mani. Nessuna nota vicina all\u2019inizio cade su un tasto nero, quindi la posizione di partenza non cambia mai.',
  B: 'Gruppo B — una mano diversa\nUna mano segue lo schema comune, l\u2019altra ha una diteggiatura propria per questa scala: qui il pollice dovrebbe cadere su un tasto nero, quindi in una sola mano si sposta il punto in cui le dita si incrociano per restare sui tasti bianchi.',
  C: 'Gruppo C — entrambe diverse\nDiteggiatura specifica in entrambe le mani: la tonica di questa scala è (o è vicina a) un tasto nero, quindi né la mano destra né la sinistra possono partire con il pollice nel modo consueto.',
};

export default function FingeringExplorer({ data }: { data: FingeringDataset }) {
  const router = useRouter();
  const [mode, setMode] = useState<ScaleMode>('maggiori');
  const [octaves, setOctaves] = useState<1 | 2>(1);
  // Non persistita insieme al resto della selezione (URL/localStorage): è una scelta locale
  // a questa pagina, irrilevante quando il modo è "maggiori". Studio e Verifica continuano a
  // usare solo la minore naturale finché non si decide di estenderli anche a questa.
  const [minorType, setMinorType] = useState<MinorType>('naturale');
  const [selectedScale, setSelectedScale] = useState('Do');
  const [variant, setVariant] = useState<FingeringVariantSelection>('principale');
  const [infoOpen, setInfoOpen] = useState(false);
  const active = tableKeyFor(mode, octaves === 2, minorType);
  const table = data.tabelle[active];
  const notes = Boolean(table.righe[0]?.note_salita);
  // Solo la melodica ha note in discesa diverse da quelle in salita (sale con 6°/7° alzati,
  // scende come la naturale): quando questo campo è presente serve una colonna in più,
  // altrimenti la discesa si è sempre potuta dedurre invertendo la salita.
  const hasSeparateDescending = Boolean(table.righe[0]?.note_discesa);
  const alternative = FINGERING_ALTERNATIVES[active]?.[selectedScale];
  const fingeringGroups = useMemo(() => computeFingeringGroups(table.righe), [table]);
  const unverified = useMemo(() => getUnverifiedScaleNotes(data).filter((item) => item.tableKey === active), [data, active]);

  useEffect(() => {
    const applySelection = (selection: PracticeSelection) => {
      setMode(selection.mode);
      setOctaves(selection.octaves);
      setSelectedScale(selection.scale);
      setVariant(selection.variant);
      setInfoOpen(false);
    };
    applySelection(readPracticeSelection());
    const update = (event: Event) => applySelection((event as CustomEvent<PracticeSelection>).detail);
    window.addEventListener(PRACTICE_SELECTION_EVENT, update);
    return () => window.removeEventListener(PRACTICE_SELECTION_EVENT, update);
  }, []);

  const displayedFingers = (scaleRow: ScaleRow, key: 'mano_destra_salita'|'mano_sinistra_salita'|'mano_destra_discesa'|'mano_sinistra_discesa') => variant === 'alternativa' && scaleRow.scala === selectedScale ? alternative?.sequences?.[key] ?? scaleRow[key] : scaleRow[key];
  const selectOctaves = (nextOctaves: 1 | 2) => {
    setOctaves(nextOctaves);
    const selection: PracticeSelection = { scale: selectedScale, mode, octaves: nextOctaves, variant };
    savePracticeSelection(selection);
    router.replace(practiceSelectionHref('/scale', selection), { scroll: false });
  };
  const selectVariant = (nextVariant: FingeringVariantSelection) => {
    const selection: PracticeSelection = { scale: selectedScale, mode, octaves, variant: nextVariant };
    savePracticeSelection(selection);
    router.replace(practiceSelectionHref('/scale', selection), { scroll: false });
  };
  return (
    <>
      <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-stone-300 bg-white/55 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Estensione</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-stone-600">
            <span><strong className="text-moss-900">{selectedScale}</strong> {mode === 'maggiori' && '· maggiore'}</span>
            {mode !== 'maggiori' && <div className="inline-flex rounded-lg border border-stone-300 bg-white p-0.5" role="tablist" aria-label="Forma della scala minore">
              {(['naturale', 'armonica', 'melodica'] as const).map((value) => <button key={value} role="tab" aria-selected={minorType === value} onClick={() => setMinorType(value)} className={clsx('rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition', minorType === value ? 'bg-moss-900 text-white' : 'text-stone-600 hover:bg-stone-100')}>{value}</button>)}
            </div>}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Estensione della scala">
          {[false, true].map((twoOctaves) => {
            const isActive = active.includes('2_o_piu_ottave') === twoOctaves;
            return <button key={String(twoOctaves)} role="tab" aria-selected={isActive} onClick={() => selectOctaves(twoOctaves ? 2 : 1)} className={clsx('rounded-xl border px-5 py-2.5 text-sm font-semibold transition', isActive ? 'border-moss-900 bg-moss-900 text-white' : 'border-stone-300 bg-white text-stone-600 hover:border-moss-500')}>{twoOctaves ? '2 ottave' : '1 ottava'}</button>;
          })}
        </div>
      </div>

      {unverified.length > 0 && <div className="mb-4 rounded-2xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 shrink-0" />Punti da verificare in questa tabella ({unverified.length})</div>
        <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">
          {unverified.map((item, index) => <li key={index}><b>{item.scala}</b>: {item.nota}</li>)}
        </ul>
      </div>}
      <section className="surface overflow-hidden">
        <div className="flex flex-col gap-5 border-b border-stone-200 px-5 py-6 lg:flex-row lg:items-end lg:justify-between lg:px-7">
          <div><p className="eyebrow mb-2">{table.foglio_origine}</p><h2 className="whitespace-nowrap font-sans text-xl font-semibold tracking-[-0.025em] sm:text-2xl md:text-3xl">{table.titolo}</h2><p className="mt-2 text-sm text-stone-600">{table.descrizione}</p></div>
          <div className="flex flex-col items-start gap-2 lg:items-end">
            <div className="flex flex-wrap gap-1.5">{Object.entries(data.convenzione_dita).map(([n,label])=><span key={n} className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs text-stone-600"><b className="text-moss-900">{n}</b> {label}</span>)}</div>
            <div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-wide text-stone-500">
              <span>Gruppo diteggiatura:</span>
              {(['A','B','C'] as const).map((g)=><span key={g} className="inline-flex items-center gap-1"><span className={clsx('inline-flex h-4 w-4 items-center justify-center rounded-full font-bold',GROUP_STYLES[g])} title={GROUP_RULES[g]}>{g}</span>{g==='A'?'schema comune':g==='B'?'una mano diversa':'entrambe diverse'}</span>)}
            </div>
          </div>
        </div>
        <div className="hidden lg:block"><table className="w-full border-collapse table-fixed"><colgroup>{hasSeparateDescending?<><col className="w-[10%]"/><col className="w-[14%]"/><col className="w-[14%]"/><col className="w-[15.5%]"/><col className="w-[15.5%]"/><col className="w-[15.5%]"/><col className="w-[15.5%]"/></>:notes?<><col className="w-[12%]"/><col className="w-[27%]"/><col className="w-[15.25%]"/><col className="w-[15.25%]"/><col className="w-[15.25%]"/><col className="w-[15.25%]"/></>:<><col className="w-[11%]"/><col className="w-[9%]"/><col className="w-[20%]"/><col className="w-[20%]"/><col className="w-[20%]"/><col className="w-[20%]"/></>}</colgroup><thead><tr className="bg-moss-700 text-left font-mono text-[11px] uppercase tracking-[.08em] text-white"><th className="px-4 py-3.5">Scala</th><th className="px-4 py-3.5">{notes?'Note in salita':'Estensione'}</th>{hasSeparateDescending&&<th className="px-4 py-3.5">Note in discesa</th>}<th className="px-4 py-3.5">MD salita</th><th className="px-4 py-3.5">MS salita</th><th className="px-4 py-3.5">MD discesa</th><th className="px-4 py-3.5">MS discesa</th></tr></thead><tbody>{table.righe.map((r)=><tr key={r.scala} aria-current={r.scala === selectedScale ? 'true' : undefined} className={clsx('border-b border-stone-200 transition hover:bg-moss-50', r.scala === selectedScale && 'bg-brass-100/70 shadow-[inset_4px_0_0_#b48b46]')}><th scope="row" className="px-4 py-3.5 text-left"><div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold text-moss-900">{r.scala}</span><span className={clsx('inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-bold',GROUP_STYLES[fingeringGroups[r.scala]] ?? 'bg-stone-100 text-stone-500')} title={fingeringGroups[r.scala] ? GROUP_RULES[fingeringGroups[r.scala]] : 'Gruppo non determinato'}>{fingeringGroups[r.scala] ?? '?'}</span>{r.nota && <span title={r.nota} className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" /></span>}{r.scala === selectedScale && <span className="rounded-full bg-brass-500 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-moss-950">{variant==='alternativa'?'alternativa attiva':'selezionata'}</span>}</div></th><td className="break-words px-4 py-3.5 text-sm text-stone-500">{r.note_salita?.join(' · ')??r.estensione}</td>{hasSeparateDescending&&<td className="break-words px-4 py-3.5 text-sm text-stone-500">{r.note_discesa?.join(' · ')}</td>}<td className="break-words px-4 py-3.5 font-mono text-sm tabular-nums">{sequence(displayedFingers(r,'mano_destra_salita'))}</td><td className="break-words px-4 py-3.5 font-mono text-sm tabular-nums">{sequence(displayedFingers(r,'mano_sinistra_salita'))}</td><td className="break-words px-4 py-3.5 font-mono text-sm tabular-nums">{sequence(displayedFingers(r,'mano_destra_discesa'))}</td><td className="break-words px-4 py-3.5 font-mono text-sm tabular-nums">{sequence(displayedFingers(r,'mano_sinistra_discesa'))}</td></tr>)}</tbody></table></div>
        <div className="divide-y divide-stone-200 lg:hidden">{table.righe.map((r)=><div key={r.scala} className={clsx('p-4',r.scala===selectedScale&&'bg-brass-100/70 shadow-[inset_4px_0_0_#b48b46]')}><div className="flex flex-wrap items-center gap-2"><span className="text-lg font-semibold text-moss-900">{r.scala}</span><span className={clsx('inline-flex h-5 w-5 items-center justify-center rounded-full font-mono text-[11px] font-bold',GROUP_STYLES[fingeringGroups[r.scala]] ?? 'bg-stone-100 text-stone-500')} title={fingeringGroups[r.scala] ? GROUP_RULES[fingeringGroups[r.scala]] : 'Gruppo non determinato'}>{fingeringGroups[r.scala] ?? '?'}</span>{r.nota && <span title={r.nota} className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700"><AlertTriangle className="h-3 w-3" /></span>}{r.scala===selectedScale&&<span className="rounded-full bg-brass-500 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-moss-950">{variant==='alternativa'?'alternativa attiva':'selezionata'}</span>}</div><p className="mt-1 break-words text-sm text-stone-500">{notes?'Salita: ':''}{r.note_salita?.join(' · ')??r.estensione}</p>{hasSeparateDescending&&<p className="mt-0.5 break-words text-sm text-stone-500">Discesa: {r.note_discesa?.join(' · ')}</p>}<dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 sm:grid-cols-4">{([['MD salita','mano_destra_salita'],['MS salita','mano_sinistra_salita'],['MD discesa','mano_destra_discesa'],['MS discesa','mano_sinistra_discesa']] as const).map(([label,key])=><div key={key}><dt className="font-mono text-[10px] font-bold uppercase tracking-wide text-stone-400">{label}</dt><dd className="font-mono text-sm tabular-nums">{sequence(displayedFingers(r,key))}</dd></div>)}</dl></div>)}</div>
        <div className="relative flex items-center gap-3 bg-brass-100 px-5 py-4 text-sm leading-relaxed text-brass-700 lg:px-7">
          <div>
            <p>{table.nota.replace(' Le varianti accettate sono descritte nel file di osservazioni.', '')}</p>
            {mode === 'minori_naturali' && minorType === 'naturale' && octaves === 2 && <p className="mt-1.5">Per Sol♯ e Do♯, un&apos;altra fonte chiude la mano sinistra con il dito 2 invece di 3 sull&apos;ultima nota.</p>}
          </div>
          {alternative&&<>
            <button type="button" onClick={() => setInfoOpen((open) => !open)} aria-expanded={infoOpen} aria-label={`Informazioni sulle diteggiature alternative per ${selectedScale}`} className="ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-full border border-brass-500 bg-white text-brass-700 shadow-sm transition hover:bg-brass-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-moss-700"><Info className="h-4 w-4" /></button>
            {infoOpen&&<div role="tooltip" className="absolute bottom-[calc(100%-8px)] right-5 z-30 w-[min(360px,calc(100%-40px))] rounded-xl border border-stone-300 bg-white p-4 text-left text-xs leading-relaxed text-stone-600 shadow-xl lg:right-7">
              <p className="font-semibold text-moss-900">{alternative.title}</p>
              {alternative.sequences&&Object.entries(alternative.sequences).map(([key,fingers])=><p key={key} className="mt-2 rounded-lg bg-stone-100 px-3 py-2 font-mono text-[11px] text-moss-800">{key.endsWith('salita')?'Salita':'Discesa'} alternativa: {fingers.join('–')}</p>)}
              <p className="mt-2">{alternative.note}</p>
              {alternative.sequences&&<div className="mt-3 grid grid-cols-2 gap-1 rounded-xl border border-stone-200 bg-stone-50 p-1">{(['principale','alternativa'] as const).map((value)=><button key={value} type="button" aria-pressed={variant===value} onClick={()=>selectVariant(value)} className={clsx('rounded-lg px-2 py-1.5 font-semibold capitalize',variant===value?'bg-moss-900 text-white':'text-stone-600 hover:bg-white')}>{value}</button>)}</div>}
            </div>}
          </>}
        </div>
      </section>
    </>
  );
}
