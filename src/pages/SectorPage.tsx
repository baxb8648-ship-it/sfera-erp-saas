import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, Check, Download, Shield, Settings, Database, FileText, Sprout } from 'lucide-react';
import { sectorsData } from '../content/sectorsData';
import { ProjectGallery } from '../components/ProjectGallery';

export const SectorPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const sector = id ? sectorsData[id] : undefined;

  if (!sector) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 bg-bg">
        <h1 className="text-4xl font-black text-text mb-4 uppercase">Раздел не найден</h1>
        <p className="text-text-muted mb-8">Вы зашли на несуществующую страницу категории объектов.</p>
        <Link to="/" className="px-6 py-3 bg-primary text-white font-black uppercase text-xs tracking-widest hover:bg-[#FF7426] transition">
          На главную
        </Link>
      </div>
    );
  }

  // Choose icon based on ID
  const getIcon = () => {
    switch (sector.id) {
      case 'industrial':
        return <Shield className="w-12 h-12 text-primary" />;
      case 'municipal':
        return <Database className="w-12 h-12 text-primary" />;
      case 'agro':
        return <Sprout className="w-12 h-12 text-primary" />;
      case 'commercial':
      default:
        return <Settings className="w-12 h-12 text-primary" />;
    }
  };

  // Structured Data for SEO
  const schemaData = {
    "@context": "https://schema.org",
    "@type": "Service",
    "name": sector.title,
    "description": sector.heroDesc,
    "provider": {
      "@type": "LocalBusiness",
      "name": "СФЕРУМ ПРОМ",
      "image": "https://sphera.pro/logo.png"
    },
    "areaServed": "Россия"
  };

  return (
    <>
      <Helmet>
        <title>{sector.title} | АКЗ, Огнезащита и Теплоизоляция | СФЕРУМ ПРОМ</title>
        <meta name="description" content={sector.heroDesc} />
        <meta property="og:title" content={`${sector.title} | СФЕРУМ ПРОМ`} />
        <meta property="og:description" content={sector.heroDesc} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify(schemaData)}
        </script>
      </Helmet>

      <article className="bg-bg text-text-muted py-12 md:py-20 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          
          {/* Navigation Breadcrumbs & Back link */}
          <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
            <Link
              to="/#sectors"
              className="inline-flex items-center gap-2 text-xs font-black text-primary hover:text-[#FF7426] uppercase tracking-widest transition"
            >
              <ArrowLeft className="w-4 h-4" /> Назад к отраслям
            </Link>
            <div className="text-[10px] text-text-muted font-bold uppercase tracking-widest flex items-center gap-2">
              <Link to="/" className="hover:text-text transition">ГЛАВНАЯ</Link>
              <span>/</span>
              <span className="text-text-muted">{sector.title}</span>
            </div>
          </nav>

          {/* Sector Hero Header */}
          <header className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-20">
            <div className="lg:col-span-8">
              <div className="flex items-center gap-4 mb-4">
                {getIcon()}
                <span className="text-xs font-black text-primary tracking-widest uppercase bg-primary/10 px-3 py-1 border border-primary/20">
                  {sector.badge}
                </span>
              </div>
              <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-text uppercase tracking-tight leading-tight mb-6">
                {sector.title}
              </h1>
              <p className="text-lg md:text-xl text-text font-bold leading-relaxed mb-8 max-w-3xl">
                {sector.heroDesc}
              </p>
              <div className="p-6 md:p-8 bg-surface border-l-4 border-primary border-y border-r border-border font-medium leading-relaxed text-text-muted text-sm sm:text-base shadow-sm">
                {sector.detailedDesc}
              </div>
            </div>

            {/* Quick PDF & CTA widget */}
            <aside className="lg:col-span-4 bg-surface border border-border p-8 flex flex-col justify-between relative overflow-hidden group shadow-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl transform translate-x-12 -translate-y-12"></div>
              <div className="relative z-10">
                <span className="text-[9px] text-primary font-black tracking-widest uppercase block mb-4">
                  Регламенты и Документация
                </span>
                <h3 className="text-text text-lg font-black uppercase tracking-tight mb-6">
                  Скачать ТЗ и спецификации
                </h3>
                <p className="text-xs text-text-muted mb-8 leading-relaxed">
                  Ознакомьтесь со стандартными регламентами контроля, сертификатами соответствия и образцами ИД по данному направлению.
                </p>
              </div>
              <div className="space-y-4 relative z-10">
                <a
                  href={sector.pdfPath}
                  download={sector.pdfPath.substring(sector.pdfPath.lastIndexOf('/') + 1)}
                  className="w-full py-4 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-[10px] sm:text-xs tracking-widest transition-all duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-primary/20 hover:scale-[1.02]"
                >
                  <Download className="w-4 h-4" />
                  {sector.pdfName}
                </a>
                <Link
                  to="/#contacts"
                  className="w-full py-4 border border-border hover:border-primary text-text-muted hover:text-text font-black uppercase text-[10px] sm:text-xs tracking-widest transition-all duration-300 flex items-center justify-center cursor-pointer text-center"
                >
                  Обсудить проект с ГИПом
                </Link>
              </div>
            </aside>
          </header>

          {/* Section: Key Features */}
          <section className="mb-20">
            <h2 className="text-xl sm:text-2xl text-text font-black mb-10 uppercase tracking-tight border-b border-border pb-4">
              Особенности технологического процесса
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sector.features.map((feat, index) => (
                <div key={index} className="flex gap-4 p-6 bg-white dark:bg-surface border border-gray-200 dark:border-border/50 hover:border-primary/50 dark:hover:border-primary/50 shadow-sm transition-all duration-300 hover:-translate-y-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-900 dark:text-text uppercase tracking-wide leading-snug">
                      {feat}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Section: Projects / Works Done */}
          <section className="mb-24 relative w-screen left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] py-12 bg-surface border-y border-border">
            <div className="max-w-7xl mx-auto px-6 mb-12">
              <h2 className="text-2xl sm:text-3xl text-text font-black uppercase tracking-tight border-l-4 border-primary pl-4">
                Примеры выполненных работ
              </h2>
              <p className="text-text-muted mt-2 text-xs uppercase tracking-widest font-bold pl-5">
                Наведите для просмотра деталей
              </p>
            </div>
            <ProjectGallery projects={sector.projects} />
          </section>

          {/* Section: Equipment & Materials Grid */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* Equipment */}
            <div className="bg-surface p-8 border border-border relative overflow-hidden">
              <h3 className="text-lg text-text font-black mb-6 uppercase tracking-tight border-b border-border/50 pb-3 flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" /> Используемое оборудование
              </h3>
              <ul className="space-y-4 relative z-10">
                {sector.equipment.map((eq, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <span className="text-xs text-text font-bold leading-relaxed uppercase tracking-wider">{eq}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Materials */}
            <div className="bg-surface p-8 border border-border relative overflow-hidden">
              <h3 className="text-lg text-text font-black mb-6 uppercase tracking-tight border-b border-border/50 pb-3 flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" /> Применяемые составы
              </h3>
              <ul className="space-y-4 relative z-10">
                {sector.materials.map((mat, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                    <span className="text-xs text-text font-bold leading-relaxed uppercase tracking-wider">{mat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </div>
      </article>
    </>
  );
};
