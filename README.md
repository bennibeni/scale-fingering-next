# Scale al pianoforte — Next.js

Applicazione autonoma costruita con Next.js App Router, TypeScript e Tailwind CSS.

## Avvio

```powershell
npm install
npm run dev
```

Aprire l'indirizzo mostrato da Next.js. Il JSON è incluso in `public/data` e non richiede percorsi esterni.

## Audio

Lo Studio usa `app/lib/audio-engine` (oscillatore Web Audio, `createSynthEngine`), copiato da `bennibeni/dodici-vercel` — motore condiviso e senza dipendenze, pensato apposta per essere riusato tra le app invece di riscriverlo ogni volta. Vedi `app/lib/audio-engine/README.md` per l'API completa.

## Build

```powershell
npm run build
npm start
```
