import { useState } from 'react';
import { db } from '@/db/database';
import type { TimetableSlot, Unit } from '@/types';
import { DAYS, FULL_DAYS } from '@/types';
import { useApp } from '@/context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import Modal, { Btn, Field, Input, Select } from '@/components/Modal';
import { Plus, Trash2, AlertTriangle, Calendar } from 'lucide-react';

const HOURS = Array.from({ length: 14 }, (_, i) => i + 7); // 7:00 – 20:00
const SESSION_TYPES = ['lecture', 'lab', 'tutorial'] as const;

function timeToMins(t: string) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function checkClash(slots: TimetableSlot[], newSlot: Omit<TimetableSlot, 'id'>, excludeId?: number) {
  const newStart = timeToMins(newSlot.startTime);
  const newEnd = timeToMins(newSlot.endTime);
  return slots.filter(s => {
    if (s.id === excludeId) return false;
    if (s.day !== newSlot.day) return false;
    const sStart = timeToMins(s.startTime);
    const sEnd = timeToMins(s.endTime);
    return newStart < sEnd && newEnd > sStart;
  });
}

function emptySlot(): Omit<TimetableSlot, 'id'> {
  return { unitId: 0, day: 0, startTime: '08:00', endTime: '10:00', type: 'lecture' };
}

export default function Timetable() {
  const { t } = useApp();
  const slots = useLiveQuery(() => db.timetable.toArray(), []) ?? [];
  const units = useLiveQuery(() => db.units.toArray(), []) ?? [];
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; slot: Omit<TimetableSlot, 'id'> & { id?: number } } | null>(null);
  const [clashWarning, setClashWarning] = useState<TimetableSlot[]>([]);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hoveredSlotId, setHoveredSlotId] = useState<number | null>(null);

  function openAdd(day?: number) {
    setErrors({}); setClashWarning([]);
    setModal({ mode: 'add', slot: { ...emptySlot(), day: day ?? 0 } });
  }

  function openEdit(s: TimetableSlot) {
    setErrors({}); setClashWarning([]);
    setModal({ mode: 'edit', slot: { ...s } });
  }

  function patch(key: keyof TimetableSlot, value: unknown) {
    if (!modal) return;
    const next = { ...modal.slot, [key]: value };
    setModal(m => m ? { ...m, slot: next } : null);
    const clashes = checkClash(slots, next as Omit<TimetableSlot, 'id'>, modal.slot.id);
    setClashWarning(clashes);
    if (errors[key as string]) setErrors(e => { const n = { ...e }; delete n[key as string]; return n; });
  }

  function validate(s: NonNullable<typeof modal>['slot']): boolean {
    const e: Record<string, string> = {};
    if (!s.unitId) e.unitId = 'Select a unit';
    if (timeToMins(s.startTime) >= timeToMins(s.endTime)) e.time = 'End time must be after start time';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!modal || !validate(modal.slot)) return;
    const { id, ...data } = modal.slot;
    if (modal.mode === 'add') await db.timetable.add(data as TimetableSlot);
    else await db.timetable.update(id!, data);
    setModal(null);
  }

  async function deleteSlot(id: number) {
    await db.timetable.delete(id);
    setDeleteId(null);
  }

  function getUnit(id: number) { return units.find(u => u.id === id); }

  function slotStyle(slot: TimetableSlot) {
    const unit = getUnit(slot.unitId);
    const startMins = timeToMins(slot.startTime) - 7 * 60;
    const durMins = timeToMins(slot.endTime) - timeToMins(slot.startTime);
    const cellH = 52; // px per hour
    const top = (startMins / 60) * cellH;
    const height = Math.max((durMins / 60) * cellH, 28);
    return { top, height, color: unit?.color ?? '#6b7280' };
  }

  return (
    <div className="p-4 md:p-6 max-w-full mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
            {t('timetable')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{slots.length} session{slots.length !== 1 ? 's' : ''} scheduled</p>
        </div>
        <button
          onClick={() => openAdd()}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
        >
          <Plus size={16} /> {t('add')} Session
        </button>
      </div>

      {units.length === 0 ? (
        <div className="py-20 text-center">
          <Calendar size={48} className="mx-auto mb-3" style={{ color: 'var(--fg-muted)' }} />
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>Add units first</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>You need units before scheduling timetable sessions.</p>
        </div>
      ) : (
        <>
          {/* Desktop: grid view */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
            <div className="flex" style={{ minWidth: 700 }}>
              {/* Time column */}
              <div className="shrink-0 border-r" style={{ width: 56, borderColor: 'var(--border)' }}>
                <div className="h-10 border-b" style={{ borderColor: 'var(--border)' }} />
                {HOURS.map(h => (
                  <div key={h} className="flex items-start justify-end pr-2 text-xs border-b" style={{ height: 52, borderColor: 'var(--border)', color: 'var(--fg-muted)', paddingTop: 4, fontFamily: 'var(--font-mono)' }}>
                    {h}:00
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {DAYS.map((day, di) => {
                const daySlots = slots.filter(s => s.day === di);
                return (
                  <div key={day} className="flex-1 border-r last:border-r-0 relative" style={{ borderColor: 'var(--border)', minWidth: 100 }}>
                    {/* Header */}
                    <div
                      className="h-10 flex items-center justify-center text-xs font-semibold border-b cursor-pointer hover:bg-[color:var(--border)] transition-all"
                      style={{ borderColor: 'var(--border)', color: 'var(--fg)', fontFamily: 'var(--font-display)' }}
                      onClick={() => openAdd(di)}
                      title={`Add session on ${FULL_DAYS[di]}`}
                    >
                      {day}
                      <Plus size={10} className="ml-1 opacity-30" />
                    </div>

                    {/* Hour rows */}
                    {HOURS.map(h => (
                      <div key={h} className="border-b" style={{ height: 52, borderColor: 'var(--border)' }} />
                    ))}

                    {/* Sessions */}
                    {daySlots.map(slot => {
                      const { top, height, color } = slotStyle(slot);
                      const unit = getUnit(slot.unitId);
                      return (
                        <div
                          key={slot.id}
                          className="absolute left-1 right-1 rounded-lg p-1.5 overflow-hidden cursor-pointer transition-all hover:brightness-110 shadow-sm"
                          style={{ top: top + 40, height: Math.max(height, 28), background: color + 'dd', borderLeft: `3px solid ${color}` }}
                          onClick={() => openEdit(slot)}
                          onMouseEnter={() => setHoveredSlotId(slot.id!)}
                          onMouseLeave={() => setHoveredSlotId(null)}
                        >
                          <p className="text-[10px] font-bold text-white truncate leading-tight" style={{ fontFamily: 'var(--font-display)' }}>
                            {unit?.code ?? '?'}
                          </p>
                          {height > 36 && (
                            <p className="text-[9px] text-white/80 leading-tight">{slot.startTime}–{slot.endTime}</p>
                          )}
                          {height > 48 && (
                            <p className="text-[9px] text-white/70 capitalize leading-tight">{slot.type}</p>
                          )}
                          {hoveredSlotId === slot.id && (
                            <button
                              onClick={e => { e.stopPropagation(); setDeleteId(slot.id!); }}
                              className="absolute top-1 right-1 p-0.5 rounded bg-black/30 text-white hover:bg-black/50"
                            >
                              <Trash2 size={10} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mobile: list view */}
          <div className="md:hidden space-y-3">
            {DAYS.map((day, di) => {
              const daySlots = slots.filter(s => s.day === di).sort((a, b) => a.startTime.localeCompare(b.startTime));
              return (
                <div key={day} className="rounded-2xl border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}>
                  <div
                    className="flex items-center justify-between px-4 py-3 border-b cursor-pointer"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                    onClick={() => openAdd(di)}
                  >
                    <span className="font-semibold text-sm" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
                      {FULL_DAYS[di]}
                    </span>
                    <Plus size={16} style={{ color: 'var(--fg-muted)' }} />
                  </div>
                  {daySlots.length === 0 ? (
                    <p className="text-xs text-center py-4" style={{ color: 'var(--fg-muted)' }}>No classes</p>
                  ) : (
                    daySlots.map(slot => {
                      const unit = getUnit(slot.unitId);
                      return (
                        <div
                          key={slot.id}
                          className="flex items-center gap-3 px-4 py-3 border-b last:border-b-0"
                          style={{ borderColor: 'var(--border)', borderLeftColor: unit?.color, borderLeftWidth: 3 }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
                              {unit?.code ?? '?'} <span className="font-normal text-xs capitalize" style={{ color: 'var(--fg-muted)' }}>({slot.type})</span>
                            </p>
                            <p className="text-xs" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                              {slot.startTime} – {slot.endTime}
                            </p>
                            {slot.venue && <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>📍 {slot.venue}</p>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEdit(slot)} className="p-2 rounded-lg" style={{ color: 'var(--fg-muted)' }}>
                              <Plus size={14} />
                            </button>
                            <button onClick={() => setDeleteId(slot.id!)} className="p-2 rounded-lg" style={{ color: 'var(--fg-muted)' }}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Add/Edit modal */}
      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add Session' : 'Edit Session'}
          open
          onClose={() => setModal(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setModal(null)}>{t('cancel')}</Btn>
              <Btn onClick={save}>{t('save')}</Btn>
            </>
          }
        >
          <div className="space-y-4">
            {clashWarning.length > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: '#f59e0b20', color: '#92400e' }}>
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Timetable clash detected!</p>
                  {clashWarning.map(c => {
                    const u = getUnit(c.unitId);
                    return <p key={c.id} className="text-xs mt-0.5">Clashes with {u?.code ?? '?'} ({c.startTime}–{c.endTime})</p>;
                  })}
                </div>
              </div>
            )}
            <Field label="Unit" required>
              <Select value={modal.slot.unitId || ''} onChange={e => patch('unitId', Number(e.target.value))} className={errors.unitId ? 'border-red-400' : ''}>
                <option value="">— Select unit —</option>
                {units.map(u => <option key={u.id} value={u.id}>{u.code} · {u.title}</option>)}
              </Select>
              {errors.unitId && <p className="text-xs text-red-500 mt-0.5">{errors.unitId}</p>}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Day">
                <Select value={modal.slot.day} onChange={e => patch('day', Number(e.target.value))}>
                  {FULL_DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Type">
                <Select value={modal.slot.type} onChange={e => patch('type', e.target.value)}>
                  {SESSION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Start Time">
                <Input type="time" value={modal.slot.startTime} onChange={e => patch('startTime', e.target.value)} className={errors.time ? 'border-red-400' : ''} />
              </Field>
              <Field label="End Time">
                <Input type="time" value={modal.slot.endTime} onChange={e => patch('endTime', e.target.value)} className={errors.time ? 'border-red-400' : ''} />
              </Field>
            </div>
            {errors.time && <p className="text-xs text-red-500">{errors.time}</p>}
            <Field label="Venue (override)">
              <Input value={modal.slot.venue ?? ''} onChange={e => patch('venue', e.target.value)} placeholder="e.g. LH 3" />
            </Field>
          </div>
        </Modal>
      )}

      <Modal
        title="Delete Session"
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteId(null)}>{t('cancel')}</Btn>
            <Btn variant="danger" onClick={() => deleteSlot(deleteId!)}>Delete</Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Remove this timetable session?</p>
      </Modal>
    </div>
  );
}
