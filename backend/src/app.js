import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';

export function createApp() {
  const app = express();

  if (config.trustProxy) app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / non-browser requests (no Origin header) through.
        if (!origin || config.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
    }),
  );
  app.use(compression());
  app.use(express.json({ limit: '256kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    res.json({ data: { status: 'ok', env: config.env, time: new Date().toISOString() } });
  });

  app.use('/api/auth', authRoutes);
  app.use('/uploads', express.static(config.uploads.dir, { maxAge: '7d' }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
