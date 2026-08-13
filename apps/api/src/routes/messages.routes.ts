import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { asyncHandler, validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// List conversations for the current employer, with last message + unread count.
router.get(
  '/conversations',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can view conversations' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer profile not found' });

    const conversations = await prisma.conversation.findMany({
      where: { employerId: employer.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        student: {
          include: { user: { select: { name: true, email: true, avatar: true } } },
        },
        project: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const result = conversations.map((c) => {
      const last = c.messages[0];
      const unread = c.messages.filter((m) => m.senderRole === 'student' && !m.read).length;
      return {
        id: c.id,
        candidate: {
          id: c.student.id,
          name: c.student.user.name,
          email: c.student.user.email,
          avatar: c.student.user.avatar,
        },
        job: c.project,
        lastMessage: last ? { body: last.body, at: last.createdAt, senderRole: last.senderRole } : null,
        unread,
        updatedAt: c.updatedAt,
      };
    });

    res.json({ conversations: result });
  })
);

// Get a single conversation thread.
router.get(
  '/conversations/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const conversation = await prisma.conversation.findUnique({
      where: { id: req.params.id },
      include: {
        student: { include: { user: { select: { name: true, email: true, avatar: true } } } },
        project: { select: { id: true, title: true } },
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });

    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer || conversation.employerId !== employer.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Mark employer-visible (student-sent) messages as read.
    await prisma.message.updateMany({
      where: { conversationId: conversation.id, senderRole: 'student', read: false },
      data: { read: true },
    });

    res.json({
      conversation: {
        id: conversation.id,
        candidate: {
          id: conversation.student.id,
          name: conversation.student.user.name,
          email: conversation.student.user.email,
          avatar: conversation.student.user.avatar,
        },
        job: conversation.project,
        messages: conversation.messages.map((m) => ({
          id: m.id,
          body: m.body,
          senderRole: m.senderRole,
          read: m.read,
          createdAt: m.createdAt,
        })),
      },
    });
  })
);

const sendSchema = z.object({
  body: z.object({
    body: z.string().min(1),
  }),
});

// Send a message in a conversation (employer context).
router.post(
  '/conversations/:id/messages',
  authenticate,
  validate(sendSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can send messages' });
    }
    const conversation = await prisma.conversation.findUnique({ where: { id: req.params.id } });
    if (!conversation) return res.status(404).json({ error: 'Conversation not found' });
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer || conversation.employerId !== employer.id) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const message = await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: req.user!.id,
        senderRole: 'employer',
        body: req.body.body,
      },
    });
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    });

    res.status(201).json({ message: 'Message sent', data: message });
  })
);

// Start a new conversation with a candidate (from an application).
const startSchema = z.object({
  body: z.object({
    studentId: z.string().min(1),
    projectId: z.string().min(1),
    applicationId: z.string().optional(),
    body: z.string().min(1),
  }),
});

router.post(
  '/conversations',
  authenticate,
  validate(startSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can start conversations' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer profile not found' });

    const { studentId, projectId, applicationId, body } = req.body;
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const conversation = await prisma.conversation.create({
      data: {
        employerId: employer.id,
        studentId,
        projectId,
        applicationId,
        messages: {
          create: [
            { senderId: req.user!.id, senderRole: 'employer', body, read: false },
          ],
        },
      },
      include: { messages: true },
    });

    res.status(201).json({ message: 'Conversation started', conversation });
  })
);

export default router;
