import StudyPanel from '@/components/studio/StudyPanel';
import { fingeringData } from '@/app/lib/fingering-data';
export const metadata={title:'Studio scale'};
export default function StudioPage(){return <div className="mx-auto max-w-[1500px]"><header className="mb-8 border-b border-stone-300 pb-7"><p className="eyebrow mb-3">Modalità guidata</p><h1 className="page-title">Studia una scala</h1><p className="mt-4 max-w-2xl text-stone-600">Scegli una delle quattro tabelle, percorri la scala nota per nota e osserva il dito corretto. Tre modalità di pratica — libera, metronomo, verifica — con audio.</p></header><StudyPanel data={fingeringData}/></div>}
