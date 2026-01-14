
import { PurchaseRecord, MonthlySummary, WeeklySummary, CompanyBubbleData, UnpaidSummary, PaymentCycleMetric, PredictedPayment, ForecastSummary } from '../types';
import { format, endOfWeek, addDays, differenceInDays } from 'date-fns';

// Helper: Replace missing parseISO
// Helper: Parse YYYY-MM-DD as Local Time to avoid timezone shifts
const parseISO = (dateString: string) => {
  if (!dateString) return new Date();
  const [y, m, d] = dateString.split('T')[0].split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Helper: Replace missing startOfWeek
const startOfWeek = (date: Date, options?: { weekStartsOn: number }) => {
  const weekStartsOn = options?.weekStartsOn || 0;
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  clone.setDate(clone.getDate() - diff);
  clone.setHours(0, 0, 0, 0);
  return clone;
};

// ------------------------------------------------------------------
// Port of data_loader.py Logic
// ------------------------------------------------------------------

export const cleanData = (data: PurchaseRecord[]): PurchaseRecord[] => {
  return data.map(record => {
    const cleaned = { ...record };

    // Logic: If '特殊标记清除' == "1", clear specific fields (mapped to null/undefined)
    if (cleaned.clearFlag === "1") {
      cleaned.checkNumber = undefined;
      cleaned.actualPaidAmount = undefined;
      cleaned.checkTotalAmount = undefined;
      cleaned.checkDate = undefined;
    }

    return cleaned;
  }).filter(r => {
    // Dropna subset=['发票金额', '发票日期']
    return r.invoiceAmount !== undefined && r.invoiceAmount !== null && r.invoiceDate;
  });
};

export const getOrderedDepartments = (
  data: PurchaseRecord[],
  priorityOrder: string[] = ["杂货", "菜部", "冻部", "肉部", "鱼部", "厨房", "牛奶生鲜", "酒水", "面包"],
  defaultName: string = "杂货"
): { departments: string[], defaultIndex: number } => {
  const uniqueDepts = Array.from(new Set(data.map(r => r.department))).filter(Boolean).sort();

  const orderedPreferred = priorityOrder.filter(d => uniqueDepts.includes(d));
  const remaining = uniqueDepts.filter(d => !orderedPreferred.includes(d));

  const departments = [...orderedPreferred, ...remaining];
  const defaultIndex = departments.indexOf(defaultName);

  return { departments, defaultIndex: defaultIndex !== -1 ? defaultIndex : 0 };
};

// ------------------------------------------------------------------
// Core Logic: Preprocess Data (Applies to both Unpaid and Cycle modules)
// ------------------------------------------------------------------
// Mimics the logic where we handle exclusions and auto-fill '*' companies
export const getProcessedData = (data: PurchaseRecord[]): PurchaseRecord[] => {
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to midnight

  return data
    .filter(r => {
      // 1.1 Exclude specific companies (Restored per user request)
      if (['SLEEMAN', 'Arc-en-ciel'].includes(r.companyName)) return false;

      // 1.2 Exclude void checks (keep this as general cleaning)
      if (r.invoiceAmount === 0 && (r.actualPaidAmount || 0) === 0) return false;
      return true;
    })
    .map(record => {
      const r = { ...record };
      const invoiceDate = parseISO(r.invoiceDate);

      // 1.3 Handle Auto-payment (*)
      if (r.companyName.trim().endsWith('*') && !r.checkDate) {
        const dueDate = addDays(invoiceDate, 10);
        // If due date is passed, assume it's paid
        if (dueDate < now) {
          r.checkDate = dueDate.toISOString();
          r.actualPaidAmount = r.invoiceAmount;
          r.checkTotalAmount = r.invoiceAmount;
        }
      }

      // Calculate unpaid
      const actualPaid = r.actualPaidAmount || 0;
      r.unpaid = (r.invoiceAmount || 0) - actualPaid;

      // Calculate payment days if paid
      if (r.checkDate && r.invoiceDate) {
        r.paymentDays = differenceInDays(parseISO(r.checkDate), parseISO(r.invoiceDate));
      }

      return r;
    });
};

// ------------------------------------------------------------------
// Aggregation Logic for Charts (Purchase)
// ------------------------------------------------------------------

// ------------------------------------------------------------------
// Aggregation Logic for Charts (Purchase)
// ------------------------------------------------------------------

export const getMonthlySummary = (data: PurchaseRecord[]): MonthlySummary[] => {
  // 1. Calculate Monthly Totals first (for percentage)
  const monthlyTotals: Record<string, number> = {};
  data.forEach(r => {
    const date = parseISO(r.invoiceDate);
    const monthStr = format(date, 'yyyy-MM');
    if (!monthlyTotals[monthStr]) monthlyTotals[monthStr] = 0;
    monthlyTotals[monthStr] += r.invoiceAmount;
  });

  const grouped = data.reduce((acc, record) => {
    const date = parseISO(record.invoiceDate);
    const monthStr = format(date, 'yyyy-MM');

    if (!acc[monthStr]) {
      acc[monthStr] = {
        month: monthStr,
        totalAmount: 0,
        records: [],
        byDepartment: {},
        totalMonthlyAmount: monthlyTotals[monthStr] // Add total for % calc
      };
    }

    acc[monthStr].totalAmount += record.invoiceAmount;
    acc[monthStr].records.push(record);

    if (!acc[monthStr].byDepartment[record.department]) {
      acc[monthStr].byDepartment[record.department] = 0;
    }
    acc[monthStr].byDepartment[record.department] += record.invoiceAmount;

    return acc;
  }, {} as Record<string, MonthlySummary>);

  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
};

export const getWeeklySummary = (data: PurchaseRecord[], selectedMonth?: string): WeeklySummary[] => {
  let filtered = data;
  if (selectedMonth) {
    filtered = data.filter(r => format(parseISO(r.invoiceDate), 'yyyy-MM') === selectedMonth);
  }

  // 1. Calculate Weekly Totals first (for percentage)
  const weeklyTotals: Record<string, number> = {};
  filtered.forEach(r => {
    const date = parseISO(r.invoiceDate);
    // Python: df['周开始'] = df['发票日期'] - pd.to_timedelta(df['发票日期'].dt.weekday, unit='D')
    // JS: date.getDay() returns 0 (Sun) - 6 (Sat). 
    // Python .weekday() returns 0 (Mon) - 6 (Sun).
    // We need Monday start.
    const day = date.getDay(); // 0=Sun, 1=Mon...
    const diff = (day === 0 ? 6 : day - 1); // Convert to Mon=0, Sun=6

    const start = new Date(date);
    start.setDate(date.getDate() - diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const weekRange = `${format(start, 'yyyy-MM-dd')} ~ ${format(end, 'yyyy-MM-dd')}`;

    if (!weeklyTotals[weekRange]) weeklyTotals[weekRange] = 0;
    weeklyTotals[weekRange] += r.invoiceAmount;
  });

  const grouped = filtered.reduce((acc, record) => {
    const date = parseISO(record.invoiceDate);

    // Strict Monday Start Logic matching Python
    const day = date.getDay(); // 0=Sun, 1=Mon...
    const diff = (day === 0 ? 6 : day - 1); // Convert to Mon=0, Sun=6

    const start = new Date(date);
    start.setDate(date.getDate() - diff);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const weekRange = `${format(start, 'yyyy-MM-dd')} ~ ${format(end, 'yyyy-MM-dd')}`;
    const weekStartStr = format(start, 'yyyy-MM-dd');

    if (!acc[weekRange]) {
      acc[weekRange] = {
        weekRange,
        weekStart: weekStartStr,
        weekEnd: format(end, 'yyyy-MM-dd'),
        totalAmount: 0,
        byDepartment: {},
        byCompany: {},
        totalWeeklyAmount: weeklyTotals[weekRange] // Add total for % calc
      };
    }

    acc[weekRange].totalAmount += record.invoiceAmount;
    if (!acc[weekRange].byDepartment[record.department]) acc[weekRange].byDepartment[record.department] = 0;
    acc[weekRange].byDepartment[record.department] += record.invoiceAmount;

    if (acc[weekRange].byCompany) {
      if (!acc[weekRange].byCompany![record.companyName]) acc[weekRange].byCompany![record.companyName] = 0;
      acc[weekRange].byCompany![record.companyName] += record.invoiceAmount;
    }

    return acc;
  }, {} as Record<string, WeeklySummary>);

  return Object.values(grouped).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
};


export const getCompanyBubbleData = (
  data: PurchaseRecord[],
  dept: string,
  companies: string[],
  dateRange: [Date, Date]
): { chartData: CompanyBubbleData[], sortedCompanies: string[] } => {

  // 1. Filter Data
  const filtered = data.filter(r => {
    const d = parseISO(r.invoiceDate);
    const inDate = d >= dateRange[0] && d <= dateRange[1];
    const inDept = r.department === dept;
    const inCompany = companies.length === 0 ? true : companies.includes(r.companyName);
    return inDate && inDept && inCompany;
  });

  // 2. Group by Company, Invoice Date
  const grouped: Record<string, CompanyBubbleData> = {};

  // 3. Calculate Company Totals for Top 20 Logic
  const companyTotals: Record<string, number> = {};

  filtered.forEach(r => {
    // Daily Logic
    const dateStr = r.invoiceDate.slice(0, 10); // YYYY-MM-DD
    const key = `${r.companyName}-${dateStr}`;

    if (!grouped[key]) {
      grouped[key] = {
        companyName: r.companyName,
        weekStart: dateStr, // Reusing field for Date
        weekRange: dateStr, // Reusing field for Date Display
        amount: 0,
        totalCompanyAmount: 0,
        invoiceCount: 0 // New field
      };
    }
    grouped[key].amount += r.invoiceAmount;
    grouped[key].invoiceCount = (grouped[key].invoiceCount || 0) + 1;

    if (!companyTotals[r.companyName]) companyTotals[r.companyName] = 0;
    companyTotals[r.companyName] += r.invoiceAmount;
  });

  // 4. Top 20 Logic
  let companiesToShow: string[] = [];
  const allCompanies = Object.keys(companyTotals);

  if (allCompanies.length <= 20) {
    companiesToShow = allCompanies;
  } else {
    // Sort by total amount desc and take top 20
    companiesToShow = Object.entries(companyTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([name]) => name);
  }

  // 5. Filter grouped data to only include Top 20 companies
  // AND Filter out amount <= 0
  const result = Object.values(grouped).filter(item =>
    companiesToShow.includes(item.companyName) && item.amount > 0
  );

  // 6. Sort companies by Total Amount (Small to Large for Y-axis plotting)
  const sortedCompanyList = companiesToShow.sort((a, b) => {
    return companyTotals[a] - companyTotals[b]; // Ascending
  });

  // Attach total company amount
  const finalResult = result.map(item => ({
    ...item,
    totalCompanyAmount: companyTotals[item.companyName]
  }));

  return {
    chartData: finalResult,
    sortedCompanies: sortedCompanyList
  };
}


// ------------------------------------------------------------------
// Aggregation Logic for Payment Analysis (Using checkDate & actualPaidAmount)
// ------------------------------------------------------------------

export const getMonthlyPaidSummary = (processedData: PurchaseRecord[]): MonthlySummary[] => {
  // Filter for valid paid records (Check Date Exists and Actual Paid Amount is not null/undefined)
  const paidData = processedData.filter(r => r.checkDate && r.actualPaidAmount !== undefined && r.actualPaidAmount !== null);

  const grouped = paidData.reduce((acc, record) => {
    const date = parseISO(record.checkDate!);
    const monthStr = format(date, 'yyyy-MM');
    const amount = record.actualPaidAmount || 0;

    if (!acc[monthStr]) {
      acc[monthStr] = { month: monthStr, totalAmount: 0, records: [], byDepartment: {} };
    }

    acc[monthStr].totalAmount += amount;
    acc[monthStr].records.push(record);

    if (!acc[monthStr].byDepartment[record.department]) {
      acc[monthStr].byDepartment[record.department] = 0;
    }
    acc[monthStr].byDepartment[record.department] += amount;

    return acc;
  }, {} as Record<string, MonthlySummary>);

  return Object.values(grouped).sort((a, b) => a.month.localeCompare(b.month));
};

export const getWeeklyPaidSummary = (processedData: PurchaseRecord[], selectedMonth?: string): WeeklySummary[] => {
  let paidData = processedData.filter(r => r.checkDate && r.actualPaidAmount !== undefined && r.actualPaidAmount !== null);

  if (selectedMonth) {
    paidData = paidData.filter(r => format(parseISO(r.checkDate!), 'yyyy-MM') === selectedMonth);
  }

  const grouped = paidData.reduce((acc, record) => {
    const date = parseISO(record.checkDate!);
    const amount = record.actualPaidAmount || 0;

    const start = startOfWeek(date, { weekStartsOn: 1 });
    const end = endOfWeek(date, { weekStartsOn: 1 });
    const weekRange = `${format(start, 'yyyy-MM-dd')} ~ ${format(end, 'yyyy-MM-dd')}`;
    const weekStartStr = format(start, 'yyyy-MM-dd');

    if (!acc[weekRange]) {
      acc[weekRange] = {
        weekRange,
        weekStart: weekStartStr,
        weekEnd: format(end, 'yyyy-MM-dd'),
        totalAmount: 0,
        byDepartment: {},
        byCompany: {}
      };
    }

    acc[weekRange].totalAmount += amount;
    if (!acc[weekRange].byDepartment[record.department]) acc[weekRange].byDepartment[record.department] = 0;
    acc[weekRange].byDepartment[record.department] += amount;

    if (acc[weekRange].byCompany) {
      if (!acc[weekRange].byCompany![record.companyName]) acc[weekRange].byCompany![record.companyName] = 0;
      acc[weekRange].byCompany![record.companyName] += amount;
    }

    return acc;
  }, {} as Record<string, WeeklySummary>);

  return Object.values(grouped).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
};


export const getPaidCompanyBubbleData = (
  processedData: PurchaseRecord[],
  dept: string,
  companies: string[],
  dateRange: [Date, Date]
): { chartData: CompanyBubbleData[], sortedCompanies: string[] } => {

  const paidData = processedData.filter(r => r.checkDate && r.actualPaidAmount !== undefined && r.actualPaidAmount !== null);

  const filtered = paidData.filter(r => {
    const d = parseISO(r.checkDate!);
    const inDate = d >= dateRange[0] && d <= dateRange[1];
    const inDept = r.department === dept;
    const inCompany = companies.length === 0 ? true : companies.includes(r.companyName);
    return inDate && inDept && inCompany;
  });

  const grouped: Record<string, CompanyBubbleData> = {};
  const companyTotals: Record<string, number> = {};

  filtered.forEach(r => {
    // Daily Logic using Check Date
    const dateStr = r.checkDate!.slice(0, 10); // YYYY-MM-DD
    const amount = r.actualPaidAmount || 0;

    const key = `${r.companyName}-${dateStr}`;

    if (!grouped[key]) {
      grouped[key] = {
        companyName: r.companyName,
        weekStart: dateStr, // Reusing field for Date (X-axis)
        weekRange: dateStr, // Reusing field for Date Display
        amount: 0,
        totalCompanyAmount: 0,
        invoiceCount: 0
      };
    }
    grouped[key].amount += amount;
    grouped[key].invoiceCount = (grouped[key].invoiceCount || 0) + 1;

    if (!companyTotals[r.companyName]) companyTotals[r.companyName] = 0;
    companyTotals[r.companyName] += amount;
  });

  const sortedCompanyList = Object.entries(companyTotals)
    .sort(([, a], [, b]) => b - a)
    .map(([name]) => name);

  const result = Object.values(grouped).map(item => ({
    ...item,
    totalCompanyAmount: companyTotals[item.companyName]
  }));

  return {
    chartData: result.filter(r => r.amount > 0),
    sortedCompanies: sortedCompanyList
  };
}


// ------------------------------------------------------------------
// Unpaid Bills Logic
// ------------------------------------------------------------------
export const getUnpaidSummary = (processedData: PurchaseRecord[]): UnpaidSummary => {
  const totalUnpaid = processedData.reduce((sum, r) => sum + (r.unpaid || 0), 0);
  const byDepartment: Record<string, number> = {};
  const byDeptCompany: Record<string, Record<string, number>> = {};

  processedData.forEach(r => {
    if (Math.abs(r.unpaid || 0) < 0.01) return;

    if (!byDepartment[r.department]) byDepartment[r.department] = 0;
    byDepartment[r.department] += (r.unpaid || 0);

    if (!byDeptCompany[r.department]) byDeptCompany[r.department] = {};
    if (!byDeptCompany[r.department][r.companyName]) byDeptCompany[r.department][r.companyName] = 0;
    byDeptCompany[r.department][r.companyName] += (r.unpaid || 0);
  });

  const details = processedData.filter(r => Math.abs(r.unpaid || 0) > 0.01);

  return {
    totalUnpaid,
    byDepartment,
    byDeptCompany,
    processedRecords: processedData,
    details
  };
};

// ------------------------------------------------------------------
// Cycle Analysis Logic
// ------------------------------------------------------------------

// Helper: Calculate Median
const median = (values: number[]): number => {
  if (values.length === 0) return 0;
  values.sort((a, b) => a - b);
  const half = Math.floor(values.length / 2);
  if (values.length % 2) return values[half];
  return (values[half - 1] + values[half]) / 2.0;
};

export const getPaymentCycleMetrics = (processedData: PurchaseRecord[]): PaymentCycleMetric[] => {
  // 1. Filter only Paid records (Check Date Exists)
  const paidRecords = processedData.filter(r => r.checkDate && r.invoiceDate && r.paymentDays !== undefined);

  // 2. Group by Dept + Company
  const groups: Record<string, PurchaseRecord[]> = {}; // Key: "Dept|Company"

  paidRecords.forEach(r => {
    const key = `${r.department}|${r.companyName}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(r);
  });

  // 3. Aggregate Metrics
  return Object.entries(groups).map(([key, records]) => {
    const [department, companyName] = key.split('|');
    const days = records.map(r => r.paymentDays || 0);
    const totalAmt = records.reduce((sum, r) => sum + r.invoiceAmount, 0);

    return {
      department,
      companyName,
      invoiceCount: records.length,
      totalAmount: totalAmt,
      medianDays: median(days),
      minDays: Math.min(...days),
      maxDays: Math.max(...days),
      avgDays: days.reduce((a, b) => a + b, 0) / days.length
    };
  });
};

// ------------------------------------------------------------------
// Forecast Logic
// ------------------------------------------------------------------
export const getPaymentForecast = (processedData: PurchaseRecord[], metrics: PaymentCycleMetric[]): ForecastSummary => {
  // 1. Get Unpaid records (Include negatives/overpayments, match Python != 0)
  const unpaidRecords = processedData.filter(r => Math.abs(r.unpaid || 0) > 0.01);

  // 2. Map metrics for fast lookup
  const metricsMap: Record<string, number> = {}; // "Dept|Company" -> Median Days
  metrics.forEach(m => {
    metricsMap[`${m.department}|${m.companyName}`] = m.medianDays;
  });

  const now = new Date();
  now.setHours(0, 0, 0, 0); // Normalize to midnight to match Python date() logic
  // End of Current Week (Sunday)
  const endOfCurrentWeek = endOfWeek(now, { weekStartsOn: 1 });

  // 3. Enrich with prediction
  const predictions: PredictedPayment[] = unpaidRecords.map(r => {
    const hasHistory = metricsMap.hasOwnProperty(`${r.department}|${r.companyName}`);
    const medianDays = hasHistory ? metricsMap[`${r.department}|${r.companyName}`] : null;

    const invoiceDate = parseISO(r.invoiceDate);

    let predictedDate = '';
    let isDue = false;

    if (medianDays !== null) {
      const pDate = addDays(invoiceDate, medianDays);
      predictedDate = pDate.toISOString();
      // Due logic: Predicted date <= End of current week
      isDue = pDate <= endOfCurrentWeek;
    }

    return {
      ...r,
      medianDays: medianDays ?? 0, // Keep 0 for display if null, or handle in UI
      predictedDate: predictedDate, // Empty string if no prediction
      isDueThisWeek: isDue,
      unpaidAmount: r.unpaid || 0
    } as PredictedPayment;
  });

  // 4. Aggregate 'Due This Week'
  const dueRecords = predictions.filter(p => p.isDueThisWeek);
  const totalDueThisWeek = dueRecords.reduce((sum, r) => sum + r.unpaidAmount, 0);

  const byDept: Record<string, number> = {};
  const byDeptCompany: Record<string, Record<string, number>> = {};

  dueRecords.forEach(r => {
    if (!byDept[r.department]) byDept[r.department] = 0;
    byDept[r.department] += r.unpaidAmount;

    if (!byDeptCompany[r.department]) byDeptCompany[r.department] = {};
    if (!byDeptCompany[r.department][r.companyName]) byDeptCompany[r.department][r.companyName] = 0;
    byDeptCompany[r.department][r.companyName] += r.unpaidAmount;
  });

  return {
    totalDueThisWeek,
    byDept,
    byDeptCompany,
    allRecords: predictions
  };
};