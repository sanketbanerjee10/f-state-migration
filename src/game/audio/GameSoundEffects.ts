import {
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
} from '../core/GameSettings';

export type GameSoundCue =
  | 'collection'
  | 'shoot'
  | 'hit'
  | 'critical'
  | 'enemyDeath'
  | 'multipleKills'
  | 'explosion'
  | 'shield'
  | 'damage';

interface SoundLayer {
  readonly startFrequency: number;
  readonly endFrequency: number;
  readonly gain: number;
  readonly decay: number;
  readonly delay?: number;
  readonly duration?: number;
  readonly waveform?: 'sine' | 'triangle';
}

interface NoiseLayer {
  readonly gain: number;
  readonly decay: number;
  readonly delay?: number;
  readonly duration?: number;
  readonly swell?: boolean;
}

interface SoundCueConfig {
  readonly duration: number;
  readonly layers: readonly SoundLayer[];
  readonly noise?: NoiseLayer;
  readonly distortion?: number;
  readonly pitchVariation?: number;
}

const MAX_SOUND_EFFECTS_VOLUME = 0.12;

const SOUND_CUES: Record<GameSoundCue, SoundCueConfig> = {
  collection: {
    duration: 0.16,
    layers: [{ startFrequency: 560, endFrequency: 940, gain: 0.3, decay: 15 }],
  },
  shoot: {
    duration: 0.095,
    layers: [{ startFrequency: 820, endFrequency: 510, gain: 0.34, decay: 20 }],
    pitchVariation: 0.075,
  },
  hit: {
    duration: 0.12,
    layers: [
      { startFrequency: 155, endFrequency: 72, gain: 0.4, decay: 19 },
      {
        startFrequency: 92,
        endFrequency: 64,
        gain: 0.16,
        decay: 24,
        waveform: 'triangle',
      },
    ],
    noise: { gain: 0.035, decay: 48, duration: 0.035 },
  },
  critical: {
    duration: 0.16,
    layers: [
      { startFrequency: 1060, endFrequency: 680, gain: 0.2, decay: 18 },
      {
        startFrequency: 1580,
        endFrequency: 1210,
        gain: 0.12,
        decay: 24,
        delay: 0.018,
      },
    ],
  },
  enemyDeath: {
    duration: 0.18,
    layers: [
      { startFrequency: 490, endFrequency: 155, gain: 0.26, decay: 18 },
      {
        startFrequency: 118,
        endFrequency: 72,
        gain: 0.24,
        decay: 23,
        waveform: 'triangle',
      },
    ],
  },
  multipleKills: {
    duration: 0.24,
    layers: [
      { startFrequency: 510, endFrequency: 630, gain: 0.18, decay: 13 },
      { startFrequency: 680, endFrequency: 810, gain: 0.16, decay: 15, delay: 0.045 },
      { startFrequency: 850, endFrequency: 1040, gain: 0.14, decay: 17, delay: 0.09 },
      {
        startFrequency: 110,
        endFrequency: 70,
        gain: 0.14,
        decay: 20,
        waveform: 'triangle',
      },
    ],
  },
  explosion: {
    duration: 0.52,
    layers: [
      {
        startFrequency: 150,
        endFrequency: 520,
        gain: 0.18,
        decay: 4,
        duration: 0.12,
      },
      {
        startFrequency: 120,
        endFrequency: 43,
        gain: 0.36,
        decay: 8,
        delay: 0.12,
      },
      {
        startFrequency: 54,
        endFrequency: 36,
        gain: 0.22,
        decay: 10,
        delay: 0.12,
        waveform: 'triangle',
      },
    ],
    noise: { gain: 0.045, decay: 4, delay: 0.12, duration: 0.34, swell: true },
  },
  shield: {
    duration: 0.2,
    layers: [
      { startFrequency: 1040, endFrequency: 1370, gain: 0.2, decay: 13 },
      {
        startFrequency: 1540,
        endFrequency: 1180,
        gain: 0.09,
        decay: 22,
        delay: 0.025,
      },
    ],
  },
  damage: {
    duration: 0.22,
    layers: [
      {
        startFrequency: 104,
        endFrequency: 52,
        gain: 0.38,
        decay: 12,
        waveform: 'triangle',
      },
      { startFrequency: 185, endFrequency: 92, gain: 0.2, decay: 18 },
    ],
    distortion: 2.5,
  },
};

export class GameSoundEffects {
  private audioContext: AudioContext | null = null;
  private readonly cueBuffers = new Map<GameSoundCue, AudioBuffer>();
  private settings: GameSettings = DEFAULT_GAME_SETTINGS;
  private disposed = false;

  constructor(private readonly onError: (error: Error) => void = () => undefined) {}

  setSettings(settings: GameSettings): void {
    this.settings = settings;
  }

  unlock(): void {
    if (
      !this.settings.soundEnabled ||
      this.settings.soundVolume <= 0 ||
      this.disposed
    ) {
      return;
    }
    try {
      this.audioContext ??= new AudioContext();
      void this.audioContext.resume().catch((error: unknown) => {
        this.onError(
          error instanceof Error ? error : new Error('Unable to enable game sound effects.'),
        );
      });
    } catch (error) {
      this.onError(
        error instanceof Error
          ? error
          : new Error('Game sound effects are not supported by this browser.'),
      );
    }
  }

  playCue(cue: GameSoundCue, intensity = 1, delaySeconds = 0): void {
    if (
      this.disposed ||
      !this.settings.soundEnabled ||
      this.settings.soundVolume <= 0 ||
      !this.audioContext ||
      this.audioContext.state !== 'running'
    ) {
      return;
    }

    const context = this.audioContext;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = this.getCueBuffer(cue, context);
    const cueVolume = cue === 'shoot' ? 0.4 : 1;
    gain.gain.setValueAtTime(
      this.settings.soundVolume ** 2 *
        MAX_SOUND_EFFECTS_VOLUME *
        cueVolume *
        Math.min(1.4, Math.max(0, intensity)),
      context.currentTime,
    );
    const pitchVariation = SOUND_CUES[cue].pitchVariation;
    if (pitchVariation) {
      source.playbackRate.setValueAtTime(
        1 + (Math.random() * 2 - 1) * pitchVariation,
        context.currentTime,
      );
    }
    source.connect(gain);
    gain.connect(context.destination);
    source.start(context.currentTime + Math.max(0, delaySeconds));
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    if (this.audioContext) {
      void this.audioContext.close().catch((error: unknown) => {
        this.onError(
          error instanceof Error ? error : new Error('Unable to release game audio.'),
        );
      });
      this.audioContext = null;
    }
    this.cueBuffers.clear();
  }

  private getCueBuffer(cue: GameSoundCue, context: AudioContext): AudioBuffer {
    const cached = this.cueBuffers.get(cue);
    if (cached) return cached;

    const sound = SOUND_CUES[cue];
    const frameCount = Math.ceil(context.sampleRate * sound.duration);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const samples = buffer.getChannelData(0);

    for (const layer of sound.layers) {
      const delay = layer.delay ?? 0;
      const layerDuration = Math.min(
        layer.duration ?? sound.duration - delay,
        sound.duration - delay,
      );
      const firstFrame = Math.ceil(delay * context.sampleRate);
      const endFrame = Math.min(
        frameCount,
        firstFrame + Math.ceil(layerDuration * context.sampleRate),
      );
      let phase = 0;
      for (let frame = firstFrame; frame < endFrame; frame += 1) {
        const time = (frame - firstFrame) / context.sampleRate;
        const progress = Math.min(1, time / layerDuration);
        const frequency =
          layer.startFrequency +
          (layer.endFrequency - layer.startFrequency) * progress;
        phase += (2 * Math.PI * frequency) / context.sampleRate;
        const sine = Math.sin(phase);
        const waveform = layer.waveform === 'triangle'
          ? (2 / Math.PI) * Math.asin(sine)
          : sine;
        const envelope = Math.min(1, time / 0.004) *
          Math.exp(-layer.decay * progress) *
          Math.max(0, 1 - progress * progress);
        samples[frame] += waveform * layer.gain * envelope;
      }
    }

    if (sound.noise) {
      const noise = sound.noise;
      const delay = noise.delay ?? 0;
      const duration = Math.min(noise.duration ?? sound.duration, sound.duration - delay);
      const firstFrame = Math.ceil(delay * context.sampleRate);
      const endFrame = Math.min(
        frameCount,
        firstFrame + Math.ceil(duration * context.sampleRate),
      );
      for (let frame = firstFrame; frame < endFrame; frame += 1) {
        const time = (frame - firstFrame) / context.sampleRate;
        const progress = Math.min(1, time / duration);
        const decay = Math.exp(-noise.decay * progress);
        const swell = noise.swell ? Math.sin(Math.PI * progress / 2) : 1;
        const envelope = Math.min(1, time / 0.003) *
          decay *
          swell *
          Math.max(0, 1 - progress);
        samples[frame] += (Math.random() * 2 - 1) * noise.gain * envelope;
      }
    }

    for (let frame = 0; frame < frameCount; frame += 1) {
      const sample = samples[frame]! * (sound.distortion ?? 1);
      samples[frame] = Math.max(-1, Math.min(1, Math.tanh(sample)));
    }
    this.cueBuffers.set(cue, buffer);
    return buffer;
  }
}
