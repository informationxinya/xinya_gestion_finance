import React, { useState, useMemo } from 'react';
import { AlertTriangle, ArrowLeft, Database, Search, Building2, PieChart } from 'lucide-react';
import { UnpaidSummary, Language } from '../../types';
import { UnpaidDeptChart, UnpaidCompanyChart } from '../charts/UnpaidCharts';
import { translations } from '../../services/translations';
import { GlassCard } from '../ui/GlassCard';
import { SearchableSelect } from '../ui/SearchableSelect';

interface UnpaidDashboardProps {
    unpaidSummary: UnpaidSummary;
    lang: Language;
}

type ViewMode = 'DEPT' | 'COMPANY' | 'DETAILS';
type SearchMode = 'BY_DEPT' | 'BY_COMPANY';

export const UnpaidDashboard: React.FC<UnpaidDashboardProps> = ({ unpaidSummary, lang }) => {
    const [searchMode, setSearchMode] = useState<SearchMode>('BY_DEPT');
    const [viewMode, setViewMode] = useState<ViewMode>('DEPT');
    const [selectedDept, setSelectedDept] = useState<string>('');
    const [selectedCompany, setSelectedCompany] = useState<string>('');
    const t = translations[lang];

    // Extract unique companies for search
    const allCompanies = useMemo(() => {
        if (!unpaidSummary.details) return [];
        return Array.from(new Set(unpaidSummary.details.map(r => r.companyName))).sort();
    }, [unpaidSummary]);

    // Filter data for the detail table
    const detailData = useMemo(() => {
        if (!selectedCompany || !unpaidSummary.details) return [];

        const sorted = unpaidSummary.details.filter(item => {
            const matchCompany = item.companyName === selectedCompany;
            // If searching by company directly, ignore department filter
            const matchDept = searchMode === 'BY_DEPT' ? item.department === selectedDept : true;
            return matchCompany && matchDept;
        }).sort((a, b) => {
            // Sort by Invoice Date (Ascending)
            const dateA = a.invoiceDate || '';
            const dateB = b.invoiceDate || '';
            if (dateA !== dateB) {
                return dateA.localeCompare(dateB);
            }
            // Then by Invoice Number (Ascending)
            const invoiceA = a.invoiceNumber || '';
            const invoiceB = b.invoiceNumber || '';
            return invoiceA.localeCompare(invoiceB, undefined, { numeric: true });
        });

        // Calculate cumulative unpaid
        let runningTotal = 0;
        return sorted.map(item => {
            const invoiceAmount = item.invoiceAmount || 0;
            const actualPaid = item.actualPaidAmount || 0;
            const difference = invoiceAmount - actualPaid;
            runningTotal += difference;
            return {
                ...item,
                calculatedDifference: difference,
                cumulativeUnpaid: runningTotal
            };
        });
    }, [unpaidSummary, selectedCompany, selectedDept, searchMode]);

    const handleCompanySelect = (company: string) => {
        setSelectedCompany(company);
        if (company) {
            setViewMode('DETAILS');
        } else {
            setViewMode('DEPT'); // Reset if cleared
        }
    };

    const renderDetailTable = () => (
        <div className="overflow-x-auto">
            {/* Legend/Hint for Difference values */}
            <div className="mb-4 p-3 rounded-lg bg-blue-900/20 border border-blue-500/30 text-blue-200 font-mono text-sm flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-blue-400" />
                <span>
                    提示：差额及累计未付金额 <span className="text-scifi-success font-bold mx-1">负 (-)</span> = 我方多付，
                    <span className="text-scifi-danger font-bold mx-1">正 (+)</span> = 我方应付
                </span>
            </div>

            <table className="w-full text-sm text-left">
                <thead className="text-xs text-scifi-accent uppercase bg-scifi-primary/10 border-b border-scifi-primary/20 font-mono">
                    <tr>
                        <th className="px-6 py-4">公司名称</th>
                        <th className="px-6 py-4">部门</th>
                        <th className="px-6 py-4">发票号</th>
                        <th className="px-6 py-4">发票日期</th>
                        <th className="px-6 py-4 text-right">发票金额</th>
                        <th className="px-6 py-4 text-right">TPS</th>
                        <th className="px-6 py-4 text-right">TVQ</th>
                        <th className="px-6 py-4 text-right">实际支付金额</th>
                        <th className="px-6 py-4 text-right">差额</th>
                        <th className="px-6 py-4 text-right">累计未付金额</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-scifi-border/50">
                    {detailData.map((row: any, index) => (
                        <tr key={index} className="hover:bg-white/5 transition-colors group">
                            <td className="px-6 py-4 font-medium text-white group-hover:text-scifi-primary transition-colors">
                                {row.companyName}
                            </td>
                            <td className="px-6 py-4 text-gray-400">{row.department}</td>
                            <td className="px-6 py-4 font-mono text-scifi-text">{row.invoiceNumber}</td>
                            <td className="px-6 py-4 font-mono text-gray-400">{row.invoiceDate}</td>
                            <td className="px-6 py-4 text-right font-mono text-scifi-danger font-bold">
                                ${(row.invoiceAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-500">
                                ${(row.tps || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-gray-500">
                                ${(row.tvq || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-white">
                                ${(row.actualPaidAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-scifi-warning">
                                ${(row.calculatedDifference || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-scifi-danger">
                                ${(row.cumulativeUnpaid || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                        </tr>
                    ))}
                    {detailData.length === 0 && (
                        <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-gray-500 font-mono">
                                {selectedCompany ? "No records found for this selection." : "Please select a company to view details."}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in zoom-in duration-300">
            {/* Header Area with Total & Mode Switch */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Total Card */}
                <div className="relative overflow-hidden rounded-xl bg-[#0f172a] border border-scifi-danger/50 p-6 shadow-[0_0_30px_rgba(239,68,68,0.1)]">
                    <div className="absolute top-0 left-0 w-1 h-full bg-scifi-danger"></div>
                    <div className="absolute -right-10 -top-10 w-40 h-40 bg-scifi-danger/10 rounded-full blur-3xl"></div>
                    <div className="relative z-10">
                        <h3 className="text-scifi-danger text-sm font-mono uppercase tracking-widest mb-1 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {t.headers.unpaidTotal}
                        </h3>
                        <div className="text-4xl font-bold text-white tracking-tighter filter drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
                            ${unpaidSummary.totalUnpaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                    </div>
                </div>

                {/* Mode Switcher */}
                <div className="flex flex-col justify-center">
                    <div className="bg-[#0f172a]/50 p-1 rounded-lg border border-scifi-border flex gap-1">
                        <button
                            onClick={() => {
                                setSearchMode('BY_DEPT');
                                setViewMode('DEPT');
                                setSelectedDept('');
                                setSelectedCompany('');
                            }}
                            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${searchMode === 'BY_DEPT'
                                ? 'bg-scifi-danger text-white shadow-lg shadow-scifi-danger/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <PieChart className="w-4 h-4" />
                            按部门分析
                        </button>
                        <button
                            onClick={() => {
                                setSearchMode('BY_COMPANY');
                                setViewMode('DEPT'); // Reset view, but show search
                                setSelectedDept('');
                                setSelectedCompany('');
                            }}
                            className={`flex-1 py-3 px-4 rounded-md text-sm font-medium transition-all duration-200 flex items-center justify-center gap-2 ${searchMode === 'BY_COMPANY'
                                ? 'bg-scifi-primary text-black shadow-lg shadow-scifi-primary/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Building2 className="w-4 h-4" />
                            按公司查询
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="animate-in slide-in-from-right duration-300">

                {/* Navigation & Breadcrumbs */}
                <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-2">
                        {/* Back Button Logic */}
                        {searchMode === 'BY_DEPT' && viewMode === 'COMPANY' && (
                            <button
                                onClick={() => {
                                    setViewMode('DEPT');
                                    setSelectedDept('');
                                }}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Departments
                            </button>
                        )}
                        {/* Back from Details */}
                        {viewMode === 'DETAILS' && (
                            <button
                                onClick={() => {
                                    if (searchMode === 'BY_DEPT') {
                                        setViewMode('COMPANY');
                                        setSelectedCompany('');
                                    } else {
                                        // In Company Search mode, "Back" clears the selection
                                        setSelectedCompany('');
                                        setViewMode('DEPT'); // Go back to search state
                                    }
                                }}
                                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-mono uppercase"
                            >
                                <ArrowLeft className="w-4 h-4" /> {searchMode === 'BY_DEPT' ? 'Back to Companies' : 'Clear Selection'}
                            </button>
                        )}
                    </div>

                    {/* Breadcrumbs */}
                    <div className="flex gap-2">
                        {selectedDept && (
                            <div className="px-4 py-2 bg-scifi-danger/20 border border-scifi-danger/50 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                <span className="text-sm font-bold text-scifi-danger tracking-wide">{selectedDept}</span>
                            </div>
                        )}
                        {selectedCompany && (
                            <div className="px-4 py-2 bg-scifi-primary/20 border border-scifi-primary/50 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                <span className="text-sm font-bold text-scifi-primary tracking-wide">{selectedCompany}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content Card */}
                <GlassCard className={`min-h-[500px] ${searchMode === 'BY_DEPT' ? 'border-scifi-danger/30' : 'border-scifi-primary/30'}`}>

                    {/* Header inside Card */}
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            {searchMode === 'BY_DEPT' ? (
                                <>
                                    {viewMode === 'DEPT' && <><AlertTriangle className="w-5 h-5 text-scifi-danger" /> {t.headers.unpaidDeptTitle}</>}
                                    {viewMode === 'COMPANY' && <><Database className="w-5 h-5 text-scifi-danger" /> {t.headers.unpaidCompTitle}</>}
                                    {viewMode === 'DETAILS' && <><Database className="w-5 h-5 text-scifi-primary" /> Unpaid Invoices Detail</>}
                                </>
                            ) : (
                                <>
                                    <Search className="w-5 h-5 text-scifi-primary" />
                                    Company Search
                                </>
                            )}
                        </h2>

                        {/* Search Input for Company Mode */}
                        {searchMode === 'BY_COMPANY' && (
                            <div className="w-72">
                                <SearchableSelect
                                    options={allCompanies}
                                    value={selectedCompany}
                                    onChange={handleCompanySelect}
                                    placeholder="Search company..."
                                />
                            </div>
                        )}
                    </div>

                    {/* Content Rendering */}
                    {searchMode === 'BY_DEPT' && (
                        <>
                            {viewMode === 'DEPT' && (
                                <UnpaidDeptChart
                                    data={unpaidSummary}
                                    onBarClick={(dept) => {
                                        setSelectedDept(dept);
                                        setViewMode('COMPANY');
                                    }}
                                />
                            )}
                            {viewMode === 'COMPANY' && (
                                <UnpaidCompanyChart
                                    data={unpaidSummary}
                                    selectedDept={selectedDept}
                                    onBarClick={(company) => {
                                        setSelectedCompany(company);
                                        setViewMode('DETAILS');
                                    }}
                                />
                            )}
                            {viewMode === 'DETAILS' && renderDetailTable()}
                        </>
                    )}

                    {searchMode === 'BY_COMPANY' && (
                        <>
                            {!selectedCompany ? (
                                <div className="h-96 flex flex-col items-center justify-center text-gray-500">
                                    <Search className="w-16 h-16 mb-4 opacity-20" />
                                    <p className="font-mono text-lg">Select a company to view unpaid details</p>
                                </div>
                            ) : (
                                renderDetailTable()
                            )}
                        </>
                    )}

                </GlassCard>
            </div>
        </div>
    );
};
