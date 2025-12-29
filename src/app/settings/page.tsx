"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { api } from "~/trpc/react";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const { data: settings, isLoading } = api.settings.getSettings.useQuery();

  const utils = api.useUtils();

  // Username update
  const [username, setUsername] = useState("");
  const updateUsername = api.settings.updateUsername.useMutation({
    onSuccess: () => {
      toast.success("Username updated successfully!");
      void utils.settings.getSettings.invalidate();
      setActiveSection(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update username");
    },
  });

  // Password update
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const updatePassword = api.settings.updatePassword.useMutation({
    onSuccess: () => {
      toast.success("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setActiveSection(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update password");
    },
  });

  // Avatar update
  const [avatarUrl, setAvatarUrl] = useState("");
  const updateAvatar = api.settings.updateAvatar.useMutation({
    onSuccess: () => {
      toast.success("Avatar updated successfully!");
      void utils.settings.getSettings.invalidate();
      setActiveSection(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update avatar");
    },
  });

  // Gender update
  const [gender, setGender] = useState<"MALE" | "FEMALE" | "OTHER">("MALE");
  const updateGender = api.settings.updateGender.useMutation({
    onSuccess: () => {
      toast.success("Gender updated successfully!");
      void utils.settings.getSettings.invalidate();
      setActiveSection(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update gender");
    },
  });

  // Character name update
  const [characterName, setCharacterName] = useState("");
  const updateCharacterName = api.settings.updateCharacterName.useMutation({
    onSuccess: () => {
      toast.success("Character name updated successfully!");
      void utils.settings.getSettings.invalidate();
      setActiveSection(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update character name");
    },
  });

  // Journal update
  const [journal, setJournal] = useState("");
  const updateJournal = api.settings.updateJournal.useMutation({
    onSuccess: () => {
      toast.success("Journal updated successfully!");
      void utils.settings.getSettings.invalidate();
      setActiveSection(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update journal");
    },
  });

  // Handle authentication redirect (must be before any early returns)
  useEffect(() => {
    if (status === "unauthenticated" || (!session?.user && status !== "loading")) {
      router.push("/auth/signin");
    }
  }, [status, session, router]);

  // Initialize form values when settings load
  useEffect(() => {
    if (settings) {
      setUsername(settings.username ?? "");
      setAvatarUrl(settings.avatar ?? "");
      setGender((settings.gender as "MALE" | "FEMALE" | "OTHER") ?? "MALE");
      setCharacterName(settings.characterName ?? "");
      setJournal(settings.journal ?? "");
    }
  }, [settings]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <div className="flex items-center justify-center py-12">
            <div className="text-slate-400">Loading settings...</div>
          </div>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="mx-auto max-w-5xl p-4 md:p-8">
          <div className="rounded-xl border border-red-500/20 bg-red-950/30 p-8 text-center">
            <h2 className="text-xl font-semibold text-red-400">Settings Not Found</h2>
            <p className="mt-2 text-slate-400">Unable to load your settings.</p>
          </div>
        </div>
      </div>
    );
  }

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    updatePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-5xl p-4 md:p-8">
        <h1 className="text-2xl font-bold text-cyan-400 mb-2">Settings</h1>
        <p className="text-slate-400 mb-6">Manage your account and profile settings</p>

        <div className="space-y-4">
          {/* Username Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Username</h2>
                <p className="text-sm text-slate-400">Change your account username</p>
              </div>
              <button
                onClick={() => {
                  setActiveSection(activeSection === "username" ? null : "username");
                  setUsername(settings.username ?? "");
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
              >
                {activeSection === "username" ? "Cancel" : "Edit"}
              </button>
            </div>
            {activeSection === "username" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateUsername.mutate({ username });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">New Username</label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter new username"
                    required
                    minLength={3}
                    maxLength={20}
                  />
                  <p className="mt-1 text-xs text-slate-400">3-20 characters, letters, numbers, underscores, and hyphens only</p>
                </div>
                <button
                  type="submit"
                  disabled={updateUsername.isPending}
                  className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition disabled:opacity-50"
                >
                  {updateUsername.isPending ? "Saving..." : "Save Username"}
                </button>
              </form>
            ) : (
              <div className="text-slate-300">{settings.username}</div>
            )}
          </div>

          {/* Character Name Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Character Name</h2>
                <p className="text-sm text-slate-400">Change your character's display name</p>
              </div>
              <button
                onClick={() => {
                  setActiveSection(activeSection === "characterName" ? null : "characterName");
                  setCharacterName(settings.characterName ?? "");
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
              >
                {activeSection === "characterName" ? "Cancel" : "Edit"}
              </button>
            </div>
            {activeSection === "characterName" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateCharacterName.mutate({ characterName });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">New Character Name</label>
                  <input
                    type="text"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter new character name"
                    required
                    maxLength={50}
                  />
                </div>
                <button
                  type="submit"
                  disabled={updateCharacterName.isPending}
                  className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition disabled:opacity-50"
                >
                  {updateCharacterName.isPending ? "Saving..." : "Save Character Name"}
                </button>
              </form>
            ) : (
              <div className="text-slate-300">{settings.characterName || "Not set"}</div>
            )}
          </div>

          {/* Password Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Password</h2>
                <p className="text-sm text-slate-400">Change your account password</p>
              </div>
              <button
                onClick={() => {
                  setActiveSection(activeSection === "password" ? null : "password");
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
              >
                {activeSection === "password" ? "Cancel" : "Change"}
              </button>
            </div>
            {activeSection === "password" && (
              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Current Password</label>
                  <input
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter current password"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Enter new password"
                    required
                    minLength={8}
                  />
                  <p className="mt-1 text-xs text-slate-400">Minimum 8 characters</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="Confirm new password"
                    required
                    minLength={8}
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatePassword.isPending}
                  className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition disabled:opacity-50"
                >
                  {updatePassword.isPending ? "Updating..." : "Update Password"}
                </button>
              </form>
            )}
          </div>

          {/* Avatar Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Avatar</h2>
                <p className="text-sm text-slate-400">Set your avatar image URL</p>
              </div>
              <button
                onClick={() => {
                  setActiveSection(activeSection === "avatar" ? null : "avatar");
                  setAvatarUrl(settings.avatar ?? "");
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
              >
                {activeSection === "avatar" ? "Cancel" : "Edit"}
              </button>
            </div>
            {activeSection === "avatar" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateAvatar.mutate({ avatarUrl: avatarUrl || null });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">Avatar URL</label>
                  <input
                    type="url"
                    value={avatarUrl}
                    onChange={(e) => setAvatarUrl(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    placeholder="https://example.com/avatar.png"
                  />
                  <p className="mt-1 text-xs text-slate-400">Enter a valid image URL</p>
                </div>
                {avatarUrl && (
                  <div className="mt-4">
                    <p className="text-sm font-medium mb-2">Preview:</p>
                    <img
                      src={avatarUrl}
                      alt="Avatar preview"
                      className="w-24 h-24 rounded-lg border border-slate-700 object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  disabled={updateAvatar.isPending}
                  className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition disabled:opacity-50"
                >
                  {updateAvatar.isPending ? "Saving..." : "Save Avatar"}
                </button>
              </form>
            ) : (
              <div className="flex items-center gap-4">
                {settings.avatar ? (
                  <img
                    src={settings.avatar}
                    alt="Avatar"
                    className="w-16 h-16 rounded-lg border border-slate-700 object-cover"
                    onError={(e) => {
                      e.currentTarget.src = "/character-silhouette.png";
                    }}
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg border border-slate-700 bg-slate-800 flex items-center justify-center text-slate-500">
                    No Avatar
                  </div>
                )}
                <div className="text-slate-300">{settings.avatar || "No avatar set"}</div>
              </div>
            )}
          </div>

          {/* Gender Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Gender</h2>
                <p className="text-sm text-slate-400">Update your gender preference</p>
              </div>
              <button
                onClick={() => {
                  setActiveSection(activeSection === "gender" ? null : "gender");
                  setGender((settings.gender as "MALE" | "FEMALE" | "OTHER") ?? "MALE");
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
              >
                {activeSection === "gender" ? "Cancel" : "Edit"}
              </button>
            </div>
            {activeSection === "gender" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateGender.mutate({ gender });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">Select Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "MALE" | "FEMALE" | "OTHER")}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={updateGender.isPending}
                  className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition disabled:opacity-50"
                >
                  {updateGender.isPending ? "Saving..." : "Save Gender"}
                </button>
              </form>
            ) : (
              <div className="text-slate-300 capitalize">{settings.gender?.toLowerCase()}</div>
            )}
          </div>

          {/* Journal Section */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Journal</h2>
                <p className="text-sm text-slate-400">BBCode journal displayed on your public profile</p>
              </div>
              <button
                onClick={() => {
                  setActiveSection(activeSection === "journal" ? null : "journal");
                  setJournal(settings.journal ?? "");
                }}
                className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium transition"
              >
                {activeSection === "journal" ? "Cancel" : "Edit"}
              </button>
            </div>
            {activeSection === "journal" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  updateJournal.mutate({ journal: journal || null });
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium mb-2">Journal (BBCode)</label>
                  <textarea
                    value={journal}
                    onChange={(e) => setJournal(e.target.value)}
                    className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500 min-h-[200px] font-mono text-sm"
                    placeholder="Enter your journal in BBCode format..."
                    maxLength={5000}
                  />
                  <p className="mt-1 text-xs text-slate-400">
                    {journal.length}/5000 characters. Supports BBCode formatting.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={updateJournal.isPending}
                  className="px-6 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium transition disabled:opacity-50"
                >
                  {updateJournal.isPending ? "Saving..." : "Save Journal"}
                </button>
              </form>
            ) : (
              <div className="text-slate-300 whitespace-pre-wrap">
                {settings.journal || "No journal entry yet"}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
