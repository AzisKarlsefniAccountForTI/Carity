
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, SaverName, AppState, VaultLog } from './types';
import { STORAGE_KEY, CURRENCY_FORMATTER, QUICK_AMOUNTS, APP_TITLE, APP_SUBTITLE, TARGET_DATE } from './constants';
import Countdown from './components/Countdown';
import SavingsChart from './components/SavingsChart';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Plus, Trash2, Send, 
  ChevronRight, Settings, Home, List,
  CheckCircle2, Lock, Unlock, History, Download, 
  X, Cpu, Database, User, Zap, Keyboard,
  Activity, AlertTriangle, Eye, EyeOff, Cloud, CloudOff, RefreshCw, Copy, Wallet, FileText, Wifi, WifiOff
} from 'lucide-react';

const SIGMA_SALT = "ALPHA_SIGMA_CLOUD_v5";
const CLOUD_STORAGE_API = "https://kvdb.io/A2nEw2XmX8P8UfTz2jW2f1/";

const encryptData = (data: any) => {
  const json = JSON.stringify(data);
  return btoa(encodeURIComponent(json + SIGMA_SALT));
};

const decryptData = (str: string) => {
  try {
    const raw = decodeURIComponent(atob(str));
    if (!raw.endsWith(SIGMA_SALT)) throw new Error("Invalid Encryption Key");
    return JSON.parse(raw.replace(SIGMA_SALT, ""));
  } catch (e) { return null; }
};

// BroadcastChannel untuk sinkronisasi antar tab di browser yang sama
const syncChannel = new BroadcastChannel('sigma_sync_channel');

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { transactions: [], emergencyFundAmount: 0, vaultLogs: [], isEncrypted: true };
    return decryptData(saved) || { transactions: [], emergencyFundAmount: 0, vaultLogs: [], isEncrypted: true };
  });

  const [syncId, setSyncId] = useState<string>(() => localStorage.getItem('sigma_sync_id') || '');
  const [isCloudSynced, setIsCloudSynced] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);

  // Form States for Home
  const [manualSaver, setManualSaver] = useState<SaverName>('Azis Khoirul');
  const [manualHomeAmount, setManualHomeAmount] = useState('');
  const [manualHomeNote, setManualHomeNote] = useState('');

  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'menu'>('home');
  const [isEditingVault, setIsEditingVault] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isPrivacyEnabled, setIsPrivacyEnabled] = useState(false);

  // Vault Manual states
  const [manualVaultAmount, setManualVaultAmount] = useState('');
  const [manualVaultReason, setManualVaultReason] = useState('');

  const auditLogContainerRef = useRef<HTMLDivElement>(null);
  const TARGET_GOAL = 10000000;
  const PERSONAL_TARGET = 5000000;

  // Mendeteksi status internet
  useEffect(() => {
    const handleOnline = () => setOnlineStatus(true);
    const handleOffline = () => setOnlineStatus(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const pushToCloud = async (data: AppState, id: string) => {
    if (!id || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const encrypted = encryptData(data);
      await fetch(`${CLOUD_STORAGE_API}${id}`, {
        method: 'POST',
        body: encrypted
      });
      setIsCloudSynced(true);
      setLastSyncTime(new Date());
      // Beritahu tab lain
      syncChannel.postMessage({ type: 'SYNC_UPDATE', data });
    } catch (e) {
      console.error("Gagal push ke cloud", e);
      setIsCloudSynced(false);
    } finally {
      setIsSyncing(false);
    }
  };

  const pullFromCloud = async (id: string) => {
    if (!id || isSyncing || !navigator.onLine) return;
    setIsSyncing(true);
    try {
      const res = await fetch(`${CLOUD_STORAGE_API}${id}`);
      if (res.ok) {
        const encrypted = await res.text();
        const decrypted = decryptData(encrypted);
        if (decrypted) {
          const currentEnc = encryptData(state);
          if (encrypted !== currentEnc) {
            setState(decrypted);
            localStorage.setItem(STORAGE_KEY, encrypted);
          }
          setIsCloudSynced(true);
          setLastSyncTime(new Date());
        }
      }
    } catch (e) {
      console.error("Gagal pull dari cloud", e);
      setIsCloudSynced(false);
    } finally {
      setIsSyncing(false);
    }
  };

  // Sinkronisasi antar tab
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'SYNC_UPDATE') {
        setState(event.data.data);
      }
    };
    syncChannel.addEventListener('message', handleMessage);
    return () => syncChannel.removeEventListener('message', handleMessage);
  }, []);

  // Polling Real-time (Setiap 5 detik untuk sinkronisasi antar perangkat)
  useEffect(() => {
    if (syncId) {
      pullFromCloud(syncId); // Pull pertama kali
      const interval = setInterval(() => pullFromCloud(syncId), 5000);
      return () => clearInterval(interval);
    }
  }, [syncId]);

  // Simpan ke local dan push ke cloud saat ada perubahan state
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const encrypted = encryptData(state);
    localStorage.setItem(STORAGE_KEY, encrypted);
    if (syncId && !isSyncing) {
        pushToCloud(state, syncId);
    }
  }, [state]);

  useEffect(() => {
    if (syncId) localStorage.setItem('sigma_sync_id', syncId);
  }, [syncId]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  const totals = useMemo(() => {
    const total = state.transactions.reduce((acc, curr) => acc + curr.amount, 0);
    const azis = state.transactions.filter(t => t.saver === 'Azis Khoirul').reduce((acc, curr) => acc + curr.amount, 0);
    const siska = state.transactions.filter(t => t.saver === 'Siska Icha').reduce((acc, curr) => acc + curr.amount, 0);
    const effective = total - state.emergencyFundAmount;
    const progress = Math.min((total / TARGET_GOAL) * 100, 100);
    return { 
      total, azis, siska, effective, progress,
      azisProgress: Math.min((azis / PERSONAL_TARGET) * 100, 100),
      siskaProgress: Math.min((siska / PERSONAL_TARGET) * 100, 100)
    };
  }, [state.transactions, state.emergencyFundAmount]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(manualHomeAmount);
    if (!amount || amount <= 0) return showToast("Nominal tidak valid", "error");
    
    const newTransaction: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      saver: manualSaver,
      amount,
      note: manualHomeNote || 'Setoran Manual',
      date: new Date().toISOString()
    };
    
    setState(prev => ({ ...prev, transactions: [newTransaction, ...prev.transactions] }));
    setManualHomeAmount('');
    setManualHomeNote('');
    showToast(`Dana ${manualSaver.split(' ')[0]} Berhasil Disimpan`);
  };

  const handleManualVault = (type: 'lock' | 'release') => {
    const amount = parseInt(manualVaultAmount);
    if (!amount || amount <= 0) return showToast("Nominal tidak valid", "error");
    if (type === 'lock') {
      if (amount > totals.effective) return showToast("Saldo Cair Tidak Cukup", "error");
      const newLog: VaultLog = { id: Math.random().toString(36).substr(2, 9), amount, type: 'lock', reason: manualVaultReason || 'Proteksi Manual', date: new Date().toISOString() };
      setState(prev => ({ ...prev, emergencyFundAmount: prev.emergencyFundAmount + amount, vaultLogs: [newLog, ...prev.vaultLogs] }));
    } else {
      if (amount > state.emergencyFundAmount) return showToast("Saldo Brankas Tidak Cukup", "error");
      const newLog: VaultLog = { id: Math.random().toString(36).substr(2, 9), amount, type: 'release', reason: manualVaultReason || 'Pencairan Manual', date: new Date().toISOString() };
      setState(prev => ({ ...prev, emergencyFundAmount: prev.emergencyFundAmount - amount, vaultLogs: [newLog, ...prev.vaultLogs] }));
    }
    setManualVaultAmount(''); setManualVaultReason('');
    showToast("Transaksi Berhasil");
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    const dateStr = new Date().toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' });

    doc.setFontSize(22);
    doc.setTextColor(99, 102, 241); 
    doc.text("LAPORAN TABUNGAN DONASI 2026", 105, 20, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Dicetak pada: ${dateStr}`, 105, 28, { align: 'center' });

    doc.setFontSize(16);
    doc.setTextColor(0);
    doc.text("Ringkasan Dana", 14, 45);
    
    autoTable(doc, {
      startY: 50,
      head: [['Kategori', 'Jumlah']],
      body: [
        ['Total Akumulasi', CURRENCY_FORMATTER.format(totals.total)],
        ['Tabungan Azis Khoirul', CURRENCY_FORMATTER.format(totals.azis)],
        ['Tabungan Siska Icha', CURRENCY_FORMATTER.format(totals.siska)],
        ['Saldo Brankas (Locked)', CURRENCY_FORMATTER.format(state.emergencyFundAmount)],
        ['Saldo Cair (Available)', CURRENCY_FORMATTER.format(totals.effective)],
        ['Progress Target', `${totals.progress.toFixed(1)}% dari 10jt`]
      ],
      theme: 'striped',
      headStyles: { fillStyle: 'DF', fillColor: [99, 102, 241] }
    });

    doc.text("Riwayat Transaksi Utama", 14, (doc as any).lastAutoTable.finalY + 15);
    const transBody = state.transactions.map(t => [
      new Date(t.date).toLocaleDateString('id-ID'),
      t.saver,
      CURRENCY_FORMATTER.format(t.amount),
      t.note
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Tanggal', 'Penabung', 'Nominal', 'Catatan']],
      body: transBody.length > 0 ? transBody : [['-', '-', '-', 'Tidak ada data']],
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.text("Log Aktivitas Brankas", 14, (doc as any).lastAutoTable.finalY + 15);
    const vaultBody = state.vaultLogs.map(l => [
      new Date(l.date).toLocaleDateString('id-ID'),
      l.type === 'lock' ? 'AMANKAN' : 'CAIRKAN',
      CURRENCY_FORMATTER.format(l.amount),
      l.reason
    ]);

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 20,
      head: [['Tanggal', 'Operasi', 'Nominal', 'Keterangan']],
      body: vaultBody.length > 0 ? vaultBody : [['-', '-', '-', 'Tidak ada data']],
      headStyles: { fillColor: [245, 158, 11] }
    });

    const finalY = (doc as any).lastAutoTable.finalY + 20;
    doc.setFontSize(10);
    doc.setTextColor(150);
    doc.text("Target Donasi: 29 Agustus 2026", 105, finalY > 270 ? 285 : finalY, { align: 'center' });
    doc.text("Generated by Sigma Charity Protocol", 105, finalY > 270 ? 290 : finalY + 5, { align: 'center' });

    doc.save(`Laporan_Tabungan_Sigma_${new Date().getTime()}.pdf`);
    showToast("PDF Berhasil Diunduh");
  };

  const formatAmount = (val: number) => isPrivacyEnabled ? 'Rp ••••••••' : CURRENCY_FORMATTER.format(val);

  return (
    <div className={`min-h-screen bg-[#020617] text-slate-100 transition-all duration-700 ${isEditingVault ? 'overflow-hidden max-h-screen' : 'pb-44'}`}>
      <div className="fixed inset-0 neural-grid pointer-events-none z-0 opacity-30" />
      
      {/* Top Bar Controls */}
      {!isEditingVault && (
        <div className="fixed top-6 left-6 right-6 z-[60000] flex justify-between items-center">
            <div className="flex gap-2">
              <button 
                  onClick={() => setIsPrivacyEnabled(!isPrivacyEnabled)} 
                  className={`p-3 backdrop-blur-3xl border rounded-2xl transition-all shadow-2xl ${isPrivacyEnabled ? 'bg-amber-500/20 border-amber-500/30 text-amber-500' : 'bg-white/5 border-white/10 text-slate-400'}`}
              >
                  {isPrivacyEnabled ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
              <div className={`p-3 backdrop-blur-3xl border rounded-2xl transition-all shadow-2xl bg-white/5 border-white/10 ${onlineStatus ? 'text-emerald-500' : 'text-rose-500'}`}>
                {onlineStatus ? <Wifi size={20} /> : <WifiOff size={20} />}
              </div>
            </div>
            
            <div className="flex gap-2 items-center">
                <button 
                    onClick={() => setShowSyncModal(true)} 
                    className={`p-3 backdrop-blur-3xl border rounded-2xl transition-all shadow-2xl flex items-center gap-2 ${syncId ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-500' : 'bg-white/5 border-white/10 text-slate-400'}`}
                >
                    {isSyncing ? <RefreshCw size={20} className="animate-spin" /> : (syncId ? <Cloud size={20} className="sync-pulse" /> : <CloudOff size={20} />)}
                    {syncId && <span className="text-[10px] font-mono font-black uppercase hidden sm:block tracking-widest">{syncId}</span>}
                </button>
            </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-24 left-0 right-0 z-[100000] px-4 flex justify-center pointer-events-none">
          <div className={`pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-3xl flex items-center gap-4 animate-status-pop ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'}`}>
            <CheckCircle2 size={20} />
            <p className="font-bold text-sm tracking-tight">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Header */}
      {!isEditingVault && (
        <header className="relative pt-24 md:pt-32 pb-12 px-6 z-10 transition-all duration-700">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4 text-center md:text-left">
                <div className="flex items-center gap-3 justify-center md:justify-start">
                   <div className="h-[2px] w-8 bg-indigo-500/50"></div>
                   <span className="text-xs font-black text-indigo-400 uppercase tracking-[0.4em] font-mono">Real-time Sync Active</span>
                </div>
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-tight italic">{APP_TITLE}</h1>
                <p className="text-slate-500 font-bold text-lg md:text-xl">{APP_SUBTITLE}</p>
            </div>

            <div className="glass-panel p-10 md:p-14 rounded-[4rem] relative overflow-hidden shadow-2xl border-white/5">
               <div className="flex flex-col md:flex-row justify-between items-center gap-8 relative z-10 text-center md:text-left">
                  <div className="space-y-2">
                    <p className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] font-mono">Progress Akumulasi</p>
                    <p className="text-7xl md:text-8xl font-black font-mono tracking-tighter text-white">{totals.progress.toFixed(1)}%</p>
                  </div>
                  <div className="md:text-right space-y-1">
                     <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-mono">Total Akumulasi</p>
                     <p className={`text-3xl md:text-4xl font-black text-indigo-400 font-mono tracking-tighter ${isPrivacyEnabled ? 'privacy-blur' : ''}`}>
                        {formatAmount(totals.total)}
                     </p>
                  </div>
               </div>
               <div className="mt-10 h-6 w-full bg-slate-950/50 rounded-full p-1.5 border border-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-600 via-indigo-400 to-emerald-400 rounded-full transition-all duration-1000 shadow-[0_0_20px_rgba(99,102,241,0.3)]" style={{ width: `${totals.progress}%` }} />
               </div>
            </div>
          </div>
        </header>
      )}

      <main className={`max-w-4xl mx-auto px-6 relative z-50 transition-all duration-700 ${isEditingVault ? 'hidden' : 'opacity-100'}`}>
        {activeTab === 'home' && (
          <div className="space-y-10 animate-reveal">
            <Countdown />
            
            {/* Manual Entry Form */}
            <div className="glass-panel rounded-[4rem] p-10 md:p-14 border-white/10 space-y-8 shadow-2xl">
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-600/10 flex items-center justify-center text-indigo-400 shadow-inner">
                    <Wallet size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black uppercase tracking-tight italic">Input Tabungan</h3>
                    <p className="text-[10px] font-mono text-slate-500 tracking-widest uppercase font-bold">Sinkronisasi Instan</p>
                  </div>
               </div>
               
               <form onSubmit={handleAddTransaction} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     {['Azis Khoirul', 'Siska Icha'].map((name) => (
                       <button 
                         key={name}
                         type="button"
                         onClick={() => setManualSaver(name as SaverName)}
                         className={`py-5 rounded-3xl font-black text-xs uppercase tracking-widest transition-all border ${manualSaver === name ? 'bg-white text-slate-950 border-white shadow-2xl scale-[1.02]' : 'bg-white/5 text-slate-500 border-white/5 hover:bg-white/10'}`}
                       >
                         {name.split(' ')[0]}
                       </button>
                     ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nominal (Rp)</label>
                        <input 
                           type="number" 
                           inputMode="numeric"
                           value={manualHomeAmount} 
                           onChange={e => setManualHomeAmount(e.target.value)} 
                           placeholder="0"
                           className="w-full bg-slate-950/50 border border-white/10 rounded-[2rem] py-6 px-8 text-xl font-black font-mono focus:border-indigo-500 outline-none text-white shadow-inner"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Catatan (Opsional)</label>
                        <input 
                           type="text" 
                           value={manualHomeNote} 
                           onChange={e => setManualHomeNote(e.target.value)} 
                           placeholder="Misal: Uang jajan sisa..."
                           className="w-full bg-slate-950/50 border border-white/10 rounded-[2rem] py-6 px-8 text-sm font-bold focus:border-indigo-500 outline-none text-white shadow-inner"
                        />
                     </div>
                  </div>
                  <button type="submit" className="w-full py-7 rounded-[2rem] bg-indigo-600 text-white font-black text-xl shadow-2xl active:scale-[0.98] transition-all uppercase tracking-[0.2em] italic flex items-center justify-center gap-4">
                    <Send size={24} /> Simpan & Sinkronkan
                  </button>
               </form>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                { name: 'Azis Khoirul', label: 'Tabungan Azis', total: totals.azis, progress: totals.azisProgress, color: 'from-blue-600 to-indigo-700', icon: <User size={24} />, accent: 'text-blue-400' },
                { name: 'Siska Icha', label: 'Tabungan Siska', total: totals.siska, progress: totals.siskaProgress, color: 'from-rose-500 to-rose-700', icon: <Zap size={24} />, accent: 'text-rose-400' }
              ].map((saver) => (
                <div key={saver.name} className="glass-panel p-10 rounded-[3.5rem] flex flex-col justify-between shadow-xl">
                   <div className="flex items-start justify-between mb-10">
                      <div className="space-y-1">
                         <div className={`flex items-center gap-3 ${saver.accent} font-mono text-[10px] font-black tracking-[0.2em] uppercase`}>
                           {saver.icon} <span>{saver.label}</span>
                         </div>
                         <h3 className="text-3xl font-black uppercase tracking-tight italic mt-2">{saver.name.split(' ')[0]}</h3>
                      </div>
                   </div>
                   <div className="space-y-5">
                      <div className="h-3 w-full bg-slate-950/50 rounded-full overflow-hidden border border-white/5">
                         <div className={`h-full bg-gradient-to-r ${saver.color} rounded-full transition-all duration-700`} style={{ width: `${saver.progress}%` }} />
                      </div>
                      <p className={`text-4xl font-black font-mono text-white tracking-tighter ${isPrivacyEnabled ? 'privacy-blur' : ''}`}>
                          {formatAmount(saver.total)}
                      </p>
                   </div>
                </div>
              ))}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-6 md:gap-8">
              <div className="glass-panel p-10 rounded-[3.5rem] flex flex-col justify-between shadow-lg">
                <div className="flex items-center gap-4 mb-6">
                  <Activity size={24} className="text-emerald-500" />
                  <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">Saldo Cair</span>
                </div>
                <h4 className={`text-2xl md:text-3xl font-black font-mono text-white tracking-tighter ${isPrivacyEnabled ? 'privacy-blur' : ''}`}>
                    {formatAmount(totals.effective)}
                </h4>
              </div>
              <div 
                onClick={() => setIsEditingVault(true)}
                className="bg-amber-500/5 p-10 rounded-[3.5rem] border border-amber-500/20 flex flex-col justify-between cursor-pointer hover:bg-amber-500/10 transition-all group shadow-xl"
              >
                <div className="flex items-center gap-4 mb-6">
                  <Lock size={24} className="text-amber-500 group-hover:scale-125 transition-transform" />
                  <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">Brankas</span>
                </div>
                <h4 className={`text-2xl md:text-3xl font-black font-mono text-white tracking-tighter ${isPrivacyEnabled ? 'privacy-blur' : ''}`}>
                    {formatAmount(state.emergencyFundAmount)}
                </h4>
              </div>
            </div>
            <SavingsChart transactions={state.transactions} protectedAmount={state.emergencyFundAmount} />
          </div>
        )}

        {/* Tab History */}
        {activeTab === 'history' && (
          <div className="space-y-10 animate-reveal pb-20">
            <h3 className="text-4xl font-black tracking-tighter px-4 uppercase italic">Arsip <span className="text-indigo-400">Transaksi</span></h3>
            <div className="glass-panel rounded-[4rem] overflow-hidden shadow-2xl border-white/5">
              {state.transactions.length === 0 ? (
                <div className="py-48 text-center opacity-20 font-mono text-xs tracking-[1.5em] text-slate-500 uppercase font-black">Archive_Zero</div>
              ) : (
                <div className="divide-y divide-white/5 max-h-[60vh] overflow-y-auto no-scrollbar">
                  {state.transactions.map(t => (
                    <div key={t.id} className="p-10 flex items-center justify-between hover:bg-white/[0.03] transition-all group">
                       <div className="flex items-center gap-8">
                          <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center font-black text-xl text-white shadow-2xl ${t.saver === 'Azis Khoirul' ? 'bg-blue-600' : 'bg-rose-600'}`}>
                            {t.saver === 'Azis Khoirul' ? 'A' : 'S'}
                          </div>
                          <div>
                             <p className={`font-black text-2xl font-mono text-white tracking-tighter ${isPrivacyEnabled ? 'privacy-blur' : ''}`}>{formatAmount(t.amount)}</p>
                             <div className="flex items-center gap-3 mt-1 opacity-50 uppercase font-black text-[10px] tracking-widest font-mono">
                                <span>{t.note}</span>
                                <span>•</span>
                                <span>{new Date(t.date).toLocaleDateString()}</span>
                             </div>
                          </div>
                       </div>
                       <button onClick={() => confirm('Hapus record?') && setState(prev => ({...prev, transactions: prev.transactions.filter(x => x.id !== t.id)}))} className="p-4 text-slate-700 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 size={24} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Menu */}
        {activeTab === 'menu' && (
          <div className="space-y-10 animate-reveal pb-20">
            <h3 className="text-4xl font-black tracking-tighter px-4 uppercase italic">Root <span className="text-slate-600">Config</span></h3>
            <div className="grid grid-cols-1 gap-6">
               <button onClick={downloadPDF} className="glass-panel p-10 rounded-[3rem] flex items-center justify-between group border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-all shadow-lg">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                        <FileText size={28} />
                    </div>
                    <div className="text-left">
                        <span className="font-black text-xl block uppercase tracking-tight italic">Ekspor Laporan PDF</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Laporan lengkap donasi</span>
                    </div>
                  </div>
                  <Download size={24} className="text-indigo-400 group-hover:scale-110 transition-transform" />
               </button>

               <button onClick={() => pullFromCloud(syncId)} className="glass-panel p-10 rounded-[3rem] flex items-center justify-between group hover:bg-white/5 transition-all shadow-lg">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                        <RefreshCw size={28} className={isSyncing ? 'animate-spin' : ''} />
                    </div>
                    <div className="text-left">
                        <span className="font-black text-xl block uppercase tracking-tight italic">Paksa Sinkron</span>
                        <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Refresh data dari awan</span>
                    </div>
                  </div>
               </button>

               <button onClick={() => confirm('Wipe data?') && setState({transactions:[], emergencyFundAmount:0, vaultLogs:[], isEncrypted: true})} className="glass-panel p-10 rounded-[3rem] flex items-center justify-between group text-rose-500 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all">
                  <div className="flex items-center gap-8">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-rose-500/10 flex items-center justify-center">
                        <AlertTriangle size={28} />
                    </div>
                    <div className="text-left">
                        <span className="font-black text-xl block uppercase tracking-tight italic">Hapus Database</span>
                        <span className="text-[10px] font-mono text-rose-800 uppercase tracking-widest font-bold">Format memori Sigma lokal</span>
                    </div>
                  </div>
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      {!isEditingVault && (
        <div className="fixed bottom-12 left-0 right-0 z-[40000] bottom-nav-container pointer-events-none">
          <nav className="pointer-events-auto flex items-center justify-around w-full bg-slate-900/95 border border-white/10 shadow-2xl rounded-[2.5rem] p-4 backdrop-blur-3xl">
            {[
              { id: 'home', icon: Home, label: 'Hub' },
              { id: 'history', icon: List, label: 'Logs' },
              { id: 'menu', icon: Settings, label: 'Root' }
            ].map((item) => (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id as any)} 
                className={`flex-1 flex flex-col items-center py-4 rounded-3xl transition-all ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-500 hover:text-white'}`}
              >
                <item.icon size={22} />
                <span className="text-[10px] font-black uppercase mt-1 tracking-widest font-mono">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Cloud Sync Modal */}
      {showSyncModal && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-3xl z-[90000] flex items-center justify-center p-8 animate-reveal" onClick={() => setShowSyncModal(false)}>
           <div className="glass-panel w-full max-w-md rounded-[4rem] p-12 space-y-10 border-white/10 shadow-[0_0_100px_rgba(99,102,241,0.2)]" onClick={e => e.stopPropagation()}>
              <div className="text-center space-y-4">
                 <div className="w-24 h-24 mx-auto rounded-[2.5rem] bg-indigo-600/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                    <Cloud size={48} className={isSyncing ? 'animate-pulse' : 'sync-pulse'} />
                 </div>
                 <h3 className="text-3xl font-black uppercase tracking-tight italic">Sinkronisasi Pasangan</h3>
                 <p className="text-slate-400 text-[10px] font-black tracking-[0.2em] leading-relaxed">GUNAKAN ID YANG SAMA DI HP PACAR</p>
              </div>
              
              <div className="space-y-4">
                  <div className="relative">
                    <input 
                       type="text" 
                       value={syncId} 
                       onChange={(e) => setSyncId(e.target.value.toUpperCase().replace(/\s/g, '-'))}
                       placeholder="MISAL: AZIS-SISKA-LOVE"
                       className="w-full bg-slate-950 border border-white/10 rounded-2xl py-6 px-8 text-xl font-black font-mono text-white outline-none focus:border-indigo-500 shadow-inner"
                    />
                    {syncId && (
                      <button onClick={() => {navigator.clipboard.writeText(syncId); showToast("ID Disalin");}} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                        <Copy size={20} />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => { pullFromCloud(syncId); setShowSyncModal(false); }} className="w-full py-6 rounded-2xl bg-indigo-600 text-white font-black uppercase italic tracking-widest shadow-xl active:scale-[0.98] transition-all">Hubungkan Database</button>
                    <button onClick={() => { setSyncId(''); setIsCloudSynced(false); setShowSyncModal(false); }} className="w-full py-2 text-[10px] font-black text-slate-600 hover:text-rose-500 uppercase tracking-widest transition-colors">Putuskan Koneksi</button>
                  </div>
              </div>
              <div className="pt-4 border-t border-white/5 text-center">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status: {onlineStatus ? 'ONLINE' : 'OFFLINE'}</p>
                {lastSyncTime && <p className="text-[9px] text-slate-600 font-mono mt-1 uppercase">Terakhir Update: {lastSyncTime.toLocaleTimeString()}</p>}
              </div>
           </div>
        </div>
      )}

      {/* Vault UI Overlay - INSTANT ACCESS */}
      {isEditingVault && (
        <div className="fixed inset-0 bg-slate-950 z-[50000] flex flex-col h-full w-full overflow-hidden animate-reveal">
          <div className="flex-none bg-slate-900/90 backdrop-blur-3xl border-b border-white/10 p-10 flex justify-between items-center z-50">
             <div className="flex items-center gap-6">
                <div className="w-14 h-14 rounded-[1.2rem] bg-amber-500/10 flex items-center justify-center text-amber-500 border border-amber-500/20 shadow-inner"><Cpu size={28} /></div>
                <div>
                   <h2 className="text-3xl font-black uppercase tracking-tighter italic">Sektor Brankas</h2>
                   <p className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-bold">Sinkronisasi Keamanan Aktif</p>
                </div>
             </div>
             <button onClick={() => setIsEditingVault(false)} className="p-5 bg-white/5 rounded-full hover:bg-rose-600 transition-all active:scale-90 shadow-xl"><X size={32} /></button>
          </div>

          <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
               <div className="flex-none p-10 space-y-12 bg-slate-900/30 border-b border-white/5 shadow-2xl">
                  <div className="text-center space-y-3">
                     <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono">Saldo Terkunci Brankas</p>
                     <p className={`text-6xl md:text-8xl font-black text-white font-mono tracking-tighter ${isPrivacyEnabled ? 'privacy-blur' : ''}`}>
                        {formatAmount(state.emergencyFundAmount)}
                     </p>
                  </div>

                  <div className="max-w-xl mx-auto w-full space-y-6">
                      <div className="space-y-6">
                         <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Nominal Operasional</label>
                               <input type="number" inputMode="numeric" value={manualVaultAmount} onChange={(e) => setManualVaultAmount(e.target.value)} placeholder="0" className="w-full bg-black/80 rounded-[2rem] py-8 px-10 text-3xl font-black border border-white/10 focus:border-amber-500 outline-none text-white font-mono shadow-inner" />
                            </div>
                            <div className="space-y-2">
                               <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Keterangan</label>
                               <input type="text" value={manualVaultReason} onChange={(e) => setManualVaultReason(e.target.value)} placeholder="Misal: Simpan untuk donasi..." className="w-full bg-black/80 rounded-2xl py-6 px-10 text-sm border border-white/10 focus:border-amber-500 outline-none text-white font-bold shadow-inner" />
                            </div>
                         </div>
                         <div className="grid grid-cols-2 gap-6">
                            <button onClick={() => handleManualVault('lock')} className="py-6 rounded-[2rem] bg-emerald-600 font-black text-white text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest italic">
                               <Lock size={22} /> Simpan
                            </button>
                            <button onClick={() => handleManualVault('release')} className="py-6 rounded-[2rem] bg-rose-600 font-black text-white text-sm shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 uppercase tracking-widest italic">
                               <Unlock size={22} /> Tarik
                            </button>
                         </div>
                      </div>
                  </div>
               </div>

               <div className="flex-1 flex flex-col min-h-0 bg-black/40">
                  <div className="px-10 py-6 border-b border-white/5 flex items-center gap-5 bg-slate-900/40">
                     <Database size={24} className="text-amber-500" />
                     <span className="text-xs font-black text-slate-500 uppercase tracking-widest font-mono">Arsip Audit Sektor Brankas</span>
                  </div>
                  <div ref={auditLogContainerRef} className="flex-1 overflow-y-auto p-10 space-y-4 no-scrollbar">
                     {state.vaultLogs.length === 0 ? (
                        <div className="py-48 text-center opacity-10 flex flex-col items-center justify-center">
                          <History size={100} className="mb-8 text-slate-700" />
                          <p className="font-mono text-[10px] tracking-[2em] uppercase text-slate-500 font-black">Null_Log</p>
                        </div>
                     ) : (
                        state.vaultLogs.map((log) => (
                           <div key={log.id} className="p-8 rounded-[2rem] bg-white/[0.03] border border-white/5 flex items-center justify-between group shadow-xl">
                              <div className="flex items-center gap-8">
                                 <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center shadow-lg ${log.type === 'lock' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-500 border border-rose-500/20'}`}>
                                    {log.type === 'lock' ? <Lock size={24} /> : <Unlock size={24} />}
                                 </div>
                                 <div className="space-y-1">
                                    <p className={`font-black text-2xl font-mono text-white tracking-tighter ${isPrivacyEnabled ? 'privacy-blur' : ''}`}>{formatAmount(log.amount)}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black opacity-60 mt-1">{log.reason}</p>
                                 </div>
                              </div>
                              <div className="text-right flex flex-col justify-center opacity-40 font-mono text-[10px] uppercase font-bold text-slate-400">
                                 <span>{new Date(log.date).toLocaleDateString()}</span>
                              </div>
                           </div>
                        ))
                     )}
                     <div className="h-32 flex-none" />
                  </div>
               </div>
            </div>
        </div>
      )}
    </div>
  );
};

export default App;
