import React, { useState } from 'react';
import { BarChart2, Search, ArrowLeft, ChevronRight } from 'lucide-react';
import { ForecastSummary, PurchaseRecord, Language } from '../../types';
import { ForecastChart } from '../charts/CycleCharts';
import { PaymentIntelligence } from '../PaymentIntelligence';
import { translations } from '../../services/translations';
import { GlassCard } from '../ui/GlassCard';

interface ForecastDashboardProps {
    forecastSummary: ForecastSummary;
    processedData: PurchaseRecord[];
    lang: Language;
}

type ViewMode = 'HOME' | 'CHART' | 'DETAILS';

export const ForecastDashboard: React.FC<ForecastDashboardProps> = ({ forecastSummary, processedData, lang }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('HOME');
    const [chartView, setChartView] = useState<'DEPT' | 'COMPANY'>('DEPT');
    const [selectedChartDept, setSelectedChartDept] = useState<string>('');
    const t = translations[lang];

    // Render Home (Parallel Modules)
    if (viewMode === 'HOME') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in zoom-in duration-300">
                {/* Module 1: Overview Chart */}
                <div
                    onClick={() => {
                        setChartView('DEPT');
                        setSelectedChartDept('');
                        setViewMode('CHART');
                    }}
                    className="group relative overflow-hidden rounded-2xl bg-[#0f172a] border border-scifi-border hover:border-scifi-primary transition-all cursor-pointer p-8 h-[300px] flex flex-col justify-between shadow-lg hover:shadow-scifi-primary/20"
                >
                    <div className="absolute top-0 left-0 w-1 h-full bg-scifi-primary group-hover:w-2 transition-all" />
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-scifi-primary/10 rounded-full blur-3xl group-hover:bg-scifi-primary/20 transition-all" />

                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-scifi-primary/20 rounded-lg text-scifi-primary">
                                <BarChart2 className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-wide">
                                {t.headers.forecastTitle}
                            </h3>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Visual breakdown of payments due this week. Analyze trends and distribution by department.
                        </p>
                    </div>

                    <div className="flex items-center text-scifi-primary text-sm font-mono uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                        View Analysis <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </div>

                {/* Module 2: Intelligence Node (Details) */}
                <div
                    onClick={() => setViewMode('DETAILS')}
                    className="group relative overflow-hidden rounded-2xl bg-[#0f172a] border border-scifi-border hover:border-scifi-warning transition-all cursor-pointer p-8 h-[300px] flex flex-col justify-between shadow-lg hover:shadow-scifi-warning/20"
                >
                    <div className="absolute top-0 left-0 w-1 h-full bg-scifi-warning group-hover:w-2 transition-all" />
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-scifi-warning/10 rounded-full blur-3xl group-hover:bg-scifi-warning/20 transition-all" />

                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-scifi-warning/20 rounded-lg text-scifi-warning">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="text-xl font-bold text-white tracking-wide">
                                Payment Intelligence
                            </h3>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            Detailed data tables, search functionality, and predictive analysis for unpaid invoices.
                        </p>
                    </div>

                    <div className="flex items-center text-scifi-warning text-sm font-mono uppercase tracking-widest group-hover:translate-x-2 transition-transform">
                        Access Data <ChevronRight className="w-4 h-4 ml-1" />
                    </div>
                </div>
            </div>
        );
    }

    // Render Chart View
    if (viewMode === 'CHART') {
        return (
            <div className="animate-in slide-in-from-right duration-300">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => {
                            if (chartView === 'COMPANY') {
                                setChartView('DEPT');
                                setSelectedChartDept('');
                            } else {
                                setViewMode('HOME');
                            }
                        }}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase"
                    >
                        <ArrowLeft className="w-4 h-4" /> {chartView === 'COMPANY' ? 'Back to Departments' : 'Back to Dashboard'}
                    </button>
                    {chartView === 'COMPANY' && (
                        <div className="px-4 py-2 bg-scifi-primary/20 border border-scifi-primary/50 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                            <span className="text-xl font-bold text-scifi-primary tracking-wide">{selectedChartDept}</span>
                        </div>
                    )}
                </div>
                <GlassCard className="border-scifi-primary/30">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-scifi-primary" />
                            付款预测及详情
                        </h2>
                    </div>
                    <ForecastChart
                        data={forecastSummary}
                        historyData={processedData}
                        view={chartView}
                        selectedDept={selectedChartDept}
                        onBarClick={(name) => {
                            if (chartView === 'DEPT') {
                                setSelectedChartDept(name);
                                setChartView('COMPANY');
                            }
                        }}
                    />
                </GlassCard>
            </div>
        );
    }

    // Render Details View
    if (viewMode === 'DETAILS') {
        return (
            <div className="animate-in slide-in-from-right duration-300">
                <button
                    onClick={() => setViewMode('HOME')}
                    className="mb-4 flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase"
                >
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>

                {/* We use standalone=true to force it open without the toggle button */}
                <PaymentIntelligence
                    forecastData={forecastSummary.allRecords}
                    historyData={processedData}
                    lang={lang}
                    standalone={true}
                />
            </div>
        );
    }

    return null;
};
