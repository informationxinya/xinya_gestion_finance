import React, { useState, useMemo } from 'react';
import { Search, AlertCircle } from 'lucide-react';
import { PredictedPayment, PurchaseRecord, Language } from '../types';
import { translations } from '../services/translations';
import { SearchableSelect } from './ui/SearchableSelect';

interface Props {
    forecastData: PredictedPayment[]; // All predictions (unpaid records enriched)
    historyData: PurchaseRecord[]; // Processed history data (for paid search)
    lang: Language;
    standalone?: boolean;
}

type DetailViewMode = 'PREDICTED' | 'ALL_UNPAID' | 'PAID_HISTORY' | 'CHECK_SEARCH';

interface PaidHistoryRecord extends PurchaseRecord {
    calculatedDifference: number;
    cumulativeDifference: number;
}

export const PaymentIntelligence: React.FC<Props> = ({ forecastData, historyData, lang }) => {
    const t = translations[lang];
    const [detailViewMode, setDetailViewMode] = useState<DetailViewMode>('PREDICTED');
    const [filterValue, setFilterValue] = useState<string>(''); // Company or Check Number

    // --- Data Processing for Detailed Tables ---

    // 1. Predicted Unpaid (Filtered by due this week)
    const predictedList = useMemo(() => {
        let data = forecastData.filter(r => r.isDueThisWeek);
        if (filterValue) {
            data = data.filter(r => r.companyName.toLowerCase().includes(filterValue.toLowerCase()));
        }
        return data.sort((a, b) => b.unpaidAmount - a.unpaidAmount);
    }, [forecastData, filterValue]);

    // 2. All Unpaid (All records with unpaid > 0)
    const allUnpaidList = useMemo(() => {
        // forecastData contains all unpaid records enriched
        let data = forecastData.filter(r => (r.unpaidAmount || 0) > 0.01); // Ensure unpaid amount is positive
        if (filterValue) {
            data = data.filter(r => r.companyName.toLowerCase().includes(filterValue.toLowerCase()));
        }
        // Sort by Company then Invoice Date
        return data.sort((a, b) => {
            if (a.companyName === b.companyName) {
                return a.invoiceDate.localeCompare(b.invoiceDate);
            }
            return a.companyName.localeCompare(b.companyName);
        });
    }, [forecastData, filterValue]);

    // 3. Paid History (From historyData)
    const paidHistoryList = useMemo(() => {
        // Filter by company name and only paid records (actualPaidAmount > 0 or checkDate exists)
        // Python: df_paid_days = df_gestion_unpaid[df_gestion_unpaid['开支票日期'].notna() & df_gestion_unpaid['发票日期'].notna()]
        let data = historyData.filter(r => r.checkDate && r.invoiceDate);

        if (filterValue) {
            data = data.filter(r => r.companyName.toLowerCase().includes(filterValue.toLowerCase()));
        }

        // Sort by Invoice Date DESC (Newest first)
        // Python: filtered_df = filtered_df.sort_values(by='发票日期', ascending=False)
        const sortedData = data.sort((a, b) => b.invoiceDate.localeCompare(a.invoiceDate));

        // Calculate Difference and Cumulative Difference
        // Python: result_df['付款差额'] = result_df['发票金额'] - result_df['实际支付金额']
        // Python: result_df['累计付款差额'] = (result_df['付款差额'].iloc[::-1].cumsum()[::-1].round(2))

        // 1. Calculate Difference for all
        const withDiff = sortedData.map(r => ({
            ...r,
            calculatedDifference: (r.invoiceAmount || 0) - (r.actualPaidAmount || 0)
        }));

        // 2. Calculate Cumulative (Reverse -> CumSum -> Reverse)
        // We can do this by iterating backwards
        const n = withDiff.length;
        const result: PaidHistoryRecord[] = new Array(n);
        let runningTotal = 0;

        for (let i = n - 1; i >= 0; i--) {
            runningTotal += withDiff[i].calculatedDifference;
            result[i] = {
                ...withDiff[i],
                cumulativeDifference: runningTotal
            };
        }

        return result;
    }, [historyData, filterValue]);

    // 4. Check Search
    const checkSearchList = useMemo(() => {
        if (!filterValue) return [];

        // Filter by Check Number
        const data = historyData.filter(r =>
            (r.checkNumber || '') === filterValue // Exact match only
        ).sort((a, b) => (b.checkDate || '').localeCompare(a.checkDate || ''));

        // Calculate Difference and Cumulative Difference
        // 1. Calculate Difference for all
        const withDiff = data.map(r => ({
            ...r,
            calculatedDifference: (r.invoiceAmount || 0) - (r.actualPaidAmount || 0)
        }));

        // 2. Calculate Cumulative (Reverse -> CumSum -> Reverse)
        const n = withDiff.length;
        const result: PaidHistoryRecord[] = new Array(n);
        let runningTotal = 0;

        for (let i = n - 1; i >= 0; i--) {
            runningTotal += withDiff[i].calculatedDifference;
            result[i] = {
                ...withDiff[i],
                cumulativeDifference: runningTotal
            };
        }

        return result;
    }, [historyData, filterValue]);

    // --- Render Helpers ---

    const renderPredicted = () => (
        <div className="overflow-x-auto">
            <div className="mb-4 w-full md:w-1/3">
                <SearchableSelect
                    label={t.table.searchCompany}
                    options={Array.from(new Set(forecastData.map(r => r.companyName))).sort()}
                    value={filterValue}
                    onChange={setFilterValue}
                    placeholder={t.table.searchCompany}
                    onClear={() => setFilterValue('')}
                />
            </div>
            {!filterValue ? (
                <div className="text-center py-12 text-gray-500 italic border border-dashed border-gray-800 rounded-lg">
                    {t.alerts.noData}
                </div>
            ) : (
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-400 uppercase bg-[#1a1a1a]">
                        <tr>
                            <th className="px-4 py-3">{t.labels.company}</th>
                            <th className="px-4 py-3">{t.labels.invoiceNo}</th>
                            <th className="px-4 py-3">{t.labels.invoiceDate}</th>
                            <th className="px-4 py-3 text-right">{t.labels.medianDays}</th>
                            <th className="px-4 py-3 text-right">{t.labels.predictedDate}</th>
                            <th className="px-4 py-3 text-right">{t.labels.unpaid}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {predictedList.map((item, idx) => (
                            <tr key={idx} className="border-b border-gray-800 hover:bg-white/5">
                                <td className="px-4 py-3 font-medium text-white">{item.companyName}</td>
                                <td className="px-4 py-3 font-mono text-gray-400">{item.invoiceNumber}</td>
                                <td className="px-4 py-3 font-mono">{item.invoiceDate.slice(0, 10)}</td>
                                <td className="px-4 py-3 text-right font-mono text-scifi-primary">{item.medianDays?.toFixed(0) || '-'}</td>
                                <td className="px-4 py-3 text-right font-mono text-scifi-warning">{item.predictedDate.slice(0, 10)}</td>
                                <td className="px-4 py-3 text-right font-mono text-white">${item.unpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                            </tr>
                        ))}
                        {predictedList.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">{t.alerts.noData}</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            )}
        </div>
    );

    const renderAllUnpaid = () => {
        // Calculate cumulative unpaid for the filtered list
        let cumulative = 0;
        return (
            <div className="overflow-x-auto">
                <div className="mb-4 w-full md:w-1/3">
                    <SearchableSelect
                        label={t.table.searchCompany}
                        options={Array.from(new Set(forecastData.map(r => r.companyName))).sort()}
                        value={filterValue}
                        onChange={setFilterValue}
                        placeholder={t.table.searchCompany}
                        onClear={() => setFilterValue('')}
                    />
                </div>
                {!filterValue ? (
                    <div className="text-center py-12 text-gray-500 italic border border-dashed border-gray-800 rounded-lg">
                        {t.alerts.noData}
                    </div>
                ) : (
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-400 uppercase bg-[#1a1a1a]">
                            <tr>
                                <th className="px-4 py-3">{t.labels.company}</th>
                                <th className="px-4 py-3">{t.labels.invoiceNo}</th>
                                <th className="px-4 py-3">{t.labels.invoiceDate}</th>
                                <th className="px-4 py-3 text-right">{t.labels.medianDays}</th>
                                <th className="px-4 py-3 text-right">{t.labels.predictedDate}</th>
                                <th className="px-4 py-3 text-right">{t.labels.unpaid}</th>
                                <th className="px-4 py-3 text-right text-gray-500">Cumulative</th>
                            </tr>
                        </thead>
                        <tbody>
                            {allUnpaidList.map((item, idx) => {
                                cumulative += item.unpaidAmount;
                                return (
                                    <tr key={idx} className="border-b border-gray-800 hover:bg-white/5">
                                        <td className="px-4 py-3 font-medium text-white">{item.companyName}</td>
                                        <td className="px-4 py-3 font-mono text-gray-400">{item.invoiceNumber}</td>
                                        <td className="px-4 py-3 font-mono">{item.invoiceDate.slice(0, 10)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-scifi-primary">{item.medianDays?.toFixed(0) || '-'}</td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-400">{item.predictedDate.slice(0, 10)}</td>
                                        <td className="px-4 py-3 text-right font-mono text-white">${item.unpaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                        <td className="px-4 py-3 text-right font-mono text-gray-500">${cumulative.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                    </tr>
                                );
                            })}
                            {allUnpaidList.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 italic">{t.alerts.noData}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        );
    };

    const renderPaidHistory = () => {
        const totalDiff = paidHistoryList.reduce((sum, item) => sum + item.calculatedDifference, 0);

        return (
            <div className="flex flex-col h-full">
                <div className="mb-4 w-full md:w-1/3">
                    <SearchableSelect
                        label="🔍 请输入或选择公司名称查看已开支票信息："
                        options={Array.from(new Set(historyData.map(r => r.companyName))).sort()}
                        value={filterValue}
                        onChange={setFilterValue}
                        placeholder="输入公司名称..."
                        onClear={() => setFilterValue('')}
                    />
                </div>

                {!filterValue ? (
                    <div className="text-center py-12 text-gray-500 italic border border-dashed border-gray-800 rounded-lg">
                        Please select a company to view details.
                    </div>
                ) : (
                    <>
                        {/* Summary Info Box */}
                        <div className="mb-4 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30 text-blue-200 font-mono text-sm flex items-center gap-4">
                            <AlertCircle className="w-5 h-5 text-blue-400" />
                            <div>
                                ⚠️ 提示：本公司累计付款差额为：<span className="font-bold text-white">{totalDiff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="ml-8 text-gray-400">
                                    负：我方多付 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 正：我方少付
                                </span>
                            </div>
                        </div>

                        <div className="overflow-auto max-h-[600px] border border-gray-800 rounded-lg relative">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-[#1a1a1a] sticky top-0 z-10 shadow-md">
                                    <tr>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">公司名称</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">发票号</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">发票日期</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">发票金额</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">付款支票号</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">实际支付金额</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">付款支票总额</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">开支票日期</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">银行对账日期</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">付款差额</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">累计付款差额</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paidHistoryList.map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-800 hover:bg-white/5">
                                            <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{item.companyName}</td>
                                            <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">{item.invoiceNumber}</td>
                                            <td className="px-4 py-3 font-mono whitespace-nowrap">{item.invoiceDate.slice(0, 10)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-white whitespace-nowrap">${item.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 font-mono text-scifi-primary whitespace-nowrap">{item.checkNumber}</td>
                                            <td className="px-4 py-3 text-right font-mono text-white whitespace-nowrap">${item.actualPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right font-mono text-scifi-success whitespace-nowrap">${(item.checkTotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 font-mono whitespace-nowrap">{item.checkDate?.slice(0, 10)}</td>
                                            <td className="px-4 py-3 font-mono whitespace-nowrap">{item.bankReconciliationDate?.slice(0, 10)}</td>
                                            <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${item.calculatedDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {item.calculatedDifference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-400 font-bold whitespace-nowrap">
                                                {item.cumulativeDifference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {paidHistoryList.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="px-4 py-8 text-center text-gray-500 italic">
                                                {t.alerts.noData}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        );
    };

    const renderCheckSearch = () => {
        const totalDiff = checkSearchList.reduce((sum, item) => sum + item.calculatedDifference, 0);

        return (
            <div className="flex flex-col h-full">
                <div className="mb-4 w-full md:w-1/3">
                    <SearchableSelect
                        label={t.table.searchCheck}
                        options={Array.from(new Set(historyData.filter(r => r.checkNumber).map(r => r.checkNumber!))).sort()}
                        value={filterValue}
                        onChange={setFilterValue}
                        placeholder={t.table.searchCheck}
                        onClear={() => setFilterValue('')}
                    />
                </div>
                {!filterValue ? (
                    <div className="text-center py-12 text-gray-500 italic border border-dashed border-gray-800 rounded-lg">
                        {t.alerts.noData}
                    </div>
                ) : (
                    <>
                        {/* Summary Info Box */}
                        <div className="mb-4 p-4 rounded-lg bg-blue-900/20 border border-blue-500/30 text-blue-200 font-mono text-sm flex items-center gap-4">
                            <AlertCircle className="w-5 h-5 text-blue-400" />
                            <div>
                                ⚠️ 提示：本支票累计付款差额为：<span className="font-bold text-white">{totalDiff.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                <span className="ml-8 text-gray-400">
                                    负：我方多付 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; 正：我方少付
                                </span>
                            </div>
                        </div>

                        <div className="overflow-auto max-h-[600px] border border-gray-800 rounded-lg relative">
                            <table className="w-full text-sm text-left text-gray-300">
                                <thead className="text-xs text-gray-400 uppercase bg-[#1a1a1a] sticky top-0 z-10 shadow-md">
                                    <tr>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">公司名称</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">发票号</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">发票日期</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">发票金额</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">付款支票号</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">实际支付金额</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">付款支票总额</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">开支票日期</th>
                                        <th className="px-4 py-3 bg-[#1a1a1a]">银行对账日期</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">付款差额</th>
                                        <th className="px-4 py-3 text-right bg-[#1a1a1a]">累计付款差额</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {checkSearchList.map((item, idx) => (
                                        <tr key={idx} className="border-b border-gray-800 hover:bg-white/5">
                                            <td className="px-4 py-3 font-medium text-white whitespace-nowrap">{item.companyName}</td>
                                            <td className="px-4 py-3 font-mono text-gray-400 whitespace-nowrap">{item.invoiceNumber}</td>
                                            <td className="px-4 py-3 font-mono whitespace-nowrap">{item.invoiceDate.slice(0, 10)}</td>
                                            <td className="px-4 py-3 text-right font-mono text-white whitespace-nowrap">${item.invoiceAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 font-mono text-scifi-primary whitespace-nowrap">{item.checkNumber}</td>
                                            <td className="px-4 py-3 text-right font-mono text-white whitespace-nowrap">${item.actualPaidAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 text-right font-mono text-scifi-success whitespace-nowrap">${(item.checkTotalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                            <td className="px-4 py-3 font-mono whitespace-nowrap">{item.checkDate?.slice(0, 10)}</td>
                                            <td className="px-4 py-3 font-mono whitespace-nowrap">{item.bankReconciliationDate?.slice(0, 10)}</td>
                                            <td className={`px-4 py-3 text-right font-mono font-bold whitespace-nowrap ${item.calculatedDifference > 0 ? 'text-red-400' : 'text-green-400'}`}>
                                                {item.calculatedDifference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                            <td className="px-4 py-3 text-right font-mono text-gray-400 font-bold whitespace-nowrap">
                                                {item.cumulativeDifference.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </td>
                                        </tr>
                                    ))}
                                    {checkSearchList.length === 0 && (
                                        <tr>
                                            <td colSpan={11} className="px-4 py-8 text-center text-gray-500 italic">
                                                {t.alerts.noData}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Detailed Tables Container (No Expander) */}
            <div className="border border-scifi-border rounded-xl overflow-hidden bg-[#0f172a]/50">
                <div className="p-4 animate-in slide-in-from-top-2">
                    {/* View Switcher */}
                    <div className="flex flex-wrap gap-2 mb-6">
                        {[
                            { id: 'PREDICTED', label: t.table.mode1 },
                            { id: 'ALL_UNPAID', label: t.table.mode2 },
                            { id: 'PAID_HISTORY', label: t.table.mode3 },
                            { id: 'CHECK_SEARCH', label: t.table.mode4 },
                        ].map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => {
                                    setDetailViewMode(mode.id as DetailViewMode);
                                    setFilterValue(''); // Reset filter on mode change
                                }}
                                className={`px-3 py-1.5 rounded text-xs font-mono transition-colors ${detailViewMode === mode.id
                                    ? 'bg-scifi-primary text-black font-bold'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                                    }`}
                            >
                                {mode.label}
                            </button>
                        ))}
                    </div>

                    {/* Content */}
                    <div className="min-h-[300px]">
                        {detailViewMode === 'PREDICTED' && renderPredicted()}
                        {detailViewMode === 'ALL_UNPAID' && renderAllUnpaid()}
                        {detailViewMode === 'PAID_HISTORY' && renderPaidHistory()}
                        {detailViewMode === 'CHECK_SEARCH' && renderCheckSearch()}
                    </div>
                </div>
            </div>
        </div>
    );
};
