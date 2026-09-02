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

export interface EventCategory {
  id: number;
  name: string | null;
  name_en: string | null;
  name_ru: string | null;
  name_he: string | null;
}

export interface EventListItem {
  id: number;
  title: string | null;
  status: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  created_at: string | null;
  city: string | null;
  city_id: number | null;
  price: number | null;
  is_nationwide: boolean;
  series_id: number | null;
  organization_id: number | null;
  organization_name: string | null;
  categories: EventCategory[];
}

export interface EventListResponse {
  items: EventListItem[];
  total: number;
  limit: number;
  offset: number;
}
