/**
 * LobiImo shared domain types.
 */
export type TransactionType = "location" | "vente";

export type Property = {
  id: string;
  title: string;
  description: string;
  type: TransactionType;
  price: number;
  commune: string;
  quartier: string;
  address?: string;
  bedrooms: number;
  bathrooms: number;
  surface: number;
  amenities: string[];
  photos: string[]; // base64 data URIs OR http URLs
  lat?: number | null;
  lng?: number | null;
  owner_id: string;
  owner_name: string;
  owner_phone?: string;
  status: "pending" | "published" | "rejected" | "archived";
  created_at: string;
};

export type Interest = {
  id: string;
  property_id: string;
  property_title: string;
  property_type: TransactionType;
  property_price: number;
  client_id: string;
  client_name: string;
  client_email: string;
  client_phone?: string;
  owner_id: string;
  owner_name: string;
  owner_phone?: string;
  message?: string;
  status: "new" | "contacted" | "connected" | "closed";
  admin_notes?: string;
  created_at: string;
};

export type Payment = {
  id: string;
  interest_id: string;
  property_id: string;
  property_title: string;
  transaction_type: TransactionType;
  base_price: number;
  commission: number;
  amount: number;
  currency: string;
  method: "manual" | "stripe";
  status: "pending" | "paid" | "cancelled";
  stripe_session_id?: string;
  stripe_url?: string;
  notes?: string;
  created_at: string;
  paid_at?: string;
};

export type AdminStats = {
  users_total: number;
  clients: number;
  owners: number;
  properties_total: number;
  properties_published: number;
  properties_pending: number;
  interests_total: number;
  interests_new: number;
  payments_paid: number;
  revenue_total: number;
};

export const COMMUNES_KINSHASA = [
  "Gombe",
  "Limete",
  "Ngaliema",
  "Lemba",
  "Kalamu",
  "Bandalungwa",
  "Kintambo",
  "Barumbu",
  "Kinshasa",
  "Kasa-Vubu",
  "Ngiri-Ngiri",
  "Selembao",
  "Bumbu",
  "Makala",
  "Mont-Ngafula",
  "Masina",
  "Kimbanseke",
  "N'Djili",
  "Matete",
  "Lingwala",
  "Ndjili",
  "Maluku",
];

export function formatUSD(n: number): string {
  if (Number.isNaN(n)) return "$0";
  return `$${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n)}`;
}
