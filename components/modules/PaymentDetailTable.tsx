import React from 'react';
import { PurchaseRecord } from '../../types';

interface Props {
    data: PurchaseRecord[];
    companyName: string;
    date: string;
}

export const PaymentDetailTable: React.FC<Props> = ({ data, companyName, date }) => {
    if (!data || data.length === 0) return null;

    // Calculate totals
    const totalAmount = data.reduce((sum, r) => sum + r.invoiceAmount, 0);
    const totalPaid = data.reduce((sum, r) => sum + (r.actualPaidAmount || 0), 0);

    return (
        <div className="mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-scifi-card/50 backdrop-blur-md border border-scifi-primary/30 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                <div className="px-6 py-4 border-b border-scifi-primary/20 flex justify-between items-center bg-scifi-primary/5">
                    <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <span className="text-scifi-accent">🏢 {companyName}</span>
                            <span className="text-gray-400 text-sm font-mono">|</span>
                            <span className="text-scifi-primary">📅 {date}</span>
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                            共 {data.length} 笔交易 | 总金额: <span className="text-white font-mono">${totalAmount.toLocaleString()}</span>
                        </p>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-scifi-bg/80 text-xs uppercase text-gray-400 font-mono">
                            <tr>
                                <th className="px-4 py-3 font-medium">公司名称</th>
                                <th className="px-4 py-3 font-medium">部门</th>
                                <th className="px-4 py-3 font-medium">发票号</th>
                                <th className="px-4 py-3 font-medium">发票日期</th>
                                <th className="px-4 py-3 font-medium text-right">发票金额</th>
                                <th className="px-4 py-3 font-medium text-right">TPS</th>
                                <th className="px-4 py-3 font-medium text-right">TVQ</th>
                                <th className="px-4 py-3 font-medium">付款支票号</th>
                                <th className="px-4 py-3 font-medium text-right">实际支付金额</th>
                                <th className="px-4 py-3 font-medium text-right">付款支票总额</th>
                                <th className="px-4 py-3 font-medium">银行对账日期</th>
                                <th className="px-4 py-3 font-medium">开支票日期</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-scifi-border/30">
                            {data.map((record, index) => (
                                <tr
                                    key={record.id || index}
                                    className="hover:bg-white/5 transition-colors group"
                                >
                                    <td className="px-4 py-3 text-gray-300">{record.companyName}</td>
                                    <td className="px-4 py-3 text-gray-300">{record.department}</td>
                                    <td className="px-4 py-3 font-mono text-scifi-primary">{record.invoiceNumber}</td>
                                    <td className="px-4 py-3 font-mono text-gray-400">{record.invoiceDate?.slice(0, 10)}</td>
                                    <td className="px-4 py-3 font-mono text-right text-white font-bold">
                                        ${record.invoiceAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-right text-gray-400">
                                        {record.tps !== undefined && record.tps !== null ? `$${record.tps.toFixed(2)}` : ''}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-right text-gray-400">
                                        {record.tvq !== undefined && record.tvq !== null ? `$${record.tvq.toFixed(2)}` : ''}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-scifi-accent">{record.checkNumber || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-right text-scifi-success">
                                        {record.actualPaidAmount ? `$${record.actualPaidAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-right text-gray-300">
                                        {record.checkTotalAmount ? `$${record.checkTotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                                    </td>
                                    <td className="px-4 py-3 font-mono text-gray-400">{record.bankReconciliationDate?.slice(0, 10) || '-'}</td>
                                    <td className="px-4 py-3 font-mono text-gray-400">{record.checkDate?.slice(0, 10) || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div >
        </div >
    );
};
