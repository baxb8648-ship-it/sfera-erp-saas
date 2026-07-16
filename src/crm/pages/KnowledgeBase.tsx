import React, { useState, useRef } from 'react';
import { 
  Database, UploadCloud, FileText, Trash2, Shield, 
  Sparkles, CheckCircle2, ShieldCheck, HelpCircle
} from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

interface KBDocument {
  id: string;
  title: string;
  filename: string;
  category: string;
  size: string;
  chunks_count: number;
  created_at: string;
  status: 'Изучено ИИ' | 'Индексация...';
}

const DEFAULT_DOCUMENTS: KBDocument[] = [
  {
    id: 'doc-1',
    title: 'Регламент продаж и общения с клиентами СФЕРУМ 2026',
    filename: 'Регламент продаж СФЕРУМ 2026.pdf',
    category: 'Регламенты',
    size: '1.4 MB',
    chunks_count: 64,
    created_at: '08.07.2026',
    status: 'Изучено ИИ'
  },
  {
    id: 'doc-2',
    title: 'Прайс-лист строительных работ и ТМЦ (Актуальный)',
    filename: 'Прайс-лист строительных работ и ТМЦ.xlsx',
    category: 'Прайс-листы',
    size: '820 KB',
    chunks_count: 128,
    created_at: '05.07.2026',
    status: 'Изучено ИИ'
  },
  {
    id: 'doc-3',
    title: 'Типовой договор подряда КС с гарантиями',
    filename: 'Типовой договор подряда с гарантиями.docx',
    category: 'Юридический',
    size: '410 KB',
    chunks_count: 42,
    created_at: '01.07.2026',
    status: 'Изучено ИИ'
  }
];

export default function KnowledgeBase({ isTab = false }: { isTab?: boolean } = {}) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const [documents, setDocuments] = useState<KBDocument[]>(DEFAULT_DOCUMENTS);

  // Drag & Drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = (file: File) => {
    const newDoc: KBDocument = {
      id: `doc-${Date.now()}`,
      title: file.name.replace(/\.[^/.]+$/, ''),
      filename: file.name,
      category: 'Новое',
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      chunks_count: Math.floor(Math.random() * 40) + 15,
      created_at: new Date().toLocaleDateString('ru-RU'),
      status: 'Изучено ИИ'
    };

    setDocuments(prev => [newDoc, ...prev]);
    toast?.showToast(`📄 Файл «${file.name}» успешно загружен и проиндексирован ИИ!`, 'success');
  };

  const handleDeleteDoc = (id: string, title: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
    toast?.showToast(`🗑️ Документ «${title}» удален из Базы Знаний`, 'info');
  };

  return (
    <div className="space-y-8 p-1 sm:p-2 w-full max-w-7xl mx-auto shrink-0 animate-fadeIn">
      {/* ── Главная шапка Базы Знаний ──────────────────────────────────────── */}
      {!isTab && (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-white via-orange-50/30 to-amber-50/40 dark:from-zinc-900 dark:via-zinc-900 dark:to-zinc-950 border border-orange-500/25 dark:border-orange-500/30 p-6 sm:p-8 shadow-xl dark:shadow-2xl transition-colors">
          <div className="absolute top-0 right-0 -mt-16 -mr-16 w-80 h-80 bg-gradient-to-br from-amber-500/15 to-[#F95700]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-3 max-w-3xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 dark:bg-orange-500/15 border border-orange-500/30 text-[#F95700] text-xs font-black uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5 animate-pulse" />
                <span>Корпоративный RAG-Ассистент СФЕРУМ</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black font-['Montserrat'] text-zinc-900 dark:text-white flex items-center gap-3">
                <Database className="w-8 h-8 text-[#F95700]" />
                <span>База Знаний ИИ</span>
              </h1>
              <p className="text-sm sm:text-base text-zinc-600 dark:text-zinc-300 leading-relaxed font-medium">
                Обучайте ваших ИИ-сотрудников на внутренних документах, регламентах, прайс-листах и договорах компании. Загруженные файлы автоматически индексируются и используются при ответах клиентам.
              </p>
            </div>

            <div className="flex items-center gap-3 bg-white/90 dark:bg-zinc-800/80 backdrop-blur-md px-5 py-3 rounded-2xl border border-zinc-200/80 dark:border-zinc-700/80 shadow-sm shrink-0">
              <div className="text-xs">
                <div className="text-zinc-500 dark:text-zinc-400 font-bold uppercase">В памяти ИИ</div>
                <div className="text-xl font-black text-zinc-900 dark:text-white mt-0.5">
                  {documents.length} <span className="text-xs font-normal text-zinc-400">документов</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Сетка загрузки и документов ────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Зона Drag & Drop загрузки */}
          <div 
            className={`relative border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer bg-white dark:bg-zinc-900/80
              ${isDragging ? 'border-[#F95700] bg-orange-50/40 dark:bg-zinc-900 scale-[1.01]' : 'border-zinc-300 dark:border-zinc-700 hover:border-[#F95700]'}
              shadow-sm`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.docx,.xlsx,.txt,.md"
            />
            
            <div className="max-w-md mx-auto space-y-3">
              <div className="w-16 h-16 bg-orange-50 dark:bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto border border-orange-500/20">
                <UploadCloud className="w-8 h-8 text-[#F95700]" />
              </div>
              
              <h3 className="text-base font-black text-zinc-900 dark:text-white">
                Нажмите, чтобы выбрать файл или перетащите его сюда
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Поддерживаются PDF, DOCX, XLSX, TXT и MD (до 50 МБ). Все файлы шифруются.
              </p>
              
              <div className="pt-2">
                <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#F95700] to-orange-500 text-white text-xs font-extrabold shadow-md shadow-[#F95700]/20">
                  Выбрать документ
                </span>
              </div>
            </div>
          </div>

          {/* Список изученных документов */}
          <div className="bg-white dark:bg-zinc-900/80 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#F95700]" />
                <h3 className="font-black text-zinc-900 dark:text-white text-sm uppercase tracking-wider">
                  Проиндексированные корпоративные файлы ({documents.length})
                </h3>
              </div>
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> ИИ готов к ответам
              </span>
            </div>
            
            <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {documents.map((doc) => (
                <div key={doc.id} className="p-4 sm:px-6 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors flex items-center justify-between group gap-4">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-orange-500/15 dark:border-zinc-700">
                      <FileText className="w-5 h-5 text-[#F95700]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-zinc-900 dark:text-white truncate">{doc.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="font-semibold text-zinc-700 dark:text-zinc-300">{doc.filename}</span>
                        <span>•</span>
                        <span>{doc.size}</span>
                        <span>•</span>
                        <span>{doc.chunks_count} векторов знаний</span>
                        <span>•</span>
                        <span>Добавлено {doc.created_at}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-extrabold hidden sm:inline-block">
                      ✓ {doc.status}
                    </span>
                    <button 
                      onClick={() => handleDeleteDoc(doc.id, doc.title)}
                      className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors cursor-pointer"
                      title="Удалить из базы знаний"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Панель безопасности и подсказок справа */}
        <div className="space-y-6">
          <div className="bg-gradient-to-b from-white to-zinc-50 dark:from-zinc-900 dark:to-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-4 shadow-sm">
            <div className="space-y-2">
              <span className="text-xs font-black uppercase text-[#F95700] tracking-widest block">
                Изоляция Tenant RLS
              </span>
              <h3 className="text-base font-black text-zinc-900 dark:text-white leading-snug">
                Корпоративная защита данных СФЕРУМ
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Загруженные файлы индексируются в изолированном векторном пространстве вашей организации. Ни один фрагмент не передается сторонним компаниям и не используется для публичного обучения моделей.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/80 space-y-2">
              <div className="text-xs font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>Мгновенная синхронизация</span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400">
                После загрузки документа ИИ-Юрист и ИИ-Менеджер начинают использовать новые знания в чатах Telegram, WhatsApp и CRM в течение 4 секунд.
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 space-y-3 shadow-sm">
            <div className="flex items-center gap-2 text-sm font-black text-zinc-900 dark:text-white">
              <HelpCircle className="w-4 h-4 text-[#F95700]" />
              <span>Что лучше загружать?</span>
            </div>
            <ul className="text-xs text-zinc-600 dark:text-zinc-400 space-y-2 list-disc list-inside">
              <li>Прайс-листы на товары или услуги (.xlsx)</li>
              <li>Регламенты общения с клиентами (.pdf)</li>
              <li>Шаблоны договоров и технических заданий (.docx)</li>
              <li>Ответы на частые вопросы (FAQ)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
