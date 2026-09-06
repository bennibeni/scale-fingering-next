import rawData from '@/public/data/diteggiature_arpeggi_pianoforte.json';
import { ARPEGGIO_TABLE_KEYS, type ArpeggioDataset, type ArpeggioRow, type ArpeggioTable, type ArpeggioTableKey } from './arpeggio-definitions';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
function expect(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function fingers(value: unknown, context: string) { expect(Array.isArray(value) && value.length > 0 && value.every((n) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 5), `${context}: diteggiatura non valida`); return value.map(Number); }
function row(value: unknown, context: string): ArpeggioRow {
  expect(isObject(value) && typeof value.accordo === 'string' && Array.isArray(value.note_salita), `${context}: riga non valida`);
  const result: ArpeggioRow = {
    accordo: value.accordo,
    note_salita: value.note_salita.map(String),
    mano_destra_salita: fingers(value.mano_destra_salita, context),
    mano_sinistra_salita: fingers(value.mano_sinistra_salita, context),
    mano_destra_discesa: fingers(value.mano_destra_discesa, context),
    mano_sinistra_discesa: fingers(value.mano_sinistra_discesa, context),
  };
  if (typeof value.nota === 'string') result.nota = value.nota;
  const length = result.note_salita.length;
  expect([result.mano_destra_salita, result.mano_sinistra_salita, result.mano_destra_discesa, result.mano_sinistra_discesa].every((list) => list.length === length), `${context}: lunghezze incoerenti`);
  return result;
}
function table(value: unknown, key: string): ArpeggioTable {
  expect(isObject(value) && Array.isArray(value.righe) && value.righe.length === 12, `${key}: tabella non valida`);
  return { foglio_origine: String(value.foglio_origine ?? ''), titolo: String(value.titolo ?? key), descrizione: String(value.descrizione ?? ''), colonne_originali: Array.isArray(value.colonne_originali) ? value.colonne_originali.map(String) : [], righe: value.righe.map((item, index) => row(item, `${key} riga ${index + 1}`)), nota: String(value.nota ?? ''), fonti: Array.isArray(value.fonti) ? value.fonti.map(String) : [] };
}
function parse(value: unknown): ArpeggioDataset {
  expect(isObject(value), 'Dataset arpeggi non valido');
  const rawTables = value.tabelle;
  expect(isObject(rawTables), 'Dataset arpeggi non valido');
  const tables = Object.fromEntries(ARPEGGIO_TABLE_KEYS.map((key) => [key, table(rawTables[key], key)])) as ArpeggioDataset['tabelle'];
  return { nome: String(value.nome ?? ''), convenzione_dita: isObject(value.convenzione_dita) ? Object.fromEntries(Object.entries(value.convenzione_dita).map(([k, v]) => [k, String(v)])) : {}, abbreviazioni: isObject(value.abbreviazioni) ? Object.fromEntries(Object.entries(value.abbreviazioni).map(([k, v]) => [k, String(v)])) : {}, avvertenza: String(value.avvertenza ?? ''), tabelle: tables };
}
export const arpeggioData = parse(rawData);
export const getArpeggioDatasetSummary = () => ({ tables: ARPEGGIO_TABLE_KEYS.length, rows: ARPEGGIO_TABLE_KEYS.reduce((sum, key) => sum + arpeggioData.tabelle[key].righe.length, 0), sources: new Set(ARPEGGIO_TABLE_KEYS.flatMap((key) => arpeggioData.tabelle[key].fonti)).size });

export type UnverifiedNote = { tableKey: ArpeggioTableKey; tableTitle: string; accordo: string; nota: string };

// Estratto live dai campi "nota" del JSON, non una lista scritta a mano altrove: se una riga
// viene corretta e la sua "nota" rimossa, questo elenco (e quindi il banner che lo mostra)
// si aggiorna da solo al prossimo caricamento dei dati, senza bisogno di ricordarsi di
// aggiornare due posti in codice.
export function getUnverifiedNotes(dataset: ArpeggioDataset = arpeggioData): UnverifiedNote[] {
  return ARPEGGIO_TABLE_KEYS.flatMap((tableKey) => {
    const t = dataset.tabelle[tableKey];
    return t.righe.filter((r) => r.nota).map((r) => ({ tableKey, tableTitle: t.titolo, accordo: r.accordo, nota: r.nota! }));
  });
}
