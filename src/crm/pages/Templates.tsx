import React, { useState, useEffect, useRef } from 'react';
import { Upload, Trash2, FileText, FileCode, Search, HelpCircle, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { apiClient } from '../../api/client';

interface Template {
  id: number;
  name: string;
  doc_type: string;
  file_path: string;
  created_at: string;
}

export const Templates: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Modal for Placeholders info
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get<Template[]>('/templates/');
      if (data) {
        setTemplates(data);
      }
    } catch (e) {
      console.error('Failed to fetch templates', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.docx')) {
      alert("Пожалуйста, загрузите файл формата .docx");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsLoading(true);
      await apiClient.post('/templates/upload', formData);
      fetchTemplates();
    } catch (error) {
      console.error(error);
      alert('Ошибка при загрузке шаблона');
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Удалить этот шаблон?')) return;

    try {
      await apiClient.delete(`/templates/${id}`);
      fetchTemplates();
    } catch (e) {
      console.error('Failed to delete template', e);
    }
  };

  const filteredTemplates = templates.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Шаблоны | СФЕРУМ</title>
      </Helmet>
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex flex-1 items-center space-x-3 bg-gray-50 dark:bg-zinc-800/50 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-800 focus-within:ring-2 focus-within:ring-[#F95700]/20 focus-within:border-[#F95700] transition-all">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Поиск по названию шаблона..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm text-gray-900 dark:text-zinc-200"
          />
        </div>

        <button
          onClick={() => setIsHelpOpen(true)}
          className="active:scale-95 transition-all flex items-center justify-center bg-indigo-50 text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-indigo-100 shadow-sm"
        >
          <HelpCircle className="w-4 h-4 mr-2" />
          Справочник переменных
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload Area */}
        <div className="lg:col-span-1">
          <div 
            className={`relative bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border-2 border-dashed p-8 flex flex-col items-center justify-center text-center transition-all ${
              dragActive ? 'border-[#F95700] bg-orange-50/50' : 'border-gray-200 dark:border-zinc-800 hover:border-[#F95700]/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-orange-50 text-[#F95700] rounded-2xl flex items-center justify-center mb-4 shadow-inner">
              <FileCode className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100 mb-2">Загрузите шаблон</h3>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-6">
              Перетащите сюда ваш .docx файл с расставленными переменными
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx"
              onChange={handleChange}
              className="hidden"
              id="template-upload"
            />
            <label
              htmlFor="template-upload"
              className="cursor-pointer bg-[#1a1a1a] text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-black transition-colors active:scale-95 flex items-center shadow-md shadow-black/10"
            >
              <Upload className="w-4 h-4 mr-2" />
              Выбрать файл
            </label>
          </div>
        </div>

        {/* Templates List */}
        <div className="lg:col-span-2">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden h-full">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 flex items-center justify-between">
              <h3 className="font-bold font-['Montserrat'] text-gray-900 dark:text-zinc-200">Мои шаблоны</h3>
              <span className="bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 px-2 py-1 rounded-md text-xs font-bold">{templates.length}</span>
            </div>
            
            {isLoading ? (
              <div className="flex justify-center items-center py-20">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F95700]" />
              </div>
            ) : filteredTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <FileText className="w-12 h-12 mb-3 opacity-50" />
                <p className="text-sm">Нет загруженных шаблонов</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-zinc-800">
                {filteredTemplates.map(template => (
                  <li key={template.id} className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 transition-colors flex items-center justify-between group">
                    <div className="flex items-center space-x-4">
                      <div className={`p-3 rounded-xl ${
                        template.file_path === 'system_default'
                          ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400'
                          : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400'
                      }`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-[#1a1a1a] dark:text-zinc-100 text-sm">{template.name}</h4>
                          {template.file_path === 'system_default' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300">
                              ⭐️ Стартовый шаблон (ГОСТ)
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
                              Пользовательский .docx
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                          {template.file_path === 'system_default'
                            ? 'Предустановлен системой СФЕРУМ'
                            : `Загружен: ${new Date(template.created_at).toLocaleDateString('ru-RU')}`}
                        </p>
                      </div>
                    </div>
                    {template.file_path !== 'system_default' && (
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Placeholders Help Modal */}
      {isHelpOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 transition-all">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-2xl border border-gray-100 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50 flex justify-between items-center shrink-0">
              <h3 className="text-lg font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100 flex items-center">
                <FileCode className="w-5 h-5 mr-2 text-indigo-500" />
                Переменные для .docx
              </h3>
              <button
                onClick={() => setIsHelpOpen(false)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mb-6">
                <p className="text-sm text-indigo-900">
                  Вставляйте эти переменные прямо в текст вашего Word-документа. При генерации система автоматически заменит их на реальные данные клиента или объекта.
                </p>
              </div>

              <div className="space-y-6">
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-zinc-200 mb-3 border-b border-gray-100 dark:border-zinc-800 pb-2">О вашей компании</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_name }}`}</code> <span>Название</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_legal_name }}`}</code> <span>Юр. название</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_inn }}`}</code> <span>ИНН</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_kpp }}`}</code> <span>КПП</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_director }}`}</code> <span>Директор</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_address }}`}</code> <span>Адрес</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_phone }}`}</code> <span>Телефон</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_email }}`}</code> <span>Email</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_bank_name }}`}</code> <span>Название банка</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_rs }}`}</code> <span>Расчетный счет</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_ks }}`}</code> <span>Корр. счет</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ company_bik }}`}</code> <span>БИК</span></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 dark:text-zinc-200 mb-3 border-b border-gray-100 dark:border-zinc-800 pb-2">О клиенте</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_name }}`}</code> <span>Название</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_inn }}`}</code> <span>ИНН</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_kpp }}`}</code> <span>КПП</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_contact }}`}</code> <span>Конт. лицо</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_phone }}`}</code> <span>Телефон</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_email }}`}</code> <span>Email</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_address }}`}</code> <span>Адрес</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_bank_name }}`}</code> <span>Название банка</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_rs }}`}</code> <span>Расчетный счет</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_ks }}`}</code> <span>Корр. счет</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-blue-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ client_bik }}`}</code> <span>БИК</span></div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-gray-900 dark:text-zinc-200 mb-3 border-b border-gray-100 dark:border-zinc-800 pb-2">Об объекте</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ object_name }}`}</code> <span>Название объекта</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ object_area }}`}</code> <span>Площадь (кв.м)</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-emerald-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ object_surface }}`}</code> <span>Тип поверхности</span></div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-zinc-200 mb-3 border-b border-gray-100 dark:border-zinc-800 pb-2">Системные</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-amber-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ current_date }}`}</code> <span>Текущая дата</span></div>
                    <div className="flex items-center space-x-2"><code className="bg-gray-100 dark:bg-zinc-800 text-amber-600 px-1.5 py-0.5 rounded font-mono text-xs">{`{{ doc_number }}`}</code> <span>Номер документа</span></div>
                  </div>
                </div>

              </div>
            </div>
            
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end shrink-0">
              <button
                onClick={() => setIsHelpOpen(false)}
                className="px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-200 font-bold rounded-xl transition-colors active:scale-95"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
