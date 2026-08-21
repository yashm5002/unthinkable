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
  const { text, length = 'long' } = req.body;

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

Respond ONLY with a valid JSON object matching this exact schema:
{
  "summaryParagraphs": ["string", "string"],
  "keyPoints": [
    { "title": "string", "details": "string" }
  ]
}

CRITICAL INSTRUCTIONS:
1. Break the summary paragraphs into highly readable blocks.
2. Return ONLY the raw JSON object.
3. DO NOT wrap the output in markdown blocks (e.g. \`\`\`json).
4. DO NOT include any conversational text before or after the JSON.
5. The output must begin exactly with '{' and end exactly with '}'.
6. Ensure all JSON strings are properly escaped. Do not use unescaped double quotes inside strings.`;

  try {
    // 5. Call Groq API Chat Completions Endpoint
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b', // Switch to Qwen which has superior JSON generation for long outputs

        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the text:\n\n${safeText}\n\nIMPORTANT: Output ONLY a valid JSON object matching the requested schema. Ensure all quotes inside text are escaped.` }
        ],
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

    // 6. Parse JSON safely, stripping out <think> tags or conversational filler
    let parsed;
    try {
      let cleanContent = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      const firstBrace = cleanContent.indexOf('{');
      const lastBrace = cleanContent.lastIndexOf('}');
      
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
        cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
      } else {
        throw new Error("No JSON object found in response");
      }
      
      parsed = JSON.parse(cleanContent);
      
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
