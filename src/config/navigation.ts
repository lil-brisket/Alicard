export type NavItem = {
  label: string;
  href: string;
  icon?: React.ReactNode; // optional if you want icons later
};

export const JOBS_NAV: NavItem[] = [
  { label: "Gatherer", href: "/jobs/gatherer" },
  { label: "Miner", href: "/jobs/miner" },
  { label: "Cook", href: "/jobs/cook" },
  { label: "Crafter", href: "/jobs/crafter" },
  { label: "Blacksmith", href: "/jobs/blacksmith" },
  { label: "Alchemist", href: "/jobs/alchemist" },
];

export const HUB_NAV: NavItem[] = [
  { label: "World Map", href: "/world" },
  { label: "Inventory", href: "/inventory" },
  { label: "Equipment", href: "/equipment" },
  { label: "Skills", href: "/skills" },
  { label: "Quests", href: "/quests" },
  { label: "Guilds", href: "/guilds" },
  { label: "Market", href: "/market" },
  { label: "Bank", href: "/bank" },
  { label: "Leaderboards", href: "/leaderboards" },
  { label: "Profile", href: "/profile" },
];

