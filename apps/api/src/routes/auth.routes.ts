import { Router, Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import * as bcrypt from 'bcryptjs';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import { jwtConfig } from "../config";
import { prisma } from '../db/prisma';
import { asyncHandler, validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// ---------------------------------------------------------------------------
// Rate limiting on auth endpoints — blocks brute-force & credential stuffing.
// 10 attempts per 15 min per IP is generous for legit users, painful for bots.
// In production put a real client IP behind a proxy via `trust proxy`.
// ---------------------------------------------------------------------------
const authRateLimit = rateLimit({
  windowMs: parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '60000'), // 1 minute
  max: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100'), // 100/min — brute-force-safe (bcrypt makes 100/min already heavy) yet demo-friendly
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts, please try again later.' },
});

// Validation schemas
const registerSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
    // Role is required and explicit (no default). The mobile app always sends
    // it; requiring it prevents silently creating the wrong account type.
    // SECURITY: only student/employer/worker may self-register. `admin` and
    // `factory_admin` are provisioned out-of-band by an existing admin — never
    // exposed to the public endpoint, or anyone could grant themselves admin.
    role: z.enum(['student', 'employer', 'worker']),
    name: z.string().min(2),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1),
  }),
});

function signTokens(user: { id: string; email: string; role: string }) {
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtConfig.secret,
    { expiresIn: '7d' }
  );
  const refreshToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    jwtConfig.refreshSecret,
    { expiresIn: '30d' }
  );
  return { token, refreshToken };
}

function publicUser(user: { id: string; email: string; name: string; role: string }) {
  return { id: user.id, email: user.email, name: user.name, role: user.role };
}

// Register
router.post(
  '/register',
  authRateLimit,
  validate(registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, role, name } = req.body;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        name,
        // Create the role-specific profile row in the same transaction
        ...(role === 'student' ? { student: { create: {} } } : {}),
        ...(role === 'employer' ? { employer: { create: { companyName: name } } } : {}),
        ...(role === 'worker' ? { worker: { create: {} } } : {}),
      },
    });

    const { token, refreshToken } = signTokens(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: publicUser(user),
      token,
      refreshToken,
    });
  })
);

// Login
router.post(
  '/login',
  authRateLimit,
  validate(loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const { token, refreshToken } = signTokens(user);

    res.json({
      message: 'Login successful',
      user: publicUser(user),
      token,
      refreshToken,
    });
  })
);

// Get current user
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user: publicUser(user) });
  })
);

// Refresh token
router.post(
  '/refresh',
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
      const decoded = jwt.verify(refreshToken, jwtConfig.refreshSecret) as {
        id: string;
        email: string;
        role: string;
      };

      const user = await prisma.user.findUnique({ where: { id: decoded.id } });
      if (!user) {
        return res.status(401).json({ error: 'Invalid refresh token' });
      }

      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        jwtConfig.secret,
        { expiresIn: '7d' }
      );

      res.json({ token });
    } catch (error) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }
  })
);

// Logout (stateless; client discards token)
router.post(
  '/logout',
  authenticate,
  asyncHandler(async (_req: AuthRequest, res: Response) => {
    res.json({ message: 'Logout successful' });
  })
);

export default router;
