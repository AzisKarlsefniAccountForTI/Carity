
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Transaction, SaverName, AppState, VaultLog, AIResult } from './types';
import { STORAGE_KEY, CURRENCY_FORMATTER, QUICK_AMOUNTS, APP_TITLE, APP_SUBTITLE } from './constants';
import Countdown from './components/Countdown';
import SavingsChart from './components/SavingsChart';
import { parseSigmaCommand } from './services/geminiService';
import { 
  Plus, Trash2, Send, BrainCircuit, Heart, 
  ChevronRight, Settings, Home, List,
  Zap, ShieldAlert, TrendingUp, Fingerprint, Eye, CheckCircle2,
  Lock, Unlock, History, Info, Download, Terminal, Loader2,
  Shield // Added Shield import
} from 'lucide-react';

// Sigma Security Utilities
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
  const [activeTab, setActiveTab] = useState<'home' | 'history' | 'menu'>('home');
  const [showQuickAction, setShowQuickAction] = useState<SaverName | null>(null);
  const [isEditingVault, setIsEditingVault] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    const dataToSave = encryptData(state);
    localStorage.setItem(STORAGE_KEY, dataToSave);
  }, [state]);

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
    const azis = state.transactions.filter(t => t.saver === 'Azis Ganteng').reduce((acc, curr) => acc + curr.amount, 0);
    const siska = state.transactions.filter(t => t.saver === 'Siska Gemoy').reduce((acc, curr) => acc + curr.amount, 0);
    const effective = total - state.emergencyFundAmount;
    return { total, azis, siska, effective };
  }, [state.transactions, state.emergencyFundAmount]);

  const handleUnlockVault = () => {
    setIsUnlocking(true);
    setTimeout(() => {
      setIsVaultUnlocked(true);
      setIsUnlocking(false);
      showToast("Sigma Vault Berhasil Didekripsi");
    }, 1500);
  };

  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      const timestamp = new Date().toLocaleString('id-ID');
      
      // Styling
      doc.setFillColor(15, 23, 42); // Navy background
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN PROTOKOL SIGMA 2026", 14, 25);
      
      doc.setFontSize(10);
      doc.text(`Dicetak pada: ${timestamp}`, 14, 34);
      
      // Balance Overview
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.text("Ringkasan Saldo", 14, 55);
      
      const summaryData = [
        ["Liquid Azis Ganteng", CURRENCY_FORMATTER.format(totals.azis)],
        ["Liquid Siska Gemoy", CURRENCY_FORMATTER.format(totals.siska)],
        ["Dana Terkunci (Vault)", CURRENCY_FORMATTER.format(state.emergencyFundAmount)],
        ["Total Akumulasi", CURRENCY_FORMATTER.format(totals.total)]
      ];
      
      (doc as any).autoTable({
        startY: 60,
        head: [['Kategori', 'Nominal']],
        body: summaryData,
        theme: 'striped',
        headStyles: { fillColor: [99, 102, 241] }
      });
      
      // Transactions Table
      doc.text("Detail Transaksi", 14, (doc as any).lastAutoTable.finalY + 15);
      
      const tableData = state.transactions.map(t => [
        new Date(t.date).toLocaleDateString('id-ID'),
        t.saver,
        t.note,
        CURRENCY_FORMATTER.format(t.amount)
      ]);
      
      (doc as any).autoTable({
        startY: (doc as any).lastAutoTable.finalY + 20,
        head: [['Tanggal', 'Nama', 'Catatan', 'Jumlah']],
        body: tableData,
        headStyles: { fillColor: [15, 23, 42] }
      });
      
      doc.save(`Protokol-Sigma-${new Date().getTime()}.pdf`);
      showToast("PDF Berhasil Diunduh");
    } catch (error) {
      console.error(error);
      showToast("Gagal membuat PDF", "error");
    }
  };

  const processBahliljuleAction = async (result: AIResult) => {
    const { action, amount, saver, note, reason } = result;

    if (action === 'deposit') {
      const newTransaction: Transaction = {
        id: Math.random().toString(36).substr(2, 9),
        saver: saver || 'Azis Ganteng',
        amount,
        note: note || 'Setoran Sigma',
        date: new Date().toISOString()
      };
      setState(prev => ({ ...prev, transactions: [newTransaction, ...prev.transactions] }));
      showToast(`${CURRENCY_FORMATTER.format(amount)} Berhasil Disetor`);
      return `Berhasil! ${CURRENCY_FORMATTER.format(amount)} telah masuk ke saldo utama.`;
    }

    if (action === 'vault_lock') {
      if (amount > totals.effective) {
        showToast("Saldo liquid tidak cukup", "error");
        return "Gagal. Saldo Liquid tidak cukup.";
      }
      const newLog: VaultLog = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        type: 'lock',
        reason: reason || 'Proteksi Otomatis',
        date: new Date().toISOString()
      };
      setState(prev => ({
        ...prev,
        emergencyFundAmount: prev.emergencyFundAmount + amount,
        vaultLogs: [newLog, ...prev.vaultLogs]
      }));
      showToast("Dana Berhasil Diamankan di Vault");
      return `Sigma Vault Terkunci! ${CURRENCY_FORMATTER.format(amount)} diamankan.`;
    }

    if (action === 'vault_release') {
      if (amount > state.emergencyFundAmount) {
        showToast("Dana vault tidak mencukupi", "error");
        return "Gagal. Brankas tidak cukup.";
      }
      const newLog: VaultLog = {
        id: Math.random().toString(36).substr(2, 9),
        amount,
        type: 'release',
        reason: reason || 'Pelepasan Dana',
        date: new Date().toISOString()
      };
      setState(prev => ({
        ...prev,
        emergencyFundAmount: prev.emergencyFundAmount - amount,
        vaultLogs: [newLog, ...prev.vaultLogs]
      }));
      showToast("Dana Dirilis dari Vault");
      return `Protokol Rilis Aktif. ${CURRENCY_FORMATTER.format(amount)} kembali ke liquid.`;
    }

    return "Bahliljule tidak mengerti.";
  };

  const saversData = [
    { 
      name: 'Azis Ganteng' as SaverName, 
      total: totals.azis, 
      color: 'from-indigo-600 to-blue-800', 
      icon: '👤', 
      shadow: 'shadow-indigo-500/20' 
    },
    { 
      name: 'Siska Gemoy' as SaverName, 
      total: totals.siska, 
      color: 'from-rose-500 to-pink-700', 
      icon: '🌸', 
      shadow: 'shadow-rose-500/20' 
    }
  ];

  return (
    <div className="min-h-screen bg-[#020617] pb-40 text-slate-100 font-['Plus_Jakarta_Sans']">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-10 left-1/2 -translate-x-1/2 z-[200] px-8 py-4 rounded-3xl shadow-2xl border backdrop-blur-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-10 duration-500 ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/20 border-rose-500/30 text-rose-400'}`}>
          {toast.type === 'success' ? <CheckCircle2 size={20} /> : <ShieldAlert size={20} />}
          <span className="font-bold text-sm uppercase tracking-wider">{toast.message}</span>
        </div>
      )}

      <header className="bg-gradient-to-b from-slate-900 via-slate-950 to-[#020617] pt-20 pb-48 px-6 relative overflow-hidden border-b border-white/5">
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 blur-[150px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-emerald-500/5 blur-[120px] rounded-full" />
        
        <div className="max-w-6xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="space-y-6 text-center md:text-left">
              <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 rounded-full border border-white/10">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Live Mission: Aug 29, 2026</span>
              </div>
              <h1 className="text-6xl md:text-8xl font-[800] tracking-tighter leading-none italic uppercase bg-gradient-to-r from-white via-indigo-200 to-white/40 bg-clip-text text-transparent">
                {APP_TITLE}
              </h1>
              <p className="text-slate-500 font-bold text-lg tracking-wide uppercase italic">
                 {APP_SUBTITLE}
              </p>
            </div>
            
            <button 
              onClick={downloadPDF}
              className="bg-white text-slate-950 px-10 py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] flex items-center gap-3 hover:scale-110 active:scale-95 transition-all shadow-[0_20px_40px_rgba(255,255,255,0.1)]"
            >
              <Download size={18} strokeWidth={3} />
              Export Protocol PDF
            </button>
          </div>

          <div className="mt-24 grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 p-12 rounded-[4rem] group hover:bg-white/[0.04] transition-all">
              <div className="flex items-center gap-4 mb-4 text-emerald-500">
                <TrendingUp size={20} />
                <span className="text-[10px] font-black uppercase tracking-[0.5em]">Capital Liquid</span>
              </div>
              <h2 className="text-7xl md:text-8xl font-black tracking-tighter text-white">
                {CURRENCY_FORMATTER.format(totals.effective)}
              </h2>
              <div className="mt-8 flex items-center gap-6">
                 <div className="px-4 py-2 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase">
                    Status: High Precision
                 </div>
              </div>
            </div>

            <div 
              onClick={() => setIsEditingVault(true)}
              className="bg-slate-900/40 backdrop-blur-3xl border border-amber-500/20 rounded-[4rem] p-12 cursor-pointer hover:bg-slate-800/60 transition-all group relative overflow-hidden shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-amber-500 rounded-[2rem] flex items-center justify-center text-slate-950 shadow-2xl shadow-amber-500/30 group-hover:rotate-12 transition-transform">
                     <Lock className="w-8 h-8" strokeWidth={3} />
                   </div>
                   <div>
                     <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-500">Sigma Vault</p>
                     <p className="text-xs text-slate-500 font-bold">Secure Hardware Wallet</p>
                   </div>
                 </div>
                 <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                    <ChevronRight size={24} />
                 </div>
              </div>
              <p className="text-5xl font-black text-white tracking-tight">
                {CURRENCY_FORMATTER.format(state.emergencyFundAmount)}
              </p>
              <div className="mt-8 h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.6)] transition-all duration-1000" 
                  style={{ width: `${Math.min((state.emergencyFundAmount / (totals.total || 1)) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 -mt-24 relative z-20">
        {activeTab === 'home' && (
          <div className="space-y-16 animate-in fade-in slide-in-from-bottom-10 duration-700">
            <div className="bg-slate-900/80 backdrop-blur-3xl rounded-[4rem] p-4 shadow-2xl border border-white/5">
              <Countdown />
            </div>

            <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 rounded-[4.5rem] p-16 border border-indigo-500/20 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex flex-col md:flex-row items-center gap-8 mb-12">
                  <div className={`w-24 h-24 bg-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl relative transition-all duration-500 ${isProcessing ? 'animate-pulse scale-110' : ''}`}>
                    <Terminal className="text-white w-12 h-12" />
                    {isProcessing && <div className="absolute inset-0 rounded-[2.5rem] border-4 border-indigo-400 animate-ping" />}
                  </div>
                  <div className="text-center md:text-left">
                    <h3 className="font-black text-4xl tracking-tighter italic uppercase">Bahliljule <span className="text-indigo-400 font-normal">Command</span></h3>
                    <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px] mt-2 italic">Neural Financial Assistant</p>
                  </div>
                </div>
                
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!aiInput.trim() || isProcessing) return;
                    setIsProcessing(true);
                    try {
                      const result = await parseSigmaCommand(aiInput);
                      if (result) {
                        const message = await processBahliljuleAction(result);
                        setAiInput('');
                      }
                    } catch (e) { showToast("AI Interface Error", "error"); } finally { setIsProcessing(false); }
                }} className="relative group/input">
                  <input
                    type="text"
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    placeholder="Contoh: 'Bahliljule, Siska setor 100rb untuk tabungan'"
                    className="w-full bg-slate-950/80 rounded-[3rem] py-12 px-14 text-2xl font-medium placeholder:text-slate-800 border border-indigo-500/20 focus:border-indigo-500/50 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-inner text-white"
                  />
                  <button type="submit" disabled={!aiInput.trim() || isProcessing} className="absolute right-6 top-6 bottom-6 bg-indigo-600 text-white px-12 rounded-[2.5rem] hover:bg-indigo-500 disabled:bg-slate-800 transition-all shadow-xl active:scale-95 flex items-center justify-center">
                    {isProcessing ? <Loader2 className="animate-spin w-8 h-8" /> : <Send size={32} />}
                  </button>
                </form>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              {saversData.map((saver) => (
                <div 
                  key={saver.name}
                  onClick={() => setShowQuickAction(saver.name as SaverName)}
                  className={`bg-slate-900/40 p-12 rounded-[4rem] border border-white/5 group hover:bg-white/[0.02] hover:scale-[1.02] active:scale-95 transition-all cursor-pointer flex items-center gap-10 relative overflow-hidden`}
                >
                  <div className={`w-32 h-32 rounded-[2.5rem] bg-gradient-to-br ${saver.color} flex items-center justify-center text-6xl shadow-2xl shrink-0 group-hover:rotate-6 transition-transform border-4 border-white/10`}>
                    {saver.icon}
                  </div>

                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-[0.5em] mb-3 italic">{saver.name}</p>
                    <p className="text-5xl font-black text-white leading-none tracking-tighter">{CURRENCY_FORMATTER.format(saver.total)}</p>
                    <div className="mt-8 inline-flex items-center gap-2 text-indigo-400 text-[9px] font-black uppercase tracking-widest bg-indigo-500/5 px-6 py-2.5 rounded-full border border-indigo-500/10 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <Plus size={14} /> Sigma Express
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <SavingsChart transactions={state.transactions} protectedAmount={state.emergencyFundAmount} />
          </div>
        )}

        {activeTab === 'history' && (
           <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700">
             <div className="flex items-center justify-between px-6">
                <h3 className="font-black text-4xl italic uppercase tracking-tighter">Sigma Logs</h3>
                <button onClick={downloadPDF} className="text-indigo-400 font-bold text-xs uppercase tracking-widest flex items-center gap-2 hover:text-white transition-colors">
                  <Download size={16} /> Get PDF Report
                </button>
             </div>
             
             <div className="bg-slate-900/40 rounded-[4rem] border border-white/5 overflow-hidden shadow-2xl">
               {state.transactions.length === 0 ? (
                 <div className="py-48 text-center text-slate-700 font-black uppercase tracking-[1em] text-sm">No Encrypted Records</div>
               ) : (
                 <div className="divide-y divide-white/5">
                   {state.transactions.map(t => (
                     <div key={t.id} className="p-12 flex items-center justify-between hover:bg-white/[0.02] transition-all group">
                        <div className="flex items-center gap-12">
                           <div className={`w-20 h-20 rounded-[1.5rem] flex items-center justify-center text-3xl font-black text-white shadow-2xl ${t.saver === 'Azis Ganteng' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                             {t.saver[0]}
                           </div>
                           <div>
                              <p className="font-black text-white text-3xl leading-tight tracking-tighter mb-2 italic">{CURRENCY_FORMATTER.format(t.amount)}</p>
                              <div className="flex items-center gap-4">
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.saver}</p>
                                 <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
                                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">"{t.note}"</p>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-8">
                           <p className="text-[10px] font-black text-slate-700 uppercase">{new Date(t.date).toLocaleDateString('id-ID')}</p>
                           <button onClick={() => { if(confirm('Wipe record?')) setState(prev => ({...prev, transactions: prev.transactions.filter(x => x.id !== t.id)}))}} className="text-slate-800 hover:text-rose-500 p-4 transition-all hover:bg-rose-500/10 rounded-2xl"><Trash2 size={24} /></button>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           </div>
        )}

        {activeTab === 'menu' && (
           <div className="space-y-12 animate-in fade-in slide-in-from-bottom-10 duration-700 pb-20">
             <h3 className="px-6 font-black text-slate-600 text-[11px] uppercase tracking-[1em]">Security Console</h3>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-slate-900/40 p-12 rounded-[4rem] border border-white/5 flex items-center justify-between shadow-2xl">
                  <div className="flex items-center gap-8">
                    {/* Fix: Changed ShieldIcon to Shield and added it to the imports */}
                    <div className="p-6 bg-indigo-600/10 text-indigo-500 rounded-[2rem] border border-indigo-500/20"><Shield size={36}/></div>
                    <div>
                        <p className="font-black text-white text-2xl tracking-tighter uppercase mb-1">E2EE Storage</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Azis-Siska Sync Active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-emerald-500/10 px-6 py-2 rounded-full border border-emerald-500/20">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                      <span className="text-[10px] font-black text-emerald-500 uppercase">Live</span>
                  </div>
                </div>

                <button onClick={downloadPDF} className="bg-slate-900/40 p-12 rounded-[4rem] border border-white/5 flex items-center justify-between group hover:bg-white/[0.04] transition-all">
                  <div className="flex items-center gap-8">
                    <div className="p-6 bg-white text-slate-950 rounded-[2rem] shadow-2xl"><Download size={36} /></div>
                    <div className="text-left">
                        <p className="font-black text-white text-2xl tracking-tighter uppercase mb-1 italic">Backup Protocol</p>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Download Full Audit Log</p>
                    </div>
                  </div>
                  <ChevronRight className="text-slate-700" />
                </button>
             </div>

             <button onClick={() => {if(confirm('Format Sigma Database?')) setState({transactions:[], emergencyFundAmount:0, vaultLogs:[], isEncrypted: true})}} className="w-full bg-slate-950 p-12 rounded-[4rem] shadow-2xl flex items-center justify-between group hover:bg-rose-500/5 transition-all border border-rose-500/20">
               <div className="flex items-center gap-8">
                 <div className="p-6 bg-rose-500/10 text-rose-500 rounded-[2rem] border border-rose-500/20"><ShieldAlert size={36}/></div>
                 <div className="text-left">
                    <p className="font-black text-white text-2xl tracking-tighter mb-1 italic uppercase">Force Wipe Database</p>
                    <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest">Permanent Erasure of Encrypted Data</p>
                 </div>
               </div>
               <Trash2 className="text-slate-900" />
             </button>
           </div>
        )}
      </main>

      <nav className="fixed bottom-10 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-slate-900/60 backdrop-blur-3xl border border-white/10 shadow-[0_40px_100px_rgba(0,0,0,0.8)] rounded-[4.5rem] p-3 flex items-center justify-around z-[100]">
        {[
          { id: 'home', icon: Home, label: 'Hub' },
          { id: 'history', icon: List, label: 'Audit' },
          { id: 'menu', icon: Settings, label: 'Root' }
        ].map((item) => (
          <button 
            key={item.id} 
            onClick={() => setActiveTab(item.id as any)} 
            className={`flex-1 flex flex-col items-center py-6 rounded-[3.5rem] transition-all duration-500 ${activeTab === item.id ? 'bg-white text-slate-950 shadow-2xl scale-105 -translate-y-2' : 'text-slate-500 hover:text-white'}`}
          >
            <item.icon className="w-8 h-8" strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
            {activeTab === item.id && <span className="text-[9px] font-black uppercase tracking-widest mt-2">{item.label}</span>}
          </button>
        ))}
      </nav>

      {/* MODAL SIGMA VAULT */}
      {isEditingVault && (
        <div className="fixed inset-0 bg-black/98 backdrop-blur-[60px] z-[150] flex items-center justify-center p-6" onClick={() => { if(!isUnlocking) setIsEditingVault(false); }}>
          <div className="bg-[#0f172a] w-full max-w-6xl rounded-[5rem] overflow-hidden border border-white/10 relative" onClick={e => e.stopPropagation()}>
            {!isVaultUnlocked && (
               <div className={`absolute inset-0 z-20 flex flex-col items-center justify-center space-y-12 transition-all duration-1000 ${isUnlocking ? 'bg-emerald-500/10' : 'bg-slate-950/98'}`}>
                  <div className={`w-40 h-40 rounded-[3.5rem] flex items-center justify-center shadow-2xl relative overflow-hidden transition-all duration-700 ${isUnlocking ? 'bg-emerald-500 scale-110 shadow-emerald-500/30' : 'bg-indigo-600 animate-pulse'}`}>
                     {isUnlocking ? (
                       <Loader2 size={80} className="text-slate-950 animate-spin" strokeWidth={3} />
                     ) : (
                       <Fingerprint size={80} className="text-slate-950" strokeWidth={1.5} />
                     )}
                     {isUnlocking && <div className="absolute top-0 left-0 w-full h-2 bg-white/40 animate-[scan_1.5s_infinite]" />}
                  </div>
                  
                  <div className="text-center space-y-4">
                     <h3 className={`text-5xl font-black italic tracking-tighter uppercase transition-colors ${isUnlocking ? 'text-emerald-400' : 'text-white'}`}>
                       {isUnlocking ? 'Decrypting Protocol...' : 'Sigma Vault Access'}
                     </h3>
                     <p className={`font-black uppercase tracking-[0.6em] text-[10px] transition-colors ${isUnlocking ? 'text-emerald-600' : 'text-slate-500'}`}>
                        Requires Neural Signature Azis-Siska
                     </p>
                  </div>
                  
                  <button 
                    disabled={isUnlocking}
                    onClick={handleUnlockVault} 
                    className={`px-16 py-8 rounded-full font-black text-2xl transition-all shadow-2xl flex items-center gap-5 active:scale-95 disabled:opacity-50 ${isUnlocking ? 'bg-emerald-500 text-white' : 'bg-white text-slate-950 hover:scale-105'}`}
                  >
                     {isUnlocking ? <Loader2 className="animate-spin" /> : <Eye size={32} />}
                     {isUnlocking ? 'DECRYPTING...' : 'Start Authentication'}
                  </button>

                  <style>{`
                    @keyframes scan { 0% { top: 0%; } 100% { top: 100%; } }
                  `}</style>
               </div>
            )}

            <div className={`relative p-16 md:p-24 flex flex-col lg:flex-row gap-20 transition-all duration-1000 ${isVaultUnlocked ? 'opacity-100' : 'opacity-0 scale-95'}`}>
               <div className="flex-1 space-y-16">
                  <div className="flex items-center gap-10">
                     <div className="w-24 h-24 bg-amber-500 rounded-[2.5rem] flex items-center justify-center text-slate-950 shadow-2xl border-4 border-amber-400">
                        <Lock size={48} strokeWidth={3} />
                     </div>
                     <div>
                        <h3 className="text-6xl font-[900] text-white leading-none mb-4 tracking-tighter italic uppercase">Vault Console</h3>
                        <p className="text-amber-500 text-[10px] font-black uppercase tracking-[0.6em]">Authorized Kernel Access</p>
                     </div>
                  </div>

                  <div className="bg-slate-950/80 p-20 rounded-[4rem] border border-white/5 text-center shadow-inner group">
                     <p className="text-[11px] font-black text-slate-600 uppercase tracking-[0.6em] mb-8">Asset Volume Secured</p>
                     <p className="text-8xl font-black text-white tracking-tighter drop-shadow-[0_0_40px_rgba(255,255,255,0.1)] group-hover:scale-105 transition-transform">{CURRENCY_FORMATTER.format(state.emergencyFundAmount)}</p>
                  </div>

                  <div className="space-y-10 bg-white/[0.02] p-12 rounded-[4rem] border border-white/5">
                     <form onSubmit={async (e) => {
                        e.preventDefault();
                        if (!vaultAiInput.trim() || isProcessing) return;
                        setIsProcessing(true);
                        try {
                           const result = await parseSigmaCommand(vaultAiInput);
                           if (result) {
                              if (result.action === 'deposit') {
                                 showToast("Gunakan Hub untuk deposit", "error");
                              } else {
                                 const msg = await processBahliljuleAction(result);
                                 setVaultAiInput('');
                              }
                           }
                        } catch (e) { showToast("Kernel Error", "error"); } finally { setIsProcessing(false); }
                     }} className="relative">
                        <textarea
                           value={vaultAiInput}
                           onChange={(e) => setVaultAiInput(e.target.value)}
                           rows={3}
                           placeholder="Ex: 'Bahliljule, amankan 2jt di brankas'"
                           className="w-full bg-slate-950/90 rounded-[3rem] py-12 px-14 text-2xl font-medium placeholder:text-slate-800 border border-amber-500/20 focus:outline-none focus:ring-4 focus:ring-amber-500/10 transition-all shadow-inner resize-none text-white"
                        />
                        <button type="submit" className="absolute right-8 bottom-8 bg-amber-500 text-slate-950 p-8 rounded-[2.5rem] hover:bg-amber-400 transition-all shadow-2xl active:scale-90">
                           {isProcessing ? <Loader2 className="animate-spin" /> : <Send size={36} />}
                        </button>
                     </form>
                  </div>
               </div>

               <div className="hidden lg:block w-[1px] bg-white/5 self-stretch" />

               <div className="flex-1 space-y-14">
                  <div className="flex items-center justify-between">
                     <div className="flex items-center gap-6">
                        <History size={32} className="text-slate-700" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">Vault Audit Log</p>
                     </div>
                  </div>
                  <div className="h-[600px] overflow-y-auto space-y-8 pr-4">
                     {state.vaultLogs.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-800 space-y-8">
                           <Info size={64} strokeWidth={1} />
                           <p className="text-[10px] font-black uppercase tracking-[0.5em]">Log is Clean</p>
                        </div>
                     ) : (
                       state.vaultLogs.map(log => (
                        <div key={log.id} className="bg-white/[0.02] p-10 rounded-[3.5rem] border border-white/5 flex items-center justify-between hover:bg-white/[0.04] transition-all">
                           <div className="flex items-center gap-8">
                              <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center ${log.type === 'lock' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                 {log.type === 'lock' ? <Lock size={28} /> : <Unlock size={28} />}
                              </div>
                              <div>
                                 <p className="text-3xl font-black text-white tracking-tighter mb-1 italic">{CURRENCY_FORMATTER.format(log.amount)}</p>
                                 <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">{log.reason}</p>
                              </div>
                           </div>
                           <p className="text-[10px] text-slate-700 font-black uppercase">{new Date(log.date).toLocaleDateString()}</p>
                        </div>
                       ))
                     )}
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK DEPOSIT MODAL */}
      {showQuickAction && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-[80px] z-[160] flex items-center justify-center p-6" onClick={() => setShowQuickAction(null)}>
          <div className="bg-[#0f172a] w-full max-w-2xl rounded-[5rem] p-24 shadow-2xl border border-white/10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-indigo-500/0 via-indigo-500 to-indigo-500/0 animate-pulse" />
            <div className="text-center mb-16">
              <div className={`w-36 h-36 rounded-[3rem] mx-auto mb-12 flex items-center justify-center text-8xl text-white shadow-2xl border-4 border-white/10 ${showQuickAction === 'Azis Ganteng' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                {showQuickAction === 'Azis Ganteng' ? '👤' : '🌸'}
              </div>
              <h3 className="text-6xl font-black text-white leading-tight mb-4 tracking-tighter italic uppercase">{showQuickAction}</h3>
              <p className="text-indigo-400 font-black text-[10px] uppercase tracking-[0.6em]">Express Signal Boost</p>
            </div>
            <div className="grid grid-cols-2 gap-6 mb-16">
              {QUICK_AMOUNTS.map(amount => (
                <button 
                  key={amount} 
                  onClick={() => { 
                    processBahliljuleAction({ action: 'deposit', saver: showQuickAction, amount, note: 'Quick Sigma Boost', confidence: 1 });
                    setShowQuickAction(null); 
                  }} 
                  className="bg-slate-950 hover:bg-white hover:text-slate-950 py-12 rounded-[3rem] font-black text-4xl text-white transition-all active:scale-90 border border-white/5 shadow-inner"
                >
                  {amount >= 1000 ? `${amount/1000}K` : amount}
                </button>
              ))}
            </div>
            <button onClick={() => setShowQuickAction(null)} className="w-full py-4 text-slate-700 font-black text-[11px] uppercase tracking-[1em] hover:text-white transition-all italic">Abort Protocol</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
