import { readStorage, writeStorage } from './storage';

export type ArpeggioMode = 'maggiori' | 'minori';
export type ArpeggioPracticeSelection = { accordo: string; mode: ArpeggioMode; octaves: 1 | 2 };

export const ARPEGGIO_PRACTICE_SELECTION_EVENT = 'arpeggio-practice-selection-change';
export const DEFAULT_ARPEGGIO_PRACTICE_SELECTION: ArpeggioPracticeSelection = { accordo: 'Do', mode: 'maggiori', octaves: 1 };
const STORAGE_KEY = 'arpeggio-selection';
const parseSelection = (value: unknown): Partial<ArpeggioPracticeSelection> => (typeof value === 'object' && value !== null ? value as Partial<ArpeggioPracticeSelection> : {});

export function readArpeggioPracticeSelection(): ArpeggioPracticeSelection {
  const base = DEFAULT_ARPEGGIO_PRACTICE_SELECTION;
  if (typeof window === 'undefined') return base;

  const stored = readStorage(STORAGE_KEY, parseSelection) ?? {};
  const selection: ArpeggioPracticeSelection = {
    accordo: typeof stored.accordo === 'string' ? stored.accordo : base.accordo,
    mode: stored.mode === 'minori' ? 'minori' : stored.mode === 'maggiori' ? 'maggiori' : base.mode,
    octaves: stored.octaves === 2 ? 2 : stored.octaves === 1 ? 1 : base.octaves,
  };

  const params = new URLSearchParams(window.location.search);
  return {
    accordo: params.get('accordo') ?? selection.accordo,
    mode: params.get('modo') === 'minori' ? 'minori' : params.get('modo') === 'maggiori' ? 'maggiori' : selection.mode,
    octaves: params.get('ottave') === '2' ? 2 : params.get('ottave') === '1' ? 1 : selection.octaves,
  };
}

export function saveArpeggioPracticeSelection(selection: ArpeggioPracticeSelection) {
  writeStorage(STORAGE_KEY, selection);
  window.dispatchEvent(new CustomEvent<ArpeggioPracticeSelection>(ARPEGGIO_PRACTICE_SELECTION_EVENT, { detail: selection }));
}

export function arpeggioPracticeSelectionHref(pathname: string, selection: ArpeggioPracticeSelection) {
  const params = new URLSearchParams({ accordo: selection.accordo, modo: selection.mode, ottave: String(selection.octaves) });
  return `${pathname}?${params.toString()}`;
}
