import {
  DEFAULT_GAME_SETTINGS,
  type GameSettings,
} from '../core/GameSettings';
import { GameSoundEffects } from './GameSoundEffects';
import type { GameSoundCue } from './GameSoundEffects';
import {
  GAME_MUSIC_TRACKS,
  MENU_MUSIC_TRACK,
  MUSIC_CROSSFADE_MILLISECONDS,
  MusicPlaylist,
  shuffleTracks,
  type GameMusicStatusListener,
} from './MusicPlaylist';

const MAX_BACKGROUND_MUSIC_VOLUME = 0.1;

export {
  GAME_MUSIC_TRACKS,
  getConfiguredMusicTracks,
  getMusicTrackName,
  MENU_MUSIC_TRACK,
  MUSIC_CROSSFADE_MILLISECONDS,
  MUSIC_PREFETCH_SECONDS,
  MusicPlaylist,
  shuffleTracks,
} from './MusicPlaylist';
export type {
  GameMusicStatusListener,
  MusicAudioElement,
} from './MusicPlaylist';
export type { GameSoundCue } from './GameSoundEffects';

export class GameAudioController {
  private readonly playlist: MusicPlaylist;
  private readonly menuPlaylist: MusicPlaylist;
  private readonly soundEffects: GameSoundEffects;
  private settings: GameSettings;
  private gameplayActive = false;
  private menuActive = false;
  private gameMusicSelected = false;
  private gameplayMusicPaused = false;
  private menuMusicPaused = false;
  private disposed = false;

  constructor(
    tracks: readonly string[] = GAME_MUSIC_TRACKS,
    private readonly onError: (error: Error) => void = () => undefined,
    onMusicStatusChange: GameMusicStatusListener = () => undefined,
  ) {
    this.playlist = new MusicPlaylist(
      shuffleTracks(tracks),
      undefined,
      (error) => this.onError(error),
      (track, isPlaying) => {
        if (this.gameMusicSelected) onMusicStatusChange(track, isPlaying);
      },
    );
    this.menuPlaylist = new MusicPlaylist(
      [MENU_MUSIC_TRACK],
      undefined,
      (error) => this.onError(error),
      (track, isPlaying) => {
        if (this.menuActive) onMusicStatusChange(track, isPlaying);
      },
    );
    this.soundEffects = new GameSoundEffects((error) => this.onError(error));
    this.settings = DEFAULT_GAME_SETTINGS;
    this.playlist.setVolume(this.backgroundMusicVolume);
    this.menuPlaylist.setVolume(this.backgroundMusicVolume);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
  }

  setSettings(settings: GameSettings): void {
    this.settings = settings;
    this.soundEffects.setSettings(settings);
    this.playlist.setEnabled(settings.musicEnabled);
    this.playlist.setVolume(this.backgroundMusicVolume);
    this.menuPlaylist.setEnabled(settings.musicEnabled);
    this.menuPlaylist.setVolume(this.backgroundMusicVolume);
    if (!settings.musicEnabled) {
      this.playlist.pause();
      this.menuPlaylist.pause();
    } else if (this.gameplayActive && !this.gameplayMusicPaused) {
      this.playlist.start();
    } else if (this.menuActive && !this.menuMusicPaused) {
      this.menuPlaylist.start();
    }
    if (this.gameplayActive && settings.soundEnabled) this.soundEffects.unlock();
  }

  startGameplay(): void {
    if (this.disposed) return;
    const returningFromMenu = this.menuActive;
    if (this.gameplayActive && !returningFromMenu) {
      this.soundEffects.unlock();
      return;
    }
    this.gameplayActive = true;
    this.menuActive = false;
    this.gameMusicSelected = true;
    if (this.settings.musicEnabled) {
      if (returningFromMenu) {
        this.menuPlaylist.fadeTo(0, MUSIC_CROSSFADE_MILLISECONDS, () => {
          if (this.disposed || !this.gameplayActive || !this.settings.musicEnabled) return;
          this.menuPlaylist.pause();
          this.menuPlaylist.setVolume(this.backgroundMusicVolume);
          this.startGameplayMusic();
        });
      } else {
        this.startGameplayMusic();
      }
    }
    this.soundEffects.unlock();
  }

  startMenuMusic(): void {
    if (this.disposed) return;
    if (this.menuActive) return;
    const returningFromGameplay = this.playlist.hasStarted;
    this.gameplayActive = false;
    this.menuActive = true;
    this.gameMusicSelected = false;
    if (this.settings.musicEnabled) {
      if (returningFromGameplay) {
        this.playlist.fadeTo(0, MUSIC_CROSSFADE_MILLISECONDS, () => {
          if (this.disposed || !this.menuActive || !this.settings.musicEnabled) return;
          this.playlist.pause();
          this.playlist.setVolume(this.backgroundMusicVolume);
          this.startMenuMusicWithFadeIn();
        });
      } else {
        this.menuPlaylist.start();
      }
    }
  }

  toggleCurrentMusic(): void {
    if (this.disposed || !this.settings.musicEnabled) return;
    if (this.menuActive) {
      this.menuMusicPaused = !this.menuMusicPaused;
      if (this.menuMusicPaused) {
        this.menuPlaylist.pause();
      } else {
        this.menuPlaylist.resume();
      }
      return;
    }

    this.gameplayMusicPaused = !this.gameplayMusicPaused;
    if (this.gameplayMusicPaused) {
      this.playlist.pause();
    } else {
      this.playlist.resume();
    }
  }

  pauseGameplay(): void {
    this.gameplayActive = false;
  }

  toggleGameplayMusic(): void {
    this.toggleCurrentMusic();
  }

  resumeGameplay(): void {
    if (this.disposed) return;
    this.gameplayActive = true;
    if (this.settings.musicEnabled && !this.gameplayMusicPaused) {
      if (this.playlist.hasStarted) {
        this.playlist.resume();
      } else {
        this.startGameplay();
      }
    }
    this.soundEffects.unlock();
  }

  playCue(cue: GameSoundCue, intensity = 1, delaySeconds = 0): void {
    this.soundEffects.playCue(cue, intensity, delaySeconds);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.gameplayActive = false;
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    this.playlist.dispose();
    this.menuPlaylist.dispose();
    this.soundEffects.dispose();
  }

  private startGameplayMusic(): void {
    if (this.disposed || !this.gameplayActive || !this.settings.musicEnabled) return;
    if (this.gameplayMusicPaused) return;
    this.playlist.setVolume(0);
    this.playlist.start(() => {
      if (this.disposed || !this.gameplayActive || !this.settings.musicEnabled) return;
      this.playlist.fadeTo(this.backgroundMusicVolume, MUSIC_CROSSFADE_MILLISECONDS);
    });
  }

  private startMenuMusicWithFadeIn(): void {
    if (this.disposed || !this.menuActive || !this.settings.musicEnabled) return;
    if (this.menuMusicPaused) return;
    this.menuPlaylist.setVolume(0);
    this.menuPlaylist.start(() => {
      if (this.disposed || !this.menuActive || !this.settings.musicEnabled) return;
      this.menuPlaylist.fadeTo(this.backgroundMusicVolume, MUSIC_CROSSFADE_MILLISECONDS);
    });
  }

  private get backgroundMusicVolume(): number {
    return this.settings.musicVolume ** 2 * MAX_BACKGROUND_MUSIC_VOLUME;
  }

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) {
      this.playlist.pause();
      this.menuPlaylist.pause();
    } else if (
      this.playlist.hasStarted &&
      !this.gameplayMusicPaused &&
      !this.menuActive
    ) {
      this.playlist.resume();
    } else if (this.menuActive && !this.menuMusicPaused) {
      this.menuPlaylist.resume();
    }
  };
}
