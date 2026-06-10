/**
 * StreetCheck Safety Score Weights — LOCKED
 *
 * Constitution rule: These weights MUST NOT be changed without:
 *   1. Updating this file
 *   2. Bumping SCORING_VERSION
 *   3. Recomputing all existing segment scores
 *
 * Formula:
 *   safety_score = (
 *     LIGHTING_WEIGHT     × lighting_score
 *     + ACCIDENT_WEIGHT   × (1 − accident_rate)
 *     + FLOOD_WEIGHT      × (1 − flood_risk)
 *     + SURFACE_WEIGHT    × surface_quality
 *     + WALKABILITY_WEIGHT × walkability_score
 *   )
 *
 * All inputs are normalised to [0, 1]. Output is [0, 1].
 * Multiply by 100 for the 0–100 display score.
 */

export const SCORING_VERSION = 1 as const

export const WEIGHTS = {
  lighting: 0.3,
  accident: 0.25,
  flood: 0.2,
  surface: 0.15,
  walkability: 0.1,
} as const

/** Band thresholds (applied to raw 0–1 score) */
export const BAND_THRESHOLDS = {
  green: 0.75,
  amber: 0.45,
} as const

export type ScoreInputs = {
  lightingScore: number
  accidentRate: number // 0 = no accidents, 1 = maximum
  floodRisk: number // 0 = no risk, 1 = high risk
  surfaceQuality: number
  walkabilityScore: number
}

/**
 * Compute the composite safety score for a road segment.
 * @returns A value in [0, 1]. Multiply by 100 for display.
 */
export function computeSafetyScore(inputs: ScoreInputs): number {
  const raw =
    WEIGHTS.lighting * inputs.lightingScore +
    WEIGHTS.accident * (1 - inputs.accidentRate) +
    WEIGHTS.flood * (1 - inputs.floodRisk) +
    WEIGHTS.surface * inputs.surfaceQuality +
    WEIGHTS.walkability * inputs.walkabilityScore

  // Round to 4 decimal places to avoid floating-point noise
  return Math.round(raw * 10_000) / 10_000
}

/**
 * Classify a normalised [0,1] safety score into a safety band.
 */
export function getSafetyBand(score: number): 'green' | 'amber' | 'red' {
  if (score >= BAND_THRESHOLDS.green) return 'green'
  if (score >= BAND_THRESHOLDS.amber) return 'amber'
  return 'red'
}

/**
 * Clamp a value to [0, 1].
 */
export function clamp(value: number): number {
  return Math.max(0, Math.min(1, value))
}
