import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/db/database';
import type { PDFDoc, Unit } from '@/types';
import { useApp } from '@/context/AppContext';
import Modal, { Btn, Field, Input, Select } from '@/components/Modal';
import { Upload, FileText, Trash2, Eye, Tag, HardDrive, Search, X, FolderOpen } from 'lucide-react';

const PDF_TYPES = ['notes', 'past-paper', 'assignment', 'textbook'] as const;
const MAX_SIZE_MB = 50;

function fmtSize(bytes: number) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function TypeBadge({ type }: { type: string }) {
  const colors: Record<string, string> = {
    notes: '#3b82f6',
    'past-paper': '#ef4444',
    assignment: '#f59e0b',
    textbook: '#10b981',
  };
  const c = colors[type] ?? '#6b7280';
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide"
      style={{ background: c + '25', color: c }}
    >
      {type}
    </span>
  );
}

export default function Library() {
  const { t } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>('all');
  const [unitFilter, setUnitFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [uploadUnitId, setUploadUnitId] = useState<number | undefined>();
  const [uploadType, setUploadType] = useState<PDFDoc['type']>('notes');
  const [tagModal, setTagModal] = useState<{ doc: PDFDoc } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const docs = useLiveQuery(() => db.pdfs.orderBy('uploadedAt').reverse().toArray(), []) ?? [];
  const units = useLiveQuery(() => db.units.toArray(), []) ?? [];
  const totalSize = docs.reduce((s, d) => s + d.size, 0);

  const filtered = docs.filter(d => {
    const matchType = filter === 'all' || d.type === filter;
    const matchUnit = unitFilter === 'all'
      || (unitFilter === 'uncategorised' ? !d.unitId : d.unitId === Number(unitFilter));
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase());
    return matchType && matchUnit && matchSearch;
  });

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    setUploadError(null);
    if (units.length === 0) {
      setUploadError('Add a unit before uploading PDFs so every document stays categorised.');
      return;
    }
    const accepted: File[] = [];
    for (const file of Array.from(files)) {
      if (file.type !== 'application/pdf') {
        setUploadError(`"${file.name}" is not a PDF file.`);
        continue;
      }
      if (file.size > MAX_SIZE_MB * 1048576) {
        setUploadError(`"${file.name}" exceeds the ${MAX_SIZE_MB} MB size limit.`);
        continue;
      }
      accepted.push(file);
    }
    if (accepted.length > 0) setPendingFiles(accepted);
  }, [units.length]);

  async function uploadPendingFiles() {
    if (!uploadUnitId || pendingFiles.length === 0) return;
    setUploading(true);
    for (const file of pendingFiles) {
      const buffer = await file.arrayBuffer();
      await db.pdfs.add({
        name: file.name.replace(/\.pdf$/i, ''),
        unitId: uploadUnitId,
        type: uploadType,
        file: buffer,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        lastPage: 1,
        lastZoom: 1,
        tags: [],
      });
    }
    setUploading(false);
    setPendingFiles([]);
    setUploadUnitId(undefined);
    setUploadType('notes');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function closeUploadModal() {
    if (uploading) return;
    setPendingFiles([]);
    setUploadUnitId(undefined);
    setUploadType('notes');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  async function handleDelete(id: number) {
    await db.pdfs.delete(id);
    await db.annotations.delete(id);
    setDeleteId(null);
  }

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
            {t('library')}
          </h1>
          <p className="text-sm mt-0.5 flex items-center gap-1.5" style={{ color: 'var(--fg-muted)' }}>
            <HardDrive size={13} />
            {docs.length} file{docs.length !== 1 ? 's' : ''} · {fmtSize(totalSize)} used
          </p>
        </div>
        <button
          onClick={() => {
            if (units.length === 0) {
              setUploadError('Add a unit before uploading PDFs so every document stays categorised.');
              return;
            }
            fileInputRef.current?.click();
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 shrink-0"
          style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
          disabled={uploading}
        >
          <Upload size={16} />
          {uploading ? 'Uploading…' : t('upload')}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          multiple
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {uploadError && (
        <div className="flex items-start gap-2 p-3 rounded-xl text-sm" style={{ background: '#ef444420', color: '#ef4444' }}>
          <X size={16} className="mt-0.5 shrink-0" />
          {uploadError}
          <button onClick={() => setUploadError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onClick={() => {
          if (units.length === 0) {
            setUploadError('Add a unit before uploading PDFs so every document stays categorised.');
            return;
          }
          fileInputRef.current?.click();
        }}
        className="border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: isDragging ? 'var(--accent)' : 'var(--border)',
          background: isDragging ? 'var(--accent)10' : 'var(--bg)',
        }}
      >
        <Upload size={28} className="mx-auto mb-2" style={{ color: isDragging ? 'var(--accent)' : 'var(--fg-muted)' }} />
        <p className="text-sm font-medium" style={{ color: 'var(--fg-muted)' }}>
          Drop PDF files here or click to browse
        </p>
        <p className="text-xs mt-1" style={{ color: 'var(--fg-muted)' }}>
          Max {MAX_SIZE_MB} MB per file · PDF only
        </p>
      </div>

      {/* Filters + search */}
      <div className="flex gap-2 flex-wrap">
        <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border text-sm" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
          <Search size={15} style={{ color: 'var(--fg-muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search')}
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: 'var(--fg)' }}
          />
          {search && <button onClick={() => setSearch('')}><X size={14} style={{ color: 'var(--fg-muted)' }} /></button>}
        </div>
        <Select
          value={unitFilter}
          onChange={e => setUnitFilter(e.target.value)}
          className="w-full sm:w-auto sm:min-w-48"
          aria-label="Filter PDFs by unit"
        >
          <option value="all">All units</option>
          {units.map(unit => <option key={unit.id} value={unit.id}>{unit.code}</option>)}
          {docs.some(doc => !doc.unitId) && <option value="uncategorised">Uncategorised</option>}
        </Select>
        <div className="flex gap-1">
          {['all', ...PDF_TYPES].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="px-3 py-2 rounded-xl text-xs font-medium capitalize transition-all"
              style={{
                background: filter === f ? 'var(--primary)' : 'var(--bg-card)',
                color: filter === f ? 'var(--primary-fg)' : 'var(--fg-muted)',
                fontFamily: 'var(--font-display)',
                border: '1px solid var(--border)',
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* File list */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <div className="text-4xl">📄</div>
          <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
            {docs.length === 0 ? 'No PDFs uploaded yet. Upload your first document!' : 'No PDFs match your filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(doc => {
            const unit = doc.unitId ? units.find(u => u.id === doc.unitId) : null;
            return (
              <div
                key={doc.id}
                className="rounded-2xl border p-4 flex flex-col gap-3 transition-all hover:shadow-md"
                style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="p-2.5 rounded-xl shrink-0"
                    style={{ background: 'var(--primary)20' }}
                  >
                    <FileText size={18} style={{ color: 'var(--primary)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold truncate"
                      style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)' }}
                      title={doc.name}
                    >
                      {doc.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                      {fmtSize(doc.size)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <TypeBadge type={doc.type} />
                  {unit && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: unit.color + '25', color: unit.color }}
                    >
                      {unit.code}
                    </span>
                  )}
                  {!unit && (
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                      style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}
                    >
                      Uncategorised
                    </span>
                  )}
                </div>
                <p className="text-[11px]" style={{ color: 'var(--fg-muted)' }}>
                  {new Date(doc.uploadedAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => navigate(`/library/${doc.id}`)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition-all hover:opacity-90"
                    style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
                  >
                    <Eye size={14} /> Open
                  </button>
                  <button
                    onClick={() => setTagModal({ doc })}
                    className="p-2 rounded-xl border transition-all hover:bg-[color:var(--border)]"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                    title="Tag"
                  >
                    <Tag size={14} />
                  </button>
                  <button
                    onClick={() => setDeleteId(doc.id!)}
                    className="p-2 rounded-xl border transition-all hover:bg-red-50 hover:border-red-200"
                    style={{ borderColor: 'var(--border)', color: 'var(--fg-muted)' }}
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Categorised upload */}
      <Modal
        title="Add PDF to a unit"
        open={pendingFiles.length > 0}
        onClose={closeUploadModal}
        footer={
          <>
            <Btn variant="ghost" onClick={closeUploadModal}>Cancel</Btn>
            <Btn onClick={uploadPendingFiles} disabled={!uploadUnitId || uploading}>
              {uploading ? 'Uploading…' : `Add ${pendingFiles.length} PDF${pendingFiles.length === 1 ? '' : 's'}`}
            </Btn>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <FolderOpen size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
            <div className="min-w-0">
              <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
                {pendingFiles.length === 1 ? pendingFiles[0].name : `${pendingFiles.length} PDF files selected`}
              </p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>
                Select the unit where {pendingFiles.length === 1 ? 'this document belongs' : 'these documents belong'}.
              </p>
            </div>
          </div>
          <Field label="Unit" required>
            <Select value={uploadUnitId ?? ''} onChange={e => setUploadUnitId(e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">Select a unit</option>
              {units.map(unit => <option key={unit.id} value={unit.id}>{unit.code} · {unit.title}</option>)}
            </Select>
          </Field>
          <Field label="Document Type">
            <Select value={uploadType} onChange={e => setUploadType(e.target.value as PDFDoc['type'])}>
              {PDF_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
            </Select>
          </Field>
        </div>
      </Modal>

      {/* Tag modal */}
      {tagModal && (
        <TagModal
          doc={tagModal.doc}
          units={units}
          onClose={() => setTagModal(null)}
          onSave={async (unitId, type) => {
            await db.pdfs.update(tagModal.doc.id!, { unitId, type });
            setTagModal(null);
          }}
        />
      )}

      {/* Delete confirm */}
      <Modal
        title="Delete PDF"
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => handleDelete(deleteId!)}>Delete</Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>
          This will permanently delete the PDF and all its annotations. This cannot be undone.
        </p>
      </Modal>
    </div>
  );
}

function TagModal({ doc, units, onClose, onSave }: {
  doc: PDFDoc; units: Unit[];
  onClose: () => void;
  onSave: (unitId: number | undefined, type: PDFDoc['type']) => Promise<void>;
}) {
  const [unitId, setUnitId] = useState(doc.unitId);
  const [type, setType] = useState(doc.type);
  return (
    <Modal
      title="Tag Document"
      open
      onClose={onClose}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose}>Cancel</Btn>
          <Btn onClick={() => onSave(unitId, type)}>Save</Btn>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Unit">
          <Select value={unitId ?? ''} onChange={e => setUnitId(e.target.value ? Number(e.target.value) : undefined)}>
            <option value="">— No unit —</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.code} · {u.title}</option>)}
          </Select>
        </Field>
        <Field label="Document Type">
          <Select value={type} onChange={e => setType(e.target.value as PDFDoc['type'])}>
            {PDF_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
