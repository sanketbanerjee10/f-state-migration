import { Avatar, Style } from '@dicebear/core';
import avataaarsDefinition from '@dicebear/styles/avataaars.json' with { type: 'json' };
import botttsDefinition from '@dicebear/styles/bottts.json' with { type: 'json' };
import micahDefinition from '@dicebear/styles/micah.json' with { type: 'json' };
import openPeepsDefinition from '@dicebear/styles/open-peeps.json' with { type: 'json' };
import toonHeadDefinition from '@dicebear/styles/toon-head.json' with { type: 'json' };
import voxelArtDefinition from '@dicebear/styles/voxel-art.json' with { type: 'json' };
import voxelBotDefinition from '@dicebear/styles/voxel-bot.json' with { type: 'json' };

export const GAME_PLAYER_AVATAR_STYLES = [
  'avataaars',
  'bottts',
  'micah',
  'open-peeps',
  'toon-head',
  'voxel-art',
  'voxel-bot',
] as const;

export type GamePlayerAvatarStyle = (typeof GAME_PLAYER_AVATAR_STYLES)[number];

export interface GamePlayerAvatar {
  style: GamePlayerAvatarStyle;
  seed: string;
  appearance: string;
  color: string;
  accessory: boolean;
  backgroundColor: string;
}

export const GAME_PLAYER_AVATAR_STYLE_LABELS: Record<GamePlayerAvatarStyle, string> = {
  avataaars: 'Avataaars',
  bottts: 'Bottts',
  micah: 'Micah',
  'open-peeps': 'Open Peeps',
  'toon-head': 'Toon Head',
  'voxel-art': 'Voxel Art',
  'voxel-bot': 'Voxel Bot',
};

export const GAME_PLAYER_AVATAR_APPEARANCES: Record<GamePlayerAvatarStyle, readonly string[]> = {
  avataaars: ['bigHair', 'curly', 'hat', 'shortRound', 'straight02', 'turban'],
  bottts: ['antenna', 'bulb01', 'horns', 'lights', 'radar'],
  micah: ['dannyPhantom', 'dougFunny', 'fonze', 'full', 'mrClean', 'pixie'],
  'open-peeps': ['afro', 'bun', 'hijab', 'long', 'mohawk', 'short1', 'turban'],
  'toon-head': ['bun', 'sideComed', 'spiky', 'undercut'],
  'voxel-art': ['short', 'spiky', 'bowl', 'beanie', 'mohawk', 'longWavy'],
  'voxel-bot': ['round', 'square', 'visor', 'cyclops', 'happy', 'sleepy', 'plus'],
};

export const GAME_PLAYER_AVATAR_COLORS = [
  '603a14',
  '28150a',
  '009bbd',
  'bd1700',
  '91cb15',
  '77311d',
  '9287ff',
  'ffeba4',
];

export const GAME_PLAYER_AVATAR_BACKGROUNDS = [
  '18243b',
  '2f1e3e',
  '16405a',
  '392c30',
  '254938',
  '663b4d',
  '121212',
  'e0ddff',
];

const styles = {
  avataaars: new Style(avataaarsDefinition),
  bottts: new Style(botttsDefinition),
  micah: new Style(micahDefinition),
  'open-peeps': new Style(openPeepsDefinition),
  'toon-head': new Style(toonHeadDefinition),
  'voxel-art': new Style(voxelArtDefinition),
  'voxel-bot': new Style(voxelBotDefinition),
} satisfies Record<GamePlayerAvatarStyle, Style>;

const appearanceOptions: Record<GamePlayerAvatarStyle, string> = {
  avataaars: 'topVariant',
  bottts: 'topVariant',
  micah: 'hairVariant',
  'open-peeps': 'headVariant',
  'toon-head': 'hairVariant',
  'voxel-art': 'topVariant',
  'voxel-bot': 'eyesVariant',
};

const colorOptions: Record<GamePlayerAvatarStyle, string> = {
  avataaars: 'clothesColor',
  bottts: 'baseColor',
  micah: 'shirtColor',
  'open-peeps': 'clothingColor',
  'toon-head': 'clothesColor',
  'voxel-art': 'shirtColor',
  'voxel-bot': 'bodyColor',
};

export function createDefaultGamePlayerAvatar(seed = 'last-z-afterhours'): GamePlayerAvatar {
  return {
    style: 'avataaars',
    seed,
    appearance: 'shortRound',
    color: '428bca',
    accessory: false,
    backgroundColor: '18243b',
  };
}

export function normalizeGamePlayerAvatar(value: unknown): GamePlayerAvatar {
  const avatar = typeof value === 'object' && value !== null
    ? value as Partial<GamePlayerAvatar>
    : {};
  const style = GAME_PLAYER_AVATAR_STYLES.find((candidate) => candidate === avatar.style) ?? 'avataaars';
  const defaults = createDefaultGamePlayerAvatar(
    typeof avatar.seed === 'string' ? avatar.seed : undefined,
  );
  const appearance = typeof avatar.appearance === 'string'
    && GAME_PLAYER_AVATAR_APPEARANCES[style].includes(avatar.appearance)
    ? avatar.appearance
    : defaults.appearance;

  return {
    style,
    seed: defaults.seed,
    appearance,
    color: typeof avatar.color === 'string' && /^[0-9a-f]{6}$/i.test(avatar.color)
      ? avatar.color
      : defaults.color,
    accessory: typeof avatar.accessory === 'boolean' ? avatar.accessory : defaults.accessory,
    backgroundColor: typeof avatar.backgroundColor === 'string'
      && /^[0-9a-f]{6}$/i.test(avatar.backgroundColor)
      ? avatar.backgroundColor
      : defaults.backgroundColor,
  };
}

export function randomizeGamePlayerAvatar(avatar: GamePlayerAvatar): GamePlayerAvatar {
  const style = GAME_PLAYER_AVATAR_STYLES[Math.floor(Math.random() * GAME_PLAYER_AVATAR_STYLES.length)]!;
  const appearances = GAME_PLAYER_AVATAR_APPEARANCES[style];
  return {
    ...avatar,
    style,
    seed: globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2),
    appearance: appearances[Math.floor(Math.random() * appearances.length)]!,
    color: GAME_PLAYER_AVATAR_COLORS[Math.floor(Math.random() * GAME_PLAYER_AVATAR_COLORS.length)]!,
    accessory: Math.random() > 0.5,
    backgroundColor: GAME_PLAYER_AVATAR_BACKGROUNDS[
      Math.floor(Math.random() * GAME_PLAYER_AVATAR_BACKGROUNDS.length)
    ]!,
  };
}

export function getGamePlayerAvatarBackground(avatar: GamePlayerAvatar): string {
  return `#${normalizeGamePlayerAvatar(avatar).backgroundColor}`;
}

export function renderGamePlayerAvatar(avatar: GamePlayerAvatar): string {
  const normalizedAvatar = normalizeGamePlayerAvatar(avatar);
  const options: Record<string, string | number> = {
    seed: normalizedAvatar.seed,
    [appearanceOptions[normalizedAvatar.style]]: normalizedAvatar.appearance,
    [colorOptions[normalizedAvatar.style]]: `#${normalizedAvatar.color}`,
  };

  switch (normalizedAvatar.style) {
    case 'avataaars':
      options.accessoriesVariant = 'sunglasses';
      options.accessoriesProbability = normalizedAvatar.accessory ? 100 : 0;
      break;
    case 'bottts':
      options.sidesVariant = normalizedAvatar.accessory ? 'antenna01' : 'round';
      options.sidesProbability = 100;
      break;
    case 'micah':
      options.glassesVariant = 'round';
      options.glassesProbability = normalizedAvatar.accessory ? 100 : 0;
      break;
    case 'open-peeps':
      options.accessoriesVariant = 'glasses';
      options.accessoriesProbability = normalizedAvatar.accessory ? 100 : 0;
      break;
    case 'toon-head':
      options.beardVariant = 'moustacheTwirl';
      options.beardProbability = normalizedAvatar.accessory ? 100 : 0;
      break;
    case 'voxel-art':
      options.glassesVariant = 'round';
      options.glassesProbability = normalizedAvatar.accessory ? 100 : 0;
      break;
    case 'voxel-bot':
      options.topVariant = normalizedAvatar.accessory ? 'antenna' : 'studs';
      break;
  }

  if (normalizedAvatar.style === 'voxel-art' || normalizedAvatar.style === 'voxel-bot') {
    options.backgroundColor = `#${normalizedAvatar.backgroundColor}`;
  }

  return new Avatar(styles[normalizedAvatar.style], options).toDataUri();
}
