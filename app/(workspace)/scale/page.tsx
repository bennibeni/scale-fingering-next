import FingeringExplorer from '@/components/scale/FingeringExplorer';
import { fingeringData, getDatasetSummary } from '@/app/lib/fingering-data';

export const metadata = { title: 'Scale' };
export default function ScalePage() {
  const summary = getDatasetSummary();
  return <div className="mx-auto max-w-[1500px]"><header className="mb-8 flex flex-col gap-5 border-b border-stone-300 pb-7 lg:flex-row lg:items-end lg:justify-between"><div><p className="eyebrow mb-3">Archivio delle diteggiature</p><h1 className="page-title">Consulta le scale</h1><p className="mt-4 max-w-2xl text-stone-600">Confronta salita e discesa, mano destra e mano sinistra, su una o più ottave.</p></div><div className="flex gap-2"><span className="rounded-xl border border-moss-500/40 bg-moss-50 px-4 py-3 text-sm"><b>{summary.tables}</b> tabelle</span><span className="rounded-xl border border-moss-500/40 bg-moss-50 px-4 py-3 text-sm"><b>{summary.rows}</b> scale</span></div></header><FingeringExplorer data={fingeringData}/></div>;
}
