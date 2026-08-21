// Vercel Serverless Function for Groq API integration
// Kept server-side to protect the GROQ_API_KEY from being exposed to the client.

import jwt from 'jsonwebtoken';

const MAX_TEXT_LENGTH = 5000; // Capped aggressively at ~1200 tokens to easily allow back-to-back requests within the 8000 TPM limit
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
  const { text, length = 'medium' } = req.body;

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

  // Using explicit JSON structure requirement for robust parsing
  const wordCounts = {
    short: 'about 50-75 words',
    medium: 'about 150-200 words',
    long: 'about 300-400 words'
  };

  // Dynamically allocate just enough tokens based on the requested length 
  // so (Input + max_tokens) stays extremely low, allowing back-to-back requests
  const maxTokensMap = {
    short: 300,
    medium: 600,
    long: 1000
  };
  const dynamicMaxTokens = maxTokensMap[length] || 1000;

  const systemPrompt = `You are a professional document summarizer. 
Your task is to summarize the provided text.
Produce a ${wordCounts[length]} summary.
You MUST return your response as a valid JSON object with EXACTLY this structure:
{
  "summaryParagraphs": ["First short paragraph...", "Second short paragraph..."],
  "keyPoints": [
    {
      "title": "Short title of the point",
      "details": "A 1-2 sentence deeper explanation of this specific point."
    }
  ]
}
Break the summary into 2-3 highly readable paragraphs. Never return one massive block of text. Do not include any other text, markdown blocks, or explanation outside the JSON object. 
CRITICAL: You are running in a severely constrained token environment. DO NOT output long <think> blocks. Output the JSON object immediately.`;

  try {
    // 5. Call Groq API Chat Completions Endpoint
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b', // Fast, robust model universally available on Groq
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Here is the text:\n\n${safeText}\n\nIMPORTANT: Output ONLY a valid JSON object matching the requested schema. Ensure all quotes inside text are escaped.` }
        ],
        temperature: 0.3,
        max_tokens: dynamicMaxTokens
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

    // 6. Parse JSON safely, handling unclosed <think> tags and extracting balanced braces
    let parsed;
    try {
      // Strip <think> blocks entirely (even if unclosed due to token limits)
      let cleanContent = content.replace(/<think>[\s\S]*?(?:<\/think>|$)/gi, '').trim();
      
      // Find the LAST balanced JSON object in the remaining text
      let firstBrace = -1;
      let lastBrace = cleanContent.lastIndexOf('}');
      
      if (lastBrace !== -1) {
        let openBraces = 0;
        for (let i = lastBrace; i >= 0; i--) {
          if (cleanContent[i] === '}') openBraces++;
          if (cleanContent[i] === '{') openBraces--;
          if (openBraces === 0) {
            firstBrace = i;
            break;
          }
        }
      }
      
      if (firstBrace !== -1 && lastBrace !== -1) {
        cleanContent = cleanContent.substring(firstBrace, lastBrace + 1);
        parsed = JSON.parse(cleanContent);
      } else {
        throw new Error("No JSON object found. The model may have run out of tokens while thinking.");
      }
      
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
