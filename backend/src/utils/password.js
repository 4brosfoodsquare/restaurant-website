import bcrypt from 'bcryptjs';
import config from '../config/env.js';

export async function hashPassword(plain) {
  return bcrypt.hash(plain, config.auth.bcryptRounds);
}

export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}
