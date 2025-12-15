import { requireAdminPage } from "~/server/lib/admin-auth";
import { AdminActionsClient } from "./_components/admin-actions-client";

export default async function AdminActionsPage() {
  // Ensure only admins can access this page
  await requireAdminPage();

  return <AdminActionsClient />;
}
