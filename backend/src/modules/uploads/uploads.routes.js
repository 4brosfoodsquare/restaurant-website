import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import config from '../../config/env.js';
import { requireAuth, requireRole } from '../../middleware/auth.js';
import { badRequest } from '../../utils/httpError.js';
import { detectImageType } from '../../utils/fileSignature.js';
import { recordAudit } from '../../utils/auditLog.js';

// Buffered in memory (files are capped at a few MB) so the real content can
// be sniffed via magic bytes before anything touches disk — the client's
// claimed mimetype/extension is never trusted on its own.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploads.maxBytes, files: 1 },
  fileFilter(req, file, cb) {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      cb(badRequest('Only JPEG, PNG or WEBP images are allowed.', { code: 'UNSUPPORTED_FILE_TYPE' }));
      return;
    }
    cb(null, true);
  },
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many uploads. Please try again later.' } },
});

export const adminUploadsRouter = Router();
adminUploadsRouter.use(requireAuth, requireRole('owner', 'admin'));

adminUploadsRouter.post('/image', uploadLimiter, upload.single('image'), (req, res, next) => {
  if (!req.file) {
    next(badRequest('No image file was provided.'));
    return;
  }

  const detected = detectImageType(req.file.buffer);
  if (!detected) {
    next(badRequest('The uploaded file is not a valid JPEG, PNG or WEBP image.', { code: 'INVALID_IMAGE_CONTENT' }));
    return;
  }

  // Filename is fully server-generated — the client's original filename and
  // extension are discarded entirely, closing off path traversal and
  // double-extension tricks (e.g. "photo.jpg.php").
  const filename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${detected.extension}`;
  const destination = path.join(config.uploads.dir, filename);
  fs.writeFileSync(destination, req.file.buffer, { mode: 0o644 });

  const url = `${config.publicApiUrl}${config.uploads.publicPath}/${filename}`;
  recordAudit({ actorId: req.user.id, actorEmail: req.user.email, action: 'upload', entity: 'image', entityId: filename, ip: req.ip });
  res.status(201).json({ data: { url, filename, mimeType: detected.mimeType, sizeBytes: req.file.buffer.length } });
});

// Multer errors (oversized file, etc.) surface via next(err) with a MulterError,
// not an HttpError — translate them so the client gets a clean 4xx response.
adminUploadsRouter.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? `Image is too large. Maximum size is ${Math.round(config.uploads.maxBytes / (1024 * 1024))}MB.`
      : 'Could not process the uploaded file.';
    res.status(400).json({ error: { code: 'UPLOAD_ERROR', message } });
    return;
  }
  next(err);
});
