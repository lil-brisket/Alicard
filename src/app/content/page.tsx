import { redirect } from "next/navigation";

export default function ContentPage() {
  // Redirect to items page by default
  redirect("/content/items");
}
