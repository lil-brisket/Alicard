type CoreStatsCardProps = {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
};

export function CoreStatsCard({
  vitality,
  strength,
  speed,
  dexterity,
}: CoreStatsCardProps) {
  const stats = [
    { label: "Vitality", value: vitality, color: "text-red-400" },
    { label: "Strength", value: strength, color: "text-orange-400" },
    { label: "Speed", value: speed, color: "text-yellow-400" },
    { label: "Dexterity", value: dexterity, color: "text-green-400" },
  ];

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Core Stats</h2>

      <div className="grid grid-cols-2 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-slate-700/50 bg-slate-800/30 p-4"
          >
            <p className="mb-1 text-xs text-slate-400">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

