// Conversione nomi di note italiani (con diesis/bemolle) in altezze MIDI.
// Usato sia dalla tastiera visiva (PianoKeyboard) sia dal motore audio (StudyPanel),
// così le due rappresentazioni restano sempre coerenti tra loro.

export type FingeringDirection = 'salita' | 'discesa';

const NOTE_BASES: Record<string, number> = {
  do: 0,
  re: 2,
  mi: 4,
  fa: 5,
  sol: 7,
  la: 9,
  si: 11,
};

export function pitchClass(note: string): number {
  const normalized = note.trim().toLowerCase();
  const baseName = Object.keys(NOTE_BASES).find((name) => normalized.startsWith(name)) ?? 'do';
  const accidental = normalized.includes('♯') || normalized.includes('#')
    ? 1
    : normalized.includes('♭') || normalized.endsWith('b')
      ? -1
      : 0;
  return (NOTE_BASES[baseName] + accidental + 12) % 12;
}

// Trasforma una sequenza di nomi di note (una scala, già nell'ordine di esecuzione: per la
// discesa "notes" arriva con la nota più acuta per prima) in altezze MIDI assolute.
//
// Per restare nello STESSO registro in entrambe le direzioni, calcoliamo sempre la sequenza
// "in salita" a partire dalla nota più grave, ancorata a un'ottava di riferimento fissa (C4),
// e la invertiamo per la discesa invece di ancorare le due direzioni a ottave diverse: in
// precedenza la discesa partiva da un'ottava fissa più alta (C6) indipendentemente da dove
// finiva la salita, così la stessa scala suonava a un'altezza diversa a seconda della
// direzione invece di essere semplicemente percorsa al contrario.
export function buildPitches(notes: string[], direction: FingeringDirection): number[] {
  if (!notes.length) return [];
  const ascendingOrderNotes = direction === 'discesa' ? [...notes].reverse() : notes;
  const classes = ascendingOrderNotes.map(pitchClass);
  const ascendingPitches = [classes[0] + 60];

  for (let index = 1; index < classes.length; index += 1) {
    let candidate = classes[index] + 60;
    while (candidate <= ascendingPitches[index - 1]) candidate += 12;
    ascendingPitches.push(candidate);
  }

  return direction === 'discesa' ? [...ascendingPitches].reverse() : ascendingPitches;
}
