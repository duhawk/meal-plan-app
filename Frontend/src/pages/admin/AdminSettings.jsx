import React, { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import Button from '../../components/ui/Button';
import { RefreshCw, Copy, Eye, EyeOff } from 'lucide-react';

export default function AdminSettings() {
  const [accessCode, setAccessCode] = useState('');
  const [chapterName, setChapterName] = useState('');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState('');
  const [showCode, setShowCode] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const data = await api('/api/admin/settings');
      setAccessCode(data.access_code || '');
      setChapterName(data.chapter_name || '');
    } catch (e) {
      setErr(e.message || 'Failed to load settings.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSettings(); }, []);

  const handleRegenerate = async () => {
    if (!window.confirm('Regenerate the access code? The old code will stop working immediately.')) return;
    setRegenerating(true);
    setErr('');
    setSuccess('');
    try {
      const data = await api('/api/admin/settings/access-code', { method: 'PUT' });
      setAccessCode(data.access_code);
      setShowCode(true);
      setSuccess('Access code regenerated successfully.');
    } catch (e) {
      setErr(e.message || 'Failed to regenerate code.');
    } finally {
      setRegenerating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(accessCode);
    setSuccess('Copied to clipboard!');
    setTimeout(() => setSuccess(''), 2000);
  };

  if (loading) return <div className="text-center text-text-secondary dark:text-gray-400 py-8">Loading settings...</div>;

  return (
    <div className="space-y-8">
      <div className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-6 dark:bg-slate-800/80 dark:border-slate-700">
        <h2 className="text-xl font-semibold text-text-primary dark:text-white mb-1">
          {chapterName ? `${chapterName} — Access Code` : 'Access Code'}
        </h2>
        <p className="text-sm text-text-secondary dark:text-gray-400 mb-5">
          New members must enter this code when registering. Regenerating it immediately invalidates the old code.
        </p>

        {success && (
          <div className="rounded-lg border border-green-700 bg-green-50 px-4 py-3 text-sm text-green-700 mb-4">
            {success}
          </div>
        )}
        {err && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700 mb-4">
            {err}
          </div>
        )}

        {accessCode ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 font-mono text-lg tracking-widest bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-lg px-4 py-3 text-text-primary dark:text-white">
              {showCode ? accessCode : '••••••'}
            </div>
            <Button variant="secondary" onClick={() => setShowCode(v => !v)} className="py-3">
              {showCode ? <EyeOff size={16} /> : <Eye size={16} />}
            </Button>
            <Button variant="secondary" onClick={handleCopy} className="py-3">
              <Copy size={16} />
            </Button>
          </div>
        ) : (
          <p className="text-text-secondary dark:text-gray-400 text-sm">No access code set. Registration is currently open to anyone.</p>
        )}

        <div className="mt-4">
          <Button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="flex items-center gap-2"
          >
            <RefreshCw size={15} className={regenerating ? 'animate-spin' : ''} />
            {regenerating ? 'Regenerating...' : 'Regenerate Code'}
          </Button>
        </div>
      </div>
    </div>
  );
}
