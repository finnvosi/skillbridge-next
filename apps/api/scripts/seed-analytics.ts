import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const employer = await prisma.employer.findFirst({
    where: { companyName: "Mekong Studio" },
    include: { projects: true },
  });
  if (!employer || !employer.projects.length) {
    console.log("employer/project not found");
    return;
  }
  const projectIds = employer.projects.map((p) => p.id);

  // Ensure 7 students exist for a fuller funnel.
  let students = await prisma.student.findMany({ take: 10 });
  while (students.length < 7) {
    const n = students.length + 1;
    const user = await prisma.user.create({
      data: {
        email: `demo.student${n}@skillbridge.demo`,
        passwordHash: "demo",
        role: "student",
        name: `Demo Student ${n}`,
      },
    });
    const s = await prisma.student.create({
      data: {
        userId: user.id,
        university: "Royal University of Phnom Penh",
        major: "Computer Science",
        skills: ["React", "Figma", "Python"],
      },
    });
    students.push(s);
  }

  // Wipe prior demo rows on this employer's projects.
  await prisma.application.deleteMany({ where: { projectId: { in: projectIds } } });

  // Build all unique (student, project) pairs.
  const pairs: { studentId: string; projectId: string }[] = [];
  for (const s of students) {
    for (const pid of projectIds) pairs.push({ studentId: s.id, projectId: pid });
  }

  const today = new Date();
  // Inverted funnel — total must fit within available unique pairs (14).
  const plan: { stage: any; n: number }[] = [
    { stage: "applied", n: 5 },
    { stage: "screening", n: 3 },
    { stage: "shortlisted", n: 2 },
    { stage: "interview", n: 2 },
    { stage: "offer", n: 1 },
    { stage: "hired", n: 1 },
  ];
  const totalNeeded = plan.reduce((s, p) => s + p.n, 0);
  if (totalNeeded > pairs.length) {
    console.log(`need ${totalNeeded} pairs but only ${pairs.length} available`);
    return;
  }

  let cursor = 0;
  let day = 0;
  for (const { stage, n } of plan) {
    for (let i = 0; i < n; i++) {
      const pair = pairs[cursor++];
      const created = new Date(today);
      created.setDate(created.getDate() - day);
      await prisma.application.create({
        data: {
          projectId: pair.projectId,
          studentId: pair.studentId,
          stage,
          status: stage === "hired" ? "accepted" : "pending",
          createdAt: created,
        },
      });
    }
    day += 1;
  }
  const total = await prisma.application.count({ where: { projectId: { in: projectIds } } });
  console.log(`rebuilt funnel on ${projectIds.length} projects; apps =`, total);
}

main().finally(() => prisma.$disconnect());
