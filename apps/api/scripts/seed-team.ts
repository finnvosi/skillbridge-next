import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const emp = await prisma.employer.findFirst({ where: { companyName: "Mekong Studio" } });
  if (!emp) return console.log("no Mekong Studio");
  const existing = await prisma.teamMember.count({ where: { employerId: emp.id } });
  if (existing > 0) return console.log("team already seeded:", existing);

  await prisma.teamMember.createMany({
    data: [
      { employerId: emp.id, name: "Srey Pich", email: "srey.pich@mekong.studio", role: "hiring_manager", status: "active" },
      { employerId: emp.id, name: "Vannak Heng", email: "vannak.heng@mekong.studio", role: "recruiter", status: "invited" },
    ],
  });
  console.log("seeded 2 teammates for Mekong Studio");
}
main().finally(() => prisma.$disconnect());
