import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, Download, Award, FileSpreadsheet, Eye } from 'lucide-react';
import { standardsData } from '../content/standardsData';

export const StandardPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const std = id ? standardsData[id] : undefined;

  if (!std) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-4xl font-black text-text mb-4 uppercase">Норматив не найден</h1>
        <p className="text-text-muted mb-8">Вы зашли на несуществующую страницу стандартов и регламентов.</p>
        <Link to="/" className="px-6 py-3 bg-primary text-white font-black uppercase text-xs tracking-widest hover:bg-[#FF7426] transition">
          На главную
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-bg text-text-muted py-12 md:py-20">
      <div className="max-w-7xl mx-auto px-6">
        {/* Navigation Breadcrumbs & Back link */}
        <div className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <Link
            to="/#standards"
            className="inline-flex items-center gap-2 text-xs font-black text-primary hover:text-white uppercase tracking-widest transition"
          >
            <ArrowLeft className="w-4 h-4" /> Назад к нормативам
          </Link>
          <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest flex items-center gap-2">
            <Link to="/" className="hover:text-white transition">ГЛАВНАЯ</Link>
            <span>/</span>
            <span className="text-text-muted">{std.title}</span>
          </div>
        </div>

        {/* Standard Page Main Header */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
          <div className="lg:col-span-8">
            <div className="flex items-center gap-4 mb-4">
              <Award className="w-10 h-10 text-primary" />
              <span className="text-xs font-bold text-primary tracking-widest uppercase bg-[#F95700]/10 px-3 py-1">
                Система Контроля Качества СФЕРУМ
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-text uppercase tracking-tight mb-2">
              {std.title}
            </h1>
            <span className="block text-sm sm:text-base text-primary font-black uppercase tracking-wider mb-8">
              {std.subTitle}
            </span>
            <div className="p-6 md:p-8 bg-surface border border-border leading-relaxed text-text text-sm sm:text-base font-medium">
              {std.detailedDesc}
            </div>
          </div>

          {/* Quick specs / download panel */}
          <div className="lg:col-span-4 bg-surface border border-border p-8 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F95700]/5 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
            <div>
              <span className="text-[9px] text-primary font-black tracking-widest uppercase block mb-4">
                Исполнительная папка
              </span>
              <h3 className="text-text text-lg font-black uppercase tracking-tight mb-6">
                Сертификаты приборов
              </h3>
              <p className="text-xs text-text-muted mb-8 leading-relaxed">
                Вы можете загрузить официальные бланки свидетельств о поверке измерительного оборудования, квалификационные удостоверения инспекторов и шаблоны отчетов.
              </p>
            </div>
            <div className="space-y-4">
              <a
                href={std.pdfPath}
                download={std.pdfPath.substring(std.pdfPath.lastIndexOf('/') + 1)}
                className="w-full py-4 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-[10px] tracking-widest transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {std.pdfName}
              </a>
              <Link
                to="/#contacts"
                className="w-full py-4 border border-[#3F3F46] hover:border-primary text-text-muted hover:text-white font-black uppercase text-[10px] tracking-widest transition duration-300 flex items-center justify-center cursor-pointer text-center"
              >
                Запросить технадзор
              </Link>
            </div>
          </div>
        </div>

        {/* Regulations / Documents List */}
        <div className="mb-20">
          <h2 className="text-xl sm:text-2xl text-text font-black mb-10 uppercase tracking-tight border-b border-border pb-4">
            Регулирующие документы
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {std.items.map((item, idx) => (
              <div key={idx} className="p-6 bg-surface border border-border hover:border-primary/30 transition duration-300">
                <span className="text-xs font-black text-primary tracking-widest uppercase block mb-2">
                  {item.code}
                </span>
                <h3 className="text-text text-sm sm:text-base font-black uppercase tracking-tight mb-4">
                  {item.name}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed font-medium">
                  {item.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Control Procedures checklist table */}
        <div className="mb-20">
          <h2 className="text-xl sm:text-2xl text-text font-black mb-10 uppercase tracking-tight border-b border-border pb-4">
            Пооперационный технологический контроль на объекте
          </h2>
          <div className="border border-border bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs md:text-sm whitespace-nowrap md:whitespace-normal">
                <thead>
                  <tr className="bg-surface border-b border-border font-black uppercase tracking-wider text-[10px] text-primary">
                    <th className="p-4 md:p-6">Этап контроля</th>
                    <th className="p-4 md:p-6">Контролируемый параметр</th>
                    <th className="p-4 md:p-6">Инструмент контроля</th>
                    <th className="p-4 md:p-6">Нормативный документ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium text-text">
                  {std.procedures.map((proc, i) => (
                    <tr key={i} className="hover:bg-white/[0.02] transition">
                      <td className="p-4 md:p-6 font-bold uppercase tracking-wide text-text">{proc.stage}</td>
                      <td className="p-4 md:p-6 text-text-muted uppercase font-semibold text-[11px] tracking-wide">{proc.parameter}</td>
                      <td className="p-4 md:p-6 text-text uppercase font-semibold text-[11px] tracking-wide">{proc.instrument}</td>
                      <td className="p-4 md:p-6 font-mono text-text-muted text-[11px] font-bold">{proc.regulation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sector-Specific Info: Qualifications or Instruments */}
        {(std.itrQualifications || std.instruments) && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-20">
            {std.itrQualifications && (
              <div>
                <h3 className="text-lg text-text font-black mb-6 uppercase tracking-tight border-b border-border pb-3 flex items-center gap-2">
                  <Award className="w-5 h-5 text-primary" /> Сертификация персонала
                </h3>
                <ul className="space-y-4">
                  {std.itrQualifications.map((qual, i) => (
                    <li key={i} className="flex items-start gap-3 p-4 bg-surface border border-border">
                      <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-xs text-text font-bold uppercase tracking-wider leading-relaxed">{qual}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {std.instruments && (
              <div>
                <h3 className="text-lg text-text font-black mb-6 uppercase tracking-tight border-b border-border pb-3 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" /> Измерительный комплекс
                </h3>
                <ul className="space-y-4">
                  {std.instruments.map((inst, i) => (
                    <li key={i} className="flex items-start gap-3 p-4 bg-surface border border-border">
                      <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                      <span className="text-xs text-text font-bold uppercase tracking-wider leading-relaxed">{inst}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Section: Visual materials/Photo documentation description */}
        <div className="border border-border bg-surface overflow-hidden group">
          <div className="w-full aspect-video lg:aspect-[21/9] relative bg-[#050507]">
            <img 
              src={`/img/standards/${std.id}.png`} 
              alt={std.title} 
              className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition duration-700"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
            <div className="absolute top-4 right-4 flex items-center gap-2 bg-[#050507]/80 backdrop-blur-md px-3 py-1.5 border border-border">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-[10px] text-white font-bold uppercase tracking-widest font-mono hidden sm:inline-block">
                Фотоматериалы контроля
              </span>
            </div>
            <div className="absolute bottom-4 left-4">
              <span className="text-[9px] sm:text-[10px] text-white font-bold bg-[#F95700] px-3 py-1.5 uppercase tracking-widest">
                Поверено Ростест • ГОСТ
              </span>
            </div>
          </div>
          <div className="p-6 md:p-8 flex items-start gap-4 border-t border-border">
            <Award className="w-8 h-8 text-primary flex-shrink-0 mt-1 hidden sm:block" />
            <div>
              <h3 className="text-text text-base sm:text-lg font-black uppercase tracking-tight mb-2">
                Документальная фиксация качества
              </h3>
              <p className="text-xs sm:text-sm text-text-muted font-medium leading-relaxed">
                {std.photoDesc} Все приборы проходят ежегодную государственную поверку и калибровку, свидетельства о которых вносятся в исполнительную папку каждого сданного объекта.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default StandardPage;
