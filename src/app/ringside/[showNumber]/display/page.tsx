'use client';
import { use } from 'react';
import { useRingsideState } from '@/lib/ringside/useRingsideState';
import { isQueueEligible } from '@/lib/ringside/progress';
export default function Display({ params }: { params: Promise<{ showNumber: string }> }) {
  const { showNumber } = use(params);
  const { state, error, connected } = useRingsideState(showNumber);
  if (error) return <main className="min-h-screen bg-slate-950 p-10 text-white">{error}</main>;
  if (!state) return <main className="min-h-screen bg-slate-950 p-10 text-white">Loading…</main>;
  return (
    <main className="min-h-screen bg-slate-950 p-5 text-white">
      <header className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-black">{state.show.title}</h1>
          <p className="text-xl text-slate-300">All rings</p>
        </div>
        <div className={connected ? 'text-green-400' : 'text-amber-300'}>
          {connected ? '● Live' : '● Reconnecting…'}
        </div>
      </header>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {state.rings.map((ring) => {
          const blocks = state.blocks
            .filter((b) => b.ring_id === ring.id)
            .sort((a, b) => a.sequence - b.sequence);
          const active =
            blocks.find((b) => b.id === ring.active_block_id) ||
            blocks.find((b) => b.status === 'active');
          const entries = active
            ? state.entries
                .filter((e) => e.block_id === active.id)
                .sort((a, b) => a.running_order - b.running_order)
            : [];
          const current = entries.find((e) => e.status === 'in_ring');
          const upcoming = entries
            .filter((e) => isQueueEligible(e) && e.status !== 'in_ring')
            .slice(0, 5);
          const heldEntries = entries.filter((e) =>
            ['conflict_hold', 'available_waiting_for_secretary'].includes(e.status)
          );
          const next = blocks.slice(active ? blocks.findIndex((b) => b.id === active.id) + 1 : 0);
          return (
            <section key={ring.id} className="overflow-hidden rounded-2xl bg-slate-900 shadow-2xl">
              <header className="bg-purple-800 p-5">
                <h2 className="text-3xl font-black">
                  Ring {ring.ring_number} — {ring.display_name}
                </h2>
                <p className="text-xl">
                  {active?.title || 'No active class'}{' '}
                  {active?.judge_name && `· Judge: ${active.judge_name}`}
                </p>
              </header>
              {ring.paused && (
                <div className="bg-amber-400 p-3 text-center text-xl font-black text-black">
                  RING PAUSED {ring.status_message && `— ${ring.status_message}`}
                </div>
              )}
              <div className="p-5">
                <div className="rounded-xl bg-slate-800 p-4">
                  <div className="uppercase text-green-400">
                    {current ? 'In the ring' : 'Ring ready'}
                  </div>
                  <div className="text-4xl font-black">
                    {current?.dog_name || 'Waiting for next dog'}
                  </div>
                  <div className="text-xl text-slate-300">
                    {current && `${current.handler_name} · ${current.registration_number}`}
                  </div>
                </div>
                <h3 className="mt-5 text-xl font-bold">Coming up</h3>
                {upcoming.map((e, i) => (
                  <div key={e.id} className="mt-2 flex items-center gap-4 rounded bg-slate-800 p-3">
                    <strong className="w-24 text-orange-300">
                      {i === 0 ? 'ON DECK' : `+${i + 1}`}
                    </strong>
                    <span className="text-xl font-bold">
                      {e.dog_name}{' '}
                      <small className="font-normal text-slate-300">/ {e.handler_name}</small>
                    </span>
                  </div>
                ))}
                {heldEntries.length > 0 && (
                  <div className="mt-5 rounded-xl border border-amber-400 bg-amber-950 p-3">
                    <h3 className="text-lg font-black text-amber-300">
                      CONFLICT HOLD / WAITING ({heldEntries.length})
                    </h3>
                    {heldEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="mt-2 flex items-center justify-between gap-3 rounded bg-slate-800 p-3"
                      >
                        <span className="font-bold">
                          {entry.dog_name}{' '}
                          <small className="font-normal text-slate-300">
                            / {entry.handler_name}
                          </small>
                        </span>
                        <strong className="text-amber-300">
                          {entry.status === 'conflict_hold' ? 'HOLD' : 'AVAILABLE'}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
                <h3 className="mt-6 text-xl font-bold">Next classes in this ring</h3>
                {next.slice(0, 4).map((b, i) => (
                  <div
                    key={b.id}
                    className={`mt-2 flex gap-4 rounded p-3 ${i === 0 ? 'bg-purple-700' : 'bg-slate-800'}`}
                  >
                    <strong>{i === 0 ? 'NEXT' : i + 1}</strong>
                    <span>
                      <b>{b.title}</b>
                      <br />
                      <small>
                        Judge: {b.judge_name || 'TBA'} ·{' '}
                        {
                          state.entries.filter(
                            (e) => e.block_id === b.id && e.status !== 'scratched'
                          ).length
                        }{' '}
                        entries
                      </small>
                    </span>
                  </div>
                ))}
                {next.length > 4 && (
                  <p className="mt-2 text-center text-slate-300">
                    + {next.length - 4} more classes scheduled
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
