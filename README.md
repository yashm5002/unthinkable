<div align="center">
  
# 🚀 DocuSumm: AI-Powered Document Intelligence

[![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://docusumm.vercel.app)
[![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Hugging Face](https://img.shields.io/badge/AI-Hugging_Face-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black)](https://huggingface.co/)

**[👉 View Live Demo on Vercel](https://docusumm.vercel.app)** *(Update this link to your actual deployment!)*

A modern, full-stack web application that allows users to upload PDFs or image scans, extracts the text entirely in the browser, and generates deep, actionable AI-powered summaries using the Hugging Face Serverless Inference API.

</div>

---

## ✨ Enterprise-Grade Features

- 🧠 **Advanced AI Analysis**: Powered by **Qwen 2.5 7B Instruct** (`Qwen/Qwen2.5-7B-Instruct:fastest`) via Hugging Face's OpenAI-compatible routing infrastructure.
- 📏 **Dynamic Summarization**: Seamlessly toggle between **Short**, **Medium**, and **Long** summaries. The backend dynamically allocates optimal token budgets to ensure rapid generation without hitting rate limits.
- 💡 **Actionable Intelligence**: Beyond simple summaries, the AI automatically extracts **Key Points** (with deeper 1-2 sentence explanations) and generates **Improvement Suggestions** for document tone, clarity, and content.
- 🔒 **Zero-Trust Client-Side Extraction**: Documents are parsed entirely in the browser using `pdfjs-dist` (PDFs) and `tesseract.js` (Image OCR via WebAssembly). Your raw, sensitive files **never leave your device**.
- 🛡️ **Secure Serverless Backend**: A JWT-protected Vercel Serverless Function (`/api/summarize.js`) proxies the LLM requests, ensuring the `HF_TOKEN` is securely hidden from the client and protected against abuse.
- 🛜 **Resilient Offline Fallback**: If the Hugging Face network is unreachable, rate-limited, or blocked by local firewalls (e.g., Cloudflare WARP), the app instantly and seamlessly falls back to a custom, on-device TF-IDF NLP summarization algorithm.

---

## 🏗️ Architecture & Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite | Lightning-fast development, Hot Module Replacement (HMR), and optimal production builds. |
| **UI / Styling** | Tailwind CSS | Rapid, scalable UI development ensuring a consistent, mobile-responsive design without heavy component libraries. |
| **PDF Extraction** | `pdfjs-dist` | The industry standard for robust, accurate client-side PDF parsing. |
| **Image Extraction** | `tesseract.js` | Enables powerful OCR directly in the browser via WebAssembly without external dependencies. |
| **Backend** | Vercel Serverless | Edge-optimized, zero-maintenance API routing. |
| **AI Provider** | Hugging Face | Utilizing the new `router.huggingface.co` infrastructure for blazing-fast, free-tier LLM inference. |

---

## 🚀 Quick Start (Local Development)

### 1. Get a Hugging Face Token
1. Create a free account at [Hugging Face](https://huggingface.co/).
2. Navigate to **Settings > Access Tokens** and generate a new token.

### 2. Clone and Install
```bash
git clone <your-repo-url>
cd document-summary-assistant
npm install
```

### 3. Configure Environment Variables
Create a file named `.env.local` in the root of the project (this is ignored by Git to keep your credentials safe).
```env
HF_TOKEN=hf_your_actual_token_here
```

### 4. Run Locally
```bash
npm run dev
```
*Note: If you run the app without setting up the `.env.local` file, the backend will gracefully signal the frontend to use the offline TF-IDF fallback summarizer.*

---

## ☁️ Vercel Deployment

Deploying this application to Vercel takes less than 2 minutes:

1. Push your local repository to GitHub.
2. Log into [Vercel](https://vercel.com/) and click **Add New... Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section of the deployment configuration, add:
   - Name: `HF_TOKEN`
   - Value: `<your-hugging-face-token>`
5. Click **Deploy**. Vercel will automatically build the Vite app and instantly provision the secure serverless backend.

---

## 🧠 Engineering Decisions & Approach

*A note on system design and architecture:*

When designing the **Document Summary Assistant**, the core priority was creating a resilient, production-ready pipeline that gracefully handles the inherent unreliability of file parsing and network requests.

**1. Zero-Trust Security Model**  
For the core challenge of text extraction, I implemented `pdfjs-dist` and `tesseract.js` strictly on the client side. This saves massive server costs and bandwidth, but more importantly, it guarantees user privacy. The raw files are parsed locally, and only the extracted text strings are sent to the AI router. 

**2. Modern AI Integration**  
To integrate AI securely, I built a Vercel Serverless function (`/api/summarize.js`). This acts as a secure proxy to the Hugging Face API, preventing the leakage of the `HF_TOKEN` to the browser while enforcing input sanitization. Recently, the architecture was upgraded to utilize Hugging Face's new OpenAI-compatible `router.huggingface.co` endpoint, targeting the highly capable `Qwen/Qwen2.5-7B-Instruct:fastest` model. This specific model is chosen because it excels at strictly formatting JSON output for our custom frontend UI.

**3. Bulletproof Reliability (The Fallback Engine)**  
Recognizing that 3rd-party LLM APIs can face outages, aggressive rate limits, or corporate firewall DNS blocks (like Cloudflare WARP intercepts), I engineered an unbreakable offline fallback. I built a custom term-frequency (TF-IDF inspired) summarizer in pure JavaScript. If the API returns a `502`, `503`, or a network error, the app instantly catches it and routes the text through the local heuristic logic. While it lacks the deep semantic understanding of Qwen, it guarantees a seamless, unbreakable user experience. Every state—empty, loading, error, and success—is visually distinct, delivering a complete, enterprise-grade product.
