import { useRef, useState } from 'react';
import { db } from '@/db/database';
import type { Unit } from '@/types';
import { UNIT_COLORS } from '@/types';
import { useApp } from '@/context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import Modal, { Btn, Field, Input, Select } from '@/components/Modal';
import { Plus, Edit2, Trash2, AlertTriangle, BookOpen, FilePlus2, FileText, X } from 'lucide-react';

const SEMESTERS = [1, 2, 3];
const YEARS = [1, 2, 3, 4, 5];
const MAX_PDF_SIZE_MB = 50;

function emptyUnit(): Omit<Unit, 'id'> {
  return { code: '', title: '', lecturer: '', venue: '', creditHours: 3, year: 1, semester: 1, color: UNIT_COLORS[0] };
}

export default function Units() {
  const { t } = useApp();
  const units = useLiveQuery(() => db.units.orderBy('code').toArray(), []) ?? [];
  const pdfs = useLiveQuery(() => db.pdfs.toArray(), []) ?? [];
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; unit: Omit<Unit, 'id'> & { id?: number } } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploadUnitId, setUploadUnitId] = useState<number | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openAdd() {
    setErrors({});
    setModal({ mode: 'add', unit: emptyUnit() });
  }

  function openEdit(u: Unit) {
    setErrors({});
    setModal({ mode: 'edit', unit: { ...u } });
  }

  function validate(u: NonNullable<typeof modal>['unit']): boolean {
    const e: Record<string, string> = {};
    if (!u.code.trim()) e.code = 'Unit code is required';
    if (!u.title.trim()) e.title = 'Title is required';
    if (u.creditHours < 1 || u.creditHours > 10) e.creditHours = 'Credit hours must be 1–10';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function save() {
    if (!modal || !validate(modal.unit)) return;
    const { id, ...data } = modal.unit;
    if (modal.mode === 'add') {
      await db.units.add(data);
    } else {
      await db.units.update(id!, data);
    }
    setModal(null);
  }

  async function deleteUnit(id: number) {
    const documentIds = (await db.pdfs.where('unitId').equals(id).primaryKeys()) as number[];
    await db.units.delete(id);
    // Clean up related data
    await db.assessments.where('unitId').equals(id).delete();
    await db.timetable.where('unitId').equals(id).delete();
    await db.notes.where('unitId').equals(id).delete();
    await db.pdfs.where('unitId').equals(id).delete();
    await db.annotations.bulkDelete(documentIds);
    setDeleteId(null);
  }

  function choosePDF(unitId: number) {
    setUploadMessage(null);
    setUploadUnitId(unitId);
    fileInputRef.current?.click();
  }

  async function addPDFs(files: FileList | null) {
    if (!files || uploadUnitId === null) return;
    let added = 0;
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        setUploadMessage(`"${file.name}" is not a PDF file.`);
        continue;
      }
      if (file.size > MAX_PDF_SIZE_MB * 1048576) {
        setUploadMessage(`"${file.name}" exceeds the ${MAX_PDF_SIZE_MB} MB size limit.`);
        continue;
      }
      await db.pdfs.add({
        name: file.name.replace(/\.pdf$/i, ''),
        unitId: uploadUnitId,
        type: 'notes',
        file: await file.arrayBuffer(),
        size: file.size,
        uploadedAt: new Date().toISOString(),
        lastPage: 1,
        lastZoom: 1,
        tags: [],
      });
      added += 1;
    }
    if (added > 0) {
      const unit = units.find(item => item.id === uploadUnitId);
      setUploadMessage(`${added} PDF${added === 1 ? '' : 's'} added to ${unit?.code ?? 'the unit'}.`);
    }
    setUploadUnitId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function patch(key: keyof Unit, value: unknown) {
    if (!modal) return;
    setModal(m => m ? { ...m, unit: { ...m.unit, [key]: value } } : null);
    if (errors[key]) setErrors(e => { const n = { ...e }; delete n[key]; return n; });
  }

  const grouped = YEARS.map(y => ({
    year: y,
    semesters: SEMESTERS.map(s => ({
      semester: s,
      units: units.filter(u => u.year === y && u.semester === s),
    })).filter(s => s.units.length > 0),
  })).filter(y => y.semesters.length > 0);

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
            {t('units')}
          </h1>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {units.length} unit{units.length !== 1 ? 's' : ''} enrolled
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90 transition-all"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
        >
          <Plus size={16} /> {t('add')} Unit
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={e => addPDFs(e.target.files)}
        />
      </div>

      {uploadMessage && (
        <div
          className="flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm"
          style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
        >
          <FileText size={16} style={{ color: 'var(--primary)' }} />
          <span className="flex-1">{uploadMessage}</span>
          <button onClick={() => setUploadMessage(null)} className="p-1" aria-label="Dismiss message">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Units grouped by year/semester */}
      {units.length === 0 ? (
        <div className="py-20 text-center space-y-3">
          <BookOpen size={48} className="mx-auto" style={{ color: 'var(--fg-muted)' }} />
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>No units yet</p>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Add your enrolled units to track grades, timetable, and notes.</p>
          <button onClick={openAdd} className="px-5 py-2.5 rounded-xl text-sm font-semibold mt-2" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
            <Plus size={14} className="inline mr-1" /> Add First Unit
          </button>
        </div>
      ) : (
        grouped.map(({ year, semesters }) => (
          <div key={year}>
            <h2 className="text-sm font-bold mb-3 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg-muted)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-[color:var(--accent)] inline-block" />
              Year {year}
            </h2>
            {semesters.map(({ semester, units: semUnits }) => (
              <div key={semester} className="mb-5">
                <p className="text-xs font-medium mb-2 ml-4" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>
                  Semester {semester}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {semUnits.map(u => (
                    <UnitCard
                      key={u.id}
                      unit={u}
                      pdfCount={pdfs.filter(pdf => pdf.unitId === u.id).length}
                      onAddPDF={() => choosePDF(u.id!)}
                      onEdit={() => openEdit(u)}
                      onDelete={() => setDeleteId(u.id!)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {/* Add / Edit modal */}
      {modal && (
        <Modal
          title={modal.mode === 'add' ? 'Add Unit' : 'Edit Unit'}
          open
          onClose={() => setModal(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setModal(null)}>{t('cancel')}</Btn>
              <Btn onClick={save}>{t('save')}</Btn>
            </>
          }
          size="md"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Unit Code" required>
                <Input
                  value={modal.unit.code}
                  onChange={e => patch('code', e.target.value.toUpperCase())}
                  placeholder="ICS 2101"
                  className={errors.code ? 'border-red-400' : ''}
                />
                {errors.code && <p className="text-xs text-red-500 mt-0.5">{errors.code}</p>}
              </Field>
              <Field label="Credit Hours" required>
                <Input
                  type="number"
                  min={1} max={10}
                  value={modal.unit.creditHours}
                  onChange={e => patch('creditHours', Number(e.target.value))}
                  className={errors.creditHours ? 'border-red-400' : ''}
                />
                {errors.creditHours && <p className="text-xs text-red-500 mt-0.5">{errors.creditHours}</p>}
              </Field>
            </div>
            <Field label="Unit Title" required>
              <Input
                value={modal.unit.title}
                onChange={e => patch('title', e.target.value)}
                placeholder="Introduction to Computer Science"
                className={errors.title ? 'border-red-400' : ''}
              />
              {errors.title && <p className="text-xs text-red-500 mt-0.5">{errors.title}</p>}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lecturer">
                <Input value={modal.unit.lecturer} onChange={e => patch('lecturer', e.target.value)} placeholder="Dr. Mwangi" />
              </Field>
              <Field label="Venue">
                <Input value={modal.unit.venue} onChange={e => patch('venue', e.target.value)} placeholder="LH 5" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Year">
                <Select value={modal.unit.year} onChange={e => patch('year', Number(e.target.value))}>
                  {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                </Select>
              </Field>
              <Field label="Semester">
                <Select value={modal.unit.semester} onChange={e => patch('semester', Number(e.target.value))}>
                  {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Color Tag">
              <div className="flex gap-2 flex-wrap">
                {UNIT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => patch('color', c)}
                    className="w-7 h-7 rounded-full border-2 transition-all"
                    style={{ background: c, borderColor: modal.unit.color === c ? 'var(--fg)' : 'transparent' }}
                  />
                ))}
              </div>
            </Field>
            <Field label="">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={modal.unit.retake} onChange={e => patch('retake', e.target.checked)} className="rounded" />
                <span style={{ color: 'var(--fg-muted)' }}>Retake / Supplementary unit</span>
              </label>
            </Field>
          </div>
        </Modal>
      )}

      {/* Delete confirm */}
      <Modal
        title="Delete Unit"
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteId(null)}>{t('cancel')}</Btn>
            <Btn variant="danger" onClick={() => deleteUnit(deleteId!)}>Delete</Btn>
          </>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            This will permanently delete the unit and all related PDFs, annotations, assessments, timetable slots, and notes. This cannot be undone.
          </p>
        </div>
      </Modal>
    </div>
  );
}

function UnitCard({ unit, pdfCount, onAddPDF, onEdit, onDelete }: {
  unit: Unit;
  pdfCount: number;
  onAddPDF: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:shadow-md"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)', borderLeftColor: unit.color, borderLeftWidth: 4 }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-sm" style={{ fontFamily: 'var(--font-mono)', color: unit.color }}>{unit.code}</p>
          <p className="font-semibold text-sm mt-0.5 leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>{unit.title}</p>
        </div>
        <span
          className="text-xs px-2 py-0.5 rounded-full shrink-0"
          style={{ background: 'var(--border)', color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}
        >
          {unit.creditHours} CR
        </span>
      </div>
      <div className="space-y-1 text-xs" style={{ color: 'var(--fg-muted)' }}>
        {unit.lecturer && <p>👤 {unit.lecturer}</p>}
        {unit.venue && <p>📍 {unit.venue}</p>}
        {unit.retake && (
          <p className="text-amber-600 font-medium">⚠️ Retake / Supplementary</p>
        )}
      </div>
      <div className="flex gap-2 mt-auto">
        <button
          onClick={onAddPDF}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}
        >
          <FilePlus2 size={13} /> Add PDF
          {pdfCount > 0 && <span className="opacity-70">({pdfCount})</span>}
        </button>
        <button onClick={onEdit} className="p-2 rounded-xl border transition-all hover:bg-[color:var(--border)]" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }} title="Edit unit" aria-label="Edit unit">
          <Edit2 size={13} />
        </button>
        <button onClick={onDelete} className="p-2 rounded-xl border transition-all hover:bg-red-50 hover:border-red-200 hover:text-red-500" style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }} title="Delete unit">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}
