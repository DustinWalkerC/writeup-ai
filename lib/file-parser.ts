import * as XLSX from 'xlsx';

export interface ParsedFileResult {
  success: boolean;
  content: string;
  metadata: {
    fileName: string;
    fileType: string;
    sheetNames?: string[];
    rowCount?: number;
    error?: string;
  };
}

export async function parseUploadedFile(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<ParsedFileResult> {
  const ext = fileName.split('.').pop()?.toLowerCase();

  try {
    switch (ext) {
      case 'xlsx':
      case 'xls':
        return parseExcelFile(fileBuffer, fileName);
      case 'csv':
        return parseCsvFile(fileBuffer, fileName);
      case 'pdf':
        return await parsePdfFile(fileBuffer, fileName);
      case 'txt':
        return parseTextFile(fileBuffer, fileName);
      default:
        return {
          success: false, content: '',
          metadata: { fileName, fileType: ext || 'unknown', error: `Unsupported: .${ext}` }
        };
    }
  } catch (error) {
    return {
      success: false, content: '',
      metadata: { fileName, fileType: ext || 'unknown', error: `Parse failed: ${error instanceof Error ? error.message : 'Unknown'}` }
    };
  }
}

function parseExcelFile(buffer: Buffer, fileName: string): ParsedFileResult {
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  let fullContent = '';
  let totalRows = 0;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_csv(sheet, { blankrows: false, rawNumbers: false });
    const rows = data.split('\n').filter(row => row.trim());
    totalRows += rows.length;
    fullContent += `\n=== Sheet: ${sheetName} ===\n${data}\n`;
  }

  return {
    success: true, content: fullContent.trim(),
    metadata: { fileName, fileType: 'excel', sheetNames: workbook.SheetNames, rowCount: totalRows }
  };
}

function parseCsvFile(buffer: Buffer, fileName: string): ParsedFileResult {
  const content = buffer.toString('utf-8');
  return {
    success: true, content,
    metadata: { fileName, fileType: 'csv', rowCount: content.split('\n').filter(r => r.trim()).length }
  };
}

async function parsePdfFile(buffer: Buffer, fileName: string): Promise<ParsedFileResult> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    return {
      success: true, content: data.text,
      metadata: { fileName, fileType: 'pdf', rowCount: data.numpages }
    };
  } catch (error) {
    return {
      success: false, content: '',
      metadata: { fileName, fileType: 'pdf', error: `PDF parse failed: ${error instanceof Error ? error.message : 'Unknown'}` }
    };
  }
}

function parseTextFile(buffer: Buffer, fileName: string): ParsedFileResult {
  const content = buffer.toString('utf-8');
  return {
    success: true, content,
    metadata: { fileName, fileType: 'text', rowCount: content.split('\n').length }
  };
}

export function validateT12Month(
  content: string, selectedMonth: number, selectedYear: number
): { valid: boolean; message: string } {
  const monthAbbrs = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const monthFull = ['january','february','march','april','may','june','july','august','september','october','november','december'];
  const target = monthAbbrs[selectedMonth - 1];
  const targetFull = monthFull[selectedMonth - 1];
  const lower = content.toLowerCase();

  const hasMonth = lower.includes(target) || lower.includes(targetFull) ||
    lower.includes(`${selectedMonth}/${selectedYear}`) ||
    lower.includes(`${String(selectedMonth).padStart(2,'0')}/${selectedYear}`);

  if (!hasMonth) {
    return { valid: false, message: `Your T-12 doesn't appear to include ${targetFull} ${selectedYear} data. Please upload a T-12 that covers this period.` };
  }
  return { valid: true, message: 'OK' };
}