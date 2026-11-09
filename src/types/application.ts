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
  additionalComments: string | null;
}

export interface GroupMember {
  id: string;
  playerName: string;
  currentState?: string;
  f1ArenaPower?: string;
  f2ArenaPower?: string;
  f3ArenaPower?: string;
  highestPowerOnRecord: string;
  structurePower: string;
  techPower: string;
  troopPower: string;
  heroPower: string;
  modVehiclePower: string;
  kills: string;
  currentAlliance: string;
  t10ResearchComplete: boolean | null;
  t10ResearchPercent: string;
  screenshotFileName?: string;
  isScreenshotVerified: boolean;
}
