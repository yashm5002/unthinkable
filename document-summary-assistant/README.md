# Document Summary Assistant

A modern, full-stack web application that allows users to upload PDFs or image scans, extracts the text entirely in the browser, and generates a smart, AI-powered summary using the Groq API. 

## Features
- **Client-Side Text Extraction**: Extracts text from PDFs using `pdfjs-dist` and from images (OCR) using `tesseract.js` directly in the browser, ensuring user documents are not sent to any backend server for parsing.
- **Smart Summarization**: Uses a Vercel Serverless Function to securely communicate with the Groq API (LLM) to generate concise summaries.
- **Length Toggles**: Users can seamlessly switch between Short, Medium, and Long summaries.
- **Offline Fallback**: If the Groq API key is missing or the network fails, the app automatically falls back to an offline TF-IDF inspired local summarization algorithm.
- **Responsive UI**: Built with Tailwind CSS for a professional, minimal, and fully mobile-responsive design.

## Tech Stack
- **Frontend**: React 18 + Vite (Chosen for fast development, HMR, and optimal production builds).
- **Styling**: Tailwind CSS (Chosen for rapid UI development and ensuring consistent, responsive design without external UI libraries).
- **PDF Extraction**: `pdfjs-dist` (Chosen because it's the industry standard for robust, client-side PDF parsing).
- **Image Extraction**: `tesseract.js` (Chosen as it allows powerful OCR in the browser via WebAssembly without external dependencies).
- **Backend**: Vercel Serverless Functions (`/api/summarize.js`).
- **LLM API**: Groq (Chosen for its extremely fast inference).

### Why the API Key is Server-Side
The application routes summarization requests through a serverless function (`/api/summarize.js`) instead of calling the Groq API directly from the React frontend. **Security** is the primary reason for this: API keys bundled in frontend JavaScript are publicly readable by anyone inspecting the site's network traffic or source code. By keeping the `GROQ_API_KEY` exclusively as a server-side environment variable, we ensure it cannot be leaked or abused by malicious actors.

## Setup Instructions

1. **Get a Groq API Key**: 
   - Visit the [Groq Console](https://console.groq.com/keys) and create a free account.
   - Generate a new API Key.

2. **Clone and Install**:
   ```bash
   git clone <your-repo-url>
   cd document-summary-assistant
   npm install
   ```

3. **Configure Environment Variables**:
   - Create a file named `.env.local` in the root of the project (this is `.gitignore`d).
   - Add your key: `GROQ_API_KEY=your_actual_key_here`

4. **Run Locally**:
   ```bash
   npm run dev
   ```
   *Note: If you run the app without setting up the `.env.local` file, the app will gracefully use the offline fallback summarizer.*

## Deployment (Vercel)

1. Push this repository to GitHub.
2. Log into [Vercel](https://vercel.com/) and click "Add New... Project".
3. Import your GitHub repository.
4. In the "Environment Variables" section of the deployment configuration, add:
   - Name: `GROQ_API_KEY`
   - Value: `<your-groq-api-key>`
5. Click **Deploy**. Vercel will automatically build the Vite app and set up the serverless function.

## Known Limitations
- **Rate Limiting**: The serverless function currently uses a simple in-memory rate limiter to prevent basic abuse. In a high-traffic production environment, this should be replaced with a robust solution like Redis (Upstash) or Vercel KV, as in-memory state is not shared across serverless function instances.
- **OCR Accuracy**: Tesseract.js is powerful but OCR accuracy depends heavily on scan quality, lighting, and contrast.
- **Offline Fallback**: The offline summarizer uses a basic term-frequency heuristic. While it guarantees the app never breaks, it does not understand context as well as an LLM.

## Approach

*For submission review*

When designing the Document Summary Assistant, my priority was creating a resilient, production-ready pipeline that handles the inherent unreliability of file parsing and network requests. I chose React and Vite for a fast, modern foundation, paired with Tailwind for a clean, professional aesthetic. 

For the core challenge of text extraction, I implemented `pdfjs-dist` and `tesseract.js` strictly on the client side. This not only saves server costs and bandwidth but also ensures the user's raw files never leave their device. I wrapped these extractions in robust error handling, providing clear user feedback and progress bars during the heavy WebAssembly OCR processing. 

To integrate AI securely, I built a Vercel serverless function (`/api/summarize.js`). This acts as a secure proxy to the Groq API, preventing the leakage of the `GROQ_API_KEY` to the browser while enforcing basic rate limits and input sanitization. Recognizing that APIs can fail or reviewers might not configure a key, I engineered an offline fallback—a custom term-frequency (TF-IDF inspired) summarizer in pure JavaScript. If the API returns a 503 or a network error, the app instantly falls back to this local logic, ensuring a seamless, unbreakable user experience. Every state—empty, loading, error, and success—is visually distinct, delivering a complete, polished product.
