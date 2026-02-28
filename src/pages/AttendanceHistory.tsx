import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Filter,
  Download,
  X,
  ChevronDown
} from 'lucide-react';
import { Attendance } from '../types';
import { cn, formatDate, formatTime } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

export default function AttendanceHistory() {
  const { user, token } = useAuth();
  const [history, setHistory] = React.useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [selectedDate, setSelectedDate] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.dropdown-container')) {
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch('/api/attendance/history', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHistory(data);
        }
      } catch (err) {
        console.error("Failed to fetch history", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [token]);

  const filteredHistory = history.filter(item => {
    const matchesDate = !selectedDate || item.date === selectedDate;
    const matchesStatus = !selectedStatus || item.status === selectedStatus;
    return matchesDate && matchesStatus;
  });

  const calculateLateTime = (checkIn: string | null): string => {
    if (!checkIn) return "-";
    const [hours, minutes] = checkIn.split(':').map(Number);
    const checkInMinutes = hours * 60 + minutes;
    const standardMinutes = 9 * 60; // 09:00
    
    if (checkInMinutes <= standardMinutes) return "00:00";
    
    const diff = checkInMinutes - standardMinutes;
    const h = Math.floor(diff / 60);
    const m = diff % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const formatDateExcel = (dateStr: string): string => {
    const date = new Date(dateStr);
    const d = date.getDate().toString().padStart(2, '0');
    const m = (date.getMonth() + 1).toString().padStart(2, '0');
    const y = date.getFullYear();
    return `${d}-${m}-${y}`;
  };

  const exportToExcel = () => {
    const headers = ['ID', 'Nama', 'Tanggal', 'jam masuk', 'jam pulang', 'jam telat', '', 'Keterangan'];
    
    const data = filteredHistory.map(item => [
      `EMP-${item.user_id.toString().padStart(4, '0')}`,
      item.user_name || user?.name || '',
      formatDateExcel(item.date),
      item.check_in || '-',
      item.check_out || '-',
      calculateLateTime(item.check_in),
      '', // Kolom G kosong
      item.status === 'late' ? 'Terlambat' : 
      item.status === 'present' ? 'Tepat Waktu' : 
      item.status === 'absent' ? 'Alpa' : 'Izin'
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths
    const wscols = [
      { wch: 12 }, // ID
      { wch: 25 }, // Nama
      { wch: 15 }, // Tanggal
      { wch: 12 }, // Jam Masuk
      { wch: 12 }, // Jam Pulang
      { wch: 12 }, // Jam Telat
      { wch: 5 },  // Kosong
      { wch: 20 }  // Keterangan
    ];
    worksheet['!cols'] = wscols;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Riwayat Absensi");
    
    XLSX.writeFile(workbook, "data_export.xlsx");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Riwayat Kehadiran</h1>
          <p className="text-slate-500">Pantau catatan kehadiran Anda.</p>
        </div>
        <div className="flex gap-2 dropdown-container">
          <button 
            onClick={exportToExcel}
            className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            Export Excel
          </button>
          
          <div className="relative">
            <button
              onClick={() => setIsStatusOpen(!isStatusOpen)}
              className="flex items-center justify-between w-40 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-700 font-bold shadow-sm hover:bg-slate-50 transition-colors"
            >
              <span className="truncate">
                {selectedStatus === 'present' ? 'Hadir' : 
                 selectedStatus === 'late' ? 'Terlambat' : 
                 selectedStatus === 'absent' ? 'Absen' : 'Semua Status'}
              </span>
              <ChevronDown size={16} className={cn("transition-transform", isStatusOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isStatusOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                >
                  {[
                    { value: '', label: 'Semua Status' },
                    { value: 'present', label: 'Hadir' },
                    { value: 'late', label: 'Terlambat' },
                    { value: 'absent', label: 'Absen' }
                  ].map((status) => (
                    <button
                      key={status.value}
                      onClick={() => {
                        setSelectedStatus(status.value);
                        setIsStatusOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors",
                        selectedStatus === status.value ? "bg-navy-50 text-navy-900 font-bold" : "text-slate-600"
                      )}
                    >
                      {status.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <input 
              type="date" 
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <button className="bg-navy-900 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-navy-900/20 flex items-center gap-2 hover:scale-[1.02] transition-transform">
              <Calendar size={18} />
              {selectedDate ? formatDate(selectedDate) : 'Filter Tanggal'}
            </button>
          </div>
          {selectedDate && (
            <button 
              onClick={() => setSelectedDate('')}
              className="bg-red-50 text-red-600 px-3 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-red-100 transition-colors"
              title="Hapus Filter Tanggal"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="p-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
          <Loader2 className="animate-spin" size={40} />
          <p className="font-medium">Memuat riwayat...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center p-12 bg-white rounded-3xl border border-slate-200">
              <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-lg font-bold text-slate-900">Tidak ada riwayat</h3>
              <p className="text-slate-500">Belum ada data absensi untuk tanggal ini.</p>
            </div>
          ) : (
            filteredHistory.map((item) => (
            <div 
              key={item.id} 
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className={cn(
                    "w-14 h-14 rounded-2xl flex flex-col items-center justify-center text-white font-bold",
                    item.status === 'present' ? "bg-emerald-500" : 
                    item.status === 'late' ? "bg-orange-500" : "bg-red-500"
                  )}>
                    <span className="text-xs opacity-80 uppercase">{new Date(item.date).toLocaleDateString('id-ID', { month: 'short' })}</span>
                    <span className="text-xl leading-none">{new Date(item.date).getDate()}</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{formatDate(item.date)}</h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        item.status === 'present' ? "bg-emerald-50 text-emerald-600" : 
                        item.status === 'late' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                      )}>
                        {item.status}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <MapPin size={12} />
                        Kantor Pusat
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-1 md:justify-center gap-8 md:gap-16">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Masuk</p>
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                      <Clock size={16} className="text-emerald-500" />
                      {formatTime(item.check_in)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pulang</p>
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                      <Clock size={16} className="text-navy-900" />
                      {formatTime(item.check_out)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Jam</p>
                    <div className="flex items-center gap-2 text-slate-900 font-bold">
                      <CheckCircle2 size={16} className="text-blue-500" />
                      {item.total_hours ? `${item.total_hours}h` : '-'}
                    </div>
                  </div>
                </div>

                <button className="p-2 text-slate-300 group-hover:text-navy-900 transition-colors">
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
            ))
          )}

          {history.length === 0 && (
            <div className="p-20 bg-white rounded-2xl border border-dashed border-slate-300 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Calendar size={32} />
              </div>
              <p className="text-slate-500 font-medium">Belum ada riwayat absensi.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
