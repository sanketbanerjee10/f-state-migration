import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_GAME_SETTINGS } from '@/game/core/GameSettings';
import { GameSoundEffects } from '@/game/audio/GameSoundEffects';
import {
  getConfiguredMusicTracks,
  getMusicTrackName,
  GameAudioController,
  MENU_MUSIC_TRACK,
  MUSIC_CROSSFADE_MILLISECONDS,
  MUSIC_PREFETCH_SECONDS,
  MusicPlaylist,
  type MusicAudioElement,
} from '@/game/audio/GameAudioController';

class FakeAudio implements MusicAudioElement {
  currentTime = 0;
  duration = Number.NaN;
  volume = 1;
  muted = false;
  paused = true;
  preload = '';
  loop = false;
  readyState = 0;
  src: string;
  listeners = new Map<string, Set<EventListener>>();
  play = vi.fn(() => {
    this.paused = false;
    return Promise.resolve();
  });
  pause = vi.fn(() => {
    this.paused = true;
  });
  load = vi.fn();

  constructor(source: string) {
    this.src = source;
  }

  addEventListener(type: string, listener: EventListener): void {
    const listeners = this.listeners.get(type) ?? new Set<EventListener>();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(type: string, listener: EventListener): void {
    this.listeners.get(type)?.delete(listener);
  }

  emit(type: string): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(new Event(type));
    }
  }
}

describe('game music playlist', () => {
  it('keeps sound effects slightly louder than background music at matching levels', () => {
    const outputGains: number[] = [];
    vi.stubGlobal('AudioContext', class {
      state = 'running';
      currentTime = 0;
      sampleRate = 8000;
      destination = {};
      resume = vi.fn(() => Promise.resolve());
      close = vi.fn(() => Promise.resolve());
      createBuffer = (_channels: number, length: number) => ({
        getChannelData: () => new Float32Array(length),
      });
      createBufferSource = () => ({
        buffer: null,
        playbackRate: { setValueAtTime: vi.fn() },
        connect: vi.fn(),
        start: vi.fn(),
      });
      createGain = () => ({
        gain: { setValueAtTime: (value: number) => outputGains.push(value) },
        connect: vi.fn(),
      });
    });

    const soundEffects = new GameSoundEffects();
    try {
      soundEffects.setSettings({ ...DEFAULT_GAME_SETTINGS, soundVolume: 1 });
      soundEffects.unlock();
      soundEffects.playCue('collection');
      expect(outputGains.at(-1)).toBeCloseTo(0.12);

      soundEffects.setSettings({ ...DEFAULT_GAME_SETTINGS, soundVolume: 0.5 });
      soundEffects.playCue('collection');
      expect(outputGains.at(-1)).toBeCloseTo(0.03);
    } finally {
      soundEffects.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('caps background music volume and makes the slider perceptually responsive', () => {
    const audioElements: FakeAudio[] = [];
    vi.stubGlobal('Audio', class extends FakeAudio {
      constructor(source: string) {
        super(source);
        audioElements.push(this);
      }
    });
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const controller = new GameAudioController(['game-track.mp3']);
    try {
      controller.startMenuMusic();
      const menuAudio = audioElements[0]!;
      expect(menuAudio.volume).toBe(0.025);

      controller.setSettings({ ...DEFAULT_GAME_SETTINGS, musicVolume: 1 });
      expect(menuAudio.volume).toBe(0.1);

      controller.setSettings({ ...DEFAULT_GAME_SETTINGS, musicVolume: 0.5 });
      expect(menuAudio.volume).toBe(0.025);
    } finally {
      controller.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('parses an optional comma-separated cloud track list', () => {
    expect(getConfiguredMusicTracks(' https://cdn.example/one.mp3, , https://cdn.example/two.ogg '))
      .toEqual(['https://cdn.example/one.mp3', 'https://cdn.example/two.ogg']);
    expect(getConfiguredMusicTracks(undefined)).toEqual([]);
  });

  it('formats track names with their artist and uses the expected menu song', () => {
    expect(getMusicTrackName('/audio/alex-morgan-lofi-chill-vlog-beats.mp3'))
      .toBe('Lofi Chill Vlog Beats by Alex Morgan');
    expect(getMusicTrackName('https://cdn.example/kulakovka-vlog-intro.mp3?version=1'))
      .toBe('Vlog Intro by Kulakovka');
    expect(MENU_MUSIC_TRACK).toMatch(/\/kulakovka-vlog-intro\.mp3$/);
  });

  it('keeps menu music paused when menu start is requested again', () => {
    const audio = new FakeAudio(MENU_MUSIC_TRACK);
    vi.stubGlobal('Audio', class extends FakeAudio {
      constructor() {
        super(MENU_MUSIC_TRACK);
        return audio;
      }
    });
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });

    const controller = new GameAudioController();
    try {
      controller.startMenuMusic();
      expect(audio.paused).toBe(false);

      controller.toggleCurrentMusic();
      expect(audio.paused).toBe(true);

      controller.startMenuMusic();
      expect(audio.paused).toBe(true);
      expect(audio.play).toHaveBeenCalledOnce();
    } finally {
      controller.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('fades each playlist out before starting and fading in the next', () => {
    expect(MUSIC_CROSSFADE_MILLISECONDS).toBeGreaterThanOrEqual(3000);

    const audioElements: FakeAudio[] = [];
    const intervals: Array<() => void> = [];
    let now = 0;
    vi.stubGlobal('Audio', class extends FakeAudio {
      constructor(source: string) {
        super(source);
        audioElements.push(this);
      }
    });
    vi.stubGlobal('document', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('window', {
      setInterval: vi.fn((callback: () => void) => {
        intervals.push(callback);
        return intervals.length;
      }),
      clearInterval: vi.fn(),
    });
    vi.stubGlobal('performance', { now: () => now });

    const completeFade = () => {
      const interval = intervals.shift();
      expect(interval).toBeDefined();
      now += MUSIC_CROSSFADE_MILLISECONDS;
      interval?.();
    };

    const controller = new GameAudioController(['game-track.mp3']);
    try {
      controller.startMenuMusic();
      const menuAudio = audioElements[0]!;
      controller.startGameplay();
      expect(audioElements).toHaveLength(1);
      expect(menuAudio.volume).toBeGreaterThan(0);

      completeFade();
      expect(menuAudio.paused).toBe(true);
      const gameplayAudio = audioElements[1]!;
      expect(gameplayAudio.volume).toBe(0);
      gameplayAudio.emit('playing');
      completeFade();
      expect(gameplayAudio.volume).toBeGreaterThan(0);

      controller.pauseGameplay();
      controller.startMenuMusic();
      expect(gameplayAudio.paused).toBe(false);
      expect(audioElements).toHaveLength(2);
      completeFade();
      expect(gameplayAudio.paused).toBe(true);
      expect(menuAudio.volume).toBe(0);
      menuAudio.emit('playing');
      completeFade();
      expect(menuAudio.volume).toBeGreaterThan(0);

      controller.startGameplay();
      expect(audioElements).toHaveLength(2);
      completeFade();
      expect(menuAudio.paused).toBe(true);
      expect(gameplayAudio.volume).toBe(0);
      gameplayAudio.emit('playing');
      completeFade();
      expect(gameplayAudio.volume).toBeGreaterThan(0);
    } finally {
      controller.dispose();
      vi.unstubAllGlobals();
    }
  });

  it('preloads the following track within the final 30 seconds and plays tracks in order', () => {
    const audioElements: FakeAudio[] = [];
    const playlist = new MusicPlaylist(
      ['https://cdn.example/one.mp3', 'https://cdn.example/two.mp3'],
      (source) => {
        const audio = new FakeAudio(source);
        audioElements.push(audio);
        return audio;
      },
    );

    playlist.start();
    const first = audioElements[0]!;
    expect(first.play).toHaveBeenCalledOnce();
    expect(first.preload).toBe('auto');

    first.duration = 100;
    first.currentTime = 100 - MUSIC_PREFETCH_SECONDS - 1;
    first.emit('timeupdate');
    expect(audioElements).toHaveLength(1);

    first.currentTime = 100 - MUSIC_PREFETCH_SECONDS;
    first.emit('timeupdate');
    expect(audioElements).toHaveLength(2);
    expect(audioElements[1]!.src).toBe('https://cdn.example/two.mp3');
    expect(audioElements[1]!.load).toHaveBeenCalledOnce();
    expect(audioElements[1]!.play).not.toHaveBeenCalled();

    first.emit('ended');
    expect(first.pause).toHaveBeenCalledOnce();
    expect(audioElements[1]!.play).toHaveBeenCalledOnce();

    audioElements[1]!.emit('ended');
    expect(audioElements).toHaveLength(3);
    expect(audioElements[2]!.src).toBe('https://cdn.example/one.mp3');
    expect(audioElements[2]!.play).toHaveBeenCalledOnce();
    playlist.dispose();
  });

  it('loops a single track and releases audio resources and listeners when disposed', () => {
    const audio = new FakeAudio('https://cdn.example/loop.mp3');
    const playlist = new MusicPlaylist(['https://cdn.example/loop.mp3'], () => audio);

    playlist.start();
    expect(audio.loop).toBe(true);
    expect(audio.listeners.get('timeupdate')?.size).toBe(1);

    playlist.dispose();
    expect(audio.pause).toHaveBeenCalledOnce();
    expect(audio.src).toBe('');
    expect(audio.listeners.get('timeupdate')?.size).toBe(0);
  });

  it('applies mute and volume preferences to the current and preloaded tracks', () => {
    const audioElements: FakeAudio[] = [];
    const playlist = new MusicPlaylist(
      ['https://cdn.example/one.mp3', 'https://cdn.example/two.mp3'],
      (source) => {
        const audio = new FakeAudio(source);
        audioElements.push(audio);
        return audio;
      },
    );

    playlist.start();
    const current = audioElements[0]!;
    current.duration = 90;
    current.currentTime = 60;
    current.emit('timeupdate');
    const next = audioElements[1]!;

    playlist.setEnabled(false);
    playlist.setVolume(0.45);
    expect(current.muted).toBe(true);
    expect(next.muted).toBe(true);
    expect(current.volume).toBe(0.45);
    expect(next.volume).toBe(0.45);

    playlist.setEnabled(true);
    expect(current.muted).toBe(false);
    expect(next.muted).toBe(false);
    playlist.dispose();
  });
});
