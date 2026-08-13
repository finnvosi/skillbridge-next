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

// Update project status (employer-owned lifecycle: draft/open/paused/closed/expired).
const updateProjectStatusSchema = z.object({
  body: z.object({
    status: z.enum(['draft', 'open', 'paused', 'completed', 'cancelled', 'expired']),
  }),
});

// Allowed transitions for the job lifecycle.
const STATUS_TRANSITIONS: Record<string, string[]> = {
  draft: ['open', 'cancelled'],
  open: ['paused', 'completed', 'cancelled', 'expired'],
  paused: ['open', 'cancelled'],
  completed: ['open'],
  cancelled: ['draft', 'open'],
  expired: ['open', 'draft'],
};

router.patch(
  '/:id/status',
  authenticate,
  validate(updateProjectStatusSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Only employers can manage job status' });
    }
    const { status } = req.body;
    const project = await prisma.project.findUnique({ where: { id: req.params.id } });
    if (!project) return res.status(404).json({ error: 'Project not found' });

    const isOwner = await prisma.employer.findFirst({
      where: { id: project.employerId, userId: req.user!.id },
    });
    if (!isOwner) return res.status(403).json({ error: 'Access denied' });

    const allowed = STATUS_TRANSITIONS[project.status] ?? [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        error: `Cannot move job from "${project.status}" to "${status}"`,
        allowed,
      });
    }

    const data: any = { status };
    // Publishing sets the published timestamp (first time only).
    if (status === 'open' && !project.publishedAt) {
      data.publishedAt = new Date();
    }
    // Pausing/expiring a job with an end date in the past => expired.
    if (status === 'open' && project.endDate && project.endDate < new Date()) {
      data.status = 'expired';
    }

    const updated = await prisma.project.update({ where: { id: project.id }, data });
    res.json({ message: 'Job status updated', project: updated });
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

// Analytics — hiring funnel + KPIs for the employer dashboard.
router.get(
  '/employer/analytics',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Employer access required' });
    }

    const employer = await prisma.employer.findUnique({
      where: { userId: req.user!.id },
    });
    if (!employer) return res.status(404).json({ error: 'Employer not found' });

    const projects = await prisma.project.findMany({
      where: { employerId: employer.id },
      select: { id: true, title: true, status: true },
    });
    const projectIds = projects.map((p) => p.id);

    const [applications, interviewCount, openCount] = await Promise.all([
      prisma.application.findMany({
        where: { projectId: { in: projectIds } },
        select: { stage: true, status: true, createdAt: true, projectId: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.interview.count({ where: { employerId: employer.id } }),
      prisma.project.count({ where: { employerId: employer.id, status: 'open' } }),
    ]);

    // Funnel by stage.
    const STAGES = ['applied', 'screening', 'shortlisted', 'interview', 'offer', 'hired'] as const;
    const stageCounts = STAGES.map((stage) => ({
      stage,
      count: applications.filter((a) => a.stage === stage).length,
    }));
    const topOfFunnel = stageCounts[0].count || 0;

    // KPIs (all derived from real data).
    const totalApplicants = applications.length;
    const shortlisted = stageCounts[2].count;
    const hired = stageCounts[5].count;
    const conversion =
      topOfFunnel > 0 ? Math.round((hired / topOfFunnel) * 100) : 0;
    const avgPerJob = openCount > 0 ? Math.round((totalApplicants / openCount) * 10) / 10 : 0;

    // 14-day application trend (by day).
    const days = 14;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const trend = Array.from({ length: days }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (days - 1 - i));
      const next = new Date(d);
      next.setDate(d.getDate() + 1);
      const count = applications.filter(
        (a) => a.createdAt >= d && a.createdAt < next
      ).length;
      return { date: d.toISOString().slice(0, 10), count };
    });

    // Top roles by applicant volume.
    const byProject = new Map<string, number>();
    for (const a of applications) {
      byProject.set(a.projectId, (byProject.get(a.projectId) ?? 0) + 1);
    }
    const topRoles = projects
      .map((p) => ({ title: p.title, count: byProject.get(p.id) ?? 0 }))
      .filter((r) => r.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    res.json({
      kpis: {
        activeJobs: openCount,
        totalApplicants,
        shortlisted,
        hired,
        conversion,
        avgPerJob,
        interviews: interviewCount,
      },
      funnel: stageCounts,
      trend,
      topRoles,
    });
  })
);

// Verification Center — review candidate proof and attest skills (portable proof).
router.get(
  '/employer/verification',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Employer access required' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer not found' });

    const projects = await prisma.project.findMany({
      where: { employerId: employer.id },
      select: { id: true, skillsRequired: true },
    });
    const openSkills = projects.flatMap((p) => p.skillsRequired).map((s) => s.toLowerCase());

    // Candidates = students who applied to this employer's projects.
    const projectIds = projects.map((p) => p.id);
    const appliedStudentIds = (
      await prisma.application.findMany({
        where: { projectId: { in: projectIds } },
        select: { studentId: true },
      })
    ).map((a) => a.studentId);

    const students = await prisma.student.findMany({
      where: { id: { in: appliedStudentIds } },
      include: {
        user: { select: { name: true, email: true, avatar: true } },
        certificates: { select: { id: true, title: true, verified: true, fileUrl: true } },
      },
    });

    const attestations = await prisma.skillAttestation.findMany({
      where: { employerId: employer.id },
    });

    const result = students.map((s) => {
      const myAttest = attestations.filter((a) => a.studentId === s.id);
      const skillMatches = (s.skills ?? []).filter((sk) => openSkills.includes(sk.toLowerCase()));
      return {
        id: s.id,
        name: s.user.name,
        email: s.user.email,
        avatar: s.user.avatar ?? null,
        university: s.university ?? null,
        major: s.major ?? null,
        skills: s.skills ?? [],
        skillMatches,
        certificates: s.certificates,
        attestedSkills: myAttest.map((a) => ({ skill: a.skill, note: a.note, createdAt: a.createdAt })),
      };
    });

    res.json({ candidates: result, openSkills });
  })
);

const attestSchema = z.object({
  body: z.object({
    studentId: z.string().min(1),
    skill: z.string().min(1),
    note: z.string().optional(),
  }),
});

// Attest a candidate's skill (employer-signed portable proof).
router.post(
  '/employer/verification/attest',
  authenticate,
  validate(attestSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Employer access required' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer not found' });
    const { studentId, skill, note } = req.body;

    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const attestation = await prisma.skillAttestation.upsert({
      where: { employerId_studentId_skill: { employerId: employer.id, studentId, skill } },
      update: { note: note ?? null },
      create: { employerId: employer.id, studentId, skill, note: note ?? null },
    });

    res.status(201).json({ message: 'Skill attested', attestation });
  })
);

// Revoke a skill attestation.
router.delete(
  '/employer/verification/attest',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Employer access required' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer not found' });
    const { studentId, skill } = req.query as Record<string, string>;
    if (!studentId || !skill) return res.status(400).json({ error: 'studentId and skill required' });

    await prisma.skillAttestation.deleteMany({
      where: { employerId: employer.id, studentId, skill },
    });
    res.json({ message: 'Attestation revoked' });
  })
);

// ───────────────────────── Team management ─────────────────────────
const teamInviteSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['recruiter', 'hiring_manager', 'admin']).default('recruiter'),
  }),
});

// List teammates for the current employer.
router.get(
  '/employer/team',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Employer access required' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer not found' });

    const members = await prisma.teamMember.findMany({
      where: { employerId: employer.id },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ members });
  })
);

// Invite a teammate.
router.post(
  '/employer/team',
  authenticate,
  validate(teamInviteSchema),
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Employer access required' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer not found' });

    const { name, email, role } = req.body;
    const existing = await prisma.teamMember.findFirst({
      where: { employerId: employer.id, email: email.toLowerCase() },
    });
    if (existing) return res.status(409).json({ error: 'That email is already on your team' });

    const member = await prisma.teamMember.create({
      data: {
        employerId: employer.id,
        name,
        email: email.toLowerCase(),
        role,
        invitedById: req.user!.id,
      },
    });
    res.status(201).json({ message: 'Teammate invited', member });
  })
);

// Remove a teammate.
router.delete(
  '/employer/team/:id',
  authenticate,
  asyncHandler(async (req: AuthRequest, res: Response) => {
    if (req.user!.role !== 'employer') {
      return res.status(403).json({ error: 'Employer access required' });
    }
    const employer = await prisma.employer.findUnique({ where: { userId: req.user!.id } });
    if (!employer) return res.status(404).json({ error: 'Employer not found' });

    await prisma.teamMember.deleteMany({ where: { id: req.params.id, employerId: employer.id } });
    res.json({ message: 'Teammate removed' });
  })
);

export default router;
