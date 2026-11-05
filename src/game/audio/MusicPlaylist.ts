import { DEFAULT_GAME_SETTINGS } from '../core/GameSettings';

export const MUSIC_PREFETCH_SECONDS = 30;
export const MUSIC_CROSSFADE_MILLISECONDS = 3000;

const GAME_AUDIO_BASE_URL = import.meta.env.DEV
  ? (typeof __DEV_GAME_AUDIO_BASE_URL__ === 'undefined'
    ? '/audio'
    : __DEV_GAME_AUDIO_BASE_URL__)
  : import.meta.env.VITE_GAME_AUDIO_BASE_URL?.trim().replace(/\/+$/, '') ?? '/audio';
const LOFI_TRACK_FILENAMES = [
  'alex-morgan-lofi-chill-vlog-beats.mp3',
  'alex-morgan-lofi-cocktail-bar.mp3',
  'alex-morgan-lofi-midnight-club.mp3',
  'alex-morgan-lofi-restaurant.mp3',
  'alex-morgan-lofi-study-rainy-night.mp3',
  'camila_noir-soft-ambient-for-relaxed-gaming.mp3',
  'fopihe-chill-gaming-session.mp3',
  'fopihe-lofi-gaming-mood.mp3',
  'pripac-calm-gaming-flow.mp3',
  'vaitsez-vlog-vlog-music.mp3',
  'velariomusic-lofi-relaxing.mp3',
  'zephiramusic-beautiful-lofi.mp3',
  'zephiramusic-lofi-focus.mp3',
  'zephiramusic-lofi-pop.mp3',
  'zephiramusic-lofi-reel.mp3',
  'zephiramusic-lofi-trance.mp3',
  'zephiramusic-tokyo-lofi.mp3',
  'zephiramusic-travel-lofi.mp3',
] as const;
const MENU_MUSIC_FILENAME = 'kulakovka-vlog-intro.mp3';
const COMPOUND_ARTIST_SLUGS = ['alex-morgan'] as const;
const getAudioUrl = (filename: string) => {
  if (!GAME_AUDIO_BASE_URL) {
    throw new Error('VITE_GAME_AUDIO_BASE_URL must be configured to load game audio.');
  }
  return `${GAME_AUDIO_BASE_URL}/${filename}`;
};

export interface MusicAudioElement {
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  readonly paused?: boolean;
  preload: string;
  loop: boolean;
  readyState: number;
  src: string;
  play(): Promise<void>;
  pause(): void;
  load(): void;
  addEventListener(type: string, listener: EventListener): void;
  removeEventListener(type: string, listener: EventListener): void;
}

type AudioListener = readonly [type: string, listener: EventListener];
export type GameMusicStatusListener = (
  trackName: string,
  isPlaying: boolean,
) => void;

export function getMusicTrackName(track: string): string {
  const filename = track.split(/[?#]/, 1)[0]!.split('/').pop() ?? track;
  const stem = filename
    .replace(/%20/gi, ' ')
    .replace(/\.[^.]+$/, '');
  const artistSlug = COMPOUND_ARTIST_SLUGS.find((slug) =>
    stem.toLowerCase().startsWith(`${slug}-`),
  ) ?? stem.split('-', 1)[0];
  if (!artistSlug || artistSlug.length === stem.length) {
    return stem
      .replace(/[-_]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  const titleSlug = stem.slice(artistSlug.length + 1);
  const formatName = (name: string) => name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `${formatName(titleSlug)} by ${formatName(artistSlug)}`;
}

export function shuffleTracks(tracks: readonly string[]): string[] {
  const shuffled = [...tracks];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex]!, shuffled[index]!];
  }
  return shuffled;
}

export function getConfiguredMusicTracks(value: string | undefined): string[] {
  return value?.split(',').map((track) => track.trim()).filter(Boolean) ?? [];
}

const configuredGameMusicTracks = getConfiguredMusicTracks(
  import.meta.env.VITE_GAME_MUSIC_TRACKS,
);
export const GAME_MUSIC_TRACKS = import.meta.env.DEV
  ? LOFI_TRACK_FILENAMES.map(getAudioUrl)
  : configuredGameMusicTracks.length > 0
    ? configuredGameMusicTracks
    : LOFI_TRACK_FILENAMES.map(getAudioUrl);
export const MENU_MUSIC_TRACK = getAudioUrl(MENU_MUSIC_FILENAME);

export class MusicPlaylist {
  private current: MusicAudioElement | null = null;
  private currentIndex = 0;
  private pending: MusicAudioElement | null = null;
  private currentListeners: AudioListener[] = [];
  private pendingErrorListener: AudioListener | null = null;
  private volume = DEFAULT_GAME_SETTINGS.musicVolume;
  private muted = false;
  private disposed = false;
  private started = false;
  private fadeInterval: number | null = null;
  private onPlaying: (() => void) | null = null;

  constructor(
    private readonly tracks: readonly string[],
    private readonly createAudio: (source: string) => MusicAudioElement =
      (source) => {
        const audio = new Audio();
        audio.src = source;
        return audio;
      },
    private readonly onError: (error: Error) => void = () => undefined,
    private readonly onPlaybackChange: GameMusicStatusListener = () => undefined,
  ) {}

  start(onPlaying?: () => void): void {
    if (this.disposed || this.tracks.length === 0) return;
    if (onPlaying) this.onPlaying = onPlaying;
    if (this.started) {
      this.resume();
      return;
    }
    this.started = true;
    this.current = this.createTrack(0);
    this.attachCurrentListeners();
    this.current.load();
    this.play(this.current);
  }

  get hasStarted(): boolean {
    return this.started;
  }

  setEnabled(enabled: boolean): void {
    this.muted = !enabled;
    this.updateAudioSettings();
  }

  setVolume(volume: number): void {
    this.cancelFade();
    this.volume = volume;
    this.updateAudioSettings();
  }

  fadeTo(volume: number, duration: number, onComplete?: () => void): void {
    this.cancelFade();
    if (!this.current || duration <= 0) {
      this.setVolume(volume);
      onComplete?.();
      return;
    }

    const startVolume = this.current.volume;
    const startedAt = performance.now();
    this.volume = volume;
    this.fadeInterval = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / duration);
      const currentVolume = startVolume + (volume - startVolume) * progress;
      this.applyVolume(currentVolume);
      if (progress === 1) {
        this.cancelFade();
        onComplete?.();
      }
    }, 25);
  }

  pause(): void {
    this.current?.pause();
    if (this.current) {
      this.onPlaybackChange(this.tracks[this.currentIndex]!, false);
    }
  }

  resume(): void {
    if (this.started && this.current && !this.disposed) {
      this.play(this.current);
      if (this.current.paused === false) {
        const callback = this.onPlaying;
        this.onPlaying = null;
        callback?.();
        this.onPlaybackChange(this.tracks[this.currentIndex]!, true);
      }
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.cancelFade();
    this.onPlaying = null;
    if (this.current) this.releaseTrack(this.current, this.currentListeners);
    if (this.pending) {
      this.releaseTrack(
        this.pending,
        this.pendingErrorListener ? [this.pendingErrorListener] : [],
      );
    }
    this.current = null;
    this.pending = null;
    this.currentListeners = [];
    this.pendingErrorListener = null;
  }

  private createTrack(index: number): MusicAudioElement {
    const audio = this.createAudio(this.tracks[index]!);
    audio.preload = 'auto';
    audio.loop = this.tracks.length === 1;
    audio.volume = this.volume;
    audio.muted = this.muted;
    return audio;
  }

  private attachCurrentListeners(): void {
    if (!this.current) return;
    const audio = this.current;
    const onTimeUpdate: EventListener = () => this.checkPrefetchWindow();
    const onMetadata: EventListener = () => this.checkPrefetchWindow();
    const onEnded: EventListener = () => this.advanceTrack();
    const onPlaying: EventListener = () => {
      this.onPlaybackChange(this.tracks[this.currentIndex]!, true);
      const callback = this.onPlaying;
      this.onPlaying = null;
      callback?.();
    };
    const onPause: EventListener = () => {
      this.onPlaybackChange(this.tracks[this.currentIndex]!, false);
    };
    const onError: EventListener = () => {
      this.onError(new Error(`Unable to load game music: ${this.tracks[this.currentIndex]}`));
    };
    this.currentListeners = [
      ['timeupdate', onTimeUpdate],
      ['loadedmetadata', onMetadata],
      ['ended', onEnded],
      ['playing', onPlaying],
      ['pause', onPause],
      ['error', onError],
    ];
    for (const [type, listener] of this.currentListeners) {
      audio.addEventListener(type, listener);
    }
  }

  private checkPrefetchWindow(): void {
    const current = this.current;
    if (
      !current ||
      this.tracks.length < 2 ||
      !Number.isFinite(current.duration) ||
      current.duration - current.currentTime > MUSIC_PREFETCH_SECONDS
    ) {
      return;
    }
    this.prefetchNextTrack();
  }

  private prefetchNextTrack(): void {
    if (this.pending || this.disposed) return;
    const nextIndex = (this.currentIndex + 1) % this.tracks.length;
    const next = this.createTrack(nextIndex);
    const onError: EventListener = () => {
      this.onError(new Error(`Unable to preload game music: ${this.tracks[nextIndex]}`));
      if (this.pending === next) {
        this.releaseTrack(
          next,
          this.pendingErrorListener ? [this.pendingErrorListener] : [],
        );
        this.pending = null;
        this.pendingErrorListener = null;
      }
    };
    this.pending = next;
    this.pendingErrorListener = ['error', onError];
    next.addEventListener('error', onError);
    next.load();
  }

  private advanceTrack(): void {
    if (this.disposed || !this.current) return;
    if (!this.pending) this.prefetchNextTrack();
    const next = this.pending;
    if (!next) return;

    this.releaseTrack(this.current, this.currentListeners);
    this.currentIndex = (this.currentIndex + 1) % this.tracks.length;
    this.current = next;
    this.pending = null;
    if (this.pendingErrorListener) {
      next.removeEventListener(
        this.pendingErrorListener[0],
        this.pendingErrorListener[1],
      );
    }
    this.pendingErrorListener = null;
    this.attachCurrentListeners();
    this.play(next);
  }

  private updateAudioSettings(): void {
    for (const audio of [this.current, this.pending]) {
      if (!audio) continue;
      audio.volume = this.volume;
      audio.muted = this.muted;
    }
  }

  private applyVolume(volume: number): void {
    for (const audio of [this.current, this.pending]) {
      if (!audio) continue;
      audio.volume = volume;
    }
  }

  private cancelFade(): void {
    if (this.fadeInterval === null) return;
    window.clearInterval(this.fadeInterval);
    this.fadeInterval = null;
  }

  private play(audio: MusicAudioElement): void {
    void audio.play().catch((error: unknown) => {
      if (
        error instanceof DOMException &&
        (error.name === 'AbortError' || error.name === 'NotAllowedError')
      ) {
        return;
      }
      this.onError(
        error instanceof Error ? error : new Error('Unable to play game music.'),
      );
    });
  }

  private releaseTrack(
    audio: MusicAudioElement,
    listeners: readonly AudioListener[],
  ): void {
    audio.pause();
    for (const [type, listener] of listeners) {
      audio.removeEventListener(type, listener);
    }
    audio.src = '';
  }
}
