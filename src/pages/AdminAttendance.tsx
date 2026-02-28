import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar,
  MapPin,
  Clock,
  ExternalLink,
  Loader2,
  X,
  Image as ImageIcon,
  ChevronDown,
  RefreshCw
} from 'lucide-react';
import { Attendance } from '../types';
import { cn, formatDate, formatTime } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

export default function AdminAttendance() {
  const { token } = useAuth();
  const [attendance, setAttendance] = React.useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedDate, setSelectedDate] = React.useState('');
  const [selectedDivision, setSelectedDivision] = React.useState('');
  const [selectedStatus, setSelectedStatus] = React.useState('');
  const [selectedPhoto, setSelectedPhoto] = React.useState<string | null>(null);
  const [sortConfig, setSortConfig] = React.useState<{ key: keyof Attendance | 'user_name' | 'division'; direction: 'asc' | 'desc' }>({ 
    key: 'date', 
    direction: 'desc' 
  });

  // Dropdown states
  const [isDivisionOpen, setIsDivisionOpen] = React.useState(false);
  const [isStatusOpen, setIsStatusOpen] = React.useState(false);

  // Close dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as Element).closest('.dropdown-container')) {
        setIsDivisionOpen(false);
        setIsStatusOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    const fetchAttendance = async () => {
      try {
        const res = await fetch('/api/admin/attendance', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setAttendance(data);
        }
      } catch (err) {
        console.error("Failed to fetch admin attendance", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAttendance();
  }, [token]);

  const filteredData = attendance.filter(item => {
    const matchesSearch = item.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.division?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDate = selectedDate ? item.date === selectedDate : true;
    const matchesDivision = selectedDivision ? item.division === selectedDivision : true;
    const matchesStatus = selectedStatus ? item.status === selectedStatus : true;
    return matchesSearch && matchesDate && matchesDivision && matchesStatus;
  });

  const sortedData = [...filteredData].sort((a, b) => {
    const { key, direction } = sortConfig;
    let valA = a[key as keyof Attendance] || '';
    let valB = b[key as keyof Attendance] || '';

    // Special handling for user_name and division if they are not directly on Attendance type but in the data
    if (key === 'user_name') valA = a.user_name || '';
    if (key === 'user_name') valB = b.user_name || '';
    if (key === 'division') valA = a.division || '';
    if (key === 'division') valB = b.division || '';

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: keyof Attendance | 'user_name' | 'division') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const SortIcon = ({ column }: { column: string }) => {
    if (sortConfig.key !== column) return <RefreshCw size={12} className="opacity-20" />;
    return sortConfig.direction === 'asc' ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />;
  };

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
    
    const data = filteredData.map(item => [
      `EMP-${item.user_id.toString().padStart(4, '0')}`,
      item.user_name || '',
      formatDateExcel(item.date),
      item.check_in || '-',
      item.check_out || '-',
      calculateLateTime(item.check_in),
      '', // Kolom G kosong sesuai permintaan (F: telat, H: keterangan)
      item.status === 'late' ? 'Terlambat' : 
      item.status === 'present' ? 'Tepat Waktu' : 
      item.status === 'absent' ? 'Alpa' : 'Izin'
    ]);

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...data]);
    
    // Set column widths for better readability
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
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data Absensi");
    
    XLSX.writeFile(workbook, "data_export.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Kehadiran</h1>
          <p className="text-slate-500">Pantau seluruh aktivitas absensi karyawan secara real-time.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={exportToExcel}
            className="bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 font-bold shadow-sm flex items-center gap-2 hover:bg-slate-50 transition-colors"
          >
            <Download size={18} />
            Export Excel
          </button>
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

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Cari nama karyawan atau divisi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none"
          />
        </div>
        <div className="flex gap-2 dropdown-container">
          <div className="relative">
            <button
              onClick={() => {
                setIsDivisionOpen(!isDivisionOpen);
                setIsStatusOpen(false);
              }}
              className="flex items-center justify-between w-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
            >
              <span className="truncate">{selectedDivision || 'Semua Divisi'}</span>
              <ChevronDown size={16} className={cn("transition-transform", isDivisionOpen && "rotate-180")} />
            </button>
            <AnimatePresence>
              {isDivisionOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden"
                >
                  {['', 'Human Resources', 'Engineering', 'Marketing', 'Sales', 'Finance'].map((div) => (
                    <button
                      key={div}
                      onClick={() => {
                        setSelectedDivision(div);
                        setIsDivisionOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors",
                        selectedDivision === div ? "bg-navy-50 text-navy-900 font-bold" : "text-slate-600"
                      )}
                    >
                      {div || 'Semua Divisi'}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <button
              onClick={() => {
                setIsStatusOpen(!isStatusOpen);
                setIsDivisionOpen(false);
              }}
              className="flex items-center justify-between w-40 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors"
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
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-20 flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Loader2 className="animate-spin" size={40} />
            <p className="font-medium">Memuat data absensi...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('user_name')}
                  >
                    <div className="flex items-center gap-2">
                      Karyawan
                      <SortIcon column="user_name" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center gap-2">
                      Tanggal
                      <SortIcon column="date" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('check_in')}
                  >
                    <div className="flex items-center gap-2">
                      Masuk
                      <SortIcon column="check_in" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('check_out')}
                  >
                    <div className="flex items-center gap-2">
                      Pulang
                      <SortIcon column="check_out" />
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('total_hours')}
                  >
                    <div className="flex items-center gap-2">
                      Total Jam
                      <SortIcon column="total_hours" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Foto Absensi</th>
                  <th 
                    className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      <SortIcon column="status" />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Lokasi</th>
                  <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sortedData.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
                          <img 
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.user_name}`} 
                            alt={item.user_name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{item.user_name}</p>
                          <p className="text-[10px] text-slate-500 uppercase tracking-wider">{item.division}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {formatDate(item.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                        <Clock size={14} />
                        {formatTime(item.check_in)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
                        <Clock size={14} />
                        {formatTime(item.check_out)}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {item.total_hours ? `${item.total_hours}h` : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {item.photo_in ? (
                          <button 
                            onClick={() => setSelectedPhoto(item.photo_in!)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-navy-900/20 transition-all relative group"
                          >
                            <img src={item.photo_in} alt="In" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ImageIcon size={14} className="text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                            <ImageIcon size={14} />
                          </div>
                        )}
                        {item.photo_out ? (
                          <button 
                            onClick={() => setSelectedPhoto(item.photo_out!)}
                            className="w-10 h-10 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-navy-900/20 transition-all relative group"
                          >
                            <img src={item.photo_out} alt="Out" className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ImageIcon size={14} className="text-white" />
                            </div>
                          </button>
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300">
                            <ImageIcon size={14} />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        item.status === 'present' ? "bg-emerald-50 text-emerald-600" : 
                        item.status === 'late' ? "bg-orange-50 text-orange-600" : "bg-red-50 text-red-600"
                      )}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button className="flex items-center gap-1.5 text-xs text-blue-600 font-medium hover:underline">
                        <MapPin size={14} />
                        Lihat Peta
                      </button>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-slate-400 hover:text-navy-900 hover:bg-slate-100 rounded-lg transition-all">
                        <ExternalLink size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Photo Modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div
              onClick={() => setSelectedPhoto(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative max-w-2xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="absolute top-4 right-4 z-10">
                <button 
                  onClick={() => setSelectedPhoto(null)}
                  className="p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <img src={selectedPhoto} alt="Full size" className="w-full h-auto" />
              <div className="p-6 bg-white">
                <p className="text-slate-500 text-sm font-medium">Foto Verifikasi Absensi AI</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
