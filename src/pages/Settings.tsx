import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Settings as SettingsIcon,
  Key,
  User,
  Building,
  Save,
  Loader2,
  AlertTriangle,
  AlertCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Settings() {
  const { user, token } = useAuth();
  const [activeTab, setActiveTab] = React.useState('profile');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  // Profile Form
  const [profileData, setProfileData] = React.useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || ''
  });

  // Password Form
  const [passwordData, setPasswordData] = React.useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Employee Password Reset Form (Admin Only)
  const [resetData, setResetData] = React.useState({
    employeeId: '',
    newPassword: ''
  });

  const [profileError, setProfileError] = React.useState('');
  const [passwordError, setPasswordError] = React.useState('');
  const [resetError, setResetError] = React.useState('');

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    
    if (!profileData.name.trim()) {
      setProfileError('Nama lengkap wajib diisi.');
      return;
    }
    if (!profileData.email.trim()) {
      setProfileError('Email wajib diisi.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(profileData.email)) {
      setProfileError('Format email tidak valid.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Implement profile update API call here
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Profil berhasil diperbarui!');
    } catch (err) {
      alert('Gagal memperbarui profil.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordData.currentPassword) {
      setPasswordError('Password saat ini wajib diisi.');
      return;
    }
    if (!passwordData.newPassword) {
      setPasswordError('Password baru wajib diisi.');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      setPasswordError('Password baru minimal 6 karakter.');
      return;
    }
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Konfirmasi password tidak cocok!');
      return;
    }

    setIsSubmitting(true);
    try {
      // Implement password update API call here
      await new Promise(resolve => setTimeout(resolve, 1000));
      alert('Password berhasil diubah!');
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      alert('Gagal mengubah password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPasswordClick = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');

    if (!resetData.employeeId) {
      setResetError('ID Karyawan wajib diisi.');
      return;
    }
    if (!resetData.newPassword) {
      setResetError('Password baru wajib diisi.');
      return;
    }
    if (resetData.newPassword.length < 6) {
      setResetError('Password baru minimal 6 karakter.');
      return;
    }

    setShowConfirmDialog(true);
  };

  const confirmResetPassword = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(resetData)
      });

      if (res.ok) {
        alert('Password karyawan berhasil direset!');
        setResetData({ employeeId: '', newPassword: '' });
      } else {
        const data = await res.json();
        alert(data.message || 'Gagal mereset password.');
      }
    } catch (err) {
      alert('Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan</h1>
        <p className="text-slate-500">Kelola profil, keamanan, dan pengaturan sistem.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Sidebar */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'profile' 
                ? 'bg-navy-900 text-white shadow-lg shadow-navy-900/20' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <User size={20} />
            Profil Saya
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
              activeTab === 'security' 
                ? 'bg-navy-900 text-white shadow-lg shadow-navy-900/20' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Key size={20} />
            Keamanan
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                activeTab === 'admin' 
                  ? 'bg-navy-900 text-white shadow-lg shadow-navy-900/20' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <SettingsIcon size={20} />
              Sistem Admin
            </button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm"
          >
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Informasi Profil</h2>
                {profileError && (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 text-orange-600 rounded-2xl text-sm font-medium border border-orange-100 max-w-md">
                    <AlertCircle size={18} />
                    {profileError}
                  </div>
                )}
                <form onSubmit={handleProfileSubmit} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Nama Lengkap</label>
                    <input 
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Email</label>
                    <input 
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">No. Telepon</label>
                    <input 
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 outline-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 px-6 py-3 bg-navy-900 text-white font-bold rounded-xl shadow-lg shadow-navy-900/20 hover:scale-[1.02] transition-transform flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Simpan Perubahan
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4">Ubah Password</h2>
                {passwordError && (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 text-orange-600 rounded-2xl text-sm font-medium border border-orange-100 max-w-md">
                    <AlertCircle size={18} />
                    {passwordError}
                  </div>
                )}
                <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Password Saat Ini</label>
                    <input 
                      type="password"
                      required
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Password Baru</label>
                    <input 
                      type="password"
                      required
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 outline-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Konfirmasi Password Baru</label>
                    <input 
                      type="password"
                      required
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 outline-none"
                    />
                  </div>
                  <button 
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-4 px-6 py-3 bg-navy-900 text-white font-bold rounded-xl shadow-lg shadow-navy-900/20 hover:scale-[1.02] transition-transform flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                    Perbarui Password
                  </button>
                </form>
              </div>
            )}

            {activeTab === 'admin' && user?.role === 'admin' && (
              <div className="space-y-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-4 mb-6">Reset Password Karyawan</h2>
                  {resetError && (
                    <div className="flex items-center gap-3 p-4 bg-orange-50 text-orange-600 rounded-2xl text-sm font-medium border border-orange-100 max-w-md mb-4">
                      <AlertCircle size={18} />
                      {resetError}
                    </div>
                  )}
                  <form onSubmit={handleResetPasswordClick} className="space-y-4 max-w-md">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">ID Karyawan (Angka)</label>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">EMP-</span>
                        <input 
                          type="number"
                          required
                          value={resetData.employeeId}
                          onChange={(e) => setResetData({...resetData, employeeId: e.target.value})}
                          placeholder="0001"
                          className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 outline-none"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Password Baru</label>
                      <input 
                        type="password"
                        required
                        value={resetData.newPassword}
                        onChange={(e) => setResetData({...resetData, newPassword: e.target.value})}
                        placeholder="••••••••"
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 outline-none"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="mt-4 px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 hover:scale-[1.02] transition-transform flex items-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Key size={20} />}
                      Reset Password
                    </button>
                  </form>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => setShowConfirmDialog(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden p-6"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Konfirmasi Reset Password</h3>
                  <p className="text-sm text-slate-500">Tindakan ini tidak dapat dibatalkan.</p>
                </div>
              </div>
              
              <p className="text-slate-700 mb-8">
                Apakah Anda yakin ingin mereset password untuk karyawan dengan ID <span className="font-bold text-slate-900">EMP-{resetData.employeeId.padStart(4, '0')}</span>?
              </p>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirmDialog(false)}
                  className="flex-1 px-4 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmResetPassword}
                  className="flex-1 px-4 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-600/20 hover:scale-[1.02] transition-transform"
                >
                  Ya, Reset Password
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
