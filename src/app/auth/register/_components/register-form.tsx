"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function RegisterForm() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [gender, setGender] = useState("");
  const [agreeToRules, setAgreeToRules] = useState(false);
  const [agreeToPermaDeath, setAgreeToPermaDeath] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreeToRules) {
      setError("You must agree to the game rules to register.");
      return;
    }

    if (!agreeToPermaDeath) {
      setError("You must acknowledge the perma-death policy to register.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
          gender,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Auto-sign in the user after successful registration
        const result = await signIn("credentials", {
          email,
          password,
          redirect: false,
          callbackUrl: "/hub",
        });

        if (result?.error) {
          // Registration succeeded but sign-in failed - redirect to sign-in page
          router.push("/auth/signin?registered=true&callbackUrl=/hub");
        } else if (result?.ok) {
          router.push("/hub");
          router.refresh();
        }
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
          <label htmlFor="username" className="text-sm font-medium">
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            disabled={isLoading}
            className="rounded-lg bg-white/10 px-4 py-2 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)] disabled:opacity-50"
            placeholder="Your username"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label htmlFor="gender" className="text-sm font-medium">
            Gender
          </label>
          <select
            id="gender"
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            required
            disabled={isLoading}
            className="rounded-lg bg-white/10 px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[hsl(280,100%,70%)] disabled:opacity-50"
          >
            <option value="" className="bg-gray-800 text-white">
              Select gender
            </option>
            <option value="MALE" className="bg-gray-800 text-white">
              Male
            </option>
            <option value="FEMALE" className="bg-gray-800 text-white">
              Female
            </option>
            <option value="OTHER" className="bg-gray-800 text-white">
              Other
            </option>
          </select>
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

        <div className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <div className="flex items-start gap-3">
            <input
              id="agreeToRules"
              type="checkbox"
              checked={agreeToRules}
              onChange={(e) => setAgreeToRules(e.target.checked)}
              disabled={isLoading}
              required
              className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)] disabled:opacity-50"
            />
            <label
              htmlFor="agreeToRules"
              className="text-sm text-white/90 cursor-pointer"
            >
              I agree to follow the game rules and terms of service
            </label>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="agreeToPermaDeath"
              type="checkbox"
              checked={agreeToPermaDeath}
              onChange={(e) => setAgreeToPermaDeath(e.target.checked)}
              disabled={isLoading}
              required
              className="mt-1 h-4 w-4 rounded border-white/20 bg-white/10 text-[hsl(280,100%,70%)] focus:ring-2 focus:ring-[hsl(280,100%,70%)] disabled:opacity-50"
            />
            <label
              htmlFor="agreeToPermaDeath"
              className="text-sm text-white/90 cursor-pointer"
            >
              I understand that perma-death includes permanent account deletion
              and there are{" "}
              <span className="font-semibold text-red-300">no recovery options</span>. I accept full responsibility for my actions.
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading || !agreeToRules || !agreeToPermaDeath || !username || !gender}
          className="rounded-lg bg-[hsl(280,100%,70%)] px-4 py-2 font-semibold text-white transition hover:bg-[hsl(280,100%,65%)] active:bg-[hsl(280,100%,60%)] disabled:opacity-50 min-h-[44px]"
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

