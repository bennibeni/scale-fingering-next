# Campioni piano

Metti qui i file `.wav` dei campioni di pianoforte. Convenzione di naming (da
`app/lib/audio-engine/sampleNames.js`, la stessa di R02 in `dodici-vercel`):
`{Nota}{Ottava}.wav`, dove il diesis diventa `s` perché `#` non è un
carattere valido nei nomi file.

Esempi: `C4.wav`, `Cs4.wav`, `D4.wav`, `F4.wav`, `A4.wav`.

Non servono tutte le 88 note: `resolveSampleUrl` (in
`app/lib/audio-engine/sampleResolver.js`) cerca prima il pitch esatto, poi
gli "ancoraggi" C/D♯/F♯/A della stessa ottava, poi le ottave vicine, e
infine fa pitch-shift via `playbackRate` sul campione più vicino trovato.
Uno schema sparso con 4 campioni per ottava (C, D♯, F♯, A) è già sufficiente
per un risultato pulito.

Finché questa cartella è vuota, `StudyPanel` usa automaticamente il
sintetizzatore (`createSynthEngine`) come riserva — vedi il commento in
`components/studio/StudyPanel.tsx`. Non appena aggiungi qui i file, verranno
usati loro senza bisogno di toccare il codice.
