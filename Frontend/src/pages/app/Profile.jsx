import React, { useState } from 'react';
import { api } from '../../lib/api';
import { useUser } from '../../contexts/UserContext';
import Button from '../../components/ui/Button';
import WeeklyPresets from '../../components/WeeklyPresets';

export default function Profile() {
  const { user, login } = useUser();
  const [tab, setTab] = useState('profile');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [success, setSuccess] = useState('');
  const [err, setErr] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');
    setErr('');

    if (newPassword && newPassword !== confirmPassword) {
      setErr('New passwords do not match.');
      return;
    }
    if (newPassword && newPassword.length < 6) {
      setErr('New password must be at least 6 characters.');
      return;
    }
    if (newPassword && !currentPassword) {
      setErr('Current password is required to set a new password.');
      return;
    }

    setSubmitting(true);
    try {
      const body = { first_name: firstName, last_name: lastName };
      if (newPassword) {
        body.current_password = currentPassword;
        body.new_password = newPassword;
      }
      const data = await api('/api/me', { method: 'PUT', body });
      login(data.user);
      setSuccess('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (e) {
      setErr(e.message || 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-text-primary dark:text-white">Profile</h1>
      </div>

      <div className="flex gap-6 border-b border-border-light dark:border-slate-700">
        <button
          onClick={() => setTab('profile')}
          className={`pb-2 text-sm font-medium transition-colors ${tab === 'profile' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary dark:text-gray-400 hover:text-text-primary'}`}
        >
          Profile
        </button>
        <button
          onClick={() => setTab('presets')}
          className={`pb-2 text-sm font-medium transition-colors ${tab === 'presets' ? 'border-b-2 border-primary text-primary' : 'text-text-secondary dark:text-gray-400 hover:text-text-primary'}`}
        >
          Weekly Defaults
        </button>
      </div>

      {tab === 'presets' ? <WeeklyPresets /> : null}

      {tab === 'profile' && <form onSubmit={handleSubmit} className="bg-surface/80 backdrop-blur-lg rounded-xl border border-border-light/50 p-6 space-y-5 dark:bg-slate-800/80 dark:border-slate-700">
        {success && (
          <div className="rounded-lg border border-green-700 bg-green-50 px-4 py-3 text-sm text-green-700">
            {success}
          </div>
        )}
        {err && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <h2 className="text-lg font-semibold text-text-primary dark:text-white">Display Name</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">First Name</label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              required
              className="input w-full bg-white/80 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-500 dark:text-white"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Last Name</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              required
              className="input w-full bg-white/80 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-500 dark:text-white"
            />
          </div>
        </div>

        <div className="border-t border-border-light/50 dark:border-slate-700 pt-5">
          <h2 className="text-lg font-semibold text-text-primary dark:text-white mb-4">Change Password</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input w-full bg-white/80 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-500 dark:text-white"
                placeholder="Required to change password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input w-full bg-white/80 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-500 dark:text-white"
                placeholder="Min 6 characters"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary dark:text-gray-400 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input w-full bg-white/80 border-gray-300 rounded-lg text-text-primary dark:bg-slate-700 dark:border-slate-500 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
            {submitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>}
    </div>
  );
}
