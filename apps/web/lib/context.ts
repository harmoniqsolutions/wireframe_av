import { prisma } from "@wireframe-av/db";
import { DEFAULT_CONTEXT } from "@wireframe-av/shared/src/constants";

export async function getCurrentContext() {
  await prisma.organization.upsert({
    where: { id: DEFAULT_CONTEXT.organizationId },
    update: {},
    create: {
      id: DEFAULT_CONTEXT.organizationId,
      name: "Development Organization"
    }
  });

  await prisma.user.upsert({
    where: { id: DEFAULT_CONTEXT.userId },
    update: {},
    create: {
      id: DEFAULT_CONTEXT.userId,
      email: "dev@example.com",
      name: "Development User"
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: DEFAULT_CONTEXT.organizationId,
        userId: DEFAULT_CONTEXT.userId
      }
    },
    update: {},
    create: {
      organizationId: DEFAULT_CONTEXT.organizationId,
      userId: DEFAULT_CONTEXT.userId,
      role: "OWNER"
    }
  });

  return DEFAULT_CONTEXT;
}
