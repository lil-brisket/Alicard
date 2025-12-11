import { redirect } from "next/navigation";

import { auth } from "~/server/auth";
import { env } from "~/env";
import { SignInForm } from "./_components/sign-in-form";

export default async function SignInPage() {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  const oauthProviders = {
    google: !!(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET),
    github: !!(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET),
    discord: !!(env.AUTH_DISCORD_ID && env.AUTH_DISCORD_SECRET),
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-8 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Sign <span className="text-[hsl(280,100%,70%)]">In</span>
        </h1>
        <SignInForm oauthProviders={oauthProviders} />
      </div>
    </main>
  );
}

