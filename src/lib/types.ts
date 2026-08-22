// Hand-written types mirroring supabase/migrations/0001_init.sql.
// If the schema drifts, regenerate with `supabase gen types typescript`
// and replace this file — the shape (Database.public.Tables.*) is the same.

export type MemberRole = "admin" | "socio" | "contador" | "invitado";
export type ReservationPlatform =
  | "airbnb"
  | "booking"
  | "google"
  | "directo"
  | "otro";
export type ReservationStatus = "pagado" | "pendiente" | "cancelado";
export type PaymentMethod =
  | "caja"
  | "banco"
  | "transferencia"
  | "qr"
  | "tarjeta";
export type AccountType = "caja" | "banco";
export type LoanStatus = "pendiente" | "parcial" | "pagado";

export interface Organization {
  id: string;
  name: string;
  currency: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  whatsapp: string | null;
  email: string | null;
  last_seen_at: string | null;
  created_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: MemberRole;
  initial_share_percentage: number;
  created_at: string;
  profile?: Profile;
}

export interface Property {
  id: string;
  organization_id: string;
  name: string;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Environment {
  id: string;
  property_id: string;
  name: string;
  created_at: string;
}

export interface Account {
  id: string;
  organization_id: string;
  type: AccountType;
  name: string;
  bank_name: string | null;
  account_number: string | null;
  opening_balance: number;
  is_active: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  organization_id: string;
  account_id: string;
  date: string;
  amount: number;
  description: string | null;
  source_type: string | null;
  source_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Reservation {
  id: string;
  organization_id: string;
  property_id: string;
  environment_id: string | null;
  check_in: string;
  check_out: string;
  guest_name: string;
  platform: ReservationPlatform;
  gross_amount: number;
  commission_amount: number;
  net_amount: number;
  status: ReservationStatus;
  account_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  organization_id: string;
  name: string;
  icon: string | null;
  created_at: string;
}

export interface Expense {
  id: string;
  organization_id: string;
  property_id: string;
  environment_id: string | null;
  category_id: string | null;
  date: string;
  amount: number;
  description: string | null;
  paid_by: string | null;
  paid_to: string | null;
  payment_method: PaymentMethod;
  account_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Investment {
  id: string;
  organization_id: string;
  property_id: string | null;
  environment_id: string | null;
  member_id: string;
  date: string;
  amount: number;
  description: string;
  account_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Loan {
  id: string;
  organization_id: string;
  member_id: string;
  date: string;
  amount: number;
  description: string | null;
  interest_rate: number;
  status: LoanStatus;
  account_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface LoanPayment {
  id: string;
  loan_id: string;
  date: string;
  amount: number;
  notes: string | null;
  account_id: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProfitDistribution {
  id: string;
  organization_id: string;
  period_start: string;
  period_end: string;
  total_profit: number;
  method: "shares" | "custom";
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ProfitDistributionLine {
  id: string;
  distribution_id: string;
  member_id: string;
  percentage: number;
  amount: number;
}

export interface Attachment {
  id: string;
  organization_id: string;
  entity_type: string;
  entity_id: string;
  file_path: string;
  file_name: string;
  file_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  organization_id: string | null;
  table_name: string;
  record_id: string;
  action: "insert" | "update" | "delete";
  user_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  created_at: string;
}

type TableDef<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
};

export interface Database {
  public: {
    Tables: {
      organizations: TableDef<Organization>;
      profiles: TableDef<Profile>;
      organization_members: TableDef<OrganizationMember>;
      properties: TableDef<Property>;
      environments: TableDef<Environment>;
      accounts: TableDef<Account>;
      transactions: TableDef<Transaction>;
      reservations: TableDef<Reservation>;
      expense_categories: TableDef<ExpenseCategory>;
      expenses: TableDef<Expense>;
      investments: TableDef<Investment>;
      loans: TableDef<Loan>;
      loan_payments: TableDef<LoanPayment>;
      profit_distributions: TableDef<ProfitDistribution>;
      profit_distribution_lines: TableDef<ProfitDistributionLine>;
      attachments: TableDef<Attachment>;
      audit_log: TableDef<AuditLog>;
    };
  };
}
