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
  { label: "Skills", href: "/skills", description: "View abilities" },
  { label: "Quests", href: "/quests", description: "Active missions" },
  { label: "Guilds", href: "/guilds", description: "Join a guild" },
  { label: "Market", href: "/hub/market", description: "Buy & sell" },
  { label: "Jobs", href: "/hub/jobs", description: "Professions" },
  { label: "Recipes", href: "/hub/recipes", description: "Crafting recipes" },
  { label: "Gathering", href: "/hub/gathering", description: "Collect resources" },
  { label: "Crafting", href: "/crafting", description: "Create items" },
  { label: "Bank", href: "/bank", description: "Store valuables" },
  { label: "Profile", href: "/profile", description: "Character info" },
  { label: "Leaderboards", href: "/leaderboards", description: "Top players" },
  { label: "Tutorial", href: "/tutorial", description: "Learn the game" },
];

export function ActionGrid() {
  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Quick Actions</h2>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
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

