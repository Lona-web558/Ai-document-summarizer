require('dotenv').config();
const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const MAX_CHARS = 120000;

app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname)));

const LENGTHS = { short: 3, medium: 6, long: 10 }; // sentences / bullets

async function extractText(file) {
  const name = file.originalname.toLowerCase();
  if (name.endsWith('.pdf')) return (await pdf(file.buffer)).text;
  if (/\.(txt|md|csv|html?)$/.test(name)) return file.buffer.toString('utf8');
  throw new Error('Unsupported file type. Use PDF, TXT, or MD.');
}

// Fallback: frequency-based extractive summarizer (no API key needed)
function extractive(text, count, style) {
  const sentences = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(\s|$)/g)?.map(s => s.trim()) || [text];
  const stop = new Set('the a an and or but of to in on for with is are was were be been it this that as at by from not have has had will would can could their they them its which who what when where how'.split(' '));
  const freq = {};
  sentences.join(' ').toLowerCase().match(/[a-z']{3,}/g)?.forEach(w => { if (!stop.has(w)) freq[w] = (freq[w] || 0) + 1; });
  const scored = sentences.map((s, i) => {
    const words = s.toLowerCase().match(/[a-z']{3,}/g) || [];
    const score = words.reduce((n, w) => n + (freq[w] || 0), 0) / Math.sqrt(words.length || 1);
    return { s, i, score: words.length < 5 ? 0 : score };
  });
  const top = scored.sort((a, b) => b.score - a.score).slice(0, count).sort((a, b) => a.i - b.i).map(x => x.s);
  return style === 'bullets' ? top.map(s => '- ' + s).join('\n') : top.join(' ');
}

async function aiSummary(text, count, style) {
  const format = style === 'bullets' ? `exactly ${count} concise bullet points (each starting with "- ")` : `a clear summary of about ${count} sentences`;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
      max_tokens: 1000,
      system: 'You summarize documents faithfully. Only use information in the document. Output the summary only, no preamble.',
      messages: [{ role: 'user', content: `Summarize the document below as ${format}.\n\n<document>\n${text}\n</document>` }]
    })
  });
  if (!res.ok) throw new Error(`AI service error (${res.status})`);
  const data = await res.json();
  return data.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}

app.post('/api/summarize', upload.single('file'), async (req, res) => {
  try {
    let text = req.file ? await extractText(req.file) : (req.body.text || '');
    text = text.trim().slice(0, MAX_CHARS);
    if (text.split(/\s+/).length < 30) return res.status(400).json({ error: 'Add at least 30 words to summarize.' });

    const count = LENGTHS[req.body.length] || LENGTHS.medium;
    const style = req.body.style === 'bullets' ? 'bullets' : 'paragraph';
    let summary, mode = 'extractive';
    if (process.env.ANTHROPIC_API_KEY) {
      try { summary = await aiSummary(text, count, style); mode = 'ai'; }
      catch (e) { console.error(e.message); }
    }
    if (!summary) summary = extractive(text, count, style);

    const wc = s => s.trim().split(/\s+/).length;
    res.json({ summary, mode, originalWords: wc(text), summaryWords: wc(summary) });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Summarizer running at http://localhost:${PORT}`));
