import type { TableKey } from './definitions';

export type FingeringHand = 'mano_destra' | 'mano_sinistra';
export type FingeringDirection = 'salita' | 'discesa';
export type FingeringVariant = {
  title: string;
  note: string;
  sequences?: Partial<Record<`${FingeringHand}_${FingeringDirection}`, number[]>>;
};

export const FINGERING_ALTERNATIVES: Partial<Record<TableKey, Record<string, FingeringVariant>>> = {
  scale_maggiori_1_ottava: {
    'Si♭': {
      title: 'Si♭ maggiore · 1 ottava · mano destra',
      sequences: {
        mano_destra_salita: [4, 1, 2, 3, 1, 2, 3, 4],
        mano_destra_discesa: [4, 3, 2, 1, 3, 2, 1, 4],
      },
      note: 'Il file di osservazioni indica che la scala può iniziare con il dito 2, come in tabella, oppure con il dito 4. È importante scegliere una variante coerente e mantenerla nelle ripetizioni.',
    },
  },
  scale_minori_naturali_1_ottava: {
    'Mi♭': {
      title: 'Mi♭ minore naturale · 1 ottava',
      note: 'Il file di osservazioni segnala che, nelle scale che iniziano su un tasto nero, sono possibili scelte analoghe per il primo e l’ultimo dito, ma non fornisce una sequenza alternativa completa per questa scala.',
    },
  },
};

export function hasFingeringAlternative(mode: 'maggiori' | 'minori_naturali', octaves: 1 | 2, scale: string) {
  const tableKey: TableKey = mode === 'maggiori'
    ? (octaves === 2 ? 'scale_maggiori_2_o_piu_ottave' : 'scale_maggiori_1_ottava')
    : (octaves === 2 ? 'scale_minori_naturali_2_o_piu_ottave' : 'scale_minori_naturali_1_ottava');
  return Boolean(FINGERING_ALTERNATIVES[tableKey]?.[scale]?.sequences);
}
