
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Transaction, SaverName, AppState, VaultLog, AIResult } from './types';
import { STORAGE_KEY, CURRENCY_FORMATTER, QUICK_AMOUNTS, APP_TITLE, APP_SUBTITLE } from './constants';
import Countdown from './components/Countdown';
import SavingsChart from './components/SavingsChart';
import { parseSigmaCommand } from './services/geminiService';
import { 
  Plus, Trash2, Send, BrainCircuit, 
  ChevronRight, Settings, Home, List,
  ShieldAlert, Fingerprint, CheckCircle2,
  Lock, Unlock, History, Download, Loader2,
  X, Cpu, Database, User, Zap, Keyboard, Sparkles,
  Activity, AlertTriangle
} from 'lucide-react';

const SIGMA_SALT = "ALPHA_SIGMA_2026_PROTOCOL";
const encryptData = (data: any) => btoa(JSON.stringify(data) + SIGMA_SALT);
const decryptData = (str: string) => {
  try {
    const raw = atob(str);
    if (!raw.endsWith(SIGMA_SALT)) throw new Error("Invalid Key");
    return JSON.parse(raw.replace(SIGMA_SALT, ""));
  } catch (e) { return null; }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { transactions: [], emergencyFundAmount: 0, vaultLogs: [], isEncrypted: true };
    const decrypted = decryptData(saved);
    return decrypted || { transactions: [], emergencyFundAmount: 0, vaultLogs: [], isEncrypted: true };
  });

  const [isVaultUnlocked, setIsVaultUnlocked] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [vaultAiInput, setVaultAiInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAiFocused, setIsAiFocused] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'menu'>('home');
  const [showQuickAction, setShowQuickAction] = useState<SaverName | null>(null);
  const [isEditingVault, setIsEditingVault] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // Manual Vault State
  const [manualAmount, setManualAmount] = useState('');
  const [manualReason, setManualReason] = useState('');
  const [vaultMode, setVaultMode] = useState<'manual' | 'ai'>('manual');

  const auditLogContainerRef = useRef<HTMLDivElement>(null);
  const TARGET_GOAL = 10000000;
  const PERSONAL_TARGET = 5000000;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, encryptData(state));
  }, [state]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Auto-Scroll to Bottom for Vault Logs
  useEffect(() => {
    if (isVaultUnlocked && auditLogContainerRef.current) {
      const container = auditLogContainerRef.current;
      const timer = setTimeout(() => {
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [isVaultUnlocked, state.vaultLogs.length, vaultMode]);

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
      total, 
      azis, 
      siska, 
      effective, 
      progress,
      azisProgress: Math.min((azis / PERSONAL_TARGET) * 100, 100),
      siskaProgress: Math.min((siska / PERSONAL_TARGET) * 100, 100)
    };
  }, [state.transactions, state.emergencyFundAmount]);

  const handleUnlockVault = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      setIsVaultUnlocked(true);
      setIsUnlocking(false);
      showToast("Akses Brankas Terbuka", "success");
    }, 1200);
  };

  const processBahliljuleAction = async (result: AIResult) => {
    const { action, amount, saver, note, reason } = result;
    if (action === 'deposit') {
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        saver: saver || 'Azis Khoirul',
        amount,
        note: note || 'Setoran Otomatis',
        date: new Date().toISOString()
      };
      setState(prev => ({ ...prev, transactions: [newTransaction, ...prev.transactions] }));
      showToast(`${CURRENCY_FORMATTER.format(amount)} Berhasil Ditambahkan`, "success");
      return "Success";
    }
    if (action === 'vault_lock') {
      if (amount > totals.effective) return showToast("Saldo Cair Tidak Cukup", "error");
      const newLog: VaultLog = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        type: 'lock',
        reason: reason || 'Proteksi AI',
        date: new Date().toISOString()
      };
      setState(prev => ({ ...prev, emergencyFundAmount: prev.emergencyFundAmount + amount, vaultLogs: [...prev.vaultLogs, newLog] }));
      showToast("Dana Diamankan ke Brankas", "success");
      return "Locked";
    }
    if (action === 'vault_release') {
      if (amount > state.emergencyFundAmount) return showToast("Dana Brankas Kosong", "error");
      const newLog: VaultLog = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        type: 'release',
        reason: reason || 'Pencairan AI',
        date: new Date().toISOString()
      };
      setState(prev => ({ ...prev, emergencyFundAmount: prev.emergencyFundAmount - amount, vaultLogs: [...prev.vaultLogs, newLog] }));
      showToast("Dana Brankas Dicairkan", "success");
      return "Released";
    }
  };

  const handleManualVault = (type: 'lock' | 'release') => {
    const amount = parseInt(manualAmount);
    if (!amount || amount <= 0) return showToast("Nominal Tidak Valid", "error");

    if (type === 'lock') {
      if (amount > totals.effective) return showToast("Saldo Cair Tidak Cukup", "error");
      const newLog: VaultLog = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        type: 'lock',
        reason: manualReason || 'Setoran Manual Brankas',
        date: new Date().toISOString()
      };
      setState(prev => ({ ...prev, emergencyFundAmount: prev.emergencyFundAmount + amount, vaultLogs: [...prev.vaultLogs, newLog] }));
    } else {
      if (amount > state.emergencyFundAmount) return showToast("Saldo Brankas Tidak Cukup", "error");
      const newLog: VaultLog = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        type: 'release',
        reason: manualReason || 'Pencairan Manual Brankas',
        date: new Date().toISOString()
      };
      setState(prev => ({ ...prev, emergencyFundAmount: prev.emergencyFundAmount - amount, vaultLogs: [...prev.vaultLogs, newLog] }));
    }
    setManualAmount('');
    setManualReason('');
    showToast("Transaksi Berhasil", "success");
  };

  const saversData = [
    { 
      name: 'Azis Khoirul' as SaverName, 
      label: 'Gantengnya Icha',
      total: totals.azis, 
      progress: totals.azisProgress,
      color: 'from-blue-600 to-indigo-700', 
      icon: <User className="text-blue-400" />, 
      accent: 'text-blue-400'
    },
    { 
      name: 'Siska Icha' as SaverName, 
      label: 'Cantiknya Ayis',
      total: totals.siska, 
      progress: totals.siskaProgress,
      color: 'from-rose-500 to-rose-700', 
      icon: <Zap className="text-rose-400" />, 
      accent: 'text-rose-400'
    }
  ];

  return (
    <div className={`min-h-screen bg-[#020617] text-slate-100 transition-colors duration-700 ${isAiFocused ? 'bg-black' : ''} ${isEditingVault ? 'overflow-hidden max-h-screen' : 'pb-44'}`}>
      <div className="fixed inset-0 neural-grid pointer-events-none z-0 opacity-30" />
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 left-0 right-0 z-[100000] px-4 flex justify-center pointer-events-none">
          <div className={`pointer-events-auto px-6 py-4 rounded-2xl shadow-2xl border backdrop-blur-3xl flex items-center gap-4 animate-status-pop ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' : 'bg-rose-500/20 border-rose-500/40 text-rose-300'}`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
            <p className="font-bold text-sm tracking-tight">{toast.message}</p>
          </div>
        </div>
      )}

      {/* Header Area */}
      {!isEditingVault && (
        <header className={`relative pt-12 md:pt-16 pb-12 px-4 md:px-6 z-10 transition-all duration-500 ${isAiFocused ? 'opacity-10 blur-md scale-95' : 'opacity-100'}`}>
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 text-center md:text-left">
              <div className="space-y-3">
                <span className="px-4 py-1.5 bg-indigo-500/10 border border-indigo-500/30 rounded-full text-xs font-bold text-indigo-400 uppercase tracking-widest font-mono">Kernel Sigma v3.2</span>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter uppercase leading-none">{APP_TITLE}</h1>
                <p className="text-slate-300 font-semibold text-base md:text-lg">{APP_SUBTITLE}</p>
              </div>
            </div>

            <div className="glass-panel p-8 rounded-[2.5rem] relative overflow-hidden shadow-2xl">
               <div className="flex justify-between items-end mb-4 relative z-10">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Misi Global</p>
                    <p className="text-4xl md:text-5xl font-black font-mono">{totals.progress.toFixed(1)}%</p>
                  </div>
                  <div className="text-right">
                     <p className="text-xl md:text-2xl font-bold text-indigo-300 font-mono tracking-tight">{CURRENCY_FORMATTER.format(totals.total)}</p>
                  </div>
               </div>
               <div className="h-3 w-full bg-slate-950/50 rounded-full p-0.5 border border-white/5 overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-600 to-emerald-400 rounded-full transition-all duration-1000" style={{ width: `${totals.progress}%` }} />
               </div>
            </div>
          </div>
        </header>
      )}

      <main className={`max-w-4xl mx-auto px-4 md:px-6 relative z-50 transition-all duration-500 ${isEditingVault ? 'hidden' : 'opacity-100 block'}`}>
        {activeTab === 'home' && (
          <div className="space-y-8 animate-reveal">
            <Countdown />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {saversData.map((saver) => (
                <div 
                  key={saver.name}
                  onClick={() => setShowQuickAction(saver.name)}
                  className="glass-panel p-8 rounded-[2.5rem] border border-white/5 group cursor-pointer hover:border-indigo-500/30 transition-all flex flex-col justify-between"
                >
                   <div className="flex items-start justify-between mb-8">
                      <div className="space-y-1">
                         <div className={`flex items-center gap-2 ${saver.accent} font-mono text-xs font-bold tracking-widest uppercase`}>
                           {saver.icon} <span>{saver.label}</span>
                         </div>
                         <h3 className="text-2xl font-black uppercase tracking-tight leading-tight">{saver.name}</h3>
                      </div>
                      <div className="p-3 bg-white/5 rounded-2xl group-hover:bg-indigo-500/20 transition-all">
                        <Plus size={20} className={saver.accent} />
                      </div>
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs font-bold font-mono tracking-widest">
                         <span className="text-slate-400 uppercase">Kontribusi</span>
                         <span className={saver.accent}>{saver.progress.toFixed(0)}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-950/50 rounded-full overflow-hidden">
                         <div className={`h-full bg-gradient-to-r ${saver.color} rounded-full transition-all duration-700`} style={{ width: `${saver.progress}%` }} />
                      </div>
                      <div className="pt-2">
                        <p className="text-3xl font-bold font-mono text-white tracking-tighter">{CURRENCY_FORMATTER.format(saver.total)}</p>
                      </div>
                   </div>
                </div>
              ))}
            </div>

            <div className={`glass-panel rounded-[3rem] p-8 md:p-12 border-2 transition-all duration-500 ${isAiFocused ? 'border-indigo-500 scale-[1.02] z-[100]' : 'border-white/10'}`}>
               <div className="flex items-center gap-5 mb-8">
                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 ${isProcessing ? 'bg-indigo-600 border-indigo-400 animate-pulse' : 'bg-slate-900 border-white/10'}`}>
                   {isProcessing ? <Loader2 className="animate-spin text-white" size={28} /> : <BrainCircuit className="text-indigo-400" size={28} />}
                 </div>
                 <div className="space-y-0.5">
                    <h3 className="text-xl font-bold tracking-tight">Protokol AI</h3>
                    <p className="text-xs font-mono text-slate-400 tracking-widest uppercase">Bahliljule Voice Command</p>
                 </div>
               </div>
               <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!aiInput.trim() || isProcessing) return;
                  setIsProcessing(true);
                  try {
                    const result = await parseSigmaCommand(aiInput);
                    if (result) await processBahliljuleAction(result);
                    setAiInput('');
                    setIsAiFocused(false);
                  } finally { setIsProcessing(false); }
               }} className="relative">
                  <input
                    type="text"
                    value={aiInput}
                    onFocus={() => setIsAiFocused(true)}
                    onBlur={() => !aiInput && setIsAiFocused(false)}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Contoh: 'Azis nabung 100rb'..."
                    className="w-full bg-slate-950/80 rounded-2xl py-6 px-8 text-base md:text-lg font-bold border border-white/10 focus:border-indigo-500 focus:outline-none transition-all text-white placeholder:text-slate-600"
                  />
                  <button type="submit" className="absolute right-3 top-3 bottom-3 bg-indigo-600 text-white px-6 rounded-xl shadow-xl active:scale-95 transition-all">
                    <Send size={20} />
                  </button>
               </form>
            </div>

            <div className="grid grid-cols-2 gap-4 md:gap-6">
              <div className="glass-panel p-6 md:p-8 rounded-[2rem] flex flex-col justify-between">
                <div className="flex items-center gap-3 mb-4">
                  <Activity size={18} className="text-emerald-500" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Likuiditas</span>
                </div>
                <h4 className="text-xl md:text-2xl font-bold font-mono text-white tracking-tighter">{CURRENCY_FORMATTER.format(totals.effective)}</h4>
              </div>
              <div 
                onClick={() => setIsEditingVault(true)}
                className="bg-amber-500/5 p-6 md:p-8 rounded-[2rem] border border-amber-500/20 flex flex-col justify-between cursor-pointer hover:bg-amber-500/10 transition-all group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <Lock size={18} className="text-amber-500 group-hover:animate-bounce" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Brankas</span>
                </div>
                <h4 className="text-xl md:text-2xl font-bold font-mono text-white tracking-tighter">{CURRENCY_FORMATTER.format(state.emergencyFundAmount)}</h4>
              </div>
            </div>
            <SavingsChart transactions={state.transactions} protectedAmount={state.emergencyFundAmount} />
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 animate-reveal">
            <h3 className="text-2xl font-bold tracking-tight px-4">Log <span className="text-indigo-400">Transaksi</span></h3>
            <div className="glass-panel rounded-[2.5rem] overflow-hidden shadow-2xl">
              {state.transactions.length === 0 ? (
                <div className="py-20 text-center opacity-40 font-mono text-sm tracking-[1em] text-slate-400 uppercase">Arsip_Kosong</div>
              ) : (
                <div className="divide-y divide-white/5">
                  {state.transactions.map(t => (
                    <div key={t.id} className="p-6 flex items-center justify-between hover:bg-white/[0.03] transition-all">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white shadow-lg ${t.saver === 'Azis Khoirul' ? 'bg-blue-600' : 'bg-rose-600'}`}>
                            {t.saver === 'Azis Khoirul' ? 'A' : 'S'}
                          </div>
                          <div>
                             <p className="font-bold text-lg font-mono text-white">{CURRENCY_FORMATTER.format(t.amount)}</p>
                             <p className="text-xs text-slate-400 line-clamp-1">{t.note}</p>
                          </div>
                       </div>
                       <button onClick={() => confirm('Hapus transaksi ini?') && setState(prev => ({...prev, transactions: prev.transactions.filter(x => x.id !== t.id)}))} className="p-3 text-slate-600 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'menu' && (
          <div className="space-y-6 animate-reveal">
            <h3 className="text-2xl font-bold tracking-tight px-4">Kontrol <span className="text-slate-500">Root</span></h3>
            <div className="grid grid-cols-1 gap-4">
               <button onClick={() => showToast("Fitur Segera Hadir")} className="glass-panel p-8 rounded-[2rem] flex items-center justify-between group">
                  <div className="flex items-center gap-5">
                    <Download size={24} className="text-indigo-400" />
                    <span className="font-bold text-lg">Download Audit Report</span>
                  </div>
                  <ChevronRight size={20} className="text-slate-600" />
               </button>
               <button onClick={() => confirm('Wipe data secara permanen?') && setState({transactions:[], emergencyFundAmount:0, vaultLogs:[], isEncrypted: true})} className="glass-panel p-8 rounded-[2rem] flex items-center justify-between group text-rose-500 border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-all">
                  <div className="flex items-center gap-5">
                    <Trash2 size={24} />
                    <span className="font-bold text-lg">Reset Memori Sigma</span>
                  </div>
                  <AlertTriangle size={20} />
               </button>
            </div>
          </div>
        )}
      </main>

      {/* Navigasi Bawah - FIXED CENTERED DESIGN FOR ALL MOBILE DEVICES */}
      {!isEditingVault && (
        <div className="fixed bottom-8 left-0 right-0 z-[40000] px-6 flex justify-center pointer-events-none">
          <nav className="pointer-events-auto flex items-center justify-around w-full max-w-[360px] bg-slate-900/95 border border-white/15 shadow-[0_20px_60px_rgba(0,0,0,0.8)] rounded-full p-2 ring-4 ring-black/40 animate-status-pop">
            {[
              { id: 'home', icon: Home, label: 'Hub' },
              { id: 'history', icon: List, label: 'Arsip' },
              { id: 'menu', icon: Settings, label: 'Root' }
            ].map((item) => (
              <button 
                key={item.id} 
                onClick={() => setActiveTab(item.id as any)} 
                className={`flex-1 flex flex-col items-center py-3 rounded-full transition-all duration-300 ${activeTab === item.id ? 'bg-indigo-600 text-white shadow-2xl scale-105' : 'text-slate-400 hover:text-white'}`}
              >
                <item.icon size={20} />
                <span className="text-[9px] font-bold uppercase mt-1 tracking-widest">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Vault UI Overlay - FULL SCREEN COVER */}
      {isEditingVault && (
        <div className="fixed inset-0 bg-slate-950 z-[50000] flex flex-col h-full w-full overflow-hidden animate-reveal">
          <div className="flex-none bg-slate-900/90 backdrop-blur-3xl border-b border-white/10 p-6 flex justify-between items-center z-50">
             <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20"><Cpu size={20} className="text-amber-500" /></div>
                <div>
                   <h2 className="text-xl font-bold uppercase tracking-tight">Sektor Brankas</h2>
                   <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">Node Dana Terenkripsi</p>
                </div>
             </div>
             <button onClick={() => { setIsEditingVault(false); setIsVaultUnlocked(false); }} className="p-3 bg-white/5 rounded-full hover:bg-rose-500 transition-all active:scale-90"><X size={24} /></button>
          </div>

          {!isVaultUnlocked ? (
             <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-12">
                <div className={`w-56 h-56 rounded-[3.5rem] flex items-center justify-center shadow-2xl transition-all duration-700 ${isUnlocking ? 'bg-indigo-600 scale-110' : 'bg-slate-900 border border-white/5 animate-pulse'}`}>
                   {isUnlocking ? <Loader2 size={64} className="animate-spin text-white" /> : <Fingerprint size={84} className="text-indigo-400" />}
                </div>
                <div className="text-center space-y-4 max-w-xs">
                   <h3 className="text-4xl font-black uppercase tracking-tight">{isUnlocking ? 'Otorisasi' : 'Terkunci'}</h3>
                   <p className="text-slate-400 text-sm leading-relaxed">Gunakan protokol biometrik Sigma untuk memproses dana cadangan.</p>
                </div>
                <button onClick={handleUnlockVault} className="w-full max-w-sm py-6 rounded-2xl bg-white text-slate-950 font-black text-lg shadow-2xl active:scale-95 transition-all uppercase tracking-widest">AKTIVASI AKSES</button>
             </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 bg-slate-950">
               <div className="flex-none p-6 space-y-6 bg-slate-900/30 border-b border-white/5 shadow-2xl">
                  <div className="text-center space-y-1">
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Volume Tersimpan</p>
                     <p className="text-4xl md:text-5xl font-black text-white font-mono tracking-tighter">
                        {CURRENCY_FORMATTER.format(state.emergencyFundAmount)}
                     </p>
                  </div>
                  <div className="flex p-1 bg-black/60 rounded-2xl ring-1 ring-white/10 shadow-inner">
                     <button onClick={() => setVaultMode('manual')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${vaultMode === 'manual' ? 'bg-white text-slate-950 shadow-lg scale-100' : 'text-slate-400'}`}><Keyboard size={16} /> Manual</button>
                     <button onClick={() => setVaultMode('ai')} className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-xs font-bold transition-all ${vaultMode === 'ai' ? 'bg-white text-slate-950 shadow-lg scale-100' : 'text-slate-400'}`}><Sparkles size={16} /> AI Node</button>
                  </div>

                  <div className="animate-reveal">
                    {vaultMode === 'manual' ? (
                      <div className="space-y-4">
                         <div className="grid grid-cols-1 gap-3">
                            <input 
                              type="number" 
                              value={manualAmount}
                              onChange={(e) => setManualAmount(e.target.value)}
                              placeholder="Nominal..."
                              className="w-full bg-black/80 rounded-xl py-4 px-6 text-xl font-bold border border-white/10 focus:border-amber-500 outline-none text-white font-mono placeholder:text-slate-700"
                            />
                            <input 
                              type="text" 
                              value={manualReason}
                              onChange={(e) => setManualReason(e.target.value)}
                              placeholder="Keterangan..."
                              className="w-full bg-black/80 rounded-xl py-3.5 px-6 text-sm border border-white/10 focus:border-amber-500 outline-none text-white placeholder:text-slate-700"
                            />
                         </div>
                         <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => handleManualVault('lock')} className="py-4 rounded-xl bg-emerald-600 font-black text-white text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                               <Lock size={16} /> AMANKAN
                            </button>
                            <button onClick={() => handleManualVault('release')} className="py-4 rounded-xl bg-rose-600 font-black text-white text-xs shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-widest">
                               <Unlock size={16} /> CAIRKAN
                            </button>
                         </div>
                      </div>
                    ) : (
                      <div className="relative">
                         <textarea
                            value={vaultAiInput}
                            onChange={(e) => setVaultAiInput(e.target.value)}
                            placeholder="Ketik perintah brankas..."
                            className="w-full bg-black/80 rounded-xl py-4 px-6 h-28 text-base font-bold border border-white/10 focus:border-amber-500 outline-none text-white resize-none placeholder:text-slate-700"
                         />
                         <button 
                           onClick={async () => {
                             if(!vaultAiInput.trim() || isProcessing) return;
                             setIsProcessing(true);
                             try {
                               const result = await parseSigmaCommand(vaultAiInput);
                               if(result) await processBahliljuleAction(result);
                               setVaultAiInput('');
                             } finally { setIsProcessing(false); }
                           }}
                           className="absolute right-4 bottom-4 bg-amber-500 text-slate-950 p-3.5 rounded-xl shadow-2xl active:scale-90 transition-all"
                         >
                            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                         </button>
                      </div>
                    )}
                  </div>
               </div>

               <div className="flex-1 flex flex-col min-h-0 bg-black/30">
                  <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3 bg-slate-900/40">
                     <Database size={16} className="text-amber-500" />
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Arsip Audit Brankas</span>
                  </div>
                  <div 
                    ref={auditLogContainerRef} 
                    className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain touch-pan-y no-scrollbar"
                    style={{ WebkitOverflowScrolling: 'touch' }}
                  >
                     {state.vaultLogs.length === 0 ? (
                        <div className="py-24 text-center opacity-30 flex flex-col items-center justify-center">
                          <History size={56} className="mb-4 text-slate-500" />
                          <p className="font-mono text-xs tracking-[1em] uppercase text-slate-400">Log_Kosong</p>
                        </div>
                     ) : (
                        state.vaultLogs.map((log) => (
                           <div key={log.id} className="p-4 rounded-xl bg-white/[0.04] border border-white/5 flex items-center justify-between group shadow-lg">
                              <div className="flex items-center gap-4">
                                 <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${log.type === 'lock' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                    {log.type === 'lock' ? <Lock size={18} /> : <Unlock size={18} />}
                                 </div>
                                 <div className="space-y-1">
                                    <p className="font-bold text-lg font-mono text-white tracking-tighter">{CURRENCY_FORMATTER.format(log.amount)}</p>
                                    <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold line-clamp-1 leading-none mt-1">{log.reason}</p>
                                 </div>
                              </div>
                              <div className="text-right flex flex-col justify-center opacity-60">
                                 <span className="text-[9px] font-mono text-slate-300 block uppercase font-bold">{new Date(log.date).toLocaleDateString()}</span>
                                 <span className="text-[9px] font-mono text-slate-300 block uppercase">{new Date(log.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                              </div>
                           </div>
                        ))
                     )}
                     <div className="h-20 flex-none" />
                  </div>
               </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Deposit Dialog */}
      {showQuickAction && (
        <div className="fixed inset-0 bg-black/95 z-[60000] flex items-center justify-center p-6 animate-reveal" onClick={() => setShowQuickAction(null)}>
          <div className="glass-panel w-full max-w-sm rounded-[3rem] p-10 space-y-8" onClick={e => e.stopPropagation()}>
            <div className="text-center space-y-4">
              <div className={`w-24 h-24 mx-auto rounded-[2.2rem] flex items-center justify-center text-5xl text-white shadow-2xl border-4 border-white/20 ${showQuickAction === 'Azis Khoirul' ? 'bg-blue-600' : 'bg-rose-600'}`}>
                {showQuickAction === 'Azis Khoirul' ? 'A' : 'S'}
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase tracking-tight">{showQuickAction}</h3>
                <p className="text-xs font-mono text-indigo-400 font-bold uppercase tracking-widest">Fast Track Deposit</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {QUICK_AMOUNTS.map(amount => (
                <button 
                  key={amount} 
                  onClick={() => { 
                    processBahliljuleAction({ action: 'deposit', saver: showQuickAction, amount, note: 'Quick Entry', confidence: 1 });
                    setShowQuickAction(null); 
                  }} 
                  className="bg-white/5 hover:bg-white hover:text-slate-950 py-7 rounded-2xl font-black text-2xl transition-all border border-white/10 font-mono active:scale-90 shadow-xl"
                >
                  {amount >= 1000 ? `${amount/1000}K` : amount}
                </button>
              ))}
            </div>
            <button onClick={() => setShowQuickAction(null)} className="w-full py-4 text-slate-500 font-bold uppercase tracking-widest text-[10px] hover:text-white transition-colors underline underline-offset-4">Batalkan Transaksi</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
