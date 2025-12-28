
import React, { useState, useEffect } from 'react';
import { TARGET_DATE } from '../constants';

const Countdown: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const difference = TARGET_DATE.getTime() - now.getTime();
      if (difference <= 0) { clearInterval(timer); return; }
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
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-4">
      {[
        { label: 'HARI', value: timeLeft.days },
        { label: 'JAM', value: timeLeft.hours },
        { label: 'MENIT', value: timeLeft.minutes },
        { label: 'DETIK', value: timeLeft.seconds }
      ].map((item) => (
        <div key={item.label} className="glass-panel rounded-[2rem] md:rounded-[2.8rem] py-6 md:py-10 px-2 flex flex-col items-center justify-center hover:bg-indigo-600/20 transition-all border-white/10 group">
          <span className="text-3xl md:text-5xl font-extrabold text-white font-mono tracking-normal leading-none mb-2 md:mb-4">
            {item.value.toString().padStart(2, '0')}
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-slate-400 font-mono">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
};

export default Countdown;
