export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
}

export interface UserListItem {
  id: number;
  name: string | null;
  email: string;
  provider: string | null;
  status: string | null;
  is_system_admin: boolean;
  created_at: string | null;
}

export interface UserListResponse {
  items: UserListItem[];
  total: number;
  limit: number;
  offset: number;
}
