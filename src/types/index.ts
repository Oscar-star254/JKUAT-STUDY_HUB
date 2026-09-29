export interface Unit {
  id?: number;
  code: string;
  title: string;
  lecturer: string;
  venue: string;
  creditHours: number;
  year: number;
  semester: number;
  color: string;
  retake?: boolean;
  supplementary?: boolean;
}

export interface TimetableSlot {
  id?: number;
  unitId: number;
  day: number; // 0=Mon..5=Sat
  startTime: string; // "08:00"
  endTime: string;
  type: 'lecture' | 'lab' | 'tutorial';
  venue?: string;
}

export type AssessmentType = 'cat' | 'assignment' | 'exam';

export interface Assessment {
  id?: number;
  unitId: number;
  type: AssessmentType;
  name: string;
  score: number;
  maxScore: number;
  date?: string; // ISO string
  weight?: number; // fraction of formative component (e.g. 0.5 for 50%)
}

export interface PDFDoc {
  id?: number;
  name: string;
  unitId?: number;
  type: 'notes' | 'past-paper' | 'assignment' | 'textbook';
  file: ArrayBuffer;
  size: number;
  uploadedAt: string;
  lastPage: number;
  lastZoom: number;
  tags: string[];
}

export type AnnotationType = 'rect' | 'pen' | 'text' | 'sticky';

export interface RectAnnotation {
  id: string;
  type: 'rect';
  page: number;
  x: number; y: number; w: number; h: number; // normalized 0-1
  color: string;
  opacity: number;
  style: 'fill' | 'underline' | 'strikethrough';
}

export interface PenAnnotation {
  id: string;
  type: 'pen';
  page: number;
  paths: { x: number; y: number }[][];
  color: string;
  lineWidth: number; // normalized by page width
}

export interface TextAnnotation {
  id: string;
  type: 'text';
  page: number;
  x: number; y: number;
  text: string;
  color: string;
  fontSize: number; // normalized by page height
}

export interface StickyAnnotation {
  id: string;
  type: 'sticky';
  page: number;
  x: number; y: number;
  text: string;
  color: string;
}

export type AnnotationData = RectAnnotation | PenAnnotation | TextAnnotation | StickyAnnotation;

export interface AnnotationStore {
  documentId: number;
  data: AnnotationData[];
  updatedAt: string;
}

export interface Note {
  id?: number;
  unitId: number;
  title: string;
  content: string;
  updatedAt: string;
}

export type EventType = 'cat' | 'exam' | 'assignment' | 'fees' | 'helb' | 'supplementary' | 'other';

export interface CalendarEvent {
  id?: number;
  title: string;
  type: EventType;
  date: string; // ISO
  unitId?: number;
  reminded: boolean;
  notes?: string;
}

export interface Setting {
  key: string;
  value: unknown;
}

export interface GradeBand {
  label: string;   // e.g. "A"
  min: number;     // minimum mark (%)
  gpa: number;     // GPA points
  classification?: string; // e.g. "First Class"
}

export interface AppSettings {
  darkMode: boolean;
  language: 'en' | 'sw';
  catWeight: number;      // default 0.30
  examWeight: number;     // default 0.70
  gradeBands: GradeBand[];
  notifications: boolean;
}

export const DEFAULT_GRADE_BANDS: GradeBand[] = [
  { label: 'A',  min: 70, gpa: 4.0, classification: 'First Class Honours' },
  { label: 'B+', min: 65, gpa: 3.5, classification: 'Second Class Upper' },
  { label: 'B',  min: 60, gpa: 3.0, classification: 'Second Class Upper' },
  { label: 'C+', min: 55, gpa: 2.5, classification: 'Second Class Lower' },
  { label: 'C',  min: 50, gpa: 2.0, classification: 'Second Class Lower' },
  { label: 'D+', min: 45, gpa: 1.5, classification: 'Pass' },
  { label: 'D',  min: 40, gpa: 1.0, classification: 'Pass' },
  { label: 'E',  min: 0,  gpa: 0.0, classification: 'Fail' },
];

export const DEFAULT_SETTINGS: AppSettings = {
  darkMode: false,
  language: 'en',
  catWeight: 0.30,
  examWeight: 0.70,
  gradeBands: DEFAULT_GRADE_BANDS,
  notifications: true,
};

export const UNIT_COLORS = [
  '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#6366f1',
];

export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const FULL_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const EVENT_COLORS: Record<EventType, string> = {
  cat: '#3b82f6',
  exam: '#ef4444',
  assignment: '#f59e0b',
  fees: '#10b981',
  helb: '#8b5cf6',
  supplementary: '#f97316',
  other: '#6b7280',
};
