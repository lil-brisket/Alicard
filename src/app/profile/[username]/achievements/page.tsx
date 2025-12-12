// TODO: Implement full achievements page
// This is a placeholder page for viewing all achievements

import { notFound } from "next/navigation";
import { api } from "~/trpc/server";

type ProfileAchievementsPageProps = {
  params: Promise<{ username: string }>;
};

export default async function ProfileAchievementsPage({
  params,
}: ProfileAchievementsPageProps) {
  const { username } = await params;

  let profile;
  try {
    profile = await api.profile.getProfileByHandleOrId({ handle: username });
  } catch (error) {
    notFound();
  }

  if (!profile) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400">
          {profile.user.name ?? profile.user.username}&apos;s Achievements
        </h1>
        <p className="mt-2 text-slate-400">
          Full achievements list coming soon
        </p>
      </div>
    </div>
  );
}
