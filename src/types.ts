export type UserRole = 'admin' | 'hr' | 'staff';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  job_title?: string;
  division?: string;
  phone?: string;
  join_date?: string;
  status: 'active' | 'inactive';
  face_data?: string;
  profile_image?: string;
}

export interface Attendance {
  id: number;
  user_id: number;
  user_name?: string;
  division?: string;
  date: string;
  check_in: string | null;
  check_out: string | null;
  status: 'present' | 'late' | 'absent' | 'leave';
  location_in?: string;
  location_out?: string;
  photo_in?: string;
  photo_out?: string;
  total_hours: number | null;
}

export interface Leave {
  id: number;
  user_id: number;
  type: 'sick' | 'vacation' | 'other';
  reason: string;
  proof_file?: string;
  start_date: string;
  end_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: number;
  created_at: string;
}

export interface DashboardStats {
  present: number;
  late: number;
  hours: number;
  leaves: number;
}

export interface AdminStats {
  totalEmployees: number;
  presentToday: number;
  lateToday: number;
  pendingLeaves: number;
}

export interface Notification {
  id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}
