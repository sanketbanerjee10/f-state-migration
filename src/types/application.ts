export type MigrationTier = 'Regular' | 'Medium' | 'Advanced' | 'Elite';
export type MigrationType = 'Individual' | 'Group';

export interface MigrationApplication {
  gameName: string;
  currentState: number;
  currentAlliance: string;
  powerScreenshot: File;
  f1ArenaPower: number;
  f2ArenaPower: number;
  f3ArenaPower: number;
  kills: number;
  preferredAlliances: string[];
  migrationTier: MigrationTier;
  migrationType: MigrationType;
  groupRepresentative: string | null;
  migrationReason: string;
  characterReference?: string | null;
  additionalComments: string | null;
}

export interface GroupMember {
  id: string;
  playerName: string;
  highestPowerOnRecord: string;
  structurePower: string;
  techPower: string;
  troopPower: string;
  heroPower: string;
  modVehiclePower: string;
  kills: string;
  currentAlliance: string;
  screenshotFileName?: string;
  isScreenshotVerified: boolean;
}

