import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import Button from './ui/Button';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const MEAL_TYPES = ['Lunch', 'Dinner'];

// Meal slots to hide: [dayIndex, mealType]
const HIDDEN_SLOTS = new Set(['4-Dinner', '6-Lunch']);
// Days to hide entirely (0=Mon, 6=Sun)
const HIDDEN_DAYS = new Set([5]); // Saturday

function PresetCell({ preset, day, mealType, onEdit, onAdd }) {
  if (!preset) {
    return (
      <div className="flex items-center justify-between px-3 py-2 rounded-lg border border-dashed border-border-light dark:border-slate-600 text-sm">
        <span className="text-text-secondary dark:text-gray-400">{mealType}: no preset</span>
        <button onClick={() => onAdd(day, mealType)} className="text-primary hover:underline text-xs font-medium">+ Add</button>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-lg border border-border-light dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 cursor-pointer hover:border-primary/50 transition-colors"
      onClick={() => onEdit(preset)}
    >
      <div className="text-sm space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="text-text-secondary dark:text-gray-400">{mealType}:</span>
          {!preset.enabled && <span className="text-xs text-gray-400">(disabled)</span>}
          {preset.attending
            ? <span className="text-green-600 dark:text-green-400 font-medium">Attending</span>
            : <span className="text-red-500 dark:text-red-400 font-medium">Not attending</span>
          }
          {preset.late_plate && <span className="text-blue-500 dark:text-blue-400">· Late plate</span>}
        </div>
      </div>
      <span className="text-xs text-text-secondary dark:text-gray-400 ml-2">Edit</span>
    </div>
  );
}

function PresetForm({ preset, defaultDay, defaultMealType, onSave, onDelete, onCancel }) {
  const [attending, setAttending] = useState(preset?.attending ?? true);
  const [latePlate, setLatePlate] = useState(preset?.late_plate ?? false);
  const [notes, setNotes] = useState(preset?.late_plate_notes ?? '');
  const [pickupTime, setPickupTime] = useState(preset?.late_plate_pickup_time?.slice(0, 5) ?? '');
  const [enabled, setEnabled] = useState(preset?.enabled ?? true);
  const [day, setDay] = useState(preset?.day_of_week ?? defaultDay ?? 0);
  const [mealType, setMealType] = useState(preset?.meal_type ?? defaultMealType ?? 'Dinner');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleSave = async () => {
    setLoading(true);
    setErr('');
    try {
      const body = { attending, late_plate: latePlate, late_plate_notes: notes, late_plate_pickup_time: pickupTime || null, enabled };
      if (preset) {
        await api(`/api/weekly-presets/${preset.id}`, { method: 'PUT', body });
      } else {
        await api('/api/weekly-presets', { method: 'POST', body: { ...body, day_of_week: day, meal_type: mealType } });
      }
      onSave();
    } catch (e) {
      setErr(e.message || 'Failed to save preset.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this preset?')) return;
    setLoading(true);
    try {
      await api(`/api/weekly-presets/${preset.id}`, { method: 'DELETE' });
      onDelete();
    } catch (e) {
      setErr(e.message || 'Failed to delete.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface/80 dark:bg-slate-800/80 border border-border-light dark:border-slate-700 rounded-xl p-5 space-y-4">
      <h3 className="font-semibold text-text-primary dark:text-white">
        {preset ? 'Edit Preset' : 'New Preset'}
      </h3>

      {err && <p className="text-red-500 text-sm">{err}</p>}

      {!preset && (
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Day</label>
            <select value={day} onChange={e => setDay(Number(e.target.value))} className="input w-full">
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Meal</label>
            <select value={mealType} onChange={e => setMealType(e.target.value)} className="input w-full">
              {MEAL_TYPES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={attending}
            onChange={e => { setAttending(e.target.checked); if (e.target.checked) setLatePlate(false); }}
            className="rounded w-4 h-4"
          />
          <span className="text-sm text-text-primary dark:text-white">Auto-mark as attending</span>
        </label>

        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={latePlate}
            onChange={e => { setLatePlate(e.target.checked); if (e.target.checked) setAttending(false); }}
            className="rounded w-4 h-4"
          />
          <span className="text-sm text-text-primary dark:text-white">Auto-request late plate</span>
        </label>

        {latePlate && (
          <div className="ml-7 space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. No onions"
                rows={2}
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary dark:text-gray-400 mb-1">Pickup time (optional)</label>
              <input type="time" value={pickupTime} onChange={e => setPickupTime(e.target.value)} className="input w-full" />
            </div>
          </div>
        )}

        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} className="rounded w-4 h-4" />
          <span className="text-sm text-text-primary dark:text-white">Enabled</span>
        </label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button onClick={handleSave} disabled={loading} className="flex-1">Save</Button>
        <Button onClick={onCancel} variant="secondary" className="flex-1">Cancel</Button>
        {preset && (
          <Button onClick={handleDelete} disabled={loading} variant="secondary" className="text-red-500 border-red-300 hover:bg-red-50">Delete</Button>
        )}
      </div>
    </div>
  );
}

export default function WeeklyPresets() {
  const [presets, setPresets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // { preset } or { day, mealType } for new
  const [applying, setApplying] = useState(false);
  const [applyMsg, setApplyMsg] = useState('');

  const load = async () => {
    try {
      setLoading(true);
      const data = await api('/api/weekly-presets');
      setPresets(Array.isArray(data) ? data : []);
    } catch (e) {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const getPreset = (day, mealType) => presets.find(p => p.day_of_week === day && p.meal_type === mealType);

  const handleApply = async () => {
    setApplying(true);
    setApplyMsg('');
    try {
      const data = await api('/api/weekly-presets/apply', { method: 'POST' });
      setApplyMsg(data.message || 'Applied.');
      setTimeout(() => setApplyMsg(''), 4000);
    } catch (e) {
      setApplyMsg(e.message || 'Failed to apply.');
    } finally {
      setApplying(false);
    }
  };

  const handleSaved = () => {
    setEditing(null);
    load();
  };

  if (loading) return <div className="text-text-secondary dark:text-gray-400 py-8 text-center">Loading presets...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-text-primary dark:text-white">Weekly Defaults</h2>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-0.5">Set default attendance and late plate preferences per meal slot.</p>
        </div>
        <div className="flex items-center gap-3">
          {applyMsg && <span className="text-sm text-green-600 dark:text-green-400">{applyMsg}</span>}
          <Button onClick={handleApply} disabled={applying} variant="secondary">
            {applying ? 'Applying...' : 'Apply to this week'}
          </Button>
        </div>
      </div>

      {editing && (
        <PresetForm
          preset={editing.preset}
          defaultDay={editing.day}
          defaultMealType={editing.mealType}
          onSave={handleSaved}
          onDelete={handleSaved}
          onCancel={() => setEditing(null)}
        />
      )}

      <div className="space-y-3">
        {DAYS.map((dayName, dayIndex) => HIDDEN_DAYS.has(dayIndex) ? null : (
          <div key={dayIndex} className="bg-surface/80 dark:bg-slate-800/80 border border-border-light dark:border-slate-700 rounded-xl p-4 space-y-2">
            <p className="font-medium text-text-primary dark:text-white text-sm mb-2">{dayName}</p>
            {MEAL_TYPES.filter(mealType => !HIDDEN_SLOTS.has(`${dayIndex}-${mealType}`)).map(mealType => (
              <PresetCell
                key={mealType}
                preset={getPreset(dayIndex, mealType)}
                day={dayIndex}
                mealType={mealType}
                onEdit={preset => setEditing({ preset })}
                onAdd={(day, mealType) => setEditing({ day, mealType })}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
