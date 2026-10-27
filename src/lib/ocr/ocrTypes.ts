export interface OcrProgressInfo {
  status: string;
  progress: number;
}

export interface OcrDiagnostics {
  paddleAvailable: boolean;
  tesseract: {
    fullText: string;
    confidence: number;
    headerReads: string[];
    nameReads: Array<{ text: string; conf: number }>;
  };
  paddle: {
    statsText: string;
    nameReads: Array<{ model: string; text: string; conf: number }>;
  };
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
  diagnostics: OcrDiagnostics;
}
