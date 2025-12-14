import { notFound } from "next/navigation";
import Link from "next/link";
import { api } from "~/trpc/server";
import { ProfileHeaderCard } from "../_components/profile-header-card";
import { ProfileStatsCard } from "../_components/profile-stats-card";
import { ProfilePvpCard } from "../_components/profile-pvp-card";
import { ProfilePveCard } from "../_components/profile-pve-card";
import { ProfileAchievementsCard } from "../_components/profile-achievements-card";
import { ProfileSocialCard } from "../_components/profile-social-card";

type ProfileUsernamePageProps = {
  params: Promise<{ username: string }>;
};

export default async function ProfileUsernamePage({
  params,
}: ProfileUsernamePageProps) {
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

  // For public profiles, we don't have access to current HP/SP, so use defaults
  const maxHP = 100; // TODO: Get from profile stats if available
  const currentHP = 100;
  const maxSP = 50;
  const currentSP = 50;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">
            {profile.user.name ?? profile.user.username}&apos;s Profile
          </h1>
          <Link
            href="/hub"
            className="inline-block rounded-xl bg-cyan-500/20 px-6 py-3 text-cyan-400 transition hover:bg-cyan-500/30"
          >
            Return to Hub
          </Link>
        </div>

        <main className="mt-4 grid flex-1 grid-cols-1 gap-4 md:mt-6 md:grid-cols-12">
          {/* Left column: md:col-span-5 */}
          <section className="space-y-4 md:col-span-5">
            <ProfileHeaderCard
              avatar={profile.user.image}
              displayName={profile.user.name}
              username={profile.user.username}
              status={profile.status === "Fallen" ? "Fallen" : "Alive"}
              level={profile.level}
              powerScore={profile.powerScore}
              guildName={profile.social?.guildName}
              title={profile.social?.title}
              tagline={profile.social?.tagline}
            />

            <ProfileStatsCard
              vitality={profile.profileStats?.vitality ?? 10}
              strength={profile.profileStats?.strength ?? 10}
              speed={profile.profileStats?.speed ?? 10}
              dexterity={profile.profileStats?.dexterity ?? 10}
              maxHP={maxHP}
              currentHP={currentHP}
              maxSP={maxSP}
              currentSP={currentSP}
            />
          </section>

          {/* Right column: md:col-span-7 */}
          <section className="space-y-4 md:col-span-7">
            <ProfilePvpCard
              wins={profile.pvpRecord?.wins ?? 0}
              losses={profile.pvpRecord?.losses ?? 0}
              winPercent={profile.winPercent}
            />

            <ProfilePveCard
              totalKills={profile.pveRecord?.totalKills ?? 0}
              bossesSlain={profile.pveRecord?.bossesSlain ?? 0}
              deathsUsed={profile.pveRecord?.deathsUsed ?? 0}
              deathsLimit={profile.pveRecord?.deathsLimit ?? 5}
              deathsRemaining={profile.deathsRemaining}
            />

            <ProfileAchievementsCard
              achievements={profile.achievements.map((pa) => ({
                id: pa.achievement.id,
                key: pa.achievement.key,
                name: pa.achievement.name,
                description: pa.achievement.description,
                icon: pa.achievement.icon,
                rarity: pa.achievement.rarity,
                unlockedAt: pa.unlockedAt,
              }))}
              username={profile.user.username}
            />

            <ProfileSocialCard
              guildName={profile.social?.guildName}
              guildRole={profile.social?.guildRole}
              friendsCount={profile.social?.friendsCount ?? 0}
              commendationsHelpful={profile.social?.commendationsHelpful ?? 0}
              commendationsSkilled={profile.social?.commendationsSkilled ?? 0}
              commendationsStrategic={profile.social?.commendationsStrategic ?? 0}
            />
          </section>
        </main>
      </div>
    </div>
  );
}
