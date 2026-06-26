/**
 * StreetCheck Safety Score Weights — LOCKED
 *
 * Constitution rule: These weights MUST NOT be changed without:
 *   1. Updating this file
 *   2. Bumping SCORING_VERSION
 *   3. Recomputing all existing segment scores
 *
 * Formula (Madhapur / Hitech City OSM scope, v3):
 *   safety_score = (
 *     SCHOOL_WEIGHT   × school_proximity_score
 *     + HOSPITAL_WEIGHT × hospital_proximity_score
 *     + PARK_WEIGHT   × park_proximity_score
 *     + BUS_STOP_WEIGHT × bus_stop_proximity_score
 *     + FOOTPATH_WEIGHT × footpath_presence_score
 *   )
 *
 * All inputs are integers in [0, 100]. Output is an integer [0, 100].
 * Bands: green > 75 | amber > 45 | red ≤ 45
 */

export const SCORING_VERSION = 3 as const

export const WEIGHTS = {
  school: 0.25,
  hospital: 0.25,
  park: 0.2,
  bus_stop: 0.15,
  footpath: 0.15,
} as const

/** Band thresholds (applied to the 0–100 integer score) */
export const BAND_THRESHOLDS = {
  green: 75,
  amber: 45,
} as const

export type ScoreInputs = {
  /** School proximity indicator 0–100 */
  school: number
  /** Hospital proximity indicator 0–100 */
  hospital: number
  /** Park proximity indicator 0–100 */
  park: number
  /** Bus-stop proximity indicator 0–100 */
  bus_stop: number
  /** Footpath presence indicator 0–100 */
  footpath: number
}

/**
 * Compute the composite safety score for a road segment.
 * @returns An integer in [0, 100].
 */
export function computeSafetyScore(inputs: ScoreInputs): number {
  const raw =
    WEIGHTS.school * inputs.school +
    WEIGHTS.hospital * inputs.hospital +
    WEIGHTS.park * inputs.park +
    WEIGHTS.bus_stop * inputs.bus_stop +
    WEIGHTS.footpath * inputs.footpath

  return Math.round(raw)
}

/**
 * Classify a 0–100 safety score into a safety band.
 */
export function getSafetyBand(score: number): 'green' | 'amber' | 'red' {
  if (score >= BAND_THRESHOLDS.green + 1) return 'green'
  if (score >= BAND_THRESHOLDS.amber + 1) return 'amber'
  return 'red'
}

/**
 * Clamp a value to [0, 100].
 */
export function clamp(value: number): number {
  return Math.max(0, Math.min(100, value))
}
