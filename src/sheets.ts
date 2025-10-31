import { google } from 'googleapis';

export async function getSheetsClient(email: string, privateKey: string) {
  const key = privateKey.replace(/\\n/g, '\n');
  const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
  const sheets = google.sheets({ version: 'v4', auth });
  return sheets;
}

export async function readReportSheet(spreadsheetId: string, sheetsClient: any, range = 'LaporanAbadi!A:G'): Promise<string> {
  const res = await sheetsClient.spreadsheets.values.get({ spreadsheetId, range });
  const values = res.data.values || [];
  if (!values.length) return '';
  return values.map((row: string[]) => row.join(' ')).join('\n');
}

export async function writeReportSheet(spreadsheetId: string, sheetsClient: any, mergedReport: string, range = 'LaporanAbadi!A1') {
  const lines = mergedReport.split(/\r?\n/);
  const body = { values: lines.map((l: string) => [l]) };
  await sheetsClient.spreadsheets.values.update({
    spreadsheetId,
    range,
    valueInputOption: 'RAW',
    requestBody: body
  });
}
