import React from 'react';
import Webcam from 'react-webcam';
import { useAuth } from '../context/AuthContext';
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Clock,
  LogOut
} from 'lucide-react';
import { cn } from '../lib/utils';
import { verifyFace, detectFace } from '../services/geminiService';
import { motion, AnimatePresence } from 'motion/react';

export default function AttendancePage({ setActiveTab }: { setActiveTab?: (tab: string) => void }) {
  const { user, token } = useAuth();
  const [todayAttendance, setTodayAttendance] = React.useState<any>(null);
  const [isCapturing, setIsCapturing] = React.useState(false);
  const [capturedImage, setCapturedImage] = React.useState<string | null>(null);
  const [location, setLocation] = React.useState<{ lat: number; lng: number } | null>(null);
  const [isVerifying, setIsVerifying] = React.useState(false);
  const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
  const [message, setMessage] = React.useState('');
  const [isAutoScanning, setIsAutoScanning] = React.useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = React.useState(false);
  const [attendanceType, setAttendanceType] = React.useState<'check-in' | 'check-out' | null>(null);
  
  const webcamRef = React.useRef<Webcam>(null);

  React.useEffect(() => {
    fetchAttendance();
    // Get location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error("Location error", err)
      );
    }
  }, [token]);

  const fetchAttendance = async (skipAutoStart = false) => {
    try {
      const res = await fetch('/api/attendance/today', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTodayAttendance(data);
      }
    } catch (err) {
      console.error("Failed to fetch attendance", err);
    }
  };

  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isCapturing && !capturedImage && isAutoScanning && !isVerifying) {
      interval = setInterval(async () => {
        if (webcamRef.current) {
          const imageSrc = webcamRef.current.getScreenshot();
          if (imageSrc) {
            setIsVerifying(true);
            setMessage("Mendeteksi wajah...");
            setStatus('idle');
            
            try {
              const detection = await detectFace(imageSrc);
              
              if (detection.hasFace) {
                if (detection.isObstructed) {
                  setMessage("Pastikan tidak ada penghalang di wajah (masker, kacamata hitam, tangan, dll).");
                  setStatus('error');
                  setIsVerifying(false);
                  return;
                }

                setMessage("Memverifikasi identitas...");
                const verification = await verifyFace(user?.face_data || imageSrc, imageSrc);
                
                if (verification.match || !user?.face_data) {
                  setCapturedImage(imageSrc);
                  setIsCapturing(false);
                  setIsAutoScanning(false);
                  
                  const type = attendanceType || (!todayAttendance?.check_in ? 'check-in' : 'check-out');
                  await handleAttendanceSubmit(type, imageSrc);
                } else {
                  setMessage("Wajah tidak cocok dengan data karyawan.");
                  setStatus('error');
                  setIsVerifying(false);
                }
              } else {
                setMessage("Wajah tidak terdeteksi. Posisikan wajah Anda di tengah kamera.");
                setStatus('idle');
                setIsVerifying(false);
              }
            } catch (error) {
              console.error("Auto scan error:", error);
              setIsVerifying(false);
            }
          }
        }
      }, 3000); // Scan every 3 seconds
    }
    return () => clearInterval(interval);
  }, [isCapturing, capturedImage, isAutoScanning, isVerifying, user, todayAttendance]);

  const handleAttendanceSubmit = async (type: 'check-in' | 'check-out', imageToUse: string) => {
    if (!location) {
      setMessage("Harap pastikan lokasi aktif.");
      setStatus('error');
      setIsVerifying(false);
      return;
    }

    try {
      const res = await fetch(`/api/attendance/${type}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          location,
          photo: imageToUse,
          status: new Date().getHours() > 9 ? 'late' : 'present'
        })
      });

      if (res.ok) {
        setStatus('success');
        setMessage(type === 'check-in' ? "Berhasil Absen Masuk!" : "Berhasil Absen Pulang!");
        setShowSuccessPopup(true);
        
        if (type === 'check-in') {
          setTimeout(() => {
            setShowSuccessPopup(false);
            if (setActiveTab) setActiveTab('dashboard');
          }, 3000);
        } else {
          setTimeout(() => setShowSuccessPopup(false), 3000);
        }
        fetchAttendance(true);
      } else {
        const err = await res.json();
        setStatus('error');
        setMessage(err.message || "Gagal melakukan absensi.");
      }
    } catch (error) {
      setStatus('error');
      setMessage("Terjadi kesalahan jaringan.");
    } finally {
      setIsVerifying(false);
    }
  };

  const capture = React.useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setCapturedImage(imageSrc);
      setIsCapturing(false);
      setIsAutoScanning(false);
    }
  }, [webcamRef]);

  const handleManualAttendance = async (type: 'check-in' | 'check-out') => {
    if (!capturedImage || !location) {
      setMessage("Harap ambil foto dan pastikan lokasi aktif.");
      setStatus('error');
      return;
    }

    setIsVerifying(true);
    setStatus('idle');
    setMessage("Memverifikasi wajah dengan AI...");

    const verification = await verifyFace(user?.face_data || capturedImage, capturedImage);

    if (verification.match || !user?.face_data) {
      await handleAttendanceSubmit(type, capturedImage);
    } else {
      setMessage("Verifikasi wajah gagal. Silakan coba lagi.");
      setStatus('error');
      setIsVerifying(false);
    }
  };

  const startAttendance = (type: 'check-in' | 'check-out') => {
    setAttendanceType(type);
    setIsCapturing(true);
    setIsAutoScanning(true);
    setStatus('idle');
    setMessage('');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 relative">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold text-slate-900">Sistem Absensi Digital</h1>
        <p className="text-slate-500">Silakan lakukan absensi menggunakan verifikasi wajah dan lokasi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Camera Section */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xl overflow-hidden flex flex-col items-center justify-center min-h-[400px]">
          {todayAttendance?.check_in && todayAttendance?.check_out && status !== 'success' ? (
            <div className="text-center space-y-6">
              <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                <CheckCircle2 size={48} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Absensi Selesai</h3>
                <p className="text-slate-500">Terima kasih, sampai jumpa besok!</p>
              </div>
            </div>
          ) : isCapturing ? (
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-full object-cover"
                videoConstraints={{ facingMode: "user" }}
                mirrored={false}
                disablePictureInPicture={true}
                forceScreenshotSourceSize={false}
                imageSmoothing={true}
                onUserMedia={() => {}}
                onUserMediaError={() => {}}
                screenshotQuality={1}
                minScreenshotHeight={0}
                minScreenshotWidth={0}
              />
              <div className="absolute inset-0 border-[3px] border-white/30 rounded-2xl pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-dashed border-white rounded-full"></div>
              </div>
              <div className="absolute top-4 left-4 bg-navy-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                {attendanceType === 'check-in' ? 'ABSEN MASUK' : 'ABSEN PULANG'}
              </div>
              {!isAutoScanning && (
                <button 
                  onClick={capture}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white text-navy-900 px-6 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 hover:scale-105 transition-transform"
                >
                  <Camera size={20} />
                  Ambil Foto
                </button>
              )}
            </div>
          ) : capturedImage ? (
            <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-slate-100">
              <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
              <div className="absolute top-4 left-4 bg-navy-900/80 backdrop-blur-md text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2">
                {attendanceType === 'check-in' ? 'ABSEN MASUK' : 'ABSEN PULANG'}
              </div>
              {status === 'success' && (
                <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center backdrop-blur-sm">
                  <motion.div 
                    initial={{ scale: 0 }} 
                    animate={{ scale: 1 }} 
                    className="w-32 h-32 bg-emerald-500 rounded-full flex items-center justify-center text-white shadow-2xl"
                  >
                    <CheckCircle2 size={64} />
                  </motion.div>
                </div>
              )}
              {status !== 'success' && (
                <button 
                  onClick={() => { setCapturedImage(null); setIsCapturing(true); setIsAutoScanning(true); }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md text-slate-800 px-4 py-2 rounded-full text-sm font-bold shadow-lg flex items-center gap-2 hover:bg-white"
                >
                  <RefreshCw size={16} />
                  Ulangi
                </button>
              )}
            </div>
          ) : (
            <div className="text-center space-y-8 p-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-300">
                <Camera size={40} />
              </div>
              <div className="space-y-4">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Pilih Tipe Absensi</p>
                <div className="grid grid-cols-1 gap-3">
                  <button 
                    onClick={() => startAttendance('check-in')}
                    disabled={!!todayAttendance?.check_in}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 border-2",
                      todayAttendance?.check_in 
                        ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" 
                        : "bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100 hover:border-emerald-200"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", todayAttendance?.check_in ? "bg-slate-100" : "bg-emerald-500 text-white")}>
                      <Clock size={18} />
                    </div>
                    Absen Masuk
                    {todayAttendance?.check_in && <CheckCircle2 size={18} className="ml-auto mr-2" />}
                  </button>
                  <button 
                    onClick={() => startAttendance('check-out')}
                    disabled={!todayAttendance?.check_in || !!todayAttendance?.check_out}
                    className={cn(
                      "w-full py-4 rounded-2xl font-bold transition-all flex items-center justify-center gap-3 border-2",
                      (!todayAttendance?.check_in || todayAttendance?.check_out)
                        ? "bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed" 
                        : "bg-navy-50 border-navy-100 text-navy-900 hover:bg-navy-100 hover:border-navy-200"
                    )}
                  >
                    <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", (!todayAttendance?.check_in || todayAttendance?.check_out) ? "bg-slate-100" : "bg-navy-900 text-white")}>
                      <LogOut size={18} />
                    </div>
                    Absen Pulang
                    {todayAttendance?.check_out && <CheckCircle2 size={18} className="ml-auto mr-2" />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Info & Action Section */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900">Informasi Lokasi & Waktu</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <MapPin size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase">Lokasi Anda</p>
                  <p className="text-sm font-bold text-slate-700">
                    {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Mencari lokasi...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                  <Clock size={20} />
                </div>
                <div>
                  <p className="text-xs text-slate-400 font-medium uppercase">Waktu Saat Ini</p>
                  <p className="text-sm font-bold text-slate-700">
                    {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                  </p>
                </div>
              </div>
            </div>

            {status !== 'idle' && (
              <div className={cn(
                "p-4 rounded-2xl flex items-start gap-3",
                status === 'success' ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              )}>
                {status === 'success' ? <CheckCircle2 size={20} className="mt-0.5 shrink-0" /> : <AlertCircle size={20} className="mt-0.5 shrink-0" />}
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}

            {isVerifying && status === 'idle' && (
              <div className="p-4 rounded-2xl bg-blue-50 text-blue-700 flex items-center gap-3">
                <Loader2 className="animate-spin shrink-0" size={20} />
                <p className="text-sm font-medium">{message}</p>
              </div>
            )}

            <div className="pt-4 border-t border-slate-100">
              {todayAttendance?.check_in && todayAttendance?.check_out ? (
                <div className="text-center p-6 bg-slate-50 rounded-2xl">
                  <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-3" />
                  <p className="font-bold text-slate-900">Absensi Selesai</p>
                  <p className="text-sm text-slate-500">See you tomorrow!</p>
                </div>
              ) : (
                <div className="flex gap-4 mt-6">
                  <button 
                    onClick={() => {
                      setCapturedImage(null);
                      setIsCapturing(true);
                      setIsAutoScanning(true);
                      setStatus('idle');
                      setMessage('');
                    }}
                    className="flex-1 bg-white text-slate-700 py-4 rounded-xl border border-slate-200 font-bold shadow-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                  >
                    <RefreshCw size={20} />
                    Retake Foto
                  </button>
                  <button 
                    onClick={() => handleManualAttendance(attendanceType || (!todayAttendance?.check_in ? 'check-in' : 'check-out'))}
                    disabled={isVerifying || !capturedImage}
                    className="flex-1 bg-emerald-500 text-white py-4 rounded-xl font-bold shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {isVerifying ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                    {attendanceType === 'check-in' ? 'Konfirmasi Masuk' : 'Konfirmasi Pulang'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Popup */}
      <AnimatePresence>
        {showSuccessPopup && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 z-50 flex items-center gap-4 min-w-[300px]"
          >
            <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-lg">Berhasil Absen!</h3>
              <p className="text-sm text-slate-500">{user?.name} (ID: EMP-{user?.id?.toString().padStart(4, '0')})</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
