/**
 * Evidence Score Calculation System
 * Calculates evidence scores based on study types, sample sizes, and quality scores
 */

import type {
  EvidenceSource,
  EvidenceGrade,
  StudyType,
  EvidenceCalculationInput,
} from "@/lib/types";

// Study type weights
const STUDY_TYPE_WEIGHTS: Record<StudyType, number> = {
  meta: 40, // Meta-analysis gets highest weight
  rct: 30, // RCT is gold standard
  animal: 15, // Animal studies are supporting evidence
  "in-vitro": 10, // In-vitro is mechanistic
  anecdotal: 5, // Anecdotal is lowest
};

// Sample size scoring (logarithmic scale)
function calculateSampleSizeScore(sampleSize: number | null): number {
  if (!sampleSize || sampleSize <= 0) return 0;

  // Logarithmic scoring: log10(n) * 5
  // n=10 -> 5, n=100 -> 10, n=1000 -> 15, n=10000 -> 20
  const score = Math.log10(sampleSize) * 5;
  return Math.min(score, 20); // Cap at 20
}

/**
 * Calculate evidence score for a single evidence source
 */
export function calculateSingleEvidenceScore(
  input: EvidenceCalculationInput
): number {
  const { study_type, sample_size, quality_score } = input;

  // Base score from study type (0-40)
  const studyTypeScore = STUDY_TYPE_WEIGHTS[study_type] || 0;

  // Sample size score (0-20)
  const sampleSizeScore = calculateSampleSizeScore(sample_size);

  // Quality score normalized to 0-40 scale
  const qualityScoreNormalized = quality_score ? (quality_score / 10) * 40 : 0;

  // Total score (0-100)
  const totalScore = studyTypeScore + sampleSizeScore + qualityScoreNormalized;

  return Math.min(Math.round(totalScore), 100);
}

/**
 * Calculate aggregate evidence score from multiple sources
 */
export function calculateAggregateEvidenceScore(
  sources: EvidenceSource[]
): number {
  if (!sources || sources.length === 0) return 0;

  // Calculate individual scores
  const scores = sources.map((source) =>
    calculateSingleEvidenceScore({
      study_type: source.study_type,
      sample_size: source.sample_size,
      quality_score: source.quality_score,
    })
  );

  // Take the weighted average with diminishing returns
  // First source gets 100%, second 50%, third 25%, etc.
  let weightedSum = 0;
  let totalWeight = 0;

  scores
    .sort((a, b) => b - a) // Sort descending
    .forEach((score, index) => {
      const weight = 1 / Math.pow(2, index);
      weightedSum += score * weight;
      totalWeight += weight;
    });

  const aggregateScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  return Math.round(aggregateScore);
}

/**
 * Convert evidence score to letter grade
 */
export function evidenceScoreToGrade(score: number | null): EvidenceGrade {
  if (score === null || score === undefined) return "N/A";

  if (score >= 80) return "A+";
  if (score >= 60) return "A";
  if (score >= 40) return "B";
  if (score >= 20) return "C";
  return "N/A";
}

/**
 * Get evidence grade color for UI
 */
export function evidenceGradeColor(grade: EvidenceGrade): string {
  switch (grade) {
    case "A+":
      return "text-green-600 dark:text-green-400";
    case "A":
      return "text-green-500 dark:text-green-500";
    case "B":
      return "text-yellow-600 dark:text-yellow-400";
    case "C":
      return "text-orange-600 dark:text-orange-400";
    case "N/A":
      return "text-gray-500 dark:text-gray-400";
    default:
      return "text-gray-500 dark:text-gray-400";
  }
}

/**
 * Check if entity meets evidence threshold for smart linking
 */
export function meetsEvidenceThreshold(
  evidenceScore: number | null,
  threshold: number
): boolean {
  if (evidenceScore === null || evidenceScore === undefined) return false;
  return evidenceScore >= threshold;
}
