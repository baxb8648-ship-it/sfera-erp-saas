import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Globe, Download, Save, Info, Settings, CreditCard, Mail, Trash2, Upload, File, RefreshCw, CheckCircle, AlertCircle, Search, Plus, Loader2, FileText } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';
import { Templates as DocxTemplates } from './Templates';
import { PresentationDeck } from './PresentationDeck';

interface SettingsData {
  company_name: string;
  company_subtitle: string;
  company_legal_name: string;
  company_inn: string;
  company_kpp: string;
  company_address: string;
  company_phone: string;
  company_email: string;
  company_website: string;
  company_website_url: string;
  company_regions: string;
  company_director: string;
  contract_template: string;
  company_bank_name: string;
  company_bik: string;
  company_rs: string;
  company_ks: string;
  company_bank_name_materials: string;
  company_bik_materials: string;
  company_rs_materials: string;
  company_ks_materials: string;
  smtp_host?: string;
  smtp_port?: string;
  smtp_user?: string;
  smtp_password?: string;
  smtp_use_ssl?: string;
  email_template_contract?: string;
  email_template_act?: string;
  email_template_kp?: string;
  email_template_invoice?: string;
  email_template_other?: string;
  telegram_bot_token?: string;
  telegram_channel_id?: string;
}

const downloadDocumentFile = async (docId: number, docName: string) => {
  const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const url = `${baseUrl}/documents/download/${docId}`;
  try {
    const headers: Record<string, string> = {
      'ngrok-skip-browser-warning': '69420'
    };
    
    const response = await fetch(url, { headers });
    if (response.ok) {
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      
      const contentType = response.headers.get('content-type') || '';
      const isViewable = contentType.includes('application/pdf') || contentType.startsWith('image/');
      
      // Детекция мобильного устройства (включая iPad на iOS 13+)
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                       (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      
      if (isViewable && !isMobile) {
        window.open(downloadUrl, '_blank');
      } else {
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const disposition = response.headers.get('content-disposition');
        let filename = docName;
        if (disposition && disposition.includes('filename=')) {
          const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
          if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1]);
          }
        }
        
        // Если это PDF, проверяем наличие расширения .pdf
        if (contentType.includes('application/pdf') && !filename.toLowerCase().endsWith('.pdf')) {
          filename = filename ? `${filename}.pdf` : `document_${docId}.pdf`;
        }
        
        link.download = filename || `document_${docId}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      setTimeout(() => {
        window.URL.revokeObjectURL(downloadUrl);
      }, 5000);
    } else {
      alert("Не удалось скачать документ.");
    }
  } catch (e) {
    console.error(e);
    alert("Сетевая ошибка при скачивании");
  }
};

export const TemplatesAndContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'details' | 'docx_templates' | 'business_card' | 'documents' | 'email_templates' | 'pitch_deck'>('details');
  const [settings, setSettings] = useState<SettingsData>({
    company_name: '',
    company_subtitle: '',
    company_legal_name: '',
    company_inn: '',
    company_kpp: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    company_website: '',
    company_website_url: '',
    company_regions: '',
    company_director: '',
    contract_template: '',
    company_bank_name: '',
    company_bik: '',
    company_rs: '',
    company_ks: '',
    company_bank_name_materials: '',
    company_bik_materials: '',
    company_rs_materials: '',
    company_ks_materials: '',
    smtp_host: '',
    smtp_port: '',
    smtp_user: '',
    smtp_password: '',
    smtp_use_ssl: '1',
    email_template_contract: '',
    email_template_act: '',
    email_template_kp: '',
    email_template_invoice: '',
    email_template_other: '',
    telegram_bot_token: '',
    telegram_channel_id: ''
  });

  // SMTP settings test

  // Document registry state
  const [documents, setDocuments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [objects, setObjects] = useState<any[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClient, setFilterClient] = useState('');
  const [filterObject, setFilterObject] = useState('');
  const [filterDocType, setFilterDocType] = useState('all');
  const [filterSource, setFilterSource] = useState('all');

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadClientId, setUploadClientId] = useState('');
  const [uploadObjectId, setUploadObjectId] = useState('');
  const [uploadDocType, setUploadDocType] = useState('other');
  const [uploadName, setUploadName] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // AI Knowledge Base (RAG) upload state
  const [isAiUploadModalOpen, setIsAiUploadModalOpen] = useState(false);
  const [aiUploadTitle, setAiUploadTitle] = useState('');
  const [aiUploadCategory, setAiUploadCategory] = useState('tech');
  const [aiUploadFile, setAiUploadFile] = useState<File | null>(null);
  const [isAiUploading, setIsAiUploading] = useState(false);
  const [aiUploadResult, setAiUploadResult] = useState<{status: string; chunks_created: number; vectors_upserted: number; message?: string} | null>(null);

  // Send Email modal state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailDocId, setEmailDocId] = useState<number | null>(null);
  const [emailDocName, setEmailDocName] = useState('');
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState('');

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [isLookingUpINN, setIsLookingUpINN] = useState(false);

  const handleLookupCompanyINN = async () => {
    const inn = settings.company_inn.trim();
    if (!inn || !/^\d{10}$|^\d{12}$/.test(inn)) {
      alert("Введите корректный ИНН (10 или 12 цифр)");
      return;
    }
    setIsLookingUpINN(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/clients/lookup-inn/${inn}`);
      if (response.ok) {
        const data = await response.json();
        setSettings(prev => ({
          ...prev,
          company_name: data.name ? data.name.replace(/^ООО\s+|^АО\s+|^ПАО\s+/i, '').replace(/["']/g, '') : prev.company_name,
          company_legal_name: data.name || prev.company_legal_name,
          company_kpp: data.kpp || prev.company_kpp,
          company_address: data.legal_address || prev.company_address,
          company_director: data.contact_person || prev.company_director,
          company_bank_name: data.bank_name || prev.company_bank_name,
          company_bik: data.bik || prev.company_bik,
          company_rs: data.rs || prev.company_rs,
          company_ks: data.ks || prev.company_ks,
        }));
        setMessage("Реквизиты успешно заполнены по данным ФНС / DaData!");
        setTimeout(() => setMessage(''), 4000);
      } else {
        const err = await response.json();
        alert(err.detail || "Не удалось найти реквизиты по ИНН");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при поиске по ИНН");
    } finally {
      setIsLookingUpINN(false);
    }
  };

  // Business Card States
  const [isFlipped, setIsFlipped] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'orange'>('dark');
  const [layoutTemplate, setLayoutTemplate] = useState<'classic' | 'minimal' | 'grid' | 'qr'>('classic');
  const [useTexture, setUseTexture] = useState<boolean>(true);
  const [qrCodeSvgPath, setQrCodeSvgPath] = useState<string>('');
  const [qrCodeSvgSize, setQrCodeSvgSize] = useState<number>(29);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  // Local overrides for card details (in case the user wants to customize business card details separately)
  const [cardName, setCardName] = useState('');
  const [cardTitle, setCardTitle] = useState('Генеральный директор');

  useEffect(() => {
    fetchSettings();
    fetchOrganizations();
  }, []);

  useEffect(() => {
    if (activeTab === 'documents') {
      fetchDocuments();
      fetchClients();
      fetchObjects();
    }
  }, [activeTab]);

  const fetchDocuments = async () => {
    setIsLoadingDocs(true);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/documents/', {
        headers: {
        }
      });
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      }
    } catch (e) {
      console.error("Failed to load documents", e);
    } finally {
      setIsLoadingDocs(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/clients/', {
        headers: {
        }
      });
      if (response.ok) {
        const data = await response.json();
        setClients(data);
      }
    } catch (e) {
      console.error("Failed to load clients", e);
    }
  };

  const fetchObjects = async () => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/objects/', {
        headers: {
        }
      });
      if (response.ok) {
        const data = await response.json();
        setObjects(data);
      }
    } catch (e) {
      console.error("Failed to load objects", e);
    }
  };

  const handleUploadDocumentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) {
      alert("Выберите файл для загрузки");
      return;
    }
    if (!uploadClientId) {
      alert("Выберите клиента");
      return;
    }
    setIsUploading(true);
    const formData = new FormData();
    formData.append('client_id', uploadClientId);
    if (uploadObjectId) {
      formData.append('object_id', uploadObjectId);
    }
    formData.append('doc_type', uploadDocType);
    formData.append('name', uploadName || uploadFile.name);
    formData.append('file', uploadFile);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/documents/upload', {
        method: 'POST',
        headers: {
        },
        body: formData
      });
      if (response.ok) {
        setMessage("Скан-копия успешно загружена!");
        setIsUploadModalOpen(false);
        setUploadClientId('');
        setUploadObjectId('');
        setUploadDocType('other');
        setUploadName('');
        setUploadFile(null);
        fetchDocuments();
        setTimeout(() => setMessage(''), 3000);
      } else {
        const err = await response.json();
        alert(err.detail || "Ошибка при загрузке документа");
      }
    } catch (error) {
      console.error(error);
      alert("Сетевая ошибка при загрузке документа");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAiUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiUploadFile) {
      alert("Выберите файл для загрузки в базу знаний");
      return;
    }
    setIsAiUploading(true);
    setAiUploadResult(null);
    const formData = new FormData();
    formData.append('file', aiUploadFile);
    if (aiUploadTitle) {
      formData.append('title', aiUploadTitle);
    }
    formData.append('category', aiUploadCategory);

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/ai/index-file', {
        method: 'POST',
        headers: {},
        body: formData
      });
      if (response.ok) {
        const resData = await response.json();
        setAiUploadResult(resData);
        setMessage(`🤖 Документ успешно проиндексирован! (Чанков: ${resData.chunks_created})`);
        setAiUploadTitle('');
        setAiUploadFile(null);
        setTimeout(() => {
          setIsAiUploadModalOpen(false);
          setAiUploadResult(null);
          setMessage('');
        }, 4000);
      } else {
        const err = await response.json();
        alert(err.detail || "Ошибка индексации в векторную базу данных");
      }
    } catch (error) {
      console.error("AI Upload Error:", error);
      alert("Сетевая ошибка при загрузке в Pinecone");
    } finally {
      setIsAiUploading(false);
    }
  };

  const handleDeleteDoc = async (id: number) => {
    if (!window.confirm("Вы уверены, что хотите удалить этот документ? Он также будет удален с диска.")) {
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/documents/${id}`, {
        method: 'DELETE',
        headers: {
        }
      });
      if (response.ok) {
        setMessage("Документ успешно удален!");
        fetchDocuments();
        setTimeout(() => setMessage(''), 3000);
      } else {
        alert("Ошибка при удалении документа");
      }
    } catch (error) {
      console.error(error);
      alert("Сетевая ошибка при удалении документа");
    }
  };

  const handleOpenEmailModal = (doc: any) => {
    const matchedClient = clients.find(c => c.id === doc.client_id);
    const clientEmail = matchedClient ? matchedClient.email : '';
    
    // Determine the template based on doc_type
    let template = '';
    if (doc.doc_type === 'contract') {
      template = settings.email_template_contract || '';
    } else if (doc.doc_type === 'act') {
      template = settings.email_template_act || '';
    } else if (doc.doc_type === 'kp') {
      template = settings.email_template_kp || '';
    } else if (doc.doc_type === 'invoice') {
      template = settings.email_template_invoice || '';
    } else {
      template = settings.email_template_other || '';
    }
    
    // Find object name
    const matchedObject = objects.find(o => o.id === doc.object_id);
    const objectName = matchedObject ? matchedObject.name : 'Без объекта';
    
    // Resolve placeholders
    const contactName = (matchedClient && matchedClient.contact_person) ? matchedClient.contact_person : 'Уважаемый партнер';
    const repText = template
      .replace(/\{\{client_name\}\}/g, matchedClient ? matchedClient.name : '')
      .replace(/\{\{client_contact\}\}/g, contactName)
      .replace(/\{\{doc_name\}\}/g, doc.name || '')
      .replace(/\{\{object_name\}\}/g, objectName)
      .replace(/\{\{company_name\}\}/g, settings.company_name || 'СФЕРА')
      .replace(/\{\{company_phone\}\}/g, settings.company_phone || '');

    setEmailDocId(doc.id);
    setEmailDocName(doc.name);
    setEmailRecipient(clientEmail || '');
    setEmailSubject(doc.name || 'Документ от СФЕРА');
    setEmailBody(repText);
    setEmailSuccess(null);
    setEmailError('');
    setIsEmailModalOpen(true);
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailDocId) return;
    if (!emailRecipient) {
      alert("Пожалуйста, заполните email получателя");
      return;
    }
    setIsSendingEmail(true);
    setEmailError('');
    setEmailSuccess(null);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/documents/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          doc_id: emailDocId,
          recipient_email: emailRecipient,
          subject: emailSubject,
          body: emailBody
        })
      });
      const data = await response.json();
      if (response.ok) {
        setEmailSuccess(true);
        setMessage("Документ успешно отправлен клиенту на почту!");
        setTimeout(() => {
          setIsEmailModalOpen(false);
          setMessage('');
        }, 2000);
      } else {
        setEmailError(data.detail || "Не удалось отправить письмо");
      }
    } catch (e) {
      console.error(e);
      setEmailError("Сетевая ошибка при отправке почты");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Update card overrides when settings load
  useEffect(() => {
    if (settings.company_director) {
      setCardName(settings.company_director);
    }
  }, [settings.company_director]);

  const fetchSettings = async () => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Failed to load settings", e);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/organizations', {
        headers: {
        }
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
        const active = data.find((org: any) => org.is_active === 1);
        if (active) {
          setSelectedOrgId(active.id);
        }
      }
    } catch (e) {
      console.error("Failed to load organizations", e);
    }
  };

  const handleSwitchOrganization = async (orgId: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/settings/organizations/${orgId}/activate`, {
        method: 'POST',
        headers: {
        }
      });
      if (response.ok) {
        setSelectedOrgId(orgId);
        await fetchOrganizations();
        await fetchSettings();
        setMessage('Организация успешно переключена!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e) {
      console.error("Failed to activate organization", e);
    }
  };

  const handleCreateOrganization = async () => {
    const newOrgPayload = {
      name: "Новая организация",
      subtitle: "Промышленная группа",
      legal_name: "ООО \"Новая организация\"",
      inn: "",
      kpp: "",
      address: "",
      phone: "",
      email: "",
      website: "сайт.рф",
      website_url: "",
      regions: "Оренбург",
      director: "Генеральный директор",
      bank_name: "",
      bik: "",
      rs: "",
      ks: "",
      bank_name_materials: "",
      bik_materials: "",
      rs_materials: "",
      ks_materials: ""
    };
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newOrgPayload)
      });
      if (response.ok) {
        const created = await response.json();
        await fetchOrganizations();
        await handleSwitchOrganization(created.id);
        setMessage('Создана новая организация!');
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (e) {
      console.error("Failed to create organization", e);
    }
  };

  const handleDeleteOrganization = async (orgId: number) => {
    if (organizations.length <= 1) {
      alert("Нельзя удалить единственную организацию");
      return;
    }
    if (!window.confirm("Вы уверены, что хотите удалить эту организацию?")) {
      return;
    }
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/settings/organizations/${orgId}`, {
        method: 'DELETE',
        headers: {
        }
      });
      if (response.ok) {
        await fetchOrganizations();
        await fetchSettings();
        setMessage('Организация удалена!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        const err = await response.json();
        alert(err.detail || "Ошибка удаления");
      }
    } catch (e) {
      console.error("Failed to delete organization", e);
    }
  };

  const handleSaveSettings = async (updatedData: Partial<SettingsData>) => {
    setIsSaving(true);
    setMessage('');
    const newSettings = { ...settings, ...updatedData };
    
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings)
      });
      
      if (response.ok) {
        setSettings(newSettings);
        await fetchOrganizations();
        setMessage('Настройки сохранены успешно!');
        setTimeout(() => setMessage(''), 3000);
      } else {
        alert("Ошибка при сохранении настроек");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при сохранении");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateDefaultTemplates = async () => {
    const orgName = settings.company_name || 'Ваша Компания';
    const director = settings.company_director || 'Генеральный директор';
    const generatedTemplates: Partial<SettingsData> = {
      email_template_contract: `Здравствуйте, {{client_contact}}!\n\nНаправляем вам договор по объекту "{{object_name}}".\nПросьба ознакомиться, подписать и направить ответным письмом скан-копию.\n\nС уважением,\n${orgName}\nТел.: {{company_phone}}`,
      email_template_act: `Здравствуйте, {{client_contact}}!\n\nНаправляем вам Акт выполненных работ "{{doc_name}}" по объекту "{{object_name}}".\nПросьба подписать и вернуть наш экземпляр.\n\nС уважением,\n${orgName}\nТел.: {{company_phone}}`,
      email_template_kp: `Уважаемый(ая) {{client_contact}}!\n\nБлагодарим за обращение. Направляем коммерческое предложение "{{doc_name}}" от компании ${orgName}.\nГотовы ответить на любые вопросы по расчёту и срокам.\n\nС уважением,\n${director}\n${orgName}`,
      email_template_invoice: `Здравствуйте, {{client_contact}}!\n\nВо вложении счёт на оплату "{{doc_name}}" по объекту "{{object_name}}".\nПросьба сообщить после совершения платежа для оперативной отгрузки.\n\nРеквизиты организации: ${orgName}, ИНН ${settings.company_inn || ''}\nТел.: {{company_phone}}`,
      email_template_other: `Здравствуйте, {{client_contact}}!\n\nНаправляем вам документ "{{doc_name}}" по объекту "{{object_name}}".\n\nС уважением,\n${orgName}`
    };
    await handleSaveSettings(generatedTemplates);
    setMessage('✨ Персональный стартовый пакет шаблонов организации успешно сгенерирован!');
    setTimeout(() => setMessage(''), 4000);
  };

  // QR Code generation for Business Card (offline)
  useEffect(() => {
    const generateQrCode = async () => {
      const url = window.location.origin + '/c';
      try {
        const qrSvg = await QRCode.toString(url, { type: 'svg', margin: 0 });
        const viewBoxMatch = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
        const size = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 29;
        const pathMatches = Array.from(qrSvg.matchAll(/d="([^"]+)"/g));
        const pathData = pathMatches.length > 1 ? pathMatches[1][1] : (pathMatches.length > 0 ? pathMatches[0][1] : '');
        
        setQrCodeSvgSize(size);
        setQrCodeSvgPath(pathData);

        // Generate base64 Data URL for HTML previews
        const dataUrl = await QRCode.toDataURL(url, {
          width: 200,
          margin: 1,
          color: {
            dark: '#0f0f11',
            light: '#ffffff'
          }
        });
        setQrCodeDataUrl(dataUrl);
      } catch (err) {
        console.error('Failed to generate local QR Code:', err);
      }
    };
    generateQrCode();
  }, [settings.company_website_url]);

  // Card themes configuration
  const getThemeColors = (currentTheme: 'dark' | 'light' | 'orange') => {
    switch (currentTheme) {
      case 'light':
        return { bgColor: '#ffffff', textColor: '#18181b', accentColor: '#F95700' };
      case 'orange':
        return { bgColor: '#F95700', textColor: '#ffffff', accentColor: '#0F0F11' };
      case 'dark':
      default:
        return { bgColor: '#0F0F11', textColor: '#ffffff', accentColor: '#F95700' };
    }
  };

  const { bgColor, textColor, accentColor } = getThemeColors(theme);
  const texture = useTexture ? 'stripes' : 'none';

  // SVG front/back content generators
  const splitTagline = (text: string): string[] => {
    const cleanText = text.trim();
    if (cleanText.toUpperCase() === 'ПРОМЫШЛЕННАЯ ЗАЩИТА И ИЗОЛЯЦИЯ') {
      return ['ПРОМЫШЛЕННАЯ ЗАЩИТА И', 'ИЗОЛЯЦИЯ'];
    }
    if (cleanText.length <= 20) return [cleanText, ''];
    const words = cleanText.split(' ');
    if (words.length <= 1) return [cleanText, ''];
    let bestSplitIndex = 1;
    let minDiff = Infinity;
    for (let i = 1; i < words.length; i++) {
      const line1 = words.slice(0, i).join(' ');
      const line2 = words.slice(i).join(' ');
      const diff = Math.abs(line1.length - line2.length);
      if (diff < minDiff) {
        minDiff = diff;
        bestSplitIndex = i;
      }
    }
    return [
      words.slice(0, bestSplitIndex).join(' '),
      words.slice(bestSplitIndex).join(' ')
    ];
  };

  // SVG front/back content generators
  const getSvgFrontContent = () => {
    const slogan = settings.company_subtitle || "ПРОМЫШЛЕННАЯ ГРУППА";
    const emailStr = settings.company_email || "info@sphera-akz.ru";
    
    return `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="90mm" height="50mm" viewBox="0 0 90 50">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@900&amp;family=Inter:wght@700;900&amp;display=swap');
    </style>
    <clipPath id="card-clip">
      <rect x="0.5" y="0.5" width="89" height="49" rx="3.5" />
    </clipPath>
    ${texture === 'stripes' ? `
    <pattern id="stripes" width="1.66" height="1.66" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
      <line x1="0" y1="0" x2="0" y2="1.66" stroke="${accentColor}" stroke-width="0.12" opacity="0.25" />
    </pattern>
    ` : ''}
  </defs>
  
  <rect x="0.5" y="0.5" width="89" height="49" rx="3.5" fill="${bgColor}" stroke="${textColor}15" stroke-width="0.5" />
  ${texture !== 'none' ? `<rect x="0.5" y="0.5" width="89" height="49" rx="3.5" fill="url(#${texture})" clip-path="url(#card-clip)" />` : ''}
  
  ${layoutTemplate === 'classic' ? `
  <line x1="7" y1="34" x2="83" y2="34" stroke="${textColor}15" stroke-width="0.2" />
  <text x="8" y="11" font-family="Montserrat, sans-serif" font-weight="900" font-size="4.8" fill="${textColor}" letter-spacing="-0.2">${settings.company_name.toUpperCase()}</text>
  <text x="8" y="14.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${accentColor}" letter-spacing="0.8">${slogan.toUpperCase()}</text>
  
  <rect x="66" y="6" width="17" height="3.5" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="0.25" />
  <text x="74.5" y="7.75" font-family="Inter, sans-serif" font-weight="700" font-size="1.1" fill="${textColor}" letter-spacing="0.2" text-anchor="middle" dominant-baseline="central">АКЗ • ИЗОЛЯЦИЯ</text>
  
  <circle cx="8" cy="22.2" r="0.45" fill="${accentColor}" />
  <text x="10" y="22.7" font-family="Inter, sans-serif" font-weight="700" font-size="1.5" fill="${textColor}a0" letter-spacing="0.4">${cardName.toUpperCase()}</text>
  <text x="8" y="27.8" font-family="Montserrat, sans-serif" font-weight="900" font-size="2.6" fill="${textColor}" letter-spacing="-0.1">${cardTitle.toUpperCase()}</text>
  
  <g transform="translate(8, 36.5)">
    <g transform="scale(0.09)" stroke="${accentColor}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </g>
    <text x="3.0" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}" letter-spacing="0.1">${settings.company_phone}</text>
  </g>
  <g transform="translate(8, 41.0)">
    <g transform="scale(0.09)" stroke="${accentColor}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="3.0" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.5" fill="${textColor}a0" letter-spacing="0.1">${emailStr}</text>
  </g>
  
  <g transform="translate(82, 36.5)">
    <g transform="translate(-23, 0) scale(0.09)" stroke="${accentColor}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="0" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.8" fill="${textColor}" letter-spacing="0.05em" text-anchor="end">${settings.company_website.toUpperCase()}</text>
  </g>
  <text x="82.0" y="42.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.3" fill="${textColor}a0" letter-spacing="0.2" text-anchor="end">${settings.company_regions.toUpperCase()}</text>
  ` : layoutTemplate === 'minimal' ? `
  <rect x="35.5" y="4.5" width="19" height="3" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="0.2" />
  <text x="45" y="6.6" font-family="Inter, sans-serif" font-weight="700" font-size="1.0" fill="${textColor}" letter-spacing="0.2" text-anchor="middle" dominant-baseline="central">АКЗ • ИЗОЛЯЦИЯ</text>
  <text x="45" y="14" font-family="Montserrat, sans-serif" font-weight="900" font-size="4.2" fill="${textColor}" text-anchor="middle" letter-spacing="-0.1">${settings.company_name.toUpperCase()}</text>
  <text x="45" y="17.2" font-family="Inter, sans-serif" font-weight="700" font-size="1.2" fill="${accentColor}" letter-spacing="0.8" text-anchor="middle">${slogan.toUpperCase()}</text>
  
  <line x1="32" y1="20" x2="58" y2="20" stroke="${textColor}20" stroke-width="0.2" />
  <text x="45" y="24" font-family="Inter, sans-serif" font-weight="700" font-size="1.3" fill="${textColor}a0" letter-spacing="0.3" text-anchor="middle">${cardName.toUpperCase()}</text>
  <text x="45" y="29.5" font-family="Montserrat, sans-serif" font-weight="900" font-size="2.5" fill="${textColor}" letter-spacing="-0.1" text-anchor="middle">${cardTitle.toUpperCase()}</text>
  <line x1="15" y1="34" x2="75" y2="34" stroke="${textColor}10" stroke-width="0.15" />
  
  <text x="45" y="38" font-family="Inter, sans-serif" font-weight="700" font-size="1.8" fill="${textColor}" letter-spacing="0.1" text-anchor="middle">${settings.company_phone}   •   ${emailStr}</text>
  <text x="45" y="42.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${textColor}" letter-spacing="0.4" text-anchor="middle"><tspan fill="${accentColor}">${settings.company_website.toUpperCase()}</tspan>   •   ${settings.company_regions.toUpperCase()}</text>
  ` : layoutTemplate === 'grid' ? `
  <line x1="32" y1="0.5" x2="32" y2="47.5" stroke="${textColor}15" stroke-width="0.3" />
  
  <!-- Left Panel -->
  <text x="16" y="14" font-family="Montserrat, sans-serif" font-weight="900" font-size="3.8" fill="${textColor}" text-anchor="middle" letter-spacing="-0.2">${settings.company_name.toUpperCase()}</text>
  <text x="16" y="18.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.2" fill="${accentColor}" letter-spacing="0.5" text-anchor="middle">${slogan.toUpperCase()}</text>
  
  <line x1="4" y1="24" x2="28" y2="24" stroke="${textColor}15" stroke-width="0.2" />
  
  <rect x="5" y="32" width="22" height="4" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="0.25" />
  <text x="16" y="34.2" font-family="Inter, sans-serif" font-weight="700" font-size="1.0" fill="${textColor}" letter-spacing="0.1" text-anchor="middle" dominant-baseline="central">АКЗ • ИЗОЛЯЦИЯ</text>
  
  <!-- Right Panel -->
  <text x="38" y="11" font-family="Inter, sans-serif" font-weight="700" font-size="1.5" fill="${textColor}a0" letter-spacing="0.4">${cardName.toUpperCase()}</text>
  ${(() => {
    const [l1, l2] = splitTagline(cardTitle);
    const fs = 2.6;
    if (l2) {
      return `<text x="38" y="15.8" font-family="Montserrat, sans-serif" font-weight="900" font-size="${fs}" fill="${textColor}" letter-spacing="-0.1">${l1.toUpperCase()}</text>
  <text x="38" y="19.8" font-family="Montserrat, sans-serif" font-weight="900" font-size="${fs}" fill="${textColor}" letter-spacing="-0.1">${l2.toUpperCase()}</text>`;
    } else {
      return `<text x="38" y="17.5" font-family="Montserrat, sans-serif" font-weight="900" font-size="${fs}" fill="${textColor}" letter-spacing="-0.1">${l1.toUpperCase()}</text>`;
    }
  })()}
  
  <line x1="35" y1="24" x2="85" y2="24" stroke="${textColor}15" stroke-width="0.2" />
  
  <g transform="translate(38, 27.5)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </g>
    <text x="2.5" y="1.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}">${settings.company_phone}</text>
  </g>
  
  <g transform="translate(38, 31.8)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="2.5" y="1.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}">${emailStr}</text>
  </g>
  
  <line x1="35" y1="36" x2="85" y2="36" stroke="${textColor}10" stroke-width="0.15" />
  
  <g transform="translate(38, 39.5)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="2.5" y="1.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}" letter-spacing="0.05em">${settings.company_website.toUpperCase()}</text>
  </g>
  <text x="38" y="44.2" font-family="Inter, sans-serif" font-weight="700" font-size="1.3" fill="${textColor}a0" letter-spacing="0.2">${settings.company_regions.toUpperCase()}</text>
  ` : `
  <line x1="7" y1="30" x2="55" y2="30" stroke="${textColor}15" stroke-width="0.2" />
  
  <!-- Left Column -->
  <text x="8" y="11" font-family="Montserrat, sans-serif" font-weight="900" font-size="4.8" fill="${textColor}" letter-spacing="-0.2">${settings.company_name.toUpperCase()}</text>
  <text x="8" y="14.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${accentColor}" letter-spacing="0.8">${slogan.toUpperCase()}</text>
  
  <text x="8" y="20.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${textColor}a0" letter-spacing="0.3">${cardName.toUpperCase()}</text>
  ${(() => {
    const [l1, l2] = splitTagline(cardTitle);
    const fs = 2.5;
    if (l2) {
      return `<text x="8" y="23.5" font-family="Montserrat, sans-serif" font-weight="900" font-size="${fs}" fill="${textColor}" letter-spacing="-0.1">${l1.toUpperCase()}</text>
  <text x="8" y="27.5" font-family="Montserrat, sans-serif" font-weight="900" font-size="${fs}" fill="${textColor}" letter-spacing="-0.1">${l2.toUpperCase()}</text>`;
    } else {
      return `<text x="8" y="26" font-family="Montserrat, sans-serif" font-weight="900" font-size="${fs}" fill="${textColor}" letter-spacing="-0.1">${l1.toUpperCase()}</text>`;
    }
  })()}
  
  <g transform="translate(8, 33)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </g>
    <text x="2.5" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}">${settings.company_phone}</text>
  </g>
  
  <g transform="translate(8, 37.5)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="2.5" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}">${emailStr}</text>
  </g>
  
  <g transform="translate(8, 42)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="2.5" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}" letter-spacing="0.05em">${settings.company_website.toUpperCase()}</text>
  </g>
  
  <!-- Right Column -->
  <rect x="62" y="5.5" width="20" height="3" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="0.2" />
  <text x="72" y="7.5" font-family="Inter, sans-serif" font-weight="700" font-size="0.9" fill="${textColor}" letter-spacing="0.1" text-anchor="middle" dominant-baseline="central">АКЗ • ИЗОЛЯЦИЯ</text>
  
  <!-- QR Code Image Container -->
  <rect x="64" y="12" width="16" height="16" rx="1.5" fill="#FFFFFF" />
  <g transform="translate(65, 13) scale(${14 / qrCodeSvgSize})">
    <path d="${qrCodeSvgPath}" fill="none" stroke="#0f0f11" stroke-width="1" shape-rendering="crispEdges" />
  </g>
  
  <text x="72" y="42" font-family="Inter, sans-serif" font-weight="700" font-size="1.2" fill="${textColor}a0" letter-spacing="0.1" text-anchor="middle">${settings.company_regions.toUpperCase()}</text>
  `}
  
  <rect x="0.5" y="47.5" width="89" height="2" fill="${accentColor}" clip-path="url(#card-clip)" />
</svg>`;
  };

  const getSvgBackContent = () => {
    return `<?xml version="1.0" encoding="utf-8"?>
<svg version="1.1" xmlns="http://www.w3.org/2000/svg" width="90mm" height="50mm" viewBox="0 0 90 50">
  <defs>
    <clipPath id="card-clip"><rect x="0.5" y="0.5" width="89" height="49" rx="3.5" /></clipPath>
    ${texture === 'stripes' ? `<pattern id="stripes" width="1.66" height="1.66" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="1.66" stroke="${accentColor}" stroke-width="0.12" opacity="0.25" /></pattern>` : ''}
  </defs>
  <rect x="0.5" y="0.5" width="89" height="49" rx="3.5" fill="${bgColor}" stroke="${textColor}15" stroke-width="0.5" />
  ${texture !== 'none' ? `<rect x="0.5" y="0.5" width="89" height="49" rx="3.5" fill="url(#${texture})" clip-path="url(#card-clip)" />` : ''}
  
  <text x="45" y="11" font-family="Montserrat, sans-serif" font-weight="900" font-size="6" fill="${textColor}" letter-spacing="-0.2" text-anchor="middle">${settings.company_name.toUpperCase()}</text>
  <text x="45" y="14.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${accentColor}" letter-spacing="0.8" text-anchor="middle">${settings.company_subtitle.toUpperCase()}</text>
  
  <rect x="37" y="18" width="16" height="16" rx="1.5" fill="#FFFFFF" />
  <g transform="translate(38, 19) scale(${14 / qrCodeSvgSize})">
    <path d="${qrCodeSvgPath}" fill="none" stroke="#0f0f11" stroke-width="1" shape-rendering="crispEdges" />
  </g>
  <text x="45" y="38.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.2" fill="${textColor}a0" letter-spacing="0.4" text-anchor="middle">СКАНИРУЙТЕ ДЛЯ ПЕРЕХОДА</text>
  <text x="45" y="44.0" font-family="Inter, sans-serif" font-weight="700" font-size="1.8" fill="${textColor}" letter-spacing="0.05em" text-anchor="middle">${settings.company_website.toUpperCase()}</text>
  <rect x="0.5" y="47.5" width="89" height="2" fill="${accentColor}" clip-path="url(#card-clip)" />
</svg>`;
  };

  const triggerDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const downloadSvgFront = () => triggerDownload(getSvgFrontContent(), 'СФЕРА_Card_Front.svg');
  const downloadSvgBack = () => triggerDownload(getSvgBackContent(), 'СФЕРА_Card_Back.svg');

  const triggerPngDownload = (svgContent: string, fileName: string) => {
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1063; // 300 DPI high resolution
      canvas.height = 591;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 1063, 591);
        canvas.toBlob((blob) => {
          if (blob) {
            const pngUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(pngUrl);
          }
          URL.revokeObjectURL(url);
        }, 'image/png');
      }
    };
    img.src = url;
  };

  const triggerPdfDownload = (svgContent: string, fileName: string) => {
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1063; // 300 DPI high resolution
      canvas.height = 591;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, 1063, 591);
        const imgData = canvas.toDataURL('image/jpeg', 1.0);
        
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: [90, 50]
        });
        pdf.addImage(imgData, 'JPEG', 0, 0, 90, 50);
        pdf.save(fileName);
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  const downloadPngFront = () => triggerPngDownload(getSvgFrontContent(), 'СФЕРА_Card_Front.png');
  const downloadPngBack = () => triggerPngDownload(getSvgBackContent(), 'СФЕРА_Card_Back.png');
  const downloadPdfFront = () => triggerPdfDownload(getSvgFrontContent(), 'СФЕРА_Card_Front.pdf');
  const downloadPdfBack = () => triggerPdfDownload(getSvgBackContent(), 'СФЕРА_Card_Back.pdf');

  const filteredDocuments = documents.filter(doc => {
    const matchSearch = searchQuery
      ? (doc.name || '').toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchClient = filterClient
      ? doc.client_id === Number(filterClient)
      : true;
    const matchObject = filterObject
      ? doc.object_id === Number(filterObject)
      : true;
    const matchType = filterDocType && filterDocType !== 'all'
      ? doc.doc_type === filterDocType
      : true;
    const matchSource = filterSource && filterSource !== 'all'
      ? (filterSource === 'uploaded' ? doc.is_uploaded === 1 : doc.is_uploaded === 0)
      : true;
    return matchSearch && matchClient && matchObject && matchType && matchSource;
  });

  return (
    <div className="flex flex-col font-['Inter'] space-y-6">
      <Helmet>
        <title>Настройки и Шаблоны | СФЕРА</title>
      </Helmet>
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">Шаблоны и Контент</h1>
          <p className="text-gray-500 dark:text-zinc-400">Управление реквизитами, шаблонами документов и генератором визиток</p>
        </div>
        <button
          onClick={handleGenerateDefaultTemplates}
          className="px-4 py-2.5 bg-gradient-to-r from-[#F95700] to-[#ff7a33] hover:from-[#e04e00] hover:to-[#f95700] text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer select-none"
        >
          ✨ Сгенерировать стартовый пакет шаблонов компании
        </button>
      </div>

      {/* SaaS Мультитенантная архитектура шаблонов (Уведомление для новых компаний) */}
      <div className="print:hidden bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-3 shrink-0">
        <span className="text-lg">👑</span>
        <div className="text-xs leading-relaxed text-amber-900 dark:text-amber-200">
          <strong className="font-bold uppercase tracking-wider block mb-0.5">SaaS Изоляция Шаблонов (RLS):</strong>
          Эталонные презентации и мастер-шаблоны зарезервированы за платформой СФЕРА (Супер-Админом). Каждая зарегистрированная компания создаёт собственные шаблоны или может в 1 клик сгенерировать стартовый персональный пакет документов под свои реквизиты.
        </div>
      </div>


      {/* Tabs */}
      <div className="print:hidden flex flex-wrap gap-1.5 bg-white dark:bg-zinc-900 p-1.5 rounded-xl border border-gray-200 dark:border-zinc-800 w-full">
        <button
          onClick={() => setActiveTab('details')}
          className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'details' ? 'bg-[#F95700] text-white' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800'}`}
        >
          <Settings className="w-4 h-4" /> Реквизиты и Шапка
        </button>
        <button
          onClick={() => setActiveTab('docx_templates')}
          className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'docx_templates' ? 'bg-[#F95700] text-white' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800'}`}
        >
          <FileText className="w-4 h-4" /> Конструктор .docx
        </button>
        <button
          onClick={() => setActiveTab('business_card')}
          className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'business_card' ? 'bg-[#F95700] text-white' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800'}`}
        >
          <CreditCard className="w-4 h-4" /> Конструктор Визиток
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'documents' ? 'bg-[#F95700] text-white' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800'}`}
        >
          <File className="w-4 h-4" /> Реестр документов
        </button>
        <button
          onClick={() => setActiveTab('email_templates')}
          className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'email_templates' ? 'bg-[#F95700] text-white' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800'}`}
        >
          <Mail className="w-4 h-4" /> Шаблоны писем
        </button>
        <button
          onClick={() => setActiveTab('pitch_deck')}
          className={`shrink-0 px-4 py-2 rounded-md text-sm font-semibold transition-all select-none cursor-pointer flex items-center gap-1.5 ${activeTab === 'pitch_deck' ? 'bg-[#F95700] text-white' : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800'}`}
        >
          <FileText className="w-4 h-4" /> Презентации (Pitch Deck)
        </button>
      </div>


      {/* Message feedback */}
      {message && (
        <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm font-medium border border-green-200 w-fit">
          {message}
        </div>
      )}

      {/* Tab Contents */}
      <div className={activeTab === 'pitch_deck' ? "w-full print:w-full print:p-0 print:m-0" : "bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 sm:p-8"}>
        
        {/* Tab 1: Details & Header settings */}
        {activeTab === 'details' && (
          <div className="space-y-6 max-w-3xl">
            {/* Organization Selector */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800/60 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider block">Организация:</label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedOrgId || ''}
                    onChange={(e) => handleSwitchOrganization(Number(e.target.value))}
                    className="px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900 font-bold text-gray-800 dark:text-zinc-200 text-sm min-w-[240px] cursor-pointer"
                  >
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>
                        {org.name} {org.is_active === 1 ? '(Активна)' : ''}
                      </option>
                    ))}
                  </select>
                  {organizations.length > 1 && (
                    <button
                      type="button"
                      onClick={() => selectedOrgId && handleDeleteOrganization(selectedOrgId)}
                      className="px-3 py-2 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-all cursor-pointer"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCreateOrganization}
                className="px-4 py-2 text-sm font-bold bg-[#F95700]/10 hover:bg-[#F95700]/20 text-[#F95700] rounded-lg transition-all cursor-pointer"
              >
                + Добавить организацию
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveSettings({});
              }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Название бренда (в шапке)</label>
                <input
                  type="text"
                  value={settings.company_name}
                  onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                  placeholder="СФЕРА"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Слоган / Описание бренда</label>
                <input
                  type="text"
                  value={settings.company_subtitle}
                  onChange={(e) => setSettings({ ...settings, company_subtitle: e.target.value })}
                  placeholder="Промышленная группа"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Юридическое лицо</label>
                <input
                  type="text"
                  value={settings.company_legal_name}
                  onChange={(e) => setSettings({ ...settings, company_legal_name: e.target.value })}
                  placeholder="ООО СФЕРА"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">ИНН компании</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={settings.company_inn}
                    onChange={(e) => setSettings({ ...settings, company_inn: e.target.value })}
                    placeholder="5610234567"
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  />
                  <button
                    type="button"
                    onClick={handleLookupCompanyINN}
                    disabled={isLookingUpINN}
                    className="px-3 py-2 bg-[#F95700]/10 hover:bg-[#F95700]/20 text-[#F95700] text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isLookingUpINN ? 'Поиск...' : 'ФНС / DaData'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">ФИО Генерального директора</label>
                <input
                  type="text"
                  value={settings.company_director}
                  onChange={(e) => setSettings({ ...settings, company_director: e.target.value })}
                  placeholder="Леонтьев А.В."
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Контактный телефон</label>
                <input
                  type="text"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                  placeholder="+7 (3532) 99-88-77"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Email для связи</label>
                <input
                  type="email"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                  placeholder="info@sphera-akz.ru"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Адрес офиса</label>
                <input
                  type="text"
                  value={settings.company_address}
                  onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                  placeholder="г. Оренбург, ул. Монтажников, д. 22"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Сайт (короткий)</label>
                <input
                  type="text"
                  value={settings.company_website}
                  onChange={(e) => setSettings({ ...settings, company_website: e.target.value })}
                  placeholder="леоника56.рф"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Полный URL сайта (для QR-кода)</label>
                <input
                  type="text"
                  value={settings.company_website_url}
                  onChange={(e) => setSettings({ ...settings, company_website_url: e.target.value })}
                  placeholder="https://xn--56-6kc6dma2c.xn--p1ai"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Регионы присутствия</label>
                <input
                  type="text"
                  value={settings.company_regions}
                  onChange={(e) => setSettings({ ...settings, company_regions: e.target.value })}
                  placeholder="Оренбург • Самара • Уфа"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              {/* Банковские реквизиты (Услуги / Работы) */}
              <div className="md:col-span-2 pt-4 border-t border-gray-150 dark:border-zinc-800 mt-2">
                <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider text-[#F95700]">Банковские реквизиты (Касса: Услуги / Работы)</h3>
                <p className="text-xs text-gray-400 mt-0.5">Используется по умолчанию для выставления счетов за выполнение работ</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Название Банка (Работы)</label>
                <input
                  type="text"
                  value={settings.company_bank_name}
                  onChange={(e) => setSettings({ ...settings, company_bank_name: e.target.value })}
                  placeholder="АО 'АЛЬФА-БАНК'"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">БИК банка (Работы)</label>
                <input
                  type="text"
                  value={settings.company_bik}
                  onChange={(e) => setSettings({ ...settings, company_bik: e.target.value })}
                  placeholder="044525593"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Расчетный счет (Р/с) (Работы)</label>
                <input
                  type="text"
                  value={settings.company_rs}
                  onChange={(e) => setSettings({ ...settings, company_rs: e.target.value })}
                  placeholder="40702810101234567890"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Корреспондентский счет (К/с) (Работы)</label>
                <input
                  type="text"
                  value={settings.company_ks}
                  onChange={(e) => setSettings({ ...settings, company_ks: e.target.value })}
                  placeholder="30101810200000000593"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">КПП организации</label>
                <input
                  type="text"
                  value={settings.company_kpp}
                  onChange={(e) => setSettings({ ...settings, company_kpp: e.target.value })}
                  placeholder="561001001"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                {/* Spacer */}
              </div>

              {/* Банковские реквизиты (Материалы / ЛКМ) */}
              <div className="md:col-span-2 pt-4 border-t border-gray-150 dark:border-zinc-800 mt-2">
                <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider text-green-700">Банковские реквизиты (Касса: Товары / Расходники)</h3>
                <p className="text-xs text-gray-400 mt-0.5">Используется для выставления счетов за поставку товаров и материалов</p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Название Банка (Товары)</label>
                <input
                  type="text"
                  value={settings.company_bank_name_materials}
                  onChange={(e) => setSettings({ ...settings, company_bank_name_materials: e.target.value })}
                  placeholder="АО 'АЛЬФА-БАНК'"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">БИК банка (Товары)</label>
                <input
                  type="text"
                  value={settings.company_bik_materials}
                  onChange={(e) => setSettings({ ...settings, company_bik_materials: e.target.value })}
                  placeholder="044525593"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Расчетный счет (Р/с) (Товары)</label>
                <input
                  type="text"
                  value={settings.company_rs_materials}
                  onChange={(e) => setSettings({ ...settings, company_rs_materials: e.target.value })}
                  placeholder="40702810101234567891"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Корреспондентский счет (К/с) (Товары)</label>
                <input
                  type="text"
                  value={settings.company_ks_materials}
                  onChange={(e) => setSettings({ ...settings, company_ks_materials: e.target.value })}
                  placeholder="30101810200000000593"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                {/* Spacer */}
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center justify-center px-6 py-2.5 bg-[#F95700] hover:bg-[#E04D00] text-white rounded-lg transition-all font-bold text-sm select-none cursor-pointer"
              >
                <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Сохранение...' : 'Сохранить реквизиты'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tab: Docx Templates */}
      {activeTab === 'docx_templates' && (
        <div className="h-full">
          <DocxTemplates />
        </div>
      )}

      {/* Tab 3: Business Card Designer */}
        {activeTab === 'business_card' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Visualizer Front/Back */}
            <div className="lg:col-span-7 flex flex-col items-center space-y-6">
              
              {/* Flip wrapper */}
              <div 
                className="w-full max-w-[500px] h-[270px] [perspective:1000px] cursor-pointer" 
                onClick={() => setIsFlipped(!isFlipped)}
              >
                <motion.div 
                  className="w-full h-full relative [transform-style:preserve-3d] transition-all duration-700"
                  animate={{ rotateY: isFlipped ? 180 : 0 }}
                >
                  
                  {/* Front View */}
                  <div 
                    className="absolute inset-0 w-full h-full rounded-2xl border p-8 flex flex-col justify-between overflow-hidden [backface-visibility:hidden] transition-colors duration-300"
                    style={{
                      backgroundColor: bgColor,
                      borderColor: `${textColor}15`,
                      color: textColor,
                      boxShadow: '0 10px 25px -10px rgba(0,0,0,0.15)'
                    }}
                  >
                    {texture !== 'none' && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${accentColor}, ${accentColor} 1px, transparent 1px, transparent 10px)` }} />
                    )}
                    
                    {layoutTemplate === 'classic' && (
                      <>
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <span className="font-black tracking-tight block text-2xl uppercase font-['Montserrat']">{settings.company_name || 'СФЕРА'}</span>
                            <span className="tracking-[0.2em] font-bold block text-[8px] mt-0.5" style={{ color: accentColor }}>{settings.company_subtitle || 'ПРОМЫШЛЕННАЯ ГРУППА'}</span>
                          </div>
                          <div className="text-[8px] font-bold tracking-wider uppercase px-2.5 py-1 border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}25` }}>АКЗ • ИЗОЛЯЦИЯ</div>
                        </div>

                        <div className="z-10">
                          <div className="text-[8px] tracking-wider font-bold uppercase opacity-60 flex items-center gap-1 mb-0.5">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                            {cardName || 'ПОЛУЧАТЕЛЬ'}
                          </div>
                          <h2 className="font-black uppercase tracking-tight text-base font-['Montserrat']">{cardTitle || 'ДОЛЖНОСТЬ'}</h2>
                        </div>

                        <div className="border-t pt-3 flex justify-between items-end z-10 text-[9px] mt-1" style={{ borderColor: `${textColor}15` }}>
                          <div className="space-y-0.5 font-semibold">
                            <div>Тел: {settings.company_phone || '—'}</div>
                            <div className="opacity-60">Email: {settings.company_email || '—'}</div>
                          </div>
                          <div className="text-right font-semibold">
                            <div style={{ color: accentColor }}>{settings.company_website || '—'}</div>
                            <div className="opacity-60 text-[7px] tracking-wider mt-0.5">{settings.company_regions || '—'}</div>
                          </div>
                        </div>
                      </>
                    )}

                    {layoutTemplate === 'minimal' && (
                      <div className="flex flex-col items-center justify-between h-full text-center z-10 w-full py-1">
                        <div className="text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 border" style={{ backgroundColor: `${accentColor}10`, borderColor: `${accentColor}25` }}>АКЗ • ИЗОЛЯЦИЯ</div>
                        <div className="leading-none mt-1">
                          <span className="font-black tracking-tight block text-2xl uppercase font-['Montserrat']">{settings.company_name || 'СФЕРА'}</span>
                          <span className="tracking-[0.25em] font-bold block text-[7px] mt-0.5" style={{ color: accentColor }}>{(settings.company_subtitle || 'ПРОМЫШЛЕННАЯ ГРУППА').toUpperCase()}</span>
                        </div>
                        <div className="w-12 h-px" style={{ backgroundColor: `${textColor}20` }} />
                        <div>
                          <span className="text-[8px] tracking-wider font-bold block opacity-60 mb-0.5">{cardName.toUpperCase()}</span>
                          <h2 className="font-black uppercase text-sm font-['Montserrat']">{cardTitle.toUpperCase()}</h2>
                        </div>
                        <div className="space-y-0.5 text-[9px] w-full mt-2 font-semibold">
                          <div>{settings.company_phone}</div>
                          <div className="opacity-60"><span style={{ color: accentColor }}>{settings.company_website}</span>  •  {settings.company_regions}</div>
                        </div>
                      </div>
                    )}

                    {layoutTemplate === 'grid' && (
                      <div className="flex h-full w-full z-10 text-left relative">
                        {/* Vertical line divider */}
                        <div className="absolute top-0 bottom-0 left-[35%] w-px" style={{ backgroundColor: `${textColor}15` }} />

                        {/* Left Column (35% width) */}
                        <div className="w-[35%] pr-4 flex flex-col justify-between h-full py-1">
                          <div className="leading-none">
                            <span className="font-black tracking-tighter block uppercase text-base font-['Montserrat']">{settings.company_name || 'СФЕРА'}</span>
                            <span className="tracking-[0.15em] font-bold block mt-1 text-[7px]" style={{ color: accentColor }}>{(settings.company_subtitle || 'ПРОМЫШЛЕННАЯ ГРУППА').toUpperCase()}</span>
                          </div>

                          <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                          <div 
                            className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 border text-center"
                            style={{ 
                              backgroundColor: `${accentColor}10`,
                              borderColor: `${accentColor}25`,
                              color: textColor
                            }}
                          >
                            АКЗ • ИЗОЛЯЦИЯ
                          </div>
                        </div>

                        {/* Right Column (65% width) */}
                        <div className="w-[65%] pl-6 flex flex-col justify-between h-full py-1">
                          <div>
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: accentColor }} />
                              <span className="text-[8px] tracking-wider font-bold uppercase opacity-60">{cardName || 'ПОЛУЧАТЕЛЬ'}</span>
                            </div>
                            <h2 className="font-black uppercase tracking-tight leading-[1.1] text-xs font-['Montserrat']">
                              {(() => {
                                const [l1, l2] = splitTagline(cardTitle);
                                return l2 ? <>{l1}<br />{l2}</> : l1;
                              })()}
                            </h2>
                          </div>

                          <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                          {/* Contacts Block */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3" style={{ color: accentColor }} strokeWidth={2.5} />
                              <span className="text-[9px] font-bold font-mono">{settings.company_phone || '—'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3 h-3" style={{ color: accentColor }} strokeWidth={2.5} />
                              <span className="text-[9px] font-bold font-mono opacity-60">{settings.company_email || '—'}</span>
                            </div>
                            
                            <div className="w-full h-px" style={{ backgroundColor: `${textColor}10` }} />

                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5">
                                <Globe className="w-3 h-3" style={{ color: accentColor }} strokeWidth={2.5} />
                                <span className="text-[9px] font-bold uppercase tracking-wider">{settings.company_website || '—'}</span>
                              </div>
                              <span className="text-[7px] uppercase tracking-wider font-bold block opacity-60 pl-4.5">{settings.company_regions || '—'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {layoutTemplate === 'qr' && (
                      <div className="flex h-full w-full z-10 text-left items-stretch">
                        {/* Left side: details */}
                        <div className="flex-1 flex flex-col justify-between h-full py-1 pr-4">
                          <div className="leading-none">
                            <span className="font-black tracking-tighter block uppercase text-base font-['Montserrat']">{settings.company_name || 'СФЕРА'}</span>
                            <span className="tracking-[0.25em] uppercase font-bold block mt-1 text-[8px]" style={{ color: accentColor }}>{(settings.company_subtitle || 'ПРОМЫШЛЕННАЯ ГРУППА').toUpperCase()}</span>
                          </div>

                          <div className="my-1.5">
                            <span className="text-[8px] tracking-wider font-bold uppercase block opacity-60">{cardName || 'ПОЛУЧАТЕЛЬ'}</span>
                            <h2 className="font-black uppercase tracking-tight leading-[1.1] text-xs font-['Montserrat']">
                              {(() => {
                                const [l1, l2] = splitTagline(cardTitle);
                                return l2 ? <>{l1}<br />{l2}</> : l1;
                              })()}
                            </h2>
                          </div>

                          <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                          {/* Staged contacts */}
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Phone className="w-3 h-3" style={{ color: accentColor }} strokeWidth={2.5} />
                              <span className="text-[9px] font-bold font-mono">{settings.company_phone || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="w-3 h-3" style={{ color: accentColor }} strokeWidth={2.5} />
                              <span className="text-[9px] font-bold font-mono opacity-60">{settings.company_email || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="w-3 h-3" style={{ color: accentColor }} strokeWidth={2.5} />
                              <span className="text-[9px] font-bold uppercase tracking-wider">{settings.company_website || '—'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right side: QR Code Block */}
                        <div className="w-[120px] flex flex-col justify-between items-center py-1">
                          <div 
                            className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 border w-full text-center"
                            style={{ 
                              backgroundColor: `${accentColor}10`,
                              borderColor: `${accentColor}25`,
                              color: textColor
                            }}
                          >
                            АКЗ • ИЗОЛЯЦИЯ
                          </div>

                          <div className="bg-white dark:bg-zinc-900 p-1 rounded-lg my-auto shadow-md">
                            {qrCodeDataUrl ? (
                              <img 
                                src={qrCodeDataUrl}
                                alt="QR Code Front"
                                className="w-[65px] h-[65px] object-contain"
                              />
                            ) : (
                              <div className="w-[65px] h-[65px] bg-zinc-800 animate-pulse" />
                            )}
                          </div>

                          <span className="text-[7px] uppercase tracking-normal font-bold opacity-60 text-center w-full whitespace-nowrap">{settings.company_regions || '—'}</span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Back View */}
                  <div 
                    className="absolute inset-0 w-full h-full rounded-2xl border p-8 flex flex-col justify-between items-center text-center overflow-hidden [backface-visibility:hidden] [transform:rotateY(180deg)] transition-colors duration-300"
                    style={{
                      backgroundColor: bgColor,
                      borderColor: `${textColor}15`,
                      color: textColor,
                      boxShadow: '0 10px 25px -10px rgba(0,0,0,0.15)'
                    }}
                  >
                    {texture !== 'none' && (
                      <div className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${accentColor}, ${accentColor} 1px, transparent 1px, transparent 10px)` }} />
                    )}

                    <div className="z-10 leading-none">
                      <span className="font-black tracking-tight block text-2xl uppercase font-['Montserrat']">{settings.company_name || 'СФЕРА'}</span>
                      <span className="tracking-[0.2em] font-bold block text-[8px] mt-0.5" style={{ color: accentColor }}>{(settings.company_subtitle || 'ПРОМЫШЛЕННАЯ ГРУППА').toUpperCase()}</span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-1 rounded-lg z-10 w-20 h-20 flex items-center justify-center shadow-md">
                      {qrCodeSvgPath ? (
                        <svg width="100%" height="100%" viewBox={`0 0 ${qrCodeSvgSize} ${qrCodeSvgSize}`}>
                          <path d={qrCodeSvgPath} fill="none" stroke="#0f0f11" strokeWidth="1" shape-rendering="crispEdges" />
                        </svg>
                      ) : (
                        <span className="text-[8px] text-gray-400">QR Code</span>
                      )}
                    </div>
                    
                    <div className="z-10 font-bold">
                      <div className="text-[8px] opacity-60 tracking-widest uppercase mb-1">СКАНИРУЙТЕ ДЛЯ ПЕРЕХОДА</div>
                      <div className="text-xs tracking-wider" style={{ color: accentColor }}>{settings.company_website.toUpperCase()}</div>
                    </div>
                  </div>

                </motion.div>
              </div>

              <div className="text-xs text-gray-500 dark:text-zinc-400 font-medium">
                * Кликните на карточку, чтобы перевернуть (Лицевая / Оборотная)
              </div>
            </div>

            {/* Business Card Configurator Controls */}
            <div className="lg:col-span-5 bg-gray-50 dark:bg-zinc-800/50 p-6 rounded-xl border border-gray-150 dark:border-zinc-800 space-y-6">
              <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider border-b pb-2">Параметры Карточки</h3>
              
              <div className="space-y-4">
                {/* Theme Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Цветовая тема</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'dark', label: 'Тёмная' },
                      { id: 'light', label: 'Светлая' },
                      { id: 'orange', label: 'Оранжевая' }
                    ].map(t => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTheme(t.id as any)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold border text-center transition-all select-none cursor-pointer ${theme === t.id ? 'bg-[#F95700]/10 text-[#F95700] border-[#F95700]/50' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-800'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Layout Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Стиль макета</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'classic', label: 'Классический' },
                      { id: 'minimal', label: 'Минимализм' },
                      { id: 'grid', label: 'Сетка' },
                      { id: 'qr', label: 'С QR-кодом' }
                    ].map(l => (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => setLayoutTemplate(l.id as any)}
                        className={`py-1.5 px-3 rounded-lg text-xs font-bold border text-center transition-all select-none cursor-pointer ${layoutTemplate === l.id ? 'bg-[#F95700]/10 text-[#F95700] border-[#F95700]/50' : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 border-gray-200 dark:border-zinc-800'}`}
                      >
                        {l.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Texture toggle */}
                <div className="flex items-center justify-between py-2 border-y border-gray-200 dark:border-zinc-800 text-xs">
                  <span className="font-semibold text-gray-600 dark:text-zinc-400 uppercase">Использовать текстуру полос</span>
                  <input
                    type="checkbox"
                    checked={useTexture}
                    onChange={(e) => setUseTexture(e.target.checked)}
                    className="w-4 h-4 text-[#F95700] focus:ring-[#F95700] border-gray-300 dark:border-zinc-800 rounded"
                  />
                </div>

                {/* Card Override Text Fields */}
                <div className="space-y-3 pt-2">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase">ФИО на визитке</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="Иванов И.И."
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-600 dark:text-zinc-400 uppercase">Должность</label>
                    <input
                      type="text"
                      value={cardTitle}
                      onChange={(e) => setCardTitle(e.target.value)}
                      placeholder="Генеральный директор"
                      className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                    />
                  </div>
                </div>

                {/* Export Buttons */}
                <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-zinc-800">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest text-[10px]">Скачать в высоком разрешении (для печати):</div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={downloadPdfFront}
                      className="py-2 px-3 bg-[#F95700] hover:bg-[#E04D00] text-white text-[11px] font-bold rounded-lg transition-all text-center select-none cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Лицо (PDF)
                    </button>
                    <button
                      onClick={downloadPdfBack}
                      className="py-2 px-3 bg-[#F95700] hover:bg-[#E04D00] text-white text-[11px] font-bold rounded-lg transition-all text-center select-none cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Оборот (PDF)
                    </button>
                    <button
                      onClick={downloadPngFront}
                      className="py-2 px-3 bg-gray-800 hover:bg-black text-white text-[11px] font-bold rounded-lg transition-all text-center select-none cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Лицо (PNG)
                    </button>
                    <button
                      onClick={downloadPngBack}
                      className="py-2 px-3 bg-gray-800 hover:bg-black text-white text-[11px] font-bold rounded-lg transition-all text-center select-none cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Оборот (PNG)
                    </button>
                    <button
                      onClick={downloadSvgFront}
                      className="py-2 px-3 border border-gray-300 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 text-[11px] font-bold rounded-lg transition-all text-center select-none cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Лицо (SVG)
                    </button>
                    <button
                      onClick={downloadSvgBack}
                      className="py-2 px-3 border border-gray-300 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 text-[11px] font-bold rounded-lg transition-all text-center select-none cursor-pointer flex items-center justify-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" /> Оборот (SVG)
                    </button>
                  </div>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* Tab 4: Document Registry */}
        {activeTab === 'documents' && (
          <div className="space-y-6">
            {/* Header + Add button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-200 font-['Montserrat']">Реестр документов и скан-копий</h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Список всех созданных коммерческих предложений, договоров, счетов, актов и загруженных сканов</p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    setUploadClientId('');
                    setUploadObjectId('');
                    setUploadDocType('other');
                    setUploadName('');
                    setUploadFile(null);
                    setIsUploadModalOpen(true);
                  }}
                  className="flex items-center justify-center px-4 py-2.5 bg-[#F95700] hover:bg-[#E04D00] text-white rounded-lg transition-all font-bold text-sm select-none cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1.5" /> Загрузить скан / файл
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAiUploadTitle('');
                    setAiUploadCategory('tech');
                    setAiUploadFile(null);
                    setAiUploadResult(null);
                    setIsAiUploadModalOpen(true);
                  }}
                  className="flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg transition-all font-bold text-sm select-none cursor-pointer shadow-md shadow-indigo-500/20"
                >
                  <span className="mr-1.5">🤖</span> В Базу Знаний ИИ
                </button>
              </div>
            </div>

            {/* Filter section */}
            <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800/60 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
              {/* Search */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Поиск по названию</label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Договор, акт..."
                    className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                  <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Client Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Контрагент</label>
                <select
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#F95700] cursor-pointer"
                >
                  <option value="">Все контрагенты</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              {/* Object Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Объект</label>
                <select
                  value={filterObject}
                  onChange={(e) => setFilterObject(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#F95700] cursor-pointer"
                >
                  <option value="">Все объекты</option>
                  {objects.map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              {/* Doc Type Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Тип документа</label>
                <select
                  value={filterDocType}
                  onChange={(e) => setFilterDocType(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#F95700] cursor-pointer"
                >
                  <option value="all">Все типы</option>
                  <option value="contract">Договор</option>
                  <option value="act">Акт выполненных работ</option>
                  <option value="kp">Коммерческое предложение</option>
                  <option value="invoice">Счет на оплату</option>
                  <option value="other">Другое / Скан</option>
                </select>
              </div>

              {/* Source Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase">Источник</label>
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs bg-white dark:bg-zinc-900 focus:outline-none focus:ring-1 focus:ring-[#F95700] cursor-pointer"
                >
                  <option value="all">Все источники</option>
                  <option value="crm">Сгенерировано в CRM</option>
                  <option value="uploaded">Загружено вручную</option>
                </select>
              </div>
            </div>

            {/* Document list table */}
            <div className="border border-gray-150 dark:border-zinc-800 rounded-xl overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
              {isLoadingDocs ? (
                <div className="p-8 text-center text-gray-500 dark:text-zinc-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#F95700]" />
                  <span>Загрузка списка документов...</span>
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-zinc-400">
                  Документы не найдены. Сгенерируйте документ в карточке клиента или загрузите скан вручную.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-200 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 font-bold uppercase tracking-wider text-[10px]">
                        <th className="p-3">Название документа</th>
                        <th className="p-3">Контрагент / Объект</th>
                        <th className="p-3">Тип</th>
                        <th className="p-3">Источник</th>
                        <th className="p-3">Дата создания</th>
                        <th className="p-3 text-right">Действия</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {filteredDocuments.map(doc => {
                        let typeLabel = "Другое";
                        let typeColorClass = "bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-zinc-200";
                        if (doc.doc_type === "contract") {
                          typeLabel = "Договор";
                          typeColorClass = "bg-blue-50 text-blue-700 border border-blue-100";
                        } else if (doc.doc_type === "act") {
                          typeLabel = "Акт";
                          typeColorClass = "bg-green-50 text-green-700 border border-green-100";
                        } else if (doc.doc_type === "kp") {
                          typeLabel = "КП";
                          typeColorClass = "bg-amber-50 text-amber-700 border border-amber-100";
                        } else if (doc.doc_type === "invoice") {
                          typeLabel = "Счет";
                          typeColorClass = "bg-purple-50 text-purple-700 border border-purple-100";
                        }

                        return (
                          <tr key={doc.id} className="hover:bg-gray-50/70 transition-colors">
                            <td className="p-3 font-semibold text-gray-900 dark:text-zinc-200 flex items-center gap-2 min-w-[200px]">
                              <File className="w-4 h-4 text-gray-400 flex-shrink-0" />
                              <span className="truncate max-w-[250px]" title={doc.name}>
                                {doc.name || "Без названия"}
                              </span>
                            </td>
                            <td className="p-3 text-gray-600 dark:text-zinc-400">
                              <div className="font-medium">{doc.client_name || "—"}</div>
                              <div className="text-[10px] text-gray-400 truncate max-w-[180px]">{doc.object_name || "—"}</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${typeColorClass}`}>
                                {typeLabel}
                              </span>
                            </td>
                            <td className="p-3">
                              {doc.is_uploaded === 1 ? (
                                <span className="text-gray-500 dark:text-zinc-400 font-medium flex items-center gap-1">
                                  <Upload className="w-3 h-3" /> Скан / Файл
                                </span>
                              ) : (
                                <span className="text-[#F95700] font-semibold flex items-center gap-1">
                                  <Settings className="w-3 h-3" /> СФЕРА
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-gray-500 dark:text-zinc-400">
                              {doc.created_at ? new Date(doc.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "—"}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => downloadDocumentFile(doc.id, doc.name)}
                                  className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-[#F95700] hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 rounded transition-all cursor-pointer select-none"
                                  title="Скачать PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEmailModal(doc)}
                                  className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 rounded transition-all cursor-pointer"
                                  title="Отправить на Email"
                                >
                                  <Mail className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDoc(doc.id)}
                                  className="p-1.5 text-gray-500 dark:text-zinc-400 hover:text-red-600 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 rounded transition-all cursor-pointer"
                                  title="Удалить"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 5: Email Templates */}
        {activeTab === 'email_templates' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[75vh]">
            {/* Editor Area */}
            <div className="lg:col-span-8 flex flex-col h-full space-y-6 overflow-y-auto pr-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="text-base font-bold text-gray-800 dark:text-zinc-200 uppercase tracking-wider text-indigo-600 flex items-center gap-2">
                    <Mail className="w-5 h-5" /> Шаблоны сопроводительных писем
                  </h3>
                </div>
                
                {/* Template for Contract */}
                <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800/60 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wider block">Письмо для Договора Подряда</label>
                  <textarea
                    value={settings.email_template_contract || ''}
                    onChange={(e) => setSettings({ ...settings, email_template_contract: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-zinc-900 font-mono text-xs leading-relaxed"
                    placeholder="Здравствуйте..."
                  />
                </div>

                {/* Template for Act */}
                <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800/60 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wider block">Письмо для Акта выполненных работ</label>
                  <textarea
                    value={settings.email_template_act || ''}
                    onChange={(e) => setSettings({ ...settings, email_template_act: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-zinc-900 font-mono text-xs leading-relaxed"
                    placeholder="Здравствуйте..."
                  />
                </div>

                {/* Template for KP */}
                <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800/60 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wider block">Письмо для Коммерческого Предложения</label>
                  <textarea
                    value={settings.email_template_kp || ''}
                    onChange={(e) => setSettings({ ...settings, email_template_kp: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-zinc-900 font-mono text-xs leading-relaxed"
                    placeholder="Здравствуйте..."
                  />
                </div>

                {/* Template for Invoice */}
                <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800/60 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wider block">Письмо для Счета на оплату</label>
                  <textarea
                    value={settings.email_template_invoice || ''}
                    onChange={(e) => setSettings({ ...settings, email_template_invoice: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-zinc-900 font-mono text-xs leading-relaxed"
                    placeholder="Здравствуйте..."
                  />
                </div>

                {/* Template for Other */}
                <div className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800/60 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-zinc-200 uppercase tracking-wider block">Письмо для Прочих документов (скан-копий)</label>
                  <textarea
                    value={settings.email_template_other || ''}
                    onChange={(e) => setSettings({ ...settings, email_template_other: e.target.value })}
                    rows={4}
                    className="w-full p-3 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/50 bg-white dark:bg-zinc-900 font-mono text-xs leading-relaxed"
                    placeholder="Здравствуйте..."
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t sticky bottom-0 bg-white dark:bg-zinc-900 pb-2">
                <button
                  onClick={() => handleSaveSettings({})}
                  disabled={isSaving}
                  className="flex items-center justify-center px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all font-bold text-sm select-none cursor-pointer"
                >
                  <Save className="w-4 h-4 mr-2" /> {isSaving ? 'Сохранение...' : 'Сохранить шаблоны'}
                </button>
              </div>
            </div>

            {/* Help Side Panel */}
            <div className="lg:col-span-4 bg-gray-50 dark:bg-zinc-800/50 border border-gray-150 dark:border-zinc-800 rounded-xl p-5 overflow-y-auto space-y-4 h-full">
              <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                <Info className="w-4.5 h-4.5 text-indigo-600" /> Переменные писем
              </h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Вы можете использовать эти переменные в фигурных скобках. При открытии диалогового окна отправки письма CRM автоматически заменит их на данные клиента и документа:
              </p>
              
              <div className="space-y-3 pt-2 text-xs">
                {[
                  { name: '{{client_name}}', desc: 'Наименование компании Заказчика' },
                  { name: '{{client_contact}}', desc: 'ФИО контактного лица Заказчика' },
                  { name: '{{doc_name}}', desc: 'Название отправляемого документа (например: Счет на оплату № СЧ-00045)' },
                  { name: '{{object_name}}', desc: 'Название объекта, к которому привязан документ' },
                  { name: '{{company_name}}', desc: 'Название нашей организации (из активных реквизитов)' },
                  { name: '{{company_phone}}', desc: 'Наш контактный телефон' }
                ].map(v => (
                  <div key={v.name} className="border-b border-gray-200 dark:border-zinc-800/50 pb-2">
                    <code className="text-indigo-600 font-bold font-mono">{v.name}</code>
                    <div className="text-[11px] text-gray-500 dark:text-zinc-400 mt-0.5">{v.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 6: Презентации (Pitch Deck) */}
        {activeTab === 'pitch_deck' && (
          <div className="w-full">
            <PresentationDeck />
          </div>
        )}

      </div>


      {/* Upload Document Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-['Inter']">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-800 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider">Загрузить скан / файл документа</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-zinc-400 font-bold text-lg cursor-pointer border-0 bg-transparent"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleUploadDocumentSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Контрагент <span className="text-red-500">*</span></label>
                <select
                  value={uploadClientId}
                  onChange={(e) => setUploadClientId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                  required
                >
                  <option value="">Выберите контрагента</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Объект (необязательно)</label>
                <select
                  value={uploadObjectId}
                  onChange={(e) => setUploadObjectId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                >
                  <option value="">Выберите объект</option>
                  {objects.filter(o => !uploadClientId || o.client_id === Number(uploadClientId)).map(o => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Тип документа</label>
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                >
                  <option value="other">Другое / Скан</option>
                  <option value="contract">Договор</option>
                  <option value="act">Акт выполненных работ</option>
                  <option value="kp">Коммерческое предложение</option>
                  <option value="invoice">Счет на оплату</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Название документа <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  placeholder="Акт сверки за 2025 год"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Файл (PDF или изображение) <span className="text-red-500">*</span></label>
                <input
                  type="file"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  accept="application/pdf,image/*"
                  className="w-full text-xs text-gray-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-[#F95700]/10 file:text-[#F95700] hover:file:bg-[#F95700]/20 cursor-pointer"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="flex items-center justify-center px-4 py-2 bg-[#F95700] hover:bg-[#E04D00] text-white rounded-lg text-xs font-bold select-none cursor-pointer"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Загрузка...
                    </>
                  ) : (
                    "Загрузить"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Knowledge Base Upload Modal */}
      {isAiUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-['Inter']">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-purple-500/30 dark:border-purple-500/30 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gradient-to-r from-purple-900/40 to-indigo-900/40 px-6 py-4 border-b border-purple-500/20 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-purple-950 dark:text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                  <span>🤖</span> Загрузка в Базу Знаний ИИ (RAG)
                </h3>
                <p className="text-[10px] text-purple-800/80 dark:text-purple-300/80 mt-0.5">Документ будет нарезан на чанки и добавлен в Pinecone</p>
              </div>
              <button
                onClick={() => setIsAiUploadModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-zinc-400 font-bold text-lg cursor-pointer border-0 bg-transparent"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleAiUploadSubmit} className="p-6 space-y-4">
              {aiUploadResult ? (
                <div className="p-4 bg-green-50 dark:bg-green-950/40 border border-green-300 dark:border-green-800 rounded-xl space-y-2 text-center animate-in zoom-in-95 duration-200">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                  <h4 className="font-bold text-sm text-green-900 dark:text-green-200">Успешно проиндексировано!</h4>
                  <p className="text-xs text-green-800 dark:text-green-300">
                    Векторы загружены в базу Pinecone.<br/>
                    <b>Создано чанков:</b> {aiUploadResult.chunks_created}<br/>
                    <b>Векторов:</b> {aiUploadResult.vectors_upserted}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Название / Тема документа</label>
                    <input
                      type="text"
                      value={aiUploadTitle}
                      onChange={(e) => setAiUploadTitle(e.target.value)}
                      placeholder="Регламент нанесения АКЗ (опционально)"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50 bg-white dark:bg-zinc-900"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Категория знаний</label>
                    <select
                      value={aiUploadCategory}
                      onChange={(e) => setAiUploadCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/50 cursor-pointer"
                    >
                      <option value="tech">Технологии и инструкции (АКЗ, огнезащита)</option>
                      <option value="price">Прайс-листы, нормы расхода, тарифы</option>
                      <option value="legal">Договоры, СНиП, ГОСТ, юриспруденция</option>
                      <option value="hr">Регламенты для сотрудников (HR)</option>
                      <option value="general">Общая база знаний</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Файл (.pdf, .docx, .txt, .md) <span className="text-red-500">*</span></label>
                    <input
                      type="file"
                      onChange={(e) => setAiUploadFile(e.target.files?.[0] || null)}
                      accept=".pdf,.docx,.txt,.md,.html"
                      className="w-full text-xs text-gray-500 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500/10 file:text-purple-600 hover:file:bg-purple-500/20 cursor-pointer"
                      required
                    />
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAiUploadModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  Закрыть
                </button>
                {!aiUploadResult && (
                  <button
                    type="submit"
                    disabled={isAiUploading}
                    className="flex items-center justify-center px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-lg text-xs font-bold select-none cursor-pointer shadow-md shadow-indigo-500/20"
                  >
                    {isAiUploading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Индексация в Pinecone...
                      </>
                    ) : (
                      "🚀 Проиндексировать в RAG"
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-['Inter']">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4.5 h-4.5 text-indigo-600" /> Отправить документ клиенту
              </h3>
              <button
                onClick={() => setIsEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-zinc-400 font-bold text-lg cursor-pointer border-0 bg-transparent"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Файл во вложении</label>
                <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-lg flex items-center gap-2 text-xs font-semibold text-gray-700 dark:text-zinc-200">
                  <File className="w-4 h-4 text-indigo-500" />
                  <span>{emailDocName}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Email Получателя <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="client@company.ru"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Тема письма</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder="Документ от СФЕРА"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Сообщение</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              {emailError && (
                <div className="p-3 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <span>{emailError}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="p-3 rounded-lg text-xs bg-green-50 text-green-700 border border-green-200 flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  <span>Отправлено успешно! Закрытие окна...</span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-bold text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail || emailSuccess === true}
                  className="flex items-center justify-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold select-none cursor-pointer"
                >
                  {isSendingEmail ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Отправка...
                    </>
                  ) : (
                    "Отправить Email"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
