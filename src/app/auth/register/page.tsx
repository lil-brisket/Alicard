import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { RegisterForm } from "./_components/register-form";

export default async function RegisterPage() {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-black via-black to-slate-950 text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Sign <span className="text-[hsl(280,100%,70%)]">Up</span>
        </h1>
        <RegisterForm />
      </div>
    </main>
  );
}

