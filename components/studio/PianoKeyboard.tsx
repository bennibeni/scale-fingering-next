'use client';

import clsx from 'clsx';
import { buildPitches } from '@/app/lib/pitch';

type Direction = 'salita' | 'discesa';
type Hand = 'mano_destra' | 'mano_sinistra';

const WHITE_PITCHES = new Set([0, 2, 4, 5, 7, 9, 11]);

function italianKeyName(midi: number) {
  return ['Do', 'Do♯', 'Re', 'Re♯', 'Mi', 'Fa', 'Fa♯', 'Sol', 'Sol♯', 'La', 'La♯', 'Si'][((midi % 12) + 12) % 12];
}

export default function PianoKeyboard({
  notes,
  fingers,
  step,
  direction,
  hand,
  onStepSelect,
}: {
  notes: string[];
  fingers: number[];
  step: number;
  direction: Direction;
  hand: Hand;
  onStepSelect: (index: number) => void;
}) {
  const pitches = buildPitches(notes, direction);
  const minimum = Math.min(...pitches);
  const maximum = Math.max(...pitches);
  const firstKey = minimum - (((minimum % 12) + 12) % 12);
  const lastKey = maximum + ((12 - (((maximum % 12) + 12) % 12)) % 12);
  const keys = Array.from({ length: lastKey - firstKey + 1 }, (_, index) => firstKey + index);
  const whiteKeys = keys.filter((midi) => WHITE_PITCHES.has(((midi % 12) + 12) % 12));
  const blackKeys = keys.filter((midi) => !WHITE_PITCHES.has(((midi % 12) + 12) % 12));
  const whiteWidth = 48;
  const blackWidth = 30;
  const activeMidi = pitches[step];
  const activePitchClass = ((activeMidi % 12) + 12) % 12;
  const activeIsWhite = WHITE_PITCHES.has(activePitchClass);
  const activeWhiteIndex = whiteKeys.filter((midi) => midi < activeMidi).length;
  const activeX = activeIsWhite ? activeWhiteIndex * whiteWidth + whiteWidth / 2 : activeWhiteIndex * whiteWidth;
  const keyboardWidth = whiteKeys.length * whiteWidth;
  const handLeft = Math.max(0, Math.min(activeX - 80, keyboardWidth - 160));
  const fingerOrder = hand === 'mano_destra' ? [1, 2, 3, 4, 5] : [5, 4, 3, 2, 1];
  const previousFinger = fingers[step - 1];
  const currentFinger = fingers[step];
  const technique = step === 0
    ? 'Posizione iniziale'
    : currentFinger === 1 && previousFinger >= 3
      ? 'Passaggio del pollice'
      : previousFinger === 1 && currentFinger >= 3
        ? `Passaggio del ${currentFinger}° dito`
        : 'Posizione naturale';

  const occurrenceFor = (midi: number) => pitches.findIndex((pitch) => pitch === midi);
  const stateFor = (midi: number) => {
    const occurrence = occurrenceFor(midi);
    if (occurrence === step) return 'active';
    if (occurrence >= 0 && occurrence < step) return 'completed';
    if (occurrence > step) return 'future';
    return 'unused';
  };

  return (
    <div className="mt-7 border-t border-stone-200 pt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Tastiera interattiva</p>
          <p className="mt-1 text-sm text-stone-600">Seleziona un tasto evidenziato per raggiungere quel passaggio.</p>
        </div>
        <div className="text-right">
          <span className={clsx('inline-flex rounded-full px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide', technique === 'Posizione naturale' ? 'bg-stone-100 text-stone-600' : 'bg-brass-100 text-brass-800')}>{technique}</span>
          <p className="mt-1 text-xs text-stone-500">{hand === 'mano_destra' ? 'Mano destra' : 'Mano sinistra'} · {direction}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-stone-100 p-3 pb-4 shadow-inner">
        <div className="relative h-[286px]" style={{ width: keyboardWidth }}>
          <div
            className="absolute top-0 z-30 w-40 transition-[left] duration-300 ease-out"
            style={{ left: handLeft }}
            aria-label={`${hand === 'mano_destra' ? 'Mano destra' : 'Mano sinistra'}, dito ${currentFinger}`}
          >
            <div className="mx-auto flex w-36 items-end justify-center gap-1 rounded-[1.4rem_1.4rem_.8rem_.8rem] border border-moss-700 bg-moss-900 px-2 pb-2 pt-2 shadow-lg">
              {fingerOrder.map((finger) => (
                <span
                  key={finger}
                  className={clsx(
                    'grid w-6 place-items-center rounded-full border font-mono text-[11px] font-bold transition-all duration-200',
                    finger === 1 ? 'h-7' : finger === 2 || finger === 4 ? 'h-9' : finger === 3 ? 'h-10' : 'h-8',
                    finger === currentFinger ? 'scale-110 border-white bg-brass-500 text-moss-950 shadow-md' : 'border-moss-500 bg-moss-700 text-moss-100',
                  )}
                >{finger}</span>
              ))}
            </div>
            <div className="mx-auto h-3 w-px bg-brass-500" />
            <div className="mx-auto h-2 w-2 rotate-45 bg-brass-500" />
          </div>

          <div className="absolute inset-x-0 bottom-0 flex h-[210px]">
            {whiteKeys.map((midi) => {
              const occurrence = occurrenceFor(midi);
              const state = stateFor(midi);
              return (
                <button
                  key={midi}
                  type="button"
                  disabled={occurrence < 0}
                  onClick={() => occurrence >= 0 && onStepSelect(occurrence)}
                  aria-label={occurrence >= 0 ? `${notes[occurrence]}, dito ${fingers[occurrence]}, passo ${occurrence + 1}` : italianKeyName(midi)}
                  className={clsx(
                    'relative flex h-full shrink-0 items-end justify-center rounded-b-lg border border-stone-300 pb-4 transition focus-visible:z-30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500',
                    state === 'active' && 'z-10 border-brass-600 bg-brass-100 shadow-[inset_0_-8px_0_rgba(180,139,70,.22)]',
                    state === 'completed' && 'bg-moss-100',
                    state === 'future' && 'bg-white hover:bg-brass-50',
                    state === 'unused' && 'bg-stone-50 text-stone-400',
                  )}
                  style={{ width: whiteWidth }}
                >
                  {occurrence >= 0 && <span className="font-mono text-[11px] font-semibold text-stone-600">{notes[occurrence]}</span>}
                  {state === 'active' && <span className="absolute left-1/2 top-16 grid h-8 w-8 -translate-x-1/2 place-items-center rounded-full bg-moss-900 font-mono text-sm font-bold text-white shadow-lg">{fingers[occurrence]}</span>}
                </button>
              );
            })}
          </div>

          {blackKeys.map((midi) => {
            const precedingWhites = whiteKeys.filter((whiteMidi) => whiteMidi < midi).length;
            const occurrence = occurrenceFor(midi);
            const state = stateFor(midi);
            return (
              <button
                key={midi}
                type="button"
                disabled={occurrence < 0}
                onClick={() => occurrence >= 0 && onStepSelect(occurrence)}
                aria-label={occurrence >= 0 ? `${notes[occurrence]}, dito ${fingers[occurrence]}, passo ${occurrence + 1}` : italianKeyName(midi)}
                className={clsx(
                  'absolute top-[76px] z-20 flex h-[132px] items-end justify-center rounded-b-md border border-stone-950 pb-3 text-white shadow-lg transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass-500',
                  state === 'active' && 'border-brass-400 bg-brass-600',
                  state === 'completed' && 'border-moss-700 bg-moss-700',
                  state === 'future' && 'bg-stone-800 hover:bg-stone-700',
                  state === 'unused' && 'bg-stone-950',
                )}
                style={{ left: precedingWhites * whiteWidth - blackWidth / 2, width: blackWidth }}
              >
                {occurrence >= 0 && <span className="font-mono text-[9px] font-semibold">{notes[occurrence]}</span>}
                {state === 'active' && <span className="absolute left-1/2 top-10 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full border-2 border-white bg-brass-500 font-mono text-sm font-bold text-moss-950 shadow-lg">{fingers[occurrence]}</span>}
              </button>
            );
          })}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-wide text-stone-500" aria-label="Legenda tastiera">
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-moss-300" />Eseguito</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-brass-500" />Attuale</span>
        <span className="inline-flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full border border-stone-300 bg-white" />Successivo</span>
      </div>
    </div>
  );
}
