import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const employers = await prisma.employer.findMany({ include: { projects: true } });
  let changed = 0;

  for (const emp of employers) {
    const open = emp.projects.filter((p) => p.status === "open");
    if (open.length >= 2) {
      const [draftTarget, pauseTarget] = open;
      await prisma.project.update({ where: { id: draftTarget.id }, data: { status: "draft" } });
      await prisma.project.update({
        where: { id: pauseTarget.id },
        data: { status: "paused", publishedAt: new Date(Date.now() - 86400000) },
      });
      changed += 2;
    }
  }
  console.log("demo lifecycle seed: changed", changed, "jobs (draft + paused)");
}
main().finally(() => prisma.$disconnect());
