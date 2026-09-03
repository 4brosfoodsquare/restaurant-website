import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import config from '../../config/env.js';
import { validate } from '../../middleware/validate.js';
import { requireAuth } from '../../middleware/auth.js';
import { loginSchema, changeOwnPasswordSchema } from './auth.schemas.js';
import * as authService from './auth.service.js';
import { changeOwnPassword } from '../users/users.service.js';
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

// Self-service password change — open to any authenticated role (unlike
// /api/admin/users/*, which is owner/admin only), since every account
// holder must be able to change their own password.
router.patch('/me/password', requireAuth, validate(changeOwnPasswordSchema), async (req, res, next) => {
  try {
    await changeOwnPassword(req.user.id, req.body);
    recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'change_own_password', entity: 'user', entityId: req.user.id, ip: req.ip });
    res.status(204).end();
  } catch (error) {
    next(error);
  }
});

export default router;
