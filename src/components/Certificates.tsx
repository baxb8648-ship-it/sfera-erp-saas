import React from 'react';
import { ShieldCheck, ClipboardCheck, FileText, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface CertItem {
  id: string;
  title: string;
  sub: string;
  desc: string;
  code: string;
  icon: React.ReactNode;
}

export const Certificates: React.FC = () => {
  const certifications: CertItem[] = [
    {
      id: 'gost',
      title: 'ГОСТы',
      sub: 'Государственные стандарты',
      desc: 'Подготовка поверхностей до Sa 2.5/Sa 3, контроль обеспыливания и шероховатости согласно требованиям ГОСТ ISO 8501-1 и ГОСТ 9.402.',
      code: 'ГОСТ ISO 8501-1 • ГОСТ 9.402-2004',
      icon: <ShieldCheck className="w-8 h-8 text-primary" />,
    },
    {
      id: 'snip',
      title: 'СНиПы и СП',
      sub: 'Строительные нормы',
      desc: 'Строгое следование регламентам СП 72.13330.2016 по защите строительных конструкций и сооружений от коррозионного воздействия.',
      code: 'СП 72.13330.2016 • СП 28.13330.2017',
      icon: <ClipboardCheck className="w-8 h-8 text-primary" />,
    },
    {
      id: 'tech-cards',
      title: 'Тех-карты',
      sub: 'Инструкции нанесения ЛКМ',
      desc: 'Соблюдение регламентов заводов-изготовителей по жизнеспособности смесей, вязкости, рабочему давлению и толщине мокрого слоя.',
      code: 'Биурс-ТК • Унипол-ТК • Специзол-ТК',
      icon: <FileText className="w-8 h-8 text-primary" />,
    },
    {
      id: 'itr',
      title: 'ИТР и технадзор',
      sub: 'Инженерный контроль',
      desc: 'Собственные инспекторы ВИК II уровня и НАКС. Пооперационный контроль влажности, точки росы, адгезии и сплошности покрытий.',
      code: 'Аттестация ВИК • НАКС • МЧС РФ',
      icon: <CheckCircle2 className="w-8 h-8 text-primary" />,
    },
  ];

  return (
    <section id="standards" className="py-24 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16 text-center max-w-2xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-black text-text mb-4 uppercase tracking-tight">
            РЕГЛАМЕНТЫ
          </h2>
          <p className="text-text-muted text-sm font-medium leading-relaxed">
            Производство работ промышленной группы СФЕРА полностью стандартизировано. Мы гарантируем соблюдение строительных норм и прохождение проверок любого технадзора.
          </p>
        </div>

        {/* Certs Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {certifications.map((cert, idx) => (
            <Link
              key={idx}
              to={`/standards/${cert.id}`}
              className="bg-surface border border-border p-6 flex flex-col justify-between hover:border-primary/50 hover:bg-surface/80 transition duration-300 relative group cursor-pointer"
            >
              <div>
                <div className="mb-6 flex justify-between items-center">
                  {cert.icon}
                  <ArrowUpRight className="w-4 h-4 text-text-muted group-hover:text-[#F95700] transition" />
                </div>
                <h3 className="text-text text-lg font-black uppercase mb-1 tracking-tight group-hover:text-[#F95700] transition">
                  {cert.title}
                </h3>
                <span className="text-[10px] text-primary font-bold uppercase tracking-wider block mb-4">
                  {cert.sub}
                </span>
                <p className="text-xs text-text-muted leading-relaxed font-medium">
                  {cert.desc}
                </p>
              </div>

              <div className="mt-8 pt-4 border-t border-border">
                <span className="text-[9px] text-text-muted font-mono font-bold tracking-wider">
                  {cert.code}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};
