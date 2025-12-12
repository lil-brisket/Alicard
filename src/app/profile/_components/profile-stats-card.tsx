type ProfileStatsCardProps = {
  vitality: number;
  strength: number;
  speed: number;
  dexterity: number;
  maxHP: number;
  currentHP: number;
  maxSP: number;
  currentSP: number;
};

export function ProfileStatsCard({
  vitality,
  strength,
  speed,
  dexterity,
  maxHP,
  currentHP,
  maxSP,
  currentSP,
}: ProfileStatsCardProps) {
  const stats = [
    { label: "Vitality", value: vitality, color: "text-red-400" },
    { label: "Strength", value: strength, color: "text-orange-400" },
    { label: "Speed", value: speed, color: "text-yellow-400" },
    { label: "Dexterity", value: dexterity, color: "text-green-400" },
  ];

  const hpPercentage = (currentHP / maxHP) * 100;
  const spPercentage = (currentSP / maxSP) * 100;

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-gradient-to-br from-slate-800/80 to-slate-900/80 p-6 shadow-lg shadow-cyan-500/10 backdrop-blur-sm">
      <h2 className="mb-4 text-lg font-bold text-cyan-400">Core Stats</h2>

      <div className="mb-4 grid grid-cols-2 gap-4">
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

      {/* Derived Stats */}
      <div className="space-y-3 border-t border-slate-700/50 pt-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">HP</span>
            <span className="font-medium text-slate-300">
              {currentHP} / {maxHP}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-red-500 to-red-600 transition-all shadow-[0_0_8px_rgba(239,68,68,0.5)]"
              style={{ width: `${hpPercentage}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-slate-400">Stamina</span>
            <span className="font-medium text-slate-300">
              {currentSP} / {maxSP}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-700/50">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all shadow-[0_0_8px_rgba(34,211,238,0.5)]"
              style={{ width: `${spPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
