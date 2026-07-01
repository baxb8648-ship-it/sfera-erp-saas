import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Check, Download, ShieldCheck, HelpCircle } from 'lucide-react';
import { materialsData } from '../content/materialsData';

export const MaterialPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const mat = id ? materialsData[id] : undefined;

  if (!mat) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-4xl font-black text-text mb-4 uppercase">Материал не найден</h1>
        <p className="text-text-muted mb-8">Вы зашли на несуществующую страницу каталога материалов.</p>
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
            to="/#materials"
            className="inline-flex items-center gap-2 text-xs font-black text-primary hover:text-white uppercase tracking-widest transition"
          >
            <ArrowLeft className="w-4 h-4" /> Назад к материалам
          </Link>
          <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest flex items-center gap-2">
            <Link to="/" className="hover:text-white transition">ГЛАВНАЯ</Link>
            <span>/</span>
            <span className="text-text-muted">{mat.title}</span>
          </div>
        </div>

        {/* Material Main Header Info */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
          <div className="lg:col-span-8">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-[10px] font-black text-text-muted tracking-wider bg-surface px-2.5 py-1 border border-border uppercase">
                {mat.specLabel}
              </span>
              <span className="text-[10px] font-black text-primary tracking-wider bg-[#F95700]/10 px-2.5 py-1 border border-primary/20 uppercase">
                Производитель: {mat.manufacturer}
              </span>
            </div>
            <h1 className="text-4xl sm:text-6xl font-black text-text uppercase tracking-tight mb-2">
              {mat.title}
            </h1>
            <span className="block text-sm sm:text-base text-primary font-black uppercase tracking-wider mb-8">
              {mat.subTitle}
            </span>
            <div className="p-6 md:p-8 bg-surface border border-border leading-relaxed text-text text-sm sm:text-base font-medium">
              {mat.detailedDesc}
            </div>
          </div>

          {/* Quick specs / download panel */}
          <div className="lg:col-span-4 bg-surface border border-border p-8 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F95700]/5 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
            <div>
              <span className="text-[9px] text-primary font-black tracking-widest uppercase block mb-4">
                Технический паспорт
              </span>
              <h3 className="text-text text-lg font-black uppercase tracking-tight mb-6">
                Сертификаты и ТТХ
              </h3>
              <p className="text-xs text-text-muted mb-8 leading-relaxed">
                Вы можете скачать полные заводские регламенты нанесения, технологические карты смешивания и гигиенические заключения для данного материала.
              </p>
            </div>
            <div className="space-y-4">
              <a
                href={mat.pdfPath}
                download={mat.pdfPath.substring(mat.pdfPath.lastIndexOf('/') + 1)}
                className="w-full py-4 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-[10px] tracking-widest transition duration-300 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {mat.pdfName}
              </a>
              <Link
                to="/#contacts"
                className="w-full py-4 border border-[#3F3F46] hover:border-primary text-text-muted hover:text-white font-black uppercase text-[10px] tracking-widest transition duration-300 flex items-center justify-center cursor-pointer text-center"
              >
                Заказать комплектацию
              </Link>
            </div>
          </div>
        </div>

        {/* Technical Specs Table */}
        <div className="mb-20">
          <h2 className="text-xl sm:text-2xl text-text font-black mb-10 uppercase tracking-tight border-b border-border pb-4">
            Технические характеристики состава
          </h2>
          <div className="border border-border bg-surface overflow-hidden">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-surface border-b border-border font-black uppercase tracking-wider text-[10px] text-primary">
                  <th className="p-4 md:p-6 w-1/2">Физико-химический параметр</th>
                  <th className="p-4 md:p-6 w-1/2">Значение показателя</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium text-text">
                {mat.specs.map((spec, i) => (
                  <tr key={i} className="hover:bg-white/[0.02] transition">
                    <td className="p-4 md:p-6 font-bold uppercase tracking-wide text-text-muted">{spec.parameter}</td>
                    <td className="p-4 md:p-6 font-mono text-text">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Features & Applications Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Features */}
          <div>
            <h3 className="text-lg text-text font-black mb-8 uppercase tracking-tight border-b border-border pb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary" /> Основные достоинства и свойства
            </h3>
            <div className="space-y-4">
              {mat.features.map((feat, i) => (
                <div key={i} className="flex gap-3 bg-surface border border-border p-5">
                  <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider leading-relaxed text-text">{feat}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Applications */}
          <div>
            <h3 className="text-lg text-text font-black mb-8 uppercase tracking-tight border-b border-border pb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" /> Рекомендуемые области применения
            </h3>
            <div className="space-y-4">
              {mat.applications.map((app, i) => (
                <div key={i} className="flex gap-3 bg-surface border border-border p-5">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm font-semibold uppercase tracking-wider leading-relaxed text-text">{app}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
