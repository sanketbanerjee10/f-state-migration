import { z } from 'zod';

const commaFormattedNumberSchema = z
  .string()
  .regex(/^[\d,]+$/, 'Must be a valid formatted number')
  .optional();

export const extractedPlayerFieldsSchema = z.object({
  playerName: z.string().min(1).max(40).optional(),
  powerBesideName: commaFormattedNumberSchema,
  kills: commaFormattedNumberSchema,
  structurePower: commaFormattedNumberSchema,
  techPower: commaFormattedNumberSchema,
  troopPower: commaFormattedNumberSchema,
  heroPower: commaFormattedNumberSchema,
  modVehiclePower: commaFormattedNumberSchema,
  highestPowerOnRecord: commaFormattedNumberSchema,
  confidence: z.number().min(0).max(100).optional(),
  rawText: z.string().optional(),
});

export type ExtractedPlayerFieldsValidated = z.infer<typeof extractedPlayerFieldsSchema>;

export function validatePlayerRecord(data: unknown): {
  success: boolean;
  data?: ExtractedPlayerFieldsValidated;
  error?: string;
} {
  const result = extractedPlayerFieldsSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return {
    success: false,
    error: result.error.errors.map((e) => e.message).join(', '),
  };
}
