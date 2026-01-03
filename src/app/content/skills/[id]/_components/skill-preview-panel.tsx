"use client";

import { useState } from "react";
import {
  calculateSkillDamagePerHit,
  calculateSkillTotalDamage,
  calculateDamagePerTurn,
  calculateDamagePerSP,
  type AttackerStats,
} from "~/server/lib/skill-damage";

type Skill = {
  basePower: number | null;
  scalingStat: "VITALITY" | "STRENGTH" | "SPEED" | "DEXTERITY" | null;
  scalingRatio: number;
  flatBonus: number;
  hits: number;
  staminaCost: number;
  cooldownTurns: number;
  effects?: Array<{
    type: string;
    value: number;
    durationTurns: number;
    stat?: string | null;
  }>;
};

type SkillPreviewPanelProps = {
  skill: Skill;
};

export function SkillPreviewPanel({ skill }: SkillPreviewPanelProps) {
  const [attackerStats, setAttackerStats] = useState<AttackerStats>({
    vitality: 10,
    strength: 10,
    speed: 10,
    dexterity: 10,
  });

  const [targetDefense, setTargetDefense] = useState(0);
  const [targetVitality, setTargetVitality] = useState(100);

  const damageInput = {
    basePower: skill.basePower,
    scalingStat: skill.scalingStat,
    scalingRatio: skill.scalingRatio,
    flatBonus: skill.flatBonus,
    hits: skill.hits,
  };

  const perHit = calculateSkillDamagePerHit(damageInput, attackerStats);
  const totalDamage = calculateSkillTotalDamage(damageInput, attackerStats);
  const dpt = calculateDamagePerTurn(damageInput, attackerStats, skill.cooldownTurns);
  const dpsp = calculateDamagePerSP(damageInput, attackerStats, skill.staminaCost);

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-cyan-400">Attacker Stats</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Vitality
            </label>
            <input
              type="number"
              value={attackerStats.vitality}
              onChange={(e) =>
                setAttackerStats((prev) => ({
                  ...prev,
                  vitality: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Strength
            </label>
            <input
              type="number"
              value={attackerStats.strength}
              onChange={(e) =>
                setAttackerStats((prev) => ({
                  ...prev,
                  strength: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Speed
            </label>
            <input
              type="number"
              value={attackerStats.speed}
              onChange={(e) =>
                setAttackerStats((prev) => ({
                  ...prev,
                  speed: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Dexterity
            </label>
            <input
              type="number"
              value={attackerStats.dexterity}
              onChange={(e) =>
                setAttackerStats((prev) => ({
                  ...prev,
                  dexterity: parseInt(e.target.value) || 0,
                }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-cyan-400">Target Stats</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Defense
            </label>
            <input
              type="number"
              value={targetDefense}
              onChange={(e) => setTargetDefense(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Vitality
            </label>
            <input
              type="number"
              value={targetVitality}
              onChange={(e) => setTargetVitality(parseInt(e.target.value) || 0)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
        <h3 className="mb-4 text-lg font-semibold text-cyan-400">Damage Estimate</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Damage per Hit:</span>
            <span className="text-lg font-semibold text-cyan-400">{perHit}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Total Damage ({skill.hits} hits):</span>
            <span className="text-lg font-semibold text-cyan-400">{totalDamage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Damage per Turn (DPT):</span>
            <span className="text-lg font-semibold text-cyan-400">
              {dpt.toFixed(1)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-slate-400">Damage per SP:</span>
            <span className="text-lg font-semibold text-cyan-400">
              {dpsp.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {skill.effects && skill.effects.length > 0 && (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-cyan-400">Effect Summary</h3>
          <div className="space-y-2">
            {skill.effects.map((effect, idx) => (
              <div key={idx} className="text-sm text-slate-300">
                <span className="font-medium">{effect.type}</span>
                {effect.durationTurns > 0 && (
                  <span className="text-slate-500">
                    {" "}
                    {effect.value} for {effect.durationTurns} turns
                  </span>
                )}
                {effect.durationTurns === 0 && (
                  <span className="text-slate-500"> {effect.value}</span>
                )}
                {effect.stat && (
                  <span className="text-slate-500"> ({effect.stat})</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

