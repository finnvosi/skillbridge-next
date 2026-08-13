import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db/prisma';
import { asyncHandler, validate } from '../middleware/validation';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const createProjectSchema = z.object({
  body: z.object({
    title: z.string().min(5),
    description: z.string().min(20),
    type: z.enum(['internship', 'part_time', 'freelance', 'full_time']),
    budget: z.number().positive().optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    skillsRequired: z.array(z.string()).min(1),
    location: z.string().optional(),
    remote: z.boolean().default(false),
  }),
});

const updateApplicationSchema = z.object({
  body: z.object({
    status: z.enum(['accepted', 'rejected', 'withdrawn']),
  }),
});

// List projects with filters + pagination
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { type, skills, location, remote, search, page = '1', limit = '20' } = req.query as Record<
      string,
      string
    >;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));

    const where: any = {};
    if (type) where.type = type;
    if (remote === 'true') where.remote = true;
    if (location) where.location = { contains: location, mode: 'insensitive' };
    if (skills) {
      const arr = Array.isArray(skills) ? (skills as string[]) : [skills];
      where.skillsRequired = { hasSome: arr };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [projects, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: { employer: { include: { user: { select: { name: true } } } } },
      }),
      prisma.project.count({ where }),
    ]);

    res.json({ projects, total, page: pageNum, limit: limitNum });
  })
);

// Get the current student's applications with project info
// NOTE: must be declared BEFORE '/:id' so 'student' is not captured as :id
router.get(
  '/student/applications',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'student') {
      return res.status(403).json({ error: 'Only students can view their applications' });
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const applications = await prisma.application.findMany({
      where: { studentId: student.id },
      include: { project: { include: { employer: { include: { user: { select: { name: true } } } } } } },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ applications });
  })
);

// Get AI-matched projects for student (simple heuristic scorer)
router.get(
  '/student/match',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'student') {
      return res.status(403).json({ error: 'Only students can get matches' });
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(404).json({ error: 'Student profile not found' });

    const projects = await prisma.project.findMany({
      where: { status: 'open' },
      include: { employer: { include: { user: { select: { name: true, email: true } } } } },
    });

    const studentSkills = student.skills.map(s => s.toLowerCase());

    // Simple heuristic match scorer
    const scored = projects.map(p => {
      const projectSkills = p.skillsRequired.map(s => s.toLowerCase());
      
      // Skill overlap (40% weight)
      const skillMatches = studentSkills.filter(s => projectSkills.includes(s));
      const skillScore = (skillMatches.length / Math.max(projectSkills.length, 1)) * 40;
      
      // Budget fit (20% weight) - higher budget = better fit
      const budgetScore = p.budget ? Math.min((p.budget / 1000) * 20, 20) : 0;
      
      // Type relevance (20% weight) - assume student prefers internship/parttime for now
      const typeBonus = p.type === 'internship' || p.type === 'part_time' ? 10 : 0;
      
      // Location match (20% weight)
      const locationScore = p.remote ? 20 : (p.location ? 10 : 0);

      const totalScore = Math.round(skillScore + budgetScore + typeBonus + locationScore);

      return {
        ...p,
        matchScore: totalScore,
        skillMatches,
      };
    });

    // Sort by match score descending
    scored.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ projects: scored });
  })
);

// Get the current employer's own projects
// NOTE: declared before '/:id' so 'employer' is not captured as :id
router.get(
  '/employer/projects',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can view their projects' });
    }
    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
    });
    if (!employer) return res.status(404).json({ error: 'Employer profile not found' });

    const projects = await prisma.project.findMany({
      where: { employerId: employer.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
      },
    });
    res.json({ projects });
  })
);

// Get all applications across the current employer's projects
router.get(
  '/employer/applications',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can view applications' });
    }
    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
    });
    if (!employer) return res.status(404).json({ error: 'Employer profile not found' });

    const applications = await prisma.application.findMany({
      where: { project: { employerId: employer.id } },
      include: {
        project: { select: { id: true, title: true } },
        student: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ applications });
  })
);

// Get project by ID
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const project = await prisma.project.findUnique({
      where: { id: req.params.id },
      include: { employer: { include: { user: { select: { name: true } } } } },
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json({ project });
  })
);

// Create project (employers only)
router.post(
  '/',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can create projects' });
    }

    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(403).json({ error: 'Employer profile not found' });

    const {
      title,
      description,
      type,
      budget,
      startDate,
      endDate,
      skillsRequired,
      location,
      remote,
    } = req.body;

    const project = await prisma.project.create({
      data: {
        title,
        description,
        type,
        budget,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        skillsRequired,
        location,
        remote,
        employerId: employer.id,
      },
    });

    res.status(201).json({ message: 'Project created successfully', project });
  })
);

// Apply to project (students only)
router.post(
  '/:id/apply',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'student') {
      return res.status(403).json({ error: 'Only students can apply to projects' });
    }

    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    if (project.status !== 'open') {
      return res.status(400).json({ error: 'Project is not accepting applications' });
    }

    const student = await prisma.student.findUnique({ where: { userId: req.user!.id } });
    if (!student) return res.status(403).json({ error: 'Student profile not found' });

    const existing = await prisma.application.findUnique({
      where: { projectId_studentId: { projectId: project.id, studentId: student.id } },
    });
    if (existing) {
      return res.status(409).json({ error: 'You have already applied to this project' });
    }

    const { coverLetter, proposedBudget } = req.body;

    const application = await prisma.application.create({
      data: {
        projectId: project.id,
        studentId: student.id,
        coverLetter,
        proposedBudget,
        status: 'pending',
      },
    });

    res.status(201).json({ message: 'Application submitted successfully', application });
  })
);

// Get applications for a project (owner employer or admin)
router.get(
  '/:id/applications',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isOwner = await prisma.employer.findFirst({
      where: { id: project.employerId, userId: req.user!.id },
    });
    if (!isOwner && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const applications = await prisma.application.findMany({
      where: { projectId: project.id },
      include: {
        student: { include: { user: { select: { name: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ applications });
  })
);

// Update application status (owner employer or admin)
router.put(
  '/:projectId/applications/:applicationId',
  authenticate,
  validate(updateApplicationSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { status } = req.body;
    const { applicationId, projectId } = req.params;

    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.projectId !== projectId) {
      return res.status(400).json({ error: 'Application does not belong to this project' });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isOwner = await prisma.employer.findFirst({
      where: { id: project.employerId, userId: req.user!.id },
    });
    if (!isOwner && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: { status },
    });

    res.json({ message: 'Application status updated', application: updated });
  })
);


// Generate contract for accepted application
router.post(
  '/applications/:applicationId/contract',
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { applicationId } = req.params;
    
    // Find the application
    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        project: { include: { employer: { include: { user: true } } } },
        student: { include: { user: true } }
      }
    });
    
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted applications can generate contracts' });
    }
    
    // Mock contract generation - in production this would:
    // 1. Build contract terms from project + application
    // 2. Send to PDF generation service (PDFShift, HelloSign, etc.)
    // 3. Store the signed URL
    
    const contractData = {
      id: `contract_${applicationId}`,
      projectId: application.projectId,
      student: application.student.user.name,
      employer: application.project.employer.user.name,
      salary: application.proposedBudget || application.project.budget,
      project: application.project.title,
      status: 'pending_signatures',
      contractUrl: `https://example.com/contracts/contract_${applicationId}.pdf`,
      createdAt: new Date().toISOString()
    };
    
    res.status(201).json({ 
      message: 'Contract generated successfully',
      contract: contractData,
      signUrl: `https://example.com/sign/${applicationId}`
    });
  })
);

// Get a stage-aware, enriched list of applications for the employer.
// Returns each application with the candidate's skills + computed match score
// so the dashboard can show AI Match without a separate call.
router.get(
  '/employer/candidates',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can view candidates' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer profile not found' });

    const { stage, projectId, search } = req.query as Record<string, string>;

    const applications = await prisma.application.findMany({
      where: {
        project: { employerId: employer.id },
        ...(stage ? { stage: stage as any } : {}),
        ...(projectId ? { projectId } : {}),
        ...(search
          ? { student: { user: { name: { contains: search, mode: 'insensitive' } } } }
          : {}),
      },
      include: {
        project: { select: { id: true, title: true, skillsRequired: true } },
        student: {
          include: {
            user: { select: { name: true, email: true, avatar: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = applications.map((app) => {
      const studentSkills = (app.student.skills || []).map((s: string) => s.toLowerCase());
      const jobSkills = (app.project.skillsRequired || []).map((s: string) => s.toLowerCase());
      const skillMatches = studentSkills.filter((s: string) => jobSkills.includes(s));
      const matchScore = jobSkills.length
        ? Math.round((skillMatches.length / jobSkills.length) * 100)
        : 0;
      return {
        ...app,
        matchScore,
        skillMatches,
        student: {
          id: app.student.id,
          name: app.student.user.name,
          email: app.student.user.email,
          avatar: app.student.user.avatar,
          skills: app.student.skills,
          university: app.student.university,
          major: app.student.major,
        },
      };
    });

    res.json({ applications: enriched });
  })
);

// Move an application to a different pipeline stage (owner employer or admin).
const moveStageSchema = z.object({
  body: z.object({ stage: z.enum(['applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired']) }),
});
router.put(
  '/:projectId/applications/:applicationId/stage',
  authenticate,
  validate(moveStageSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    const { applicationId, projectId } = req.params;
    const { stage } = req.body;

    const application = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!application) return res.status(404).json({ error: 'Application not found' });
    if (application.projectId !== projectId) {
      return res.status(400).json({ error: 'Application does not belong to this project' });
    }
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isOwner = await prisma.employer.findFirst({ where: { id: project.employerId, userId: req.user!.id } });
    if (!isOwner && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Hiring decision follows the stage: reaching 'hired' => accepted.
    const data: any = { stage };
    if (stage === 'hired') data.status = 'accepted';

    const updated = await prisma.application.update({ where: { id: applicationId }, data });
    res.json({ message: 'Stage updated', application: updated });
  })
);

// Employer overview — command-center aggregate built from real data.
router.get(
  '/employer/overview',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can view the overview' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer profile not found' });

    const [projects, applications] = await Promise.all([
      prisma.project.findMany({
        where: { employerId: employer.id },
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { applications: true } } },
      }),
      prisma.application.findMany({
        where: { project: { employerId: employer.id } },
        include: {
          project: { select: { id: true, title: true } },
          student: { include: { user: { select: { name: true, email: true } } } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    // Pipeline counts per stage.
    const STAGES = ['applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired'] as const;
    const pipeline = STAGES.map((s) => ({
      stage: s,
      count: applications.filter((a) => a.stage === s).length,
    }));

    const activeJobs = projects.length;
    const totalApplications = applications.length;
    const shortlisted = applications.filter((a) => a.stage === 'shortlisted' || a.stage === 'interview' || a.stage === 'offer').length;
    const hiresInProgress = applications.filter((a) => a.stage === 'offer' || a.stage === 'hired').length;
    const needsReview = applications.filter((a) => a.stage === 'applied' || a.stage === 'screening').length;

    // Needs your attention: candidates awaiting first review.
    const attention = applications
      .filter((a) => a.stage === 'applied' || a.stage === 'screening')
      .slice(0, 5)
      .map((a) => ({
        applicationId: a.id,
        candidate: a.student.user.name,
        email: a.student.user.email,
        job: a.project.title,
        projectId: a.project.id,
        stage: a.stage,
        appliedAt: a.createdAt,
      }));

    // Recent activity (derived from applications + job creation).
    const activity: any[] = [
      ...applications.slice(0, 8).map((a) => ({
        type: 'application',
        text: `${a.student.user.name} applied to ${a.project.title}`,
        at: a.createdAt,
        projectId: a.project.id,
      })),
      ...projects.slice(0, 4).map((p) => ({
        type: 'job_published',
        text: `Job published: ${p.title}`,
        at: p.createdAt,
        projectId: p.id,
      })),
    ].sort((x, y) => new Date(y.at).getTime() - new Date(x.at).getTime()).slice(0, 8);

    res.json({
      company: { name: employer.companyName, industry: employer.industry, verified: employer.verified },
      metrics: {
        activeJobs,
        totalApplications,
        shortlisted,
        hiresInProgress,
        needsReview,
      },
      pipeline,
      attention,
      activity,
      projects: projects.map((p) => ({ ...p, applicationCount: p._count.applications })),
    });
  })
);

export default router;
