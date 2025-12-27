import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerAuthSession } from "~/server/auth";
import { api } from "~/trpc/server";
import { ProfileHeaderCard } from "./_components/profile-header-card";
import { ProfileStatsCard } from "./_components/profile-stats-card";
import { ProfilePvpCard } from "./_components/profile-pvp-card";
import { ProfilePveCard } from "./_components/profile-pve-card";
import { ProfileAchievementsCard } from "./_components/profile-achievements-card";
import { ProfileSocialCard } from "./_components/profile-social-card";
import { ProfileBankingCard } from "./_components/profile-banking-card";
import { ProfileJobsCard } from "./_components/profile-jobs-card";

export default async function ProfilePage() {
  const session = await getServerAuthSession();

  if (!session?.user) {
    redirect("/auth/signin");
  }

  const profile = await api.profile.getMyProfile();

  if (!profile) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-cyan-400">My Profile</h1>
          </div>
          <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-8 text-center">
            <h2 className="text-xl font-semibold text-red-400">Profile Not Found</h2>
            <p className="mt-2 text-slate-400">
              Unable to load your profile. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Get HP/SP from player stats if available, but sync with Character for max values
  // TODO: Get HP/SP from profile stats or player stats
  let maxHP = 100;
  let currentHP = 100;
  let maxSP = 50;
  let currentSP = 50;
  let hpRegenPerMin: number | undefined;
  let spRegenPerMin: number | undefined;
  
  try {
    // Get Character first to get the correct max values
    const character = await api.character.getOrCreateCurrent();
    
    // Calculate correct max values from Character stats
    // HP = 50 + (Vitality * 5)
    // SP = 20 + (Vitality * 2) + (Speed * 1)
    const calculatedMaxHP = 50 + (character.vitality * 5);
    const calculatedMaxSP = 20 + (character.vitality * 2) + (character.speed * 1);
    
    // Use Character values as source of truth for max
    maxHP = character.maxHp ?? calculatedMaxHP;
    maxSP = character.maxStamina ?? calculatedMaxSP;
    currentHP = character.currentHp;
    currentSP = character.currentStamina;
    
    // Get regen values from PlayerStats if available
    const user = await api.player.getCurrent();
    if (user?.stats) {
      // Use PlayerStats current values (with regen applied) but keep Character max values
      currentHP = user.stats.currentHP;
      currentSP = user.stats.currentSP;
      // Get regen values - base is always 100 for all accounts
      hpRegenPerMin = user.stats.hpRegenPerMin ?? 100;
      spRegenPerMin = user.stats.spRegenPerMin ?? 100;
      
      // Ensure max values match Character (they should be synced by getCurrent, but double-check)
      maxHP = user.stats.maxHP ?? calculatedMaxHP;
      maxSP = user.stats.maxSP ?? calculatedMaxSP;
    } else {
      // If player doesn't exist yet, still show default regen values (base is 100)
      hpRegenPerMin = 100;
      spRegenPerMin = 100;
    }
  } catch (error) {
    // Player might not exist, use defaults
    // Regen base is always 100 for all accounts
    hpRegenPerMin = 100;
    spRegenPerMin = 100;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col gap-4 p-4 md:p-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-cyan-400">My Profile</h1>
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
              hpRegenPerMin={hpRegenPerMin}
              spRegenPerMin={spRegenPerMin}
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

            <ProfileBankingCard
              balanceCoins={profile.bankAccount?.balanceCoins ?? 0}
              vaultLevel={profile.bankAccount?.vaultLevel ?? 1}
            />

            <ProfileJobsCard jobs={profile.jobs ?? []} />

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
