import React, { useState } from 'react';
import { Upload, Trash2, CheckCircle, Loader2, Lock, AlertCircle } from 'lucide-react';
import { GlassCard } from './ui/GlassCard';
import { supabase } from '../services/supabase';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';

interface AdminUploadProps {
    onUploadSuccess?: () => void;
}

export const AdminUpload: React.FC<AdminUploadProps> = ({ onUploadSuccess }) => {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loginError, setLoginError] = useState('');

    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [dbStatus, setDbStatus] = useState<'checking' | 'empty' | 'has_data'>('checking');

    React.useEffect(() => {
        if (isLoggedIn) {
            checkDbStatus();
        }
    }, [isLoggedIn]);

    const checkDbStatus = async () => {
        try {
            const { count, error } = await supabase
                .from('finance_data')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;
            setDbStatus(count === 0 ? 'empty' : 'has_data');
        } catch (err) {
            console.error("Failed to check DB status", err);
        }
    };

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === 'admin' && password === 'xinya-888') {
            setIsLoggedIn(true);
            setLoginError('');
        } else {
            setLoginError('Invalid credentials');
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setStatus(null);
        }
    };

    const handleDeleteAll = async () => {
        if (!window.confirm('Are you sure you want to delete ALL data? This cannot be undone.')) return;

        setIsDeleting(true);
        setStatus({ type: 'info', message: 'Deleting old data...' });

        try {
            const { error } = await supabase.from('finance_data').delete().neq('id', 0); // Delete all rows
            if (error) throw error;
            // setStatus({ type: 'success', message: 'All old data deleted successfully.' }); // Removed persistent message
            setStatus(null); // Clear status
            setDbStatus('empty'); // Update indicator
        } catch (err: any) {
            setStatus({ type: 'error', message: `Delete failed: ${err.message}` });
        } finally {
            setIsDeleting(false);
        }
    };

    const processExcelDate = (val: any): string | null => {
        if (!val) return null;
        if (val instanceof Date) return format(val, 'yyyy-MM-dd');
        // If string, try to parse
        const d = new Date(val);
        if (!isNaN(d.getTime())) return format(d, 'yyyy-MM-dd');
        return String(val); // Fallback
    };

    const handleUpload = async () => {
        if (!file) return;
        setIsUploading(true);
        setStatus({ type: 'info', message: 'Reading file...' });

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { cellDates: true });

            const sheetName = '数据源';
            const sheet = workbook.Sheets[sheetName];

            if (!sheet) {
                throw new Error(`Sheet "${sheetName}" not found in the Excel file.`);
            }

            const jsonData = XLSX.utils.sheet_to_json(sheet);

            if (jsonData.length === 0) {
                throw new Error('Sheet is empty.');
            }

            setStatus({ type: 'info', message: `Parsing ${jsonData.length} records...` });

            const mappedData = jsonData.map((row: any) => ({
                company_name: row['公司名称'],
                department: row['部门'],
                invoice_number: row['发票号'],
                invoice_date: processExcelDate(row['发票日期']),
                invoice_amount: row['发票金额'] || 0,
                tps: row['TPS'] || 0,
                tvq: row['TVQ'] || 0,
                net_amount: row['税后净值'] || 0,
                check_number: row['付款支票号'],
                clear_flag: row['特殊标记清除'],
                actual_paid_amount: row['实际支付金额'] || 0,
                check_total_amount: row['付款支票总额'] || 0,
                check_date: processExcelDate(row['开支票日期']),
                check_mailed_date: processExcelDate(row['支票寄出日期']),
                bank_reconciliation_date: processExcelDate(row['银行对账日期']),
                bank_reconciliation_note: row['银行对账日期备注'],
                difference: row['差额'] || 0,
                remarks: row['备注']
            }));

            // Insert in chunks to avoid payload limits
            const chunkSize = 100;
            for (let i = 0; i < mappedData.length; i += chunkSize) {
                const chunk = mappedData.slice(i, i + chunkSize);
                const { error } = await supabase.from('finance_data').insert(chunk);
                if (error) throw error;
                setStatus({ type: 'info', message: `Uploaded ${Math.min(i + chunkSize, mappedData.length)} / ${mappedData.length} records...` });
            }

            setStatus({ type: 'success', message: 'Upload complete! Dashboard updated.' });
            setDbStatus('has_data'); // Update indicator
            setFile(null);
            if (onUploadSuccess) {
                onUploadSuccess();
            }

        } catch (err: any) {
            console.error(err);
            setStatus({ type: 'error', message: `Upload failed: ${err.message}` });
        } finally {
            setIsUploading(false);
        }
    };

    if (!isLoggedIn) {
        return (
            <GlassCard title="Admin Access" className="max-w-md mx-auto mt-10 border-scifi-primary/30">
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <div>
                        <label className="text-xs text-scifi-accent uppercase mb-1 block">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            className="w-full bg-scifi-bg/50 border border-scifi-border rounded p-2 text-white focus:border-scifi-primary outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-scifi-accent uppercase mb-1 block">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            className="w-full bg-scifi-bg/50 border border-scifi-border rounded p-2 text-white focus:border-scifi-primary outline-none"
                        />
                    </div>
                    {loginError && <p className="text-red-400 text-sm">{loginError}</p>}
                    <button type="submit" className="bg-scifi-primary text-white py-2 rounded hover:bg-blue-600 transition-colors">
                        Login
                    </button>
                </form>
            </GlassCard>
        );
    }

    return (
        <GlassCard title="Data Management Node (Admin)" className="border-scifi-warning/30">
            <div className="flex flex-col gap-6">
                <div className="bg-scifi-bg/50 p-4 rounded-lg border border-scifi-border">
                    <h4 className="text-sm font-semibold text-scifi-muted mb-2 uppercase tracking-widest">Operation Protocol</h4>
                    <ol className="list-decimal list-inside text-sm text-gray-400 space-y-1">
                        <li>Delete existing source data (Clear Database).</li>
                        <li>Upload updated Excel/CSV file (Target: '数据源').</li>
                        <li>System will auto-sync dashboard visuals.</li>
                    </ol>
                </div>

                <div className="flex items-center justify-between bg-slate-900/50 p-4 rounded-lg border border-scifi-border/50">
                    <button
                        onClick={handleDeleteAll}
                        disabled={isDeleting}
                        className="flex items-center gap-2 px-4 py-2 bg-red-900/30 text-red-400 border border-red-800 rounded hover:bg-red-900/50 transition-colors text-sm disabled:opacity-50"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        Purge Database
                    </button>

                    {/* Database Status Indicator */}
                    <div className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-2 border shadow-lg transition-all duration-500 ${dbStatus === 'empty' ? 'bg-red-500/10 border-red-500/50 text-red-400 shadow-red-900/20' :
                            dbStatus === 'has_data' ? 'bg-green-500/10 border-green-500/50 text-green-400 shadow-green-900/20' :
                                'bg-gray-500/10 border-gray-500/50 text-gray-400'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${dbStatus === 'empty' ? 'bg-red-500 animate-pulse' :
                                dbStatus === 'has_data' ? 'bg-green-500' : 'bg-gray-500'
                            }`} />
                        {dbStatus === 'empty' ? 'DATABASE EMPTY (READY FOR UPLOAD)' :
                            dbStatus === 'has_data' ? 'DATABASE ACTIVE' : 'CHECKING STATUS...'}
                    </div>
                </div>

                <div className="border-2 border-dashed border-scifi-border rounded-xl p-8 flex flex-col items-center justify-center bg-scifi-bg/20 hover:border-scifi-primary/50 transition-all group relative">
                    <input
                        type="file"
                        accept=".xlsx, .xls"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="p-3 bg-scifi-card rounded-full mb-3 group-hover:scale-110 transition-transform">
                        {status?.type === 'success' ? <CheckCircle className="w-8 h-8 text-scifi-success" /> : <Upload className="w-8 h-8 text-scifi-primary" />}
                    </div>
                    <p className="text-sm text-gray-300 font-medium">
                        {file ? file.name : "Drop Excel file here or click to upload"}
                    </p>
                </div>

                {file && status?.type !== 'success' && (
                    <button
                        onClick={handleUpload}
                        disabled={isUploading}
                        className="w-full py-2 bg-scifi-primary text-white rounded font-medium hover:bg-blue-600 transition-colors flex justify-center items-center gap-2"
                    >
                        {isUploading && <Loader2 className="w-4 h-4 animate-spin" />}
                        {isUploading ? "Uploading to Supabase..." : "Execute Upload"}
                    </button>
                )}

                {status && (
                    <div className={`p-3 border rounded text-center text-sm flex items-center justify-center gap-2 animate-in fade-in slide-in-from-bottom-2
                    ${status.type === 'success' ? 'bg-green-900/20 border-green-800 text-green-400' :
                            status.type === 'error' ? 'bg-red-900/20 border-red-800 text-red-400' :
                                'bg-blue-900/20 border-blue-800 text-blue-400'}`}>
                        {status.type === 'error' && <AlertCircle className="w-4 h-4" />}
                        {status.message}
                    </div>
                )}
            </div>
        </GlassCard>
    );
};