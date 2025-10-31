import { detectWorkAI, formatReportAI, mergeReportsAI, replyGeneric } from '../src/ai.js';
import { getSheetsClient, readReportSheet, writeReportSheet } from '../src/sheets.js';
import { sendTelegramMessage } from '../src/telegram.js';
export const config = { runtime: 'edge' };

export default async function handler(req: Request) {
  if (req.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

  const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || '';
  const OPENROUTER_KEY = process.env.OPENROUTER_KEY || '';
  const SHEET_ID = process.env.SHEET_ID || '';
  const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '';
  const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY || '';

  try {
    const body = await req.json();
    const msg = body?.message?.text ?? body?.edited_message?.text ?? '';
    const chatId = body?.message?.chat?.id ?? body?.edited_message?.chat?.id;
    if (!msg || !chatId) return new Response(JSON.stringify({ ok: true }), { status: 200 });

    if (/^\/start\b/i.test(msg)) {
      await sendTelegramMessage(TELEGRAM_TOKEN, chatId, 'Hai, gue Liora. Kirim chat kerjaan, gue update <b>Laporan Abadi</b> ke Google Sheets. Perintah: /lihatlaporan /resetlaporan');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (/^\/lihatlaporan\b/i.test(msg)) {
      const sheets = await getSheetsClient(GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
      const report = await readReportSheet(SHEET_ID, sheets);
      const textOut = report ? report.slice(0, 3900) : '(kosong)';
      await sendTelegramMessage(TELEGRAM_TOKEN, chatId, `📄 <b>Laporan Abadi</b>\n\n<pre>${escapeHtml(textOut)}</pre>`);
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    if (/^\/resetlaporan\b/i.test(msg)) {
      const template = "- Tanggal:\n- Kegiatan:\n- Proses:\n- Masalah:\n- Tugas:\n- Progres:\n- Catatan lain:";
      const sheets = await getSheetsClient(GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
      await writeReportSheet(SHEET_ID, sheets, template);
      await sendTelegramMessage(TELEGRAM_TOKEN, chatId, "✅ Laporan Abadi di-reset.");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }

    const isWork = await detectWorkAI(msg, OPENROUTER_KEY);
    if (isWork) {
      const now = new Date().toISOString();
      const formatted = await formatReportAI(msg, OPENROUTER_KEY, now);
      const sheets = await getSheetsClient(GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY);
      const oldReport = await readReportSheet(SHEET_ID, sheets);
      const merged = await mergeReportsAI(oldReport || '', formatted, OPENROUTER_KEY, now);
      await writeReportSheet(SHEET_ID, sheets, merged);
      await sendTelegramMessage(TELEGRAM_TOKEN, chatId, "📄 Laporan abadi diperbarui otomatis.");
    } else {
      const out = await replyGeneric(msg, OPENROUTER_KEY);
      await sendTelegramMessage(TELEGRAM_TOKEN, chatId, out.slice(0, 3900));
    }

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e:any) {
    return new Response(JSON.stringify({ ok: false, error: String(e?.message || e) }), { status: 200 });
  }
}

function escapeHtml(s: string){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
