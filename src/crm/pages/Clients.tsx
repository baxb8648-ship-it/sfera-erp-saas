import React, { useState } from 'react';
import { Upload, Plus, Search, FileText, Edit2, Trash2, X, Download, TrendingUp, Wallet, Building2, FileCheck, Check, Mail, Sparkles } from 'lucide-react';
import { GodTierModal } from '../components/GodTierModal';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../api/client';

interface Client {
  id: number;
  name: string;
  inn: string | null;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  segment: string | null;
  status: string | null;
  notes: string | null;
  kpp: string | null;
  legal_address: string | null;
  ogrn: string | null;
  bank_name: string | null;
  bik: string | null;
  rs: string | null;
  ks: string | null;
  created_at: string;
  custom_fields?: Record<string, any>;
}

const standardMaterials = [
  "Грунт-эмаль антикоррозийная быстросохнущая",
  "Эмаль полиуретановая финишная двухупаковочная",
  "Грунтовка эпоксидная цинконаполненная",
  "Купершлак (фракция 0.5-2.5 мм)",
  "Растворитель ортоксилол нефтяной",
  "Огнезащитный состав для металлоконструкций",
  "Валик малярный полиакриловый 250мм",
  "Кисть плоская натуральная щетина 75мм"
];

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

export const Clients: React.FC = () => {
  const { data: clients = [], isLoading, refetch: fetchClients } = useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => apiClient.get('/clients/')
  });

  const { data: settings = {} } = useQuery({
    queryKey: ['settings'],
    queryFn: () => apiClient.get('/settings/')
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [activeSegmentTab, setActiveSegmentTab] = useState<string>('Все');
  const [, setIsUploading] = useState(false);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Client Details Card state
  const [isCardOpen, setIsCardOpen] = useState(false);
  const [activeCardTab, setActiveCardTab] = useState<'details' | 'objects' | 'documents' | 'finance'>('details');
  const [allObjects, setAllObjects] = useState<any[]>([]);
  const [allDocuments, setAllDocuments] = useState<any[]>([]);
  const [allTransactions, setAllTransactions] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isSavingCardNotes, setIsSavingCardNotes] = useState(false);

  // KP Constructor states
  const [isKPModalOpen, setIsKPModalOpen] = useState(false);
  const [kpSegment, setKpSegment] = useState('Нефтегаз');
  const [kpObjectId, setKpObjectId] = useState('');
  const [kpItems, setKpItems] = useState<{ name: string; quantity: number; unit: string; price: number }[]>([]);
  const [kpCustomNumber, setKpCustomNumber] = useState('');
  const [kpCustomDate, setKpCustomDate] = useState('');

  // Invoice Constructor states
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [invoiceSegment, setInvoiceSegment] = useState('Нефтегаз');
  const [invoiceObjectId, setInvoiceObjectId] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<{ name: string; quantity: number; unit: string; price: number }[]>([]);
  const [invoiceAccountType, setInvoiceAccountType] = useState<'works' | 'materials'>('works');
  const [invoiceNdsRate, setInvoiceNdsRate] = useState<string>('Без НДС');
  const [invoiceCustomNumber, setInvoiceCustomNumber] = useState('');
  const [invoiceCustomDate, setInvoiceCustomDate] = useState('');

  const [genObjectId, setGenObjectId] = useState('');
  const [customDocNumber, setCustomDocNumber] = useState('');
  const [customDocDate, setCustomDocDate] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [isGeneratingDoc, setIsGeneratingDoc] = useState(false);

  // Email Send Modal states
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailDocId, setEmailDocId] = useState<number | null>(null);
  const [emailClient, setEmailClient] = useState<Client | null>(null);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<boolean | null>(null);
  const [emailError, setEmailError] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    inn: '',
    contact_person: '',
    phone: '',
    email: '',
    segment: 'Нефтегаз',
    status: 'Новый',
    notes: '',
    kpp: '',
    legal_address: '',
    ogrn: '',
    bank_name: '',
    bik: '',
    rs: '',
    ks: '',
    custom_fields: {} as Record<string, any>
  });

  const { data: fieldTemplates = [] } = useQuery<any[]>({
    queryKey: ['fieldTemplates', 'client'],
    queryFn: () => apiClient.get(`/field-templates/?entity_type=client`),
    enabled: isModalOpen,
  });

  const [formError, setFormError] = useState('');
  const [expandedNotes, setExpandedNotes] = useState<Record<number, boolean>>({});
  const [deleteClientId, setDeleteClientId] = useState<number | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  React.useEffect(() => {
    setSelectedIds([]);
  }, [activeSegmentTab, searchQuery]);

  const segmentsMapping = [
    { label: 'Все', dbValue: 'Все' },
    { label: 'Нефтегаз', dbValue: 'Нефтегаз' },
    { label: 'Муниципальные', dbValue: 'Муниципальные учреждения' },
    { label: 'Агросектор', dbValue: 'Агросектор' },
    { label: 'Коммерческие', dbValue: 'Коммерческая недвижимость' },
    { label: 'ТЭК/ТЭС', dbValue: 'ТЭК/ТЭС' }
  ];

  const segments = ["Нефтегаз", "Муниципальные учреждения", "Агросектор", "Коммерческая недвижимость", "ТЭК/ТЭС"];
  const statuses = ["Новый", "Переговоры", "Выезд на аудит", "КП отправлено", "Договор", "В работе", "Завершено"];

  const fetchRelatedData = async () => {
    try {
      const [objs, docs, txs, tmpls] = await Promise.all([
        apiClient.get('/objects/'),
        apiClient.get('/documents/'),
        apiClient.get('/finance/'),
        apiClient.get('/templates/')
      ]);

      if (objs) setAllObjects(objs);
      if (docs) setAllDocuments(docs);
      if (txs) setAllTransactions(txs);
      if (tmpls) setTemplates(tmpls);

      return { objs: objs || [], docs: docs || [] };
    } catch (e) {
      console.error("Failed to fetch related data", e);
      return { objs: [], docs: [] };
    }
  };

  const handleOpenEmailModal = async (client: Client, preselectedDocId: number | null = null) => {
    setEmailClient(client);
    setEmailRecipient(client.email || '');
    setEmailError('');
    setEmailSuccess(null);
    setIsSendingEmail(false);
    
    // Fetch all related data synchronously
    const { objs, docs } = await fetchRelatedData();

    setEmailDocId(preselectedDocId);
    updateEmailContent(client, preselectedDocId, objs, docs);
    setIsEmailModalOpen(true);
  };

  const updateEmailContent = (client: Client, docId: number | null, customObjs?: any[], customDocs?: any[]) => {
    let template = '';
    let docName = '';
    let objectName = 'Без объекта';

    const docsList = customDocs || allDocuments;
    const objsList = customObjs || allObjects;

    const clientDocs = docsList.filter((d: any) => d.client_id === client.id);
    const doc = docId ? clientDocs.find((d: any) => d.id === docId) : null;

    if (doc) {
      docName = doc.name || '';
      if (doc.doc_type === 'contract') {
        template = settings.email_template_contract || '';
      } else if (doc.doc_type === 'act') {
        template = settings.email_template_act || '';
      } else if (doc.doc_type === 'kp') {
        template = settings.email_template_kp || '';
      } else if (doc.doc_type === 'invoice') {
        template = settings.email_template_invoice || '';
      } else if (doc.doc_type === 'factura') {
        template = settings.email_template_invoice || '';
      } else if (doc.doc_type === 'upd') {
        template = settings.email_template_invoice || '';
      } else {
        template = settings.email_template_other || '';
      }
      
      const matchedObject = objsList.find((o: any) => o.id === doc.object_id);
      if (matchedObject) {
        objectName = matchedObject.name;
      }
    } else {
      template = settings.email_template_other || '';
    }

    const contactName = client.contact_person || 'Уважаемый партнер';
    const repText = template
      .replace(/\{\{client_name\}\}/g, client.name || '')
      .replace(/\{\{client_contact\}\}/g, contactName)
      .replace(/\{\{doc_name\}\}/g, docName)
      .replace(/\{\{object_name\}\}/g, objectName)
      .replace(/\{\{company_name\}\}/g, settings.company_name || 'СФЕРА')
      .replace(/\{\{company_phone\}\}/g, settings.company_phone || '');

    setEmailSubject(docName || 'Документ от СФЕРА');
    setEmailBody(repText);
  };

  const handleSendEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailRecipient) {
      alert("Пожалуйста, укажите email получателя");
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
          doc_id: emailDocId || undefined,
          recipient_email: emailRecipient,
          subject: emailSubject,
          body: emailBody
        })
      });
      const data = await response.json();
      if (response.ok) {
        setEmailSuccess(true);
        setTimeout(() => {
          setIsEmailModalOpen(false);
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

  const handleOpenCard = async (client: Client) => {
    setSelectedClient(client);
    setIsCardOpen(true);
    setActiveCardTab('details');
    setGenObjectId('');
    setCustomDocNumber('');
    setCustomDocDate('');
    setSelectedTemplateId('');
    await fetchRelatedData();
  };

  const handleOpenCreateModal = () => {
    setModalMode('create');
    setFormData({
      name: '',
      inn: '',
      contact_person: '',
      phone: '',
      email: '',
      segment: 'Нефтегаз',
      status: 'Новый',
      notes: '',
      kpp: '',
      legal_address: '',
      ogrn: '',
      bank_name: '',
      bik: '',
      rs: '',
      ks: '',
      custom_fields: {}
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (client: Client) => {
    setModalMode('edit');
    setSelectedClient(client);
    setFormData({
      name: client.name || '',
      inn: client.inn || '',
      contact_person: client.contact_person || '',
      phone: client.phone || '',
      email: client.email || '',
      segment: client.segment || 'Нефтегаз',
      status: client.status || 'Новый',
      notes: client.notes || '',
      kpp: client.kpp || '',
      legal_address: client.legal_address || '',
      ogrn: client.ogrn || '',
      bank_name: client.bank_name || '',
      bik: client.bik || '',
      rs: client.rs || '',
      ks: client.ks || '',
      custom_fields: (client as any).custom_fields || {}
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const [isLookingUpINN, setIsLookingUpINN] = useState(false);

  const handleLookupINN = async () => {
    if (!formData.inn.trim()) {
      alert("Введите ИНН для автоматического поиска");
      return;
    }
    const inn = formData.inn.trim();
    if (!/^\d{10}$|^\d{12}$/.test(inn)) {
      alert("ИНН должен состоять из 10 или 12 цифр");
      return;
    }

    setIsLookingUpINN(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/clients/lookup-inn/${inn}`, {
        headers: {
        }
      });
      if (response.ok) {
        const data = await response.json();
        setFormData(prev => ({
          ...prev,
          name: data.name || prev.name,
          kpp: data.kpp || prev.kpp || '',
          ogrn: data.ogrn || prev.ogrn || '',
          legal_address: data.legal_address || prev.legal_address || '',
          contact_person: data.contact_person || prev.contact_person || '',
          bank_name: data.bank_name || prev.bank_name || '',
          bik: data.bik || prev.bik || '',
          rs: data.rs || prev.rs || '',
          ks: data.ks || prev.ks || ''
        }));
      } else {
        const err = await response.json();
        alert(err.detail || "Компания с таким ИНН не найдена в реестре");
      }
    } catch (e) {
      console.error(e);
      alert("Ошибка подключения к серверу при поиске ИНН");
    } finally {
      setIsLookingUpINN(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Название компании обязательно');
      return;
    }
    const url = modalMode === 'create' 
      ? (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/clients/' 
      : `${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/clients/${selectedClient?.id}`;
    
    const method = modalMode === 'create' ? 'POST' : 'PUT';

    try {
      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          inn: formData.inn || null,
          contact_person: formData.contact_person || null,
          phone: formData.phone || null,
          email: formData.email || null,
          segment: formData.segment,
          status: formData.status,
          notes: formData.notes || null,
          kpp: formData.kpp || null,
          legal_address: formData.legal_address || null,
          ogrn: formData.ogrn || null,
          bank_name: formData.bank_name || null,
          bik: formData.bik || null,
          rs: formData.rs || null,
          ks: formData.ks || null,
          custom_fields: formData.custom_fields
        })
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchClients();
        if (isCardOpen && selectedClient) {
          // Update selected client in card as well
          const updated = await response.json();
          setSelectedClient(updated);
        }
      } else {
        const errData = await response.json();
        setFormError(errData.detail || 'Ошибка сохранения данных');
      }
    } catch (error) {
      setFormError('Сетевая ошибка при сохранении');
    }
  };

  const handleSaveCardNotes = async (newNotes: string) => {
    if (!selectedClient) return;
    setIsSavingCardNotes(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/clients/${selectedClient.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: selectedClient.name,
          inn: selectedClient.inn,
          contact_person: selectedClient.contact_person,
          phone: selectedClient.phone,
          email: selectedClient.email,
          segment: selectedClient.segment,
          status: selectedClient.status,
          notes: newNotes || null
        })
      });
      if (response.ok) {
        const updated = await response.json();
        setSelectedClient(updated);
        fetchClients();
      } else {
        alert("Не удалось сохранить заметку");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка");
    } finally {
      setIsSavingCardNotes(false);
    }
  };

  const handleDeleteClient = (id: number) => {
    setDeleteClientId(id);
  };

  const handleDeleteClientConfirm = async () => {
    if (deleteClientId === null) return;
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/clients/${deleteClientId}`, {
        method: 'DELETE',
        headers: {
        }
      });

      if (response.ok) {
        setIsCardOpen(false);
        setDeleteClientId(null);
        setSelectedIds(prev => prev.filter(id => id !== deleteClientId));
        fetchClients();
      } else {
        alert('Ошибка при удалении клиента');
      }
    } catch (error) {
      console.error(error);
      alert('Сетевая ошибка при удалении');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const confirmBulkDelete = async () => {
    setIsBulkDeleteModalOpen(false);
    try {
      for (const id of selectedIds) {
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/clients/${id}`, {
          method: 'DELETE'
        });
      }
      setSelectedIds([]);
      fetchClients();
    } catch (e) {
      console.error(e);
      alert("Ошибка при удалении некоторых клиентов");
      fetchClients();
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      setIsUploading(true);
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/clients/import-xml', {
        method: 'POST',
        headers: {
        },
        body: formData,
      });
      
      if (response.ok) {
        alert('Клиенты успешно загружены!');
        fetchClients();
      } else {
        alert('Ошибка при загрузке XML');
      }
    } catch (error) {
      console.error(error);
      alert('Сетевая ошибка при загрузке XML');
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportExcel = async () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const url = `${baseUrl}/export/clients`;
    try {
      const headers: Record<string, string> = {
        'ngrok-skip-browser-warning': '69420'
      };
      
      const response = await fetch(url, { headers });
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        
        const disposition = response.headers.get('content-disposition');
        let filename = `clients_export_${new Date().toISOString().slice(0, 10)}.xlsx`;
        if (disposition && disposition.includes('filename=')) {
          const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
          if (filenameMatch && filenameMatch[1]) {
            filename = decodeURIComponent(filenameMatch[1]);
          }
        }
        
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(() => {
          window.URL.revokeObjectURL(downloadUrl);
        }, 5000);
      } else {
        alert("Не удалось экспортировать данные в Excel.");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при экспорте в Excel");
    }
  };

  const handleGenerateCardPDF = async (docType: string) => {
    if (!selectedClient) return;
    
    setIsGeneratingDoc(true);
    const params = new URLSearchParams();
    if (genObjectId) params.append('object_id', genObjectId);
    if (customDocNumber) params.append('custom_number', customDocNumber);
    if (customDocDate) {
      const parts = customDocDate.split('-');
      if (parts.length === 3) {
        params.append('custom_date', `${parts[2]}.${parts[1]}.${parts[0]}`);
      } else {
        params.append('custom_date', customDocDate);
      }
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/documents/generate/${selectedClient.id}/${docType}${queryString}`, {
        method: 'POST',
        headers: {}
      });
      
      if (response.ok) {
        const data = await response.json();
        // Force refresh documents
        await fetchRelatedData();
        downloadDocumentFile(data.id, '');
      } else {
        alert("Ошибка генерации документа");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleGenerateFromTemplate = async () => {
    if (!selectedClient || !selectedTemplateId) return;
    
    setIsGeneratingDoc(true);
    const params = new URLSearchParams();
    params.append('client_id', selectedClient.id.toString());
    if (genObjectId) params.append('object_id', genObjectId);
    if (customDocNumber) params.append('custom_number', customDocNumber);
    if (customDocDate) {
      const parts = customDocDate.split('-');
      if (parts.length === 3) {
        params.append('custom_date', `${parts[2]}.${parts[1]}.${parts[0]}`);
      } else {
        params.append('custom_date', customDocDate);
      }
    }
    const queryString = params.toString() ? `?${params.toString()}` : '';
    
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/documents/generate-from-template/${selectedTemplateId}${queryString}`, {
        method: 'POST',
        headers: {}
      });
      
      if (response.ok) {
        const data = await response.json();
        await fetchRelatedData();
        downloadDocumentFile(data.id, '');
      } else {
        const err = await response.json();
        alert(err.detail || "Ошибка генерации документа по шаблону");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  // segmentServices dictionary
  const segmentServices: Record<string, string[]> = {
    "Нефтегаз": [
      "Пескоструйная очистка Sa 2.5",
      "Антикоррозийное покрытие в 3 слоя",
      "Толщинометрия и контроль адгезии",
      "Огнезащита несущих конструкций",
      "АКЗ резервуаров РВС-1000",
      "АКЗ резервуаров РВС-2000",
      "Очистка медным шлаком (купершлак)"
    ],
    "Муниципальные учреждения": [
      "Покраска фасадов зданий (акрил)",
      "Гидроизоляция цоколя и фундамента",
      "Огнебиозащитная пропитка чердаков",
      "Нанесение разметки парковок",
      "Очистка стен от граффити и высолов"
    ],
    "Агросектор": [
      "Очистка и покраска силосов",
      "Гидроизоляция навозохранилищ",
      "Санитарно-гигиеническая обработка",
      "Покраска элеваторов и зернотоков",
      "Защитная покраска комбайнов"
    ],
    "ТЭК/ТЭС": [
      "Очистка и покраска дымовых труб",
      "АКЗ металлических ферм и опор",
      "Гидроизоляция градирен",
      "Огнезащита кабельных проходок",
      "Покраска трансформаторов"
    ],
    "Коммерческая недвижимость": [
      "Устройство эпоксидных полов",
      "Гидромонтаж и гидроизоляция кровли",
      "Покраска интерьеров (офисы)",
      "Очистка и обеспыливание ферм",
      "Нанесение пожарной маркировки"
    ]
  };

  const handleOpenKPConstructor = () => {
    if (!selectedClient) return;
    setKpSegment(selectedClient.segment || "Нефтегаз");
    setKpObjectId(genObjectId);
    setKpCustomNumber('');
    setKpCustomDate('');
    
    // Predetermine one initial service based on segment
    const defaultServices = segmentServices[selectedClient.segment || "Нефтегаз"] || [];
    const firstService = defaultServices[0] || "Пескоструйная очистка Sa 2.5";
    
    setKpItems([
      { name: firstService, quantity: 150, unit: "м2", price: 450 }
    ]);
    setIsKPModalOpen(true);
  };

  const handleAddServiceFromTag = (serviceName: string) => {
    if (kpItems.some(item => item.name === serviceName)) return;
    setKpItems(prev => [...prev, { name: serviceName, quantity: 100, unit: "м2", price: 350 }]);
  };

  const handleAddCustomItem = () => {
    setKpItems(prev => [...prev, { name: "", quantity: 1, unit: "шт", price: 1000 }]);
  };

  const handleRemoveKPItem = (idx: number) => {
    setKpItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateKPItem = (idx: number, field: string, value: any) => {
    setKpItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleGenerateKP = async () => {
    if (!selectedClient) return;
    if (kpItems.length === 0) {
      alert("Добавьте хотя бы одну услугу в КП");
      return;
    }
    
    // Validate that name is filled for all items
    if (kpItems.some(i => !i.name.trim())) {
      alert("Заполните наименование для всех услуг");
      return;
    }

    setIsGeneratingDoc(true);
    const payload: any = {
      client_id: selectedClient.id,
      object_id: kpObjectId ? parseInt(kpObjectId) : null,
      segment: kpSegment,
      items: kpItems
    };
    if (kpCustomNumber) payload.custom_number = kpCustomNumber;
    if (kpCustomDate) {
      const parts = kpCustomDate.split('-');
      if (parts.length === 3) {
        payload.custom_date = `${parts[2]}.${parts[1]}.${parts[0]}`;
      } else {
        payload.custom_date = kpCustomDate;
      }
    }
    
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/documents/generate-kp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setIsKPModalOpen(false);
        await fetchRelatedData();
        downloadDocumentFile(data.id, '');
      } else {
        alert("Ошибка генерации КП");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при генерации КП");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleOpenInvoiceConstructor = () => {
    if (!selectedClient) return;
    setInvoiceSegment(selectedClient.segment || "Нефтегаз");
    setInvoiceObjectId(genObjectId);
    setInvoiceAccountType('works');
    setInvoiceCustomNumber('');
    setInvoiceCustomDate('');
    
    const defaultServices = segmentServices[selectedClient.segment || "Нефтегаз"] || [];
    const firstService = defaultServices[0] || "Пескоструйная очистка Sa 2.5";
    
    setInvoiceItems([
      { name: firstService, quantity: 150, unit: "м2", price: 450 }
    ]);
    setIsInvoiceModalOpen(true);
  };

  const handleAddServiceFromTagInvoice = (serviceName: string) => {
    if (invoiceItems.some(item => item.name === serviceName)) return;
    setInvoiceItems(prev => [...prev, { name: serviceName, quantity: 100, unit: "м2", price: 350 }]);
  };

  const handleAddCustomItemInvoice = () => {
    setInvoiceItems(prev => [...prev, { name: "", quantity: 1, unit: "шт", price: 1000 }]);
  };

  const handleRemoveInvoiceItem = (idx: number) => {
    setInvoiceItems(prev => prev.filter((_, i) => i !== idx));
  };

  const handleUpdateInvoiceItem = (idx: number, field: string, value: any) => {
    setInvoiceItems(prev => prev.map((item, i) => {
      if (i === idx) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleGenerateInvoice = async () => {
    if (!selectedClient) return;
    if (invoiceItems.length === 0) {
      alert("Добавьте хотя бы одну позицию в счет");
      return;
    }
    
    if (invoiceItems.some(i => !i.name.trim())) {
      alert("Заполните наименование для всех позиций");
      return;
    }

    setIsGeneratingDoc(true);
    const payload: any = {
      client_id: selectedClient.id,
      object_id: invoiceObjectId ? parseInt(invoiceObjectId) : null,
      segment: invoiceSegment,
      items: invoiceItems,
      account_type: invoiceAccountType,
      nds_rate: invoiceNdsRate
    };
    if (invoiceCustomNumber) payload.custom_number = invoiceCustomNumber;
    if (invoiceCustomDate) {
      const parts = invoiceCustomDate.split('-');
      if (parts.length === 3) {
        payload.custom_date = `${parts[2]}.${parts[1]}.${parts[0]}`;
      } else {
        payload.custom_date = invoiceCustomDate;
      }
    }

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/documents/generate-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setIsInvoiceModalOpen(false);
        await fetchRelatedData();
        downloadDocumentFile(data.id, '');
      } else {
        alert("Ошибка генерации счета");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при генерации счета");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleGenerateFactura = async () => {
    if (!selectedClient) return;
    if (invoiceItems.length === 0) {
      alert("Добавьте хотя бы одну позицию в счет-фактуру");
      return;
    }
    
    if (invoiceItems.some(i => !i.name.trim())) {
      alert("Заполните наименование для всех позиций");
      return;
    }

    setIsGeneratingDoc(true);
    const payload: any = {
      client_id: selectedClient.id,
      object_id: invoiceObjectId ? parseInt(invoiceObjectId) : null,
      segment: invoiceSegment,
      items: invoiceItems,
      account_type: invoiceAccountType,
      nds_rate: invoiceNdsRate
    };
    if (invoiceCustomNumber) payload.custom_number = invoiceCustomNumber;
    if (invoiceCustomDate) {
      const parts = invoiceCustomDate.split('-');
      if (parts.length === 3) {
        payload.custom_date = `${parts[2]}.${parts[1]}.${parts[0]}`;
      } else {
        payload.custom_date = invoiceCustomDate;
      }
    }

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/documents/generate-factura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setIsInvoiceModalOpen(false);
        await fetchRelatedData();
        downloadDocumentFile(data.id, '');
      } else {
        alert("Ошибка генерации счет-фактуры");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при генерации счет-фактуры");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const handleGenerateUPD = async () => {
    if (!selectedClient) return;
    if (invoiceItems.length === 0) {
      alert("Добавьте хотя бы одну позицию в УПД");
      return;
    }
    
    if (invoiceItems.some(i => !i.name.trim())) {
      alert("Заполните наименование для всех позиций");
      return;
    }

    setIsGeneratingDoc(true);
    const payload: any = {
      client_id: selectedClient.id,
      object_id: invoiceObjectId ? parseInt(invoiceObjectId) : null,
      segment: invoiceSegment,
      items: invoiceItems,
      account_type: invoiceAccountType,
      nds_rate: invoiceNdsRate
    };
    if (invoiceCustomNumber) payload.custom_number = invoiceCustomNumber;
    if (invoiceCustomDate) {
      const parts = invoiceCustomDate.split('-');
      if (parts.length === 3) {
        payload.custom_date = `${parts[2]}.${parts[1]}.${parts[0]}`;
      } else {
        payload.custom_date = invoiceCustomDate;
      }
    }

    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/documents/generate-upd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        setIsInvoiceModalOpen(false);
        await fetchRelatedData();
        downloadDocumentFile(data.id, '');
      } else {
        alert("Ошибка генерации УПД");
      }
    } catch (e) {
      console.error(e);
      alert("Сетевая ошибка при генерации УПД");
    } finally {
      setIsGeneratingDoc(false);
    }
  };

  const toggleNote = (id: number) => {
    setExpandedNotes(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Filter clients by search query and segment tab
  const filteredClients = clients.filter(c => {
    const query = searchQuery.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(query);
    const innMatch = c.inn?.toLowerCase().includes(query);
    const contactMatch = c.contact_person?.toLowerCase().includes(query);
    const notesMatch = c.notes?.toLowerCase().includes(query);
    const matchesSearch = nameMatch || innMatch || contactMatch || notesMatch;

    if (activeSegmentTab === 'Все') {
      return matchesSearch;
    }
    return matchesSearch && c.segment === activeSegmentTab;
  });

  // Count clients for each tab
  const getTabCount = (dbValue: string) => {
    if (dbValue === 'Все') return clients.length;
    return clients.filter(c => c.segment === dbValue).length;
  };

  // Filter objects, docs, transactions for the selected client
  const clientObjectsFiltered = selectedClient ? allObjects.filter(obj => obj.client_id === selectedClient.id) : [];
  const clientDocsFiltered = selectedClient ? allDocuments.filter(doc => doc.client_id === selectedClient.id) : [];
  const clientTransactionsFiltered = selectedClient ? allTransactions.filter(t => t.client_id === selectedClient.id) : [];

  // Calculate finance metrics for selected client
  const clientTotalIncome = clientTransactionsFiltered
    .filter(t => t.transaction_type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const clientTotalExpense = clientTransactionsFiltered
    .filter(t => t.transaction_type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const clientBalance = clientTotalIncome - clientTotalExpense;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Клиенты | СФЕРА</title>
      </Helmet>
      {/* Топ панель действий */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input 
            type="text" 
            placeholder="Поиск по ИНН, названию, контакту или заметкам..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-gray-900 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 placeholder-gray-400 dark:placeholder-zinc-500"
          />
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="flex items-center justify-center px-3 py-2 sm:px-4 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 active:scale-95 rounded-lg transition-all duration-200 font-medium select-none cursor-pointer text-xs sm:text-sm w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
              <span className="truncate">Удалить ({selectedIds.length})</span>
            </button>
          )}

          {/* Кнопка экспорта Excel */}
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center px-2 py-2 sm:px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 active:bg-emerald-800 transition-all duration-150 font-medium shadow-sm select-none cursor-pointer text-xs sm:text-sm w-full sm:w-auto"
          >
            <Download className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="truncate">Экспорт</span>
          </button>

          {/* Кнопка импорта XML */}
          <label className="flex items-center justify-center px-2 py-2 sm:px-4 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 rounded-lg hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-95 cursor-pointer transition-all duration-150 font-medium select-none text-xs sm:text-sm w-full sm:w-auto">
            <Upload className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="truncate">Импорт XML</span>
            <input 
              type="file" 
              accept=".xml" 
              className="hidden" 
              onChange={handleFileUpload}
              disabled={isLoading}
            />
          </label>
          
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center justify-center px-2 py-2 sm:px-4 bg-[#F95700] text-white rounded-lg hover:bg-[#E04D00] active:scale-95 active:bg-[#B83D00] transition-all duration-150 font-medium shadow-sm select-none cursor-pointer text-xs sm:text-sm w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-1.5 sm:mr-2 shrink-0" />
            <span className="truncate">Добавить</span>
          </button>
        </div>
      </div>

      {/* Подразделы по сегментам (Категории) */}
      <div className="flex flex-wrap gap-2 pb-1 border-b border-gray-200 dark:border-zinc-800">
        {segmentsMapping.map((tab) => {
          const isActive = activeSegmentTab === tab.dbValue;
          const count = getTabCount(tab.dbValue);
          return (
            <button
              key={tab.label}
              onClick={() => setActiveSegmentTab(tab.dbValue)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 active:scale-95 select-none cursor-pointer flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#F95700]/10 text-[#F95700] border-b-2 border-[#F95700]'
                  : 'text-gray-500 dark:text-zinc-400 hover:text-[#1a1a1a] dark:text-zinc-100 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-[#F95700] text-white' : 'bg-gray-200 text-gray-600 dark:text-zinc-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Таблица */}
      <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600 dark:text-zinc-400">
            <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 font-medium text-gray-700 dark:text-zinc-200">
              <tr>
                <th className="px-6 py-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={filteredClients.length > 0 && selectedIds.length === filteredClients.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedIds(filteredClients.map(c => c.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                    className="rounded border-gray-300 dark:border-zinc-800 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                  />
                </th>
                <th className="px-6 py-4 w-64 max-w-[260px]">Название компании</th>
                <th className="px-6 py-4">ИНН</th>
                <th className="px-6 py-4">Контактное лицо</th>
                <th className="px-6 py-4">Контакты</th>
                <th className="px-6 py-4">Сегмент</th>
                <th className="px-6 py-4">Статус</th>
                <th className="px-6 py-4 text-right">Действия</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, skeletonIdx) => (
                  <tr key={`skeleton-${skeletonIdx}`} className="border-b border-gray-50 animate-pulse">
                    <td className="px-6 py-4 w-12 text-center">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-850 rounded w-4 mx-auto" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-40 mb-1.5" />
                      <div className="h-3 bg-zinc-150 dark:bg-zinc-850 rounded w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-3.5 bg-zinc-200 dark:bg-zinc-800 rounded w-32 mb-1" />
                      <div className="h-3 bg-zinc-150 dark:bg-zinc-850 rounded w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-md w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-6 bg-zinc-100 dark:bg-zinc-800 rounded-full w-20" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="w-8 h-8 bg-zinc-150 dark:bg-zinc-800 rounded" />
                        <div className="w-8 h-8 bg-zinc-150 dark:bg-zinc-800 rounded" />
                        <div className="w-8 h-8 bg-zinc-150 dark:bg-zinc-800 rounded" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <FileText className="w-12 h-12 mb-3 text-gray-300" />
                      <p>Нет данных о клиентах</p>
                      {searchQuery && <p className="text-xs mt-1">Попробуйте изменить поисковый запрос</p>}
                      {!searchQuery && <p className="text-xs mt-1">Загрузите XML или добавьте вручную</p>}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr 
                    key={client.id} 
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer group"
                    onClick={() => handleOpenCard(client)}
                  >
                    <td className="px-6 py-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(client.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, client.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== client.id));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-zinc-800 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#1a1a1a] dark:text-zinc-100 w-64 max-w-[260px]">
                      <div className="group-hover:text-[#F95700] transition-colors truncate" title={client.name}>{client.name}</div>
                      {client.notes && (
                        <div 
                          onClick={(e) => { e.stopPropagation(); toggleNote(client.id); }}
                          className={`text-xs font-normal mt-1 max-w-xs cursor-pointer select-none transition-colors duration-150 hover:text-[#F95700] ${
                            expandedNotes[client.id] 
                              ? 'text-gray-600 dark:text-zinc-400 whitespace-pre-wrap break-words border-l-2 border-[#F95700] pl-2 py-0.5' 
                              : 'text-gray-400 truncate italic'
                          }`}
                          title="Нажмите, чтобы развернуть/свернуть заметку"
                        >
                          {expandedNotes[client.id] ? client.notes : `Заметка: ${client.notes}`}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">{client.inn || '—'}</td>
                    <td className="px-6 py-4">{client.contact_person || '—'}</td>
                    <td className="px-6 py-4 text-xs space-y-0.5">
                      <div>{client.phone && `Тел: ${client.phone}`}</div>
                      <div>{client.email && `Email: ${client.email}`}</div>
                      {!client.phone && !client.email && '—'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                        {client.segment || 'Не указан'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                        client.status === 'Новый' ? 'bg-green-50 text-green-700' :
                        client.status === 'Переговоры' ? 'bg-yellow-50 text-yellow-700' :
                        client.status === 'Выезд на аудит' ? 'bg-blue-50 text-blue-700' :
                        client.status === 'КП отправлено' ? 'bg-purple-50 text-purple-700' :
                        client.status === 'Договор' ? 'bg-indigo-50 text-indigo-700' :
                        client.status === 'В работе' ? 'bg-orange-50 text-orange-700' :
                        client.status === 'Завершено' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200' : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-600 dark:text-zinc-400'
                      }`}>
                        {client.status || 'Новый'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        <button 
                          onClick={() => handleOpenEmailModal(client)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-all duration-100 active:scale-95 cursor-pointer"
                          title="Отправить Email"
                        >
                          <Mail className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleOpenEditModal(client)}
                          className="p-1.5 text-gray-400 hover:text-[#F95700] hover:bg-orange-50 rounded transition-all duration-100 active:scale-95 cursor-pointer"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteClient(client.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all duration-100 active:scale-95 cursor-pointer"
                          title="Удалить"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Список карточек для мобильных */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, idx) => (
            <div key={`skeleton-card-${idx}`} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-100 dark:border-zinc-800 shadow-sm animate-pulse space-y-3">
              <div className="h-4 bg-gray-200 rounded w-2/3" />
              <div className="h-3 bg-gray-150 rounded w-1/2" />
              <div className="h-5 bg-gray-100 dark:bg-zinc-800 rounded-md w-1/3" />
              <div className="flex justify-between items-center pt-2 border-t border-gray-50">
                <div className="h-6 bg-gray-200 rounded w-20" />
                <div className="flex gap-2">
                  <div className="w-8 h-8 bg-gray-150 rounded-full" />
                  <div className="w-8 h-8 bg-gray-150 rounded-full" />
                </div>
              </div>
            </div>
          ))
        ) : filteredClients.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-gray-100 dark:border-zinc-800 text-center text-gray-400 dark:text-zinc-505 shadow-sm">
            <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-zinc-700" />
            <p className="text-sm">Нет данных о клиентах</p>
          </div>
        ) : (
          filteredClients.map((client) => (
            <div 
              key={client.id}
              onClick={() => handleOpenCard(client)}
              className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-150 dark:border-zinc-800 shadow-sm hover:border-[#F95700]/30 transition-all active:scale-[0.99] cursor-pointer space-y-3"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-start gap-2.5">
                  <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(client.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, client.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== client.id));
                          }
                        }}
                        className="rounded border-gray-300 dark:border-zinc-700 dark:bg-zinc-800 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                      />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#1a1a1a] dark:text-white text-base leading-tight break-words">
                      {client.name}
                    </h4>
                    {client.inn && (
                      <span className="text-xs text-gray-400 dark:text-zinc-500 block mt-1">ИНН: {client.inn}</span>
                    )}
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                  client.status === 'Новый' ? 'bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400 dark:border dark:border-green-500/20' :
                  client.status === 'Переговоры' ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border dark:border-yellow-500/20' :
                  client.status === 'Выезд на аудит' ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border dark:border-blue-500/20' :
                  client.status === 'КП отправлено' ? 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400 dark:border dark:border-purple-500/20' :
                  client.status === 'Договор' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border dark:border-indigo-500/20' :
                  client.status === 'В работе' ? 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400 dark:border dark:border-orange-500/20' :
                  client.status === 'Завершено' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 dark:bg-zinc-800 dark:text-zinc-350 dark:border dark:border-zinc-700' : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-600 dark:text-zinc-400 dark:bg-zinc-850 dark:text-zinc-400'
                }`}>
                  {client.status || 'Новый'}
                </span>
              </div>

              {client.contact_person && (
                <div className="text-xs text-gray-600 dark:text-zinc-300">
                  <span className="text-gray-400 dark:text-zinc-500">Контакт:</span> {client.contact_person}
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-zinc-400 space-y-0.5">
                {client.phone && <div>Тел: {client.phone}</div>}
                {client.email && <div>Email: {client.email}</div>}
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-gray-100 dark:border-zinc-800">
                <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400 dark:border dark:border-blue-500/20">
                  {client.segment || 'Не указан'}
                </span>
                
                <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                  <button 
                    onClick={() => handleOpenEmailModal(client)}
                    className="p-2 text-gray-500 dark:text-zinc-450 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg active:scale-90 transition-all cursor-pointer"
                    title="Отправить Email"
                  >
                    <Mail className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleOpenEditModal(client)}
                    className="p-2 text-gray-500 dark:text-zinc-450 hover:text-[#F95700] dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-lg active:scale-90 transition-all cursor-pointer"
                    title="Редактировать"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDeleteClient(client.id)}
                    className="p-2 text-gray-500 dark:text-zinc-450 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg active:scale-90 transition-all cursor-pointer"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* -------------------- КАРТОЧКА КЛИЕНТА (ДЕТАЛЬНОЕ ОКНО) -------------------- */}
      {isCardOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 p-4 sm:p-6 transition-opacity duration-300 overflow-y-auto flex justify-center items-start">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-4xl shadow-2xl border border-gray-100 dark:border-zinc-800 flex flex-col my-8 h-max">
            
            {/* Шапка карточки */}
            <div className="p-6 sm:pr-16 border-b border-gray-200 dark:border-zinc-800 bg-gray-50/70 dark:bg-zinc-900/50 flex flex-col sm:flex-row justify-between items-start gap-4 relative">
              <button 
                onClick={() => setIsCardOpen(false)}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-[#1a1a1a] dark:text-zinc-100 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
                title="Закрыть"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="pr-8 sm:pr-0">
                <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-[#F95700]/10 text-[#F95700] mr-2">
                  ID: {selectedClient.id}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 mr-2">
                  {selectedClient.segment || 'Сегмент не указан'}
                </span>
                <h2 className="text-2xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100 mt-2 break-words">
                  {selectedClient.name}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-sm text-gray-500 dark:text-zinc-400">Текущий статус воронки:</span>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    selectedClient.status === 'Новый' ? 'bg-green-50 text-green-700' :
                    selectedClient.status === 'Переговоры' ? 'bg-yellow-50 text-yellow-700' :
                    selectedClient.status === 'Выезд на аудит' ? 'bg-blue-50 text-blue-700' :
                    selectedClient.status === 'КП отправлено' ? 'bg-purple-50 text-purple-700' :
                    selectedClient.status === 'Договор' ? 'bg-indigo-50 text-indigo-700' :
                    selectedClient.status === 'В работе' ? 'bg-orange-50 text-orange-700' :
                    selectedClient.status === 'Завершено' ? 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200' : 'bg-gray-50 dark:bg-zinc-800/50 text-gray-600 dark:text-zinc-400'
                  }`}>
                    {selectedClient.status}
                  </span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 items-center">
                <button 
                  onClick={() => handleOpenEmailModal(selectedClient)}
                  className="px-2.5 py-1.5 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-[11px] font-bold active:scale-95 transition-all select-none cursor-pointer flex items-center gap-1"
                  title="Отправить Email"
                >
                  <Mail className="w-3 h-3" /> Отправить Email
                </button>
                <button 
                  onClick={() => handleOpenEditModal(selectedClient)}
                  className="px-2.5 py-1.5 border border-gray-300 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 rounded-lg text-[11px] font-medium hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 active:scale-95 transition-all select-none cursor-pointer"
                >
                  Изменить профиль
                </button>
              </div>
            </div>

            {/* Вкладки карточки */}
            <div className="flex border-b border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-6">
              {[
                { id: 'details', label: 'Контакты и заметки' },
                { id: 'objects', label: `Проекты/Объекты (${clientObjectsFiltered.length})`, icon: Building2 },
                { id: 'documents', label: `Документы (${clientDocsFiltered.length})`, icon: FileText },
                { id: 'finance', label: `Финансы (${clientTransactionsFiltered.length})`, icon: Wallet }
              ].map(tab => {
                const isActive = activeCardTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveCardTab(tab.id as any)}
                    className={`py-3.5 px-4 font-semibold text-sm transition-all border-b-2 select-none cursor-pointer flex items-center gap-1.5 ${
                      isActive 
                        ? 'border-[#F95700] text-[#F95700]' 
                        : 'border-transparent text-gray-500 dark:text-zinc-400 hover:text-gray-800 dark:text-zinc-200'
                    }`}
                  >
                    {Icon && <Icon className="w-4 h-4" />}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Содержимое вкладок */}
            <div className="p-6 bg-zinc-50 dark:bg-zinc-950 space-y-6 rounded-b-2xl">
              
              {/* TAB 1: DETAILS AND NOTES */}
              {activeCardTab === 'details' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Реквизиты связи */}
                  <div className="md:col-span-1 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-4 shadow-sm flex flex-col">
                    <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider border-b pb-2 mb-1 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-[#F95700]" /> Связь и контакты
                    </h3>
                    <div className="space-y-3 flex-1">
                      <div>
                        <div className="text-xs text-gray-400">ИНН компании</div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-zinc-200">{selectedClient.inn || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Контактное лицо</div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-zinc-200">{selectedClient.contact_person || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Телефон</div>
                        <div className="text-sm font-semibold text-[#F95700]">{selectedClient.phone || '—'}</div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-400">Электронная почта</div>
                        <div className="text-sm font-semibold text-gray-800 dark:text-zinc-200">{selectedClient.email || '—'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Банковские реквизиты */}
                  <div className="md:col-span-1 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 space-y-3.5 shadow-sm flex flex-col">
                    <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider border-b pb-2 mb-1 flex items-center gap-1.5">
                      <Wallet className="w-4 h-4 text-[#F95700]" /> Банковские реквизиты
                    </h3>
                    <div className="space-y-2.5 text-xs flex-1 overflow-y-auto max-h-[350px] pr-1 scrollbar-thin">
                      <div>
                        <div className="text-gray-400 font-medium">Юридический адрес</div>
                        <div className="text-sm font-semibold text-gray-850 break-words leading-relaxed">
                          {selectedClient.legal_address || '—'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <div className="text-gray-400 font-medium">КПП</div>
                          <div className="text-sm font-semibold text-gray-850">{selectedClient.kpp || '—'}</div>
                        </div>
                        <div>
                          <div className="text-gray-400 font-medium">ОГРН</div>
                          <div className="text-sm font-semibold text-gray-850">{selectedClient.ogrn || '—'}</div>
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium">Наименование банка</div>
                        <div className="text-sm font-semibold text-gray-850 leading-normal">
                          {selectedClient.bank_name || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium">БИК банка</div>
                        <div className="text-sm font-semibold text-gray-850">{selectedClient.bik || '—'}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium">Расчетный счет (Р/С)</div>
                        <div className="text-sm font-mono font-semibold text-gray-850 bg-gray-50/70 p-1 rounded border border-gray-100 dark:border-zinc-800 tracking-wider">
                          {selectedClient.rs || '—'}
                        </div>
                      </div>
                      <div>
                        <div className="text-gray-400 font-medium">Корр. счет (К/С)</div>
                        <div className="text-sm font-mono font-semibold text-gray-850 bg-gray-50/70 p-1 rounded border border-gray-100 dark:border-zinc-800 tracking-wider">
                          {selectedClient.ks || '—'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Заметки */}
                  <div className="md:col-span-1 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col h-full shadow-sm">
                    <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider border-b pb-2 mb-3">
                      Заметки и особенности
                    </h3>
                    <textarea 
                      defaultValue={selectedClient.notes || ''}
                      id="cardNotesArea"
                      rows={8}
                      placeholder="Напишите особенности общения с клиентом, предпочтительный подход, личные нюансы, что обещали, условия по оплате..."
                      className="w-full p-3 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 text-sm flex-1 resize-none"
                    />
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          const area = document.getElementById('cardNotesArea') as HTMLTextAreaElement;
                          handleSaveCardNotes(area?.value);
                        }}
                        disabled={isSavingCardNotes}
                        className="px-4 py-2 bg-[#F95700] text-white text-xs font-semibold rounded-lg hover:bg-[#E04D00] active:scale-95 active:bg-[#B83D00] transition-all select-none cursor-pointer disabled:opacity-50"
                      >
                        {isSavingCardNotes ? 'Сохранение...' : 'Сохранить заметку'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Custom Fields in Details Tab */}
                {selectedClient && selectedClient.custom_fields && Object.keys(selectedClient.custom_fields).length > 0 && (
                  <div className="mt-6 bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm">
                    <h3 className="font-bold text-sm text-[#F95700] uppercase tracking-wider border-b pb-2 mb-3">
                      Дополнительные параметры
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {Object.entries(selectedClient.custom_fields).map(([key, val]) => {
                        const template = fieldTemplates.find(f => f.field_key === key);
                        const label = template?.field_label || key;
                        return (
                        <div key={key}>
                          <div className="text-xs text-gray-400 font-medium truncate" title={label}>{label}</div>
                          <div className="text-sm font-semibold text-gray-850 dark:text-zinc-200 mt-1">
                            {typeof val === 'boolean' ? (val ? 'Да' : 'Нет') : (val?.toString() || '—')}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                )}
                </div>
              )}

              {/* TAB 2: OBJECTS */}
              {activeCardTab === 'objects' && (
                <div className="space-y-4">
                  {clientObjectsFiltered.length === 0 ? (
                    <div className="bg-white dark:bg-zinc-900 p-8 rounded-xl border border-zinc-200 dark:border-zinc-700 text-center text-gray-400 dark:text-zinc-550 shadow-sm">
                      <Building2 className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-zinc-700" />
                      <p className="font-medium text-gray-600 dark:text-zinc-300">Нет зарегистрированных объектов</p>
                      <p className="text-xs mt-1 text-gray-400 dark:text-zinc-500">Добавьте объект во вкладке «Объекты»</p>
                    </div>
                  ) : (
                    <>
                      {/* Мобильный вид (карточки) */}
                      <div className="space-y-3 md:hidden">
                        {clientObjectsFiltered.map(obj => (
                          <div key={obj.id} className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 shadow-sm space-y-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 break-words">{obj.name}</h4>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 shrink-0">
                                {obj.status}
                              </span>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-zinc-150/40 dark:border-zinc-800/60">
                              <div>
                                <span className="text-zinc-400 block mb-0.5">Площадь:</span>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                  {obj.area_sqm ? `${obj.area_sqm.toLocaleString('ru-RU')} м²` : '—'}
                                </span>
                              </div>
                              <div>
                                <span className="text-zinc-400 block mb-0.5">Поверхность:</span>
                                <span className="font-medium text-zinc-700 dark:text-zinc-300 truncate block">
                                  {obj.surface_type || '—'}
                                </span>
                              </div>
                            </div>

                            <div className="pt-2 border-t border-zinc-150/40 dark:border-zinc-800/60 flex items-center justify-between text-xs">
                              <span className="text-zinc-400">Услуга:</span>
                              <span className="px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/20 text-[#F95700] dark:text-orange-400 font-medium border border-orange-100 dark:border-orange-900/30">
                                {obj.service_required || '—'}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Десктопный вид (таблица) */}
                      <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold">
                            <tr>
                              <th className="px-4 py-3">Название объекта</th>
                              <th className="px-4 py-3">Площадь, м²</th>
                              <th className="px-4 py-3">Поверхность</th>
                              <th className="px-4 py-3">Услуга</th>
                              <th className="px-4 py-3">Текущий статус</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientObjectsFiltered.map(obj => (
                              <tr key={obj.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="px-4 py-3 font-semibold text-[#1a1a1a] dark:text-zinc-100">{obj.name}</td>
                                <td className="px-4 py-3 text-gray-750 dark:text-zinc-300">{obj.area_sqm ? `${obj.area_sqm.toLocaleString('ru-RU')} м²` : '—'}</td>
                                <td className="px-4 py-3 text-xs text-gray-500 dark:text-zinc-400">{obj.surface_type || '—'}</td>
                                <td className="px-4 py-3 text-xs">
                                  <span className="px-2 py-0.5 rounded bg-orange-50 dark:bg-orange-950/20 text-[#F95700] dark:text-orange-400 font-medium border border-orange-100 dark:border-orange-900/30">
                                    {obj.service_required || '—'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                                    {obj.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* TAB 3: DOCUMENTS & GENERATOR */}
              {activeCardTab === 'documents' && (
                <div className="space-y-6">
                  {/* Док Генератор для этого клиента */}
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4 text-[#F95700]" /> Быстрая генерация PDF
                    </h3>
                    
                    <div className="bg-gray-50 dark:bg-zinc-800/50 p-4 rounded-lg space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Связать с объектом клиента:</label>
                          <select 
                            value={genObjectId}
                            onChange={(e) => setGenObjectId(e.target.value)}
                            className="w-full px-3 h-9 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-xs focus:ring-1 focus:ring-[#F95700] text-gray-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Без конкретного объекта (Общий бланк) --</option>
                            {clientObjectsFiltered.map(obj => (
                              <option key={obj.id} value={obj.id}>{obj.name}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Ручной № документа (необяз.):</label>
                          <input 
                            type="text" 
                            value={customDocNumber}
                            onChange={(e) => setCustomDocNumber(e.target.value)}
                            placeholder="Например, СЧ-10"
                            className="w-full px-3 h-9 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-xs focus:ring-1 focus:ring-[#F95700] text-gray-800 dark:text-zinc-200 placeholder-gray-400 focus:outline-none"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400">Ручная дата (необяз.):</label>
                          <input 
                            type="date" 
                            value={customDocDate}
                            onChange={(e) => setCustomDocDate(e.target.value)}
                            className="w-full px-3 h-9 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-xs focus:ring-1 focus:ring-[#F95700] text-gray-800 dark:text-zinc-200 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full pt-3 border-t border-gray-200 dark:border-zinc-800">
                        <button
                          onClick={handleOpenKPConstructor}
                          disabled={isGeneratingDoc}
                          className="py-2 px-3 bg-[#F95700]/10 hover:bg-[#F95700]/20 text-[#F95700] border border-[#F95700]/20 text-xs font-bold rounded-lg transition-all active:scale-95 text-center select-none cursor-pointer disabled:opacity-50"
                        >
                          Создать КП
                        </button>
                        <button
                          onClick={handleOpenInvoiceConstructor}
                          disabled={isGeneratingDoc}
                          className="py-2 px-3 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs font-bold rounded-lg transition-all active:scale-95 text-center select-none cursor-pointer disabled:opacity-50"
                        >
                          Создать Счет
                        </button>
                        <button
                          onClick={() => handleGenerateCardPDF('contract')}
                          disabled={isGeneratingDoc}
                          className="py-2 px-3 bg-gray-50 dark:bg-zinc-800/50 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 text-xs font-bold rounded-lg transition-all active:scale-95 text-center select-none cursor-pointer disabled:opacity-50"
                        >
                          Создать Договор
                        </button>
                        <button
                          onClick={() => handleGenerateCardPDF('act')}
                          disabled={isGeneratingDoc}
                          className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold rounded-lg transition-all active:scale-95 text-center select-none cursor-pointer disabled:opacity-50"
                        >
                          Создать Акт
                        </button>
                        <button
                          onClick={() => handleGenerateCardPDF('ks2')}
                          disabled={isGeneratingDoc}
                          className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 text-xs font-bold rounded-lg transition-all active:scale-95 text-center select-none cursor-pointer disabled:opacity-50 dark:bg-purple-950/20 dark:text-purple-300 dark:border-purple-900/30"
                        >
                          Создать КС-2
                        </button>
                        <button
                          onClick={() => handleGenerateCardPDF('ks3')}
                          disabled={isGeneratingDoc}
                          className="py-2 px-3 bg-pink-50 hover:bg-pink-100 text-pink-700 border border-pink-200 text-xs font-bold rounded-lg transition-all active:scale-95 text-center select-none cursor-pointer disabled:opacity-50 dark:bg-pink-950/20 dark:text-pink-300 dark:border-pink-900/30"
                        >
                          Создать КС-3
                        </button>
                      </div>
                      
                      {/* Свои шаблоны */}
                      {templates.length > 0 && (
                        <div className="pt-3 border-t border-gray-200 dark:border-zinc-800 flex items-center gap-3">
                          <select
                            value={selectedTemplateId}
                            onChange={(e) => setSelectedTemplateId(e.target.value)}
                            className="flex-1 px-3 h-9 border border-gray-300 dark:border-zinc-800 rounded-lg bg-white dark:bg-zinc-900 text-xs focus:ring-1 focus:ring-[#F95700] text-gray-800 dark:text-zinc-200 focus:outline-none cursor-pointer"
                          >
                            <option value="">-- Выберите свой шаблон (.docx) --</option>
                            {templates.map(t => (
                              <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                          </select>
                          <button
                            onClick={handleGenerateFromTemplate}
                            disabled={isGeneratingDoc || !selectedTemplateId}
                            className="py-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all active:scale-95 text-center select-none cursor-pointer disabled:opacity-50"
                          >
                            Сгенерировать
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* История документов */}
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-zinc-200 dark:border-zinc-700 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider border-b pb-2">Архив документов</h3>
                    
                    {clientDocsFiltered.length === 0 ? (
                      <p className="text-gray-400 text-center py-4 text-xs">Документы еще не генерировались</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-zinc-50 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold">
                            <tr>
                              <th className="px-4 py-2">Тип документа</th>
                              <th className="px-4 py-2">Объект</th>
                              <th className="px-4 py-2">Дата создания</th>
                              <th className="px-4 py-2 text-right">Скачать</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientDocsFiltered.map(doc => (
                              <tr key={doc.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                                <td className="px-4 py-2.5 font-bold uppercase text-gray-700 dark:text-zinc-300">
                                  {doc.doc_type === 'kp' ? 'Коммерческое предложение' :
                                   doc.doc_type === 'invoice' ? 'Счет на оплату' :
                                   doc.doc_type === 'contract' ? 'Договор подряда' :
                                   doc.doc_type === 'act' ? 'Акт выполненных работ' :
                                   doc.doc_type === 'factura' ? 'Счет-фактура' :
                                   doc.doc_type === 'upd' ? 'УПД' : doc.doc_type}
                                </td>
                                <td className="px-4 py-2.5 text-gray-500 dark:text-zinc-400">
                                  {allObjects.find(o => o.id === doc.object_id)?.name || '—'}
                                </td>
                                <td className="px-4 py-2.5 text-gray-400 dark:text-zinc-500">
                                  {new Date(doc.created_at).toLocaleDateString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-2.5 text-right">
                                  <button
                                    onClick={() => downloadDocumentFile(doc.id, doc.name)}
                                    className="p-1 hover:text-[#F95700] rounded active:scale-90 transition-all select-none cursor-pointer"
                                    title="Открыть / Скачать PDF"
                                  >
                                    <Download className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: FINANCE TRANSACTIONS */}
              {activeCardTab === 'finance' && (
                <div className="space-y-6">
                  {/* Сводка платежей */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-150 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400">Всего оплачено (доходы)</div>
                        <div className="text-xl font-bold font-['Montserrat'] text-green-600">
                          {clientTotalIncome.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                      <div className="p-2 rounded bg-green-50 text-green-600">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                    </div>
                    
                    <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-150 dark:border-zinc-800 shadow-sm flex items-center justify-between">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-zinc-400">Баланс взаиморасчетов</div>
                        <div className={`text-xl font-bold font-['Montserrat'] ${clientBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                          {clientBalance.toLocaleString('ru-RU')} ₽
                        </div>
                      </div>
                      <div className={`p-2 rounded ${clientBalance >= 0 ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-[#F95700]'}`}>
                        <Wallet className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  {/* Список транзакций */}
                  <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl border border-gray-155 shadow-sm space-y-4">
                    <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider border-b pb-2">История платежей</h3>
                    
                    {clientTransactionsFiltered.length === 0 ? (
                      <p className="text-gray-400 text-center py-4 text-xs">Платежей по данному клиенту не проводилось</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 text-gray-700 dark:text-zinc-200 font-semibold">
                            <tr>
                              <th className="px-4 py-2">Дата</th>
                              <th className="px-4 py-2">Направление</th>
                              <th className="px-4 py-2">Категория</th>
                              <th className="px-4 py-2">Метод</th>
                              <th className="px-4 py-2 text-right">Сумма</th>
                            </tr>
                          </thead>
                          <tbody>
                            {clientTransactionsFiltered.map(t => (
                              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 transition-colors">
                                <td className="px-4 py-2.5 text-gray-400">
                                  {new Date(t.date).toLocaleDateString('ru-RU')}
                                </td>
                                <td className="px-4 py-2.5 font-medium">
                                  {t.transaction_type === 'income' 
                                    ? <span className="text-green-600">Получено от клиента</span>
                                    : <span className="text-red-600">Расход на проект</span>
                                  }
                                </td>
                                <td className="px-4 py-2.5 text-gray-700 dark:text-zinc-200">{t.category}</td>
                                <td className="px-4 py-2.5 text-gray-500 dark:text-zinc-400">{t.payment_method}</td>
                                <td className={`px-4 py-2.5 text-right font-bold ${t.transaction_type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                                  {t.transaction_type === 'income' ? '+' : '-'}{t.amount.toLocaleString('ru-RU')} ₽
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* Модальное окно (Добавление / Редактирование) */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-xl overflow-hidden border border-gray-100 dark:border-zinc-800 flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50">
              <h3 className="font-bold text-lg font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">
                {modalMode === 'create' ? 'Добавление нового клиента' : 'Редактирование клиента'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-gray-400 hover:text-[#1a1a1a] dark:text-zinc-100 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 font-['Inter']">
              {formError && (
                <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Название компании *</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  required
                  placeholder="ООО Агро-Импорт"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider block">ИНН</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={formData.inn}
                    onChange={(e) => setFormData({...formData, inn: e.target.value})}
                    placeholder="7701234567"
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={handleLookupINN}
                    disabled={isLookingUpINN}
                    className="px-3 py-2 bg-[#F95700]/10 hover:bg-[#F95700]/20 text-[#F95700] border border-[#F95700]/20 rounded-lg text-xs font-bold transition-all active:scale-95 flex items-center gap-1.5 select-none cursor-pointer disabled:opacity-50"
                    title="Автозаполнение по ИНН"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isLookingUpINN ? 'animate-spin' : ''}`} />
                    {isLookingUpINN ? 'Поиск...' : 'Найти реквизиты'}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Контактное лицо</label>
                <input 
                  type="text" 
                  value={formData.contact_person}
                  onChange={(e) => setFormData({...formData, contact_person: e.target.value})}
                  placeholder="Иванов Иван Иванович"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Телефон</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    placeholder="+7 (999) 123-45-67"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Email</label>
                  <input 
                    type="email" 
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    placeholder="client@mail.ru"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Сегмент рынка</label>
                  <select 
                    value={formData.segment}
                    onChange={(e) => setFormData({...formData, segment: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  >
                    {segments.map((seg) => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Статус</label>
                  <select 
                    value={formData.status}
                    onChange={(e) => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  >
                    {statuses.map((st) => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
                <h4 className="font-bold text-xs text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider">
                  Банковские реквизиты (для генерации документов)
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">КПП</label>
                    <input 
                      type="text" 
                      value={formData.kpp}
                      onChange={(e) => setFormData({...formData, kpp: e.target.value})}
                      placeholder="561001001"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Юридический адрес</label>
                    <input 
                      type="text" 
                      value={formData.legal_address}
                      onChange={(e) => setFormData({...formData, legal_address: e.target.value})}
                      placeholder="460000, г. Оренбург, ул. Ленина, д. 1"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">ОГРН / ОГРНИП</label>
                    <input 
                      type="text" 
                      value={formData.ogrn}
                      onChange={(e) => setFormData({...formData, ogrn: e.target.value})}
                      placeholder="1025600000000"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Наименование банка</label>
                    <input 
                      type="text" 
                      value={formData.bank_name}
                      onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                      placeholder="ПАО СБЕРБАНК"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">БИК</label>
                    <input 
                      type="text" 
                      value={formData.bik}
                      onChange={(e) => setFormData({...formData, bik: e.target.value})}
                      placeholder="045354601"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Расчетный счет (Р/С)</label>
                    <input 
                      type="text" 
                      value={formData.rs}
                      onChange={(e) => setFormData({...formData, rs: e.target.value})}
                      placeholder="40702810XXXXXXXXXXXX"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Корр. счет (К/С)</label>
                    <input 
                      type="text" 
                      value={formData.ks}
                      onChange={(e) => setFormData({...formData, ks: e.target.value})}
                      placeholder="30101810XXXXXXXXXXXX"
                      className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Custom Fields Rendering */}
              {fieldTemplates.length > 0 && (
                <div className="pt-4 border-t border-gray-100 dark:border-zinc-800">
                  <h4 className="font-bold text-xs text-[#F95700] uppercase tracking-wider mb-4">
                    Дополнительные параметры клиента
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fieldTemplates.map(field => (
                      <div key={field.field_key || field.key} className="space-y-1">
                        <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                          {field.field_label || field.name} {field.is_required && '*'}
                        </label>
                        {field.field_type === 'select' ? (
                          <select
                            required={field.is_required}
                            value={formData.custom_fields[field.field_key || field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData, 
                              custom_fields: {...formData.custom_fields, [field.field_key || field.key]: e.target.value}
                            })}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                          >
                            <option value="">Не выбрано</option>
                            {(Array.isArray(field.options) ? field.options : (field.options ? field.options.split(',') : [])).map((opt: string) => (
                              <option key={opt.trim()} value={opt.trim()}>{opt.trim()}</option>
                            ))}
                          </select>
                        ) : field.field_type === 'boolean' ? (
                          <label className="flex items-center gap-2 cursor-pointer pt-2">
                            <input
                              type="checkbox"
                              checked={!!formData.custom_fields[field.field_key || field.key]}
                              onChange={(e) => setFormData({
                                ...formData, 
                                custom_fields: {...formData.custom_fields, [field.field_key || field.key]: e.target.checked}
                              })}
                              className="w-4 h-4 text-[#F95700] border-gray-300 rounded focus:ring-[#F95700]"
                            />
                            <span className="text-sm font-medium text-gray-800 dark:text-zinc-200">Да / Нет</span>
                          </label>
                        ) : (
                          <input
                            type={field.field_type === 'number' ? 'number' : field.field_type === 'date' ? 'date' : 'text'}
                            required={field.is_required}
                            value={formData.custom_fields[field.field_key || field.key] || ''}
                            onChange={(e) => setFormData({
                              ...formData, 
                              custom_fields: {...formData.custom_fields, [field.field_key || field.key]: e.target.value}
                            })}
                            className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">Заметки / Примечания (для менеджера)</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})}
                  placeholder="Особенности общения, договоренности, подход, что пообещали..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 text-sm"
                />
              </div>

              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 active:scale-95 active:bg-gray-200 transition-all duration-150 text-sm font-medium select-none cursor-pointer"
                >
                  Отмена
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-[#F95700] hover:bg-[#E04D00] active:scale-95 active:bg-[#B83D00] text-white rounded-lg transition-all duration-150 text-sm font-medium shadow-sm select-none cursor-pointer"
                >
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KP CONSTRUCTOR */}
      {isKPModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-150 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] transition-all">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#1a1a1a] dark:text-zinc-100 font-['Montserrat']">
                  Конструктор Коммерческого Предложения
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Для компании {selectedClient.name}</p>
              </div>
              <button 
                onClick={() => setIsKPModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-150 hover:text-gray-600 dark:text-zinc-400 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#1a1a1a] dark:text-zinc-100">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                {/* Segment Selector (cross-selling!) */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Отраслевой сегмент услуг:
                  </label>
                  <select 
                    value={kpSegment}
                    onChange={(e) => setKpSegment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  >
                    {segments.map((seg) => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>

                {/* Linked Object */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Связать с объектом:
                  </label>
                  <select 
                    value={kpObjectId}
                    onChange={(e) => setKpObjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  >
                    <option value="">-- Без конкретного объекта (Общий бланк) --</option>
                    {clientObjectsFiltered.map(obj => (
                      <option key={obj.id} value={obj.id.toString()}>{obj.name}</option>
                    ))}
                  </select>
                </div>

                {/* Manual Number */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Ручной № КП (необяз.):
                  </label>
                  <input
                    type="text"
                    value={kpCustomNumber}
                    onChange={(e) => setKpCustomNumber(e.target.value)}
                    placeholder="Например, КП-12"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  />
                </div>

                {/* Manual Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Ручная дата КП (необяз.):
                  </label>
                  <input
                    type="date"
                    value={kpCustomDate}
                    onChange={(e) => setKpCustomDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  />
                </div>
              </div>

              {/* Tag Cloud of services */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider block">
                  Облако услуг (кликните, чтобы добавить в КП):
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-150 dark:border-zinc-800">
                  {segmentServices[kpSegment]?.map((service) => {
                    const isAdded = kpItems.some(item => item.name === service);
                    return (
                      <button
                        key={service}
                        type="button"
                        onClick={() => handleAddServiceFromTag(service)}
                        disabled={isAdded}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 duration-100 ${
                          isAdded 
                            ? 'bg-gray-200 text-gray-400 cursor-default' 
                            : 'bg-[#F95700]/10 text-[#F95700] hover:bg-[#F95700]/20 cursor-pointer border border-[#F95700]/20'
                        }`}
                      >
                        {service}
                      </button>
                    );
                  })}
                  {(!segmentServices[kpSegment] || segmentServices[kpSegment].length === 0) && (
                    <span className="text-xs text-gray-400 italic">Нет стандартных услуг для данного сегмента</span>
                  )}
                </div>
              </div>

              {/* Chosen items editor table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Перечень услуг в предложении:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomItem}
                    className="active:scale-95 transition-all text-xs font-bold text-[#F95700] hover:underline cursor-pointer font-['Montserrat']"
                  >
                    + Добавить произвольную позицию
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Наименование услуги</th>
                        <th className="px-4 py-2.5 w-24">Ед. изм.</th>
                        <th className="px-4 py-2.5 w-28">Кол-во</th>
                        <th className="px-4 py-2.5 w-32">Цена (руб.)</th>
                        <th className="px-4 py-2.5 w-32">Сумма (руб.)</th>
                        <th className="px-4 py-2.5 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {kpItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              required
                              value={item.name}
                              placeholder="Введите название услуги..."
                              onChange={(e) => handleUpdateKPItem(idx, 'name', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none font-medium text-gray-800 dark:text-zinc-200 placeholder-gray-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              required
                              value={item.unit}
                              placeholder="м2"
                              onChange={(e) => handleUpdateKPItem(idx, 'unit', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-600 dark:text-zinc-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              required
                              min="0.1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateKPItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none font-semibold text-gray-700 dark:text-zinc-200"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              required
                              min="0"
                              step="any"
                              value={item.price}
                              onChange={(e) => handleUpdateKPItem(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none font-semibold text-gray-700 dark:text-zinc-200"
                            />
                          </td>
                          <td className="px-4 py-2 font-bold text-gray-700 dark:text-zinc-200">
                            {(item.quantity * item.price).toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveKPItem(idx)}
                              className="p-1 hover:text-red-600 rounded hover:bg-red-50 transition-all active:scale-90"
                              title="Удалить строку"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {kpItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-gray-400 italic">
                            Список услуг пуст. Выберите услуги из облака выше или добавьте вручную.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Overall sum calculation */}
                {kpItems.length > 0 && (
                  <div className="flex justify-end p-2">
                    <div className="text-right space-y-1">
                      <span className="text-xs text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wider block">Итого к оплате:</span>
                      <span className="text-xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">
                        {kpItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 flex justify-end gap-3">
              <button 
                type="button"
                onClick={() => setIsKPModalOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 active:scale-95 active:bg-gray-200 transition-all duration-150 text-sm font-medium select-none cursor-pointer"
              >
                Отмена
              </button>
              <button 
                type="button"
                onClick={handleGenerateKP}
                disabled={isGeneratingDoc || kpItems.length === 0}
                className="px-5 py-2 bg-[#F95700] hover:bg-[#E04D00] active:scale-95 active:bg-[#B83D00] text-white rounded-lg transition-all duration-150 text-sm font-bold shadow-sm select-none cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Сгенерировать и открыть PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: INVOICE CONSTRUCTOR */}
      {isInvoiceModalOpen && selectedClient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-6xl border border-gray-150 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh] transition-all">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-lg text-[#1a1a1a] dark:text-zinc-100 font-['Montserrat']">
                  Конструктор финансовых документов
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400">Для компании {selectedClient.name}</p>
              </div>
              <button 
                onClick={() => setIsInvoiceModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-150 hover:text-gray-600 dark:text-zinc-400 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-[#1a1a1a] dark:text-zinc-100">
              <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
                {/* Segment Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Отраслевой сегмент:
                  </label>
                  <select 
                    value={invoiceSegment}
                    onChange={(e) => setInvoiceSegment(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  >
                    {segments.map((seg) => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>

                {/* Linked Object */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Связать с объектом:
                  </label>
                  <select 
                    value={invoiceObjectId}
                    onChange={(e) => setInvoiceObjectId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  >
                    <option value="">-- Без объекта --</option>
                    {clientObjectsFiltered.map(obj => (
                      <option key={obj.id} value={obj.id.toString()}>{obj.name}</option>
                    ))}
                  </select>
                </div>

                {/* Bank Account Switcher */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Реквизиты (Касса):
                  </label>
                  <select 
                    value={invoiceAccountType}
                    onChange={(e) => setInvoiceAccountType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900 font-semibold text-[#1a1a1a] dark:text-zinc-100"
                  >
                    <option value="works">Услуги / Работы</option>
                    <option value="materials">ЛКМ / Расходники</option>
                  </select>
                </div>

                {/* VAT Rate Selector */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Ставка НДС:
                  </label>
                  <select 
                    value={invoiceNdsRate}
                    onChange={(e) => setInvoiceNdsRate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900 font-semibold text-[#1a1a1a] dark:text-zinc-100"
                  >
                    <option value="Без НДС">Без НДС</option>
                    <option value="20%">НДС 20%</option>
                  </select>
                </div>

                {/* Custom Number */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Ручной № док-та:
                  </label>
                  <input
                    type="text"
                    value={invoiceCustomNumber}
                    onChange={(e) => setInvoiceCustomNumber(e.target.value)}
                    placeholder="Например, СЧ-10"
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  />
                </div>

                {/* Custom Date */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Ручная дата:
                  </label>
                  <input
                    type="date"
                    value={invoiceCustomDate}
                    onChange={(e) => setInvoiceCustomDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 bg-white dark:bg-zinc-900"
                  />
                </div>
              </div>

              {/* Tag Cloud of services or materials */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider block">
                  {invoiceAccountType === 'materials' 
                    ? 'Облако материалов/ЛКМ (кликните, чтобы добавить в счет):' 
                    : 'Облако услуг (кликните, чтобы добавить в счет):'}
                </label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-lg border border-gray-150 dark:border-zinc-800">
                  {invoiceAccountType === 'materials' ? (
                    standardMaterials.map((material) => {
                      const isAdded = invoiceItems.some(item => item.name === material);
                      return (
                        <button
                          key={material}
                          type="button"
                          onClick={() => handleAddServiceFromTagInvoice(material)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 duration-100 ${
                            isAdded 
                              ? 'bg-gray-200 text-gray-400 cursor-default' 
                              : 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer border border-green-200'
                          }`}
                        >
                          {material}
                        </button>
                      );
                    })
                  ) : (
                    segmentServices[invoiceSegment]?.map((service) => {
                      const isAdded = invoiceItems.some(item => item.name === service);
                      return (
                        <button
                          key={service}
                          type="button"
                          onClick={() => handleAddServiceFromTagInvoice(service)}
                          disabled={isAdded}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 duration-100 ${
                            isAdded 
                              ? 'bg-gray-200 text-gray-400 cursor-default' 
                              : 'bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer border border-green-200'
                          }`}
                        >
                          {service}
                        </button>
                      );
                    })
                  )}
                  {invoiceAccountType !== 'materials' && (!segmentServices[invoiceSegment] || segmentServices[invoiceSegment].length === 0) && (
                    <span className="text-xs text-gray-400 italic">Нет стандартных услуг для данного сегмента</span>
                  )}
                </div>
              </div>

              {/* Chosen items editor table */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase tracking-wider">
                    Позиции в счете на оплату:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddCustomItemInvoice}
                    className="active:scale-95 transition-all text-xs font-bold text-green-600 hover:underline cursor-pointer font-['Montserrat']"
                  >
                    + Добавить произвольную позицию
                  </button>
                </div>

                <div className="border border-gray-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-zinc-800/50 border-b border-gray-100 dark:border-zinc-800 text-gray-600 dark:text-zinc-400 font-semibold uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="px-4 py-2.5">Наименование товара/услуги</th>
                        <th className="px-4 py-2.5 w-24">Ед. изм.</th>
                        <th className="px-4 py-2.5 w-28">Кол-во</th>
                        <th className="px-4 py-2.5 w-32">Цена (руб.)</th>
                        <th className="px-4 py-2.5 w-32">Сумма (руб.)</th>
                        <th className="px-4 py-2.5 w-12 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {invoiceItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50/50">
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              required
                              value={item.name}
                              placeholder="Введите название позиции..."
                              onChange={(e) => handleUpdateInvoiceItem(idx, 'name', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none font-medium text-gray-800 dark:text-zinc-200 placeholder-gray-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              required
                              value={item.unit}
                              placeholder="м2"
                              onChange={(e) => handleUpdateInvoiceItem(idx, 'unit', e.target.value)}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-gray-600 dark:text-zinc-400"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              required
                              min="0.1"
                              step="any"
                              value={item.quantity}
                              onChange={(e) => handleUpdateInvoiceItem(idx, 'quantity', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none font-semibold text-gray-700 dark:text-zinc-200"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              required
                              min="0"
                              step="any"
                              value={item.price}
                              onChange={(e) => handleUpdateInvoiceItem(idx, 'price', parseFloat(e.target.value) || 0)}
                              className="w-full bg-transparent border-none focus:ring-0 focus:outline-none font-semibold text-gray-700 dark:text-zinc-200"
                            />
                          </td>
                          <td className="px-4 py-2 font-bold text-gray-700 dark:text-zinc-200">
                            {(item.quantity * item.price).toLocaleString('ru-RU')} ₽
                          </td>
                          <td className="px-2 py-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveInvoiceItem(idx)}
                              className="p-1 hover:text-red-600 rounded hover:bg-red-50 transition-all active:scale-90"
                              title="Удалить строку"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {invoiceItems.length === 0 && (
                        <tr>
                          <td colSpan={6} className="text-center py-6 text-gray-400 italic">
                            Список позиций пуст. Выберите услуги из облака выше или добавьте вручную.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Overall sum calculation */}
                {invoiceItems.length > 0 && (
                  <div className="flex justify-end p-2">
                    <div className="text-right space-y-1">
                      <span className="text-xs text-gray-500 dark:text-zinc-400 font-semibold uppercase tracking-wider block">Итого к оплате (Без НДС):</span>
                      <span className="text-xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">
                        {invoiceItems.reduce((acc, curr) => acc + (curr.price * curr.quantity), 0).toLocaleString('ru-RU')} ₽
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 flex justify-end gap-3 flex-wrap">
              <button 
                type="button"
                onClick={() => setIsInvoiceModalOpen(false)}
                className="px-4 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 active:scale-95 active:bg-gray-200 transition-all duration-150 text-sm font-medium select-none cursor-pointer"
              >
                Отмена
              </button>
              <button 
                type="button"
                onClick={handleGenerateInvoice}
                disabled={isGeneratingDoc || invoiceItems.length === 0}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 active:scale-95 active:bg-green-800 text-white rounded-lg transition-all duration-150 text-sm font-bold shadow-sm select-none cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Создать Счет
              </button>
              <button 
                type="button"
                onClick={handleGenerateFactura}
                disabled={isGeneratingDoc || invoiceItems.length === 0}
                className="px-4 py-2 bg-[#F95700] hover:bg-[#E04D00] active:scale-95 active:bg-[#B83D00] text-white rounded-lg transition-all duration-150 text-sm font-bold shadow-sm select-none cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Создать Счет-фактуру
              </button>
              <button 
                type="button"
                onClick={handleGenerateUPD}
                disabled={isGeneratingDoc || invoiceItems.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 active:scale-95 active:bg-blue-800 text-white rounded-lg transition-all duration-150 text-sm font-bold shadow-sm select-none cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Создать УПД
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно отправки писем */}
      {isEmailModalOpen && emailClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 font-['Inter']">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl border border-gray-100 dark:border-zinc-800 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-gray-50 dark:bg-zinc-800/50 px-6 py-4 border-b border-gray-200 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-bold text-sm text-[#1a1a1a] dark:text-zinc-100 uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-4.5 h-4.5 text-indigo-600" /> Отправить Email клиенту
              </h3>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:text-zinc-400 font-bold text-lg cursor-pointer border-0 bg-transparent"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSendEmailSubmit} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Контрагент</label>
                <div className="p-2.5 bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-lg text-xs font-semibold text-gray-700 dark:text-zinc-200">
                  {emailClient.name}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Вложение (документ)</label>
                <select
                  value={emailDocId || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    setEmailDocId(val);
                    updateEmailContent(emailClient, val);
                  }}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-[#F95700]/50 cursor-pointer"
                >
                  <option value="">Без вложения (только текст письма)</option>
                  {allDocuments.filter(d => d.client_id === emailClient.id).map(doc => (
                    <option key={doc.id} value={doc.id}>
                      {doc.name} ({doc.doc_type === 'kp' ? 'КП' :
                                   doc.doc_type === 'invoice' ? 'Счет' :
                                   doc.doc_type === 'contract' ? 'Договор' :
                                   doc.doc_type === 'act' ? 'Акт' :
                                   doc.doc_type === 'factura' ? 'Счет-фактура' :
                                   doc.doc_type === 'upd' ? 'УПД' : doc.doc_type})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Email Получателя *</label>
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
                  placeholder="Тема сообщения"
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600 dark:text-zinc-400 uppercase">Сообщение</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-zinc-800 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/50"
                />
              </div>

              {emailError && (
                <div className="p-3 rounded-lg text-xs bg-red-50 text-red-700 border border-red-200 flex items-start gap-2">
                  <span className="font-semibold text-red-600">{emailError}</span>
                </div>
              )}

              {emailSuccess && (
                <div className="p-3 rounded-lg text-xs bg-green-50 text-green-700 border border-green-200 flex items-start gap-2">
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
                  {isSendingEmail ? "Отправка..." : "Отправить Email"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <GodTierModal
        isOpen={deleteClientId !== null}
        onClose={() => setDeleteClientId(null)}
        maxWidth="sm"
        title={
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-500">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-full">
              <Trash2 className="w-5 h-5" />
            </div>
            <span>Удалить клиента?</span>
          </div>
        }
        footer={
          <>
            <button
              onClick={() => setDeleteClientId(null)}
              className="active:scale-95 transition-all px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={handleDeleteClientConfirm}
              className="active:scale-95 transition-all px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-red-500/20 cursor-pointer"
            >
              Удалить
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Вы уверены, что хотите удалить этого клиента? Все его проекты, документы и транзакции также будут безвозвратно удалены.
        </p>
      </GodTierModal>

      {/* Bulk Delete Confirmation Modal */}
      <GodTierModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        maxWidth="sm"
        title={
          <div className="flex items-center space-x-3 text-red-600 dark:text-red-500">
            <div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-full">
              <Trash2 className="w-5 h-5" />
            </div>
            <span>Массовое удаление</span>
          </div>
        }
        footer={
          <>
            <button
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="active:scale-95 transition-all px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
            >
              Отмена
            </button>
            <button
              onClick={confirmBulkDelete}
              className="active:scale-95 transition-all px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-red-500/20 cursor-pointer"
            >
              Удалить
            </button>
          </>
        }
      >
        <p className="text-sm text-gray-500 dark:text-zinc-400">
          Вы уверены, что хотите удалить выбранные элементы ({selectedIds.length} шт.)? Все их данные будут безвозвратно удалены.
        </p>
      </GodTierModal>

    </div>
  );
}

export default Clients;
