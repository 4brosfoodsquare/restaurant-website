import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../../config/env.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';
import { recordAudit } from '../../utils/auditLog.js';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many login attempts. Please try again later.' } },
});

function setRefreshCookie(res, value, expiresAt) {
  res.cookie(config.cookie.name, value, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: config.cookie.path,
    expires: new Date(expiresAt),
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(config.cookie.name, {
    httpOnly: true,
    secure: config.cookie.secure,
    sameSite: config.cookie.sameSite,
    domain: config.cookie.domain,
    path: config.cookie.path,
  });
}

router.post('/login', loginLimiter, validate(loginSchema), async (req, res, next) => {
  try {
    const result = await authService.login({
      email: req.body.email,
      password: req.body.password,
      userAgent: req.get('user-agent') ?? '',
    });
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    recordAudit({ actorId: result.user.id, actorEmail: result.user.email, action: 'login', entity: 'user', entityId: result.user.id, ip: req.ip });
    res.json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const result = await authService.refreshSession({
      refreshTokenValue: req.cookies?.[config.cookie.name],
      userAgent: req.get('user-agent') ?? '',
    });
    setRefreshCookie(res, result.refreshToken, result.refreshTokenExpiresAt);
    res.json({
      data: {
        user: result.user,
        accessToken: result.accessToken,
        accessTokenExpiresInSeconds: result.accessTokenExpiresInSeconds,
      },
    });
  } catch (error) {
    clearRefreshCookie(res);
    next(error);
  }
});

router.post('/logout', (req, res) => {
  authService.logout({ refreshTokenValue: req.cookies?.[config.cookie.name] });
  clearRefreshCookie(res);
  res.status(204).end();
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ data: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.roleKey } });
});

export default router;
