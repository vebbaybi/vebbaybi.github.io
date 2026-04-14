import http from 'node:http';

const port = Number(process.env.PORT || 8787);
const model = process.env.OPENAI_MODEL || 'gpt-5.4-mini';
const apiKey = process.env.OPENAI_API_KEY || '';

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST,OPTIONS',
  });
  res.end(JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch (error) { reject(error); } });
    req.on('error', reject);
  });
}

function extractText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  return (Array.isArray(data?.output) ? data.output : []).flatMap((item) => Array.isArray(item?.content) ? item.content : []).map((part) => part?.text || '').join(' ').trim() || 'eos bridge completed, but no text payload was returned.';
}

function buildPrompt(payload) {
  return [
    `question: ${payload.question || ''}`,
    `current_route: ${payload.siteContext?.currentRoute || ''}`,
    `current_module: ${payload.siteContext?.currentModule?.title || ''}`,
    `site_pages: ${JSON.stringify(payload.siteContext?.pages || [])}`,
    `site_uploads: ${JSON.stringify(payload.siteContext?.uploads || [])}`,
    `web_results: ${JSON.stringify(payload.webResults || [])}`,
    `commands: ${JSON.stringify(payload.commands || [])}`,
  ].join('\n');
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') return sendJson(res, 204, {});
  if (req.method !== 'POST' || req.url !== '/api/eos/chat') return sendJson(res, 404, { error: 'Not found' });
  if (!apiKey) return sendJson(res, 500, { error: 'Missing OPENAI_API_KEY on the server.' });

  try {
    const payload = await readJson(req);
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: 'You are eos, the shark operator for the1807.xyz. Answer with concise helpful guidance, prefer commands that begin with eos, use the provided site context first, and only rely on web results when relevant.',
        input: buildPrompt(payload),
      }),
    });

    const data = await response.json();
    if (!response.ok) return sendJson(res, response.status, { error: data?.error?.message || 'OpenAI request failed.' });
    sendJson(res, 200, { text: extractText(data), actions: Array.isArray(payload.commands) ? payload.commands.slice(0, 3).map((command) => ({ type: 'command', label: command.syntax || command.name, value: command.syntax || `eos ${command.name}` })) : [] });
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Bridge failure.' });
  }
});

server.listen(port, () => {
  console.log(`eos bridge example listening on http://localhost:${port}/api/eos/chat`);
});

