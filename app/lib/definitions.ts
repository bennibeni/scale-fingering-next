export const TABLE_KEYS = ['scale_maggiori_1_ottava','scale_maggiori_2_o_piu_ottave','scale_minori_naturali_1_ottava','scale_minori_naturali_2_o_piu_ottave','scale_minori_armoniche_1_ottava','scale_minori_armoniche_2_o_piu_ottave','scale_minori_melodiche_1_ottava','scale_minori_melodiche_2_o_piu_ottave'] as const;
export type TableKey = (typeof TABLE_KEYS)[number];
// note_discesa è presente solo dove le note in discesa non sono il semplice contrario di
// quelle in salita (minore melodica: scende come la naturale, non come è salita). Quando è
// assente, chi consuma i dati deve ricavarla invertendo note_salita, come sempre fatto finora.
export type ScaleRow = { scala: string; note_salita?: string[]; note_discesa?: string[]; estensione?: string; mano_destra_salita: number[]; mano_sinistra_salita: number[]; mano_destra_discesa: number[]; mano_sinistra_discesa: number[]; nota?: string };
export type FingeringTable = { foglio_origine: string; titolo: string; descrizione: string; colonne_originali: string[]; righe: ScaleRow[]; nota: string; fonti: string[] };
export type FingeringDataset = { nome: string; convenzione_dita: Record<string,string>; abbreviazioni: Record<string,string>; avvertenza: string; tabelle: Record<TableKey,FingeringTable> };
