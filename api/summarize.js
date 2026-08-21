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

  const wordCounts = {
    short: 'about 50-75 words',
    medium: 'about 150-200 words',
    long: 'about 300-400 words'
  };

  const systemPrompt = `You are a professional document summarizer and analyst. 
Your task is to summarize and analyze the provided text.
Produce a ${wordCounts[length]} summary.
You MUST return your response as a valid JSON object with EXACTLY this structure:
{
  "summaryParagraphs": ["First short paragraph...", "Second short paragraph..."],
  "keyPoints": [
    {
      "title": "Short title of the point",
      "details": "A 1-2 sentence deeper explanation of this specific point."
    }
  ],
  "improvementSuggestions": [
    "Suggestion 1 on how the document's clarity, tone, or content could be improved.",
    "Suggestion 2..."
  ]
}
Break the summary into highly readable paragraphs. Never return one massive block of text. Ensure you highlight the key points and main ideas.`;

  try {
    // 5. Call Gemini API endpoint
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'GEMINI_API_KEY not configured.', fallback: true });
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${systemPrompt}\n\nHere is the text:\n\n${safeText}` }]
        }],
        generationConfig: {
          temperature: 0.3,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Gemini API Error:', errorData);
      return res.status(502).json({ 
        error: `Failed to generate summary from LLM: ${errorData?.error?.message || 'Unknown error'}`, 
        fallback: true 
      });
    }

    const data = await response.json();
    
    // Gemini returns text inside data.candidates[0].content.parts[0].text
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new Error("No content returned from Gemini API");
    }

    // 6. Parse JSON safely (Gemini usually returns clean JSON due to responseMimeType, but we keep our robust parser just in case)
    let parsed = null;
    try {
      // Scan backwards from the end of the text to find the last valid JSON object
      for (let i = content.length - 1; i >= 0; i--) {
        if (content[i] === '}') {
          let openBraces = 0;
          let firstBrace = -1;
          for (let j = i; j >= 0; j--) {
            if (content[j] === '}') openBraces++;
            if (content[j] === '{') openBraces--;
            if (openBraces === 0) {
              firstBrace = j;
              break;
            }
          }
          
          if (firstBrace !== -1) {
            const potentialJson = content.substring(firstBrace, i + 1);
            try {
              const obj = JSON.parse(potentialJson);
              if (obj && obj.summaryParagraphs && Array.isArray(obj.summaryParagraphs)) {
                parsed = obj;
                break;
              }
            } catch (e) {
              // Ignore parse errors, keep searching
            }
          }
        }
      }

      if (!parsed) {
        throw new Error("No JSON object found.");
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
