import { redirect } from "next/navigation";

export default function ContentPage() {
  // Redirect to dashboard by default
  redirect("/content/dashboard");
}
