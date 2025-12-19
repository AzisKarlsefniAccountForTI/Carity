
import React, { useState, useEffect } from 'react';
import { TARGET_DATE } from '../constants';

const Countdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = TARGET_DATE.getTime() - now.getTime();

      if (difference <= 0) {
        clearInterval(timer);
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="grid grid-cols-4 gap-4 p-2">
      {[
        { label: 'HARI', value: timeLeft.days },
        { label: 'JAM', value: timeLeft.hours },
        { label: 'MENIT', value: timeLeft.minutes },
        { label: 'DETIK', value: timeLeft.seconds }
      ].map((item) => (
        <div key={item.label} className="bg-slate-950 rounded-[3rem] py-10 px-4 flex flex-col items-center justify-center transition-all hover:bg-indigo-600 group border border-white/5 hover:border-indigo-400">
          <span className="text-4xl md:text-6xl font-black text-white font-mono tracking-tighter group-hover:scale-110 transition-transform duration-500 italic">
            {item.value.toString().padStart(2, '0')}
          </span>
          <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-600 mt-4 group-hover:text-white transition-colors">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Countdown;
