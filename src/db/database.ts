import Dexie, { type EntityTable } from 'dexie';
import type {
  Unit, TimetableSlot, Assessment, PDFDoc,
  AnnotationStore, Note, CalendarEvent, Setting,
} from '@/types';

class StudyHubDB extends Dexie {
  units!: EntityTable<Unit, 'id'>;
  timetable!: EntityTable<TimetableSlot, 'id'>;
  assessments!: EntityTable<Assessment, 'id'>;
  pdfs!: EntityTable<PDFDoc, 'id'>;
  annotations!: Dexie.Table<AnnotationStore, number>;
  notes!: EntityTable<Note, 'id'>;
  events!: EntityTable<CalendarEvent, 'id'>;
  settings!: Dexie.Table<Setting, string>;

  constructor() {
    super('JKUATStudyHub');
    this.version(1).stores({
      units: '++id, code, year, semester',
      timetable: '++id, unitId, day',
      assessments: '++id, unitId, type, date',
      pdfs: '++id, unitId, type, uploadedAt',
      annotations: 'documentId',
      notes: '++id, unitId, updatedAt',
      events: '++id, type, date, unitId',
      settings: 'key',
    });
  }
}

export const db = new StudyHubDB();

export async function getSetting<T>(key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  return row ? (row.value as T) : fallback;
}

export async function setSetting(key: string, value: unknown) {
  await db.settings.put({ key, value });
}
