import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import AppLayout from './components/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AttendancePage from './pages/Attendance';
import Employees from './pages/Employees';

import AttendanceHistory from './pages/AttendanceHistory';
import AdminAttendance from './pages/AdminAttendance';
import AdminLeaves from './pages/AdminLeaves';
import Settings from './pages/Settings';

function AppContent() {
  const { user, isLoading } = useAuth();
  const [activeTab, setActiveTab] = React.useState('attendance');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-navy-900/20 border-t-navy-900 rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Menyiapkan VOLVE...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <AppLayout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && <Dashboard setActiveTab={setActiveTab} />}
      {activeTab === 'attendance' && <AttendancePage setActiveTab={setActiveTab} />}
      {activeTab === 'employees' && <Employees />}
      {activeTab === 'history' && <AttendanceHistory />}
      {activeTab === 'admin-attendance' && <AdminAttendance />}
      {activeTab === 'admin-leaves' && <AdminLeaves />}
      {activeTab === 'settings' && <Settings />}
    </AppLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
