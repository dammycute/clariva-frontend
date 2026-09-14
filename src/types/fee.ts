export interface FeeItem {
  id: string;
  school: string;
  name: string;
  amount: number;
  class_group: string | null;
  year_group: string | null;
  arm: string | null;
  term: string;
  academic_year: string;
  is_mandatory: boolean;
  created_at: string;
}

export interface FeeInvoice {
  id: string;
  school: string;
  student: string;
  fee_item: string;
  amount_due: number;
  amount_paid: number;
  status: 'unpaid' | 'partial' | 'paid';
  due_date: string | null;
  payment_method: string | null;
  payment_ref: string | null;
  paid_at: string | null;
  created_at: string;
  student_name?: string;
  items?: FeeInvoiceItem[];
}

export interface FeeInvoiceItem {
  id: string;
  invoice: string;
  fee_item: string;
  amount_due: number;
  amount_paid: number;
}

export interface BursarySummary {
  total_students: number;
  total_due: number;
  total_paid: number;
  outstanding: number;
  collection_rate: number;
  paid_invoices: number;
  pending_invoices: number;
  item_breakdown: {
    name: string;
    total_due: number;
    total_paid: number;
    outstanding: number;
  }[];
}
