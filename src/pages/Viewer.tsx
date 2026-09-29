import {
  useEffect, useRef, useState, useCallback, useId,
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as pdfjsLib from 'pdfjs-dist';
import { PDFDocument, rgb, degrees as pdfDegrees } from 'pdf-lib';
import { db } from '@/db/database';
import type { AnnotationData, PDFDoc } from '@/types';
import {
  ArrowLeft, ZoomIn, ZoomOut, ChevronLeft, ChevronRight,
  Pen, Highlighter, Type, StickyNote, Eraser, RotateCcw,
  Download, Sun, Moon, Sidebar, Maximize2, Search, X,
  Layout, MousePointer, Undo2, Redo2, Save,
} from 'lucide-react';

// Worker setup
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const MAX_DPR = 2;
const MIN_SCALE = 0.3;
const MAX_SCALE = 5;

type Tool = 'select' | 'highlight' | 'pen' | 'text' | 'sticky' | 'eraser';

interface PageSize { width: number; height: number; }

function genId() { return Math.random().toString(36).slice(2); }

/* ── Main component ─────────────────────────────────── */
export default function Viewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const docId = Number(id);

  /* PDF state */
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageSizes, setPageSizes] = useState<PageSize[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [docMeta, setDocMeta] = useState<PDFDoc | null>(null);

  /* UI */
  const [showThumbs, setShowThumbs] = useState(window.innerWidth > 768);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [pageInput, setPageInput] = useState('1');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  /* Annotation */
  const [tool, setTool] = useState<Tool>('select');
  const [penColor, setPenColor] = useState('#f59e0b');
  const [penSize, setPenSize] = useState(3);
  const [annotations, setAnnotations] = useState<AnnotationData[]>([]);
  const [undoStack, setUndoStack] = useState<AnnotationData[][]>([]);
  const [redoStack, setRedoStack] = useState<AnnotationData[][]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  /* Sticky note being edited */
  const [stickyEdit, setStickyEdit] = useState<{ id: string; text: string; x: number; y: number } | null>(null);

  /* Text box being placed */
  const [textEdit, setTextEdit] = useState<{ page: number; x: number; y: number } | null>(null);

  /* Refs */
  const containerRef = useRef<HTMLDivElement>(null);
  const isDrawingRef = useRef(false);
  const currentPathRef = useRef<{ x: number; y: number }[]>([]);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const renderedRef = useRef<Set<number>>(new Set());
  const renderTasksRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map());
  const thumbsRef = useRef<Map<number, boolean>>(new Map());

  /* ── Load PDF ─────────────────────── */
  useEffect(() => {
    async function load() {
      const doc = await db.pdfs.get(docId);
      if (!doc) { setError('Document not found.'); setIsLoading(false); return; }
      setDocMeta(doc);
      setCurrentPage(doc.lastPage || 1);
      setPageInput(String(doc.lastPage || 1));
      setScale(doc.lastZoom || 1.0);

      try {
        const copy = doc.file.slice(0);
        const task = pdfjsLib.getDocument({ data: copy, verbosity: 0 });
        const pdf = await task.promise;
        setPdfDoc(pdf);
        setNumPages(pdf.numPages);

        const sizes: PageSize[] = [];
        for (let i = 1; i <= pdf.numPages; i++) {
          const p = await pdf.getPage(i);
          const vp = p.getViewport({ scale: 1 });
          sizes.push({ width: vp.width, height: vp.height });
          p.cleanup();
        }
        setPageSizes(sizes);
      } catch {
        setError('Failed to load PDF. It may be corrupt or password-protected.');
      }

      const saved = await db.annotations.get(docId);
      if (saved) setAnnotations(saved.data);
      setIsLoading(false);
    }
    load();
  }, [docId]);

  /* ── Autosave ─────────────────────── */
  useEffect(() => {
    if (!isDirty) return;
    const timer = setTimeout(async () => {
      await db.annotations.put({ documentId: docId, data: annotations, updatedAt: new Date().toISOString() });
      if (docMeta) await db.pdfs.update(docId, { lastPage: currentPage, lastZoom: scale });
      setIsDirty(false);
    }, 1500);
    return () => clearTimeout(timer);
  }, [isDirty, annotations, docId, currentPage, scale, docMeta]);

  /* ── Fit page to container width ─── */
  useEffect(() => {
    if (!pageSizes.length || !containerRef.current) return;
    const w = containerRef.current.clientWidth - 64;
    const pageW = pageSizes[0].width;
    if (pageW > 0) setScale(prev => {
      const ideal = w / pageW;
      return isNaN(ideal) ? prev : Math.max(MIN_SCALE, Math.min(MAX_SCALE, ideal));
    });
  }, [pageSizes]);

  /* ── ResizeObserver for re-fit ────── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !pageSizes.length) return;
    const obs = new ResizeObserver(() => {
      renderedRef.current.clear();
      renderTasksRef.current.forEach(t => t.cancel());
      renderTasksRef.current.clear();
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [pageSizes]);

  /* ── Re-render all pages when scale changes ── */
  useEffect(() => {
    renderedRef.current.clear();
  }, [scale]);

  /* ── Page intersection observer (lazy render) ── */
  useEffect(() => {
    if (!pdfDoc || !pageSizes.length) return;
    const obs = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const pageNum = Number((entry.target as HTMLElement).dataset.page);
          if (!renderedRef.current.has(pageNum)) renderPage(pageNum);
        }
      },
      { root: containerRef.current, rootMargin: '200px' },
    );
    const pages = containerRef.current?.querySelectorAll('[data-page]');
    pages?.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, [pdfDoc, pageSizes, scale]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Scroll tracker (current page) ── */
  useEffect(() => {
    const el = containerRef.current;
    if (!el || !pageSizes.length) return;
    const handler = () => {
      let acc = 0;
      for (let i = 0; i < pageSizes.length; i++) {
        acc += pageSizes[i].height * scale + 24;
        if (el.scrollTop < acc) { setCurrentPage(i + 1); setPageInput(String(i + 1)); break; }
      }
    };
    el.addEventListener('scroll', handler, { passive: true });
    return () => el.removeEventListener('scroll', handler);
  }, [pageSizes, scale]);

  /* ── Keyboard shortcuts ── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
        if (e.key === 'z' && e.shiftKey) { e.preventDefault(); redo(); }
        if (e.key === 's') { e.preventDefault(); saveAnnotations(); }
      }
      if (e.key === 'ArrowRight' || e.key === 'PageDown') goToPage(currentPage + 1);
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') goToPage(currentPage - 1);
      if (e.key === '+' || e.key === '=') zoom(0.15);
      if (e.key === '-') zoom(-0.15);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [currentPage, undoStack, annotations]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Render page ── */
  const renderPage = useCallback(async (pageNum: number) => {
    if (!pdfDoc) return;
    renderedRef.current.add(pageNum);
    const canvas = document.getElementById(`pdf-c-${pageNum}`) as HTMLCanvasElement | null;
    const annotCanvas = document.getElementById(`ann-c-${pageNum}`) as HTMLCanvasElement | null;
    if (!canvas) return;

    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale });
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

    canvas.width = viewport.width * dpr;
    canvas.height = viewport.height * dpr;
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;

    if (annotCanvas) {
      annotCanvas.width = viewport.width * dpr;
      annotCanvas.height = viewport.height * dpr;
      annotCanvas.style.width = `${viewport.width}px`;
      annotCanvas.style.height = `${viewport.height}px`;
    }

    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const task = page.render({ canvasContext: ctx, viewport, canvas });
    renderTasksRef.current.set(pageNum, task);
    try {
      await task.promise;
    } catch { /* cancelled */ }

    if (annotCanvas) redrawAnnotations(annotCanvas, pageNum, pageSizes[pageNum - 1], scale);
    page.cleanup();
  }, [pdfDoc, scale, annotations, pageSizes]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Draw annotations on a canvas ── */
  function redrawAnnotations(canvas: HTMLCanvasElement, page: number, size: PageSize, s: number) {
    if (!size) return;
    const ctx = canvas.getContext('2d')!;
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);
    const w = size.width * s;
    const h = size.height * s;

    for (const ann of annotations) {
      if (ann.page !== page) continue;
      if (ann.type === 'rect') {
        ctx.globalAlpha = ann.opacity;
        ctx.fillStyle = ann.color;
        ctx.strokeStyle = ann.color;
        if (ann.style === 'fill') {
          ctx.fillRect(ann.x * w, ann.y * h, ann.w * w, ann.h * h);
        } else if (ann.style === 'underline') {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ann.x * w, (ann.y + ann.h) * h);
          ctx.lineTo((ann.x + ann.w) * w, (ann.y + ann.h) * h);
          ctx.stroke();
        } else {
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ann.x * w, (ann.y + ann.h / 2) * h);
          ctx.lineTo((ann.x + ann.w) * w, (ann.y + ann.h / 2) * h);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else if (ann.type === 'pen') {
        ctx.strokeStyle = ann.color;
        ctx.lineWidth = ann.lineWidth * w;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (const path of ann.paths) {
          if (path.length < 2) continue;
          ctx.beginPath();
          ctx.moveTo(path[0].x * w, path[0].y * h);
          for (let i = 1; i < path.length; i++) ctx.lineTo(path[i].x * w, path[i].y * h);
          ctx.stroke();
        }
      } else if (ann.type === 'text') {
        ctx.fillStyle = ann.color;
        ctx.font = `${ann.fontSize * h}px ${getComputedStyle(document.body).getPropertyValue('--font-body')}`;
        ctx.fillText(ann.text, ann.x * w, ann.y * h);
      } else if (ann.type === 'sticky') {
        const sx = ann.x * w, sy = ann.y * h;
        ctx.fillStyle = '#fef08a';
        ctx.strokeStyle = '#ca8a04';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(sx, sy, 120, 80, 4);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = '#78350f';
        ctx.font = `11px sans-serif`;
        wrapText(ctx, ann.text, sx + 6, sy + 16, 108, 14);
      }
    }
    ctx.restore();
  }

  function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number) {
    const words = text.split(' ');
    let line = '';
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW) {
        ctx.fillText(line, x, y);
        line = word + ' ';
        y += lineH;
      } else { line = test; }
    }
    ctx.fillText(line, x, y);
  }

  /* ── Annotation mutations ── */
  function pushAnnotation(ann: AnnotationData) {
    setUndoStack(u => [...u, annotations]);
    setRedoStack([]);
    const next = [...annotations, ann];
    setAnnotations(next);
    setIsDirty(true);
    setTimeout(() => {
      const canvas = document.getElementById(`ann-c-${ann.page}`) as HTMLCanvasElement | null;
      const size = pageSizes[ann.page - 1];
      if (canvas && size) redrawAnnotations(canvas, ann.page, size, scale);
    }, 0);
  }

  function undo() {
    setUndoStack(u => {
      if (!u.length) return u;
      const prev = u[u.length - 1];
      setRedoStack(r => [...r, annotations]);
      setAnnotations(prev);
      setIsDirty(true);
      setTimeout(() => {
        pageSizes.forEach((_, i) => {
          const canvas = document.getElementById(`ann-c-${i + 1}`) as HTMLCanvasElement | null;
          if (canvas) redrawAnnotations(canvas, i + 1, pageSizes[i], scale);
        });
      }, 0);
      return u.slice(0, -1);
    });
  }

  function redo() {
    setRedoStack(r => {
      if (!r.length) return r;
      const next = r[r.length - 1];
      setUndoStack(u => [...u, annotations]);
      setAnnotations(next);
      setIsDirty(true);
      return r.slice(0, -1);
    });
  }

  async function saveAnnotations() {
    await db.annotations.put({ documentId: docId, data: annotations, updatedAt: new Date().toISOString() });
    setIsDirty(false);
  }

  /* ── Annotation canvas events ── */
  function getPageCoords(e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement, size: PageSize) {
    const rect = canvas.getBoundingClientRect();
    let cx: number, cy: number;
    if ('touches' in e) {
      cx = e.touches[0].clientX - rect.left;
      cy = e.touches[0].clientY - rect.top;
    } else {
      cx = (e as React.MouseEvent).clientX - rect.left;
      cy = (e as React.MouseEvent).clientY - rect.top;
    }
    const w = size.width * scale;
    const h = size.height * scale;
    return { x: cx / w, y: cy / h };
  }

  function onPointerDown(e: React.MouseEvent | React.TouchEvent, pageNum: number) {
    const canvas = document.getElementById(`ann-c-${pageNum}`) as HTMLCanvasElement | null;
    const size = pageSizes[pageNum - 1];
    if (!canvas || !size) return;

    const pos = getPageCoords(e, canvas, size);

    if (tool === 'pen') {
      isDrawingRef.current = true;
      currentPathRef.current = [pos];
    } else if (tool === 'highlight' || tool === 'select') {
      isDrawingRef.current = true;
      startPosRef.current = pos;
    } else if (tool === 'sticky') {
      const existing = annotations.find(a =>
        a.type === 'sticky' && a.page === pageNum &&
        Math.abs(a.x - pos.x) < 0.15 && Math.abs(a.y - pos.y) < 0.1
      );
      if (existing) {
        setStickyEdit({ id: existing.id, text: existing.type === 'sticky' ? existing.text : '', x: pos.x, y: pos.y });
      } else {
        setStickyEdit({ id: '', text: '', x: pos.x, y: pos.y });
      }
      // Will be handled by modal blur
    } else if (tool === 'text') {
      setTextEdit({ page: pageNum, x: pos.x, y: pos.y });
    } else if (tool === 'eraser') {
      // Remove annotations near click
      const w = size.width * scale;
      const h = size.height * scale;
      const THRESH = 30 / Math.max(w, h);
      const next = annotations.filter(a => {
        if (a.page !== pageNum) return true;
        if (a.type === 'rect') return !(Math.abs(a.x + a.w / 2 - pos.x) < THRESH && Math.abs(a.y + a.h / 2 - pos.y) < THRESH);
        if (a.type === 'text' || a.type === 'sticky') return !(Math.abs(a.x - pos.x) < THRESH && Math.abs(a.y - pos.y) < THRESH);
        return true;
      });
      if (next.length !== annotations.length) {
        setUndoStack(u => [...u, annotations]);
        setAnnotations(next);
        setIsDirty(true);
        setTimeout(() => redrawAnnotations(canvas, pageNum, size, scale), 0);
      }
    }
  }

  function onPointerMove(e: React.MouseEvent | React.TouchEvent, pageNum: number) {
    if (!isDrawingRef.current) return;
    const canvas = document.getElementById(`ann-c-${pageNum}`) as HTMLCanvasElement | null;
    const size = pageSizes[pageNum - 1];
    if (!canvas || !size) return;

    const pos = getPageCoords(e, canvas, size);

    if (tool === 'pen') {
      currentPathRef.current.push(pos);
      const ctx = canvas.getContext('2d')!;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = size.width * scale;
      const h = size.height * scale;
      const path = currentPathRef.current;
      if (path.length >= 2) {
        ctx.strokeStyle = penColor;
        ctx.lineWidth = (penSize / 100) * w * dpr;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(path[path.length - 2].x * w * dpr, path[path.length - 2].y * h * dpr);
        ctx.lineTo(path[path.length - 1].x * w * dpr, path[path.length - 1].y * h * dpr);
        ctx.stroke();
      }
    } else if ((tool === 'highlight' || tool === 'select') && startPosRef.current) {
      const start = startPosRef.current;
      const ctx = canvas.getContext('2d')!;
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const w = size.width * scale;
      const h = size.height * scale;
      redrawAnnotations(canvas, pageNum, size, scale);
      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = penColor;
      ctx.fillRect(
        Math.min(start.x, pos.x) * w,
        Math.min(start.y, pos.y) * h,
        Math.abs(pos.x - start.x) * w,
        Math.abs(pos.y - start.y) * h,
      );
      ctx.restore();
    }
  }

  function onPointerUp(e: React.MouseEvent | React.TouchEvent, pageNum: number) {
    if (!isDrawingRef.current) return;
    const canvas = document.getElementById(`ann-c-${pageNum}`) as HTMLCanvasElement | null;
    const size = pageSizes[pageNum - 1];
    if (!canvas || !size) return;

    const pos = getPageCoords(e, canvas, size);

    if (tool === 'pen' && currentPathRef.current.length >= 2) {
      pushAnnotation({
        id: genId(),
        type: 'pen',
        page: pageNum,
        paths: [currentPathRef.current],
        color: penColor,
        lineWidth: penSize / 100,
      });
    } else if ((tool === 'highlight' || tool === 'select') && startPosRef.current) {
      const start = startPosRef.current;
      const w = Math.abs(pos.x - start.x);
      const h = Math.abs(pos.y - start.y);
      if (w > 0.01 && h > 0.005) {
        pushAnnotation({
          id: genId(),
          type: 'rect',
          page: pageNum,
          x: Math.min(start.x, pos.x),
          y: Math.min(start.y, pos.y),
          w, h,
          color: penColor,
          opacity: 0.35,
          style: 'fill',
        });
      } else redrawAnnotations(canvas, pageNum, size, scale);
    }

    isDrawingRef.current = false;
    currentPathRef.current = [];
    startPosRef.current = null;
  }

  /* ── Navigation ── */
  function goToPage(p: number) {
    const clamped = Math.max(1, Math.min(numPages, p));
    setCurrentPage(clamped);
    setPageInput(String(clamped));
    const el = document.getElementById(`page-${clamped}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function zoom(delta: number) {
    setScale(s => {
      const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s + delta));
      renderedRef.current.clear();
      return next;
    });
  }

  /* ── Export PDF ── */
  async function exportAnnotatedPDF() {
    if (!docMeta) return;
    setExportingPdf(true);
    try {
      const pdfDoc2 = await PDFDocument.load(docMeta.file.slice(0));
      const pages = pdfDoc2.getPages();

      for (const ann of annotations) {
        const page = pages[ann.page - 1];
        if (!page) continue;
        const { width, height } = page.getSize();

        if (ann.type === 'rect') {
          const hexToRgb = (hex: string) => {
            const r = parseInt(hex.slice(1, 3), 16) / 255;
            const g = parseInt(hex.slice(3, 5), 16) / 255;
            const b = parseInt(hex.slice(5, 7), 16) / 255;
            return rgb(r, g, b);
          };
          const c = ann.color.startsWith('#') ? hexToRgb(ann.color) : rgb(1, 0.9, 0);
          page.drawRectangle({
            x: ann.x * width,
            y: (1 - ann.y - ann.h) * height,
            width: ann.w * width,
            height: ann.h * height,
            color: c,
            opacity: ann.opacity,
          });
        } else if (ann.type === 'pen') {
          // Build SVG path string
          for (const path of ann.paths) {
            if (path.length < 2) continue;
            let d = `M ${path[0].x * width} ${(1 - path[0].y) * height}`;
            for (let i = 1; i < path.length; i++) {
              d += ` L ${path[i].x * width} ${(1 - path[i].y) * height}`;
            }
            page.drawSvgPath(d, {
              borderColor: rgb(0.96, 0.62, 0.04),
              borderWidth: ann.lineWidth * width,
              borderOpacity: 1,
            });
          }
        } else if (ann.type === 'text') {
          page.drawText(ann.text, {
            x: ann.x * width,
            y: (1 - ann.y) * height,
            size: ann.fontSize * height * 0.8,
            color: rgb(0, 0, 0),
          });
        }
      }

      const bytes = await pdfDoc2.save();
      const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${docMeta.name} (annotated).pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
    }
    setExportingPdf(false);
  }

  /* ── Render thumbnails ── */
  async function renderThumb(pageNum: number) {
    if (!pdfDoc || thumbsRef.current.get(pageNum)) return;
    thumbsRef.current.set(pageNum, true);
    const canvas = document.getElementById(`thumb-${pageNum}`) as HTMLCanvasElement | null;
    if (!canvas) return;
    const page = await pdfDoc.getPage(pageNum);
    const viewport = page.getViewport({ scale: 0.15 });
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d')!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    page.cleanup();
  }

  /* ── UI ── */
  const cursors: Record<Tool, string> = {
    select: 'default',
    highlight: 'crosshair',
    pen: 'crosshair',
    text: 'text',
    sticky: 'cell',
    eraser: 'cell',
  };

  if (error) return (
    <div className="h-dvh flex flex-col items-center justify-center gap-4 p-8 text-center" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <div className="text-5xl">⚠️</div>
      <h2 className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>Cannot Open PDF</h2>
      <p className="text-sm max-w-xs" style={{ color: 'var(--fg-muted)' }}>{error}</p>
      <button onClick={() => navigate('/library')} className="px-5 py-2.5 rounded-xl font-semibold text-sm" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>
        Back to Library
      </button>
    </div>
  );

  return (
    <div className={`flex flex-col h-dvh overflow-hidden ${dark ? 'dark' : ''}`} style={{ background: dark ? '#000' : '#1a1a2e', color: 'var(--fg)' }}>
      {/* ── Top bar ── */}
      <header
        className="flex items-center gap-2 px-3 py-2 shrink-0 border-b"
        style={{ background: dark ? '#0a0a1a' : '#0f2044', borderColor: '#ffffff15' }}
      >
        <button
          onClick={() => { saveAnnotations(); navigate('/library'); }}
          className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white truncate" style={{ fontFamily: 'var(--font-display)' }}>
            {docMeta?.name ?? 'Loading…'}
          </p>
          {isLoading && <p className="text-[11px] text-white/50">Loading PDF…</p>}
        </div>

        {/* Page nav */}
        {numPages > 0 && (
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage <= 1} className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30">
              <ChevronLeft size={16} />
            </button>
            <div className="flex items-center gap-1">
              <input
                value={pageInput}
                onChange={e => setPageInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && goToPage(Number(pageInput))}
                onBlur={() => goToPage(Number(pageInput))}
                className="w-10 text-center text-xs py-1 rounded bg-white/10 text-white border border-white/20 outline-none"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <span className="text-white/50 text-xs">/ {numPages}</span>
            </div>
            <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= numPages} className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30">
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Zoom */}
        <div className="flex items-center gap-1">
          <button onClick={() => zoom(-0.15)} className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10">
            <ZoomOut size={16} />
          </button>
          <span className="text-white/60 text-xs w-12 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
            {Math.round(scale * 100)}%
          </span>
          <button onClick={() => zoom(0.15)} className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10">
            <ZoomIn size={16} />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <button onClick={() => setShowThumbs(s => !s)} className={`p-1.5 rounded transition-all ${showThumbs ? 'bg-white/20 text-white' : 'text-white/60 hover:bg-white/10'}`} title="Thumbnails">
            <Layout size={16} />
          </button>
          <button onClick={() => setDark(d => !d)} className="p-1.5 rounded text-white/70 hover:text-white hover:bg-white/10">
            {dark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          {isDirty && (
            <button onClick={saveAnnotations} className="p-1.5 rounded text-amber-400 hover:bg-white/10" title="Save (Ctrl+S)">
              <Save size={16} />
            </button>
          )}
          <button
            onClick={exportAnnotatedPDF}
            disabled={exportingPdf}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{ background: '#f59e0b', color: '#0f2044', fontFamily: 'var(--font-display)' }}
          >
            <Download size={14} />
            {exportingPdf ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* ── Thumbnail sidebar ── */}
        {showThumbs && (
          <aside
            className="hidden md:flex flex-col overflow-y-auto shrink-0 border-r"
            style={{ width: 120, background: dark ? '#0a0a1a' : '#0c1a35', borderColor: '#ffffff10' }}
          >
            {pageSizes.map((_, i) => {
              const pageNum = i + 1;
              return (
                <button
                  key={pageNum}
                  onClick={() => goToPage(pageNum)}
                  className="flex flex-col items-center gap-1 py-2 px-2 border-b transition-all"
                  style={{
                    borderColor: '#ffffff10',
                    background: currentPage === pageNum ? '#f59e0b20' : 'transparent',
                  }}
                  onMouseEnter={() => renderThumb(pageNum)}
                >
                  <canvas
                    id={`thumb-${pageNum}`}
                    className="rounded border shadow-sm"
                    style={{
                      maxWidth: 96,
                      borderColor: currentPage === pageNum ? '#f59e0b' : '#ffffff20',
                    }}
                    onLoad={() => renderThumb(pageNum)}
                  />
                  <span
                    className="text-[10px]"
                    style={{ color: currentPage === pageNum ? '#f59e0b' : '#ffffff40', fontFamily: 'var(--font-mono)' }}
                  >
                    {pageNum}
                  </span>
                </button>
              );
            })}
          </aside>
        )}

        {/* ── PDF scroll area ── */}
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto overflow-x-auto"
          style={{ background: dark ? '#111' : '#2a2a3e' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-3">
                <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-white/60 text-sm">Loading PDF…</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-6 gap-6">
              {pageSizes.map((size, i) => {
                const pageNum = i + 1;
                const w = size.width * scale;
                const h = size.height * scale;
                return (
                  <div
                    key={pageNum}
                    id={`page-${pageNum}`}
                    data-page={pageNum}
                    className="relative shadow-2xl"
                    style={{ width: w, height: h, background: '#fff', flexShrink: 0 }}
                  >
                    <canvas
                      id={`pdf-c-${pageNum}`}
                      className="absolute inset-0"
                      style={{ width: w, height: h, display: 'block' }}
                    />
                    <canvas
                      id={`ann-c-${pageNum}`}
                      className="absolute inset-0"
                      style={{
                        width: w, height: h, display: 'block',
                        cursor: cursors[tool],
                        touchAction: tool === 'select' ? 'pan-y' : 'none',
                      }}
                      onMouseDown={e => onPointerDown(e, pageNum)}
                      onMouseMove={e => onPointerMove(e, pageNum)}
                      onMouseUp={e => onPointerUp(e, pageNum)}
                      onMouseLeave={e => onPointerUp(e, pageNum)}
                      onTouchStart={e => { e.preventDefault(); onPointerDown(e, pageNum); }}
                      onTouchMove={e => { e.preventDefault(); onPointerMove(e, pageNum); }}
                      onTouchEnd={e => { e.preventDefault(); onPointerUp(e, pageNum); }}
                    />
                    {/* Sticky note overlays */}
                    {annotations.filter(a => a.type === 'sticky' && a.page === pageNum).map(ann => {
                      const s = ann as import('@/types').StickyAnnotation;
                      return (
                        <div
                          key={s.id}
                          className="absolute text-[11px] p-1.5 rounded cursor-pointer shadow-md"
                          style={{
                            left: s.x * w, top: s.y * h,
                            width: 120, minHeight: 60,
                            background: '#fef08a', color: '#78350f', border: '1px solid #ca8a04',
                          }}
                          onClick={() => setStickyEdit({ id: s.id, text: s.text, x: s.x, y: s.y })}
                        >
                          {s.text || <span className="opacity-40">Click to edit…</span>}
                        </div>
                      );
                    })}
                    {/* Page number badge */}
                    <div
                      className="absolute bottom-2 right-2 text-[10px] px-1.5 py-0.5 rounded"
                      style={{ background: '#00000040', color: '#fff', fontFamily: 'var(--font-mono)' }}
                    >
                      {pageNum}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Annotation toolbar (right) ── */}
        <aside
          className="hidden md:flex flex-col gap-2 px-2 py-3 shrink-0 border-l"
          style={{ width: 56, background: dark ? '#0a0a1a' : '#0c1a35', borderColor: '#ffffff10' }}
        >
          <ToolBtn icon={<MousePointer size={16} />} active={tool === 'select'} label="Select" onClick={() => setTool('select')} />
          <ToolBtn icon={<Highlighter size={16} />} active={tool === 'highlight'} label="Highlight" onClick={() => setTool('highlight')} />
          <ToolBtn icon={<Pen size={16} />} active={tool === 'pen'} label="Pen" onClick={() => setTool('pen')} />
          <ToolBtn icon={<Type size={16} />} active={tool === 'text'} label="Text" onClick={() => setTool('text')} />
          <ToolBtn icon={<StickyNote size={16} />} active={tool === 'sticky'} label="Sticky" onClick={() => setTool('sticky')} />
          <ToolBtn icon={<Eraser size={16} />} active={tool === 'eraser'} label="Eraser" onClick={() => setTool('eraser')} />

          <div className="w-8 border-t mx-auto" style={{ borderColor: '#ffffff15' }} />

          {/* Color picker */}
          {['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#000000'].map(c => (
            <button
              key={c}
              onClick={() => setPenColor(c)}
              className="w-8 h-8 rounded-full mx-auto border-2 transition-all"
              style={{ background: c, borderColor: penColor === c ? '#fff' : 'transparent' }}
              title={c}
            />
          ))}
          <input
            type="color"
            value={penColor}
            onChange={e => setPenColor(e.target.value)}
            className="w-8 h-8 rounded-full mx-auto cursor-pointer border-0 bg-transparent"
            title="Custom color"
          />

          <div className="w-8 border-t mx-auto" style={{ borderColor: '#ffffff15' }} />

          <ToolBtn icon={<Undo2 size={16} />} active={false} label="Undo" onClick={undo} disabled={!undoStack.length} />
          <ToolBtn icon={<Redo2 size={16} />} active={false} label="Redo" onClick={redo} disabled={!redoStack.length} />
        </aside>
      </div>

      {/* ── Mobile annotation bar ── */}
      <div
        className="md:hidden flex items-center gap-1 px-3 py-2 border-t overflow-x-auto shrink-0"
        style={{ background: dark ? '#0a0a1a' : '#0f2044', borderColor: '#ffffff15' }}
      >
        {[
          { t: 'select' as Tool, icon: <MousePointer size={16} /> },
          { t: 'highlight' as Tool, icon: <Highlighter size={16} /> },
          { t: 'pen' as Tool, icon: <Pen size={16} /> },
          { t: 'text' as Tool, icon: <Type size={16} /> },
          { t: 'sticky' as Tool, icon: <StickyNote size={16} /> },
          { t: 'eraser' as Tool, icon: <Eraser size={16} /> },
        ].map(({ t: toolKey, icon }) => (
          <ToolBtn key={toolKey} icon={icon} active={tool === toolKey} label="" onClick={() => setTool(toolKey)} />
        ))}
        <div className="w-px h-6 mx-1" style={{ background: '#ffffff20' }} />
        {['#f59e0b', '#3b82f6', '#10b981', '#ef4444'].map(c => (
          <button key={c} onClick={() => setPenColor(c)} className="w-7 h-7 rounded-full shrink-0 border-2 transition-all" style={{ background: c, borderColor: penColor === c ? '#fff' : 'transparent' }} />
        ))}
        <div className="w-px h-6 mx-1" style={{ background: '#ffffff20' }} />
        <button onClick={undo} disabled={!undoStack.length} className="p-2 rounded text-white/60 disabled:opacity-30"><Undo2 size={16} /></button>
        <button onClick={redo} disabled={!redoStack.length} className="p-2 rounded text-white/60 disabled:opacity-30"><Redo2 size={16} /></button>
      </div>

      {/* ── Sticky note editor ── */}
      {stickyEdit !== null && (
        <StickyEditor
          initial={stickyEdit.text}
          onSave={(text) => {
            if (stickyEdit.id) {
              const next = annotations.map(a =>
                a.id === stickyEdit.id && a.type === 'sticky' ? { ...a, text } : a
              );
              setAnnotations(next);
              setIsDirty(true);
            } else {
              pushAnnotation({ id: genId(), type: 'sticky', page: currentPage, x: stickyEdit.x, y: stickyEdit.y, text, color: '#fef08a' });
            }
            setStickyEdit(null);
            setTimeout(() => {
              const c = document.getElementById(`ann-c-${currentPage}`) as HTMLCanvasElement | null;
              const s = pageSizes[currentPage - 1];
              if (c && s) redrawAnnotations(c, currentPage, s, scale);
            }, 0);
          }}
          onClose={() => setStickyEdit(null)}
        />
      )}

      {/* ── Text box placer ── */}
      {textEdit !== null && (
        <TextBoxEditor
          onSave={(text) => {
            if (text.trim()) {
              pushAnnotation({ id: genId(), type: 'text', page: textEdit.page, x: textEdit.x, y: textEdit.y, text, color: penColor, fontSize: 0.03 });
            }
            setTextEdit(null);
          }}
          onClose={() => setTextEdit(null)}
        />
      )}

      {/* Disclaimer */}
      <div className="px-3 py-1 text-center text-[10px]" style={{ background: dark ? '#060610' : '#080e1c', color: '#ffffff30' }}>
        Edits are overlaid annotations. PDF text cannot be reflowed. Export creates a new annotated copy — original is preserved.
      </div>
    </div>
  );
}

function ToolBtn({ icon, active, label, onClick, disabled }: {
  icon: React.ReactNode; active: boolean; label: string; onClick: () => void; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto transition-all disabled:opacity-30"
      style={{
        background: active ? '#f59e0b' : 'transparent',
        color: active ? '#0f2044' : '#ffffff70',
      }}
    >
      {icon}
    </button>
  );
}

function StickyEditor({ initial, onSave, onClose }: { initial: string; onSave: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState(initial);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-yellow-100 border border-yellow-400 rounded-2xl p-4 w-72 shadow-2xl">
        <p className="text-sm font-semibold text-yellow-900 mb-2" style={{ fontFamily: 'var(--font-display)' }}>Sticky Note</p>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          autoFocus
          rows={4}
          placeholder="Type your note…"
          className="w-full bg-yellow-50 border border-yellow-300 rounded-lg p-2 text-sm text-yellow-900 outline-none resize-none"
        />
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs bg-yellow-200 text-yellow-900">Cancel</button>
          <button onClick={() => onSave(text)} className="flex-1 py-2 rounded-xl text-xs bg-yellow-500 text-white font-semibold">Save</button>
        </div>
      </div>
    </div>
  );
}

function TextBoxEditor({ onSave, onClose }: { onSave: (t: string) => void; onClose: () => void }) {
  const [text, setText] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="rounded-2xl p-4 w-72 shadow-2xl" style={{ background: 'var(--bg-card)', color: 'var(--fg)' }}>
        <p className="text-sm font-semibold mb-2" style={{ fontFamily: 'var(--font-display)' }}>Add Text Box</p>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSave(text)}
          autoFocus
          placeholder="Type text…"
          className="w-full px-3 py-2 rounded-lg text-sm border outline-none"
          style={{ background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)' }}
        />
        <div className="flex gap-2 mt-3">
          <button onClick={onClose} className="flex-1 py-2 rounded-xl text-xs" style={{ background: 'var(--border)', color: 'var(--fg-muted)' }}>Cancel</button>
          <button onClick={() => onSave(text)} className="flex-1 py-2 rounded-xl text-xs font-semibold" style={{ background: 'var(--primary)', color: 'var(--primary-fg)' }}>Place</button>
        </div>
      </div>
    </div>
  );
}
