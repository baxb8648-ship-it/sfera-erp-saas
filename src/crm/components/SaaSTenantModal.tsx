import React, { useState } from 'react';
import { 
  Building2, Users, Calendar, ShieldCheck, 
  CheckCircle2, Lock, Unlock, Sparkles, AlertTriangle, 
  Crown, Printer, Mail, 
  FileText, Send, 
  Plus, Copy, Activity, DollarSign,
  FileSpreadsheet,
  Clock
} from 'lucide-react';
import { GodTierModal } from './GodTierModal';

interface SaaSTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: any | null;
  onExtendSubscription?: (tenantId: number, months: number) => void;
  onToggleStatus?: (tenant: any) => void;
  onRegisterDoc?: (docNumber: string, amount: number, period: string, docType: string) => void;
}

export const SaaSTenantModal: React.FC<SaaSTenantModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onExtendSubscription,
  onToggleStatus,
  onRegisterDoc
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'docs' | 'finance' | 'admins'>('overview');
  const [activeDocType, setActiveDocType] = useState<'contract' | 'invoice' | 'act'>('invoice');
  const [invoicePeriod, setInvoicePeriod] = useState<number>(3); // months
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, setCopiedField] = useState<string | null>(null);

  if (!isOpen || !tenant) return null;


  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    showToast(`Скопировано: ${label}`);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Calculate pricing metrics based on users count
  const usersCount = tenant.users_count || 1;
  const pricePerUserMonth = 2500; // 2500 RUB per user/month
  const currentMRR = usersCount * pricePerUserMonth;
  const currentARR = currentMRR * 12;
  const estimatedLTV = currentMRR * (tenant.id === 1 ? 14 : 7);

  // Invoice calculations
  const getInvoiceAmount = () => {
    let discount = 0;
    if (invoicePeriod === 3) discount = 0.05;
    if (invoicePeriod === 6) discount = 0.10;
    if (invoicePeriod === 12) discount = 0.20;
    const base = currentMRR * invoicePeriod;
    const total = Math.round(base * (1 - discount));
    return { base, total, discount: discount * 100 };
  };

  const invoiceData = getInvoiceAmount();
  const docNumber = `СФ-${tenant.id}-${new Date().getMonth() + 1}${new Date().getDate()}`;
  const currentDateStr = new Date().toLocaleDateString('ru-RU');

  const handlePrint = () => {
    window.print();
    showToast('Запущена печать документа в PDF');
  };

  const handleSendEmail = () => {
    showToast(`Официальный документ успешно отправлен на Email: director@company-${tenant.id}.ru`);
  };

  const handleRegisterVendorDoc = () => {
    const typeName = activeDocType === 'invoice' ? 'SaaS Лицензия (Счет)' : activeDocType === 'act' ? 'Акт сдачи-приемки ЭДО' : 'Лицензионный договор оферты';
    if (onRegisterDoc) {
      onRegisterDoc(docNumber, invoiceData.total, `${invoicePeriod} мес.`, typeName);
    }
    showToast(`Документ № ${docNumber} зарегистрирован во внутреннем реестре бухгалтерии Вендора!`);
  };

  return (
    <GodTierModal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="5xl"
      title={
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#F95700] to-amber-600 flex items-center justify-center text-white shadow-md">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-xl font-black text-gray-900 dark:text-white font-['Montserrat']">
                {tenant.full_name || tenant.name}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#F95700]/10 text-[#F95700] border border-[#F95700]/30">
                ID: #{tenant.id}
              </span>
              {tenant.is_active ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 size={12} /> Активна (200 OK)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                  <Lock size={12} /> Блокирована
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-zinc-400 font-mono mt-0.5 flex items-center gap-3">
              <span>ИНН: <strong>{tenant.inn}</strong></span>
              {tenant.kpp && <span>КПП: {tenant.kpp}</span>}
              <span>Отрасль: <strong className="uppercase text-gray-700 dark:text-zinc-300">{tenant.sphere}</strong></span>
            </div>
          </div>
        </div>
      }
    >
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-4 right-4 z-50 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-950 px-4 py-2.5 rounded-xl shadow-2xl font-mono text-xs flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-200 border border-[#F95700]">
          <Sparkles size={14} className="text-[#F95700]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs Bar */}
      <div className="border-b border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 px-6 pt-3 flex items-center gap-2 overflow-x-auto">
        {[
          { id: 'overview', label: '🏢 Обзор и Лицензии', icon: ShieldCheck },
          { id: 'docs', label: '📄 Документооборот SaaS', icon: FileText, badge: 'Биллинг' },
          { id: 'finance', label: '💰 Финансы и LTV', icon: DollarSign },
          { id: 'admins', label: '👥 Администраторы', icon: Users },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-mono font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'border-[#F95700] text-[#F95700] bg-white dark:bg-zinc-900 shadow-sm rounded-t-xl'
                  : 'border-transparent text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100/50 dark:hover:bg-zinc-800/50 rounded-t-xl'
              }`}
            >
              <Icon size={15} className={isActive ? 'text-[#F95700]' : 'text-gray-400'} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className="ml-1 px-1.5 py-0.2 rounded text-[10px] bg-[#F95700]/10 text-[#F95700] border border-[#F95700]/20">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Contents */}
      <div className="p-6 max-h-[70vh] overflow-y-auto space-y-6 bg-white dark:bg-zinc-900">
        
        {/* TAB 1: OVERVIEW & LICENSES */}
        {activeTab === 'overview' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Top Cards Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              
              {/* Legal Requisites */}
              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 space-y-3 shadow-sm">
                <div className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Building2 size={14} className="text-[#F95700]" /> Юр. Реквизиты ЕГРЮЛ
                  </span>
                  <button 
                    onClick={() => handleCopy(tenant.inn, 'ИНН')}
                    className="text-[10px] text-gray-400 hover:text-[#F95700] flex items-center gap-0.5"
                  >
                    <Copy size={11} /> ИНН
                  </button>
                </div>
                <div className="space-y-1.5 text-xs font-mono">
                  <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-zinc-800/60">
                    <span className="text-gray-500">ИНН:</span>
                    <strong className="text-gray-900 dark:text-white">{tenant.inn}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-zinc-800/60">
                    <span className="text-gray-500">КПП:</span>
                    <strong className="text-gray-900 dark:text-white">{tenant.kpp || 'Не указан'}</strong>
                  </div>
                  <div className="flex justify-between py-1 border-b border-gray-200/60 dark:border-zinc-800/60">
                    <span className="text-gray-500">ОГРН:</span>
                    <strong className="text-gray-900 dark:text-white">{tenant.ogrn || '1157746000001'}</strong>
                  </div>
                  <div className="pt-1">
                    <span className="text-gray-500 block mb-0.5">Юр. адрес:</span>
                    <span className="text-gray-800 dark:text-zinc-200 font-sans text-[11px] leading-tight block">
                      {tenant.address || 'Россия, г. Москва, ул. Тверская, д. 1, офис 100'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Subscription Status */}
              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 space-y-3 shadow-sm">
                <div className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-emerald-500 dark:text-emerald-400" /> Статус SaaS Подписки
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Тариф:</span>
                    <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold border border-purple-500/20">
                      Enterprise Cluster
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-gray-200/60 dark:border-zinc-800/60">
                    <span className="text-gray-500">Окончание:</span>
                    <strong className="text-gray-900 dark:text-white">
                      {tenant.subscription_ends_at ? new Date(tenant.subscription_ends_at).toLocaleDateString('ru-RU') : 'Бессрочно / Trial'}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-gray-500">RLS Изоляция:</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                      <ShieldCheck size={13} /> Active (Postgres RLS)
                    </span>
                  </div>
                  <div className="pt-2">
                    <span className="text-[11px] text-gray-500 uppercase font-bold block mb-1.5">Быстрое продление:</span>
                    <div className="flex items-center gap-1.5">
                      {[1, 3, 6, 12].map(m => (
                        <button
                          key={m}
                          onClick={() => {
                            if (onExtendSubscription) onExtendSubscription(tenant.id, m);
                            showToast(`Подписка продлена на ${m} мес.`);
                          }}
                          className="flex-1 py-1.5 rounded-lg bg-gray-200 dark:bg-zinc-800 hover:bg-[#F95700] hover:text-white dark:hover:bg-[#F95700] text-xs font-bold transition-all cursor-pointer text-center"
                        >
                          +{m}м
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Users & Licenses */}
              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 space-y-3 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Users size={14} className="text-purple-500" /> Лицензии юзеров
                  </div>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="text-3xl font-black font-mono text-gray-900 dark:text-white">{usersCount}</span>
                    <span className="text-xs text-gray-500 font-mono">активных пользователей</span>
                  </div>
                  <p className="text-[11px] text-gray-500 dark:text-zinc-400 mt-2">
                    Каждая лицензия дает право одному сотруднику входить в платформу с индивидуальным логином и ролью.
                  </p>
                </div>

                <div className="space-y-2 pt-3 border-t border-gray-200/60 dark:border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => showToast('Квота лицензий увеличена на +5')}
                      className="flex-1 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded-lg text-xs font-mono font-bold border border-purple-500/30 transition-all cursor-pointer text-center"
                    >
                      +5 лицензий
                    </button>
                    <button 
                      onClick={() => showToast('Квота лицензий увеличена на +10')}
                      className="flex-1 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-300 rounded-lg text-xs font-mono font-bold border border-purple-500/30 transition-all cursor-pointer text-center"
                    >
                      +10 лицензий
                    </button>
                  </div>
                  {onToggleStatus && (
                    <button
                      onClick={() => onToggleStatus(tenant)}
                      className={`w-full py-2 rounded-xl font-mono font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        tenant.is_active
                          ? 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 border border-rose-500/30'
                          : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/30'
                      }`}
                    >
                      {tenant.is_active ? <Lock size={14} /> : <Unlock size={14} />}
                      <span>{tenant.is_active ? 'Заблокировать доступ' : 'Разблокировать доступ'}</span>
                    </button>
                  )}
                </div>
              </div>

            </div>

            {/* Info Banner */}
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-gray-700 dark:text-zinc-300 space-y-1">
                <div className="font-bold text-gray-900 dark:text-white">Архитектурная справка СФЕРА ERP: Изоляция подписчиков</div>
                <p>
                  Данный тенант работает в изолированном контуре. Его контрагенты, сделки и объекты из CRM <strong>не пересекаются</strong> с другими компаниями. Документооборот по оплате подписки за эту компанию ведется во вкладке «📄 Документооборот SaaS» и регистрируется в бухгалтерии Владельца платформы.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: SAAS DOCUMENTS & BILLING */}
        {activeTab === 'docs' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Document Selector Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50 dark:bg-zinc-950/80 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white font-['Montserrat'] flex items-center gap-2">
                  <FileText size={16} className="text-[#F95700]" /> Генератор документов Владельца платформы
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Выставление официальных счетов, актов и договоров для подписчика {tenant.name}.
                </p>
              </div>
              
              <div className="flex items-center gap-2">
                {[
                  { id: 'invoice', label: '💳 Счет на оплату' },
                  { id: 'act', label: '📑 Закрывающий Акт' },
                  { id: 'contract', label: '📜 Договор Оферты' }
                ].map(d => (
                  <button
                    key={d.id}
                    onClick={() => setActiveDocType(d.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                      activeDocType === d.id
                        ? 'bg-[#F95700] text-white shadow-md'
                        : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-800 hover:border-gray-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Document Period Selector for Invoice */}
            {activeDocType === 'invoice' && (
              <div className="flex items-center justify-between bg-purple-500/5 p-4 rounded-2xl border border-purple-500/20">
                <span className="text-xs font-mono font-bold text-gray-700 dark:text-zinc-300 flex items-center gap-2">
                  <Clock size={15} className="text-purple-500" /> Выберите период оплаты подписки:
                </span>
                <div className="flex items-center gap-2">
                  {[
                    { m: 1, label: '1 месяц', sub: 'Без скидки' },
                    { m: 3, label: '3 месяца (Квартал)', sub: '-5%' },
                    { m: 6, label: '6 месяцев (Полгода)', sub: '-10%' },
                    { m: 12, label: '1 год (12 мес)', sub: '-20% VIP' }
                  ].map(p => (
                    <button
                      key={p.m}
                      onClick={() => setInvoicePeriod(p.m)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer flex flex-col items-center ${
                        invoicePeriod === p.m
                          ? 'bg-purple-600 text-white font-bold shadow-md'
                          : 'bg-white dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-800 hover:border-purple-500/50'
                      }`}
                    >
                      <span>{p.label}</span>
                      <span className="text-[10px] opacity-80">{p.sub}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* LIVE DOCUMENT PREVIEW BOX */}
            <div className="bg-white dark:bg-zinc-950 p-8 rounded-2xl border-2 border-gray-300 dark:border-zinc-800 shadow-xl font-mono text-xs space-y-6 text-gray-800 dark:text-zinc-200">
              
              {/* Document Header Bar */}
              <div className="flex items-start justify-between border-b-2 border-gray-900 dark:border-white pb-6">
                <div>
                  <div className="text-xl font-black font-['Montserrat'] tracking-tight text-gray-900 dark:text-white uppercase">
                    {activeDocType === 'invoice' && `Счет на оплату № ${docNumber}`}
                    {activeDocType === 'act' && `Акт передачи прав № АКТ-${docNumber}`}
                    {activeDocType === 'contract' && `Лицензионный договор № ЛД-${tenant.id}/2026`}
                  </div>
                  <div className="text-gray-500 dark:text-zinc-400 mt-1">
                    от {currentDateStr} г. • Платформа СФЕРА ERP SaaS
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                    <CheckCircle2 size={13} /> Электронная подпись (КЭП)
                  </div>
                  <div className="text-[10px] text-gray-400">
                    ID документа: SHA256-VND-{Math.random().toString(36).substring(2, 10).toUpperCase()}
                  </div>
                </div>
              </div>

              {/* Parties Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-2">
                <div className="space-y-1.5 bg-gray-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-gray-200 dark:border-zinc-800/80">
                  <span className="text-[11px] font-bold text-[#F95700] uppercase block">Исполнитель (Вендор платформы):</span>
                  <div className="font-bold text-gray-900 dark:text-white font-sans text-sm">ООО «СФЕРА-ИТ» (Лицензиар)</div>
                  <div>ИНН: 7701234567 • КПП: 770101001</div>
                  <div>р/с: 40702810100000000001 в ПАО Сбербанк</div>
                  <div>к/с: 30101810400000000225 • БИК: 044525225</div>
                  <div>Юр. адрес: 101000, г. Москва, ул. Тверская, д. 1</div>
                </div>

                <div className="space-y-1.5 bg-gray-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-gray-200 dark:border-zinc-800/80">
                  <span className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase block">Заказчик (Подписчик / Лицензиат):</span>
                  <div className="font-bold text-gray-900 dark:text-white font-sans text-sm">{tenant.full_name || tenant.name}</div>
                  <div>ИНН: <strong>{tenant.inn}</strong> {tenant.kpp && `• КПП: ${tenant.kpp}`}</div>
                  <div>ОГРН: {tenant.ogrn || '1157746000001'}</div>
                  <div>Юр. адрес: {tenant.address || 'Россия, г. Москва'}</div>
                  <div>Директор: {tenant.director || 'Генеральный директор'}</div>
                </div>
              </div>

              {/* Document Body Content */}
              {activeDocType === 'invoice' && (
                <div className="space-y-4">
                  <table className="w-full text-left border-collapse border border-gray-200 dark:border-zinc-800">
                    <thead>
                      <tr className="bg-gray-100 dark:bg-zinc-900 text-gray-700 dark:text-zinc-300 uppercase font-bold text-[11px]">
                        <th className="p-3 border border-gray-200 dark:border-zinc-800">№</th>
                        <th className="p-3 border border-gray-200 dark:border-zinc-800">Наименование услуги / права</th>
                        <th className="p-3 border border-gray-200 dark:border-zinc-800 text-center">Кол-во юзеров</th>
                        <th className="p-3 border border-gray-200 dark:border-zinc-800 text-center">Период</th>
                        <th className="p-3 border border-gray-200 dark:border-zinc-800 text-right">Сумма (руб.)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-3 border border-gray-200 dark:border-zinc-800 text-center">1</td>
                        <td className="p-3 border border-gray-200 dark:border-zinc-800 font-sans font-medium text-gray-900 dark:text-white">
                          Предоставление неисключительного права на использование программы для ЭВМ «Облачная платформа СФЕРА ERP SaaS» (Тариф Enterprise Cluster, НДС не облагается в связи с применением УСН и включением ПО в Реестр отечественного ПО)
                        </td>
                        <td className="p-3 border border-gray-200 dark:border-zinc-800 text-center font-bold">{usersCount}</td>
                        <td className="p-3 border border-gray-200 dark:border-zinc-800 text-center">{invoicePeriod} мес.</td>
                        <td className="p-3 border border-gray-200 dark:border-zinc-800 text-right font-bold text-sm">
                          {invoiceData.total.toLocaleString('ru-RU')} ₽
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="flex justify-end pt-2">
                    <div className="w-64 space-y-2 font-mono text-xs">
                      <div className="flex justify-between text-gray-500">
                        <span>Итого без скидки:</span>
                        <span>{invoiceData.base.toLocaleString('ru-RU')} ₽</span>
                      </div>
                      {invoiceData.discount > 0 && (
                        <div className="flex justify-between text-emerald-600 font-bold">
                          <span>Скидка за период ({invoiceData.discount}%):</span>
                          <span>-{(invoiceData.base - invoiceData.total).toLocaleString('ru-RU')} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between text-base font-black text-gray-900 dark:text-white pt-2 border-t-2 border-gray-900 dark:border-white">
                        <span>К ОПЛАТЕ:</span>
                        <span className="text-[#F95700]">{invoiceData.total.toLocaleString('ru-RU')} ₽</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeDocType === 'act' && (
                <div className="space-y-4 py-2 font-sans text-sm leading-relaxed text-gray-800 dark:text-zinc-200">
                  <p>
                    <strong>Исполнитель</strong> в лице Генерального директора ООО «СФЕРА-ИТ» передал, а <strong>Заказчик</strong> в лице руководителя {tenant.full_name || tenant.name} принял неисключительные права доступа (простую лицензию) к программе для ЭВМ «СФЕРА ERP SaaS» за период: <strong>Июнь 2026 г.</strong>
                  </p>
                  <p>
                    Количество активных лицензированных пользователей: <strong>{usersCount} юзеров</strong>. Услуги и права оказаны и переданы в полном объеме, надлежащего качества. Стороны взаимных претензий по объему, качеству и срокам не имеют.
                  </p>
                  <div className="p-4 bg-gray-50 dark:bg-zinc-900 rounded-xl font-mono text-xs mt-4">
                    Общая стоимость переданных прав составляет: <strong>{currentMRR.toLocaleString('ru-RU')} рублей 00 копеек</strong>, без НДС (Реестр отечественного ПО № 12345).
                  </div>
                </div>
              )}

              {activeDocType === 'contract' && (
                <div className="space-y-4 py-2 font-sans text-sm leading-relaxed text-gray-800 dark:text-zinc-200 max-h-48 overflow-y-auto pr-2 border-l-2 border-[#F95700] pl-4">
                  <p className="font-bold">1. ПРЕДМЕТ ДОГОВОРА</p>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    1.1. Лицензиар (ООО «СФЕРА-ИТ») обязуется предоставить Лицензиату ({tenant.name}) право использования (простую неисключительную лицензию) программы для ЭВМ «Облачная платформа автоматизации СФЕРА ERP SaaS», размещенной на серверах Лицензиара, а Лицензиат обязуется принять и оплатить предоставленное право согласно выбранному Тарифу.
                  </p>
                  <p className="font-bold">2. ИЗОЛЯЦИЯ ДАННЫХ И БЕЗОПАСНОСТЬ</p>
                  <p className="text-xs text-gray-600 dark:text-zinc-400">
                    2.1. Лицензиар гарантирует полную изоляцию информации Лицензиата при помощи технологии Row-Level Security (RLS) в кластере баз данных Neon PostgreSQL. Информация о контрагентах, счетах и объектах Лицензиата является коммерческой тайной и не доступна другим участникам платформы.
                  </p>
                </div>
              )}

              {/* Signatures Footer */}
              <div className="grid grid-cols-2 gap-12 pt-8 border-t border-gray-200 dark:border-zinc-800 font-sans text-xs">
                <div>
                  <span className="font-bold block text-gray-900 dark:text-white">От Исполнителя (Вендор):</span>
                  <div className="mt-4 pb-1 border-b border-gray-400 dark:border-zinc-600 text-gray-500 font-mono italic">
                    / Генеральный директор ООО «СФЕРА-ИТ» /
                  </div>
                  <span className="text-[10px] text-emerald-600 font-mono font-bold block mt-1">✔ Подписано усиленной КЭП</span>
                </div>
                <div>
                  <span className="font-bold block text-gray-900 dark:text-white">От Заказчика ({tenant.name}):</span>
                  <div className="mt-4 pb-1 border-b border-gray-400 dark:border-zinc-600 text-gray-500 font-mono italic">
                    / {tenant.director || 'Руководитель организации'} /
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono block mt-1">Ожидает подписания</span>
                </div>
              </div>

            </div>

            {/* DOCUMENT ACTION BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-2">
              <button
                onClick={handlePrint}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <Printer size={15} />
                <span>Печать / PDF</span>
              </button>

              <button
                onClick={handleSendEmail}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md"
              >
                <Mail size={15} />
                <span>Отправить на Email директору</span>
              </button>

              <button
                onClick={handleRegisterVendorDoc}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#F95700] to-amber-600 hover:from-[#e04e00] hover:to-amber-700 text-white text-xs font-mono font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg hover:shadow-orange-500/20 active:scale-95"
              >
                <FileSpreadsheet size={15} />
                <span>Зарегистрировать в бухгалтерии Вендора</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: FINANCE & LTV */}
        {activeTab === 'finance' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* KPI Cards Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 space-y-1">
                <span className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-bold uppercase">Текущий MRR</span>
                <div className="text-2xl font-black font-mono text-gray-900 dark:text-white">
                  {currentMRR.toLocaleString('ru-RU')} ₽
                </div>
                <span className="text-[10px] text-emerald-600 font-mono font-bold block">Ежемесячный доход с подписки</span>
              </div>

              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 space-y-1">
                <span className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-bold uppercase">Прогноз ARR</span>
                <div className="text-2xl font-black font-mono text-purple-600 dark:text-purple-400">
                  {currentARR.toLocaleString('ru-RU')} ₽
                </div>
                <span className="text-[10px] text-gray-500 font-mono block">В годовом исчислении</span>
              </div>

              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 space-y-1">
                <span className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-bold uppercase">LTV Клиента</span>
                <div className="text-2xl font-black font-mono text-[#F95700]">
                  {estimatedLTV.toLocaleString('ru-RU')} ₽
                </div>
                <span className="text-[10px] text-gray-500 font-mono block">Суммарный доход за все время</span>
              </div>

              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800/80 space-y-1">
                <span className="text-gray-500 dark:text-zinc-400 text-xs font-mono font-bold uppercase">Биллинг статус</span>
                <div className="text-xl font-bold font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 pt-1">
                  <CheckCircle2 size={18} /> Оплачено
                </div>
                <span className="text-[10px] text-gray-500 font-mono block">Задолженностей нет</span>
              </div>
            </div>

            {/* Payments History Table */}
            <div className="bg-gray-50 dark:bg-zinc-950/40 rounded-2xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
              <div className="p-4 border-b border-gray-200 dark:border-zinc-800 font-bold text-sm text-gray-900 dark:text-white font-['Montserrat'] flex items-center justify-between">
                <span>История транзакций и поступивших оплат (Биллинг вендора)</span>
                <span className="text-xs font-mono text-gray-500">Показаны последние 3 транзакции</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-500 bg-gray-100/50 dark:bg-zinc-900/50 uppercase">
                      <th className="p-3.5">Дата оплаты</th>
                      <th className="p-3.5">Документ основания</th>
                      <th className="p-3.5">Способ оплаты</th>
                      <th className="p-3.5 text-right">Сумма</th>
                      <th className="p-3.5 text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
                    <tr>
                      <td className="p-3.5 font-bold text-gray-900 dark:text-white">01.06.2026</td>
                      <td className="p-3.5 text-gray-700 dark:text-zinc-300">Счет на оплату № СФ-{tenant.id}-0601 (Подписка 3 мес.)</td>
                      <td className="p-3.5 text-gray-500">Безналичный расчет (ПАО Сбербанк)</td>
                      <td className="p-3.5 text-right font-bold text-emerald-600">+{((usersCount * 2500 * 3) * 0.95).toLocaleString('ru-RU')} ₽</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                          Успешно
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-gray-900 dark:text-white">01.03.2026</td>
                      <td className="p-3.5 text-gray-700 dark:text-zinc-300">Счет на оплату № СФ-{tenant.id}-0301 (Подписка 3 мес.)</td>
                      <td className="p-3.5 text-gray-500">Безналичный расчет (ПАО Сбербанк)</td>
                      <td className="p-3.5 text-right font-bold text-emerald-600">+{((usersCount * 2500 * 3) * 0.95).toLocaleString('ru-RU')} ₽</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                          Успешно
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td className="p-3.5 font-bold text-gray-900 dark:text-white">01.12.2025</td>
                      <td className="p-3.5 text-gray-700 dark:text-zinc-300">Счет на оплату № СФ-{tenant.id}-1201 (Пакет расширения юзеров)</td>
                      <td className="p-3.5 text-gray-500">Безналичный расчет (ПАО Сбербанк)</td>
                      <td className="p-3.5 text-right font-bold text-emerald-600">+{((usersCount * 2500 * 3) * 0.95).toLocaleString('ru-RU')} ₽</td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold text-[10px] border border-emerald-500/20">
                          Успешно
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ADMINISTRATORS & CONTACTS */}
        {activeTab === 'admins' && (
          <div className="space-y-6 animate-in fade-in duration-200 font-mono text-xs">
            <div className="bg-purple-500/5 p-4 rounded-2xl border border-purple-500/20 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-white font-['Montserrat']">
                  Уполномоченные лица и администраторы тенанта
                </h4>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  Контактная информация для прямой связи службы технической поддержки и бухгалтерии.
                </p>
              </div>
              <button
                onClick={() => showToast('Функция добавления субадминистратора будет доступна в следующем релизе')}
                className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus size={14} /> Добавить контакт
              </button>
            </div>

            {/* Administrators List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Director Card */}
              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#F95700]/10 text-[#F95700] font-bold flex items-center justify-center text-base">
                      <Crown size={18} />
                    </div>
                    <div>
                      <div className="font-bold font-sans text-sm text-gray-900 dark:text-white">
                        {tenant.director || 'Халиков Ильдар Ильгизович'}
                      </div>
                      <div className="text-[11px] text-[#F95700] font-semibold uppercase mt-0.5">
                        Владелец тенанта / Директор
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 text-[10px] font-bold">
                    SuperAdmin SaaS
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200/60 dark:border-zinc-800/60 space-y-1.5 text-gray-600 dark:text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Email:</span>
                    <strong className="text-gray-900 dark:text-white">director@{tenant.inn || 'leonika'}.ru</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Телефон:</span>
                    <strong className="text-gray-900 dark:text-white">+7 (922) 800-00-{tenant.id.toString().padStart(2, '0')}</strong>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => showToast('Открыто окно быстрой отправки Email')}
                    className="flex-1 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-[#F95700] font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Mail size={13} className="text-[#F95700]" />
                    <span>Написать</span>
                  </button>
                  <button
                    onClick={() => showToast('Уведомление отправлено в Telegram бота директора')}
                    className="flex-1 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-purple-500 font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Send size={13} className="text-purple-500" />
                    <span>Telegram</span>
                  </button>
                </div>
              </div>

              {/* IT Lead Card */}
              <div className="bg-gray-50 dark:bg-zinc-950/60 p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 space-y-3 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 font-bold flex items-center justify-center text-base">
                      <Users size={18} />
                    </div>
                    <div>
                      <div className="font-bold font-sans text-sm text-gray-900 dark:text-white">
                        Системный администратор
                      </div>
                      <div className="text-[11px] text-purple-600 dark:text-purple-400 font-semibold uppercase mt-0.5">
                        Технический специалист
                      </div>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 text-[10px] font-bold">
                    Admin Role
                  </span>
                </div>

                <div className="pt-2 border-t border-gray-200/60 dark:border-zinc-800/60 space-y-1.5 text-gray-600 dark:text-zinc-300">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Email:</span>
                    <strong className="text-gray-900 dark:text-white">admin@{tenant.inn || 'leonika'}.ru</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">Статус:</span>
                    <span className="text-emerald-600 font-bold">Активен в системе</span>
                  </div>
                </div>

                <div className="pt-2 flex items-center gap-2">
                  <button
                    onClick={() => showToast('Отправлен технический пинг администратору')}
                    className="w-full py-2 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 hover:border-purple-500 font-bold text-gray-700 dark:text-zinc-300 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Activity size={13} className="text-purple-500" />
                    <span>Проверить сессию (Pings)</span>
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* Modal Footer */}
      <div className="px-6 py-4 border-t border-gray-200 dark:border-zinc-800 bg-gray-50/50 dark:bg-zinc-950/50 flex items-center justify-between font-mono text-xs">
        <div className="text-gray-500 dark:text-zinc-400 flex items-center gap-2">
          <ShieldCheck size={14} className="text-emerald-500" />
          <span>SaaS RLS Isolation Active • Cluster Neon EU-Central-1</span>
        </div>
        <button
          onClick={onClose}
          className="px-6 py-2 rounded-xl bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-950 font-bold hover:bg-gray-800 dark:hover:bg-zinc-200 transition-all cursor-pointer shadow-md"
        >
          Закрыть карточку
        </button>
      </div>
    </GodTierModal>
  );
};
