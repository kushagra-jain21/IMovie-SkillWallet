import { env } from './environment.js';

export const getAllowedOrigins = () => {
  const defaults = [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3000',
    'http://127.0.0.1:3000'
  ];

  const configured = (env.CLIENT_URL || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return Array.from(new Set([...defaults, ...configured]));
};

export const isOriginAllowed = (origin) => {
  // Allow requests with no origin (e.g. mobile apps, curl, server health checks)
  if (!origin) return true;

  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.includes(origin)) return true;

  // Allow Cloudflare Pages deployments (*.pages.dev)
  try {
    const parsed = new URL(origin);
    if (parsed.hostname.endsWith('.pages.dev')) {
      return true;
    }
  } catch {
    // ignore malformed URLs
  }

  return false;
};

export const corsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
