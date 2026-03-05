import React, { useState, useMemo } from 'react';
import {
    ScatterChart,
    Scatter,
    XAxis,
    YAxis,
    ZAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell
} from 'recharts';
import { PaymentProgressData, Language } from '../../types';
import { translations } from '../../services/translations';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentProgressChartProps {
    data: PaymentProgressData;
    lang: Language;
}

const CustomTooltip = ({ active, payload, lang }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const t = translations[lang];

        return (
            <div className="bg-[#0f172a]/95 border border-scifi-border p-4 rounded-lg shadow-xl backdrop-blur max-w-sm z-50">
                <h4 className="font-bold text-white mb-2 pb-2 border-b border-white/10">{data.companyName}</h4>

                <div className="space-y-1 text-sm">
                    <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                        <span className="text-gray-400">付款支票号</span>
                        <span className="text-scifi-accent font-mono">{data.checkNumber}</span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                        <span className="text-gray-400">付款支票总额</span>
                        <span className="text-scifi-success font-mono font-bold">
                            ${Number(data.checkTotalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                    <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                        <span className="text-gray-400">开支票日期</span>
                        <span className="text-gray-200">{data.checkDate}</span>
                    </div>
                    {data.bankReconciliationDate && (
                        <div className="flex justify-between items-center bg-white/5 p-1 rounded">
                            <span className="text-gray-400">银行对账日期</span>
                            <span className="text-gray-200">{data.bankReconciliationDate}</span>
                        </div>
                    )}
                </div>

                <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-xs text-scifi-primary mb-2 font-semibold">包含的发票明细 ({data.invoices.length}张):</p>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                        {data.invoices.map((inv: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-xs">
                                <span className="text-gray-400">{inv.invoiceNumber}</span>
                                <span className="text-gray-200">${Number(inv.invoiceAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

export const PaymentProgressChart: React.FC<PaymentProgressChartProps> = ({ data, lang }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const ITEMS_PER_PAGE = 20;

    const totalPages = Math.ceil(data.sortedCompanies.length / ITEMS_PER_PAGE);

    // Reset page if company list changes drastically
    React.useEffect(() => {
        setCurrentPage(0);
    }, [data.sortedCompanies]);

    const currentCompanies = useMemo(() => {
        const start = currentPage * ITEMS_PER_PAGE;
        return data.sortedCompanies.slice(start, start + ITEMS_PER_PAGE);
    }, [data.sortedCompanies, currentPage]);

    const filteredData = useMemo(() => {
        return data.chartData.filter(d => currentCompanies.includes(d.companyName));
    }, [data.chartData, currentCompanies]);

    const dateFormatter = (tickItem: number) => {
        return format(new Date(tickItem), 'MM/dd');
    };

    if (!data || data.chartData.length === 0) {
        return (
            <div className="h-[500px] flex items-center justify-center text-gray-400 italic">
                暂无符合条件的付款数据 (No data available)
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[500px]">
            <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.5} />
                    <XAxis
                        type="number"
                        dataKey="checkDateMs"
                        name="Date"
                        domain={['auto', 'auto']}
                        tickFormatter={dateFormatter}
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 12 }}
                        scale="time"
                    />
                    <YAxis
                        type="category"
                        dataKey="companyName"
                        name="Company"
                        allowDuplicatedCategory={false}
                        stroke="#94a3b8"
                        tick={{ fill: '#94a3b8', fontSize: 11 }}
                        width={90}
                    />
                    <ZAxis type="number" dataKey="checkTotalAmount" range={[60, 400]} />
                    <Tooltip
                        content={<CustomTooltip lang={lang} />}
                        cursor={{ strokeDasharray: '3 3', stroke: '#3b82f6', opacity: 0.2 }}
                    />
                    <Scatter data={filteredData} fill="#10b981">
                        {filteredData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.bankReconciliationDate ? '#10b981' : '#f59e0b'} opacity={0.8} />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-2">
                    <button
                        onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                        disabled={currentPage === 0}
                        className="p-1 rounded bg-scifi-card border border-scifi-border text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs text-gray-400 font-mono">
                        {currentPage + 1} / {totalPages}
                    </span>

                    <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                        disabled={currentPage === totalPages - 1}
                        className="p-1 rounded bg-scifi-card border border-scifi-border text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
            <div className="flex justify-center mt-2 gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981] opacity-80"></div><span className="text-gray-400">已对账 (Reconciled)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f59e0b] opacity-80"></div><span className="text-gray-400">未对账 (Pending)</span></div>
            </div>
        </div>
    );
};
