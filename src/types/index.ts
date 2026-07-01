export interface Client {
  id: number;
  name: string;
}

export interface ObjectItem {
  id: number;
  client_id: number | null;
  name: string;
}

export interface Transaction {
  id: number;
  client_id: number | null;
  object_id: number | null;
  amount: number;
  transaction_type: string;
  payment_method: string;
  category: string;
  date: string;
  client_name: string | null;
  object_name: string | null;
  cash_register?: string;
  description?: string | null;
}

export interface CRMUser {
  id: number;
  username: string;
  role: string;
  is_active: number;
}

export interface TenderRole {
  id: number;
  tender_id: number;
  user_id: number;
  role_name: string;
  username: string | null;
  created_at: string;
}

export interface Tender {
  id: number;
  tender_number: string;
  title: string;
  description: string | null;
  customer_name: string | null;
  inn: string | null;
  price: number;
  currency: string;
  platform: string;
  link: string | null;
  status: string;
  publication_date: string | null;
  submission_deadline: string | null;
  assigned_user_id: number | null;
  client_id: number | null;
  object_id: number | null;
  created_at: string;
  updated_at: string;
  assigned_username?: string | null;
  client_name?: string | null;
  object_name?: string | null;
  ai_analysis?: string | null;
  roles: TenderRole[];
}

export interface TenderDocument {
  id: number;
  client_id: number;
  object_id: number | null;
  tender_id: number | null;
  name: string | null;
  is_uploaded: number;
  doc_type: string;
  file_url: string;
  created_at: string;
}
