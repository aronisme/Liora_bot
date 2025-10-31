export type ChatMsg = { role: 'system'|'user'|'assistant', content: string };

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

export async function aiChatOpenRouter(messages: ChatMsg[], apiKey: string, model = 'google/gemini-2.0-flash-exp:free'): Promise<string> {
  const res = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://vercel.app',
      'X-Title': 'Liora Telegram Webhook'
    },
    body: JSON.stringify({ model, messages, stream: false })
  });
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? '';
}

export async function detectWorkAI(text: string, apiKey: string): Promise<boolean> {
  const sys: ChatMsg = {
    role: 'system',
    content: 'Klasifikator: Balas hanya "YA" jika teks terkait pekerjaan microstock/produksi konten/upload/metadata/laporan kerja; selain itu balas "TIDAK".'
  };
  const user: ChatMsg = { role: 'user', content: text };
  const out = await aiChatOpenRouter([sys, user], apiKey, 'mistralai/mistral-7b-instruct');
  return /^ya\b/i.test(out.trim());
}

export async function formatReportAI(text: string, apiKey: string, whenISO?: string): Promise<string> {
  const sys: ChatMsg = {
    role: 'system',
    content: 'Formatkan laporan kerja microstock ke poin: - Tanggal: - Kegiatan: - Proses: - Masalah: - Tugas: - Progres: - Catatan lain:. Gunakan Bahasa Indonesia ringkas.'
  };
  const user: ChatMsg = { role: 'user', content: `Datetime: ${whenISO || new Date().toISOString()}\n\nIsi laporan:\n${text}` };
  return (await aiChatOpenRouter([sys, user], apiKey, 'llama-3.3-70b-versatile')).trim();
}

export async function mergeReportsAI(oldReport: string, newReport: string, apiKey: string, whenISO?: string): Promise<string> {
  const sys: ChatMsg = {
    role: 'system',
    content: 'Gabungkan "laporan lama" + "laporan baru" tanpa duplikasi. Jaga format poin: - Tanggal: - Kegiatan: - Proses: - Masalah: - Tugas: - Progres: - Catatan lain: (Bahasa Indonesia).'
  };
  const user: ChatMsg = { role: 'user', content: `Datetime: ${whenISO || new Date().toISOString()}\n\nLaporan lama:\n${oldReport}\n\nLaporan baru:\n${newReport}` };
  return (await aiChatOpenRouter([sys, user], apiKey, 'llama-3.3-70b-versatile')).trim();
}

export async function replyGeneric(text: string, apiKey: string): Promise<string> {
  const sys: ChatMsg = { role: 'system', content: 'Nama asisten: Liora. Gaya Gen Z, visioner, opini tegas. Bahasa: Indonesia.' };
  const user: ChatMsg = { role: 'user', content: text };
  return (await aiChatOpenRouter([sys, user], apiKey)).trim();
}
