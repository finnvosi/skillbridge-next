/**
 * SkillBridge demo seed — realistic Cambodian / SEA context.
 *
 * Run with:  cd apps/api && pnpm dlx tsx scripts/seed.ts
 * Requires DATABASE_URL in apps/api/.env (or shell env).
 *
 * Idempotent-ish: creates demo users under @skillbridge.demo emails. Safe to
 * re-run (it deletes prior demo rows first via cascade).
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const DEMO_SUFFIX = '@skillbridge.demo';

const students = [
  { name: 'Sopanha Vosi', university: 'Royal University of Phnom Penh', major: 'Computer Science', graduationYear: 2027, skills: ['React', 'TypeScript', 'Figma'] },
  { name: 'Chan Dara', university: 'Institute of Technology of Cambodia', major: 'Software Engineering', graduationYear: 2026, skills: ['Python', 'Django', 'SQL'] },
  { name: 'Srey Pich', university: 'Paññāsāstra University', major: 'Graphic Design', graduationYear: 2027, skills: ['Illustrator', 'Branding', 'UI Design'] },
  { name: 'Vannak Heng', university: 'Royal University of Phnom Penh', major: 'Business Administration', graduationYear: 2026, skills: ['Marketing', 'Excel', 'Public Speaking'] },
  { name: 'Sovannara Kim', university: 'Norton University', major: 'Information Technology', graduationYear: 2028, skills: ['Java', 'Android', 'Git'] },
];

const employers = [
  { name: 'Phnom Penh Labs', industry: 'Software', size: 45 },
  { name: 'Mekong Studio', industry: 'Design', size: 18 },
  { name: 'CamTech Solutions', industry: 'Technology', size: 120 },
  { name: 'Siem Reap Digital', industry: 'E-commerce', size: 30 },
];

const projects = [
  { title: 'Frontend Developer Intern', type: 'internship', budget: 300, location: 'Phnom Penh', remote: false, skills: ['React', 'TypeScript'], employerIdx: 0, desc: 'Build UI components and features for our recruitment platform. Mentorship from senior engineers. Real shipping responsibility from week one.' },
  { title: 'UX Research Assistant', type: 'part_time', budget: 250, location: 'Phnom Penh', remote: true, skills: ['Figma', 'User Research'], employerIdx: 1, desc: 'Help our design team run user interviews and synthesize findings for client projects across Cambodia and Vietnam.' },
  { title: 'Junior Data Analyst', type: 'full_time', budget: 600, location: 'Siem Reap', remote: false, skills: ['Python', 'SQL', 'Excel'], employerIdx: 2, desc: 'Analyze customer and operations data to surface insights that drive product decisions. Great first full-time role.' },
  { title: 'Mobile App Developer (Android)', type: 'freelance', budget: 800, location: 'Remote', remote: true, skills: ['Java', 'Android', 'Git'], employerIdx: 3, desc: 'Build a pilot mobile app for a local tourism marketplace. Flexible hours, milestone-based payments.' },
  { title: 'Brand Design Contractor', type: 'freelance', budget: 450, location: 'Phnom Penh', remote: true, skills: ['Illustrator', 'Branding'], employerIdx: 1, desc: 'Design a visual identity system for a growing Cambodian coffee startup. Portfolio required.' },
  { title: 'Marketing Intern', type: 'internship', budget: 200, location: 'Phnom Penh', remote: false, skills: ['Marketing', 'Social Media'], employerIdx: 2, desc: 'Support our growth team with social campaigns and event coordination. Learn the full marketing funnel.' },
];

async function main() {
  console.log('🌱 Seeding SkillBridge demo data...');

  // Clean prior demo data
  await prisma.application.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.student.deleteMany({});
  await prisma.employer.deleteMany({});
  await prisma.user.deleteMany({ where: { email: { endsWith: DEMO_SUFFIX } } });

  const passwordHash = await bcrypt.hash('Password123!', 12);

  const createdStudents = [];
  for (const s of students) {
    const user = await prisma.user.create({
      data: {
        email: s.name.toLowerCase().replace(/\s+/g, '.') + DEMO_SUFFIX,
        passwordHash,
        role: 'student',
        name: s.name,
        student: {
          create: {
            university: s.university,
            major: s.major,
            graduationYear: s.graduationYear,
            skills: s.skills,
          },
        },
      },
      include: { student: true },
    });
    createdStudents.push(user.student!);
  }

  const createdEmployers = [];
  for (const e of employers) {
    const user = await prisma.user.create({
      data: {
        email: e.name.toLowerCase().replace(/\s+/g, '.') + DEMO_SUFFIX,
        passwordHash,
        role: 'employer',
        name: e.name,
        employer: {
          create: {
            companyName: e.name,
            industry: e.industry,
            companySize: e.size,
            verified: true,
          },
        },
      },
      include: { employer: true },
    });
    createdEmployers.push(user.employer!);
  }

  const createdProjects = [];
  for (const p of projects) {
    const project = await prisma.project.create({
      data: {
        title: p.title,
        description: p.desc,
        type: p.type as any,
        budget: p.budget,
        location: p.location,
        remote: p.remote,
        skillsRequired: p.skills,
        status: 'open',
        employerId: createdEmployers[p.employerIdx].id,
      },
    });
    createdProjects.push(project);
  }

  // Apply a few students to a few projects
  const applications = [
    { studentIdx: 0, projectIdx: 0, status: 'pending' },
    { studentIdx: 1, projectIdx: 2, status: 'accepted' },
    { studentIdx: 2, projectIdx: 4, status: 'pending' },
    { studentIdx: 4, projectIdx: 3, status: 'rejected' },
    { studentIdx: 3, projectIdx: 5, status: 'pending' },
    { studentIdx: 0, projectIdx: 1, status: 'pending' },
  ];
  const createdApplications = [];
  for (const a of applications) {
    const app = await prisma.application.create({
      data: {
        projectId: createdProjects[a.projectIdx].id,
        studentId: createdStudents[a.studentIdx].id,
        status: a.status as any,
        coverLetter: 'I am excited about this opportunity and believe my skills are a strong match.',
      },
    });
    createdApplications.push(app);
  }

  // Demo interview: Phnom Penh Labs <> Sopanha Vosi for the Frontend Intern role
  const pplEmployer = createdEmployers[0];
  const finnStudent = createdStudents[0];
  const frontendProject = createdProjects[0];
  const finnApp = createdApplications.find(
    (a) => a.projectId === frontendProject.id && a.studentId === finnStudent.id
  )!;

  const interviewAt = new Date();
  interviewAt.setDate(interviewAt.getDate() + 2); // 2 days from now
  interviewAt.setHours(9, 30, 0, 0);

  await prisma.interview.create({
    data: {
      employerId: pplEmployer.id,
      studentId: finnStudent.id,
      projectId: frontendProject.id,
      applicationId: finnApp.id,
      scheduledAt: interviewAt,
      durationMin: 45,
      type: 'online',
      status: 'scheduled',
      meetingLink: 'https://meet.skillbridge.dev/frontend-intern-finn',
    },
  });

  // Demo conversation: Phnom Penh Labs <> Sopanha Vosi
  const conversation = await prisma.conversation.create({
    data: {
      employerId: pplEmployer.id,
      studentId: finnStudent.id,
      projectId: frontendProject.id,
      applicationId: finnApp.id,
      messages: {
        create: [
          {
            senderId: pplEmployer.userId,
            senderRole: 'employer',
            body: 'Hi Sopanha — thanks for applying to the Frontend Developer Intern role. We were impressed by your React portfolio!',
            read: true,
          },
          {
            senderId: finnStudent.userId,
            senderRole: 'student',
            body: 'Thank you! I am really excited about the role and would love to learn more about the team.',
            read: true,
          },
          {
            senderId: pplEmployer.userId,
            senderRole: 'employer',
            body: 'Great. I have scheduled an interview for you — you will see it in the Interviews tab. Let me know if the time works.',
            read: false,
          },
        ],
      },
    },
  });

  console.log(
    `✅ Seeded ${students.length} students, ${employers.length} employers, ${projects.length} projects, ${applications.length} applications, 1 interview, 1 conversation.`
  );
  console.log('Demo login: any @skillbridge.demo email with password "Password123!"');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
