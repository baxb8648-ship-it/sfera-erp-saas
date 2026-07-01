import React, { useState } from 'react';
import { Truck, Hammer, Cpu, ShieldAlert } from 'lucide-react';

interface EquipmentLoad {
  day: string;
  load: number;
}

export const Capacity: React.FC = () => {
  const [hoveredData, setHoveredData] = useState<EquipmentLoad | null>(null);

  const capacityData: EquipmentLoad[] = [
    { day: 'Пн', load: 82 },
    { day: 'Вт', load: 95 },
    { day: 'Ср', load: 88 },
    { day: 'Чт', load: 92 },
    { day: 'Пт', load: 98 },
    { day: 'Сб', load: 75 },
    { day: 'Вс', load: 70 },
  ];

  // SVG Chart sizing
  const width = 500;
  const height = 180;
  const padding = 30;

  // Calculate points
  const points = capacityData.map((d, index) => {
    const x = padding + (index * (width - padding * 2)) / (capacityData.length - 1);
    const y = height - padding - (d.load * (height - padding * 2)) / 100;
    return { x, y, ...d };
  });

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <section className="py-24 bg-bg border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Text and stats */}
          <div className="bg-surface/80 border-l-4 border-primary border-y border-r border-border p-8 md:p-10 backdrop-blur-md">
            <h2 className="text-3xl text-text font-black mb-8 uppercase tracking-tight">
              Производственные мощности
            </h2>
            <p className="text-sm text-text-muted mb-8 leading-relaxed font-medium">
              СФЕРА располагает собственной технической базой. Мы не зависим от
              посредников и субаренды, что гарантирует мобилизацию техники и бригад на объект в течение 24 часов в Оренбургской, Самарской областях и Башкортостане.
            </p>

            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <Truck className="w-5 h-5 text-primary" />
                  <span className="text-text text-xs md:text-sm uppercase tracking-wide font-bold">Собственные автовышки (до 40 м)</span>
                </div>
                <span className="text-text font-black text-sm">4 ед.</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <Hammer className="w-5 h-5 text-primary" />
                  <span className="text-text text-xs md:text-sm uppercase tracking-wide font-bold">Компрессоры высокого давления</span>
                </div>
                <span className="text-text font-black text-sm">6 ед.</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <Cpu className="w-5 h-5 text-primary" />
                  <span className="text-text text-xs md:text-sm uppercase tracking-wide font-bold">Окрасочные станции Graco / WIWA</span>
                </div>
                <span className="text-text font-black text-sm">12 ед.</span>
              </div>
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <ShieldAlert className="w-5 h-5 text-primary" />
                  <span className="text-text text-xs md:text-sm uppercase tracking-wide font-bold">Штатные бригады (работа 24/7)</span>
                </div>
                <span className="text-text font-black text-sm">8 звеньев</span>
              </div>
            </div>
          </div>

          {/* Interactive Chart */}
          <div className="text-center bg-surface/40 border border-border p-8 relative backdrop-blur-md">
            <h3 className="text-text font-bold mb-8 text-[10px] tracking-widest uppercase text-left border-b border-border pb-4">
              Загрузка парка техники за последнюю неделю (%)
            </h3>

            <div className="relative w-full aspect-[21/9] sm:aspect-[2.5/1]">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
                {/* Horizontal grid lines */}
                {[0, 25, 50, 75, 100].map((v) => {
                  const y = height - padding - (v * (height - padding * 2)) / 100;
                  return (
                    <g key={v}>
                      <line
                        x1={padding}
                        y1={y}
                        x2={width - padding}
                        y2={y}
                        stroke="rgba(255,255,255,0.03)"
                        strokeWidth="1"
                      />
                      <text
                        x={padding - 10}
                        y={y + 3}
                        fill="#52525b"
                        fontSize="8"
                        textAnchor="end"
                        fontWeight="bold"
                      >
                        {v}%
                      </text>
                    </g>
                  );
                })}

                {/* Filled Area */}
                <path d={areaD} fill="url(#chartGradient)" />

                {/* Main line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke="#F95700"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />

                {/* Data Points */}
                {points.map((p, i) => (
                  <circle
                    key={i}
                    cx={p.x}
                    cy={p.y}
                    r={hoveredData?.day === p.day ? 6 : 4}
                    fill="#F95700"
                    stroke="#18181B"
                    strokeWidth="1.5"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredData(p)}
                    onMouseLeave={() => setHoveredData(null)}
                  />
                ))}

                {/* X Axis Labels */}
                {points.map((p, i) => (
                  <text
                    key={i}
                    x={p.x}
                    y={height - 10}
                    fill="#52525B"
                    fontSize="9"
                    textAnchor="middle"
                    fontWeight="bold"
                  >
                    {p.day}
                  </text>
                ))}

                {/* Definitions for gradient */}
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#F95700" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#F95700" stopOpacity="0.0" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Custom floating tooltip */}
              {hoveredData && (
                <div
                  className="absolute bg-surface border border-primary/30 px-3 py-1.5 text-left pointer-events-none shadow-xl"
                  style={{
                    left: `${((points.findIndex((p) => p.day === hoveredData.day) * (width - padding * 2)) / (capacityData.length - 1) + padding) / width * 100}%`,
                    top: `${(height - padding - (hoveredData.load * (height - padding * 2)) / 100 - 35) / height * 100}%`,
                    transform: 'translateX(-50%)',
                  }}
                >
                  <p className="text-[8px] text-text-muted font-bold uppercase">Загрузка ({hoveredData.day})</p>
                  <p className="text-xs text-text font-black">{hoveredData.load}%</p>
                </div>
              )}
            </div>
            <p className="text-[9px] text-text-muted text-left mt-6 leading-relaxed uppercase font-bold">
              * Высокая загрузка подтверждает востребованность. 2 смены по 12 часов обеспечивают завершение проекта без нарушения регламентных сроков межслойной сушки.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
