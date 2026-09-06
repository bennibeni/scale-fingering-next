export interface SampleEngineOptions {
  sampleBasePath?: string;
  ext?: string;
  maxVoices?: number;
  minMidi?: number;
  maxMidi?: number;
}

export interface PlayNoteOptions {
  durationMs?: number | null;
  velocity?: number;
  startAt?: number | null;
}

export interface ResolvedSample {
  url: string;
  sampleMidi: number;
}

export interface ActiveVoice {
  id: number;
  midiNote: number;
  startedAt: number;
}

export interface AudioEngine {
  unlock(): Promise<boolean>;
  now(): number;
  setMasterGain(g: number): void;
  preload(midis: number[]): Promise<ResolvedSample[]>;
  playNote(midiNote: number, opts?: PlayNoteOptions): Promise<number | null>;
  stopNote(voiceId: number, releaseMs?: number): void;
  stopAll(releaseMs?: number): void;
  getActiveVoices(): ActiveVoice[];
  dispose(): void;
}

export function createSampleEngine(options?: SampleEngineOptions): AudioEngine;
export function createSynthEngine(options?: { waveform?: string; maxVoices?: number }): AudioEngine;

export function getOrCreateAudioContext(): AudioContext | null;
export function unlockAudioContext(): Promise<boolean>;
export function isAudioContextRunning(): boolean;

export function midiToFrequency(midiNote: number): number;
export function semitoneRate(semitoneDelta: number): number;

export function midiToNoteName(midi: number): string;
export function midiToSampleKey(midi: number): string;

export function resolveSampleUrl(targetMidi: number, options?: SampleEngineOptions): Promise<ResolvedSample | null>;
export function clearSampleResolveCache(): void;

export function getSampleBuffer(ctx: AudioContext, url: string): Promise<AudioBuffer>;
export function clearSampleBufferCache(): void;
