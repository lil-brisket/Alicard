import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-red-400">403 Forbidden</h1>
        <p className="mt-4 text-slate-400">
          You don't have permission to access this page.
        </p>
      </div>
    </div>
  );
}
