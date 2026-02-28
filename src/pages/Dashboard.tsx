import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Coffee,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Navigation,
  FileText,
  Plane,
  Briefcase,
  X,
  Send,
  Loader2,
  Users,
  CalendarDays,
  Settings,
  AlertCircle
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { DashboardStats, Attendance, AdminStats } from '../types';
import { formatTime, formatDate, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

const data = [
  { name: 'Sen', hours: 8 },
  { name: 'Sel', hours: 7.5 },
  { name: 'Rab', hours: 9 },
  { name: 'Kam', hours: 8.2 },
  { name: 'Jum', hours: 8 },
  { name: 'Sab', hours: 0 },
  { name: 'Min', hours: 0 },
];

export default function Dashboard({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { user, token } = useAuth();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [adminStats, setAdminStats] = React.useState<AdminStats | null>(null);
  const [todayAttendance, setTodayAttendance] = React.useState<Attendance | null>(null);
  const [activeModal, setActiveModal] = React.useState<string | null>(null);
  const [leaveForm, setLeaveForm] = React.useState({
    reason: '',
    startDate: '',
    endDate: '',
    estimatedReturn: '',
    proofFile: ''
  });
  const [validationError, setValidationError] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleLeaveSubmit = async () => {
    setValidationError('');
    
    if (!leaveForm.reason.trim()) {
      setValidationError('Alasan/Keterangan wajib diisi.');
      return;
    }
    if (leaveForm.reason.trim().length < 10) {
      setValidationError('Alasan/Keterangan minimal 10 karakter.');
      return;
    }

    if (activeModal === 'tracker') {
      if (!leaveForm.estimatedReturn) {
        setValidationError('Estimasi kembali wajib diisi.');
        return;
      }
    } else {
      if (!leaveForm.startDate) {
        setValidationError('Tanggal mulai wajib diisi.');
        return;
      }
      if (!leaveForm.endDate) {
        setValidationError('Tanggal selesai wajib diisi.');
        return;
      }
      if (new Date(leaveForm.endDate) < new Date(leaveForm.startDate)) {
        setValidationError('Tanggal selesai tidak boleh sebelum tanggal mulai.');
        return;
      }
    }

    if ((activeModal === 'imk' || activeModal === 'sakit') && !leaveForm.proofFile) {
      setValidationError('Harap unggah foto surat/bukti.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: activeModal,
          reason: leaveForm.reason,
          start_date: leaveForm.startDate || new Date().toISOString().split('T')[0],
          end_date: leaveForm.endDate || leaveForm.startDate || new Date().toISOString().split('T')[0],
          proof_file: leaveForm.proofFile
        })
      });

      if (res.ok) {
        alert('Permintaan Anda telah dikirim ke HRD.');
        setActiveModal(null);
        setLeaveForm({ reason: '', startDate: '', endDate: '', estimatedReturn: '', proofFile: '' });
      } else {
        alert('Gagal mengirim pengajuan.');
      }
    } catch (err) {
      console.error("Submission error", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLeaveForm(prev => ({ ...prev, proofFile: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const statsRes = await fetch('/api/dashboard-summary', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }

        const attendanceRes = await fetch('/api/attendance/today', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (attendanceRes.ok) {
          const attendanceData = await attendanceRes.json();
          setTodayAttendance(attendanceData);
        }

        if (user?.role === 'admin') {
          const adminStatsRes = await fetch('/api/admin/dashboard-summary', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (adminStatsRes.ok) {
            const adminStatsData = await adminStatsRes.json();
            setAdminStats(adminStatsData);
          }
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      }
    };
    fetchData();
  }, [token, user?.role]);

  const actionButtons = user?.role === 'admin' ? [
    { id: 'employees', label: 'Karyawan', icon: Users, color: 'bg-blue-600', onClick: () => setActiveTab('employees') },
    { id: 'admin-attendance', label: 'Data Absensi', icon: CalendarDays, color: 'bg-emerald-600', onClick: () => setActiveTab('admin-attendance') },
    { id: 'admin-leaves', label: 'Persetujuan', icon: FileText, color: 'bg-orange-500', onClick: () => setActiveTab('admin-leaves') },
    { id: 'settings', label: 'Pengaturan', icon: Settings, color: 'bg-slate-600', onClick: () => setActiveTab('settings') },
  ] : [
    { id: 'attendance', label: 'Absensi', icon: UserCheck, color: 'bg-emerald-500', onClick: () => setActiveTab('attendance') },
    { id: 'imk', label: 'IMK', icon: FileText, color: 'bg-orange-500', onClick: () => setActiveModal('imk') },
    { id: 'sakit', label: 'Sakit', icon: Briefcase, color: 'bg-red-500', onClick: () => setActiveModal('sakit') },
    { id: 'leave', label: 'Cuti', icon: Plane, color: 'bg-purple-500', onClick: () => setActiveModal('leave') },
    { id: 'history', label: 'Riwayat', icon: CalendarDays, color: 'bg-blue-500', onClick: () => setActiveTab('history') },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Selamat Datang, {user?.name}! 👋</h1>
          <p className="text-slate-500">
            {user?.role === 'admin' 
              ? 'Panel kontrol administrator untuk mengelola operasional perusahaan.' 
              : 'Berikut adalah ringkasan kehadiran Anda bulan ini.'}
          </p>
        </div>
        <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3">
          <Calendar className="text-navy-900" size={20} />
          <span className="text-sm font-medium text-slate-700">{formatDate(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
        {actionButtons.map((btn) => (
          <button
            key={btn.id}
            onClick={btn.onClick}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:scale-[1.02] transition-all group"
          >
            <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center text-white mb-3 shadow-lg transition-transform group-hover:rotate-6", btn.color)}>
              <btn.icon size={24} />
            </div>
            <span className="text-sm font-bold text-slate-700">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {user?.role === 'admin' ? (
          <>
            <StatCard 
              title="Total Karyawan" 
              value={adminStats?.totalEmployees || 0} 
              subtitle="Aktif" 
              icon={Users} 
              color="bg-blue-50 text-blue-600"
            />
            <StatCard 
              title="Hadir Hari Ini" 
              value={adminStats?.presentToday || 0} 
              subtitle="Karyawan" 
              icon={CheckCircle2} 
              color="bg-emerald-50 text-emerald-600"
            />
            <StatCard 
              title="Terlambat Hari Ini" 
              value={adminStats?.lateToday || 0} 
              subtitle="Karyawan" 
              icon={Clock} 
              color="bg-orange-50 text-orange-600"
            />
            <StatCard 
              title="Menunggu Izin" 
              value={adminStats?.pendingLeaves || 0} 
              subtitle="Pengajuan" 
              icon={FileText} 
              color="bg-purple-50 text-purple-600"
            />
          </>
        ) : (
          <>
            <StatCard 
              title="Total Kehadiran" 
              value={stats?.present || 0} 
              subtitle="Bulan ini" 
              icon={CheckCircle2} 
              color="bg-emerald-50 text-emerald-600"
              trend="+2%"
              trendUp={true}
            />
            <StatCard 
              title="Total Terlambat" 
              value={stats?.late || 0} 
              subtitle="Bulan ini" 
              icon={Clock} 
              color="bg-orange-50 text-orange-600"
              trend="-5%"
              trendUp={false}
            />
            <StatCard 
              title="Total Izin" 
              value={stats?.leaves || 0} 
              subtitle="Bulan ini" 
              icon={Coffee} 
              color="bg-blue-50 text-blue-600"
            />
            <StatCard 
              title="Jam Kerja" 
              value={`${stats?.hours?.toFixed(1) || 0}h`} 
              subtitle="Bulan ini" 
              icon={TrendingUp} 
              color="bg-purple-50 text-purple-600"
              trend="+12%"
              trendUp={true}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Role-Specific Status/Info */}
        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          {user?.role === 'admin' ? (
            <>
              <h3 className="text-lg font-bold text-slate-900 mb-6">Ringkasan Operasional</h3>
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
                      <Users size={18} />
                    </div>
                    <p className="text-sm font-bold text-blue-900">Manajemen SDM</p>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Anda memiliki {adminStats?.totalEmployees || 0} karyawan terdaftar. Pastikan semua data sudah diperbarui.
                  </p>
                </div>

                <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white">
                      <FileText size={18} />
                    </div>
                    <p className="text-sm font-bold text-orange-900">Persetujuan Pending</p>
                  </div>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    Ada {adminStats?.pendingLeaves || 0} pengajuan izin/cuti yang menunggu tinjauan Anda.
                  </p>
                  <button 
                    onClick={() => setActiveTab('admin-leaves')}
                    className="mt-3 text-xs font-bold text-orange-600 hover:underline"
                  >
                    Tinjau Sekarang &rarr;
                  </button>
                </div>

                <div className="pt-4">
                  <p className="text-sm font-bold text-slate-900 mb-3">Kapasitas Kantor</p>
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-xs font-medium text-slate-500">Tingkat Kehadiran</p>
                    <p className="text-sm font-bold text-navy-900">
                      {adminStats?.totalEmployees ? Math.round((adminStats.presentToday / adminStats.totalEmployees) * 100) : 0}%
                    </p>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-500" 
                      style={{ width: `${adminStats?.totalEmployees ? (adminStats.presentToday / adminStats.totalEmployees) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <h3 className="text-lg font-bold text-slate-900 mb-6">Status Hari Ini</h3>
              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                      <ArrowUpRight size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Jam Masuk</p>
                      <p className="text-lg font-bold text-slate-900">{formatTime(todayAttendance?.check_in || null)}</p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    todayAttendance?.status === 'late' ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"
                  )}>
                    {todayAttendance?.status || 'Belum Absen'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-navy-100 flex items-center justify-center text-navy-900">
                      <ArrowDownRight size={20} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Jam Pulang</p>
                      <p className="text-lg font-bold text-slate-900">{formatTime(todayAttendance?.check_out || null)}</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-wider">
                    {todayAttendance?.check_out ? 'Selesai' : 'Aktif'}
                  </span>
                </div>

                <div className="pt-4">
                  <div className="flex justify-between items-end mb-2">
                    <p className="text-sm font-medium text-slate-600">Progres Kerja</p>
                    <p className="text-sm font-bold text-navy-900">{(todayAttendance?.total_hours || 0) > 8 ? 100 : Math.round(((todayAttendance?.total_hours || 0) / 8) * 100)}%</p>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-navy-900 transition-all duration-500" 
                      style={{ width: `${Math.min(100, ((todayAttendance?.total_hours || 0) / 8) * 100)}%` }}
                    ></div>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 italic">* Target 8 jam per hari</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right Column: Charts or Activity */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-900">
                {user?.role === 'admin' ? 'Tren Kehadiran Perusahaan' : 'Jam Kerja Mingguan'}
              </h3>
              <select className="text-sm border-none bg-slate-50 rounded-lg px-2 py-1 focus:ring-0 text-slate-600">
                <option>Minggu Ini</option>
                <option>Minggu Lalu</option>
              </select>
            </div>
            <div className="h-[250px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#1e293b" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#1e293b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="hours" 
                    stroke="#1e293b" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorHours)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold text-slate-900 capitalize">
                  {activeModal === 'tracker' ? 'Tracker Keluar Kantor' : 
                   activeModal === 'imk' ? 'Izin Meninggalkan Kantor (IMK)' : 
                   activeModal === 'sakit' ? 'Pengajuan Izin Sakit' : 
                   activeModal === 'leave' ? 'Pengajuan Cuti' : 'Pengajuan'}
                </h3>
                <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full">
                  <X size={20} />
                </button>
              </div>
              <div className="p-8 space-y-6">
                {validationError && (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 text-orange-600 rounded-2xl text-sm font-medium border border-orange-100">
                    <AlertCircle size={18} />
                    {validationError}
                  </div>
                )}
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Alasan / Keterangan</label>
                    <textarea 
                      placeholder="Masukkan alasan Anda..."
                      value={leaveForm.reason}
                      onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none min-h-[100px]"
                    />
                  </div>
                  {activeModal === 'tracker' && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Estimasi Kembali</label>
                      <input 
                        type="time" 
                        value={leaveForm.estimatedReturn}
                        onChange={(e) => setLeaveForm({ ...leaveForm, estimatedReturn: e.target.value })}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none" 
                      />
                    </div>
                  )}
                  {(activeModal === 'leave' || activeModal === 'imk' || activeModal === 'sakit') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Dari Tanggal</label>
                        <input 
                          type="date" 
                          value={leaveForm.startDate}
                          onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-700">Sampai Tanggal</label>
                        <input 
                          type="date" 
                          value={leaveForm.endDate}
                          onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none" 
                        />
                      </div>
                    </div>
                  )}
                  {(activeModal === 'imk' || activeModal === 'sakit') && (
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700">Upload Foto Surat / Bukti</label>
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none" 
                      />
                      {leaveForm.proofFile && (
                        <div className="mt-2 w-32 h-32 rounded-lg overflow-hidden border border-slate-200">
                          <img src={leaveForm.proofFile} alt="Bukti" className="w-full h-full object-cover" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <button 
                  onClick={handleLeaveSubmit}
                  disabled={isSubmitting}
                  className="w-full py-4 bg-navy-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-navy-900/20 hover:scale-[1.02] transition-transform disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                  {isSubmitting ? "Mengirim..." : "Kirim Pengajuan"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color, trend, trendUp }: any) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-start mb-4">
        <div className={cn("p-3 rounded-xl", color)}>
          <Icon size={24} />
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg",
            trendUp ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
          )}>
            {trend}
            {trendUp ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className="flex items-baseline gap-2">
          <h4 className="text-2xl font-bold text-slate-900">{value}</h4>
          <span className="text-xs text-slate-400">{subtitle}</span>
        </div>
      </div>
    </div>
  );
}
