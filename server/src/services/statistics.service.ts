import type { GarminHealthData } from '../types/index.js';
import type { CloudStatistics } from './firestore.service.js';
import { v4 as uuidv4 } from 'uuid';

interface MetricStats {
  avg: number;
  median: number;
  min: number;
  max: number;
  p25: number;
  p75: number;
  count: number;
}

function calculateStats(values: number[]): MetricStats {
  if (values.length === 0) {
    return { avg: 0, median: 0, min: 0, max: 0, p25: 0, p75: 0, count: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const count = sorted.length;
  const sum = sorted.reduce((a, b) => a + b, 0);

  const percentile = (p: number): number => {
    const index = (p / 100) * (count - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] * (upper - index) + sorted[upper] * (index - lower);
  };

  return {
    avg: Math.round((sum / count) * 100) / 100,
    median: Math.round(percentile(50) * 100) / 100,
    min: sorted[0],
    max: sorted[count - 1],
    p25: Math.round(percentile(25) * 100) / 100,
    p75: Math.round(percentile(75) * 100) / 100,
    count,
  };
}

export function calculateStatistics(healthData: GarminHealthData): CloudStatistics {
  const { sleep, stress, bodyBattery, heartRate, activities, dateRange } = healthData;

  // Sleep statistics
  const sleepDurations = sleep.map(s => s.sleepTimeSeconds / 3600);
  const sleepScores = sleep.filter(s => s.sleepScore !== null).map(s => s.sleepScore as number);
  const deepSleepPercents = sleep
    .filter(s => s.sleepTimeSeconds > 0)
    .map(s => (s.deepSleepSeconds / s.sleepTimeSeconds) * 100);
  const remSleepPercents = sleep
    .filter(s => s.sleepTimeSeconds > 0)
    .map(s => (s.remSleepSeconds / s.sleepTimeSeconds) * 100);
  const sleepRestingHRs = sleep.filter(s => s.restingHeartRate !== null).map(s => s.restingHeartRate as number);

  // Stress statistics
  const overallStress = stress.map(s => s.overallStressLevel);
  const highStressPercents = stress
    .filter(s => s.highStressLevel + s.mediumStressLevel + s.lowStressLevel + s.restStressLevel > 0)
    .map(s => {
      const total = s.highStressLevel + s.mediumStressLevel + s.lowStressLevel + s.restStressLevel;
      return (s.highStressLevel / total) * 100;
    });
  const lowStressPercents = stress
    .filter(s => s.highStressLevel + s.mediumStressLevel + s.lowStressLevel + s.restStressLevel > 0)
    .map(s => {
      const total = s.highStressLevel + s.mediumStressLevel + s.lowStressLevel + s.restStressLevel;
      return ((s.lowStressLevel + s.restStressLevel) / total) * 100;
    });

  // Body battery statistics
  const bbCharged = bodyBattery.map(b => b.charged);
  const bbDrained = bodyBattery.map(b => b.drained);
  const bbEndLevel = bodyBattery.map(b => b.endLevel);
  const bbHighest = bodyBattery.map(b => b.highestLevel);

  // Heart rate statistics
  const hrResting = heartRate.map(h => h.restingHeartRate);
  const hrMin = heartRate.map(h => h.minHeartRate);
  const hrMax = heartRate.map(h => h.maxHeartRate);

  // Activity statistics
  const activityCalories = activities.map(a => a.calories);
  const activityDurations = activities.map(a => a.duration / 60); // Convert to minutes

  // Calculate active days per week
  const activityDates = new Set(
    activities.map(a => a.startTimeLocal.split('T')[0])
  );
  const totalDays = Math.max(1,
    (new Date(dateRange.end).getTime() - new Date(dateRange.start).getTime()) / (1000 * 60 * 60 * 24)
  );
  const activeDaysPerWeek = Math.round((activityDates.size / totalDays) * 7 * 10) / 10;

  return {
    id: uuidv4(),
    calculatedAt: new Date().toISOString(),
    periodStart: dateRange.start,
    periodEnd: dateRange.end,
    daysIncluded: Math.round(totalDays),
    sleep: {
      durationHours: calculateStats(sleepDurations),
      sleepScore: calculateStats(sleepScores),
      deepSleepPercent: calculateStats(deepSleepPercents),
      remSleepPercent: calculateStats(remSleepPercents),
      restingHR: calculateStats(sleepRestingHRs),
    },
    stress: {
      overallLevel: calculateStats(overallStress),
      highStressPercent: calculateStats(highStressPercents),
      lowStressPercent: calculateStats(lowStressPercents),
    },
    bodyBattery: {
      charged: calculateStats(bbCharged),
      drained: calculateStats(bbDrained),
      endLevel: calculateStats(bbEndLevel),
      highestLevel: calculateStats(bbHighest),
    },
    heartRate: {
      resting: calculateStats(hrResting),
      min: calculateStats(hrMin),
      max: calculateStats(hrMax),
    },
    activity: {
      dailyCalories: calculateStats(activityCalories),
      sessionDuration: calculateStats(activityDurations),
      activeDaysPerWeek,
      totalActivities: activities.length,
    },
  };
}

export interface DailyComparison {
  metric: string;
  label: string;
  todayValue: number | null;
  todayFormatted: string;
  avgValue: number;
  avgFormatted: string;
  percentDiff: number;
  trend: 'better' | 'worse' | 'same';
  unit: string;
}

export function compareDayToStats(
  dayData: GarminHealthData,
  stats: CloudStatistics
): DailyComparison[] {
  const comparisons: DailyComparison[] = [];

  const lastSleep = dayData.sleep[0];
  const lastStress = dayData.stress[0];
  const lastBB = dayData.bodyBattery[0];
  const lastHR = dayData.heartRate[0];

  // Sleep duration
  if (lastSleep) {
    const todayHours = lastSleep.sleepTimeSeconds / 3600;
    const avgHours = stats.sleep.durationHours.avg;
    const diff = ((todayHours - avgHours) / avgHours) * 100;
    comparisons.push({
      metric: 'sleepDuration',
      label: 'Sleep Duration',
      todayValue: todayHours,
      todayFormatted: `${Math.floor(todayHours)}h ${Math.round((todayHours % 1) * 60)}m`,
      avgValue: avgHours,
      avgFormatted: `${Math.floor(avgHours)}h ${Math.round((avgHours % 1) * 60)}m`,
      percentDiff: Math.round(diff),
      trend: diff > 5 ? 'better' : diff < -5 ? 'worse' : 'same',
      unit: 'hours',
    });
  }

  // Sleep score
  if (lastSleep?.sleepScore !== null) {
    const today = lastSleep.sleepScore!;
    const avg = stats.sleep.sleepScore.avg;
    const diff = ((today - avg) / avg) * 100;
    comparisons.push({
      metric: 'sleepScore',
      label: 'Sleep Score',
      todayValue: today,
      todayFormatted: `${today}`,
      avgValue: avg,
      avgFormatted: `${Math.round(avg)}`,
      percentDiff: Math.round(diff),
      trend: diff > 5 ? 'better' : diff < -5 ? 'worse' : 'same',
      unit: 'points',
    });
  }

  // Stress level (lower is better)
  if (lastStress) {
    const today = lastStress.overallStressLevel;
    const avg = stats.stress.overallLevel.avg;
    const diff = ((today - avg) / avg) * 100;
    comparisons.push({
      metric: 'stressLevel',
      label: 'Stress Level',
      todayValue: today,
      todayFormatted: `${today}`,
      avgValue: avg,
      avgFormatted: `${Math.round(avg)}`,
      percentDiff: Math.round(diff),
      trend: diff < -5 ? 'better' : diff > 5 ? 'worse' : 'same', // Lower is better
      unit: '',
    });
  }

  // Body battery charged
  if (lastBB) {
    const today = lastBB.charged;
    const avg = stats.bodyBattery.charged.avg;
    const diff = ((today - avg) / avg) * 100;
    comparisons.push({
      metric: 'bodyBatteryCharged',
      label: 'Body Battery Charged',
      todayValue: today,
      todayFormatted: `${today}`,
      avgValue: avg,
      avgFormatted: `${Math.round(avg)}`,
      percentDiff: Math.round(diff),
      trend: diff > 5 ? 'better' : diff < -5 ? 'worse' : 'same',
      unit: '',
    });
  }

  // Resting heart rate (lower is often better)
  if (lastHR) {
    const today = lastHR.restingHeartRate;
    const avg = stats.heartRate.resting.avg;
    const diff = ((today - avg) / avg) * 100;
    comparisons.push({
      metric: 'restingHR',
      label: 'Resting Heart Rate',
      todayValue: today,
      todayFormatted: `${today} bpm`,
      avgValue: avg,
      avgFormatted: `${Math.round(avg)} bpm`,
      percentDiff: Math.round(diff),
      trend: diff < -3 ? 'better' : diff > 3 ? 'worse' : 'same', // Lower is typically better
      unit: 'bpm',
    });
  }

  return comparisons;
}
