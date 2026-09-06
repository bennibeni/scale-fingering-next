import ArpeggioExplorer from '@/components/arpeggio/ArpeggioExplorer';
import { arpeggioData, getArpeggioDatasetSummary, getUnverifiedNotes } from '@/app/lib/arpeggio-data';

export const metadata = { title: 'Arpeggi' };
export default function ArpeggiPage() {
  const summary = getArpeggioDatasetSummary();
  const unverifiedCount = getUnverifiedNotes(arpeggioData).length;
  return <div className="mx-auto max-w-[1500px]">
    <header className="mb-8 flex flex-col gap-5 border-b border-stone-300 pb-7 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="eyebrow mb-3">Archivio delle diteggiature</p>
        <h1 className="page-title">Consulta gli arpeggi</h1>
        <p className="mt-4 max-w-2xl text-stone-600">Arpeggi di triade allo stato fondamentale, mani separate, maggiori e minori.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="rounded-xl border border-moss-500/40 bg-moss-50 px-4 py-3 text-sm"><b>{summary.tables}</b> tabelle</span>
        <span className="rounded-xl border border-moss-500/40 bg-moss-50 px-4 py-3 text-sm"><b>{summary.rows}</b> arpeggi</span>
        {unverifiedCount > 0 && <span className="rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-sm text-amber-800"><b>{unverifiedCount}</b> da verificare</span>}
      </div>
    </header>
    <ArpeggioExplorer data={arpeggioData} />
  </div>;
}
