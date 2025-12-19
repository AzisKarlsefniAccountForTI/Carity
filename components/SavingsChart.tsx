
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ShieldCheck, TrendingUp } from 'lucide-react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  protectedAmount: number;
}

const COLORS = ['#6366f1', '#f43f5e', '#f59e0b']; // Indigo, Rose, Amber

const SavingsChart: React.FC<Props> = ({ transactions, protectedAmount }) => {
  const azisTotal = transactions.filter(t => t.saver === 'Azis Ganteng').reduce((acc, curr) => acc + curr.amount, 0);
  const siskaTotal = transactions.filter(t => t.saver === 'Siska Gemoy').reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalRaw = azisTotal + siskaTotal;
  const ratio = totalRaw > 0 ? protectedAmount / totalRaw : 0;
  
  const dataPie = [
    { name: 'Liquid Azis', value: azisTotal * (1 - ratio) },
    { name: 'Liquid Siska', value: siskaTotal * (1 - ratio) },
    { name: 'Sigma Vault', value: protectedAmount }
  ];

  const dataBar = [
    { name: 'AZIS', value: azisTotal },
    { name: 'SISKA', value: siskaTotal },
    { name: 'VAULT', value: protectedAmount }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
      <div className="bg-slate-900/60 p-12 rounded-[4.5rem] shadow-2xl border border-white/5 h-[500px] relative overflow-hidden group">
        <div className="flex justify-between items-center mb-10 relative z-10">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] italic">Asset Kernel Distribution</h3>
          <ShieldCheck size={20} className="text-indigo-500" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
           <div className="w-48 h-48 rounded-full border border-indigo-500/20 animate-ping" />
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataPie}
              innerRadius={90}
              outerRadius={125}
              paddingAngle={12}
              dataKey="value"
              stroke="none"
              cornerRadius={20}
            >
              {dataPie.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: '#020617', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.8)', padding: '20px' }}
              itemStyle={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}
              formatter={(value: number) => [`Rp ${Math.floor(value).toLocaleString()}`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-slate-900/60 p-12 rounded-[4.5rem] shadow-2xl border border-white/5 h-[500px] relative overflow-hidden">
        <div className="flex justify-between items-center mb-10 relative z-10">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] italic">Volume Metric Comparison</h3>
          <TrendingUp size={20} className="text-emerald-500" />
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataBar} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#475569', letterSpacing: '0.3em' }} />
            <YAxis hide />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 20 }}
              contentStyle={{ backgroundColor: '#020617', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 40px 80px rgba(0,0,0,0.8)', padding: '20px' }}
              formatter={(value: number) => [`Rp ${value.toLocaleString()}`, 'Total Volume']}
            />
            <Bar dataKey="value" radius={[25, 25, 25, 25]} barSize={60}>
              {dataBar.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SavingsChart;
