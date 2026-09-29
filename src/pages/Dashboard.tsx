import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '@/db/database';
import { useApp } from '@/context/AppContext';
import { calcUnitScore, calcGPA, degreeClass, getGradeBand } from '@/utils/gradeUtils';
import type { Unit, CalendarEvent, Assessment } from '@/types';
import { EVENT_COLORS } from '@/types';
import { BookOpen, Calendar, Layers, Clock, TrendingUp, Award, AlertCircle, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';

function daysUntil(date: string) {
  const d = new Date(date).getTime() - Date.now();
  return Math.ceil(d / 86400000);
}

function EventBadge({ type }: { type: string }) {
  const color = EVENT_COLORS[type as keyof typeof EVENT_COLORS] ?? '#6b7280';
  return (
    <span
      className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase tracking-wide"
      style={{ background: color + '22', color }}
    >
      {type}
    </span>
  );
}

export default function Dashboard() {
  const { t, settings } = useApp();

  const units = useLiveQuery(() => db.units.toArray(), []) ?? [];
  const events = useLiveQuery(() => db.events.orderBy('date').limit(10).toArray(), []) ?? [];
  const allAssessments = useLiveQuery(() => db.assessments.toArray(), []) ?? [];
  const pdfCount = useLiveQuery(() => db.pdfs.count(), []) ?? 0;

  const upcoming = events.filter(e => {
    const d = daysUntil(e.date);
    return d >= 0 && d <= 30;
  }).slice(0, 5);

  // GPA
  const unitScores = units.map(u => {
    const asses = allAssessments.filter(a => a.unitId === u.id);
    const { total } = calcUnitScore(asses, settings);
    return { total: total ?? 0, creditHours: u.creditHours };
  }).filter(u => u.total > 0);

  const gpa = calcGPA(unitScores, settings.gradeBands);

  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
          {greeting} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--fg-muted)' }}>
          {new Date().toLocaleDateString('en-KE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={<Layers size={20} />}
          label="Units Enrolled"
          value={String(units.length)}
          color="#3b82f6"
          to="/units"
        />
        <StatCard
          icon={<BookOpen size={20} />}
          label="PDFs Stored"
          value={String(pdfCount)}
          color="#10b981"
          to="/library"
        />
        <StatCard
          icon={<TrendingUp size={20} />}
          label={t('gpa')}
          value={gpa > 0 ? gpa.toFixed(2) : '—'}
          color="#f59e0b"
          to="/grades"
          sub={gpa > 0 ? degreeClass(gpa) : undefined}
        />
        <StatCard
          icon={<Calendar size={20} />}
          label="Upcoming Events"
          value={String(upcoming.length)}
          color="#8b5cf6"
          to="/"
        />
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* Upcoming events */}
        <Section title="Upcoming Deadlines" icon={<Clock size={16} />} to="/">
          {upcoming.length === 0 ? (
            <EmptyState message="No upcoming events. Add CATs, exams, or deadlines." />
          ) : (
            <div className="space-y-2">
              {upcoming.map(event => {
                const days = daysUntil(event.date);
                return (
                  <div
                    key={event.id}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  >
                    <div
                      className="w-1 self-stretch rounded-full shrink-0"
                      style={{ background: EVENT_COLORS[event.type] ?? '#6b7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>{event.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <EventBadge type={event.type} />
                        <span className="text-xs" style={{ color: 'var(--fg-muted)' }}>
                          {new Date(event.date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>
                    <div
                      className="text-xs font-bold shrink-0 px-2 py-1 rounded-lg font-mono"
                      style={{
                        background: days <= 3 ? '#ef444420' : days <= 7 ? '#f59e0b20' : 'var(--border)',
                        color: days <= 3 ? '#ef4444' : days <= 7 ? '#f59e0b' : 'var(--fg-muted)',
                        fontFamily: 'var(--font-mono)',
                      }}
                    >
                      {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Section>

        {/* Units summary */}
        <Section title="Units Overview" icon={<Layers size={16} />} to="/units">
          {units.length === 0 ? (
            <EmptyState message="No units yet. Add your enrolled units to get started." />
          ) : (
            <div className="space-y-2">
              {units.slice(0, 5).map(unit => {
                const asses = allAssessments.filter(a => a.unitId === unit.id);
                const { total } = calcUnitScore(asses, settings);
                const band = total !== null ? getGradeBand(total, settings.gradeBands) : null;
                return (
                  <div
                    key={unit.id}
                    className="flex items-center gap-3 p-3 rounded-xl border"
                    style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: unit.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--fg)' }}>
                        {unit.code}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--fg-muted)' }}>
                        {unit.title}
                      </p>
                    </div>
                    {band && (
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-lg"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          background: band.label === 'E' ? '#ef444420' : band.gpa >= 3 ? '#10b98120' : '#f59e0b20',
                          color: band.label === 'E' ? '#ef4444' : band.gpa >= 3 ? '#10b981' : '#f59e0b',
                        }}
                      >
                        {band.label}
                      </span>
                    )}
                    {total !== null && (
                      <span className="text-xs font-mono shrink-0" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-mono)' }}>
                        {total.toFixed(0)}%
                      </span>
                    )}
                  </div>
                );
              })}
              {units.length > 5 && (
                <p className="text-xs text-center pt-1" style={{ color: 'var(--fg-muted)' }}>
                  +{units.length - 5} more units
                </p>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Quick actions */}
      <Section title="Quick Actions" icon={<Plus size={16} />}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Upload PDF', to: '/library', color: '#3b82f6', icon: '📄' },
            { label: 'Add Unit', to: '/units', color: '#10b981', icon: '📚' },
            { label: 'Enter Grades', to: '/grades', color: '#f59e0b', icon: '✏️' },
            { label: 'Add Event', to: '/timetable', color: '#8b5cf6', icon: '📅' },
          ].map(a => (
            <Link
              key={a.label}
              to={a.to}
              className="flex flex-col items-center gap-2 p-4 rounded-2xl border text-center transition-all hover:scale-[1.02] hover:shadow-md"
              style={{ borderColor: a.color + '40', background: a.color + '10' }}
            >
              <span className="text-2xl">{a.icon}</span>
              <span className="text-xs font-semibold" style={{ color: a.color, fontFamily: 'var(--font-display)' }}>
                {a.label}
              </span>
            </Link>
          ))}
        </div>
      </Section>
    </div>
  );
}

function StatCard({ icon, label, value, color, to, sub }: {
  icon: React.ReactNode; label: string; value: string; color: string; to: string; sub?: string;
}) {
  return (
    <Link
      to={to}
      className="p-4 rounded-2xl border flex flex-col gap-3 transition-all hover:shadow-md hover:scale-[1.01]"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      <div className="flex items-center justify-between">
        <div className="p-2 rounded-xl" style={{ background: color + '20', color }}>
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-bold" style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}>
          {value}
        </div>
        <div className="text-xs mt-0.5" style={{ color: 'var(--fg-muted)', fontFamily: 'var(--font-display)' }}>
          {label}
        </div>
        {sub && <div className="text-[10px] mt-0.5 truncate" style={{ color }}>{sub}</div>}
      </div>
    </Link>
  );
}

function Section({ title, icon, children, to }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; to?: string;
}) {
  const header = (
    <div className="flex items-center justify-between mb-3">
      <h2
        className="flex items-center gap-2 text-sm font-semibold"
        style={{ fontFamily: 'var(--font-display)', color: 'var(--fg)' }}
      >
        <span style={{ color: 'var(--fg-muted)' }}>{icon}</span>
        {title}
      </h2>
      {to && (
        <Link to={to} className="text-xs hover:underline" style={{ color: 'var(--accent)' }}>
          View all
        </Link>
      )}
    </div>
  );
  return (
    <div
      className="rounded-2xl border p-4"
      style={{ background: 'var(--bg-card)', borderColor: 'var(--border)' }}
    >
      {header}
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="py-8 text-center space-y-2">
      <div className="text-3xl">📭</div>
      <p className="text-sm" style={{ color: 'var(--fg-muted)' }}>{message}</p>
    </div>
  );
}
