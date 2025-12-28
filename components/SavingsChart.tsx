
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { ShieldCheck, Activity } from 'lucide-react';
import { Transaction } from '../types';

interface Props {
  transactions: Transaction[];
  protectedAmount: number;
}

const COLORS = ['#6366f1', '#f43f5e', '#f59e0b']; // Indigo, Rose, Amber

const SavingsChart: React.FC<Props> = ({ transactions, protectedAmount }) => {
  const azisTotal = transactions.filter(t => t.saver === 'Azis Khoirul').reduce((acc, curr) => acc + curr.amount, 0);
  const siskaTotal = transactions.filter(t => t.saver === 'Siska Icha').reduce((acc, curr) => acc + curr.amount, 0);
  
  const totalRaw = azisTotal + siskaTotal;
  const ratio = totalRaw > 0 ? protectedAmount / totalRaw : 0;
  
  const dataPie = [
    { name: 'Azis Side', value: azisTotal * (1 - ratio) },
    { name: 'Siska Side', value: siskaTotal * (1 - ratio) },
    { name: 'Brankas Sigma', value: protectedAmount }
  ];

  const dataBar = [
    { name: 'AZIS', value: azisTotal },
    { name: 'SISKA', value: siskaTotal },
    { name: 'VAULT', value: protectedAmount }
  ];

  return (
    <div className="grid grid-cols-1 gap-10 mb-16">
      <div className="glass-panel p-10 rounded-[4rem] h-[450px] relative overflow-hidden group">
        <div className="flex justify-between items-center mb-8 px-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Matriks Distribusi</h3>
            <p className="text-xs text-indigo-400 font-mono">Aliran Dana Terenkripsi</p>
          </div>
          <ShieldCheck size={24} className="text-indigo-500 animate-pulse" />
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={dataPie}
              innerRadius={90}
              outerRadius={130}
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
              contentStyle={{ backgroundColor: '#020617', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.15)', boxShadow: '0 30px 60px rgba(0,0,0,0.8)', padding: '24px' }}
              itemStyle={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }}
              formatter={(value: number) => [`Rp ${Math.floor(value).toLocaleString()}`, '']}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-panel p-10 rounded-[4rem] h-[450px] relative overflow-hidden">
        <div className="flex justify-between items-center mb-8 px-4">
          <div className="space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono">Telemetri Volume</h3>
            <p className="text-xs text-emerald-400 font-mono">Perbandingan Kapasitas Node</p>
          </div>
          <Activity size={24} className="text-emerald-500" />
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dataBar} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontWeight: '700', fill: '#64748b', letterSpacing: '0.1em', fontFamily: 'JetBrains Mono' }} />
            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontFamily: 'JetBrains Mono' }} />
            <Tooltip 
              cursor={{ fill: 'rgba(255,255,255,0.03)', radius: 25 }}
              contentStyle={{ backgroundColor: '#020617', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.15)' }}
              itemStyle={{ color: '#fff', fontSize: '12px', fontFamily: 'JetBrains Mono' }}
              formatter={(value: number) => [`Rp ${value.toLocaleString()}`, '']}
            />
            <Bar dataKey="value" radius={[20, 20, 20, 20]} barSize={60}>
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
