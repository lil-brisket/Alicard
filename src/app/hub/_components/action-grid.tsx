import { HubTile } from "./hub-tile";

type ActionLink = {
  label: string;
  href: string;
  icon?: string;
  description?: string;
};

const actionLinks: ActionLink[] = [
  { label: "World", href: "/world", description: "Explore the tower" },
  { label: "Combat", href: "/combat", description: "Engage in battle" },
  { label: "Inventory", href: "/inventory", description: "Manage items" },
  { label: "Equipment", href: "/equipment", description: "Equip gear" },
  { label: "Skills", href: "/skills", description: "View abilities" },
  { label: "Quests", href: "/quests", description: "Active missions" },
  { label: "Guilds", href: "/guilds", description: "Join a guild" },
  { label: "Market", href: "/hub/market", description: "Buy & sell" },
  { label: "Jobs", href: "/hub/jobs", description: "Professions & training" },
  { label: "Crafting", href: "/crafting", description: "Recipes by profession" },
  { label: "Bank", href: "/bank", description: "Store valuables" },
  { label: "Profile", href: "/profile", description: "Character info" },
  { label: "Leaderboards", href: "/leaderboards", description: "Top players" },
  { label: "Tutorial", href: "/tutorial", description: "Learn the game" },
];

export function ActionGrid() {
  return (
    <div className="rounded-xl border border-slate-700/50 bg-slate-900/60 p-4 shadow-black/30 backdrop-blur-sm md:p-6">
      <h2 className="mb-3 text-sm font-semibold text-cyan-400 tracking-wide uppercase md:mb-4">Quick Actions</h2>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 md:gap-3">
        {actionLinks.map((link) => (
          <HubTile
            key={link.href}
            label={link.label}
            href={link.href}
            description={link.description}
          />
        ))}
      </div>
    </div>
  );
}

