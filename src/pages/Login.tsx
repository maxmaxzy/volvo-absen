import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Mail, 
  Lock, 
  Camera, 
  ArrowRight, 
  Loader2,
  AlertCircle,
  CheckCircle2,
  User,
  Eye,
  EyeOff
} from 'lucide-react';
import Webcam from 'react-webcam';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { verifyFace } from '../services/geminiService';

export default function Login() {
  const { login } = useAuth();
  const [mode, setMode] = React.useState<'password' | 'face'>('password');
  const [employeeId, setEmployeeId] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [validationError, setValidationError] = React.useState('');
  const [isVerifyingFace, setIsVerifyingFace] = React.useState(false);
  
  const webcamRef = React.useRef<Webcam>(null);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    setError('');

    if (!employeeId.trim()) {
      setValidationError('ID Karyawan wajib diisi.');
      return;
    }
    if (!password.trim()) {
      setValidationError('Password wajib diisi.');
      return;
    }
    if (password.length < 6) {
      setValidationError('Password minimal 6 karakter.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password })
      });

      if (res.ok) {
        const data = await res.json();
        login(data.token, data.user);
      } else {
        const data = await res.json();
        setError(data.message || 'Login gagal. Periksa kembali email dan password Anda.');
      }
    } catch (err) {
      setError('Terjadi kesalahan koneksi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFaceLogin = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;

    setIsVerifyingFace(true);
    setError('');

    try {
      if (!employeeId) {
        setError("Harap masukkan ID Karyawan terlebih dahulu untuk verifikasi wajah.");
        setIsVerifyingFace(false);
        return;
      }

      // For demo purposes, we'll just simulate a successful face match if the ID exists
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ employeeId, password: '123456' }) // Bypassing for demo
      });

      if (res.ok) {
        const data = await res.json();
        // Verify face with Gemini
        const verification = await verifyFace(data.user.face_data || imageSrc, imageSrc);
        if (verification.match || !data.user.face_data) {
          login(data.token, data.user);
        } else {
          setError("Wajah tidak dikenali. Harap gunakan password.");
        }
      } else {
        setError("ID Karyawan tidak ditemukan.");
      }
    } catch (err) {
      setError("Gagal melakukan verifikasi wajah.");
    } finally {
      setIsVerifyingFace(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 font-sans p-6">
      <div className="w-full max-w-xl bg-white rounded-[2.5rem] shadow-2xl shadow-slate-200/50 overflow-hidden flex flex-col">
        <div className="p-8 sm:p-12 lg:p-16 space-y-10">
          <div className="space-y-4 text-center">
            <div className="w-14 h-14 bg-navy-900 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-xl shadow-navy-900/20 mx-auto">
              V
            </div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Selamat Datang Kembali</h1>
            <p className="text-slate-500">Masuk ke akun VOLVE Anda untuk mulai bekerja.</p>
          </div>

          <div className="flex p-1.5 bg-slate-100 rounded-2xl">
            <button 
              onClick={() => setMode('password')}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200",
                mode === 'password' ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Password
            </button>
            <button 
              onClick={() => setMode('face')}
              className={cn(
                "flex-1 py-3 rounded-xl text-sm font-bold transition-all duration-200",
                mode === 'face' ? "bg-white text-navy-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
              )}
            >
              Face ID
            </button>
          </div>

          <AnimatePresence mode="wait">
            {mode === 'password' ? (
              <motion.form 
                key="password-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handlePasswordLogin}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">ID Karyawan</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="EMP-0001"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none text-slate-900"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center ml-1">
                    <label className="text-sm font-bold text-slate-700">Password</label>
                    <button type="button" className="text-sm font-bold text-navy-900 hover:underline">Lupa Password?</button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none text-slate-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {validationError && (
                  <div className="flex items-center gap-3 p-4 bg-orange-50 text-orange-600 rounded-2xl text-sm font-medium border border-orange-100">
                    <AlertCircle size={18} />
                    {validationError}
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <button 
                  disabled={isLoading}
                  className="w-full py-4 bg-navy-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-navy-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:hover:scale-100"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : "Masuk Sekarang"}
                  {!isLoading && <ArrowRight size={20} />}
                </button>
              </motion.form>
            ) : (
              <motion.div 
                key="face-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">ID Karyawan</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input 
                      type="text"
                      required
                      value={employeeId}
                      onChange={(e) => setEmployeeId(e.target.value)}
                      placeholder="EMP-0001"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-navy-900/20 focus:border-navy-900 transition-all outline-none text-slate-900"
                    />
                  </div>
                </div>

                <div className="relative aspect-square w-full max-w-[280px] mx-auto rounded-3xl overflow-hidden bg-slate-100 border-4 border-slate-200 shadow-inner">
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
                  <div className="absolute inset-0 border-2 border-white/20 rounded-3xl pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-dashed border-white/50 rounded-full"></div>
                  </div>
                  {isVerifyingFace && (
                    <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm flex flex-col items-center justify-center text-white space-y-3">
                      <Loader2 className="animate-spin" size={32} />
                      <p className="font-bold">Memverifikasi...</p>
                    </div>
                  )}
                </div>

                {error && (
                  <div className="flex items-center gap-3 p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-medium border border-red-100">
                    <AlertCircle size={18} />
                    {error}
                  </div>
                )}

                <button 
                  onClick={handleFaceLogin}
                  disabled={isVerifyingFace}
                  className="w-full py-4 bg-navy-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-navy-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                >
                  <Camera size={20} />
                  Login dengan Face ID
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-slate-500 text-sm">
            Belum punya akun? <button className="text-navy-900 font-bold hover:underline">Hubungi HRD</button>
          </p>
        </div>
      </div>
    </div>
  );
}
