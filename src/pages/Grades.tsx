import { useState } from 'react';
import { db } from '@/db/database';
import type { Unit, Assessment } from '@/types';
import { useApp } from '@/context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import Modal, { Btn, Field, Input, Select } from '@/components/Modal';
import { calcUnitScore, calcGPA, degreeClass, getGradeBand, requiredExamScore, formatScore } from '@/utils/gradeUtils';
import { Plus, Trash2, TrendingUp, Award, ChevronDown, ChevronRight } from 'lucide-react';

const ASSESS_TYPES = [
  { value: 'cat', label: 'CAT' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'exam', label: 'Exam' },
];

export default function Grades() {
  const { t, settings } = useApp();
  const units = useLiveQuery(() => db.units.orderBy('code').toArray(), []) ?? [];
  const allAssessments = useLiveQuery(() => db.assessments.toArray(), []) ?? [];
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState<{ unitId: number } | null>(null);
  const [form, setForm] = useState<Omit<Assessment, 'id'>>({ unitId: 0, type: 'cat', name: '', score: 0, maxScore: 100 });
  const [showPredictor, setShowPredictor] = useState<number | null>(null);
  const [predictorCat, setPredictorCat] = useState('');

  // GPA calculation across all units
  const unitScores = units.map(u => {
    const asses = allAssessments.filter(a => a.unitId === u.id);
    const { total } = calcUnitScore(asses, settings);
    return { unit: u, asses, total };
  });

  const gpa = calcGPA(
    unitScores.filter(u => u.total !== null).map(u => ({ total: u.total!, creditHours: u.unit.creditHours })),
    settings.gradeBands,
  );

  async function addAssessment() {
    if (!form.name.trim()) return;
    await db.assessments.add({ ...form });
    setModal(null);
  }

  async function deleteAssessment(id: number) {
    await db.assessments.delete(id);
  }

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header + GPA banner */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
            {t('grades')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            CAT weight: {Math.round(settings.catWeight * 100)}% · Exam weight: {Math.round(settings.examWeight * 100)}%
          </p>
        </div>
        {gpa > 0 && (
          <div
            className="flex flex-col items-end gap-0.5 px-4 py-3 rounded-2xl border shrink-0"
            style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--accent)' }}>
                {gpa.toFixed(2)}
              </span>
              <span className="text-sm" style={{ color: 'var(--fg-muted)' }}>GPA</span>
            </div>
            <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>{degreeClass(gpa)}</span>
          </div>
        )}
      </div>

      {/* Units list */}
      {units.length === 0 ? (
        <div className="py-20 text-center space-y-2">
          <Award size={48} className="mx-auto" style={{ color: 'var(--fg-muted)' }} />
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>No units yet</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Add units first, then enter your scores here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {unitScores.map(({ unit, asses, total }) => {
            const band = total !== null ? getGradeBand(total, settings.gradeBands) : null;
            const isOpen = expanded === unit.id;
            const cats = asses.filter(a => a.type === 'cat' || a.type === 'assignment');
            const exams = asses.filter(a => a.type === 'exam');
            const { catScore, examScore } = calcUnitScore(asses, settings);

            return (
              <div
                key={unit.id}
                className="rounded-2xl border overflow-hidden transition-all"
                style={{ borderColor: 'var(--border)', background: 'var(--bg-card)', borderLeftColor: unit.color, borderLeftWidth: 4 }}
              >
                {/* Header row */}
                <button
                  className="w-full flex items-center gap-3 p-4 text-left transition-all hover:bg-[color:var(--bg)]"
                  onClick={() => setExpanded(isOpen ? null : unit.id!)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-mono)', color: unit.color }}>{unit.code}</span>
                      {unit.retake && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">Retake</span>}
                    </div>
                    <p className="text-sm truncate" style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>{unit.title}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      {total !== null ? (
                        <>
                          <p className="font-bold text-lg" style={{ fontFamily: 'var(--font-mono)', color: band?.label === 'E' ? '#ef4444' : band && band.gpa >= 3 ? '#10b981' : 'var(--fg)' }}>
                            {total.toFixed(1)}%
                          </p>
                          <p className="text-xs" style={{ color: band?.label === 'E' ? '#ef4444' : band && band.gpa >= 3 ? '#10b981' : 'var(--fg-muted)' }}>
                            Grade {band?.label}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>—</p>
                      )}
                    </div>
                    {isOpen ? <ChevronDown size={16} style={{ color: 'var(--fg-muted)' }} /> : <ChevronRight size={16} style={{ color: 'var(--fg-muted)' }} />}
                  </div>
                </button>

                {/* Expanded content */}
                {isOpen && (
                  <div className="border-t px-4 pb-4" style={{ borderColor: 'var(--border)' }}>
                    {/* Score breakdown */}
                    <div className="grid grid-cols-2 gap-3 mt-3 mb-4">
                      <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>
                          CAT / Assignment ({Math.round(settings.catWeight * 100)}%)
                        </p>
                        <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                          {catScore !== null ? catScore.toFixed(1) + '%' : '—'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                          Weighted: {catScore !== null ? (catScore * settings.catWeight).toFixed(1) : '—'}
                        </p>
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: 'var(--bg)' }}>
                        <p className="text-xs font-medium mb-1" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>
                          Final Exam ({Math.round(settings.examWeight * 100)}%)
                        </p>
                        <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg)' }}>
                          {examScore !== null ? examScore.toFixed(1) + '%' : '—'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                          Weighted: {examScore !== null ? (examScore * settings.examWeight).toFixed(1) : '—'}
                        </p>
                      </div>
                    </div>

                    {/* Assessment entries */}
                    {asses.length > 0 && (
                      <div className="space-y-1.5 mb-3">
                        {asses.map(a => (
                          <div key={a.id} className="flex items-center gap-2 text-sm px-2 py-1.5 rounded-lg" style={{ background: 'var(--bg)' }}>
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium uppercase"
                              style={{
                                background: a.type === 'exam' ? '#ef444420' : '#3b82f620',
                                color: a.type === 'exam' ? '#ef4444' : '#3b82f6',
                              }}
                            >
                              {a.type}
                            </span>
                            <span className="flex-1" style={{ color: 'var(--fg)' }}>{a.name}</span>
                            <span className="font-mono text-xs" style={{ fontFamily: 'var(--font-mono)', color: 'var(--fg-muted)' }}>
                              {a.score}/{a.maxScore} ({((a.score / a.maxScore) * 100).toFixed(0)}%)
                            </span>
                            {a.date && (
                              <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                                {new Date(a.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                            <button onClick={() => deleteAssessment(a.id!)} className="p-1 rounded hover:bg-red-100 hover:text-red-500 transition-all" style={{ color: 'var(--fg-muted)' }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setForm({ ...form, unitId: unit.id!, type: 'cat' }); setModal({ unitId: unit.id! }); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
                      >
                        <Plus size={13} /> Add Score
                      </button>
                      <button
                        onClick={() => { setShowPredictor(showPredictor === unit.id ? null : unit.id!); setPredictorCat(catScore?.toFixed(1) ?? ''); }}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border transition-all"
                        style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}
                      >
                        <TrendingUp size={13} /> {t('predictor')}
                      </button>
                    </div>

                    {/* Grade predictor */}
                    {showPredictor === unit.id && (
                      <GradePredictor
                        catScore={parseFloat(predictorCat) || (catScore ?? 0)}
                        onCatChange={setPredictorCat}
                        catWeight={settings.catWeight}
                        examWeight={settings.examWeight}
                        bands={settings.gradeBands}
                      />
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add assessment modal */}
      {modal && (
        <Modal
          title="Add Score"
          open
          onClose={() => setModal(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setModal(null)}>{t('cancel')}</Btn>
              <Btn onClick={addAssessment}>{t('save')}</Btn>
            </>
          }
        >
          <div className="space-y-4">
            <Field label="Type">
              <Select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as Assessment['type'] }))}>
                {ASSESS_TYPES.map(at => <option key={at.value} value={at.value}>{at.label}</option>)}
              </Select>
            </Field>
            <Field label="Name" required>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="CAT 1, Assignment 2, Final Exam…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Score">
                <Input type="number" min={0} max={form.maxScore} value={form.score} onChange={e => setForm(f => ({ ...f, score: Number(e.target.value) }))} />
              </Field>
              <Field label="Out of">
                <Input type="number" min={1} value={form.maxScore} onChange={e => setForm(f => ({ ...f, maxScore: Number(e.target.value) }))} />
              </Field>
            </div>
            <Field label="Date (optional)">
              <Input type="date" value={form.date ?? ''} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
            </Field>
            {form.score > 0 && form.maxScore > 0 && (
              <div className="text-center text-sm font-semibold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                = {((form.score / form.maxScore) * 100).toFixed(1)}%
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}

function GradePredictor({ catScore, onCatChange, catWeight, examWeight, bands }: {
  catScore: number; onCatChange: (v: string) => void;
  catWeight: number; examWeight: number; bands: import('@/types').GradeBand[];
}) {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return (
    <div className="mt-3 p-3 rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
      <p className="text-xs font-semibold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
        What do I need in the exam?
      </p>
      <div className="flex items-center gap-2 mb-3">
        <label className="text-xs" style={{ color: 'var(--fg-muted)' }}>Your CAT score:</label>
        <input
          type="number"
          min={0}
          max={100}
          value={catScore}
          onChange={e => onCatChange(e.target.value)}
          className="w-20 px-2 py-1 rounded-lg text-xs border outline-none text-center"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg)', fontFamily: 'var(--font-mono)' }}
        />
        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>%</span>
      </div>
      <div className="space-y-1">
        {sorted.map(band => {
          const needed = requiredExamScore(catScore, band.min, catWeight, examWeight);
          const impossible = needed > 100;
          const already = needed <= 0;
          return (
            <div key={band.label} className="flex items-center justify-between text-xs">
              <span className="font-semibold w-6" style={{ fontFamily: 'var(--font-mono)', color: band.label === 'E' ? '#ef4444' : band.gpa >= 3 ? '#10b981' : 'var(--fg)' }}>
                {band.label}
              </span>
              <span className="flex-1 ml-2 text-[10px]" style={{ color: 'var(--fg-muted)' }}>{band.min}%+</span>
              <span
                className="font-mono font-semibold"
                style={{
                  fontFamily: 'var(--font-mono)',
                  color: impossible ? '#ef4444' : already ? '#10b981' : 'var(--fg)',
                }}
              >
                {impossible ? 'Impossible' : already ? 'Already there ✓' : `${needed.toFixed(0)}%`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
