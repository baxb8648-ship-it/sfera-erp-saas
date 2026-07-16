import React, { useState, useRef } from 'react';
import type { DragEvent } from 'react';
import { UploadCloud, File, Trash2, CheckCircle, RotateCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export const ContactForm: React.FC = () => {
  const [org, setOrg] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  
  // Submission states: 'idle' | 'loading' | 'success'
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'success'>();
  const [loadingText, setLoadingText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quiz-Marketing (Mode 2) States
  const [formMode, setFormMode] = useState<'quiz' | 'simple'>('quiz'); // Default to quiz for maximum conversions
  const [quizStep, setQuizStep] = useState(1);
  const [objectType, setObjectType] = useState('Металлоконструкции зданий');
  const [area, setArea] = useState(1000);
  const [condition, setCondition] = useState('Новый металл / бетон (чистая поверхность)');
  const [email, setEmail] = useState('');

  const getBasePrice = () => {
    switch (objectType) {
      case 'Резервуары и емкости': return 850;
      case 'Металлоконструкции зданий': return 450;
      case 'Мосты и путепроводы': return 750;
      case 'Бетонные полы и гидроизоляция': return 600;
      default: return 500;
    }
  };

  const getMultiplier = () => {
    switch (condition) {
      case 'Новый металл / бетон (чистая поверхность)': return 1.0;
      case 'Старая краска / умеренная ржавчина (Sa 2.0)': return 1.25;
      case 'Сильная коррозия (Sa 2.5 купершлак)': return 1.45;
      default: return 1.0;
    }
  };

  const calculatedPrice = Math.round(area * getBasePrice() * getMultiplier());

  const handleDrag = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const processFiles = (newFiles: FileList) => {
    const fileList: File[] = [];
    for (let i = 0; i < newFiles.length; i++) {
      fileList.push(newFiles[i]);
    }
    setFiles((prev) => [...prev, ...fileList]);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const handleRemoveFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'КБ', 'МБ'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitState('loading');
    
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (formMode === 'quiz') {
      // Labor Illusion loading sequence (Mode 2)
      setLoadingText('Анализируем тип объекта и геометрию...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoadingText('Рассчитываем расход ЛКМ по ГОСТ 9.402...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setLoadingText('Формируем сметное предложение...');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const leadData = {
      name: org,
      phone: phone,
      email: formMode === 'quiz' ? email : null,
      notes: formMode === 'quiz' 
        ? `Предварительный расчет стоимости с квиза: ~ ${calculatedPrice.toLocaleString('ru-RU')} ₽` 
        : message,
      object_name: formMode === 'quiz' ? objectType : null,
      area_sqm: formMode === 'quiz' ? area : null,
      surface_type: formMode === 'quiz' ? condition : null
    };

    try {
      setLoadingText('Регистрация заявки в CRM...');
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/clients/public-lead', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(leadData)
      });
      if (!response.ok) {
        throw new Error(`CRM server returned status ${response.status}`);
      }
      console.log('Lead registered in CRM successfully');
      
      // If simple mode, let's still show a loading mock state for files if any are attached
      if (formMode === 'simple' && files.length > 0) {
        setLoadingText('Передача файлов ТЗ на защищенный сервер...');
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    } catch (err) {
      console.warn('CRM registration failed, falling back to direct Telegram notification:', err);
      // Fallback: Telegram bot direct client notification if bot credentials are set
      if (botToken && chatId) {
        try {
          setLoadingText('Отправка запроса в Telegram...');
          let messageText = '';
          if (formMode === 'quiz') {
            messageText = `🔔 *Новый расчет стоимости АКЗ с квиза!*\n\n🏢 *Организация:* ${org}\n📞 *Телефон:* ${phone}\n✉️ *Email:* ${email || 'Не указан'}\n\n🏗️ *Тип конструкции:* ${objectType}\n📐 *Площадь окраски:* ${area.toLocaleString('ru-RU')} м²\n🔧 *Состояние поверхности:* ${condition}\n💰 *Предварительный расчет:* ~ ${calculatedPrice.toLocaleString('ru-RU')} ₽`;
          } else {
            messageText = `🔔 *Новая заявка с сайта СФЕРУМ!*\n\n🏢 *Организация:* ${org}\n📞 *Телефон:* ${phone}\n\n📝 *Описание объекта:* ${message || 'Не указано'}`;
          }
          
          await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              chat_id: chatId,
              text: messageText,
              parse_mode: 'Markdown',
            }),
          });
        } catch (tgErr) {
          console.error('Direct Telegram notification failed:', tgErr);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    // Direct Telegram file upload in simple mode (always run on the client for convenience if botToken & chatId exist)
    if (formMode === 'simple' && botToken && chatId && files.length > 0) {
      for (let i = 0; i < files.length; i++) {
        try {
          setLoadingText(`Отправка чертежа ${i + 1} из ${files.length} в Telegram...`);
          const formData = new FormData();
          formData.append('chat_id', chatId);
          formData.append('document', files[i]);
          await fetch(`https://api.telegram.org/bot${botToken}/sendDocument`, {
            method: 'POST',
            body: formData,
          });
        } catch (tgDocErr) {
          console.error('File upload to telegram failed:', tgDocErr);
        }
      }
    }

    setSubmitState('success');
    // Trigger premium celebration confetti
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#F95700', '#ffffff', '#27272a']
    });
  };

  const resetForm = () => {
    setOrg('');
    setPhone('');
    setMessage('');
    setFiles([]);
    setQuizStep(1);
    setArea(1000);
    setEmail('');
    setSubmitState('idle');
  };

  return (
    <section id="contacts" className="py-24 bg-bg border-b border-border relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16">
          {/* Left panel info */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <h2 className="text-3xl sm:text-4xl text-text font-black mb-8 uppercase tracking-tight leading-tight">
                Контакты и <br />
                <span className="text-primary">Реквизиты</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-12">
                <div>
                  <p className="text-[10px] text-text-muted uppercase font-black mb-2 tracking-wider">
                    Отдел заказов
                  </p>
                  <a
                    href="tel:+79636006346"
                    className="text-text font-bold block mb-1 hover:text-[#F95700] transition text-xl"
                  >
                    8 963 600 63 46
                  </a>
                  <p className="text-text-muted text-xs font-semibold">spherarus.msk@gmail.com</p>
                </div>
                <div>
                  <p className="text-[10px] text-text-muted uppercase font-black mb-2 tracking-wider">
                    Производственная база
                  </p>
                  <p className="text-text font-bold text-sm uppercase">
                    г. Оренбург, промзона
                  </p>
                  <p className="text-text-muted text-[10px] uppercase font-bold mt-1">
                    Работаем: Оренбург • Самара • Уфа
                  </p>
                </div>
              </div>
            </div>

            {/* Legal details card */}
            <div className="p-6 bg-surface border border-border space-y-3 backdrop-blur-md">
              <p className="text-[10px] text-text-muted uppercase font-black mb-4 tracking-widest">
                Карточка контрагента ООО "СФЕРУМ"
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5 text-[9px] tracking-wider uppercase font-bold text-text-muted">
                <p>
                  <span className="text-text-muted mr-2">ИНН:</span>
                  <span className="text-text">5629021484</span>
                </p>
                <p>
                  <span className="text-text-muted mr-2">КПП:</span>
                  <span className="text-text">562901001</span>
                </p>
                <p className="sm:col-span-2">
                  <span className="text-text-muted mr-2">ОГРН:</span>
                  <span className="text-text">1225600009480</span>
                </p>
                <p className="sm:col-span-2 border-t border-border pt-2 mt-2">
                  <span className="text-text-muted mr-2">Р/С:</span>
                  <span className="text-text font-mono">40702810746000014531</span>
                </p>
                <p className="sm:col-span-2">
                  <span className="text-text-muted mr-2">БАНК:</span>
                  <span className="text-text">Оренбургское отделение N8623 ПАО СБЕРБАНК</span>
                </p>
                <p className="sm:col-span-2">
                  <span className="text-text-muted mr-2">БИК:</span>
                  <span className="text-text">045354601</span>
                </p>
              </div>
            </div>
          </div>

          {/* Right form panel */}
          <div className="lg:col-span-7 relative">
            <div id="calc" className="absolute -top-24"></div>
            <div
              className="bg-surface border border-border p-8 md:p-10 backdrop-blur-md relative overflow-hidden"
              style={{
                clipPath: 'polygon(5% 0, 100% 0, 100% 95%, 95% 100%, 0 100%, 0% 5%)',
              }}
            >
              {submitState === 'loading' && (
                <div className="absolute inset-0 bg-surface/95 backdrop-blur-md z-20 flex flex-col items-center justify-center text-center p-8">
                  <RotateCw className="w-10 h-10 text-primary animate-spin mb-4" />
                  <p className="text-sm font-black text-text uppercase tracking-widest mb-2 font-['Montserrat']">
                    Отправка запроса
                  </p>
                  <p className="text-xs text-text-muted font-bold uppercase tracking-wider animate-pulse">
                    {loadingText}
                  </p>
                </div>
              )}

              {submitState === 'success' && (
                <div className="absolute inset-0 bg-surface z-20 flex flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 rounded-full bg-[#F95700]/10 flex items-center justify-center text-primary mb-6 border border-primary/20">
                    <CheckCircle className="w-10 h-10" />
                  </div>
                  <h3 className="text-2xl text-text font-black uppercase mb-4 tracking-tight font-['Montserrat']">
                    Заявка принята
                  </h3>
                  <p className="text-sm text-text-muted max-w-md leading-relaxed mb-8 font-medium">
                    Спасибо! Данные успешно переданы в сметно-договорной отдел ООО «СФЕРУМ».
                    Наши специалисты подготовят смету и ППР в течение 1 рабочего дня и свяжутся с вами.
                  </p>
                  <button
                    onClick={resetForm}
                    className="px-8 py-4 bg-surface border border-border hover:border-white/30 text-text font-black uppercase text-[10px] tracking-widest transition duration-300 cursor-pointer"
                  >
                    Отправить еще один запрос
                  </button>
                </div>
              )}

              {/* Mode Selector */}
              <div className="flex border-b border-border pb-5 mb-6">
                <button
                  type="button"
                  onClick={() => setFormMode('quiz')}
                  className={`flex-1 pb-3 text-[11px] uppercase tracking-widest font-black transition-all cursor-pointer border-b-2 text-center select-none ${formMode === 'quiz' ? 'border-primary text-primary font-bold' : 'border-transparent text-text-muted hover:text-white'}`}
                >
                  ⚡ Быстрый расчет сметы
                </button>
                <button
                  type="button"
                  onClick={() => setFormMode('simple')}
                  className={`flex-1 pb-3 text-[11px] uppercase tracking-widest font-black transition-all cursor-pointer border-b-2 text-center select-none ${formMode === 'simple' ? 'border-primary text-primary font-bold' : 'border-transparent text-text-muted hover:text-white'}`}
                >
                  📁 Отправить готовое ТЗ
                </button>
              </div>

              {formMode === 'simple' ? (
                <>
                  <p className="text-text font-black mb-6 uppercase tracking-widest text-xs text-left">
                    Запрос расчета стоимости объекта
                  </p>
                  
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-black tracking-widest text-text-muted uppercase">
                          Ваша организация
                        </label>
                        <input
                          type="text"
                          placeholder="ООО, АО, ИП..."
                          required
                          value={org}
                          onChange={(e) => setOrg(e.target.value)}
                          className="p-4 w-full text-sm bg-surface border border-[#3F3F46] focus:outline-none focus:border-primary text-text rounded-none font-medium"
                        />
                      </div>
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-black tracking-widest text-text-muted uppercase">
                          Телефон для связи
                        </label>
                        <input
                          type="tel"
                          placeholder="+7 (___) ___-__-__"
                          required
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="p-4 w-full text-sm bg-surface border border-[#3F3F46] focus:outline-none focus:border-primary text-text rounded-none font-medium"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black tracking-widest text-text-muted uppercase">
                        Описание объекта
                      </label>
                      <textarea
                        rows={4}
                        placeholder="Укажите тип конструкции, площадь, высоту работ, требуемые сроки..."
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        className="p-4 w-full text-sm bg-surface border border-[#3F3F46] focus:outline-none focus:border-primary text-text rounded-none font-medium"
                      ></textarea>
                    </div>

                    {/* Drag and drop upload zone */}
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-black tracking-widest text-text-muted uppercase">
                        Проектная документация (ТЗ, КМ, КМД, Фото)
                      </label>
                      <div
                        onDragEnter={handleDrag}
                        onDragOver={handleDrag}
                        onDragLeave={handleDrag}
                        onDrop={handleDrop}
                        onClick={triggerFileInput}
                        className={`border-2 border-dashed p-6 text-center cursor-pointer transition duration-300 group flex flex-col items-center justify-center gap-2 ${
                          isDragActive
                            ? 'border-primary bg-[#F95700]/5'
                            : 'border-[#3F3F46] hover:border-white/50 bg-surface'
                        }`}
                      >
                        <UploadCloud className="w-8 h-8 text-text-muted group-hover:text-white transition duration-300" />
                        <span className="text-[10px] text-text-muted group-hover:text-white transition uppercase font-black">
                          Перетащите файлы сюда или нажмите для выбора
                        </span>
                        <span className="text-[8px] text-text-muted uppercase font-bold">
                          PDF, DWG, DOCX, JPG, PNG (до 50 Мб)
                        </span>
                        <input
                          type="file"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                          multiple
                          className="hidden"
                        />
                      </div>
                    </div>

                    {/* File list */}
                    {files.length > 0 && (
                      <div className="bg-surface border border-border p-4 space-y-2.5 max-h-48 overflow-y-auto text-left">
                        <p className="text-[8px] text-text-muted font-black tracking-widest uppercase">
                          Список прикрепленных файлов ({files.length})
                        </p>
                        {files.map((file, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between border-b border-border pb-2 last:border-b-0 last:pb-0"
                          >
                            <div className="flex items-center gap-2 overflow-hidden mr-4">
                              <File className="w-4 h-4 text-primary flex-shrink-0" />
                              <span className="text-xs text-text truncate font-medium">{file.name}</span>
                              <span className="text-[9px] text-text-muted font-bold whitespace-nowrap">
                                ({formatFileSize(file.size)})
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveFile(idx)}
                              className="text-text-muted hover:text-red-500 transition cursor-pointer"
                              aria-label="Remove file"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex items-start space-x-3 pt-2 pb-4 text-left">
                      <input
                        type="checkbox"
                        id="agree-152"
                        required
                        className="w-5 h-5 border border-[#3F3F46] text-primary bg-surface focus:ring-0 rounded-none cursor-pointer accent-[#F95700] mt-0.5"
                      />
                      <label htmlFor="agree-152" className="text-[10px] font-bold text-text-muted uppercase tracking-wide cursor-pointer select-none leading-snug">
                        Даю согласие на обработку персональных данных в соответствии с{' '}
                        <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                          Политикой конфиденциальности
                        </a>
                      </label>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-5 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-sm tracking-widest transition duration-300 transform hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                      style={{
                        clipPath: 'polygon(4% 0, 100% 0, 100% 70%, 96% 100%, 0 100%, 0% 30%)',
                      }}
                    >
                      Отправить на расчет сметчику
                    </button>
                  </form>
                </>
              ) : (
                <>
                  {/* Step 1 */}
                  {quizStep === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Шаг 1 из 4: Тип объекта</p>
                        <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: '25%' }} />
                        </div>
                      </div>
                      <h3 className="text-lg text-text font-black uppercase tracking-tight text-left">Какую конструкцию необходимо защитить от коррозии?</h3>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[
                          { name: 'Резервуары и емкости', desc: 'РВС, РГС, баки-аккумуляторы' },
                          { name: 'Металлоконструкции зданий', desc: 'Фермы, колонны, прогоны каркасов' },
                          { name: 'Мосты и путепроводы', desc: 'Эстакады, пролетные строения' },
                          { name: 'Бетонные полы и гидроизоляция', desc: 'Цеха, склады, парковки, лотки' }
                        ].map((item) => (
                          <div
                            key={item.name}
                            onClick={() => setObjectType(item.name)}
                            className={`p-4 border cursor-pointer transition-all duration-300 text-left flex flex-col justify-between h-24 group ${
                              objectType === item.name
                                ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(249,87,0,0.15)]'
                                : 'border-border hover:border-white/30 bg-surface'
                            }`}
                          >
                            <span className={`text-xs font-extrabold uppercase tracking-tight transition-colors ${objectType === item.name ? 'text-primary' : 'text-text group-hover:text-white'}`}>{item.name}</span>
                            <span className="text-[9px] text-text-muted font-semibold uppercase tracking-wider">{item.desc}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={() => setQuizStep(2)}
                          className="px-8 py-4 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-[10px] tracking-widest transition duration-300 cursor-pointer shadow-lg shadow-primary/15"
                        >
                          Далее &rarr;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 2 */}
                  {quizStep === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Шаг 2 из 4: Площадь конструкции</p>
                        <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: '50%' }} />
                        </div>
                      </div>
                      <h3 className="text-lg text-text font-black uppercase tracking-tight text-left">Укажите ориентировочную площадь окраски (м²)</h3>
                      
                      <div className="py-8 px-5 bg-surface/50 border border-border space-y-6 text-left">
                        <div className="flex justify-between items-baseline">
                          <span className="text-xs text-text-muted font-bold uppercase tracking-wider">Площадь работ:</span>
                          <span className="text-3xl font-black text-primary font-mono">{area.toLocaleString('ru-RU')} <span className="text-lg">м²</span></span>
                        </div>
                        
                        <input
                          type="range"
                          min={100}
                          max={50000}
                          step={100}
                          value={area}
                          onChange={(e) => setArea(Number(e.target.value))}
                          className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary"
                        />
                        
                        <div className="flex gap-2 justify-center flex-wrap">
                          {[1000, 3000, 5000, 10000].map((val) => (
                            <button
                              type="button"
                              key={val}
                              onClick={() => setArea(val)}
                              className={`px-3.5 py-1.5 border text-[9px] uppercase font-extrabold tracking-wider transition cursor-pointer ${
                                area === val
                                  ? 'border-primary text-primary bg-primary/5'
                                  : 'border-border text-text-muted hover:text-white hover:border-white/30'
                              }`}
                            >
                              {val.toLocaleString()} м²
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setQuizStep(1)}
                          className="px-6 py-4 border border-border hover:border-white/30 text-text-muted hover:text-white font-black uppercase text-[10px] tracking-widest transition duration-300 cursor-pointer"
                        >
                          &larr; Назад
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuizStep(3)}
                          className="px-8 py-4 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-[10px] tracking-widest transition duration-300 cursor-pointer shadow-lg shadow-primary/15"
                        >
                          Далее &rarr;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 3 */}
                  {quizStep === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Шаг 3 из 4: Состояние поверхности</p>
                        <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: '75%' }} />
                        </div>
                      </div>
                      <h3 className="text-lg text-text font-black uppercase tracking-tight text-left">Каково текущее состояние обрабатываемой поверхности?</h3>
                      
                      <div className="space-y-3">
                        {[
                          { name: 'Новый металл / бетон (чистая поверхность)', desc: 'Не требует глубокой абразивоструйной подготовки, достаточно обеспыливания и обезжиривания' },
                          { name: 'Старая краска / умеренная ржавчина (Sa 2.0)', desc: 'Требуется гидроструйная очистка или механическое/ручное удаление старых слоев ЛКМ' },
                          { name: 'Сильная коррозия (Sa 2.5 купершлак)', desc: 'Необходима полная абразивоструйная очистка Sa 2.5 купершлаком под высоким давлением' }
                        ].map((item) => (
                          <div
                            key={item.name}
                            onClick={() => setCondition(item.name)}
                            className={`p-4 border cursor-pointer transition-all duration-300 text-left flex flex-col gap-1.5 group ${
                              condition === item.name
                                ? 'border-primary bg-primary/5 shadow-[0_0_15px_rgba(249,87,0,0.15)]'
                                : 'border-border hover:border-white/30 bg-surface'
                            }`}
                          >
                            <span className={`text-xs font-extrabold uppercase tracking-tight transition-colors ${condition === item.name ? 'text-primary' : 'text-text group-hover:text-white'}`}>{item.name}</span>
                            <span className="text-[9px] text-text-muted font-medium uppercase tracking-wider leading-snug">{item.desc}</span>
                          </div>
                        ))}
                      </div>
                      
                      <div className="flex justify-between pt-2">
                        <button
                          type="button"
                          onClick={() => setQuizStep(2)}
                          className="px-6 py-4 border border-border hover:border-white/30 text-text-muted hover:text-white font-black uppercase text-[10px] tracking-widest transition duration-300 cursor-pointer"
                        >
                          &larr; Назад
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuizStep(4)}
                          className="px-8 py-4 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-[10px] tracking-widest transition duration-300 cursor-pointer shadow-lg shadow-primary/15"
                        >
                          Далее &rarr;
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4 */}
                  {quizStep === 4 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                      <div className="flex justify-between items-center">
                        <p className="text-[10px] text-text-muted uppercase font-black tracking-widest">Шаг 4 из 4: Получение сметы</p>
                        <div className="h-1.5 w-24 bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: '100%' }} />
                        </div>
                      </div>
                      <h3 className="text-lg text-text font-black uppercase tracking-tight text-left">Подтвердите параметры и укажите контакт для отправки КП</h3>
                      
                      <div className="p-4 bg-surface/50 border border-border text-left space-y-3">
                        <p className="text-[8px] text-text-muted font-black tracking-widest uppercase">Ваш предварительный расчет стоимости АКЗ:</p>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] tracking-wide uppercase font-bold text-text-muted">
                          <p className="truncate" title={objectType}>Объект: <span className="text-text">{objectType}</span></p>
                          <p>Площадь: <span className="text-text">{area} м²</span></p>
                          <p className="col-span-2 leading-relaxed">Состояние: <span className="text-text">{condition}</span></p>
                        </div>
                        <div className="border-t border-[#3F3F46]/60 pt-3 flex justify-between items-baseline">
                          <span className="text-[10px] font-black uppercase tracking-wider text-text">Ориентир сметы:</span>
                          <span className="text-xl font-black text-primary">~ {calculatedPrice.toLocaleString('ru-RU')} ₽</span>
                        </div>
                      </div>

                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-1 text-left">
                          <label className="text-[9px] font-black tracking-widest text-text-muted uppercase">
                            Ваша организация
                          </label>
                          <input
                            type="text"
                            placeholder="ООО, АО, ИП..."
                            required
                            value={org}
                            onChange={(e) => setOrg(e.target.value)}
                            className="p-4 w-full text-sm bg-surface border border-[#3F3F46] focus:outline-none focus:border-primary text-text rounded-none font-medium"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black tracking-widest text-text-muted uppercase">
                              Телефон для связи
                            </label>
                            <input
                              type="tel"
                              placeholder="+7 (___) ___-__-__"
                              required
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              className="p-4 w-full text-sm bg-surface border border-[#3F3F46] focus:outline-none focus:border-primary text-text rounded-none font-medium"
                            />
                          </div>
                          
                          <div className="space-y-1 text-left">
                            <label className="text-[9px] font-black tracking-widest text-text-muted uppercase">
                              Email для сметы
                            </label>
                            <input
                              type="email"
                              placeholder="info@company.ru"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              className="p-4 w-full text-sm bg-surface border border-[#3F3F46] focus:outline-none focus:border-primary text-text rounded-none font-medium"
                            />
                          </div>
                        </div>

                        <div className="flex items-start space-x-3 pt-2 pb-2 text-left">
                          <input
                            type="checkbox"
                            id="agree-quiz"
                            required
                            className="w-5 h-5 border border-[#3F3F46] text-primary bg-surface focus:ring-0 rounded-none cursor-pointer accent-[#F95700] mt-0.5"
                          />
                          <label htmlFor="agree-quiz" className="text-[10px] font-bold text-text-muted uppercase tracking-wide cursor-pointer select-none leading-snug">
                            Даю согласие на обработку персональных данных в соответствии с{' '}
                            <a href="/privacy-policy.html" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                              Политикой конфиденциальности
                            </a>
                          </label>
                        </div>

                        <div className="flex gap-4">
                          <button
                            type="button"
                            onClick={() => setQuizStep(3)}
                            className="px-6 py-4 border border-border hover:border-white/30 text-text-muted hover:text-white font-black uppercase text-[10px] tracking-widest transition duration-300 cursor-pointer"
                          >
                            &larr; Назад
                          </button>
                          <button
                            type="submit"
                            className="flex-1 py-4 bg-primary hover:bg-[#FF7426] text-white font-black uppercase text-xs tracking-widest transition duration-300 cursor-pointer text-center shadow-lg shadow-primary/15"
                            style={{
                              clipPath: 'polygon(4% 0, 100% 0, 100% 70%, 96% 100%, 0 100%, 0% 30%)',
                            }}
                          >
                            Получить расчет стоимости
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
