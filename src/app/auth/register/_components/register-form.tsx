"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          name: name || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        router.push("/auth/signin?registered=true");
      } else {
        setError(data.error || "Registration failed. Please try again.");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md space-y-6">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded-xl bg-white/10 p-6"
      >
        <h2 className="text-2xl font-bold">Create an Account</h2>

        {error && (
          <div className="rounded-lg bg-red-500/20 p-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <label htmlFor="name" className="text-sm font-medium">
            Name (Optional)
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
            className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)] disabled:opacity-50"
            placeholder="Your name"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={isLoading}
            className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)] disabled:opacity-50"
            placeholder="you@example.com"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            disabled={isLoading}
            className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)] disabled:opacity-50"
            placeholder="••••••••"
          />
          <p className="text-xs text-white/60">
            Password must be at least 8 characters
          </p>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="rounded-lg bg-[hsl(280,100%,70%)] px-4 py-2 font-semibold text-white transition hover:bg-[hsl(280,100%,65%)] disabled:opacity-50"
        >
          {isLoading ? "Creating account..." : "Sign Up"}
        </button>
      </form>

      <div className="text-center text-sm text-white/70">
        Already have an account?{" "}
        <a
          href="/auth/signin"
          className="font-medium text-[hsl(280,100%,70%)] hover:underline"
        >
          Sign in
        </a>
      </div>
    </div>
  );
}

