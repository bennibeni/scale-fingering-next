import { AlertTriangle, CheckCircle2, Database, ExternalLink, FileJson2, Link2 } from 'lucide-react';
import { fingeringData, getDatasetSummary } from '@/app/lib/fingering-data';
import { arpeggioData, getArpeggioDatasetSummary, getUnverifiedNotes } from '@/app/lib/arpeggio-data';
export const metadata={title:'Dati'};
export default function DataPage(){
  const summary=getDatasetSummary();
  const arpeggioSummary=getArpeggioDatasetSummary();
  const unverified=getUnverifiedNotes(arpeggioData);
  const cards=[{label:'Tabelle riconosciute',value:summary.tables+arpeggioSummary.tables,icon:Database},{label:'Righe totali (scale + arpeggi)',value:summary.rows+arpeggioSummary.rows,icon:FileJson2},{label:'Fonti distinte',value:summary.sources+arpeggioSummary.sources,icon:Link2},{label:'Stato validazione',value:'Valido',icon:CheckCircle2}];
  const allSources=[...new Set([...Object.values(fingeringData.tabelle).flatMap((t)=>t.fonti),...Object.values(arpeggioData.tabelle).flatMap((t)=>t.fonti)])];
  const isUrl=(value:string)=>/^https?:\/\//.test(value);
  return <div className="mx-auto max-w-6xl">
    <header className="mb-8 border-b border-stone-300 pb-7"><p className="eyebrow mb-3">Diagnostica del dataset</p><h1 className="page-title">Dati interpretati</h1><p className="mt-4 max-w-2xl text-stone-600">I JSON di scale e arpeggi sono controllati all'avvio — tabelle, righe, dita e lunghezze devono essere coerenti — e restano interamente nel browser: nessun account, nessun collegamento a servizi esterni.</p></header>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({label,value,icon:Icon})=><article key={label} className="surface p-5"><Icon className="mb-8 h-6 w-6 text-moss-700"/><p className="text-sm text-stone-500">{label}</p><p className="mt-1 font-mono text-3xl font-semibold text-moss-900">{value}</p></article>)}</div>

    <section className="surface mt-5 p-6"><p className="eyebrow mb-3">Scale — avvertenza</p><p className="leading-relaxed text-stone-700">{fingeringData.avvertenza}</p><div className="mt-6 grid gap-3 md:grid-cols-2">{Object.entries(fingeringData.tabelle).map(([key,table])=><div key={key} className="rounded-xl border border-stone-200 bg-white/70 p-4"><strong className="block text-moss-900">{table.titolo}</strong><span className="mt-1 block font-mono text-sm text-stone-500">{table.righe.length} scale · {table.foglio_origine}</span></div>)}</div></section>

    <section className="surface mt-5 p-6"><p className="eyebrow mb-3">Arpeggi — avvertenza</p><p className="leading-relaxed text-stone-700">{arpeggioData.avvertenza}</p><div className="mt-6 grid gap-3 md:grid-cols-2">{Object.entries(arpeggioData.tabelle).map(([key,table])=><div key={key} className="rounded-xl border border-stone-200 bg-white/70 p-4"><strong className="block text-moss-900">{table.titolo}</strong><span className="mt-1 block font-mono text-sm text-stone-500">{table.righe.length} arpeggi · {table.foglio_origine}</span></div>)}</div>
      {unverified.length>0&&<div className="mt-6 rounded-xl border border-amber-400 bg-amber-50 p-4 text-sm text-amber-900">
        <div className="mb-2 flex items-center gap-2 font-semibold"><AlertTriangle className="h-4 w-4 shrink-0"/>Punti da verificare ({unverified.length})</div>
        <ul className="list-disc space-y-1.5 pl-5 leading-relaxed">{unverified.map((item,index)=><li key={index}><b>{item.accordo}</b> ({item.tableTitle}): {item.nota}</li>)}</ul>
      </div>}
    </section>

    <section className="surface mt-5 p-6">
      <p className="eyebrow mb-3">Fonti distinte ({allSources.length})</p>
      <ul className="grid gap-2 sm:grid-cols-2">{allSources.map((source)=><li key={source} className="rounded-xl border border-stone-200 bg-white/70 p-3 text-sm">
        {isUrl(source)
          ? <a href={source} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-moss-800 underline decoration-stone-300 underline-offset-2 hover:text-moss-900 hover:decoration-moss-500">{source}<ExternalLink className="h-3.5 w-3.5 shrink-0"/></a>
          : <span className="text-stone-600">{source}</span>}
      </li>)}</ul>
    </section>
  </div>;
}
