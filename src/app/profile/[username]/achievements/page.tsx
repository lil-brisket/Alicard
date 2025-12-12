import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";

type ProfileAchievementsPageProps = {
  params: Promise<{ username: string }>;
};

export default async function ProfileAchievementsPage({
  params,
}: ProfileAchievementsPageProps) {
  const { username } = await params;

  let profile;
  let achievements;
  try {
    profile = await api.profile.getProfileByHandleOrId({ handle: username });
    achievements = await api.profile.getAchievements({ handle: username });
  } catch (error) {
    notFound();
  }

  if (!profile) {
    notFound();
  }

  const rarityColors: Record<string, string> = {
    COMMON: "border-slate-500/50 bg-slate-700/30",
    UNCOMMON: "border-green-500/50 bg-green-700/20",
    RARE: "border-blue-500/50 bg-blue-700/20",
    EPIC: "border-purple-500/50 bg-purple-700/20",
    LEGENDARY: "border-yellow-500/50 bg-yellow-700/20",
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <Link
          href={`/profile/${username}`}
          className="inline-flex items-center gap-2 mb-6 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <span>←</span>
          <span>Back to Profile</span>
        </Link>

        <h1 className="text-2xl font-bold text-cyan-400">
          {profile.user.name ?? profile.user.username}&apos;s Achievements
        </h1>
        <p className="mt-2 text-slate-400">
          {achievements.length > 0
            ? `${achievements.length} achievement${achievements.length === 1 ? "" : "s"} unlocked`
            : "No achievements unlocked yet"}
        </p>

        {achievements.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/60 p-8 text-center">
            <p className="text-slate-400">No achievements unlocked yet</p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {achievements.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg border p-4 ${rarityColors[achievement.rarity] ?? rarityColors.COMMON}`}
              >
                <div className="mb-3 flex h-16 items-center justify-center">
                  {achievement.icon ? (
                    <img
                      src={achievement.icon}
                      alt={achievement.name}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <div className="text-4xl">🏆</div>
                  )}
                </div>
                <p className="mb-1 text-sm font-semibold text-slate-200">
                  {achievement.name}
                </p>
                {achievement.description && (
                  <p className="mb-2 text-xs text-slate-400 line-clamp-2">
                    {achievement.description}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  {new Date(achievement.unlockedAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
