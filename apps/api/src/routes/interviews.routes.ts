import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { asyncHandler, validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// List interviews for the current employer (upcoming first).
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can view interviews' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer profile not found' });

    const interviews = await prisma.interview.findMany({
      where: { employerId: employer.id },
      orderBy: { scheduledAt: 'asc' },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true, avatar: true } },
          },
        },
        project: { select: { id: true, title: true } },
      },
    });

    const now = new Date();
    const upcoming = interviews.filter((i) => i.scheduledAt >= now && i.status !== 'cancelled');
    const past = interviews
      .filter((i) => i.scheduledAt < now || i.status === 'cancelled')
      .reverse();

    res.json({
      upcoming: upcoming.map(enrich),
      past: past.map(enrich),
    });
  })
);

function enrich(i: any) {
  return {
    id: i.id,
    scheduledAt: i.scheduledAt,
    durationMin: i.durationMin,
    type: i.type,
    status: i.status,
    location: i.location,
    meetingLink: i.meetingLink,
    notes: i.notes,
    rating: i.rating,
    strengths: i.strengths,
    concerns: i.concerns,
    recommendation: i.recommendation,
    candidate: {
      id: i.student.id,
      name: i.student.user.name,
      email: i.student.user.email,
      avatar: i.student.user.avatar,
    },
    job: i.project,
  };
}

const scheduleSchema = z.object({
  body: z.object({
    studentId: z.string().min(1),
    projectId: z.string().min(1),
    applicationId: z.string().optional(),
    scheduledAt: z.string().datetime(),
    durationMin: z.number().int().positive().max(480).optional(),
    type: z.enum(['online', 'phone', 'onsite']).optional(),
    location: z.string().optional(),
    meetingLink: z.string().optional(),
  }),
});

// Schedule a new interview.
router.post(
  '/',
  authenticate,
  validate(scheduleSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can schedule interviews' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer profile not found' });

    const {
      studentId,
      projectId,
      applicationId,
      scheduledAt,
      durationMin,
      type,
      location,
      meetingLink,
    } = req.body;

    // Ensure the candidate actually applied to this employer's project.
    const project = await prisma.project.findFirst({
      where: { id: projectId, employerId: employer.id },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const interview = await prisma.interview.create({
      data: {
        employerId: employer.id,
        studentId,
        projectId,
        applicationId,
        scheduledAt: new Date(scheduledAt),
        durationMin: durationMin ?? 45,
        type: type ?? 'online',
        location,
        meetingLink,
        status: 'scheduled',
      },
    });

    res.status(201).json({ message: 'Interview scheduled', interview });
  })
);

const updateSchema = z.object({
  body: z.object({
    scheduledAt: z.string().datetime().optional(),
    durationMin: z.number().int().positive().max(480).optional(),
    type: z.enum(['online', 'phone', 'onsite']).optional(),
    location: z.string().optional(),
    meetingLink: z.string().optional(),
    status: z.enum(['scheduled', 'completed', 'cancelled', 'rescheduled']).optional(),
  }),
});

// Update / reschedule / cancel.
router.put(
  '/:id',
  authenticate,
  validate(updateSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can update interviews' });
    }
    const employer = await prisma.employer.findFirst({
      where: { id: (await getInterviewEmployer(req.params.id)) ?? '', userId: req.user!.id },
    });
    const interview = await prisma.interview.findUnique({ where: { id: req.params.id } });
    if (!interview || interview.employerId !== employer?.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await prisma.interview.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.scheduledAt ? { scheduledAt: new Date(req.body.scheduledAt) } : {}),
        ...(req.body.durationMin ? { durationMin: req.body.durationMin } : {}),
        ...(req.body.type ? { type: req.body.type } : {}),
        ...(req.body.location !== undefined ? { location: req.body.location } : {}),
        ...(req.body.meetingLink !== undefined ? { meetingLink: req.body.meetingLink } : {}),
        ...(req.body.status ? { status: req.body.status } : {}),
      },
    });
    res.json({ message: 'Interview updated', interview: updated });
  })
);

const feedbackSchema = z.object({
  body: z.object({
    rating: z.number().int().min(1).max(5).optional(),
    strengths: z.string().optional(),
    concerns: z.string().optional(),
    recommendation: z.enum(['strong_hire', 'hire', 'consider', 'reject']).optional(),
    notes: z.string().optional(),
  }),
});

// Submit interview feedback.
router.post(
  '/:id/feedback',
  authenticate,
  validate(feedbackSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can submit feedback' });
    }
    const interview = await prisma.interview.findUnique({ where: { id: req.params.id } });
    const employer = await prisma.employer.findFirst({
      where: { id: interview?.employerId ?? '', userId: req.user!.id },
    });
    if (!interview || !employer || interview.employerId !== employer.id) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const updated = await prisma.interview.update({
      where: { id: req.params.id },
      data: {
        ...(req.body.rating !== undefined ? { rating: req.body.rating } : {}),
        ...(req.body.strengths !== undefined ? { strengths: req.body.strengths } : {}),
        ...(req.body.concerns !== undefined ? { concerns: req.body.concerns } : {}),
        ...(req.body.recommendation !== undefined ? { recommendation: req.body.recommendation } : {}),
        ...(req.body.notes !== undefined ? { notes: req.body.notes } : {}),
        status: 'completed',
      },
    });
    res.json({ message: 'Feedback submitted', interview: updated });
  })
);

async function getInterviewEmployer(id: string) {
  const i = await prisma.interview.findUnique({ where: { id }, select: { employerId: true } });
  return i?.employerId;
}

export default router;
