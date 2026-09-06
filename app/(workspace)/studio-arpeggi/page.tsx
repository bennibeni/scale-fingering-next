import ArpeggioStudyPanel from '@/components/arpeggio/ArpeggioStudyPanel';
import { arpeggioData } from '@/app/lib/arpeggio-data';
export const metadata={title:'Studio arpeggi'};
export default function StudioArpeggiPage(){return <div className="mx-auto max-w-[1500px]"><header className="mb-8 border-b border-stone-300 pb-7"><p className="eyebrow mb-3">Modalità guidata</p><h1 className="page-title">Studia un arpeggio</h1><p className="mt-4 max-w-2xl text-stone-600">Scegli maggiore o minore, 1 o 2 ottave, un accordo e una mano. Tre modalità di pratica — libera, metronomo, verifica — con audio.</p></header><ArpeggioStudyPanel data={arpeggioData}/></div>}
