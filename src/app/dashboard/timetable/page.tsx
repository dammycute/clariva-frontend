'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import ConfirmDialog from '@/components/confirm-dialog';

interface Subject { id: string; name: string; year_group: string | null; }
interface Staff { id: string; full_name: string; }
interface Cls { id: string; name: string; year_group: string | null; }

interface TimeSlot {
  id?: string; day: number; period: number;
  start_time: string; end_time: string;
  subject: string | null; subject_name: string | null;
  teacher: string | null; teacher_name: string | null;
  room: string | null;
}
interface TimeTable {
  id: string; class_group: string; class_name: string;
  term: string; academic_year: string; is_published: boolean;
  start_time: string; period_duration: number; period_count: number;
  short_break_after_period: number; short_break_duration: number;
  long_break_after_period: number; long_break_duration: number;
  slots: TimeSlot[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TERMS = ['1st Term', '2nd Term', '3rd Term'];

function computePeriodTimes(
  startTime: string, duration: number, count: number,
  shortAfter: number, shortDur: number,
  longAfter: number, longDur: number,
): { start: string; end: string }[] {
  const [h, m] = startTime.split(':').map(Number);
  const results: { start: string; end: string }[] = [];
  let curMin = h * 60 + (m || 0);
  for (let i = 0; i < count; i++) {
    const hh = Math.floor(curMin / 60);
    const mm = curMin % 60;
    const startStr = `${hh.toString().padStart(2, '0')}:${mm.toString().padStart(2, '0')}`;
    curMin += duration;
    const endH = Math.floor(curMin / 60);
    const endM = curMin % 60;
    const endStr = `${endH.toString().padStart(2, '0')}:${endM.toString().padStart(2, '0')}`;
    results.push({ start: startStr, end: endStr });

    // Apply break after this period (short or long)
    const periodNum = i + 1;
    if (longAfter > 0 && longDur > 0 && periodNum === longAfter) {
      curMin += longDur;
    } else if (shortAfter > 0 && shortDur > 0 && periodNum === shortAfter) {
      curMin += shortDur;
    }
  }
  return results;
}

export default function TimetablePage() {
  const [clsList, setClsList] = useState<Cls[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [timetables, setTimetables] = useState<TimeTable[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedClass, setSelectedClass] = useState('');
  const [term, setTerm] = useState('1st Term');
  const [academicYear, setAcademicYear] = useState('2025/2026');
  const [slots, setSlots] = useState<Record<string, TimeSlot>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<{ id: string; name: string } | null>(null);
  const [editCell, setEditCell] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  // Period settings (editable)
  const [showSettings, setShowSettings] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [periodDuration, setPeriodDuration] = useState(40);
  const [periodCount, setPeriodCount] = useState(8);
  const [shortAfter, setShortAfter] = useState(0);
  const [shortDur, setShortDur] = useState(10);
  const [longAfter, setLongAfter] = useState(0);
  const [longDur, setLongDur] = useState(0);

  async function loadAll() {
    setLoading(true);
    const [clsRes, subRes, stfRes, ttRes] = await Promise.all([
      api.classes.list(),
      api.subjects.list(),
      api.staff.list(),
      api.timetables.list(),
    ]);
    setClsList(clsRes as Cls[]);
    setSubjects(subRes as Subject[]);
    setStaffList(stfRes as Staff[]);
    setTimetables(ttRes as TimeTable[]);
    setLoading(false);
  }
  useEffect(() => { loadAll(); }, []);

  const currentTT = timetables.find(tt =>
    String(tt.class_group) === selectedClass && tt.term === term && tt.academic_year === academicYear
  );

  // Sync period settings from timetable
  useEffect(() => {
    if (currentTT) {
      setStartTime(currentTT.start_time?.slice(0, 5) || '08:00');
      setPeriodDuration(currentTT.period_duration || 40);
      setPeriodCount(currentTT.period_count || 8);
      setShortAfter(currentTT.short_break_after_period || 0);
      setShortDur(currentTT.short_break_duration || 10);
      setLongAfter(currentTT.long_break_after_period || 0);
      setLongDur(currentTT.long_break_duration || 0);
    }
  }, [currentTT]);

  const periodTimes = computePeriodTimes(startTime, periodDuration, periodCount, shortAfter, shortDur, longAfter, longDur);

  // Load slots from existing timetable
  useEffect(() => {
    if (!currentTT) { setSlots({}); return; }
    const map: Record<string, TimeSlot> = {};
    for (const slot of currentTT.slots) {
      const key = `${slot.day}-${slot.period}`;
      map[key] = slot;
    }
    setSlots(map);
  }, [currentTT]);

  const slotKey = (day: number, period: number) => `${day}-${period}`;

  function setSlot(day: number, period: number, updates: Partial<TimeSlot>) {
    setSlots(prev => {
      const key = slotKey(day, period);
      const existing = prev[key];
      const pt = periodTimes[period - 1];
      return { ...prev, [key]: { ...existing || { day, period, start_time: pt?.start ? `${pt.start}:00` : '08:00:00', end_time: pt?.end ? `${pt.end}:00` : '09:00:00', subject: null, subject_name: null, teacher: null, teacher_name: null, room: null }, ...updates } };
    });
  }

  function getClashes(day: number, period: number, teacherId: string | null): string[] {
    if (!teacherId) return [];
    const clashes: string[] = [];
    for (const [key, slot] of Object.entries(slots)) {
      if (slot.teacher === teacherId && key !== slotKey(day, period)) {
        const [d, p] = key.split('-').map(Number);
        if (d === day && p === period) {
          clashes.push(`${DAYS[d]} P${p}`);
        }
      }
    }
    return clashes;
  }

  async function handleSave() {
    setMessage('');
    setSaving(true);
    try {
      const slotList = Object.values(slots).filter(s => s.subject);
      const payload: Record<string, unknown> = {
        class_group: selectedClass,
        term,
        academic_year: academicYear,
        start_time: startTime + ':00',
        period_duration: periodDuration,
        period_count: periodCount,
        short_break_after_period: shortAfter,
        short_break_duration: shortDur,
        long_break_after_period: longAfter,
        long_break_duration: longDur,
        slots: slotList.map(s => ({
          day: s.day, period: s.period,
          start_time: s.start_time, end_time: s.end_time,
          subject: s.subject, teacher: s.teacher || null, room: s.room || null,
        })),
      };

      if (currentTT) {
        await api.timetables.update(currentTT.id, payload as Partial<TimeTable>);
      } else {
        await api.timetables.create(payload as Partial<TimeTable>);
      }
      const ttRes = await api.timetables.list();
      setTimetables(ttRes as TimeTable[]);
      setMessage('Timetable saved.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    if (!currentTT) return;
    try {
      await api.timetables.patch(currentTT.id, { is_published: !currentTT.is_published } as Partial<TimeTable>);
      const ttRes = await api.timetables.list();
      setTimetables(ttRes as TimeTable[]);
    } catch { /* ignore */ }
  }

  const currentCls = clsList.find(c => String(c.id) === selectedClass);
  const ygSubjects = subjects.filter(s => s.year_group === currentCls?.year_group);

  const periods = Array.from({ length: periodCount }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-[#0D2B55]">Timetable</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Class schedule with drag-to-assign</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
          <option value="">Select class</option>
          {[...new Set(clsList.map(c => c.year_group))].sort().map(yg => (
            <optgroup key={yg} label={yg || 'Other'}>
              {clsList.filter(c => c.year_group === yg).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <select value={term} onChange={e => setTerm(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
          {TERMS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input value={academicYear} onChange={e => setAcademicYear(e.target.value)}
          className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none w-[120px]" />
        {selectedClass && (
          <>
            <button onClick={handleSave} disabled={saving}
              className="text-sm px-4 py-2 rounded-lg bg-[#1A7A4A] text-white hover:bg-[#14663D] disabled:opacity-50">
              {saving ? 'Saving...' : 'Save Timetable'}
            </button>
            <button onClick={() => setConfirmClear(true)}
              className="text-sm px-3 py-2 rounded-lg border border-[#B91C1C] text-[#B91C1C] hover:bg-[#FEE2E2]">
              Clear All Slots
            </button>
            <button onClick={() => setShowSettings(!showSettings)}
              className="text-sm px-3 py-2 rounded-lg border border-[#DDE5F0] bg-white text-[#0D2B55] hover:bg-[#F0F4FA]">
              Period Settings
            </button>
            {currentTT && (
              <button onClick={togglePublish}
                className={`text-sm px-4 py-2 rounded-lg border ${currentTT.is_published ? 'bg-[#FEF3C7] text-[#D4930A] border-[#FDE68A]' : 'bg-white text-[#64748B] border-[#DDE5F0] hover:bg-[#F0F4FA]'}`}>
                {currentTT.is_published ? 'Published' : 'Publish'}
              </button>
            )}
          </>
        )}
      </div>

      {message && (
        <div className={`px-4 py-2 rounded-lg text-xs mb-3 ${message.includes('Saved') || message.includes('published') ? 'bg-[#D1FAE5] text-[#065F46]' : 'bg-[#FEE2E2] text-[#B91C1C]'}`}>
          {message}
        </div>
      )}

      {/* Period Settings Panel */}
      {showSettings && (
        <div className="bg-white border border-[#DDE5F0] rounded-xl p-4 mb-4">
          <h3 className="text-sm font-bold text-[#0D2B55] mb-3">Period Settings</h3>
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Start Time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none" />
            </div>
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Period Duration</label>
              <input type="number" min="10" max="120" value={periodDuration} onChange={e => setPeriodDuration(parseInt(e.target.value) || 40)}
                className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none w-[100px]" />
            </div>
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Periods per Day</label>
              <input type="number" min="4" max="12" value={periodCount} onChange={e => setPeriodCount(parseInt(e.target.value) || 8)}
                className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none w-[80px]" />
            </div>
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Short Break After Period</label>
              <select value={shortAfter} onChange={e => setShortAfter(parseInt(e.target.value))}
                className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
                <option value={0}>No short break</option>
                {periods.map(p => <option key={p} value={p}>After Period {p}</option>)}
              </select>
            </div>
            {shortAfter > 0 && (
              <div>
                <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Short Break Duration</label>
                <input type="number" min="1" max="60" value={shortDur} onChange={e => setShortDur(parseInt(e.target.value) || 10)}
                  className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none w-[80px]" />
              </div>
            )}
            <div>
              <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Long Break After Period</label>
              <select value={longAfter} onChange={e => setLongAfter(parseInt(e.target.value))}
                className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none">
                <option value={0}>No long break</option>
                {periods.map(p => <option key={p} value={p}>After Period {p}</option>)}
              </select>
            </div>
            {longAfter > 0 && (
              <div>
                <label className="block text-[10px] text-[#64748B] uppercase tracking-wider mb-1">Long Break Duration</label>
                <input type="number" min="1" max="120" value={longDur} onChange={e => setLongDur(parseInt(e.target.value) || 0)}
                  className="text-sm border border-[#DDE5F0] rounded-lg px-3 py-2 bg-white text-[#0D2B55] outline-none w-[80px]" />
              </div>
            )}
          </div>
          <div className="flex gap-6 mt-3 text-[10px] text-[#64748B]">
            {shortAfter > 0 && shortDur > 0 && (
              <span>Short break: <strong className="text-[#0D2B55]">{shortDur} min</strong> (after P{shortAfter})</span>
            )}
            {longAfter > 0 && longDur > 0 && (
              <span>Long break: <strong className="text-[#1A7A4A]">{longDur} min</strong> (after P{longAfter})</span>
            )}
            <span>Close time: <strong className="text-[#0D2B55]">
              {periodTimes.length > 0 ? periodTimes[periodTimes.length - 1].end : '-'}
            </strong></span>
          </div>
        </div>
      )}

      {/* Legend / Subject Palette */}
      {selectedClass && ygSubjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {ygSubjects.map(s => {
            const isSelected = selectedSubject?.id === s.id;
            return (
              <div key={s.id}
                draggable
                onDragStart={e => e.dataTransfer.setData('subject', JSON.stringify({ id: s.id, name: s.name }))}
                onClick={() => setSelectedSubject(isSelected ? null : { id: s.id, name: s.name })}
                className={`px-2.5 py-1 text-[11px] rounded-lg border cursor-pointer select-none transition-colors ${
                  isSelected ? 'bg-[#1A7A4A] text-white border-[#1A7A4A]' : 'bg-white border-[#DDE5F0] hover:border-[#1A7A4A]'
                }`}>
                {s.name}
              </div>
            );
          })}
        </div>
      )}

      {/* Click-to-assign indicator */}
      {selectedSubject && (
        <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-[#D1FAE5] border border-[#6EE7B7] rounded-lg text-xs text-[#065F46]">
          <span>Tap any empty cell to assign: <strong>{selectedSubject.name}</strong></span>
          <button onClick={() => setSelectedSubject(null)} className="ml-auto text-[#065F46] hover:text-[#B91C1C] font-bold">&times;</button>
        </div>
      )}

      <div className="bg-white border border-[#DDE5F0] rounded-xl overflow-hidden">
        {loading ? <div className="p-8 text-center text-sm text-[#64748B]">Loading...</div>
        : !selectedClass ? (
          <div className="p-8 text-center text-sm text-[#64748B]">Select a class to build the timetable.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-[#F7F9FC] border-r border-b border-[#DDE5F0] px-2 py-2 text-[11px] font-bold text-[#64748B] uppercase w-16">Period</th>
                  {DAYS.map((day) => (
                    <th key={day} className="border-b border-r border-[#DDE5F0] px-2 py-2 text-[11px] font-bold text-[#64748B] uppercase bg-[#F7F9FC]">{day}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {periods.map(period => {
                  const pt = periodTimes[period - 1];
                  return (
                    <tr key={period}>
                      <td className="sticky left-0 bg-white border-r border-b border-[#DDE5F0] px-2 py-1 text-center font-bold text-[#64748B]">
                        <div>{period}</div>
                        <div className="text-[9px] text-[#94A3B8]">{pt ? `${pt.start}\u2013${pt.end}` : '-'}</div>
                      </td>
                      {DAYS.map((_, day) => {
                        const key = slotKey(day, period);
                        const slot = slots[key];
                        const clashes = getClashes(day, period, slot?.teacher || null);
                        const isEditCell = editCell === key;
                        return (
                          <td key={key}
                            onDragOver={e => { e.preventDefault(); }}
                            onDrop={e => {
                              e.preventDefault();
                              try {
                                const data = JSON.parse(e.dataTransfer.getData('subject'));
                                setSlot(day, period, { subject: data.id, subject_name: data.name });
                              } catch { /* ignore */ }
                            }}
                            onClick={() => {
                              if (selectedSubject && !slot?.subject) {
                                setSlot(day, period, { subject: selectedSubject.id, subject_name: selectedSubject.name });
                                setSelectedSubject(null);
                              } else if (!selectedSubject && slot?.subject) {
                                setEditCell(isEditCell ? null : key);
                              }
                            }}
                            className={`border-r border-b border-[#DDE5F0] p-1.5 min-h-[60px] align-top transition-colors ${
                              selectedSubject && !slot?.subject ? 'bg-[#F0FDF4] cursor-pointer hover:bg-[#DCFCE7]' : 'bg-white'
                            }`}>
                            {slot?.subject ? (
                              <div className="space-y-1">
                                <div className="flex items-start justify-between gap-1">
                                  <span className="font-semibold text-[#0D2B55] leading-tight">{slot.subject_name}</span>
                                  <button onClick={e => { e.stopPropagation(); const newSlots = { ...slots }; delete newSlots[key]; setSlots(newSlots); setEditCell(null); }}
                                    className="text-[#B91C1C] hover:text-[#991B1B] text-[10px] leading-none" aria-label="Remove">&times;</button>
                                </div>
                                {isEditCell ? (
                                  <div className="space-y-1">
                                    <select value={slot.teacher || ''} onChange={e => setSlot(day, period, { teacher: e.target.value || null })}
                                      onClick={e => e.stopPropagation()}
                                      className="w-full text-[10px] px-1 py-0.5 rounded border border-[#DDE5F0] bg-white outline-none">
                                      <option value="">No teacher</option>
                                      {staffList.map(st => (
                                        <option key={st.id} value={st.id}>{st.full_name}</option>
                                      ))}
                                    </select>
                                    <input value={slot.room || ''} onChange={e => setSlot(day, period, { room: e.target.value })}
                                      placeholder="Room" onClick={e => e.stopPropagation()}
                                      className="w-full text-[10px] px-1 py-0.5 rounded border border-[#DDE5F0] outline-none" />
                                    <button onClick={e => { e.stopPropagation(); setEditCell(null); }}
                                      className="text-[10px] text-[#1A7A4A] font-semibold">Done</button>
                                  </div>
                                ) : null}
                                {clashes.length > 0 && (
                                  <p className="text-[9px] text-[#B91C1C]">Clash: {clashes.join(', ')}</p>
                                )}
                              </div>
                            ) : (
                              <div className="text-[10px] text-[#CBD5E1] text-center py-2">
                                {selectedSubject ? `+ ${selectedSubject.name}` : 'Drop subject here'}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClear}
        title="Clear All Slots"
        message="This will remove all subjects from the timetable. Are you sure?"
        onConfirm={() => { setSlots({}); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
        confirmLabel="Clear"
      />
    </div>
  );
}
