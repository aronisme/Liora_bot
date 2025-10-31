// == Liora GAS Web App ==
function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    var msg = (body.message && body.message.text) || (body.edited_message && body.edited_message.text) || '';
    var chatId = (body.message && body.message.chat.id) || (body.edited_message && body.edited_message.chat.id);
    if (!msg || !chatId) return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON);

    var token = PropertiesService.getScriptProperties().getProperty('TELEGRAM_TOKEN');
    var orKey = PropertiesService.getScriptProperties().getProperty('OPENROUTER_KEY');
    var sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');

    if (/^\/start\b/i.test(msg)) {
      telegramSend(token, chatId, 'Hai, gue Liora (GAS). Kirim chat kerjaan untuk update Laporan Abadi.\nPerintah: /lihatlaporan , /resetlaporan');
      return jsonOK();
    }

    if (/^\/lihatlaporan\b/i.test(msg)) {
      var report = readReport(sheetId);
      telegramSend(token, chatId, '📄 <b>Laporan Abadi</b>\n\n<pre>' + escapeHtml(report.substring(0, 3900)) + '</pre>');
      return jsonOK();
    }

    if (/^\/resetlaporan\b/i.test(msg)) {
      writeReport(sheetId, '- Tanggal:\n- Kegiatan:\n- Proses:\n- Masalah:\n- Tugas:\n- Progres:\n- Catatan lain:');
      telegramSend(token, chatId, '✅ Laporan Abadi di-reset.');
      return jsonOK();
    }

    var isWork = detectWork(orKey, msg);
    if (isWork) {
      var now = new Date().toISOString();
      var formatted = formatReport(orKey, msg, now);
      var oldReport = readReport(sheetId);
      var merged = mergeReport(orKey, oldReport, formatted, now);
      writeReport(sheetId, merged);
      telegramSend(token, chatId, '📄 Laporan abadi diperbarui otomatis.');
    } else {
      var out = aiReply(orKey, msg);
      telegramSend(token, chatId, out.substring(0, 3900));
    }
    return jsonOK();
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok:false, error: String(err) })).setMimeType(ContentService.MimeType.JSON);
  }
}

function detectWork(orKey, text) {
  var out = openrouter(orKey, 'mistralai/mistral-7b-instruct', [
    {role:'system', content:'Balas hanya "YA" jika teks terkait pekerjaan microstock/produksi konten/upload/metadata/laporan kerja, selain itu "TIDAK".'},
    {role:'user', content:text}
  ]);
  return /^ya\b/i.test(out.trim());
}

function formatReport(orKey, text, whenISO) {
  return openrouter(orKey, 'llama-3.3-70b-versatile', [
    {role:'system', content:'Formatkan laporan ke poin: - Tanggal: - Kegiatan: - Proses: - Masalah: - Tugas: - Progres: - Catatan lain:. Bahasa Indonesia ringkas.'},
    {role:'user', content:'Datetime: '+whenISO+'\n\nIsi laporan:\n'+text}
  ]).trim();
}

function mergeReport(orKey, oldReport, newReport, whenISO) {
  return openrouter(orKey, 'llama-3.3-70b-versatile', [
    {role:'system', content:'Gabungkan laporan lama + baru tanpa duplikasi. Pertahankan format poin yang sama (Bahasa Indonesia).'},
    {role:'user', content:'Datetime: '+whenISO+'\n\nLaporan lama:\n'+oldReport+'\n\nLaporan baru:\n'+newReport}
  ]).trim();
}

function aiReply(orKey, text) {
  return openrouter(orKey, 'google/gemini-2.0-flash-exp:free', [
    {role:'system', content:'Nama asisten: Liora. Gaya Gen Z, visioner, opini tegas. Bahasa: Indonesia.'},
    {role:'user', content:text}
  ]).trim();
}

// ---- OpenRouter client ----
function openrouter(key, model, messages) {
  var url = 'https://openrouter.ai/api/v1/chat/completions';
  var payload = { model: model, messages: messages, stream: false };
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    headers: { 'Authorization': 'Bearer '+key, 'HTTP-Referer':'https://script.google.com', 'X-Title':'Liora GAS' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() >= 300) throw new Error('OpenRouter '+res.getResponseCode()+': '+res.getContentText());
  var data = JSON.parse(res.getContentText());
  return (data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) || '';
}

// ---- Sheets helpers ----
function readReport(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sh = ss.getSheetByName('LaporanAbadi') || ss.insertSheet('LaporanAbadi');
  var rng = sh.getDataRange();
  var vals = rng.getValues();
  if (!vals || vals.length === 0) return '';
  var lines = [];
  for (var i=0;i<vals.length;i++){ lines.push((vals[i][0]||'').toString()); }
  return lines.join('\n');
}

function writeReport(sheetId, text) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sh = ss.getSheetByName('LaporanAbadi') || ss.insertSheet('LaporanAbadi');
  sh.clearContents();
  var lines = text.split(/\r?\n/);
  var data = lines.map(function(l){ return [l]; });
  sh.getRange(1,1,data.length,1).setValues(data);
}

// ---- Telegram helper ----
function telegramSend(token, chatId, text) {
  var url = 'https://api.telegram.org/bot'+token+'/sendMessage';
  UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML', disable_web_page_preview: true }),
    muteHttpExceptions: true
  });
}

// ---- Utils ----
function jsonOK(){ return ContentService.createTextOutput(JSON.stringify({ok:true})).setMimeType(ContentService.MimeType.JSON); }
function escapeHtml(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
