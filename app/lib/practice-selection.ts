import { hasFingeringAlternative } from './fingering-alternatives';
import { readStorage, writeStorage } from './storage';

export type ScaleMode = 'maggiori' | 'minori_naturali';
export type FingeringVariantSelection = 'principale' | 'alternativa';
export type PracticeSelection = { scale: string; mode: ScaleMode; octaves: 1 | 2; variant: FingeringVariantSelection };

export const PRACTICE_SELECTION_EVENT = 'practice-selection-change';
export const DEFAULT_PRACTICE_SELECTION: PracticeSelection = { scale: 'Do', mode: 'maggiori', octaves: 1, variant: 'principale' };
const STORAGE_KEY = 'selection';
const parseSelection = (value: unknown): Partial<PracticeSelection> => (typeof value === 'object' && value !== null ? value as Partial<PracticeSelection> : {});

export function readPracticeSelection(): PracticeSelection {
  const base = DEFAULT_PRACTICE_SELECTION;
  if (typeof window === 'undefined') return base;

  const stored = readStorage(STORAGE_KEY, parseSelection) ?? {};
  const selection: PracticeSelection = {
    scale: typeof stored.scale === 'string' ? stored.scale : base.scale,
    mode: stored.mode === 'minori_naturali' ? 'minori_naturali' : stored.mode === 'maggiori' ? 'maggiori' : base.mode,
    octaves: stored.octaves === 2 ? 2 : stored.octaves === 1 ? 1 : base.octaves,
    variant: stored.variant === 'alternativa' ? 'alternativa' : 'principale',
  };

  const params = new URLSearchParams(window.location.search);
  const result: PracticeSelection = {
    scale: params.get('scala') ?? selection.scale,
    mode: params.get('modo') === 'minori_naturali' ? 'minori_naturali' : params.get('modo') === 'maggiori' ? 'maggiori' : selection.mode,
    octaves: params.get('ottave') === '2' ? 2 : params.get('ottave') === '1' ? 1 : selection.octaves,
    variant: params.get('variante') === 'alternativa' ? 'alternativa' : params.get('variante') === 'principale' ? 'principale' : selection.variant,
  };
  if (!hasFingeringAlternative(result.mode, result.octaves, result.scale)) result.variant = 'principale';
  return result;
}

export function savePracticeSelection(selection: PracticeSelection) {
  const normalized = hasFingeringAlternative(selection.mode, selection.octaves, selection.scale) ? selection : { ...selection, variant: 'principale' as const };
  writeStorage(STORAGE_KEY, normalized);
  window.dispatchEvent(new CustomEvent<PracticeSelection>(PRACTICE_SELECTION_EVENT, { detail: normalized }));
}

export function practiceSelectionHref(pathname: string, selection: PracticeSelection) {
  const variant = hasFingeringAlternative(selection.mode, selection.octaves, selection.scale) ? selection.variant : 'principale';
  const params = new URLSearchParams({ scala: selection.scale, modo: selection.mode, ottave: String(selection.octaves), variante: variant });
  return `${pathname}?${params.toString()}`;
}
