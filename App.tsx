import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingCart, Activity, DollarSign, PieChart, ShieldCheck, Menu, Database, AlertTriangle, Globe, Clock, BarChart2, TrendingDown } from 'lucide-react';
import {
  cleanData,
  getProcessedData,
  getOrderedDepartments,
  getMonthlySummary,
  getWeeklySummary,
  getCompanyBubbleData,
  getUnpaidSummary,
  getPaymentCycleMetrics,
  getPaymentForecast,
  getMonthlyPaidSummary,
  getWeeklyPaidSummary,
  getPaidCompanyBubbleData
} from './services/dataProcessor';
import { supabase, mapDbToPurchaseRecord } from './services/supabase';
import { ChartViewType, PurchaseRecord, Language, CompanyBubbleData } from './types';
import { GlassCard } from './components/ui/GlassCard';
import { Select } from './components/ui/Select';
import { MultiSelect } from './components/ui/MultiSelect';
import { DatePicker } from './components/ui/DatePicker';
import { MonthlyPurchaseChart } from './components/charts/MonthlyPurchaseChart';
import { WeeklyDeptChart } from './components/charts/WeeklyDeptChart';
import { CompanyWeekChart } from './components/charts/CompanyWeekChart';
import { DistributionChart } from './components/charts/DistributionChart';

import { PaymentCycleBarChart, ForecastChart } from './components/charts/CycleCharts';
import { PaymentIntelligence } from './components/PaymentIntelligence';
import { ForecastDashboard } from './components/modules/ForecastDashboard';
import { UnpaidDashboard } from './components/modules/UnpaidDashboard';
import { PaymentDetailTable } from './components/modules/PaymentDetailTable';
import { AdminUpload } from './components/AdminUpload';
import { format } from 'date-fns';
import { translations } from './services/translations';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PurchaseRecord[]>([]); // Raw cleaned data
  const [processedData, setProcessedData] = useState<PurchaseRecord[]>([]); // Data with * auto-fill and calc
  const [isAdmin, setIsAdmin] = useState(false);
  const [lang, setLang] = useState<Language>('CN');

  // Navigation State
  const [activeModule, setActiveModule] = useState<'PURCHASE' | 'UNPAID' | 'CYCLE' | 'PAYMENT'>('PURCHASE');
  const [currentView, setCurrentView] = useState<ChartViewType>('MONTHLY_DEPT');

  // Filters State
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');
  const [selectedMultiDepts, setSelectedMultiDepts] = useState<string[]>([]); // For multi-select views
  const [cycleSort, setCycleSort] = useState<'MEDIAN' | 'AMOUNT'>('MEDIAN');
  const [distribMode, setDistribMode] = useState<'MONTH' | 'RANGE'>('MONTH'); // New state for distribution mode

  // Date Range for Bubble Chart
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedBubbleCompanies, setSelectedBubbleCompanies] = useState<string[]>([]); // Empty = All
  const [selectedBubble, setSelectedBubble] = useState<CompanyBubbleData | null>(null); // For drill-down

  const t = translations[lang];

  // Load Data
  const fetchData = async () => {
    setLoading(true);
    try {
      let allData: any[] = [];
      let from = 0;
      const step = 1000;
      let more = true;

      while (more) {
        const { data: chunk, error } = await supabase
          .from('finance_data')
          .select('*')
          .range(from, from + step - 1);

        if (error) {
          console.error('Error fetching data:', error);
          setLoading(false);
          return;
        }

        if (chunk && chunk.length > 0) {
          allData = [...allData, ...chunk];
          from += step;
          // If we got fewer rows than requested, we've reached the end
          if (chunk.length < step) {
            more = false;
          }
        } else {
          more = false;
        }
      }

      const dbData = allData;

      if (dbData && dbData.length > 0) {
        const mappedData = dbData.map(mapDbToPurchaseRecord);
        const cleaned = cleanData(mappedData);
        setData(cleaned);

        // Preprocess for Cycle/Unpaid
        const processed = getProcessedData(cleaned);
        setProcessedData(processed);

        // Set defaults
        const months = Array.from(new Set(cleaned.map(r => r.invoiceDate.slice(0, 7)))).sort();
        if (months.length > 0) {
          const currentMonth = format(new Date(), 'yyyy-MM');
          if (months.includes(currentMonth)) {
            setSelectedMonth(currentMonth);
          } else {
            setSelectedMonth(months[months.length - 1]); // Fallback to last available
          }
        }

        const { departments, defaultIndex } = getOrderedDepartments(cleaned);
        if (departments.length > 0) {
          setSelectedDept(departments[defaultIndex]);
        }

        // Defaults for Bubble chart
        const dates = cleaned.map(r => r.invoiceDate).sort();
        if (dates.length > 0) {
          setStartDate(dates[0].slice(0, 10));
          setEndDate(dates[dates.length - 1].slice(0, 10));
        }
      } else {
        // Handle empty data case
        setData([]);
        setProcessedData([]);
      }
    } catch (err) {
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    fetchData();
  };

  // Derived Data
  const sortedDepartments = useMemo(() => getOrderedDepartments(data).departments, [data]);
  const availableMonths = useMemo(() => Array.from(new Set(data.map(r => r.invoiceDate.slice(0, 7)))).sort(), [data]);

  // Initialize Multi-Select with all departments when data loads
  useEffect(() => {
    if (sortedDepartments.length > 0) {
      if (selectedMultiDepts.length === 0) {
        setSelectedMultiDepts(sortedDepartments);
      }
    }
  }, [sortedDepartments]);

  // Data for Unpaid (Using processedData)
  const unpaidSummary = useMemo(() => getUnpaidSummary(processedData), [processedData]);

  // Derived Departments specific to Unpaid
  const unpaidDepartments = useMemo(() => {
    const depts = Object.keys(unpaidSummary.byDeptCompany);
    const { departments } = getOrderedDepartments(data, undefined, undefined);
    return departments.filter(d => depts.includes(d));
  }, [unpaidSummary, data]);

  // Data for Cycle
  // 1. Analysis Metrics
  const cycleMetrics = useMemo(() => {
    let metrics = getPaymentCycleMetrics(processedData);
    // Filter by Selected Dept if needed? No, chart usually shows company breakdown for selected dept
    return metrics.filter(m => m.department === selectedDept);
  }, [processedData, selectedDept]);

  // 2. Forecast
  const forecastSummary = useMemo(() => {
    // Need all metrics to predict
    const allMetrics = getPaymentCycleMetrics(processedData);
    return getPaymentForecast(processedData, allMetrics);
  }, [processedData]);

  // Drill-down Data
  const drillDownData = useMemo(() => {
    if (!selectedBubble) return [];

    // Determine filter logic based on view
    const isPaymentView = currentView === 'PAYMENT_DISTRIBUTION';

    return processedData.filter(r => {
      const isCompany = r.companyName === selectedBubble.companyName;
      const isDept = r.department === selectedDept;

      if (isPaymentView) {
        // Match Check Date (YYYY-MM-DD)
        const checkDate = r.checkDate ? r.checkDate.slice(0, 10) : '';
        return isCompany && isDept && checkDate === selectedBubble.weekStart;
      } else {
        // Match Invoice Date (YYYY-MM-DD) for Purchase View
        const invoiceDate = r.invoiceDate ? r.invoiceDate.slice(0, 10) : '';
        return isCompany && isDept && invoiceDate === selectedBubble.weekStart;
      }
    });
  }, [selectedBubble, processedData, currentView, selectedDept]);

  const handleBubbleClick = (data: CompanyBubbleData) => {
    setSelectedBubble(data);
  };


  // View Handlers
  const renderChart = () => {
    if (loading) return <div className="h-96 flex items-center justify-center text-scifi-primary animate-pulse">{t.alerts.loading}</div>;

    // Use selectedMultiDepts for charts that support it
    const displayDepts = selectedMultiDepts.length > 0 ? selectedMultiDepts : [];

    // Helper to get date range for distribution
    const getDistributionRange = () => {
      if (distribMode === 'MONTH') {
        if (!selectedMonth) return [new Date(), new Date()];
        const [y, m] = selectedMonth.split('-').map(Number);
        const start = new Date(y, m - 1, 1);
        const end = new Date(y, m, 0); // Last day of month
        return [start, end];
      } else {
        return [new Date(startDate), new Date(endDate)];
      }
    };

    switch (currentView) {
      // --- Purchase Module ---
      case 'MONTHLY_DEPT':
        const monthlyData = getMonthlySummary(data);
        return <MonthlyPurchaseChart key="monthly-dept" data={monthlyData} departments={displayDepts} />;

      case 'WEEKLY_DEPT':
        // Ensure we have a selected month, otherwise default to the last available month
        const safeMonth = selectedMonth || availableMonths[availableMonths.length - 1] || '';
        const weeklyData = getWeeklySummary(data, safeMonth);
        return <WeeklyDeptChart key={`weekly-dept-${safeMonth}`} data={weeklyData} departments={displayDepts} selectedMonth={safeMonth} />;

      case 'WEEKLY_COMPANY':
        const safeMonthComp = selectedMonth || availableMonths[availableMonths.length - 1] || '';
        const filteredForCompany = data.filter(r => r.department === selectedDept && r.invoiceDate.startsWith(safeMonthComp));
        const companyWeeklyData = getWeeklySummary(filteredForCompany);
        return <CompanyWeekChart key={`weekly-comp-${safeMonthComp}-${selectedDept}`} data={companyWeeklyData} department={selectedDept} />;

      case 'COMPANY_DISTRIBUTION':
        const [distStart, distEnd] = getDistributionRange();
        const { chartData, sortedCompanies } = getCompanyBubbleData(
          data,
          selectedDept,
          selectedBubbleCompanies,
          [distStart, distEnd]
        );
        // Add mode to key to force re-render
        return (
          <div className="flex flex-col gap-6">
            <DistributionChart
              key={`distrib-${selectedDept}-${distribMode}-${selectedMonth}-${startDate}-${endDate}`}
              data={chartData}
              sortedCompanies={sortedCompanies}
              dateRange={[distStart, distEnd]}
              onBubbleClick={handleBubbleClick}
            />
            {selectedBubble && currentView === 'COMPANY_DISTRIBUTION' && (
              <PaymentDetailTable
                data={drillDownData}
                companyName={selectedBubble.companyName}
                date={selectedBubble.weekStart}
              />
            )}
          </div>
        );

      // --- Unpaid Module ---
      // --- Unpaid Module ---
      case 'UNPAID_DEPT': // Keep case for type safety, but render Dashboard
      case 'UNPAID_COMPANY':
        return <UnpaidDashboard key="unpaid-dashboard" unpaidSummary={unpaidSummary} lang={lang} />;

      // --- Cycle Module ---
      case 'CYCLE_ANALYSIS':
        return <PaymentCycleBarChart key={`cycle-${cycleSort}`} data={cycleMetrics} sortBy={cycleSort} />;

      case 'CYCLE_FORECAST':
        return <ForecastDashboard key="forecast-dashboard" forecastSummary={forecastSummary} processedData={processedData} lang={lang} />;

      // --- Payment Module (Uses Processed Data - Paid Only) ---
      case 'PAYMENT_MONTHLY':
        const monthlyPaidData = getMonthlyPaidSummary(processedData);
        return <MonthlyPurchaseChart key="payment-monthly" data={monthlyPaidData} departments={displayDepts} type="PAYMENT" />;

      case 'PAYMENT_WEEKLY':
        const weeklyPaidData = getWeeklyPaidSummary(processedData, selectedMonth);
        return <WeeklyDeptChart key={`payment-weekly-${selectedMonth}`} data={weeklyPaidData} departments={displayDepts} selectedMonth={selectedMonth} type="PAYMENT" />;

      case 'PAYMENT_COMPANY_WEEKLY':
        // Reuse CompanyWeekChart but pass paid data structure
        const filteredPaidCompany = processedData.filter(r => r.department === selectedDept);
        const companyPaidWeeklyData = getWeeklyPaidSummary(filteredPaidCompany, selectedMonth);
        return <CompanyWeekChart key={`payment-comp-${selectedMonth}-${selectedDept}`} data={companyPaidWeeklyData} department={selectedDept} type="PAYMENT" />;

      case 'PAYMENT_DISTRIBUTION':
        const [payDistStart, payDistEnd] = getDistributionRange();
        const { chartData: paidBubble, sortedCompanies: paidSorted } = getPaidCompanyBubbleData(
          processedData,
          selectedDept,
          selectedBubbleCompanies,
          [payDistStart, payDistEnd]
        );
        return (
          <div className="flex flex-col gap-6">
            <DistributionChart
              key={`payment-distrib-${selectedDept}-${distribMode}-${selectedMonth}-${startDate}-${endDate}`}
              data={paidBubble}
              sortedCompanies={paidSorted}
              dateRange={[payDistStart, payDistEnd]}
              type="PAYMENT"
              onBubbleClick={handleBubbleClick}
            />
            {selectedBubble && (
              <PaymentDetailTable
                data={drillDownData}
                companyName={selectedBubble.companyName}
                date={selectedBubble.weekStart}
              />
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const handleModuleChange = (module: 'PURCHASE' | 'UNPAID' | 'CYCLE' | 'PAYMENT') => {
    setActiveModule(module);
    if (module === 'PURCHASE') setCurrentView('MONTHLY_DEPT');
    if (module === 'UNPAID') setCurrentView('UNPAID_DEPT');
    if (module === 'CYCLE') setCurrentView('CYCLE_ANALYSIS');
    if (module === 'PAYMENT') setCurrentView('PAYMENT_MONTHLY');
  }

  return (
    <div className="min-h-screen bg-scifi-bg bg-grid-pattern text-scifi-text pb-20 font-sans">
      {/* Navigation Bar */}
      <nav className="border-b border-scifi-border bg-scifi-bg/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-scifi-primary/20 rounded-lg">
                <Activity className="w-6 h-6 text-scifi-primary" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">Xinya<span className="text-scifi-primary">{t.nav.brand}</span></span>
            </div>

            <div className="hidden md:flex items-center space-x-1">
              <button
                onClick={() => handleModuleChange('PURCHASE')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeModule === 'PURCHASE' ? 'bg-scifi-primary/20 text-scifi-primary border border-scifi-primary/50 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {t.nav.purchase}
              </button>
              <button
                onClick={() => handleModuleChange('UNPAID')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeModule === 'UNPAID' ? 'bg-scifi-danger/20 text-scifi-danger border border-scifi-danger/50 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {t.nav.unpaid}
              </button>
              <button
                onClick={() => handleModuleChange('CYCLE')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeModule === 'CYCLE' ? 'bg-scifi-warning/20 text-scifi-warning border border-scifi-warning/50 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {t.nav.cycle}
              </button>
              <button
                onClick={() => handleModuleChange('PAYMENT')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${activeModule === 'PAYMENT' ? 'bg-scifi-success/20 text-scifi-success border border-scifi-success/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                {t.nav.company}
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setLang(lang === 'CN' ? 'FR' : 'CN')}
                className="flex items-center gap-2 text-xs font-mono text-scifi-accent hover:text-white transition-colors border border-scifi-accent/30 px-3 py-1 rounded"
              >
                <Globe className="w-3 h-3" />
                {lang}
              </button>

              <button
                onClick={() => setIsAdmin(!isAdmin)}
                className={`p-2 rounded-full transition-all ${isAdmin ? 'bg-scifi-primary text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]' : 'bg-scifi-card text-gray-400 hover:text-white'}`}
              >
                <ShieldCheck className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Admin Section */}
        {isAdmin && (
          <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
            <AdminUpload onUploadSuccess={handleRefresh} />
          </div>
        )}

        {/* Top Cards (Context Dependent) */}



        {/* CYCLE MODULE: Forecast Total Card */}
        {activeModule === 'CYCLE' && currentView === 'CYCLE_FORECAST' && (
          <div className="mb-8 animate-in fade-in zoom-in duration-500">
            <div className="relative overflow-hidden rounded-xl bg-[#0f172a] border border-scifi-primary/50 p-6 shadow-[0_0_30px_rgba(59,130,246,0.1)]">
              <div className="absolute top-0 left-0 w-1 h-full bg-scifi-primary"></div>
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-scifi-primary/10 rounded-full blur-3xl"></div>
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-scifi-primary text-sm font-mono uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t.headers.forecastTotal}
                  </h3>
                  <div className="text-4xl font-bold text-white tracking-tighter filter drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]">
                    ${forecastSummary.totalDueThisWeek.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right text-gray-400 text-xs max-w-md">
                  {t.alerts.forecastInfo}
                </div>
              </div>
            </div>
          </div>
        )}


        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Sidebar Controls */}
          {activeModule !== 'UNPAID' && (
            <div className="lg:col-span-1 space-y-6">
              <GlassCard title={t.control.panel}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs text-scifi-accent font-mono uppercase">{t.control.viewSelect}</label>
                    <div className="flex flex-col gap-2">
                      {/* PURCHASE MENU */}
                      {activeModule === 'PURCHASE' && (
                        <>
                          <button onClick={() => setCurrentView('MONTHLY_DEPT')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'MONTHLY_DEPT' ? 'bg-scifi-primary/20 text-scifi-primary border border-scifi-primary/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.monthlyDept}</button>
                          <button onClick={() => setCurrentView('WEEKLY_DEPT')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'WEEKLY_DEPT' ? 'bg-scifi-primary/20 text-scifi-primary border border-scifi-primary/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.weeklyDept}</button>
                          <button onClick={() => setCurrentView('WEEKLY_COMPANY')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'WEEKLY_COMPANY' ? 'bg-scifi-primary/20 text-scifi-primary border border-scifi-primary/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.weeklyComp}</button>
                          <button onClick={() => setCurrentView('COMPANY_DISTRIBUTION')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'COMPANY_DISTRIBUTION' ? 'bg-scifi-primary/20 text-scifi-primary border border-scifi-primary/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.distrib}</button>
                        </>
                      )}



                      {/* CYCLE MENU */}
                      {activeModule === 'CYCLE' && (
                        <>
                          <button onClick={() => setCurrentView('CYCLE_ANALYSIS')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'CYCLE_ANALYSIS' ? 'bg-scifi-warning/20 text-scifi-warning border border-scifi-warning/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.cycleAnalysis}</button>
                          <button onClick={() => setCurrentView('CYCLE_FORECAST')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'CYCLE_FORECAST' ? 'bg-scifi-warning/20 text-scifi-warning border border-scifi-warning/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.cycleForecast}</button>
                        </>
                      )}

                      {/* PAYMENT MENU */}
                      {activeModule === 'PAYMENT' && (
                        <>
                          <button onClick={() => setCurrentView('PAYMENT_MONTHLY')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'PAYMENT_MONTHLY' ? 'bg-scifi-success/20 text-scifi-success border border-scifi-success/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.paymentMonthly}</button>
                          <button onClick={() => setCurrentView('PAYMENT_WEEKLY')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'PAYMENT_WEEKLY' ? 'bg-scifi-success/20 text-scifi-success border border-scifi-success/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.paymentWeekly}</button>
                          <button onClick={() => setCurrentView('PAYMENT_COMPANY_WEEKLY')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'PAYMENT_COMPANY_WEEKLY' ? 'bg-scifi-success/20 text-scifi-success border border-scifi-success/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.paymentCompWeekly}</button>
                          <button onClick={() => setCurrentView('PAYMENT_DISTRIBUTION')} className={`text-left px-3 py-2 rounded text-sm transition-all ${currentView === 'PAYMENT_DISTRIBUTION' ? 'bg-scifi-success/20 text-scifi-success border border-scifi-success/50' : 'hover:bg-scifi-card text-gray-400'}`}>{t.views.paymentDistrib}</button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="h-px bg-scifi-border my-2" />

                  {/* CONTROLS BASED ON VIEW */}

                  {/* 1. Global Dept/Month Selectors (Used in multiple views) */}
                  {['WEEKLY_DEPT', 'WEEKLY_COMPANY', 'PAYMENT_WEEKLY', 'PAYMENT_COMPANY_WEEKLY'].includes(currentView) && (
                    <Select label={t.control.monthSelect} options={availableMonths} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                  )}

                  {/* Multi-Select for Dept Views */}
                  {['MONTHLY_DEPT', 'WEEKLY_DEPT', 'PAYMENT_MONTHLY', 'PAYMENT_WEEKLY'].includes(currentView) && (
                    <MultiSelect
                      label="选择部门 (多选)"
                      options={sortedDepartments}
                      selected={selectedMultiDepts}
                      onChange={setSelectedMultiDepts}
                    />
                  )}

                  {['WEEKLY_COMPANY', 'COMPANY_DISTRIBUTION', 'CYCLE_ANALYSIS', 'PAYMENT_COMPANY_WEEKLY', 'PAYMENT_DISTRIBUTION'].includes(currentView) && (
                    <Select label={t.control.deptSelect} options={sortedDepartments} value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} />
                  )}

                  {/* UNPAID COMPANY Specific - REMOVED (Handled by UnpaidDashboard) */}

                  {/* CYCLE ANALYSIS Specific */}
                  {currentView === 'CYCLE_ANALYSIS' && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-scifi-accent font-mono uppercase">{t.control.sortOption}</label>
                        <div className="flex gap-2">
                          <button onClick={() => setCycleSort('MEDIAN')} className={`flex-1 py-1.5 text-xs rounded border ${cycleSort === 'MEDIAN' ? 'bg-scifi-warning/20 border-scifi-warning text-scifi-warning' : 'border-scifi-border text-gray-400'}`}>{t.control.sortByMedian}</button>
                          <button onClick={() => setCycleSort('AMOUNT')} className={`flex-1 py-1.5 text-xs rounded border ${cycleSort === 'AMOUNT' ? 'bg-scifi-warning/20 border-scifi-warning text-scifi-warning' : 'border-scifi-border text-gray-400'}`}>{t.control.sortByAmount}</button>
                        </div>
                      </div>
                      <div className="mt-4 p-3 bg-scifi-warning/10 border border-scifi-warning/20 rounded text-xs text-scifi-warning">{t.alerts.cycleInfo}</div>
                    </>
                  )}

                  {/* DISTRIBUTION Specific Controls */}
                  {['COMPANY_DISTRIBUTION', 'PAYMENT_DISTRIBUTION'].includes(currentView) && (
                    <>
                      {/* Mode Toggle */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs text-scifi-accent font-mono uppercase">时间范围模式</label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDistribMode('MONTH')}
                            className={`flex-1 py-1.5 text-xs rounded border transition-colors ${distribMode === 'MONTH' ? 'bg-scifi-primary/20 border-scifi-primary text-scifi-primary' : 'border-scifi-border text-gray-400 hover:bg-white/5'}`}
                          >
                            按月份
                          </button>
                          <button
                            onClick={() => setDistribMode('RANGE')}
                            className={`flex-1 py-1.5 text-xs rounded border transition-colors ${distribMode === 'RANGE' ? 'bg-scifi-primary/20 border-scifi-primary text-scifi-primary' : 'border-scifi-border text-gray-400 hover:bg-white/5'}`}
                          >
                            按日期
                          </button>
                        </div>
                      </div>

                      {/* Conditional Inputs */}
                      {distribMode === 'MONTH' ? (
                        <Select label={t.control.monthSelect} options={availableMonths} value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} />
                      ) : (
                        <>
                          <>
                            <DatePicker
                              label={t.control.startDate}
                              value={startDate}
                              onChange={setStartDate}
                            />
                            <DatePicker
                              label={t.control.endDate}
                              value={endDate}
                              onChange={setEndDate}
                            />
                          </>
                        </>
                      )}
                    </>
                  )}

                  {/* PAYMENT INFO */}
                  {activeModule === 'PAYMENT' && (
                    <div className="mt-4 p-3 bg-scifi-success/10 border border-scifi-success/20 rounded text-xs text-scifi-success">{t.alerts.paymentInfo}</div>
                  )}

                </div>
              </GlassCard>
            </div>
          )}

          {/* Main Chart Area */}
          <div className={`${activeModule === 'UNPAID' ? 'lg:col-span-4' : 'lg:col-span-3'} space-y-6`}>
            <GlassCard className={`h-full min-h-[500px] 
              ${activeModule === 'UNPAID' ? 'border-scifi-danger/30' :
                activeModule === 'CYCLE' ? 'border-scifi-warning/30' :
                  activeModule === 'PAYMENT' ? 'border-scifi-success/30' : ''}`}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  {/* Icons & Titles */}
                  {currentView === 'MONTHLY_DEPT' && <><PieChart className="w-5 h-5 text-scifi-accent" /> {t.headers.strategic}</>}
                  {currentView === 'WEEKLY_DEPT' && <><Activity className="w-5 h-5 text-scifi-accent" /> {t.headers.tactical}</>}
                  {currentView === 'WEEKLY_COMPANY' && <><Database className="w-5 h-5 text-scifi-accent" /> {t.headers.vendor}</>}
                  {currentView === 'COMPANY_DISTRIBUTION' && <><DollarSign className="w-5 h-5 text-scifi-accent" /> {t.headers.distrib}</>}

                  {currentView === 'UNPAID_DEPT' && <><AlertTriangle className="w-5 h-5 text-scifi-danger" /> {t.headers.unpaidDeptTitle}</>}
                  {currentView === 'UNPAID_COMPANY' && <><Database className="w-5 h-5 text-scifi-danger" /> {t.headers.unpaidCompTitle}</>}

                  {currentView === 'CYCLE_ANALYSIS' && <><Clock className="w-5 h-5 text-scifi-warning" /> {t.headers.cycleAnalysis}</>}
                  {currentView === 'CYCLE_FORECAST' && <><BarChart2 className="w-5 h-5 text-scifi-warning" /> {t.headers.forecastTitle}</>}

                  {currentView === 'PAYMENT_MONTHLY' && <><PieChart className="w-5 h-5 text-scifi-success" /> {t.headers.paymentMonthlyTitle}</>}
                  {currentView === 'PAYMENT_WEEKLY' && <><Activity className="w-5 h-5 text-scifi-success" /> {t.headers.paymentWeeklyTitle}</>}
                  {currentView === 'PAYMENT_COMPANY_WEEKLY' && <><Database className="w-5 h-5 text-scifi-success" /> {t.headers.paymentCompTitle}</>}
                  {currentView === 'PAYMENT_DISTRIBUTION' && <><TrendingDown className="w-5 h-5 text-scifi-success" /> {t.headers.paymentDistribTitle}</>}
                </h2>
              </div>

              {renderChart()}

            </GlassCard>

            {/* Additional Panel for Cycle Forecast (Grid) - REMOVED (Moved to ForecastDashboard) */}
          </div>

        </div>
      </main>
    </div>
  );
};

export default App;