import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Flame, Shield, Layers, Wind, Droplets, Wrench, HardHat, CheckCircle } from 'lucide-react';
import sandblastImg from '../assets/sandblasting_process.png';

interface ServiceItem {
  id: string;
  num: string;
  title: string;
  shortDesc: string;
  tag: string;
  icon: React.ReactNode;
  fullDesc: string;
  standards: string;
  materials: string;
  price: string;
  specs: string[];
  image?: string;
}

export const Services: React.FC = () => {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);

  const services: ServiceItem[] = [
    {
      id: 'biurs',
      num: '01',
      title: 'Покрытия «Биурс»',
      shortDesc: 'Антикоррозийная защита газо- и нефтепроводов с использованием специализированных мобильных установок высокого давления. Трассовое и базовое нанесение.',
      tag: 'Газпром / Транснефть',
      icon: <Layers className="w-6 h-6 text-primary" />,
      fullDesc: 'Двухкомпонентная эпоксидно-полиуретановая изоляция, предназначенная для защиты наружной поверхности подземных и подводных трубопроводов, запорной арматуры, соединительных деталей и резервуаров от коррозии. Обеспечивает высокую химстойкость и долговечность защитного барьера в экстремальных условиях.',
      standards: 'ТУ 2313-001-20921484, Регламенты ПАО «Газпром», АК «Транснефть» и Роснефть.',
      materials: 'Биурс-Грунт, Биурс-Мастика (наносится при температуре смеси от +60°C).',
      price: 'от 2 500 ₽ / м²',
      specs: [
        'Толщина сухого слоя покрытия: от 2.0 до 3.5 мм',
        'Прочность при ударе: не менее 15 Дж',
        'Адгезия к стальной поверхности: более 15 МПа',
        'Диэлектрическая сплошность: отсутствие пробоя при напряжении 5 кВ/мм',
      ]
    },
    {
      id: 'abr',
      num: '02',
      title: 'Механизированная покраска',
      shortDesc: 'Скоростное и экономичное нанесение ЛКМ на фасады, ангары, кровли и ограждения большой площади профессиональными аппаратами безвоздушного распыления (АБР).',
      tag: 'До 1500 м² в смену',
      icon: <Wind className="w-6 h-6 text-primary" />,
      fullDesc: 'Технология безвоздушного распыления под высоким давлением (до 500 бар) позволяет наносить вязкие составы без разбавления растворителями. Это гарантирует получение плотной, равномерной пленки без потеков, шагрени и пузырьков воздуха на объектах любой геометрической сложности.',
      standards: 'ГОСТ 9.402-2004, СНиП 3.04.03-85.',
      materials: 'Промышленные грунт-эмали Унипол, эпоксидные, полиуретановые и алкидные системы ведущих заводов РФ.',
      price: 'от 1 200 ₽ / м²',
      specs: [
        'Высокая производительность: до 1500 м² за смену одной мобильной бригадой',
        'Экономия материала: снижение перерасхода краски на 20-30% по сравнению с воздушным распылением',
        'Высота проведения работ: до 40 метров с использованием собственных автовышек',
        'Однородность слоя: безупречный внешний вид без разводов и ворса',
      ]
    },
    {
      id: 'welding',
      num: '03',
      title: 'Сварка и подготовка',
      shortDesc: 'Сварочные работы, зачистка дефектов, исправление геометрии профилей и ремонт металлоконструкций на объекте перед антикоррозийной обработкой.',
      tag: 'Комплексный B2B подход',
      icon: <Wrench className="w-6 h-6 text-primary" />,
      fullDesc: 'Качественная антикоррозийная защита невозможна без идеальной подготовки геометрии металла. Проводим восстановление поврежденных коррозией элементов, обварку швов, удаление сварочных брызг, окалины и закругление острых кромок (радиус не менее 2 мм) для предотвращения утончения ЛКМ.',
      standards: 'РД 03-606-03, СНиП II-23-81, аттестация НАКС.',
      materials: 'Электроды УОНИ-13/55, сварочная проволока марки Св-08Г2С, сертифицированный прокат стали.',
      price: 'от 900 ₽ / пог. м',
      specs: [
        'Сварочные работы любой сложности аттестованными сварщиками НАКС',
        'Визуально-измерительный контроль (ВИК) каждого подготовленного шва',
        'Устранение дефектов проката, раковин и закатов перед абразивоструйной обработкой',
        'Исправление геометрии несущих ферм и балок непосредственно на стройплощадке',
      ]
    },
    {
      id: 'sandblast',
      num: '04',
      title: 'Пескоструй Sa 2.5',
      shortDesc: 'Глубокая абразивоструйная очистка металла и бетона от окалины, ржавчины и старой краски под давлением до чистой стальной поверхности.',
      tag: 'ISO 8501-1 / Sa 2.5',
      icon: <HardHat className="w-6 h-6 text-primary" />,
      fullDesc: 'Абразивоструйная обработка высокого давления с подачей сухого фракционированного абразива. Удаляет все виды загрязнений и создает необходимый профиль шероховатости (анкерную сетку) для прочного сцепления последующих лакокрасочных слоев с поверхностью.',
      standards: 'ISO 8501-1 (степень очистки Sa 2.5 или Sa 3), ГОСТ 9.402 (2 степень очистки).',
      materials: 'Купершлак, никельшлак фракции 0.5-2.5 мм.',
      price: 'от 1 000 ₽ / м²',
      specs: [
        'Степень очистки Sa 2.5: металл визуально свободен от масла, смазки, грязи, окалины и ржавчины',
        'Шероховатость поверхности: профиль Rz 40-80 мкм для максимальной адгезии',
        'Собственные компрессоры высокого давления (Atlas Copco, Chicago Pneumatic)',
        'Обеспыливание сжатым воздухом непосредственно перед грунтованием',
      ],
      image: sandblastImg,
    },
    {
      id: 'rvs',
      num: '05',
      title: 'АКЗ Резервуаров',
      shortDesc: 'Комплексная внутренняя и наружная антикоррозийная обработка резервуаров (РВС), эстакад, промышленных цистерн и технологических емкостей.',
      tag: 'Химстойкая защита',
      icon: <Shield className="w-6 h-6 text-primary" />,
      fullDesc: 'Антикоррозийная защита вертикальных стальных резервуаров (РВС) объемом от 100 до 50 000 м³. Внутреннее покрытие защищает сталь от агрессивного воздействия подтоварной воды, сероводорода и сырой нефти. Внешнее покрытие защищает от УФ-излучения, осадков и агрессивной промышленной атмосферы.',
      standards: 'СТО Газпром 2-2.3-1122-2017, РД-23.040.00-КТН-015-18.',
      materials: 'Химстойкие эпоксидные эмали Унипол АМ, Темакоут, эпоксифенольные покрытия.',
      price: 'от 1 800 ₽ / м²',
      specs: [
        'Устойчивость внутреннего покрытия к воздействию агрессивных сред (нефть, ГСМ, солевой туман)',
        'Толщина защитного покрытия: от 300 до 500 мкм (многослойная система)',
        'Гарантированный срок службы покрытия: не менее 12-15 лет без деструкции',
        'Работа в замкнутых пространствах с принудительной вентиляцией и газоанализом',
      ]
    },
    {
      id: 'hydro',
      num: '06',
      title: 'Гидроизоляция и футеровка КНС',
      shortDesc: 'Напыление полимерных композитов Специзол для защиты бетонных конструкций, коллекторов и КНС от агрессивной среды и биогенной коррозии.',
      tag: 'Химстойкая защита / ЖКХ',
      icon: <Droplets className="w-6 h-6 text-primary" />,
      fullDesc: 'Нанесение двухкомпонентной полимерно-битумной эмульсии «Специзол» методом горячего безвоздушного распыления с мгновенной коагуляцией. Формирует бесшовную эластичную мембрану с высокой стойкостью к сероводороду и кислотам. Идеально подходит для футеровки внутренних поверхностей канализационных коллекторов, отстойников, КНС и очистных сооружений.',
      standards: 'ГОСТ 30693-2000, СНиП 2.03.11-85.',
      materials: 'Жидкая резина Специзол, коагулянт (раствор хлористого кальция).',
      price: 'от 1 600 ₽ / м²',
      specs: [
        'Мгновенное отверждение: полимеризация мембраны происходит за 10-15 секунд',
        'Ультра-эластичность: относительное удлинение при разрыве более 1000% с памятью формы',
        'Стойкость к сероводороду и биогенной серной кислоте: 100%',
        'Водонепроницаемость: выдерживает давление воды до 1.6 МПа (марка W16)',
      ]
    },
    {
      id: 'fire',
      num: '07',
      title: 'Огнезащита (ОЗП)',
      shortDesc: 'Нанесение вспучивающихся тонкослойных составов на металлические и деревянные конструкции для повышения предела огнестойкости.',
      tag: 'Лицензия МЧС РФ',
      icon: <Flame className="w-6 h-6 text-primary" />,
      fullDesc: 'Обработка несущих металлических конструкций специальными составами, которые при воздействии высокой температуры вспучиваются (увеличиваются в объеме в 10-50 раз), создавая пористый теплоизолирующий экран. Это предотвращает деформацию и обрушение каркаса здания в течение заданного времени.',
      standards: 'ГОСТ Р 53295-2009, СП 2.13130.2020.',
      materials: 'Огнезащитные краски водно-дисперсионные и на органических растворителях, сертифицированные МЧС.',
      price: 'от 1 900 ₽ / м²',
      specs: [
        'Повышение предела огнестойкости: обеспечение групп огнезащиты R45, R90, R120',
        'Наличие действующей лицензии МЧС России на огнезащитную обработку',
        'Контроль толщины мокрого и сухого слоя прецизионными гребенками и электромагнитными толщиномерами',
        'Подготовка полного комплекта документов для сдачи объекта инспекции ИПЛ МЧС',
      ]
    },
    {
      id: 'polyurea',
      num: '08',
      title: 'Напыление полимочевины',
      shortDesc: 'Создание сверхпрочного бесшовного эластомерного гидроизоляционного покрытия со скоростью отверждения 15 секунд для кровель, паркингов и спецтехники.',
      tag: 'Рекордный износ / Эксплуатация',
      icon: <Layers className="w-6 h-6 text-primary" />,
      fullDesc: 'Напыляемая полимочевина — это премиальный эластомер мгновенной полимеризации (10-15 секунд). Формирует монолитный бесшовный защитный ковер с высочайшей стойкостью к износу, ударам, шипованным шинам и абразивам. Применяется на кровлях большой площади, паркингах, пандусах и для футеровки кузовов грузового транспорта.',
      standards: 'ТУ 20.16.56-012-18247382, ГОСТ 30693-2000.',
      materials: 'Двухкомпонентные полимочевинные системы (чистая полимочевина).',
      price: 'от 1 800 ₽ / м²',
      specs: [
        'Время гелеобразования смеси: не более 10-15 секунд',
        'Относительное удлинение при разрыве: не менее 350% - 400%',
        'Прочность при растяжении (ГОСТ 270): не менее 18 - 22 МПа',
        'Износостойкость (потери по Таберу): менее 30 мг (диск CS-17, 1000 циклов)',
      ]
    },
    {
      id: 'ppu',
      num: '09',
      title: 'Теплоизоляция (ППУ)',
      shortDesc: 'Бесшовное напыление жесткого закрытоячеистого пенополиуретана для устранения конденсата, утепления ангаров, хладокомбинатов и трубопроводов.',
      tag: 'Энергоэффективность',
      icon: <Wind className="w-6 h-6 text-primary" />,
      fullDesc: 'Напыление жесткого пенополиуретана (ППУ) высокой плотности с закрытой ячейкой. Имеет самый низкий коэффициент теплопроводности среди коммерческих материалов (0.022 Вт/мК). Полностью исключает мостики холода, одновременно являясь пароизоляцией и антикоррозийной защитой для металлического каркаса.',
      standards: 'СТО 002-20921484-2021, ГОСТ 30732-2020.',
      materials: 'Двухкомпонентные полиольные и изоцианатные системы жесткого ППУ.',
      price: 'от 1 100 ₽ / м²',
      specs: [
        'Плотность в готовом слое: 35 - 45 кг/м³ (жесткий напыляемый)',
        'Коэффициент теплопроводности при 25°C: не более 0.022 - 0.025 Вт/(м·К)',
        'Содержание закрытых ячеек: не менее 92% - 95%',
        'Срок службы покрытия: не менее 30 лет без усадки',
      ]
    }
  ];

  return (
    <section id="services" className="py-24 border-t border-border bg-bg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16">
          <div>
            <h2 className="text-3xl sm:text-4xl text-text font-black mb-4 uppercase tracking-tight">
              Услуги группы <span className="text-primary">СФЕРА</span>
            </h2>
            <p className="max-w-xl text-text-muted font-medium">
              Мы не просто красим — мы создаем долговечный защитный барьер, применяя профессиональное промышленное оборудование высокого давления.
            </p>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <span className="text-4xl sm:text-6xl font-black text-border uppercase select-none tracking-tighter">
              Технологии
            </span>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-surface border border-border">
          {services.map((svc) => (
            <div
              key={svc.id}
              onClick={() => setSelectedService(svc)}
              className="bg-surface/80 hover:bg-[#F95700]/5 border border-white/[0.02] backdrop-blur-md p-8 group transition duration-500 flex flex-col justify-between min-h-[300px] cursor-pointer relative"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <div className="w-12 h-12 border border-border group-hover:border-primary mb-0 flex items-center justify-center text-border0 group-hover:text-[#F95700] text-sm font-black transition duration-300">
                    {svc.num}
                  </div>
                  <span className="text-[9px] text-primary font-black uppercase tracking-widest bg-[#F95700]/10 px-2.5 py-1">
                    {svc.tag}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl text-text font-bold mb-4 uppercase group-hover:text-[#F95700] transition duration-300">
                  {svc.title}
                </h3>
                <p className="text-xs text-text-muted leading-relaxed line-clamp-3">
                  {svc.shortDesc}
                </p>
              </div>

              <div className="mt-6 flex justify-between items-center">
                <span className="text-[10px] text-text-muted font-bold uppercase tracking-widest group-hover:text-white transition duration-300">
                  Узнать подробнее →
                </span>
                {svc.icon}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal View for detailed B2B/B2G compliance info */}
      <AnimatePresence>
        {selectedService && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#050507]/80 backdrop-blur-lg"
          >
            {/* Backdrop click closer */}
            <div className="absolute inset-0 cursor-pointer" onClick={() => setSelectedService(null)}></div>

            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-surface border border-border w-full max-w-3xl max-h-[90vh] overflow-y-auto z-10 shadow-2xl relative"
              style={{
                clipPath: 'polygon(4% 0, 100% 0, 100% 95%, 96% 100%, 0 100%, 0% 5%)',
              }}
            >
              {/* Close Button */}
              <button
                onClick={() => setSelectedService(null)}
                className="absolute top-6 right-6 text-text-muted hover:text-white transition cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="p-8 md:p-12">
                {/* Modal Title */}
                <div className="flex items-center space-x-3 mb-6">
                  <div className="w-10 h-10 border border-primary flex items-center justify-center text-primary font-black text-sm">
                    {selectedService.num}
                  </div>
                  <span className="text-xs font-bold text-primary tracking-widest uppercase bg-[#F95700]/10 px-3 py-1">
                    {selectedService.tag}
                  </span>
                </div>
                <h3 className="text-3xl text-text font-black uppercase mb-8 tracking-tight">
                  {selectedService.title}
                </h3>

                {selectedService.image && (
                  <div className="w-full aspect-[21/9] overflow-hidden mb-8 border border-border relative group">
                    <div className="absolute inset-0 bg-[#F95700]/10 mix-blend-color z-10 pointer-events-none"></div>
                    <img
                      src={selectedService.image}
                      alt={selectedService.title}
                      className="w-full h-full object-cover object-center opacity-85 hover:opacity-100 transition duration-500 transform group-hover:scale-102"
                    />
                  </div>
                )}

                <p className="text-text text-sm md:text-base leading-relaxed mb-8 font-medium">
                  {selectedService.fullDesc}
                </p>

                {/* Specs Section */}
                <div className="mb-8 bg-white/[0.02] border border-border p-6">
                  <h4 className="text-[10px] text-text-muted font-black tracking-widest uppercase mb-4 flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-primary" />
                    Технические характеристики слоя
                  </h4>
                  <ul className="space-y-2.5">
                    {selectedService.specs.map((spec, i) => (
                      <li key={i} className="text-[11px] text-text uppercase tracking-wide flex items-center gap-2 font-bold font-sans">
                        <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Grid Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-xs">
                  <div>
                    <span className="block text-text-muted font-bold uppercase tracking-wider mb-1">
                      Стандарты и регламенты
                    </span>
                    <span className="text-text font-medium block bg-surface p-3 leading-normal border-l-2 border-primary">
                      {selectedService.standards}
                    </span>
                  </div>
                  <div>
                    <span className="block text-text-muted font-bold uppercase tracking-wider mb-1">
                      Применяемые составы
                    </span>
                    <span className="text-text font-medium block bg-surface p-3 leading-normal border-l-2 border-primary">
                      {selectedService.materials}
                    </span>
                  </div>
                </div>

                {/* Pricing & CTA */}
                <div className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
                  <div>
                    <span className="block text-[10px] text-text-muted font-black tracking-widest uppercase mb-1">
                      Ориентировочная стоимость
                    </span>
                    <span className="text-2xl md:text-3xl text-text font-black">
                      {selectedService.price}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedService(null);
                      const contactsSection = document.getElementById('calc');
                      if (contactsSection) {
                        contactsSection.scrollIntoView({ behavior: 'smooth' });
                      }
                    }}
                    className="w-full md:w-auto px-10 py-4 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-xs tracking-widest transition duration-300 transform active:scale-95 cursor-pointer"
                    style={{
                      clipPath: 'polygon(8% 0, 100% 0, 100% 70%, 92% 100%, 0 100%, 0% 30%)',
                    }}
                  >
                    Перейти к расчету сметы
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
};
