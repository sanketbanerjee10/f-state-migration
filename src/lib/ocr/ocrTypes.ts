export interface OcrProgressInfo {
  status: string;
  progress: number;
}

export interface ExtractedPlayerFields {
  playerName?: string;
  powerBesideName?: string;
  kills?: string;
  structurePower?: string;
  techPower?: string;
  troopPower?: string;
  heroPower?: string;
  modVehiclePower?: string;
  highestPowerOnRecord?: string;
  confidence?: number;
  rawText?: string;
}

export interface OcrRecognitionResult {
  text: string;
  confidence: number;
  extracted: ExtractedPlayerFields;
}
