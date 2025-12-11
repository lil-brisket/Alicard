import Link from "next/link";

const features = [
  {
    title: "100-Floor Tower",
    body: "Climb a deadly tower floor by floor. Each layer gets harder with stronger mobs, bosses, and events that reshape the world.",
    tag: "Progression",
  },
  {
    title: "Turn-Based MMO Combat",
    body: "Tactical, turn-based battles with text-forward feedback. Plan your actions, manage stamina, and outplay enemies instead of button mashing.",
    tag: "Combat",
  },
  {
    title: "Perma-Death Stakes",
    body: "Every death matters. Hit the death limit and your character is permanently gone—memorialized in the Hall of the Dead.",
    tag: "Risk",
  },
  {
    title: "Player-Driven Economy",
    body: "Occupations, trading, markets, and banking. Become a crafter, merchant, or guild banker powering the front lines.",
    tag: "Economy",
  },
];

const systems = [
  {
    title: "Core Stats",
    body: "Vitality, Strength, Speed, and Dexterity define your character. No classes (yet)—your build is driven by how you invest.",
  },
  {
    title: "Health & Stamina",
    body: "Health keeps you alive. Stamina fuels skills and actions. Managing both is the heart of Alicard's turn-based combat.",
  },
  {
    title: "Death Limit",
    body: "Characters only get a fixed number of deaths before perma-death. The exact limit is configurable, but the fear is real.",
  },
  {
    title: "Guilds & Occupations",
    body: "Form guilds, specialize into occupations, and contribute to a shared economy that supports tower progression.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-black text-slate-100">
      <div className="mx-auto flex max-w-6xl flex-col px-4 pb-24 pt-10 sm:px-6 lg:px-8 lg:pt-16">
        {/* NAVBAR */}
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md border border-slate-700 bg-slate-900/60 shadow" />
            <div>
              <p className="text-sm font-semibold tracking-widest text-slate-400">
                PROJECT
              </p>
              <p className="text-lg font-bold tracking-tight text-slate-50">
                Alicard
              </p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
            <a href="#game" className="hover:text-white">
              Game
            </a>
            <a href="#world" className="hover:text-white">
              World
            </a>
            <a href="#systems" className="hover:text-white">
              Systems
            </a>
            <a href="#roadmap" className="hover:text-white">
              Roadmap
            </a>
            <Link
              href="/auth"
              className="rounded-full border border-slate-700 px-4 py-1.5 text-xs font-medium uppercase tracking-wide hover:border-slate-400"
            >
              Login
            </Link>
          </nav>
        </header>

        {/* HERO */}
        <section
          id="game"
          className="mt-12 grid gap-10 md:mt-16 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center"
        >
          <div className="space-y-7">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SAO-inspired · Turn-based MMO · Perma-death
            </div>

            <div className="space-y-4">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl md:text-5xl">
                A tower MMO where{" "}
                <span className="bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
                  every death counts.
                </span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-300 sm:text-base">
                Alicard is a 2D, turn-based MMORPG inspired by Sword Art
                Online&apos;s death stakes and tower climb—without the VR.
                Explore a shared world, climb a 100-floor tower, and risk
                permanent character death after a limited number of falls.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <Link
                href="/play"
                className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/40 transition hover:bg-emerald-400"
              >
                Enter Prototype
                <span className="ml-2 text-xs font-normal text-emerald-950/80">
                  (Work in progress)
                </span>
              </Link>

              <Link
                href="/docs/gdd"
                className="inline-flex items-center justify-center rounded-full border border-slate-700 px-5 py-2.5 text-sm font-medium text-slate-100 hover:border-slate-400"
              >
                View Game Design
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 text-xs text-slate-400">
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Tech Stack</p>
                <p>Next.js · TypeScript · Prisma · PostgreSQL</p>
              </div>
              <div className="space-y-1">
                <p className="font-semibold text-slate-200">Gameplay</p>
                <p>Turn-based · MMO · Text-forward UI</p>
              </div>
            </div>
          </div>

          {/* HERO SIDE PANEL */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[2rem] bg-gradient-to-br from-emerald-500/10 via-slate-800/40 to-cyan-500/10 blur-2xl" />
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl backdrop-blur">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Preview: Tower Snapshot</span>
                <span>Prototype · v0.0.1</span>
              </div>

              <div className="mt-4 grid gap-3 text-xs">
                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-4">
                  <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-emerald-300">
                    Floor 27 · Ironwatch Keep
                  </p>
                  <p className="mt-2 text-slate-200">
                    A fortified outpost between safe towns and the lethal upper
                    floors. Parties regroup, trade, and prepare for the next
                    push.
                  </p>
                  <div className="mt-3 flex gap-3 text-[0.65rem] text-slate-400">
                    <span>⚔️ Recommended: 3–5 players</span>
                    <span>☠️ Deaths here still count</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-[0.65rem] font-semibold text-slate-300">
                      Your Stats
                    </p>
                    <dl className="mt-2 space-y-1 text-[0.65rem]">
                      <div className="flex justify-between">
                        <dt>VIT</dt>
                        <dd className="text-emerald-300">14</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>STR</dt>
                        <dd className="text-emerald-300">11</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>SPD</dt>
                        <dd className="text-emerald-300">9</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt>DEX</dt>
                        <dd className="text-emerald-300">10</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">
                    <p className="text-[0.65rem] font-semibold text-slate-300">
                      Survival Window
                    </p>
                    <ul className="mt-2 space-y-1 text-[0.65rem] text-slate-400">
                      <li>Health: 86 / 110</li>
                      <li>Stamina: 54 / 80</li>
                      <li>Deaths used: 2 / 5</li>
                    </ul>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-[0.7rem] text-slate-300">
                  &quot;You feel the tower watching. Another death here will be
                  written into your story—permanently.&quot;
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="world" className="mt-16 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                Build a life in a lethal world.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Alicard mixes a shared overworld with a dangerous tower. Explore
                towns, fields, and dungeons on a 2D map while supporting the
                climb through crafting, trading, or direct combat.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-800 bg-slate-900/60 p-4 transition hover:border-emerald-500/60 hover:bg-slate-900"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-slate-50">
                    {feature.title}
                  </h3>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[0.6rem] uppercase tracking-wide text-slate-300">
                    {feature.tag}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* SYSTEMS */}
        <section id="systems" className="mt-16 space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                Systems built for tension and story.
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Stats, stamina, and a hard death limit create stories worth
                remembering. Alicard leans into text and numbers so you can ship
                systems first and visuals later.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {systems.map((system) => (
              <div
                key={system.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4"
              >
                <h3 className="text-sm font-semibold text-slate-50">
                  {system.title}
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {system.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ROADMAP / CTA */}
        <section
          id="roadmap"
          className="mt-20 rounded-3xl border border-slate-800 bg-slate-950/70 p-6 sm:p-8"
        >
          <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                Development Roadmap
              </p>
              <h2 className="text-xl font-semibold text-slate-50 sm:text-2xl">
                Long-term passion project, shipped in small slices.
              </h2>
              <p className="text-sm text-slate-300">
                The first milestones focus on solid game rules, account &
                character flows, and a playable tower loop. Visual polish comes
                later—the core is a deep, systemic MMO you can grow over time.
              </p>

              <ul className="mt-3 space-y-2 text-xs text-slate-300 sm:text-sm">
                <li>• v0.1 — Landing page, auth, basic player/character models</li>
                <li>• v0.2 — 2D overworld map, simple tower floors, basic POIs</li>
                <li>• v0.3 — Turn-based combat prototype, HP & stamina loop</li>
                <li>• v0.4 — Perma-death rules, Hall of the Dead, basic guilds</li>
              </ul>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                <p className="font-semibold text-slate-100">
                  Want to follow progress?
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  Hook this up to a devlog, Discord, or mailing list later. For
                  now these links can be placeholders while you build.
                </p>

                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/roadmap"
                    className="rounded-full bg-slate-100 px-4 py-1.5 text-xs font-semibold text-slate-950 hover:bg-white"
                  >
                    View detailed roadmap
                  </Link>
                  <a
                    href="#"
                    className="rounded-full border border-slate-600 px-4 py-1.5 text-xs font-medium text-slate-100 hover:border-slate-300"
                  >
                    Join the community (soon)
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="mt-10 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p>© {new Date().getFullYear()} Alicard. Built as a passion project.</p>
            <p className="text-[0.7rem]">
              Inspired by Sword Art Online, but not affiliated with it.
            </p>
          </div>
        </footer>
      </div>
    </main>
  );
}
