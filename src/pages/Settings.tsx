import { useState } from 'react';
import { db } from '@/db/database';
import type { GradeBand, AppSettings } from '@/types';
import { DEFAULT_GRADE_BANDS } from '@/types';
import { useApp } from '@/context/AppContext';
import { Btn, Field, Input } from '@/components/Modal';
import { Moon, Sun, Languages, Save, RotateCcw, Download, Upload, Trash2, Plus, Settings2 } from 'lucide-react';

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}>
      <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
        <span style={{ color: 'var(--fg-muted)' }}>{icon}</span>
        <h2 className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>{title}</h2>
      </div>
      <div className="p-4 space-y-4">{children}</div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }: {
  label: string; description?: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium" style={{ color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>{label}</p>
        {description && <p className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)' }}>{description}</p>}
      </div>
      <button
        onClick={() => onChange(!checked)}
        className="relative w-11 h-6 rounded-full transition-all shrink-0"
        style={{ background: checked ? 'var(--primary)' : 'var(--border)' }}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
          style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

export default function Settings() {
  const { settings, updateSettings, t } = useApp();
  const [bands, setBands] = useState<GradeBand[]>(settings.gradeBands);
  const [catWeight, setCatWeight] = useState(Math.round(settings.catWeight * 100));
  const [bandsDirty, setBandsDirty] = useState(false);
  const [weightsDirty, setWeightsDirty] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(null);

  function updateBand(idx: number, key: keyof GradeBand, value: string | number) {
    setBands(prev => prev.map((b, i) => i === idx ? { ...b, [key]: typeof value === 'string' ? value : Number(value) } : b));
    setBandsDirty(true);
  }

  function addBand() {
    setBands(prev => [...prev, { label: 'X', min: 0, gpa: 0 }]);
    setBandsDirty(true);
  }

  function removeBand(idx: number) {
    setBands(prev => prev.filter((_, i) => i !== idx));
    setBandsDirty(true);
  }

  async function saveBands() {
    await updateSettings({ gradeBands: bands });
    setBandsDirty(false);
  }

  async function saveWeights() {
    const cat = Math.max(0, Math.min(100, catWeight)) / 100;
    await updateSettings({ catWeight: cat, examWeight: 1 - cat });
    setWeightsDirty(false);
  }

  async function resetBands() {
    setBands(DEFAULT_GRADE_BANDS);
    await updateSettings({ gradeBands: DEFAULT_GRADE_BANDS });
    setBandsDirty(false);
  }

  async function exportBackup() {
    setExportStatus('Exporting…');
    try {
      const units = await db.units.toArray();
      const timetable = await db.timetable.toArray();
      const assessments = await db.assessments.toArray();
      const notes = await db.notes.toArray();
      const events = await db.events.toArray();

      const backup = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings,
        units,
        timetable,
        assessments,
        notes,
        events,
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `jkuat-studyhub-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExportStatus('Exported successfully!');
    } catch {
      setExportStatus('Export failed');
    }
    setTimeout(() => setExportStatus(null), 3000);
  }

  async function importBackup(file: File) {
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.version || !data.units) { alert('Invalid backup file.'); return; }
      if (!confirm('This will overwrite your existing data. Continue?')) return;

      await db.units.clear(); await db.units.bulkAdd(data.units.map(({ id, ...u }: Unit) => u));
      await db.timetable.clear(); await db.timetable.bulkAdd(data.timetable.map(({ id, ...s }: any) => s));
      await db.assessments.clear(); await db.assessments.bulkAdd(data.assessments.map(({ id, ...a }: any) => a));
      await db.notes.clear(); await db.notes.bulkAdd(data.notes.map(({ id, ...n }: any) => n));
      await db.events.clear(); await db.events.bulkAdd(data.events.map(({ id, ...e }: any) => e));
      if (data.settings) await updateSettings(data.settings);

      alert('Backup restored successfully!');
    } catch (e) {
      alert('Failed to import backup: ' + (e as Error).message);
    }
  }

  async function clearAllData() {
    if (!confirm('Delete ALL data? This cannot be undone.')) return;
    if (!confirm('Are you absolutely sure?')) return;
    await Promise.all([
      db.units.clear(), db.timetable.clear(), db.assessments.clear(),
      db.pdfs.clear(), db.annotations.clear(), db.notes.clear(), db.events.clear(),
    ]);
    alert('All data cleared.');
  }

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
          {t('settings')}
        </h1>
        <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>Customize your Study Hub experience</p>
      </div>

      {/* Appearance */}
      <Section title="Appearance & Language" icon={<Sun size={16} />}>
        <Toggle
          label="Dark Mode"
          description="Easier on the eyes in low light"
          checked={settings.darkMode}
          onChange={v => updateSettings({ darkMode: v })}
        />
        <Toggle
          label="Kiswahili Interface"
          description="Switch UI labels to Swahili"
          checked={settings.language === 'sw'}
          onChange={v => updateSettings({ language: v ? 'sw' : 'en' })}
        />
        <Toggle
          label="Notifications"
          description="Reminders for CATs, exams, and deadlines"
          checked={settings.notifications}
          onChange={v => updateSettings({ notifications: v })}
        />
      </Section>

      {/* Assessment weights */}
      <Section title="Assessment Weights" icon={<Settings2 size={16} />}>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          Adjust the weighting between CATs/assignments and the final exam. Weights must sum to 100%.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CAT / Assignment Weight (%)">
            <Input
              type="number"
              min={0} max={100}
              value={catWeight}
              onChange={e => { setCatWeight(Number(e.target.value)); setWeightsDirty(true); }}
            />
          </Field>
          <Field label="Final Exam Weight (%)">
            <Input
              type="number"
              value={100 - catWeight}
              readOnly
              className="opacity-60"
            />
          </Field>
        </div>
        <div className="flex gap-2">
          <Btn onClick={saveWeights} disabled={!weightsDirty}>Save Weights</Btn>
          <Btn variant="ghost" onClick={() => { setCatWeight(30); setWeightsDirty(true); }}>Reset to 30/70</Btn>
        </div>
      </Section>

      {/* Grade bands */}
      <Section title="Grade Bands" icon={<Settings2 size={16} />}>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          Customize grade boundaries for your school. Bands are checked from highest to lowest minimum.
        </p>
        <div className="space-y-2">
          <div className="grid grid-cols-4 gap-2 text-xs font-semibold px-1" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>
            <span>Grade</span><span>Min %</span><span>GPA Points</span><span>Classification</span>
          </div>
          {bands.map((band, idx) => (
            <div key={idx} className="grid grid-cols-4 gap-2 items-center">
              <Input value={band.label} onChange={e => updateBand(idx, 'label', e.target.value)} className="text-center font-mono" />
              <Input type="number" min={0} max={100} value={band.min} onChange={e => updateBand(idx, 'min', e.target.value)} className="text-center font-mono" />
              <Input type="number" min={0} max={4} step={0.5} value={band.gpa} onChange={e => updateBand(idx, 'gpa', e.target.value)} className="text-center font-mono" />
              <div className="flex gap-1">
                <input
                  value={band.classification ?? ''}
                  onChange={e => updateBand(idx, 'classification', e.target.value)}
                  placeholder="Class…"
                  className="flex-1 px-2 py-1.5 rounded-lg text-xs border outline-none min-w-0"
                  style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
                />
                <button onClick={() => removeBand(idx)} className="p-1.5 rounded-lg hover:bg-red-50 hover:text-red-500 transition-all" style={{ color: 'var(--fg-muted)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Btn variant="ghost" onClick={addBand}><Plus size={14} className="inline mr-1" /> Add Band</Btn>
          <Btn onClick={saveBands} disabled={!bandsDirty}>Save Bands</Btn>
          <Btn variant="ghost" onClick={resetBands}><RotateCcw size={14} className="inline mr-1" /> Reset Defaults</Btn>
        </div>
      </Section>

      {/* Backup & Restore */}
      <Section title="Backup & Restore" icon={<Download size={16} />}>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          Export all your data (units, grades, notes, timetable) as a JSON file. PDFs are stored in IndexedDB and cannot be included in this export.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={exportBackup}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all hover:bg-[color:var(--border)]"
            style={{ borderColor: 'var(--border)', color: 'var(--fg)', fontFamily: 'var(--font-display)' }}
          >
            <Download size={15} /> Export Backup
          </button>
          <label className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border cursor-pointer transition-all hover:bg-[color:var(--border)]" style={{ borderColor: 'var(--border)', color: 'var(--fg)', fontFamily: 'var(--font-display)' }}>
            <Upload size={15} /> Import Backup
            <input type="file" accept=".json" className="hidden" onChange={e => e.target.files?.[0] && importBackup(e.target.files[0])} />
          </label>
        </div>
        {exportStatus && (
          <p className="text-sm font-medium" style={{ color: 'var(--success)' }}>{exportStatus}</p>
        )}
      </Section>

      {/* Danger zone */}
      <Section title="Danger Zone" icon={<Trash2 size={16} />}>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          Permanently delete all your data including PDFs, grades, notes, and settings. This cannot be undone.
        </p>
        <button
          onClick={clearAllData}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-red-400 text-red-500 hover:bg-red-50 transition-all"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          <Trash2 size={15} /> Clear All Data
        </button>
      </Section>

      {/* About */}
      <div className="text-center py-4 space-y-1">
        <p className="text-sm font-semibold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
          JKUAT Study Hub
        </p>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          An independent student academic companion. Not an official JKUAT product.
        </p>
        <p className="text-xs" style={{ color: 'var(--fg-muted)' }}>
          Data stored locally in your browser via IndexedDB. Works offline.
        </p>
      </div>
    </div>
  );
}

// Alias for import fix
type Unit = { id?: number };
