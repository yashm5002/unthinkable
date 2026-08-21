// Vercel Serverless Function for Groq API integration
// Kept server-side to protect the GROQ_API_KEY from being exposed to the client.

import jwt from 'jsonwebtoken';

const MAX_TEXT_LENGTH = 12000; // Cap input (approx 3000 tokens) to avoid LLM token limits
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev_only';

// Extremely basic in-memory rate limiter for demo purposes
// Note: In production, use Redis (e.g., Upstash) or Vercel KV for global rate limiting
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW_MS = 60000;
const MAX_REQUESTS_PER_WINDOW = 10;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Auth Check
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  
  const token = authHeader.split(' ')[1];
  try {
    jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token. Please log in again.' });
  }

  // 1. Rate Limiting Check (Simple in-memory check)
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const currentTime = Date.now();
  const userRate = rateLimitMap.get(ip) || { count: 0, startTime: currentTime };

  if (currentTime - userRate.startTime > RATE_LIMIT_WINDOW_MS) {
    userRate.count = 1;
    userRate.startTime = currentTime;
  } else {
    userRate.count++;
  }
  rateLimitMap.set(ip, userRate);

  if (userRate.count > MAX_REQUESTS_PER_WINDOW) {
    return res.status(429).json({ error: 'Too many requests. Please try again later.', fallback: true });
  }

  // 2. Input Validation
  const { text, length = 'short' } = req.body;

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'Valid text input is required.' });
  }

  // Trim text defensively to avoid exceeding model context window or timing out
  const safeText = text.substring(0, MAX_TEXT_LENGTH);

  // 3. Environment Check
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey === 'your_key_here') {
    // Signal to the frontend to use the offline fallback gracefully
    return res.status(503).json({ error: 'GROQ_API_KEY not configured.', fallback: true });
  }

  // 4. Construct Prompt
  const lengthGuides = {
    short: 'about 50-75 words',
    long: 'about 300-400 words'
  };

  const systemPrompt = `You are a professional document summarizer. 
Your task is to summarize the provided text in a ${length} length (${lengthGuides[length]}).

You MUST return your response as a valid JSON object with EXACTLY this structure:
{
  "summaryParagraphs": ["..."],
  "keyPoints": [{ "title": "...", "details": "..." }]
}
Break the summary paragraphs into highly readable blocks. Never return one massive block of text. Do not include any other text, markdown blocks, or explanation outside the JSON object.`;

  try {
    // 5. Call Groq API Chat Completions Endpoint
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b', // Updated to valid replacement model

        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the text:\n\n${safeText}` }
        ],
        response_format: { type: 'json_object' }, // Enforce JSON response
        temperature: 0.3,
        max_tokens: 1500
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Groq API Error:', errorData);
      return res.status(502).json({ 
        error: `Failed to generate summary from LLM: ${errorData?.error?.message || 'Unknown error'}`, 
        fallback: true 
      });
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // 6. Parse JSON safely
    let parsed;
    try {
      parsed = JSON.parse(content);
      // Ensure required fields exist
      if (!parsed.summaryParagraphs) {
        throw new Error("Invalid JSON schema returned by LLM, missing summaryParagraphs");
      }
    } catch (err) {
      console.error('Failed to parse LLM JSON:', err, 'Content:', content);
      return res.status(500).json({ error: 'Received malformed response from LLM.', fallback: true });
    }

    // Return the summary object
    return res.status(200).json(parsed);

  } catch (error) {
    console.error('Summarization Error:', error);
    return res.status(500).json({ error: 'Internal server error during summarization.', fallback: true });
  }
}
