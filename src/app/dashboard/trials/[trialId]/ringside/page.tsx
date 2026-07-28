'use client';
/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/exhaustive-deps */
import { use, useEffect, useState } from 'react';
import Link from 'next/link';
import { getSupabaseBrowser } from '@/lib/supabaseBrowser';
import MainLayout from '@/components/layout/mainLayout';
async function token() {
  return (await getSupabaseBrowser().auth.getSession()).data.session?.access_token || '';
}
export default function Setup({ params }: { params: Promise<{ trialId: string }> }) {
  const { trialId } = use(params);
  const [show, setShow] = useState<any>(null);
  const [form, setForm] = useState({ publicShowNumber: '', title: '', showDate: '', venue: '' });
  const [error, setError] = useState('');
  const [pinNotice, setPinNotice] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<any>(null);
  const [betaSource, setBetaSource] = useState<any>(null);
  const [betaDayId, setBetaDayId] = useState('');
  const [betaRingNames, setBetaRingNames] = useState<string[]>(['Ring 1']);
  const [betaAssignments, setBetaAssignments] = useState<Record<string, number>>({});
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const load = async () => {
    const r = await fetch(`/api/ringside/admin?trialId=${trialId}`, {
      headers: { Authorization: `Bearer ${await token()}` },
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error || 'Ringside setup could not be loaded.');
      return;
    }
    setError('');
    setShow(j.show || null);
  };
  useEffect(() => {
    void load();
  }, [trialId]);
  const api = async (body: any) => {
    const r = await fetch('/api/ringside/admin', {
      method: show ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify(body),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    if (!show && j.show) setShow({ ...j.show, ringside_rings: [] });
    await load();
    return j;
  };
  const rings = (show?.ringside_rings || []).sort(
    (a: any, b: any) => a.display_order - b.display_order
  );
  return (
    <MainLayout title="Ringside Setup">
      <div className="mx-auto max-w-6xl space-y-5">
        <div>
          <Link href={`/dashboard/trials/${trialId}`} className="text-purple-700">
            ← Back to trial
          </Link>
          <h1 className="text-3xl font-black">Ringside Setup</h1>
          <p>Configure the online ring-management system for this trial.</p>
        </div>
        {error && <div className="rounded bg-red-100 p-3 text-red-800">{error}</div>}
        {pinNotice && (
          <div className="rounded bg-amber-100 p-3 font-bold text-amber-900">
            {pinNotice} Save this PIN now; it will not be shown again.
          </div>
        )}
        {!show ? (
          <form
            className="grid gap-4 rounded-xl bg-white p-5 shadow md:grid-cols-2"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                await api({ trialId, ...form, status: 'draft' });
              } catch (x) {
                setError(x instanceof Error ? x.message : 'Save failed');
              }
            }}
          >
            <label>
              Public Show Number
              <input
                required
                className="mt-1 w-full rounded border p-3"
                value={form.publicShowNumber}
                onChange={(e) => setForm({ ...form, publicShowNumber: e.target.value })}
              />
            </label>
            <label>
              Show title
              <input
                required
                className="mt-1 w-full rounded border p-3"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label>
              Show date
              <input
                type="date"
                className="mt-1 w-full rounded border p-3"
                value={form.showDate}
                onChange={(e) => setForm({ ...form, showDate: e.target.value })}
              />
            </label>
            <label>
              Venue
              <input
                className="mt-1 w-full rounded border p-3"
                value={form.venue}
                onChange={(e) => setForm({ ...form, venue: e.target.value })}
              />
            </label>
            <button className="rounded bg-purple-700 p-3 font-bold text-white">
              Enable Ringside
            </button>
          </form>
        ) : (
          <>
            <section className="rounded-xl bg-white p-5 shadow">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-bold">{show.title}</h2>
                  <p>
                    Public Show Number: <b>{show.public_show_number}</b> · Status:{' '}
                    <b>{show.status}</b>
                  </p>
                </div>
                <select
                  className="rounded border p-3"
                  value={show.status}
                  onChange={async (e) => {
                    try {
                      await api({
                        action: 'update_show',
                        showId: show.id,
                        status: e.target.value,
                      });
                    } catch (statusError) {
                      setError(
                        statusError instanceof Error
                          ? statusError.message
                          : 'Show status could not be saved.'
                      );
                    }
                  }}
                >
                  <option value="draft">Draft</option>
                  <option value="published">Published</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              {show.status === 'draft' && (
                <div className="mt-4 rounded border border-amber-300 bg-amber-50 p-4">
                  <p className="font-bold text-amber-950">
                    This show is still a draft. Competitor, display, and secretary pages are not
                    public yet.
                  </p>
                  <button
                    className="mt-3 rounded bg-green-700 px-5 py-3 font-bold text-white"
                    onClick={async () => {
                      try {
                        await api({ action: 'update_show', showId: show.id, status: 'published' });
                      } catch (statusError) {
                        setError(
                          statusError instanceof Error
                            ? statusError.message
                            : 'The show could not be published.'
                        );
                      }
                    }}
                  >
                    Publish Ringside Show
                  </button>
                </div>
              )}
              <div className="mt-4 grid gap-2 md:grid-cols-2">
                <a
                  className="rounded border p-3 text-purple-700"
                  href={`/ringside/${show.public_show_number}`}
                >
                  Competitor: /ringside/{show.public_show_number}
                </a>
                <a
                  className="rounded border p-3 text-purple-700"
                  href={`/ringside/${show.public_show_number}/display`}
                >
                  Display: /ringside/{show.public_show_number}/display
                </a>
              </div>
            </section>
            <section className="rounded-xl bg-white p-5 shadow">
              <div className="flex justify-between">
                <h2 className="text-xl font-bold">Rings</h2>
                <button
                  className="rounded bg-purple-700 px-4 py-2 text-white"
                  onClick={async () => {
                    try {
                      const n = rings.length + 1;
                      const j = await api({
                        action: 'add_ring',
                        showId: show.id,
                        ringNumber: n,
                        displayName: '',
                        displayOrder: n,
                      });
                      setPinNotice(`Ring ${n} PIN: ${j.pin}.`);
                    } catch (x) {
                      setError(String(x));
                    }
                  }}
                >
                  Add ring
                </button>
              </div>
              <div className="mt-4 space-y-3">
                {rings.map((r: any) => (
                  <div key={r.id} className="rounded border p-4">
                    <div className="flex flex-wrap items-center gap-3">
                      <b>Ring {r.ring_number}</b>
                      <input
                        className="rounded border p-2"
                        defaultValue={r.display_name}
                        onBlur={(e) =>
                          api({
                            action: 'update_ring',
                            showId: show.id,
                            ringId: r.id,
                            ringNumber: r.ring_number,
                            displayOrder: r.display_order,
                            displayName: e.target.value,
                          })
                        }
                      />
                      <a
                        className="text-purple-700"
                        href={`/ringside/${show.public_show_number}/secretary/${r.slug}`}
                      >
                        Secretary link
                      </a>
                      <button
                        className="rounded border px-3 py-2"
                        onClick={async () => {
                          const p = prompt('Enter a new 4–12 digit PIN') || '';
                          if (p) {
                            const j = await api({
                              action: 'set_pin',
                              showId: show.id,
                              ringId: r.id,
                              pin: p,
                              sessionVersion: r.session_version,
                            });
                            setPinNotice(`Ring ${r.ring_number} PIN: ${j.pin}.`);
                          }
                        }}
                      >
                        Set/regenerate PIN
                      </button>
                    </div>
                    {(r.ringside_blocks || [])
                      .sort((a: any, b: any) => a.sequence - b.sequence)
                      .map((b: any, blockIndex: number, orderedBlocks: any[]) => (
                        <div
                          key={b.id}
                          draggable
                          onDragStart={(event) => {
                            setDraggedBlockId(b.id);
                            event.dataTransfer.effectAllowed = 'move';
                            event.dataTransfer.setData('text/plain', b.id);
                          }}
                          onDragEnd={() => setDraggedBlockId(null)}
                          onDragOver={(event) => {
                            event.preventDefault();
                            event.dataTransfer.dropEffect = 'move';
                          }}
                          onDrop={async (event) => {
                            event.preventDefault();
                            const sourceId =
                              draggedBlockId || event.dataTransfer.getData('text/plain');
                            if (!sourceId || sourceId === b.id) return setDraggedBlockId(null);
                            const reordered = [...orderedBlocks];
                            const sourceIndex = reordered.findIndex(
                              (block: any) => block.id === sourceId
                            );
                            const targetIndex = reordered.findIndex(
                              (block: any) => block.id === b.id
                            );
                            if (sourceIndex < 0 || targetIndex < 0) return setDraggedBlockId(null);
                            const [moved] = reordered.splice(sourceIndex, 1);
                            reordered.splice(targetIndex, 0, moved);
                            setDraggedBlockId(null);
                            try {
                              await api({
                                action: 'reorder_blocks',
                                showId: show.id,
                                ringId: r.id,
                                blockIds: reordered.map((block: any) => block.id),
                              });
                            } catch (dragError) {
                              setError(
                                dragError instanceof Error
                                  ? dragError.message
                                  : 'Class/round order could not be saved.'
                              );
                            }
                          }}
                          className={`mt-3 rounded border-2 bg-slate-50 p-3 transition ${
                            draggedBlockId === b.id
                              ? 'border-purple-500 opacity-50'
                              : 'border-transparent hover:border-purple-300'
                          }`}
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <span className="cursor-grab font-bold active:cursor-grabbing">
                              ⠿ Class/round sequence #{blockIndex + 1} — drag to reorder
                            </span>
                            <div className="flex gap-2">
                              <button
                                className="rounded border bg-white px-3 py-2 disabled:opacity-40"
                                disabled={blockIndex === 0}
                                onClick={() =>
                                  api({
                                    action: 'move_block',
                                    showId: show.id,
                                    blockId: b.id,
                                    direction: 'up',
                                  })
                                }
                              >
                                ↑ Move up
                              </button>
                              <button
                                className="rounded border bg-white px-3 py-2 disabled:opacity-40"
                                disabled={blockIndex === orderedBlocks.length - 1}
                                onClick={() =>
                                  api({
                                    action: 'move_block',
                                    showId: show.id,
                                    blockId: b.id,
                                    direction: 'down',
                                  })
                                }
                              >
                                ↓ Move down
                              </button>
                            </div>
                          </div>
                          <b>{b.title}</b> · Judge: {b.judge_name || 'TBA'}
                          <div className="mt-2 overflow-x-auto">
                            <table className="w-full text-sm">
                              <tbody>
                                {(b.ringside_entries || [])
                                  .sort((a: any, b: any) => a.running_order - b.running_order)
                                  .map((e: any) => (
                                    <Editor
                                      key={e.id}
                                      entry={e}
                                      save={(values: any) =>
                                        api({
                                          action: 'save_entry',
                                          showId: show.id,
                                          entryId: e.id,
                                          ...values,
                                        })
                                      }
                                    />
                                  ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            </section>
            <section className="rounded-xl border-2 border-purple-300 bg-purple-50 p-5 shadow">
              <h2 className="text-xl font-bold text-purple-950">Build from Beta Running Order</h2>
              <p className="text-sm text-purple-900">
                Uses this trial&apos;s current running-order data directly. No Excel file is needed.
              </p>
              {!betaSource ? (
                <button
                  className="mt-4 rounded bg-purple-700 px-5 py-3 font-bold text-white"
                  onClick={async () => {
                    setError('');
                    const response = await fetch(
                      `/api/ringside/admin/beta-source?trialId=${trialId}`,
                      { headers: { Authorization: `Bearer ${await token()}` } }
                    );
                    const result = await response.json();
                    if (!response.ok) return setError(result.error);
                    setBetaSource(result);
                    const firstDay = result.days?.[0]?.id || '';
                    setBetaDayId(firstDay);
                    setBetaAssignments(
                      Object.fromEntries(
                        (result.rounds || [])
                          .filter((round: any) => round.trial_day_id === firstDay)
                          .map((round: any) => [round.id, 0])
                      )
                    );
                  }}
                >
                  Build from Beta Running Order
                </button>
              ) : (
                <div className="mt-4 space-y-5">
                  <div>
                    <label className="font-bold">Day</label>
                    <select
                      className="mt-1 w-full rounded border bg-white p-3"
                      value={betaDayId}
                      onChange={(event) => {
                        const dayId = event.target.value;
                        setBetaDayId(dayId);
                        setBetaAssignments(
                          Object.fromEntries(
                            betaSource.rounds
                              .filter((round: any) => round.trial_day_id === dayId)
                              .map((round: any) => [round.id, 0])
                          )
                        );
                      }}
                    >
                      {betaSource.days.map((day: any) => (
                        <option key={day.id} value={day.id}>
                          Day {day.day_number} — {day.trial_date}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="font-bold">Number of rings</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      className="mt-1 w-full rounded border bg-white p-3"
                      value={betaRingNames.length}
                      onChange={(event) => {
                        const count = Math.max(1, Math.min(20, Number(event.target.value) || 1));
                        setBetaRingNames((names) =>
                          Array.from(
                            { length: count },
                            (_, index) => names[index] || `Ring ${index + 1}`
                          )
                        );
                        setBetaAssignments((assignments) =>
                          Object.fromEntries(
                            Object.entries(assignments).map(([roundId, ringIndex]) => [
                              roundId,
                              Math.min(ringIndex, count - 1),
                            ])
                          )
                        );
                      }}
                    />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {betaRingNames.map((name, index) => (
                      <label key={index} className="font-bold">
                        Ring {index + 1} familiar name
                        <input
                          className="mt-1 w-full rounded border bg-white p-3"
                          value={name}
                          onChange={(event) =>
                            setBetaRingNames((names) =>
                              names.map((current, currentIndex) =>
                                currentIndex === index ? event.target.value : current
                              )
                            )
                          }
                        />
                      </label>
                    ))}
                  </div>
                  <div>
                    <h3 className="font-bold">Assign each class/round</h3>
                    <div className="mt-2 space-y-2">
                      {betaSource.rounds
                        .filter((round: any) => round.trial_day_id === betaDayId)
                        .map((round: any) => (
                          <div
                            key={round.id}
                            className="flex flex-col gap-2 rounded border bg-white p-3 md:flex-row md:items-center md:justify-between"
                          >
                            <div>
                              <b>{round.title}</b>
                              <div className="text-sm text-gray-600">
                                Judge: {round.judge_name || 'TBA'} · {round.entries.length} runs
                              </div>
                            </div>
                            <select
                              className="rounded border p-2"
                              value={betaAssignments[round.id] ?? 0}
                              onChange={(event) =>
                                setBetaAssignments((assignments) => ({
                                  ...assignments,
                                  [round.id]: Number(event.target.value),
                                }))
                              }
                            >
                              {betaRingNames.map((ringName, ringIndex) => (
                                <option key={ringIndex} value={ringIndex}>
                                  Ring {ringIndex + 1} — {ringName}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                    </div>
                  </div>
                  <div className="rounded bg-white p-4">
                    <h3 className="font-bold">Preview</h3>
                    {betaRingNames.map((ringName, ringIndex) => {
                      const assigned = betaSource.rounds.filter(
                        (round: any) =>
                          round.trial_day_id === betaDayId &&
                          Number(betaAssignments[round.id] ?? 0) === ringIndex
                      );
                      return (
                        <p key={ringIndex}>
                          Ring {ringIndex + 1} — {ringName}: {assigned.length} classes/rounds,{' '}
                          {assigned.reduce(
                            (total: number, round: any) => total + round.entries.length,
                            0
                          )}{' '}
                          runs
                        </p>
                      );
                    })}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="rounded bg-purple-700 px-5 py-3 font-bold text-white"
                      onClick={async () => {
                        if (
                          !confirm(
                            'Create Ringside from this running order? Existing Ringside rings will be backed up and replaced.'
                          )
                        )
                          return;
                        const response = await fetch('/api/ringside/admin/beta-source', {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${await token()}`,
                          },
                          body: JSON.stringify({
                            trialId,
                            showId: show.id,
                            dayId: betaDayId,
                            ringNames: betaRingNames,
                            assignments: betaAssignments,
                          }),
                        });
                        const result = await response.json();
                        if (!response.ok) return setError(result.error);
                        setPinNotice(
                          result.generatedPins
                            .map((item: any) => `${item.ring} PIN: ${item.pin}`)
                            .join(' | ')
                        );
                        setBetaSource(null);
                        await load();
                      }}
                    >
                      Create Ringside Running Order
                    </button>
                    <button
                      className="rounded border px-5 py-3"
                      onClick={() => setBetaSource(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </section>
            <section className="rounded-xl bg-white p-5 shadow">
              <h2 className="text-xl font-bold">Upload a different organizer workbook</h2>
              <p className="text-sm">
                Optional fallback when the running order does not come from this trial.
              </p>
              <input
                className="mt-3"
                type="file"
                accept=".xlsx"
                onChange={(e) => {
                  setFile(e.target.files?.[0] || null);
                  setPreview(null);
                }}
              />
              <button
                className="ml-3 rounded border px-4 py-2"
                disabled={!file}
                onClick={async () => {
                  if (!file) return;
                  const f = new FormData();
                  f.set('trialId', trialId);
                  f.set('mode', 'preview');
                  f.set('file', file);
                  const r = await fetch('/api/ringside/admin/import', {
                    method: 'POST',
                    headers: { Authorization: `Bearer ${await token()}` },
                    body: f,
                  });
                  const j = await r.json();
                  if (r.ok) setPreview(j);
                  else setError(j.error);
                }}
              >
                Check workbook
              </button>
              {preview && (
                <div className="mt-4 rounded bg-slate-50 p-4">
                  <p>
                    <b>{preview.summary.rings}</b> rings · <b>{preview.summary.classes}</b>{' '}
                    classes/rounds · <b>{preview.summary.runs}</b> runs
                  </p>
                  <p>
                    Missing registration numbers: {preview.summary.missingRegistrationNumbers} ·
                    Unrecognized blocks: {preview.summary.unrecognizedBlocks}
                  </p>
                  {preview.summary.warnings.map((w: string) => (
                    <p key={w} className="text-amber-800">
                      {w}
                    </p>
                  ))}
                  <button
                    className="mt-3 rounded bg-red-700 p-3 font-bold text-white"
                    onClick={async () => {
                      if (
                        !file ||
                        !confirm('Replace existing Ringside data? A backup will be created.')
                      )
                        return;
                      const f = new FormData();
                      f.set('trialId', trialId);
                      f.set('showId', show.id);
                      f.set('mode', 'import');
                      f.set('confirm', 'REPLACE');
                      f.set('file', file);
                      const r = await fetch('/api/ringside/admin/import', {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${await token()}` },
                        body: f,
                      });
                      const j = await r.json();
                      if (r.ok) {
                        setPreview(null);
                        await load();
                      } else setError(j.error);
                    }}
                  >
                    Replace data and import
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </MainLayout>
  );
}
function Editor({ entry, save }: { entry: any; save: (v: any) => Promise<any> }) {
  const [v, setV] = useState({
    runningOrder: entry.running_order,
    registrationNumber: entry.registration_number,
    handlerName: entry.handler_name,
    dogName: entry.dog_name,
    notes: entry.notes,
  });
  const [status, setStatus] = useState('');
  const persist = async (row: HTMLTableRowElement | null) => {
    setStatus('Saving…');
    try {
      await save(v);
      setStatus('Saved');
      const next = row?.nextElementSibling?.querySelector('input') as HTMLInputElement | null;
      next?.focus();
    } catch {
      setStatus('Error');
    }
  };
  return (
    <tr
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault();
          void persist(event.currentTarget);
        }
      }}
    >
      <td>
        <input
          className="w-16 border p-1"
          value={v.runningOrder}
          onChange={(e) => setV({ ...v, runningOrder: Number(e.target.value) })}
        />
      </td>
      <td>
        <input
          className="w-32 border p-1"
          value={v.registrationNumber}
          onChange={(e) => setV({ ...v, registrationNumber: e.target.value })}
        />
      </td>
      <td>
        <input
          className="w-36 border p-1"
          value={v.handlerName}
          onChange={(e) => setV({ ...v, handlerName: e.target.value })}
        />
      </td>
      <td>
        <input
          className="w-28 border p-1"
          value={v.dogName}
          onChange={(e) => setV({ ...v, dogName: e.target.value })}
        />
      </td>
      <td>
        <input
          className="w-40 border p-1"
          value={v.notes}
          onChange={(e) => setV({ ...v, notes: e.target.value })}
        />
      </td>
      <td>
        <button
          onClick={(event) => void persist(event.currentTarget.closest('tr'))}
          className="rounded bg-purple-700 px-2 py-1 text-white"
        >
          Save & next
        </button>{' '}
        <small>{status}</small>
      </td>
    </tr>
  );
}
