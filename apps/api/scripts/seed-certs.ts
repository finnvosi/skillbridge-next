import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const students = await prisma.student.findMany({ take: 5 });
  // Give the first two students a certificate each (one verified, one pending).
  if (students[0]) {
    await prisma.certificate.upsert({
      where: { id: `seed-cert-${students[0].id}` },
      update: {},
      create: {
        id: `seed-cert-${students[0].id}`,
        studentId: students[0].id,
        title: "React Developer Certification",
        description: "Meta Frontend Professional",
        fileUrl: "/uploads/cert-demo.pdf",
        fileKey: "cert-demo.pdf",
        mimeType: "application/pdf",
        fileSize: 12345,
        verified: true,
        verifiedAt: new Date(),
      },
    });
  }
  if (students[1]) {
    await prisma.certificate.upsert({
      where: { id: `seed-cert-${students[1].id}` },
      update: {},
      create: {
        id: `seed-cert-${students[1].id}`,
        studentId: students[1].id,
        title: "Python for Data Science",
        description: "Coursera",
        fileUrl: "/uploads/cert-demo2.pdf",
        fileKey: "cert-demo2.pdf",
        mimeType: "application/pdf",
        fileSize: 9876,
        verified: false,
      },
    });
  }
  const total = await prisma.certificate.count();
  console.log("seeded certs; total =", total);
}

main().finally(() => prisma.$disconnect());
