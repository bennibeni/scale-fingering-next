import rawData from '@/public/data/diteggiature_scale_pianoforte.json';
import { TABLE_KEYS, type FingeringDataset, type FingeringTable, type ScaleRow, type TableKey } from './definitions';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
function expect(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function fingers(value: unknown, context: string) { expect(Array.isArray(value) && value.length > 0 && value.every((n) => Number.isInteger(n) && Number(n) >= 1 && Number(n) <= 5), `${context}: diteggiatura non valida`); return value.map(Number); }
function row(value: unknown, context: string): ScaleRow {
  expect(isObject(value) && typeof value.scala === 'string', `${context}: riga non valida`);
  const result: ScaleRow = { scala: value.scala, mano_destra_salita: fingers(value.mano_destra_salita, context), mano_sinistra_salita: fingers(value.mano_sinistra_salita, context), mano_destra_discesa: fingers(value.mano_destra_discesa, context), mano_sinistra_discesa: fingers(value.mano_sinistra_discesa, context) };
  if (Array.isArray(value.note_salita)) result.note_salita = value.note_salita.map(String);
  if (Array.isArray(value.note_discesa)) result.note_discesa = value.note_discesa.map(String);
  if (typeof value.estensione === 'string') result.estensione = value.estensione;
  if (typeof value.nota === 'string') result.nota = value.nota;
  const length = result.note_salita?.length ?? result.mano_destra_salita.length;
  expect([result.mano_destra_salita,result.mano_sinistra_salita,result.mano_destra_discesa,result.mano_sinistra_discesa].every((list) => list.length === length), `${context}: lunghezze incoerenti`);
  expect(!result.note_discesa || result.note_discesa.length === length, `${context}: note_discesa di lunghezza incoerente`);
  return result;
}
function table(value: unknown, key: string): FingeringTable {
  expect(isObject(value) && Array.isArray(value.righe) && value.righe.length === 12, `${key}: tabella non valida`);
  return { foglio_origine: String(value.foglio_origine ?? ''), titolo: String(value.titolo ?? key), descrizione: String(value.descrizione ?? ''), colonne_originali: Array.isArray(value.colonne_originali) ? value.colonne_originali.map(String) : [], righe: value.righe.map((item,index) => row(item, `${key} riga ${index+1}`)), nota: String(value.nota ?? ''), fonti: Array.isArray(value.fonti) ? value.fonti.map(String) : [] };
}
function parse(value: unknown): FingeringDataset {
  expect(isObject(value), 'Dataset non valido');
  const rawTables = value.tabelle;
  expect(isObject(rawTables), 'Dataset non valido');
  const tables = Object.fromEntries(TABLE_KEYS.map((key) => [key, table(rawTables[key], key)])) as FingeringDataset['tabelle'];
  return { nome: String(value.nome ?? ''), convenzione_dita: isObject(value.convenzione_dita) ? Object.fromEntries(Object.entries(value.convenzione_dita).map(([k,v])=>[k,String(v)])) : {}, abbreviazioni: isObject(value.abbreviazioni) ? Object.fromEntries(Object.entries(value.abbreviazioni).map(([k,v])=>[k,String(v)])) : {}, avvertenza: String(value.avvertenza ?? ''), tabelle: tables };
}
export const fingeringData = parse(rawData);
export const getDatasetSummary = () => ({ tables: TABLE_KEYS.length, rows: TABLE_KEYS.reduce((sum,key)=>sum+fingeringData.tabelle[key].righe.length,0), sources: new Set(TABLE_KEYS.flatMap((key)=>fingeringData.tabelle[key].fonti)).size });

export type ScaleUnverifiedNote = { tableKey: TableKey; tableTitle: string; scala: string; nota: string };

// Stesso principio degli arpeggi: estratto live dai campi "nota" del JSON, non una lista
// scritta a mano altrove.
export function getUnverifiedScaleNotes(dataset: FingeringDataset = fingeringData): ScaleUnverifiedNote[] {
  return TABLE_KEYS.flatMap((tableKey) => {
    const t = dataset.tabelle[tableKey];
    return t.righe.filter((r) => r.nota).map((r) => ({ tableKey, tableTitle: t.titolo, scala: r.scala, nota: r.nota! }));
  });
}
