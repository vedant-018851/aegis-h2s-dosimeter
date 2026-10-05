// ============================================================================
// Export service (spec §22): CSV export + JSON backup.
// ============================================================================

import type { ExportRow, Measurement } from '../types';

export function measurementsToExportRows(measurements: Measurement[]): ExportRow[] {
  return measurements.map((m) => ({
    workerId: m.workerId ?? '',
    shiftId: m.shiftId ?? '',
    wristbandId: m.wristbandId ?? '',
    timestamp: new Date(m.timestamp).toISOString(),
    dose: m.dose?.doseEstimate ?? '',
    lowerRange: m.dose?.lowerBound ?? '',
    upperRange: m.dose?.upperBound ?? '',
    confidence: m.dose?.confidenceLabel ?? '',
    badgeValidity: m.expiry.status,
    imageQuality: m.imageQuality.score,
    calibrationVersion: m.calibrationModelVersion,
    simulationFlag: m.isSimulated,
    captureMethod: m.captureMethod ?? '',
    alignmentMethod: m.alignmentMethod ?? '',
    rejectionCode: m.rejectionCode ?? '',
  }));
}

const CSV_HEADERS: Array<keyof ExportRow> = [
  'workerId',
  'shiftId',
  'wristbandId',
  'timestamp',
  'dose',
  'lowerRange',
  'upperRange',
  'confidence',
  'badgeValidity',
  'imageQuality',
  'calibrationVersion',
  'simulationFlag',
  'captureMethod',
  'alignmentMethod',
  'rejectionCode',
];

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export function rowsToCsv(rows: ExportRow[]): string {
  const header = CSV_HEADERS.join(',');
  const lines = rows.map((row) => CSV_HEADERS.map((h) => escapeCsvCell(row[h])).join(','));
  return [header, ...lines].join('\n');
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMeasurementsCsv(measurements: Measurement[]) {
  const rows = measurementsToExportRows(measurements);
  const csv = rowsToCsv(rows);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadBlob(csv, `aegis-h2s-measurements-${stamp}.csv`, 'text/csv;charset=utf-8');
}

export function exportJsonBackup(data: Record<string, unknown>) {
  const json = JSON.stringify(data, null, 2);
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
  downloadBlob(json, `aegis-h2s-backup-${stamp}.json`, 'application/json');
}
