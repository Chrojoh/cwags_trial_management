'use client';
import { use, useEffect, useState } from 'react';
import { useRingsideState } from '@/lib/ringside/useRingsideState';
import { isQueueEligible } from '@/lib/ringside/progress';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
export default function Secretary({
  params,
}: {
  params: Promise<{ showNumber: string; ringSlug: string }>;
}) {
  const { showNumber, ringSlug } = use(params);
  const { state, error, connected, reload } = useRingsideState(showNumber);
  const [pin, setPin] = useState('');
  const [logged, setLogged] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    fetch(`/api/ringside/${showNumber}/secretary/session?ringSlug=${encodeURIComponent(ringSlug)}`)
      .then((response) => response.json())
      .then((session) => setLogged(session.authenticated && session.ringSlug === ringSlug))
      .catch(() => setLogged(false));
  }, [ringSlug, showNumber]);
  const call = async (body: Record<string, unknown>) => {
    const targetRingId = state?.rings.find((candidate) => candidate.slug === ringSlug)?.id;
    const r = await fetch(`/api/ringside/${showNumber}/secretary/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...body, ringId: targetRingId }),
    });
    const j = await r.json();
    if (r.status === 401) {
      setLogged(false);
      throw new Error(j.error);
    }
    if (!r.ok) throw new Error(j.error);
    await reload();
  };
  if (error) return <main className="p-8">{error}</main>;
  if (!state) return <main className="p-8">Loading…</main>;
  const ring = state.rings.find((r) => r.slug === ringSlug);
  if (!ring) return <main className="p-8">Ring not found.</main>;
  if (!logged)
    return (
      <main className="min-h-screen bg-slate-100 p-6">
        <form
          className="mx-auto mt-20 max-w-md rounded-2xl bg-white p-8 shadow-xl"
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await fetch(`/api/ringside/${showNumber}/secretary/login`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ringSlug, pin }),
            });
            const j = await r.json();
            if (r.ok) setLogged(true);
            else setMessage(j.error);
          }}
        >
          <h1 className="text-3xl font-black">{state.show.title}</h1>
          <h2 className="mt-2 text-xl">
            Ring {ring.ring_number} — {ring.display_name}
          </h2>
          <label className="mt-6 block font-bold">Secretary PIN</label>
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            className="mt-2 w-full rounded border p-4 text-2xl"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
          />
          {message && <p className="mt-2 text-red-700">{message}</p>}
          <button className="mt-5 w-full rounded bg-purple-700 p-4 text-xl font-bold text-white">
            Sign in
          </button>
          <button
            type="button"
            className="mt-3 w-full rounded border p-3 font-bold"
            onClick={async () => {
              const accessToken = (await getSupabaseBrowser().auth.getSession()).data.session
                ?.access_token;
              if (!accessToken) return setMessage('Sign in to the administrator area first.');
              const response = await fetch(`/api/ringside/${showNumber}/secretary/login`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ ringSlug }),
              });
              const result = await response.json();
              if (response.ok) setLogged(true);
              else setMessage(result.error);
            }}
          >
            Enter as administrator
          </button>
        </form>
      </main>
    );
  const blocks = state.blocks
    .filter((b) => b.ring_id === ring.id)
    .sort((a, b) => a.sequence - b.sequence);
  const active = blocks.find((b) => b.id === ring.active_block_id) || blocks[0];
  const entries = active
    ? state.entries
        .filter((e) => e.block_id === active.id)
        .sort((a, b) => a.running_order - b.running_order)
    : [];
  const current = entries.find((e) => e.status === 'in_ring');
  const upcoming = entries.filter((e) => isQueueEligible(e) && e.status !== 'in_ring');
  const heldEntries = entries.filter((e) =>
    ['conflict_hold', 'available_waiting_for_secretary'].includes(e.status)
  );
  return (
    <main className="min-h-screen bg-slate-100 p-4">
      <div className="mx-auto max-w-5xl space-y-4">
        <header className="rounded-2xl bg-slate-950 p-5 text-white">
          <div className="flex justify-between">
            <div>
              <h1 className="text-3xl font-black">
                Ring {ring.ring_number} — {ring.display_name}
              </h1>
              <p>
                {state.show.title} · {connected ? 'Live' : 'Reconnecting…'}
              </p>
            </div>
            <button
              onClick={async () => {
                await fetch(`/api/ringside/${showNumber}/secretary/logout`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ringId: ring.id }),
                });
                setLogged(false);
              }}
            >
              Sign out
            </button>
          </div>
        </header>
        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold">Class / round</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {blocks.map((b) => (
              <button
                key={b.id}
                onClick={() => call({ action: 'activate_block', blockId: b.id })}
                className={`rounded p-3 font-bold ${b.id === active?.id ? 'bg-purple-700 text-white' : 'border'}`}
              >
                {b.title}
                <br />
                <small>{b.judge_name || 'TBA'}</small>
              </button>
            ))}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold">Ring status</h2>
          <div className="mt-2 flex gap-2">
            <input
              className="flex-1 rounded border p-3"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Delay/status message"
            />
            <button
              className="rounded bg-amber-500 px-5 font-bold"
              onClick={() => call({ action: 'ring_state', paused: !ring.paused, message })}
            >
              {ring.paused ? 'Resume ring' : 'Pause ring'}
            </button>
          </div>
        </section>
        {current && (
          <section className="rounded-2xl bg-green-800 p-5 text-white">
            <div className="uppercase">In the ring</div>
            <h2 className="text-4xl font-black">{current.dog_name}</h2>
            <p className="text-xl">{current.handler_name}</p>
            <button
              className="mt-3 rounded bg-white p-4 font-bold text-green-900"
              onClick={() => call({ action: 'completed', entryId: current.id })}
            >
              Mark completed
            </button>
          </section>
        )}
        {heldEntries.length > 0 && (
          <section className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 shadow">
            <h2 className="text-2xl font-black text-amber-950">
              Conflict Hold / Waiting for Secretary ({heldEntries.length})
            </h2>
            <div className="mt-3 space-y-3">
              {heldEntries.map((entry) => (
                <article key={entry.id} className="rounded-xl bg-white p-4 shadow">
                  <h3 className="text-2xl font-bold">{entry.dog_name}</h3>
                  <p>
                    {entry.handler_name} · {entry.registration_number}
                  </p>
                  <p className="font-bold text-amber-800">
                    {entry.status === 'conflict_hold'
                      ? 'CONFLICT HOLD'
                      : 'AVAILABLE — WAITING FOR SECRETARY'}
                  </p>
                  {entry.conflict_reason && <p>{entry.conflict_reason}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {entry.status === 'conflict_hold' ? (
                      <button
                        className="rounded bg-green-700 p-3 font-bold text-white"
                        onClick={() => call({ action: 'available', entryId: entry.id })}
                      >
                        Mark available
                      </button>
                    ) : (
                      <>
                        <button
                          className="rounded bg-purple-700 p-3 font-bold text-white"
                          onClick={() =>
                            call({ action: 'restore', entryId: entry.id, strategy: 'next' })
                          }
                        >
                          Restore next eligible
                        </button>
                        <button
                          className="rounded border p-3"
                          onClick={() =>
                            call({
                              action: 'restore',
                              entryId: entry.id,
                              strategy: 'after_current',
                            })
                          }
                        >
                          After current dog
                        </button>
                        <button
                          className="rounded border p-3"
                          onClick={() =>
                            call({ action: 'restore', entryId: entry.id, strategy: 'end' })
                          }
                        >
                          End of class
                        </button>
                      </>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        )}
        <section className="space-y-3">
          {upcoming.map((e, i) => (
            <article key={e.id} className="rounded-2xl bg-white p-4 shadow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <strong className="text-purple-700">{i === 0 ? 'ON DECK' : `#${i + 1}`}</strong>
                  <h3 className="text-2xl font-bold">{e.dog_name}</h3>
                  <p>
                    {e.handler_name} · {e.registration_number} · {e.status.replaceAll('_', ' ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {e.status === 'available_waiting_for_secretary' ? (
                    <>
                      <button
                        className="rounded bg-purple-700 p-3 text-white"
                        onClick={() => call({ action: 'restore', entryId: e.id, strategy: 'next' })}
                      >
                        Restore next
                      </button>
                      <button
                        className="rounded border p-3"
                        onClick={() =>
                          call({ action: 'restore', entryId: e.id, strategy: 'after_current' })
                        }
                      >
                        After current
                      </button>
                      <button
                        className="rounded border p-3"
                        onClick={() => call({ action: 'restore', entryId: e.id, strategy: 'end' })}
                      >
                        End of class
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        className="rounded bg-green-700 p-3 text-white"
                        onClick={() => call({ action: 'in_ring', entryId: e.id })}
                      >
                        In ring
                      </button>
                      <button
                        className="rounded border p-3"
                        onClick={() => call({ action: 'check_in', entryId: e.id })}
                      >
                        Check in
                      </button>
                      <button
                        className="rounded bg-amber-500 p-3"
                        onClick={() => call({ action: 'conflict_hold', entryId: e.id })}
                      >
                        Conflict hold
                      </button>
                      <button
                        className="rounded border p-3"
                        onClick={() => call({ action: 'absent', entryId: e.id })}
                      >
                        Absent
                      </button>
                      <button
                        className="rounded border p-3"
                        onClick={() => call({ action: 'scratch', entryId: e.id })}
                      >
                        Scratch
                      </button>
                      <button
                        className="rounded border p-3"
                        onClick={() => call({ action: 'move_up', entryId: e.id })}
                      >
                        ↑
                      </button>
                      <button
                        className="rounded border p-3"
                        onClick={() => call({ action: 'move_down', entryId: e.id })}
                      >
                        ↓
                      </button>
                      <button
                        className="rounded border p-3"
                        onClick={() => call({ action: 'move_end', entryId: e.id })}
                      >
                        End
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
