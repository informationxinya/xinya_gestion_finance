
import { createClient } from '@supabase/supabase-js';
import { PurchaseRecord } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase credentials in environment variables.');
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Helper to map DB rows to PurchaseRecord
export const mapDbToPurchaseRecord = (row: any): PurchaseRecord => ({
    id: row.id,
    companyName: row.company_name,
    department: row.department,
    invoiceNumber: row.invoice_number,
    invoiceDate: row.invoice_date,
    invoiceAmount: row.invoice_amount,
    tps: row.tps,
    tvq: row.tvq,
    netAmount: row.net_amount,
    checkNumber: row.check_number,
    clearFlag: row.clear_flag,
    actualPaidAmount: row.actual_paid_amount,
    checkTotalAmount: row.check_total_amount,
    checkDate: row.check_date,
    checkMailedDate: row.check_mailed_date,
    bankReconciliationDate: row.bank_reconciliation_date,
    bankReconciliationNote: row.bank_reconciliation_note,
    difference: row.difference,
    remarks: row.remarks,
});
