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
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { format } from 'date-fns';

interface PaymentProgressChartProps {
    data: PaymentProgressData;
    lang: Language;
}

// Minimal hover tooltip
const MinimalTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-[#0f172a]/95 border border-scifi-border p-3 rounded-lg shadow-xl backdrop-blur text-sm z-50">
                <p className="font-bold text-white mb-1">{data.companyName}</p>
                <p className="text-gray-300">支票总额: <span className="text-scifi-success font-mono">${Number(data.checkTotalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
                <p className="text-xs text-scifi-primary mt-1">👆 点击查看明细与发票列表</p>
            </div>
        );
    }
    return null;
};

// Interactive Click Popup
const DetailPopup = ({ data, onClose }: { data: any, onClose: () => void }) => {
    return (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-[#0f172a]/95 border border-scifi-border p-5 rounded-lg shadow-2xl backdrop-blur-md w-full max-w-sm z-50 animate-in fade-in zoom-in duration-200">
            <button
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 p-1 rounded-full cursor-pointer"
            >
                <X className="w-5 h-5" />
            </button>
            <h4 className="font-bold text-white mb-3 pb-2 border-b border-white/10 pr-6">{data.companyName}</h4>

            <div className="space-y-1.5 text-sm">
                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                    <span className="text-gray-400">付款支票号</span>
                    <span className="text-scifi-accent font-mono">{data.checkNumber}</span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                    <span className="text-gray-400">付款支票总额</span>
                    <span className="text-scifi-success font-mono font-bold">
                        ${Number(data.checkTotalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                </div>
                <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                    <span className="text-gray-400">开支票日期</span>
                    <span className="text-gray-200">{data.checkDate}</span>
                </div>
                {data.bankReconciliationDate && (
                    <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                        <span className="text-gray-400">银行对账日期</span>
                        <span className="text-gray-200">{data.bankReconciliationDate}</span>
                    </div>
                )}
            </div>

            <div className="mt-4 pt-3 border-t border-white/10">
                <p className="text-sm text-scifi-primary mb-2 font-semibold">包含的发票明细 ({data.invoices.length}张):</p>
                {/* Ensure pointer-events-auto so scrolling works within the absolute overlay */}
                <div className="max-h-40 overflow-y-auto space-y-1 pr-2 custom-scrollbar pointer-events-auto">
                    {data.invoices.map((inv: any, idx: number) => (
                        <div key={idx} className="flex justify-between text-xs p-1.5 hover:bg-white/5 rounded transition-colors">
                            <span className="text-gray-400">{inv.invoiceNumber}</span>
                            <span className="text-gray-200">${Number(inv.invoiceAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export const PaymentProgressChart: React.FC<PaymentProgressChartProps> = ({ data, lang }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [selectedPoint, setSelectedPoint] = useState<any>(null);
    const ITEMS_PER_PAGE = 20;

    const totalPages = Math.ceil(data.sortedCompanies.length / ITEMS_PER_PAGE);

    // Reset page if company list changes drastically
    React.useEffect(() => {
        setCurrentPage(0);
        setSelectedPoint(null); // Close popup on data change
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

    const handlePointClick = (eventData: any) => {
        if (eventData && eventData.payload) {
            setSelectedPoint(eventData.payload);
        } else if (eventData && eventData.companyName) {
            setSelectedPoint(eventData); // Fallback depending on Recharts event structure
        }
    };

    if (!data || data.chartData.length === 0) {
        return (
            <div className="h-[500px] flex items-center justify-center text-gray-400 italic">
                暂无符合条件的付款数据 (No data available)
            </div>
        );
    }

    return (
        <div className="relative flex flex-col h-[500px]">
            {/* Modal Overlay to close when clicking outside of the popup */}
            {selectedPoint && (
                <div
                    className="absolute inset-0 z-40 bg-[#00000020] cursor-pointer"
                    onClick={() => setSelectedPoint(null)}
                />
            )}

            {/* Selected Point Details Popup */}
            {selectedPoint && (
                <DetailPopup
                    data={selectedPoint}
                    onClose={() => setSelectedPoint(null)}
                />
            )}

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
                        content={<MinimalTooltip />}
                        cursor={{ strokeDasharray: '3 3', stroke: '#3b82f6', opacity: 0.2 }}
                        isAnimationActive={false} // Improves responsiveness
                    />
                    <Scatter
                        data={filteredData}
                        fill="#10b981"
                        onClick={handlePointClick}
                        className="cursor-pointer hover:opacity-100 transition-opacity"
                    >
                        {filteredData.map((entry, index) => (
                            <Cell
                                key={`cell-${index}`}
                                fill={entry.bankReconciliationDate ? '#10b981' : '#f59e0b'}
                                opacity={selectedPoint && selectedPoint.checkNumber === entry.checkNumber ? 1 : 0.8}
                                stroke={selectedPoint && selectedPoint.checkNumber === entry.checkNumber ? '#ffffff' : 'none'}
                                strokeWidth={selectedPoint && selectedPoint.checkNumber === entry.checkNumber ? 2 : 0}
                            />
                        ))}
                    </Scatter>
                </ScatterChart>
            </ResponsiveContainer>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-2">
                    <button
                        onClick={() => {
                            setCurrentPage(p => Math.max(0, p - 1));
                            setSelectedPoint(null);
                        }}
                        disabled={currentPage === 0}
                        className="p-1 rounded bg-scifi-card border border-scifi-border text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </button>

                    <span className="text-xs text-gray-400 font-mono">
                        {currentPage + 1} / {totalPages}
                    </span>

                    <button
                        onClick={() => {
                            setCurrentPage(p => Math.min(totalPages - 1, p + 1));
                            setSelectedPoint(null);
                        }}
                        disabled={currentPage === totalPages - 1}
                        className="p-1 rounded bg-scifi-card border border-scifi-border text-gray-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            )}
            <div className="flex justify-center mt-2 gap-4 text-xs font-mono relative z-10">
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#10b981] opacity-80"></div><span className="text-gray-400">已对账 (Reconciled)</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#f59e0b] opacity-80"></div><span className="text-gray-400">未对账 (Pending)</span></div>
            </div>
        </div>
    );
};
