import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Custom Vite plugin to mock Vercel's API routing locally
// This allows `/api/summarize` to work during `npm run dev` just like it does on Vercel
const vercelApiMock = (env) => {
  return {
    name: 'vercel-api-mock',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if ((req.url === '/api/login' || req.url === '/api/register') && req.method === 'POST') {
          if (env.JWT_SECRET) process.env.JWT_SECRET = env.JWT_SECRET;
          
          let body = '';
          req.on('data', chunk => body += chunk.toString());
          req.on('end', async () => {
            try {
              req.body = JSON.parse(body || '{}');
              res.status = (code) => { res.statusCode = code; return res; };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };
              const modulePath = req.url === '/api/login' ? './api/login.js' : './api/register.js';
              const { default: handler } = await import(modulePath + '?t=' + Date.now());
              await handler(req, res);
            } catch (e) {
              console.error('Local API Error:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
          });
        } else if (req.url === '/api/summarize' && req.method === 'POST') {
          // Expose the loaded env variables to process.env for the serverless function
          if (env.GROQ_API_KEY) {
            process.env.GROQ_API_KEY = env.GROQ_API_KEY;
          }
          if (env.JWT_SECRET) process.env.JWT_SECRET = env.JWT_SECRET;

          let body = '';
          req.on('data', chunk => {
            body += chunk.toString();
          });
          
          req.on('end', async () => {
            try {
              // Mock Vercel's req.body
              req.body = JSON.parse(body || '{}');
              
              // Mock Vercel's res.status() and res.json() helpers
              res.status = (code) => {
                res.statusCode = code;
                return res;
              };
              res.json = (data) => {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify(data));
              };

              // Dynamically import the handler to execute it
              const modulePath = './api/summarize.js';
              const { default: handler } = await import(modulePath + '?t=' + Date.now());
              await handler(req, res);
            } catch (e) {
              console.error('Local API Error:', e);
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Internal Server Error' }));
            }
          });
        } else {
          next();
        }
      });
    }
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env files (.env, .env.local, etc.) into the environment context
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(), 
      vercelApiMock(env)
    ],
  }
})
