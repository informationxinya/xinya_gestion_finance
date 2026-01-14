
export interface PurchaseRecord {
  id: string; // Unique ID
  companyName: string; // 公司名称
  department: string; // 部门
  invoiceNumber: string; // 发票号
  invoiceDate: string; // 发票日期 (YYYY-MM-DD)
  invoiceAmount: number; // 发票金额
  tps: number; // TPS
  tvq: number; // TVQ
  netAmount: number; // 税后净值
  checkNumber: string; // 付款支票号
  clearFlag: string; // 特殊标记清除
  actualPaidAmount: number; // 实际支付金额
  checkTotalAmount: number; // 付款支票总额
  checkDate: string; // 开支票日期
  checkMailedDate: string; // 支票寄出日期
  bankReconciliationDate: string; // 银行对账日期
  bankReconciliationNote: string; // 银行对账日期备注
  difference: number; // 差额
  remarks: string; // 备注

  // Computed fields (keep these for app logic)
  unpaid?: number;
  paymentDays?: number; // Days taken to pay
}

// Data needed for charts
export interface MonthlySummary {
  month: string;
  totalAmount: number;
  records: PurchaseRecord[];
  byDepartment: Record<string, number>;
  totalMonthlyAmount?: number; // Added for % calc
}

export interface WeeklySummary {
  weekRange: string;
  weekStart: string;
  weekEnd: string;
  totalAmount: number;
  byDepartment: Record<string, number>;
  byCompany?: Record<string, number>;
  totalWeeklyAmount?: number; // Added for % calc
}

export type ChartViewType =
  | 'MONTHLY_DEPT'
  | 'WEEKLY_DEPT'
  | 'WEEKLY_COMPANY'
  | 'COMPANY_DISTRIBUTION'
  | 'UNPAID_DEPT'
  | 'UNPAID_COMPANY'
  | 'CYCLE_ANALYSIS'
  | 'CYCLE_FORECAST'
  | 'PAYMENT_MONTHLY'
  | 'PAYMENT_WEEKLY'
  | 'PAYMENT_COMPANY_WEEKLY'
  | 'PAYMENT_DISTRIBUTION';

export interface CompanyBubbleData {
  companyName: string;
  weekStart: string; // X-axis
  weekRange: string;
  amount: number; // Size/Z-axis
  totalCompanyAmount: number; // For sorting Y-axis
  invoiceCount?: number; // Number of invoices in this group
}

export interface UnpaidSummary {
  totalUnpaid: number;
  byDepartment: Record<string, number>; // Dept -> Amount
  byDeptCompany: Record<string, Record<string, number>>; // Dept -> { Company -> Amount }
  processedRecords: PurchaseRecord[]; // Records with logic applied
  details: PurchaseRecord[]; // All unpaid records for drill-down
}

export interface PaymentCycleMetric {
  department: string;
  companyName: string;
  invoiceCount: number;
  totalAmount: number;
  medianDays: number;
  minDays: number;
  maxDays: number;
  avgDays: number;
}

export interface PredictedPayment extends PurchaseRecord {
  medianDays: number;
  predictedDate: string; // ISO
  isDueThisWeek: boolean;
  unpaidAmount: number;
}

export interface ForecastSummary {
  totalDueThisWeek: number;
  byDept: Record<string, number>;
  byDeptCompany: Record<string, Record<string, number>>;
  allRecords: PredictedPayment[];
}

export type Language = 'CN' | 'FR';