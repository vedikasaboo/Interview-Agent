import { prisma } from "../lib/prisma";
import { hashPassword } from "../lib/password";

interface CreateRecruiterInput {
  email: string;
  password: string;
  name: string;
  company: string;
}

// Never selects passwordHash back out. A duplicate email throws Prisma P2002,
// which the error middleware maps to 409.
export const createRecruiter = (input: CreateRecruiterInput) =>
  hashPassword(input.password).then((passwordHash) =>
    prisma.recruiter.create({
      data: {
        email: input.email,
        passwordHash,
        name: input.name,
        company: input.company,
      },
      select: { id: true, email: true, name: true, company: true, createdAt: true },
    }),
  );

export const findRecruiterByEmail = (email: string) =>
  prisma.recruiter.findUnique({ where: { email } });

export const findRecruiterById = (id: number) =>
  prisma.recruiter.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, company: true, createdAt: true },
  });
