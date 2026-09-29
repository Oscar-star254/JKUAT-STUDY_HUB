import { useState, useEffect } from 'react';
import { db } from '@/db/database';
import type { Note, Unit } from '@/types';
import { useApp } from '@/context/AppContext';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, FileText, Save } from 'lucide-react';
import Modal, { Btn } from '@/components/Modal';

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' });
}

export default function Notes() {
  const { t } = useApp();
  const units = useLiveQuery(() => db.units.orderBy('code').toArray(), []) ?? [];
  const notes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), []) ?? [];
  const [selectedUnit, setSelectedUnit] = useState<number | null>(null);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const filteredNotes = selectedUnit
    ? notes.filter(n => n.unitId === selectedUnit)
    : notes;

  useEffect(() => {
    if (!selectedNote) return;
    setContent(selectedNote.content);
    setTitle(selectedNote.title);
    setDirty(false);
  }, [selectedNote?.id]);

  async function newNote() {
    const unitId = selectedUnit ?? units[0]?.id;
    if (!unitId) return;
    const id = await db.notes.add({
      unitId,
      title: 'New Note',
      content: '',
      updatedAt: new Date().toISOString(),
    });
    const note = await db.notes.get(id);
    setSelectedNote(note!);
  }

  async function saveNote() {
    if (!selectedNote) return;
    setSaving(true);
    const updated: Note = { ...selectedNote, title, content, updatedAt: new Date().toISOString() };
    await db.notes.update(selectedNote.id!, { title, content, updatedAt: updated.updatedAt });
    setSelectedNote(updated);
    setDirty(false);
    setSaving(false);
  }

  async function deleteNote(id: number) {
    await db.notes.delete(id);
    if (selectedNote?.id === id) { setSelectedNote(null); setContent(''); setTitle(''); }
    setDeleteId(null);
  }

  function handleContentChange(v: string) {
    setContent(v);
    setDirty(true);
    // Autosave debounced
    if (selectedNote) {
      clearTimeout((window as any).__noteSaveTimer);
      (window as any).__noteSaveTimer = setTimeout(() => saveNote(), 2000);
    }
  }

  const getUnit = (id: number) => units.find(u => u.id === id);

  return (
    <div className="flex h-full min-h-0" style={{ height: 'calc(100dvh - 60px)' }}>
      {/* Notes sidebar */}
      <aside
        className="flex flex-col w-64 shrink-0 border-r overflow-hidden"
        style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
      >
        {/* Unit filter */}
        <div className="p-3 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-sm font-bold mb-2" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
            {t('notes')}
          </h1>
          <select
            value={selectedUnit ?? ''}
            onChange={e => setSelectedUnit(e.target.value ? Number(e.target.value) : null)}
            className="w-full text-xs px-2 py-1.5 rounded-lg border outline-none"
            style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          >
            <option value="">All Units</option>
            {units.map(u => <option key={u.id} value={u.id}>{u.code}</option>)}
          </select>
        </div>

        {/* New note button */}
        <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={newNote}
            disabled={units.length === 0}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-all"
            style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
          >
            <Plus size={14} /> New Note
          </button>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="py-8 text-center px-3">
              <FileText size={32} className="mx-auto mb-2" style={{ color: 'var(--fg-muted)' }} />
              <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>No notes yet</p>
            </div>
          ) : (
            filteredNotes.map(note => {
              const unit = getUnit(note.unitId);
              return (
                <div
                  key={note.id}
                  onClick={() => setSelectedNote(note)}
                  className="px-3 py-2.5 border-b cursor-pointer transition-all group"
                  style={{
                    borderColor: 'var(--border)',
                    background: selectedNote?.id === note.id ? 'var(--bg)' : 'transparent',
                    borderLeftColor: selectedNote?.id === note.id ? (unit?.color ?? 'var(--accent)') : 'transparent',
                    borderLeftWidth: 3,
                  }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p className="text-xs font-semibold truncate" style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>
                      {note.title || 'Untitled'}
                    </p>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteId(note.id!); }}
                      className="p-0.5 opacity-0 group-hover:opacity-100 rounded hover:text-red-500 transition-all"
                      style={{ color: 'var(--fg-muted)' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {unit && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: unit.color + '25', color: unit.color }}>
                        {unit.code}
                      </span>
                    )}
                    <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>{timeAgo(note.updatedAt)}</span>
                  </div>
                  {note.content && (
                    <p className="text-[11px] mt-1 line-clamp-2" style={{ color: 'var(--fg-muted)' }}>
                      {note.content.slice(0, 80)}
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </aside>

      {/* Editor area */}
      {selectedNote ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Editor topbar */}
          <div
            className="flex items-center justify-between px-4 py-2 border-b shrink-0"
            style={{ borderColor: 'var(--border)', background: 'var(--bg-card)' }}
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {(() => {
                const unit = getUnit(selectedNote.unitId);
                return unit ? (
                  <span className="text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium" style={{ background: unit.color + '25', color: unit.color }}>
                    {unit.code}
                  </span>
                ) : null;
              })()}
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); setDirty(true); }}
                placeholder="Note title…"
                className="flex-1 bg-transparent text-sm font-semibold outline-none min-w-0"
                style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)' }}
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {dirty && (
                <span className="text-[10px]" style={{ color: 'var(--fg-muted)' }}>Unsaved changes</span>
              )}
              <button
                onClick={saveNote}
                disabled={saving || !dirty}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40 hover:opacity-90 transition-all"
                style={{ background: 'var(--primary)', color: 'var(--primary-fg)', fontFamily: 'var(--font-display)' }}
              >
                <Save size={13} />
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          {/* Textarea */}
          <textarea
            value={content}
            onChange={e => handleContentChange(e.target.value)}
            placeholder={`Start writing your notes for ${getUnit(selectedNote.unitId)?.code ?? 'this unit'}…\n\nTip: Use Ctrl+S to save quickly.`}
            className="flex-1 p-6 text-sm leading-relaxed outline-none resize-none"
            style={{
              background: 'var(--bg)',
              color: 'var(--fg)',
              fontFamily: 'var(--font-body)',
              fontSize: 15,
            }}
            onKeyDown={e => {
              if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveNote(); }
            }}
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8" style={{ background: 'var(--bg)' }}>
          <FileText size={48} style={{ color: 'var(--fg-muted)' }} />
          <p className="font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
            {notes.length === 0 ? 'No notes yet' : 'Select a note'}
          </p>
          <p className="text-sm max-w-xs" style={{ color: 'var(--fg-muted)' }}>
            {units.length === 0
              ? 'Add units first, then create notes for each unit.'
              : 'Click "New Note" to start writing, or select an existing note.'}
          </p>
        </div>
      )}

      <Modal
        title="Delete Note"
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        footer={
          <>
            <Btn variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => deleteNote(deleteId!)}>Delete</Btn>
          </>
        }
      >
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Delete this note permanently?</p>
      </Modal>
    </div>
  );
}
