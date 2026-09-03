import { z } from 'zod';

export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters.').max(200);

export const createUserSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address.').max(254),
  name: z.string().trim().min(1, 'Name is required.').max(120),
  role: z.enum(['owner', 'admin', 'staff']),
  password: passwordSchema,
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  role: z.enum(['owner', 'admin', 'staff']).optional(),
});

export const setUserActiveSchema = z.object({ isActive: z.boolean() });

// Administrative reset — no current-password check needed.
export const setPasswordSchema = z.object({
  password: passwordSchema,
});
