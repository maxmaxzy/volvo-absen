import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  FileText,
  User,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LeaveRequest {
  id: number;
  user_id: number;
  user_name: string;
  type: string;
  reason: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export default function AdminLeaves() {
  const { token } = useAuth();
  const [leaves, setLeaves] = React.useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [processingId, setProcessingId] = React.useState<number | null>(null);

  const fetchLeaves = React.useCallback(async () => {
    try {
      const res = await fetch('/api/admin/leaves', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLeaves(data);
      }
    } catch (err) {
      console.error("Failed to fetch leaves", err);
    } finally {
      setIsLoading(false);
    }
  }, [token]);

  React.useEffect(() => {
    fetchLeaves();
  }, [fetchLeaves]);

  const handleAction = async (id: number, status: 'approved' | 'rejected') => {
    setProcessingId(id);
    try {
      const res = await fetch(`/api/admin/leaves/${id}/approve`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      });

      if (res.ok) {
        setLeaves(leaves.map(l => l.id === id ? { ...l, status } : l));
      } else {
        alert("Gagal memproses pengajuan.");
      }
    } catch (err) {
      console.error("Action error", err);
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-navy-900" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Persetujuan Izin & Cuti</h1>
          <p className="text-slate-500 text-sm">Kelola dan tinjau pengajuan izin dari karyawan.</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Karyawan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tipe & Alasan</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Tanggal</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <FileText size={48} className="mx-auto mb-3 opacity-20" />
                    <p>Belum ada pengajuan izin.</p>
                  </td>
                </tr>
              ) : (
                leaves.map((leave) => (
                  <tr key={leave.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                          <User size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900">{leave.user_name}</p>
                          <p className="text-xs text-slate-500">ID: #{leave.user_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold uppercase tracking-wider">
                          {leave.type}
                        </span>
                        <p className="text-sm text-slate-600 line-clamp-1">{leave.reason}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Calendar size={14} />
                        <span className="text-xs font-medium">
                          {leave.start_date} - {leave.end_date}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center w-fit gap-1",
                        leave.status === 'approved' ? "bg-emerald-100 text-emerald-600" :
                        leave.status === 'rejected' ? "bg-red-100 text-red-600" :
                        "bg-orange-100 text-orange-600"
                      )}>
                        {leave.status === 'pending' && <Clock size={12} />}
                        {leave.status === 'approved' && <CheckCircle2 size={12} />}
                        {leave.status === 'rejected' && <XCircle size={12} />}
                        {leave.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {leave.status === 'pending' ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            disabled={processingId === leave.id}
                            onClick={() => handleAction(leave.id, 'rejected')}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Tolak"
                          >
                            <XCircle size={20} />
                          </button>
                          <button
                            disabled={processingId === leave.id}
                            onClick={() => handleAction(leave.id, 'approved')}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Setujui"
                          >
                            <CheckCircle2 size={20} />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Diproses</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
