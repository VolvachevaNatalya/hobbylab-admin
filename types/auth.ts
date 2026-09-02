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

export interface OrgUser {
  id: number;
  name: string | null;
  email: string;
  role: string;
}

export interface OrgListItem {
  id: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  city_id: number | null;
  status: string | null;
  verified: boolean;
  created_at: string | null;
  users: OrgUser[];
}

export interface OrgListResponse {
  items: OrgListItem[];
  total: number;
  limit: number;
  offset: number;
}
