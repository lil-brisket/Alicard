import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";

export default async function ModLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Check if user has MODERATOR or ADMIN role (check both single role and multi-roles)
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: {
        select: {
          role: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/auth/signin");
  }

  // Check single role or multi-roles
  const hasModAccess =
    user.role === "MODERATOR" ||
    user.role === "ADMIN" ||
    user.roles?.some((r) => r.role === "MODERATOR" || r.role === "ADMIN");

  if (!hasModAccess) {
    redirect("/hub");
  }

  return <>{children}</>;
}
