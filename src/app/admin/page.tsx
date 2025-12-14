import { redirect } from "next/navigation";

export default function AdminPage() {
  // Redirect to users page by default
  redirect("/admin/users");
}
