import React from 'react';
import { Check, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

interface MaterialCard {
  id: string;
  title: string;
  subTitle: string;
  desc: string;
  features: string[];
  specLabel: string;
}

export const Materials: React.FC = () => {
  const materials: MaterialCard[] = [
    {
      id: 'unipol',
      title: 'УНИПОЛ®',
      subTitle: 'Индустриальные защитные покрытия широкого спектра действия',
      desc: 'Высокоэффективные полиуретановые, эпоксидные и акриловые защитные системы. Применяются для долговременной противокоррозионной защиты металлоконструкций.',
      features: [
        'Срок службы покрытия до 20-25 лет',
        'Нанесение при отрицательных температурах до -10°C',
        'Высокая стойкость к воздействию нефтепродуктов',
      ],
      specLabel: 'ТУ 2312-003-20921484',
    },
    {
      id: 'specizol',
      title: 'СПЕЦИЗОЛ',
      subTitle: 'Двухкомпонентная мембранная гидроизоляция бетона и металла',
      desc: 'Напыляемая жидкая резина быстрого отверждения. Создает бесшовный сверхэластичный барьер против грунтовых вод и химической коррозии конструкций.',
      features: [
        'Мгновенное формирование бесшовной мембраны за 5 секунд',
        'Экстремальная эластичность — относительное удлинение > 1000%',
        'Водонепроницаемость при давлении до 1.6 МПа (класс W16)',
      ],
      specLabel: 'ГОСТ 30693-2000',
    },
    {
      id: 'biurs',
      title: 'БИУРС',
      subTitle: 'Эпокс-полиуретановая изоляция магистральных трубопроводов',
      desc: 'Сверхпрочное двухкомпонентное антикоррозийное покрытие горячего нанесения для защиты труб, сварных стыков и запорной арматуры.',
      features: [
        'Официальный реестр ПАО «Газпром» и АК «Транснефть»',
        'Высокая адгезия к металлу и заводскому полиэтилену (>15 МПа)',
        'Диэлектрическая сплошность — отсутствие пробоя при 5 кВ/мм',
      ],
      specLabel: 'ТУ 2243-003-17247348',
    },
    {
      id: 'specprotekt',
      title: 'Спецпротект',
      subTitle: 'Системы цинконаполненных грунтов и полиуретановых эмалей',
      desc: 'Индустриальные покрытия для долговременной протекторной и барьерной защиты крупных промышленных металлоконструкций в морских и приморских климатических зонах.',
      features: [
        'Содержание металлического цинка в сухом слое грунта более 80%',
        'Устойчивость к абразивному износу и механическим повреждениям',
        'Сверхвысокая климатическая стойкость к УФ-излучению',
      ],
      specLabel: 'ТУ 20.30.12-008-8129483',
    },
    {
      id: 'akrus',
      title: 'Акрус',
      subTitle: 'Судовые и индустриальные антикоррозийные ЛКМ',
      desc: 'Высокотехнологичные эпоксидные грунты и полиуретановые эмали для защиты судов, портовых терминалов и внутренней поверхности резервуаров.',
      features: [
        'Сертификаты Речного (РРР) и Морского (РМРС) Регистров РФ',
        'Высокая химическая стойкость к сырой нефти и ГСМ',
        'Срок службы трехслойной системы до 20 лет',
      ],
      specLabel: 'ТУ 2312-002-89473822',
    },
    {
      id: 'polyurea',
      title: 'ПОЛИМОЧЕВИНА',
      subTitle: 'Бесшовная гидроизоляция и износостойкое покрытие',
      desc: 'Премиальный эластомер со скоростью отверждения 15 секунд. Формирует монолитный эластичный ковер для кровель, паркингов, пандусов и кузовов спецтехники.',
      features: [
        'Относительное удлинение при разрыве более 350%',
        'Высочайшая механическая стойкость к истиранию и ударам',
        'Пешеходная нагрузка допускается через 1 минуту',
      ],
      specLabel: 'ТУ 20.16.56-012-18247382',
    },
    {
      id: 'ppu',
      title: 'ПЕНОПОЛИУРЕТАН',
      subTitle: 'Напыляемый закрытоячеистый теплоизолятор высокой плотности',
      desc: 'Монолитный утеплитель с рекордно низким коэффициентом теплопроводности 0.022 Вт/м·К. Ликвидирует конденсат и мостики холода на любых поверхностях.',
      features: [
        'Коэффициент теплопроводности 0.022 Вт/(м·К)',
        'Отсутствие швов и крепежных элементов (нет мостиков холода)',
        'Срок службы теплоизоляционного контура от 30 лет',
      ],
      specLabel: 'СТО 002-20921484-2021',
    },
  ];

  return (
    <section id="materials" className="py-24 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-6">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 gap-8">
          <div>
            <h2 className="text-3xl sm:text-4xl text-text font-black mb-4 uppercase tracking-tight">
              Комплектация объектов
            </h2>
            <p className="text-text-muted max-w-xl font-medium">
              Прямые дилерские контракты с заводами-производителями. Собственный склад в Оренбурге с постоянным резервом сырья обеспечивает бесперебойное снабжение стройплощадок.
            </p>
          </div>
          <div className="bg-[#F95700]/5 border border-primary/20 p-6 max-w-sm w-full backdrop-blur-md">
            <span className="block text-text font-bold mb-2 uppercase text-xs tracking-wider">
              Заводские цены без наценок
            </span>
            <p className="text-[10px] text-text-muted uppercase tracking-tighter font-bold">
              Унипол | Специзол | Биурс | Спецпротект | Акрус • Прямые поставки
            </p>
          </div>
        </div>

        {/* Materials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {materials.map((mat, idx) => (
            <div
              key={idx}
              className="p-8 border border-border bg-surface hover:border-primary/40 transition duration-300 flex flex-col justify-between group"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="text-[10px] text-text-muted font-black tracking-widest uppercase">
                    {mat.specLabel}
                  </span>
                  <div className="w-2 h-2 bg-primary rounded-full group-hover:scale-150 transition duration-300"></div>
                </div>

                <h3 className="text-xl text-text font-black mb-1 uppercase tracking-tight">
                  {mat.title}
                </h3>
                <span className="block text-[10px] text-primary font-bold uppercase tracking-wider mb-6 leading-snug">
                  {mat.subTitle}
                </span>

                <p className="text-xs text-text-muted leading-relaxed mb-8 font-medium">
                  {mat.desc}
                </p>

                <div className="space-y-3 mb-10">
                  {mat.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-[10px] text-text font-bold uppercase tracking-wide leading-snug">
                        {feat}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                to={`/materials/${mat.id}`}
                className="w-full py-4 border border-primary text-primary hover:bg-[#F95700] hover:text-white font-black uppercase text-[10px] tracking-widest transition duration-300 flex items-center justify-center gap-2 cursor-pointer text-center"
              >
                <span>Подробнее о материале</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
