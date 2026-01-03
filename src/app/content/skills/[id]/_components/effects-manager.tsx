"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { toast } from "react-hot-toast";

type Effect = {
  id: string;
  type: string;
  stat: string | null;
  value: number;
  ratio: number | null;
  durationTurns: number;
  chance: number;
  tickIntervalTurns: number;
  maxStacks: number;
  note: string | null;
  ordering: number;
};

type EffectsManagerProps = {
  skillId: string;
  effects: Effect[];
  onUpdate: () => void;
};

export function EffectsManager({ skillId, effects, onUpdate }: EffectsManagerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const addEffect = api.content.skills.effects.add.useMutation({
    onSuccess: () => {
      toast.success("Effect added");
      setShowAddForm(false);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const updateEffect = api.content.skills.effects.update.useMutation({
    onSuccess: () => {
      toast.success("Effect updated");
      setEditingId(null);
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const deleteEffect = api.content.skills.effects.delete.useMutation({
    onSuccess: () => {
      toast.success("Effect deleted");
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const reorderEffects = api.content.skills.effects.reorder.useMutation({
    onSuccess: () => {
      toast.success("Effects reordered");
      onUpdate();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...effects];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    reorderEffects.mutate({
      skillId,
      orderedIds: newOrder.map((e) => e.id),
    });
  };

  const handleMoveDown = (index: number) => {
    if (index === effects.length - 1) return;
    const newOrder = [...effects];
    [newOrder[index], newOrder[index + 1]] = [newOrder[index + 1], newOrder[index]];
    reorderEffects.mutate({
      skillId,
      orderedIds: newOrder.map((e) => e.id),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-cyan-400">Effects</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-cyan-700"
        >
          Add Effect
        </button>
      </div>

      {showAddForm && (
        <EffectForm
          skillId={skillId}
          onSave={(data) => {
            addEffect.mutate({ skillId, effect: data });
          }}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      <div className="space-y-2">
        {effects.map((effect, index) => (
          <div
            key={effect.id}
            className="rounded-lg border border-slate-800 bg-slate-900/50 p-4"
          >
            {editingId === effect.id ? (
              <EffectForm
                skillId={skillId}
                effect={effect}
                onSave={(data) => {
                  updateEffect.mutate({ id: effect.id, effect: data });
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-cyan-400">{effect.type}</span>
                    {effect.stat && (
                      <span className="text-sm text-slate-400">({effect.stat})</span>
                    )}
                    <span className="text-sm text-slate-500">#{index + 1}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-300">
                    Value: {effect.value}
                    {effect.ratio && ` + ${effect.ratio}x scaling`}
                    {effect.durationTurns > 0 && ` for ${effect.durationTurns} turns`}
                    {effect.chance < 1 && ` (${(effect.chance * 100).toFixed(0)}% chance)`}
                  </div>
                  {effect.note && (
                    <div className="mt-1 text-xs text-slate-500">{effect.note}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || reorderEffects.isPending}
                    className="text-sm text-slate-400 hover:text-slate-300 disabled:opacity-50"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => handleMoveDown(index)}
                    disabled={index === effects.length - 1 || reorderEffects.isPending}
                    className="text-sm text-slate-400 hover:text-slate-300 disabled:opacity-50"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => setEditingId(effect.id)}
                    className="text-sm text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm("Delete this effect?")) {
                        deleteEffect.mutate({ id: effect.id });
                      }
                    }}
                    className="text-sm text-red-400 hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {effects.length === 0 && (
          <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-400">
            No effects. Click "Add Effect" to create one.
          </div>
        )}
      </div>
    </div>
  );
}

function EffectForm({
  skillId,
  effect,
  onSave,
  onCancel,
}: {
  skillId: string;
  effect?: Effect;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    type: effect?.type || "DAMAGE",
    stat: effect?.stat || null,
    value: effect?.value || 0,
    ratio: effect?.ratio || null,
    durationTurns: effect?.durationTurns || 0,
    chance: effect?.chance ?? 1.0,
    tickIntervalTurns: effect?.tickIntervalTurns || 1,
    maxStacks: effect?.maxStacks || 1,
    note: effect?.note || "",
    ordering: effect?.ordering || 0,
  });

  const needsStat = form.type === "BUFF_STAT" || form.type === "DEBUFF_STAT";

  return (
    <div className="space-y-4 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Type</label>
          <select
            value={form.type}
            onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          >
            <option value="DAMAGE">Damage</option>
            <option value="HEAL">Heal</option>
            <option value="BUFF_STAT">Buff Stat</option>
            <option value="DEBUFF_STAT">Debuff Stat</option>
            <option value="DOT">DOT</option>
            <option value="HOT">HOT</option>
            <option value="STUN">Stun</option>
            <option value="SILENCE">Silence</option>
            <option value="TAUNT">Taunt</option>
            <option value="SHIELD">Shield</option>
            <option value="CLEANSE">Cleanse</option>
            <option value="DISPEL">Dispel</option>
          </select>
        </div>
        {needsStat && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Stat</label>
            <select
              value={form.stat || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, stat: e.target.value || null }))
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
            >
              <option value="">Select stat</option>
              <option value="VITALITY">Vitality</option>
              <option value="STRENGTH">Strength</option>
              <option value="SPEED">Speed</option>
              <option value="DEXTERITY">Dexterity</option>
            </select>
          </div>
        )}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Value</label>
          <input
            type="number"
            value={form.value}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, value: parseInt(e.target.value) || 0 }))
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Ratio (optional)
          </label>
          <input
            type="number"
            step="0.1"
            value={form.ratio ?? ""}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                ratio: e.target.value ? parseFloat(e.target.value) : null,
              }))
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">
            Duration (turns)
          </label>
          <input
            type="number"
            value={form.durationTurns}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                durationTurns: parseInt(e.target.value) || 0,
              }))
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Chance (0-1)</label>
          <input
            type="number"
            step="0.1"
            min="0"
            max="1"
            value={form.chance}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                chance: parseFloat(e.target.value) || 0,
              }))
            }
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">Note</label>
        <input
          type="text"
          value={form.note}
          onChange={(e) => setForm((prev) => ({ ...prev, note: e.target.value }))}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100"
        />
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onSave(form)}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-700"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

