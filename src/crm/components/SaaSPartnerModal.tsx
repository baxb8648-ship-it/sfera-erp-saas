import React, { useState } from 'react';
import { 
  ShieldCheck, CheckCircle2, Printer, FileText, Plus, Copy, 
  Clock, Download, Check, CreditCard, Award, UserCheck
} from 'lucide-react';
import { GodTierModal } from './GodTierModal';

interface PartnerItem {
  id: number;
  name: string;
  type: string;
  promoCode: string;
  commissionRate: number;
  clientsCount: number;
  paidClientsCount: number;
  totalEarned: number;
  currentBalance: number;
  contactInfo: string;
  status?: string;
}

interface SaaSPartnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  partner: PartnerItem | null;
  onPayPartner?: (id: number, name: string, amount: number) => void;
}

export const SaaSPartnerModal: React.FC<SaaSPartnerModalProps> = ({
  isOpen,
  onClose,
  partner,
  onPayPartner
}) => {
  const [activeTab, setActiveTab] = useState<'contract' | 'acts' | 'clients' | 'requisites'>('contract');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Form states for requisites
  const [legalType, setLegalType] = useState<string>('IP');
  const [inn, setInn] = useState<string>('561001234500');
  const [kpp, setKpp] = useState<string>('');
  const [accountNumber, setAccountNumber] = useState<string>('40802810900000012345');
  const [bankName, setBankName] = useState<string>('ПАО Сбербанк г. Москва');
  const [bik, setBik] = useState<string>('044525225');

  if (!isOpen || !partner) return null;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast(`Скопировано в буфер: ${label}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Mocked list of referred clients for this partner
  const referredClients = [
    {
      id: 101,
      name: 'ООО «ПромТехИнтеграция»',
      inn: '5610098765',
      tariff: 'PRO SaaS (25 000 ₽ / мес)',
      regDate: '14.05.2026',
      status: 'Оплачен',
      ltv: 75000,
      commissionEarned: Math.round(75000 * (partner.commissionRate / 100))
    },
    {
      id: 102,
      name: 'АО «Завод Машиностроения»',
      inn: '7701234567',
      tariff: 'Enterprise Cluster (60 000 ₽ / мес)',
      regDate: '20.05.2026',
      status: 'Оплачен',
      ltv: 180000,
      commissionEarned: Math.round(180000 * (partner.commissionRate / 100))
    },
    {
      id: 103,
      name: 'ИП Смирнов В.А.',
      inn: '631001122334',
      tariff: 'Стандарт (9 900 ₽ / мес)',
      regDate: '01.06.2026',
      status: 'Оплачен',
      ltv: 29700,
      commissionEarned: Math.round(29700 * (partner.commissionRate / 100))
    },
    {
      id: 104,
      name: 'ООО «Урал Логистик»',
      inn: '6670001122',
      tariff: 'PRO SaaS (25 000 ₽ / мес)',
      regDate: '15.06.2026',
      status: 'Тестовый период 14 дн.',
      ltv: 0,
      commissionEarned: 0
    }
  ];

  // Mocked acts history
  const actsHistory = [
    {
      id: `ACT-${partner.id}-0626`,
      number: '№ 06/2026',
      date: '30.06.2026',
      period: 'Июнь 2026',
      amount: Math.round(partner.totalEarned * 0.45),
      status: 'Оплачен и подписан ЭДО',
      file: `Акт_оказанных_услуг_${partner.promoCode}_062026.pdf`
    },
    {
      id: `ACT-${partner.id}-0526`,
      number: '№ 05/2026',
      date: '31.05.2026',
      period: 'Май 2026',
      amount: Math.round(partner.totalEarned * 0.35),
      status: 'Оплачен и подписан ЭДО',
      file: `Акт_оказанных_услуг_${partner.promoCode}_052026.pdf`
    },
    {
      id: `ACT-${partner.id}-0426`,
      number: '№ 04/2026',
      date: '30.04.2026',
      period: 'Апрель 2026',
      amount: Math.round(partner.totalEarned * 0.20),
      status: 'Оплачен и подписан ЭДО',
      file: `Акт_оказанных_услуг_${partner.promoCode}_042026.pdf`
    }
  ];

  const utmLink = `https://sferum.space/register?agent=${partner.promoCode}`;

  return (
    <GodTierModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="4xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
            <Award size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black text-gray-900 dark:text-white font-['Montserrat']">
                {partner.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20">
                {partner.type}
              </span>
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400 font-mono flex items-center gap-2 mt-0.5">
              <span>Промокод: <strong className="text-emerald-600 dark:text-emerald-400">{partner.promoCode}</strong></span>
              <span>•</span>
              <span>Ставка: <strong className="text-gray-900 dark:text-white">{partner.commissionRate}% LTV</strong></span>
              <span>•</span>
              <span>Контакты: {partner.contactInfo}</span>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-6 font-sans">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed top-6 right-6 z-50 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-4 py-3 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2 animate-bounce">
            <CheckCircle2 size={16} className="text-emerald-500" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Top Summary Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-gray-50 dark:bg-zinc-900/60 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800/80 font-mono">
          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 uppercase font-bold">UTM Партнера</span>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-gray-900 dark:text-white truncate max-w-[150px]" title={utmLink}>
                sfera-erp.ru/reg...
              </span>
              <button
                onClick={() => handleCopy(utmLink, 'UTM-ссылка')}
                className="p-1 rounded bg-white dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-500 hover:text-black dark:hover:text-white transition-colors"
                title="Скопировать ссылку"
              >
                {copiedField === 'UTM-ссылка' ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 uppercase font-bold">Приведено клиентов</span>
            <div className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
              <span>{partner.clientsCount} комп.</span>
              <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">(🟢 {partner.paidClientsCount} оплатили)</span>
            </div>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] text-gray-400 uppercase font-bold">Заработано всего</span>
            <div className="text-base font-extrabold text-gray-900 dark:text-white">
              {new Intl.NumberFormat('ru-RU').format(partner.totalEarned)} ₽
            </div>
          </div>

          <div className="space-y-1 border-l sm:border-l border-gray-200 dark:border-zinc-800 pl-4">
            <span className="text-[11px] text-gray-400 uppercase font-bold">К выплате сейчас</span>
            <div className="flex items-center justify-between">
              <span className={`text-base font-extrabold ${partner.currentBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400'}`}>
                {new Intl.NumberFormat('ru-RU').format(partner.currentBalance)} ₽
              </span>
              {partner.currentBalance > 0 && onPayPartner && (
                <button
                  onClick={() => {
                    onPayPartner(partner.id, partner.name, partner.currentBalance);
                    showToast(`Выплата на сумму ${partner.currentBalance} ₽ оформлена!`);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  <CreditCard size={12} />
                  <span>Выплатить</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-zinc-800 gap-2 overflow-x-auto pb-1">
          {[
            { id: 'contract', label: '📄 Агентский договор (ЭДО)', count: 'ПЭП № 998231' },
            { id: 'acts', label: '🧾 Акты выполненных работ', count: `${actsHistory.length}` },
            { id: 'clients', label: '👥 Привлеченные компании', count: `${partner.clientsCount}` },
            { id: 'requisites', label: '💳 Банковские реквизиты' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2.5 rounded-t-xl text-xs font-mono font-bold transition-all flex items-center gap-2 cursor-pointer border-b-2 whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-gray-100 dark:bg-zinc-800/80 text-[#F95700] border-[#F95700]'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white border-transparent hover:bg-gray-50 dark:hover:bg-zinc-900/40'
              }`}
            >
              <span>{tab.label}</span>
              {tab.count && (
                <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                  activeTab === tab.id
                    ? 'bg-[#F95700]/20 text-[#F95700]'
                    : 'bg-gray-200 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab 1: Агентский договор */}
        {activeTab === 'contract' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/20 pb-4">
                <div>
                  <div className="text-xs font-mono font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    Юридический документ (Лицензионно-Агентский договор)
                  </div>
                  <h4 className="text-lg font-extrabold text-gray-900 dark:text-white mt-1">
                    Договор № AG-{partner.id}/2026 на продвижение платформы «СФЕРУМ»
                  </h4>
                  <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                    Дата заключения: 12.05.2026 • Действует бессрочно с автоматической пролонгацией
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-full bg-emerald-500 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm">
                    <ShieldCheck size={14} /> Подписан ЭДО
                  </span>
                </div>
              </div>

              {/* Document Preview Box */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl p-5 border border-gray-200 dark:border-zinc-800 text-xs font-mono space-y-3 text-gray-700 dark:text-zinc-300 shadow-inner">
                <div className="font-bold text-gray-900 dark:text-white text-sm text-center">
                  АГЕНТСКИЙ ДОГОВОР № AG-{partner.id}/2026
                </div>
                <p>
                  <strong>ООО «ЛЕОНИКА»</strong>, именуемое в дальнейшем «Принципал / Лицензиар», в лице Генерального директора, с одной стороны, и <strong>{partner.name}</strong>, именуемое в дальнейшем «Агент / Партнер», с другой стороны, заключили настоящий договор о нижеследующем:
                </p>
                <div className="space-y-1.5 pl-4 border-l-2 border-emerald-500/50">
                  <p><strong>1. Предмет договора:</strong> Агент обязуется совершать от своего имени или от имени Принципала действия по привлечению новых конечных пользователей (Сублицензиатов) к использованию облачной ERP-системы «СФЕРУМ».</p>
                  <p><strong>2. Размер вознаграждения:</strong> Принципал выплачивает Агенту комиссионное вознаграждение в размере <strong>{partner.commissionRate}%</strong> от всех фактических платежей (LTV), поступивших от привлеченных Агентом пользователей.</p>
                  <p><strong>3. Порядок расчетов:</strong> Выплата вознаграждения осуществляется ежемесячно на основании подписанных сторонами Актов об оказании агентских услуг не позднее 5-го рабочего дня.</p>
                  <p><strong>4. Идентификация клиентов:</strong> Привязка клиентов осуществляется посредством уникального промокода <strong>«{partner.promoCode}»</strong> и реферальной UTM-ссылки.</p>
                </div>
                <div className="pt-2 text-[11px] text-gray-400 flex items-center justify-between border-t border-gray-100 dark:border-zinc-800">
                  <span>Документ подписан простой электронной подписью (ПЭП ID: #998231-SFERUM-AG).</span>
                  <span>Штамп времени: 12.05.2026 14:30:12 MSK</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                <button
                  onClick={() => showToast(`Договор № AG-${partner.id}/2026 успешно скачан в формате Microsoft Word (.docx)`)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-white font-mono font-bold text-xs border border-gray-300 dark:border-zinc-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <FileText size={15} className="text-blue-500" />
                  <span>Скачать Word (.docx)</span>
                </button>
                <button
                  onClick={() => showToast(`Договор № AG-${partner.id}/2026 скачан в формате PDF с синей печатью и подписью`)}
                  className="px-4 py-2 rounded-xl bg-white dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700 text-gray-800 dark:text-white font-mono font-bold text-xs border border-gray-300 dark:border-zinc-700 transition-all flex items-center gap-2 cursor-pointer shadow-sm"
                >
                  <Download size={15} className="text-emerald-500" />
                  <span>Скачать PDF с печатью</span>
                </button>
                <button
                  onClick={() => showToast(`Отправлено на системный принтер: Договор № AG-${partner.id}/2026`)}
                  className="px-4 py-2 rounded-xl bg-[#F95700] hover:bg-[#F95700]/90 text-white font-mono font-bold text-xs transition-all flex items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer size={15} />
                  <span>Печать договора</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Акты выполненных работ */}
        {activeTab === 'acts' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base">Реестр Актов сдачи-приемки агентских услуг</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
                  Акты формируются автоматически в конце каждого расчетного месяца или при нажатии кнопки «Выплатить»
                </p>
              </div>
              <button
                onClick={() => showToast(`Сформирован новый Акт за текущий месяц на сумму ${partner.currentBalance} ₽`)}
                disabled={partner.currentBalance === 0}
                className={`px-4 py-2 rounded-xl font-mono font-bold text-xs flex items-center gap-2 transition-all ${
                  partner.currentBalance > 0
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md cursor-pointer'
                    : 'bg-gray-200 dark:bg-zinc-800 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Plus size={15} />
                <span>Сформировать Акт за текущий период</span>
              </button>
            </div>

            <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-gray-50 dark:bg-zinc-900/80 text-gray-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-5">Номер Акта / Период</th>
                    <th className="py-3.5 px-5">Дата подписания</th>
                    <th className="py-3.5 px-5">Сумма вознаграждения</th>
                    <th className="py-3.5 px-5">Статус ЭДО</th>
                    <th className="py-3.5 px-5 text-right">Действие</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-gray-700 dark:text-zinc-300">
                  {actsHistory.map(act => (
                    <tr key={act.id} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-gray-900 dark:text-white">{act.number}</div>
                        <div className="text-[11px] text-gray-400">Период: {act.period}</div>
                      </td>
                      <td className="py-4 px-5">{act.date}</td>
                      <td className="py-4 px-5 font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                        {new Intl.NumberFormat('ru-RU').format(act.amount)} ₽
                      </td>
                      <td className="py-4 px-5">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                          <CheckCircle2 size={13} className="text-emerald-500" />
                          <span>{act.status}</span>
                        </span>
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => showToast(`Файл ${act.file} загружен на устройство`)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors"
                            title="Скачать Акт в PDF"
                          >
                            <Download size={15} />
                          </button>
                          <button
                            onClick={() => showToast(`Акт ${act.number} отправлен на принтер`)}
                            className="p-1.5 rounded-lg bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors"
                            title="Печать Акта"
                          >
                            <Printer size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Привлеченные компании */}
        {activeTab === 'clients' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white text-base">Реестр привлеченных тенантов (Реферальная сеть)</h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 font-mono">
                  Компании, зарегистрированные по промокоду <strong>{partner.promoCode}</strong> или партнерской ссылке
                </p>
              </div>
              <div className="text-xs font-mono bg-gray-100 dark:bg-zinc-800 px-3 py-1.5 rounded-xl text-gray-700 dark:text-zinc-300 font-bold">
                Всего компаний: {referredClients.length}
              </div>
            </div>

            <div className="border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-gray-50 dark:bg-zinc-900/80 text-gray-500 dark:text-zinc-400 text-[11px] uppercase tracking-wider border-b border-gray-200 dark:border-zinc-800">
                  <tr>
                    <th className="py-3.5 px-5">Конечный пользователь (Тенант)</th>
                    <th className="py-3.5 px-5">Тарифный план</th>
                    <th className="py-3.5 px-5">Дата регистрации</th>
                    <th className="py-3.5 px-5">Статус подписки</th>
                    <th className="py-3.5 px-5 text-right">Начислено комиссии</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-gray-700 dark:text-zinc-300">
                  {referredClients.map(client => (
                    <tr key={client.id} className="hover:bg-gray-50/80 dark:hover:bg-zinc-800/40 transition-colors">
                      <td className="py-4 px-5">
                        <div className="font-bold text-gray-900 dark:text-white font-sans">{client.name}</div>
                        <div className="text-[11px] text-gray-400 font-mono">ИНН: {client.inn}</div>
                      </td>
                      <td className="py-4 px-5 font-semibold text-gray-800 dark:text-zinc-200">
                        {client.tariff}
                      </td>
                      <td className="py-4 px-5 text-gray-500 dark:text-zinc-400">{client.regDate}</td>
                      <td className="py-4 px-5">
                        {client.status === 'Оплачен' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20 text-[11px] font-semibold">
                            <CheckCircle2 size={13} className="text-emerald-500" />
                            <span>Оплачен (LTV: {new Intl.NumberFormat('ru-RU').format(client.ltv)} ₽)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-500/20 text-[11px] font-semibold">
                            <Clock size={13} className="text-amber-500" />
                            <span>{client.status}</span>
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">
                        {client.commissionEarned > 0 ? `+${new Intl.NumberFormat('ru-RU').format(client.commissionEarned)} ₽` : '0 ₽'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Банковские реквизиты */}
        {activeTab === 'requisites' && (
          <div className="space-y-6 animate-fadeIn font-mono">
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white text-base font-sans">Банковские реквизиты и статус для выплат</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                Данные реквизиты используются для формирования безналичных платежных поручений и Актов сдачи-приемки
              </p>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              showToast('Банковские реквизиты партнера успешно сохранены!');
            }} className="bg-gray-50 dark:bg-zinc-900/60 p-6 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    Юридический статус *
                  </label>
                  <select
                    value={legalType}
                    onChange={e => setLegalType(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#F95700]"
                  >
                    <option value="IP">Индивидуальный предприниматель (ИП)</option>
                    <option value="OOO">Юридическое лицо (ООО / АО)</option>
                    <option value="NPD">Самозанятый (Плательщик НПД)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    ИНН *
                  </label>
                  <input
                    type="text"
                    required
                    value={inn}
                    onChange={e => setInn(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    КПП (для ООО)
                  </label>
                  <input
                    type="text"
                    disabled={legalType !== 'OOO'}
                    value={kpp}
                    onChange={e => setKpp(e.target.value)}
                    placeholder={legalType !== 'OOO' ? 'Не требуется' : '561001001'}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#F95700] disabled:bg-gray-100 dark:disabled:bg-zinc-900 disabled:text-gray-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    Расчетный счет (р/с) *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountNumber}
                    onChange={e => setAccountNumber(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                    БИК Банка *
                  </label>
                  <input
                    type="text"
                    required
                    value={bik}
                    onChange={e => setBik(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#F95700]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-gray-600 dark:text-zinc-400 mb-1">
                  Наименование Банка *
                </label>
                <input
                  type="text"
                  required
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-white focus:outline-none focus:border-[#F95700]"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gray-900 dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-gray-900 font-bold text-xs transition-all shadow-md cursor-pointer active:scale-95 flex items-center gap-2"
                >
                  <UserCheck size={16} />
                  <span>Сохранить реквизиты</span>
                </button>
              </div>

            </form>
          </div>
        )}

      </div>
    </GodTierModal>
  );
};
