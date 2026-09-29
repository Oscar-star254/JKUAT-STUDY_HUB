import type { GradeBand, Assessment, AppSettings } from '@/types';

export function getGradeBand(score: number, bands: GradeBand[]): GradeBand {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find(b => score >= b.min) ?? sorted[sorted.length - 1];
}

export function calcUnitScore(
  assessments: Assessment[],
  settings: AppSettings,
): { catScore: number | null; examScore: number | null; total: number | null } {
  const cats = assessments.filter(a => a.type === 'cat' || a.type === 'assignment');
  const exams = assessments.filter(a => a.type === 'exam');

  const catScore = cats.length > 0
    ? (cats.reduce((s, a) => s + (a.score / a.maxScore) * 100, 0) / cats.length)
    : null;

  const examScore = exams.length > 0
    ? (exams[0].score / exams[0].maxScore) * 100
    : null;

  const total =
    catScore !== null && examScore !== null
      ? catScore * settings.catWeight + examScore * settings.examWeight
      : catScore !== null
      ? catScore * settings.catWeight
      : null;

  return { catScore, examScore, total };
}

export function requiredExamScore(
  catScore: number,
  targetGrade: number,
  catWeight: number,
  examWeight: number,
): number {
  return (targetGrade - catWeight * catScore) / examWeight;
}

export function calcGPA(
  unitScores: { total: number; creditHours: number }[],
  bands: GradeBand[],
): number {
  const valid = unitScores.filter(u => u.total !== null && u.creditHours > 0);
  if (!valid.length) return 0;
  const totalCredits = valid.reduce((s, u) => s + u.creditHours, 0);
  const weightedPoints = valid.reduce((s, u) => {
    const band = getGradeBand(u.total, bands);
    return s + band.gpa * u.creditHours;
  }, 0);
  return weightedPoints / totalCredits;
}

export function degreeClass(gpa: number): string {
  if (gpa >= 3.6) return 'First Class Honours';
  if (gpa >= 3.0) return 'Second Class (Upper)';
  if (gpa >= 2.0) return 'Second Class (Lower)';
  if (gpa >= 1.0) return 'Pass';
  return 'Fail';
}

export function formatScore(score: number | null): string {
  if (score === null) return '—';
  return score.toFixed(1) + '%';
}
