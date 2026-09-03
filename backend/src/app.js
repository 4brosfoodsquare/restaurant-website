import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import config from './config/env.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';
import authRoutes from './modules/auth/auth.routes.js';
import { publicCategoriesRouter, adminCategoriesRouter } from './modules/categories/categories.routes.js';
import { publicMenuRouter, adminMenuRouter } from './modules/menu/menu.routes.js';
import { publicOrdersRouter, adminOrdersRouter } from './modules/orders/orders.routes.js';
import { publicSettingsRouter, adminSettingsRouter } from './modules/settings/settings.routes.js';
import { adminUploadsRouter } from './modules/uploads/uploads.routes.js';
import { adminUsersRouter } from './modules/users/users.routes.js';

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
  app.use('/api/categories', publicCategoriesRouter);
  app.use('/api/admin/categories', adminCategoriesRouter);
  app.use('/api/menu', publicMenuRouter);
  app.use('/api/admin/menu', adminMenuRouter);
  app.use('/api/orders', publicOrdersRouter);
  app.use('/api/admin/orders', adminOrdersRouter);
  app.use('/api/settings', publicSettingsRouter);
  app.use('/api/admin/settings', adminSettingsRouter);
  app.use('/api/admin/uploads', adminUploadsRouter);
  app.use('/api/admin/users', adminUsersRouter);
  app.use('/uploads', express.static(config.uploads.dir, { maxAge: '7d' }));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
