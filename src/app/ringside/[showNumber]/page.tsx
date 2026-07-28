'use client';
import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRingsideState } from '@/lib/ringside/useRingsideState';
import { entriesForHandler, entryRingProgress, statusDistanceLabel } from '@/lib/ringside/progress';
export default function Competitor({ params }: { params: Promise<{ showNumber: string }> }) {
  const { showNumber } = use(params);
  const { state, error, connected } = useRingsideState(showNumber);
  const [regs, setRegs] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const audioContextRef = useRef<AudioContext | null>(null);
  const alertsEnabledRef = useRef(false);
  const initialProgressRef = useRef(true);
  const lastAlertLevelRef = useRef(new Map<string, number>());
  useEffect(() => {
    try {
      setRegs(JSON.parse(localStorage.getItem(`ringside:${showNumber}:regs`) || '[]'));
    } catch {}
  }, [showNumber]);
  const save = (next: string[]) => {
    const clean = [...new Set(next.map((v) => v.trim().toLowerCase()).filter(Boolean))];
    setRegs(clean);
    localStorage.setItem(`ringside:${showNumber}:regs`, JSON.stringify(clean));
  };
  const matches = useMemo(() => (state ? entriesForHandler(state, regs) : []), [state, regs]);

  const beep = useCallback((frequency = 720, seconds = 0.18) => {
    const audioContext = audioContextRef.current;
    if (!alertsEnabledRef.current || !audioContext) return;
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.value = 0.05;
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start();
    oscillator.stop(audioContext.currentTime + seconds);
  }, []);

  const enableAlerts = async () => {
    try {
      const audioContext = audioContextRef.current ?? new AudioContext();
      audioContextRef.current = audioContext;
      await audioContext.resume();
      alertsEnabledRef.current = true;
      setAlertsEnabled(true);
      setAlertMessage('Sound and vibration alerts are enabled. Keep this page open.');
      navigator.vibrate?.(120);
      beep(660, 0.12);
    } catch {
      setAlertMessage('This browser did not allow sound alerts. Visual alerts will still appear.');
    }
  };

  useEffect(() => {
    if (!state) return;

    for (const entry of matches) {
      const progress = entryRingProgress(state, entry);
      let level = 0;
      if (entry.status === 'in_ring') level = 4;
      else if (entry.status === 'conflict_hold') level = 3;
      else if (progress.dogsAway !== null && progress.dogsAway <= 1) level = 3;
      else if (progress.dogsAway !== null && progress.dogsAway <= 5) level = 2;
      else if (progress.dogsAway !== null) level = 1;

      const previous = lastAlertLevelRef.current.get(entry.id) ?? 0;
      lastAlertLevelRef.current.set(entry.id, level);
      if (
        initialProgressRef.current ||
        !alertsEnabledRef.current ||
        level <= previous ||
        level < 2
      )
        continue;

      if (level >= 3) {
        beep(880, 0.25);
        window.setTimeout(() => beep(880, 0.25), 330);
        navigator.vibrate?.([250, 120, 250]);
        setAlertMessage(`${entry.dog_name} is On Deck or requires attention.`);
      } else {
        beep(650, 0.16);
        navigator.vibrate?.(180);
        setAlertMessage(`${entry.dog_name} is approaching the ring.`);
      }
    }

    initialProgressRef.current = false;
  }, [beep, matches, state]);

  useEffect(
    () => () => {
      void audioContextRef.current?.close();
    },
    []
  );
  if (error)
    return (
      <main className="min-h-screen bg-slate-950 p-8 text-white">
        <h1>Ringside</h1>
        <p>{error}</p>
      </main>
    );
  if (!state) return <main className="p-8">Loading Ringside…</main>;
  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-4xl space-y-5">
        <header className="rounded-2xl bg-slate-950 p-6 text-white">
          <div className="flex justify-between">
            <div>
              <h1 className="text-3xl font-black">{state.show.title}</h1>
              <p>{state.show.venue}</p>
            </div>
            <span className={connected ? 'text-green-400' : 'text-amber-300'}>
              {connected ? 'Live' : 'Reconnecting…'}
            </span>
          </div>
          {state.show.status === 'paused' && (
            <div className="mt-4 rounded bg-amber-400 p-3 font-bold text-black">SHOW PAUSED</div>
          )}
          {state.show.status === 'closed' && (
            <div className="mt-4 rounded bg-slate-600 p-3 font-bold">SHOW CLOSED</div>
          )}
        </header>
        <section className="rounded-2xl bg-white p-5 shadow">
          <h2 className="text-xl font-bold">Track your dogs</h2>
          <div className="mt-3 flex gap-2">
            <input
              className="flex-1 rounded border p-3"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Registration number(s)"
            />
            <button
              className="rounded bg-purple-700 px-5 font-bold text-white"
              onClick={() => {
                save([...regs, ...input.split(/[\s,;]+/)]);
                setInput('');
              }}
            >
              Add dogs
            </button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded bg-green-700 px-4 py-3 font-bold text-white disabled:bg-green-200 disabled:text-green-900"
              disabled={alertsEnabled}
              onClick={enableAlerts}
            >
              {alertsEnabled ? 'Alerts enabled' : 'Enable sound and vibration'}
            </button>
            <p className="text-sm text-slate-600">
              Your browser requires you to enable alarms on this device. Keep this page open.
            </p>
          </div>
          {alertMessage && (
            <div
              role="status"
              className={`mt-3 rounded p-3 font-semibold ${
                alertsEnabled ? 'bg-green-100 text-green-900' : 'bg-amber-100 text-amber-900'
              }`}
            >
              {alertMessage}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {regs.map((r) => (
              <button
                key={r}
                className="rounded-full bg-purple-100 px-3 py-1"
                onClick={() => save(regs.filter((x) => x !== r))}
              >
                {r.toUpperCase()} ×
              </button>
            ))}
          </div>
          {matches.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {[...new Set(matches.map((e) => e.handler_name))].map((h) => (
                <button
                  key={h}
                  className="rounded border px-3 py-2"
                  onClick={() =>
                    save([
                      ...regs,
                      ...state.entries
                        .filter((e) => e.handler_name === h)
                        .map((e) => e.registration_number),
                    ])
                  }
                >
                  Add all dogs for {h}
                </button>
              ))}
            </div>
          )}
        </section>
        {matches.map((entry) => {
          const p = entryRingProgress(state, entry);
          return (
            <article
              key={entry.id}
              className="rounded-2xl border-l-8 border-purple-600 bg-white p-5 shadow"
            >
              <div className="flex justify-between gap-3">
                <div>
                  <div className="text-2xl font-black text-purple-800">
                    {statusDistanceLabel(state, entry)}
                  </div>
                  <h2 className="text-2xl font-bold">{entry.dog_name}</h2>
                  <p>
                    {entry.registration_number} · {entry.handler_name}
                  </p>
                </div>
                <div className="text-right font-bold">
                  Ring {p.ring?.ring_number} — {p.ring?.display_name}
                </div>
              </div>
              <h3 className="mt-4 font-bold">{p.block?.title}</h3>
              <p>Judge: {p.block?.judge_name || 'TBA'}</p>
              {p.current && p.current.id !== entry.id && (
                <p className="mt-2">
                  Currently in ring: {p.current.dog_name} — {p.currentBlock?.title}
                </p>
              )}
              <p className="font-semibold">
                {p.classRoundsBefore === 0
                  ? 'Your run is in the current class/round'
                  : p.classRoundsBefore !== null
                    ? `${p.classRoundsBefore} class/round${p.classRoundsBefore === 1 ? '' : 's'} before your run`
                    : ''}
              </p>
              {entry.status === 'conflict_hold' ? (
                <button
                  className="mt-4 rounded bg-green-700 p-3 font-bold text-white"
                  onClick={() =>
                    fetch(`/api/ringside/${showNumber}/competitor/action`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'available',
                        entryId: entry.id,
                        registrationNumber: entry.registration_number,
                      }),
                    })
                  }
                >
                  I am available
                </button>
              ) : (
                !['completed', 'absent', 'scratched', 'available_waiting_for_secretary'].includes(
                  entry.status
                ) && (
                  <button
                    className="mt-4 rounded bg-amber-600 p-3 font-bold text-white"
                    onClick={() =>
                      fetch(`/api/ringside/${showNumber}/competitor/action`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          action: 'declare_conflict',
                          entryId: entry.id,
                          registrationNumber: entry.registration_number,
                          reason: 'Ring conflict',
                        }),
                      })
                    }
                  >
                    Declare ring conflict
                  </button>
                )
              )}
            </article>
          );
        })}
      </div>
    </main>
  );
}
