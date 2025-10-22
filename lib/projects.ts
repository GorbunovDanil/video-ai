import prisma from "./prisma";

/**
 * Gets or creates a default project for the user.
 * This ensures every user has at least one project to work with.
 */
export async function getOrCreateDefaultProject(userId: string) {
  // Try to find existing project
  let project = await prisma.project.findFirst({
    where: { userId },
    orderBy: { createdAt: "asc" },
    include: { brandKit: true },
  });

  // Create default project if none exists
  if (!project) {
    project = await prisma.project.create({
      data: {
        userId,
        name: "Default Project",
        description: "Your first creative project",
      },
      include: { brandKit: true },
    });
  }

  return project;
}
