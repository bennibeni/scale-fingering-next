// Stessa forma di app/lib/definitions.ts (le tabelle delle scale), ma per gli arpeggi:
// tenerle separate perché la riga di un arpeggio non ha bisogno di "estensione" (le note ci
// sono sempre) e il numero di note per riga è diverso (4 per un'ottava, 7 per due).

export const ARPEGGIO_TABLE_KEYS = [
  'arpeggi_maggiori_1_ottava',
  'arpeggi_maggiori_2_ottave',
  'arpeggi_minori_1_ottava',
  'arpeggi_minori_2_ottave',
] as const;
export type ArpeggioTableKey = (typeof ARPEGGIO_TABLE_KEYS)[number];

export type ArpeggioRow = {
  accordo: string;
  note_salita: string[];
  mano_destra_salita: number[];
  mano_sinistra_salita: number[];
  mano_destra_discesa: number[];
  mano_sinistra_discesa: number[];
  // Presente solo sulle voci con un conflitto tra le fonti o un punto da verificare
  // (vedi l'avvertenza del dataset) — va mostrata all'utente, non ignorata silenziosamente.
  nota?: string;
};

export type ArpeggioTable = {
  foglio_origine: string;
  titolo: string;
  descrizione: string;
  colonne_originali: string[];
  righe: ArpeggioRow[];
  nota: string;
  fonti: string[];
};

export type ArpeggioDataset = {
  nome: string;
  convenzione_dita: Record<string, string>;
  abbreviazioni: Record<string, string>;
  avvertenza: string;
  tabelle: Record<ArpeggioTableKey, ArpeggioTable>;
};
