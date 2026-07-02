import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, PenTool, Check, Calendar, User as UserIcon, MapPin, QrCode, Printer, Camera, Scan } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Helmet } from 'react-helmet-async';
import QRCode from 'qrcode';
import { FleetChessboard } from '../components/FleetChessboard';

interface EquipmentItem {
  id: number;
  name: string;
  status: string; // На базе, На объекте, В ремонте, Списано
  last_service: string | null;
  inspector: string | null;
  object_id: number | null;
  object_name: string | null;
  barcode: string | null;
}

interface ProjectObject {
  id: number;
  name: string;
}

export const Equipment: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'list' | 'fleet'>('fleet');
  const [equipment, setEquipment] = useState<EquipmentItem[]>([]);
  const [objects, setObjects] = useState<ProjectObject[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('Все');
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [currentEquipmentId, setCurrentEquipmentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    status: 'На базе',
    last_service: '',
    inspector: '',
    object_id: '',
    barcode: ''
  });
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedStatus, searchQuery]);

  // Status Change Modal (for quick status change)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusItem, setStatusItem] = useState<EquipmentItem | null>(null);
  const [newStatus, setNewStatus] = useState('На базе');
  const [newObjectId, setNewObjectId] = useState('');

  // QR Code States
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrItem, setQrItem] = useState<EquipmentItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-container";
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanTarget, setScanTarget] = useState<'adjust' | 'form_barcode'>('adjust');
  const [unregisteredBarcode, setUnregisteredBarcode] = useState('');

  const statuses = ['Все', 'На базе', 'На объекте', 'В ремонте', 'Списано'];

  useEffect(() => {
    fetchEquipment();
    fetchObjects();
    return () => {
      stopScannerInternal();
    };
  }, []);

  const fetchEquipment = async () => {
    setIsLoading(true);
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/equipment/', {
        headers: {}
      });
      if (response.ok) {
        const data = await response.json();
        setEquipment(data);
      }
    } catch (e) {
      console.error('Failed to fetch equipment', e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchObjects = async () => {
    try {
      const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/objects/', {
        headers: {}
      });
      if (response.ok) {
        const data = await response.json();
        setObjects(data);
      }
    } catch (e) {
      console.error('Failed to fetch objects', e);
    }
  };

  // ----------------------------------------------------
  // Modals & Form
  // ----------------------------------------------------
  const handleOpenCreateModal = () => {
    setModalType('create');
    setFormData({
      name: '',
      status: 'На базе',
      last_service: new Date().toISOString().split('T')[0],
      inspector: '',
      object_id: '',
      barcode: ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: EquipmentItem) => {
    setModalType('edit');
    setCurrentEquipmentId(item.id);
    let formattedDate = '';
    if (item.last_service) {
      formattedDate = item.last_service.split('T')[0];
    }
    setFormData({
      name: item.name,
      status: item.status,
      last_service: formattedDate,
      inspector: item.inspector || '',
      object_id: item.object_id ? item.object_id.toString() : '',
      barcode: item.barcode || ''
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Укажите название оборудования');
      return;
    }
    if (formData.status === 'На объекте' && !formData.object_id) {
      setFormError('Укажите объект, на котором находится оборудование');
      return;
    }
    const url = modalType === 'create' 
      ? (import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/equipment/' 
      : `${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/equipment/${currentEquipmentId}`;
    
    const method = modalType === 'create' ? 'POST' : 'PATCH';

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          status: formData.status,
          last_service: formData.last_service ? new Date(formData.last_service).toISOString() : null,
          inspector: formData.inspector || null,
          object_id: formData.status === 'На объекте' && formData.object_id ? parseInt(formData.object_id, 10) : null,
          barcode: formData.barcode || null
        })
      });

      if (response.ok) {
        setIsModalOpen(false);
        fetchEquipment();
      } else {
        const errData = await response.json();
        setFormError(errData.detail || 'Ошибка при сохранении');
      }
    } catch (err) {
      setFormError('Сбой сети при отправке данных');
    }
  };

  const handleDeleteEquipment = async (id: number) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/equipment/${id}`, {
        method: 'DELETE',
        headers: {}
      });
      if (response.ok) {
        setDeleteId(null);
        setSelectedIds(prev => prev.filter(item_id => item_id !== id));
        fetchEquipment();
      }
    } catch (e) {
      console.error('Failed to delete equipment', e);
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
        await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/equipment/${id}`, {
          method: 'DELETE'
        });
      }
      setSelectedIds([]);
      fetchEquipment();
    } catch (e) {
      console.error(e);
      alert("Ошибка при удалении некоторого оборудования");
      fetchEquipment();
    }
  };

  // ----------------------------------------------------
  // Quick Status Change
  // ----------------------------------------------------
  const openStatusModal = (item: EquipmentItem) => {
    setStatusItem(item);
    setNewStatus(item.status);
    setNewObjectId(item.object_id ? item.object_id.toString() : '');
    setIsStatusModalOpen(true);
  };

  const handleStatusSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusItem) return;
    if (newStatus === 'На объекте' && !newObjectId) {
      alert("Выберите объект");
      return;
    }

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || (import.meta.env.VITE_API_URL || 'http://localhost:8000') + ''}/equipment/${statusItem.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          object_id: newStatus === 'На объекте' && newObjectId ? parseInt(newObjectId, 10) : null
        })
      });

      if (response.ok) {
        setIsStatusModalOpen(false);
        fetchEquipment();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ----------------------------------------------------
  // QR & Scanner Logic
  // ----------------------------------------------------
  const handleShowQrModal = (item: EquipmentItem) => {
    setQrItem(item);
    QRCode.toDataURL(`sphera-eq-${item.id}`, { width: 256, margin: 2 }, (err, url) => {
      if (err) return;
      setQrDataUrl(url);
      setIsQrModalOpen(true);
    });
  };

  const handlePrintQr = () => {
    if (!qrItem) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Печать QR-кода - ${qrItem.name}</title>
          <style>
            body {
              font-family: 'Inter', sans-serif;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              text-align: center;
            }
            .container {
              border: 1px solid #ccc;
              padding: 20px;
              border-radius: 12px;
            }
            h2 { margin: 10px 0 5px 0; font-size: 18px; }
            p { margin: 0 0 15px 0; color: #666; font-size: 14px; font-weight: bold; }
            img { width: 200px; height: 200px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="container">
            <img src="${qrDataUrl}" />
            <h2>СФЕРА ERP</h2>
            <p>${qrItem.name}</p>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const playBeep = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  };

  const handleCloseScanner = async () => {
    await stopScannerInternal();
    setIsScannerOpen(false);
  };

  const handleCreateFromBarcode = async () => {
    const code = unregisteredBarcode;
    setUnregisteredBarcode('');
    await stopScannerInternal();
    setIsScannerOpen(false);
    
    // Open create modal with prefilled barcode
    setModalType('create');
    setFormData({
      name: '',
      status: 'На базе',
      last_service: new Date().toISOString().split('T')[0],
      inspector: '',
      object_id: '',
      barcode: code
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const startScanner = async (target: 'adjust' | 'form_barcode' = 'adjust', forceCameraId?: string) => {
    setScanTarget(target);
    setIsScannerOpen(true);
    setScannerError('');
    setUnregisteredBarcode('');
    
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setScannerError('Ошибка доступа к камере: Требуется защищенное соединение (HTTPS) для использования камеры. Пожалуйста, откройте сайт по адресу https://леоника56.рф');
      return;
    }
    
    let camId = forceCameraId || selectedCameraId;
    
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        if (!camId) {
          const backCam = devices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('environment') ||
            d.label.toLowerCase().includes('rear')
          );
          camId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(camId);
        }
      }
    } catch (e) {
      console.warn("Failed to get cameras list:", e);
    }

    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        html5QrcodeRef.current = html5Qrcode;
        const config = camId ? camId : { facingMode: "environment" };
        
        const videoConstraints: MediaTrackConstraints = camId 
          ? { deviceId: { exact: camId } } 
          : { facingMode: "environment" };
          
        videoConstraints.advanced = [
          { focusMode: "continuous" } as any
        ];
        
        await html5Qrcode.start(
          config,
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            videoConstraints: videoConstraints
          },
          async (decodedText) => {
            await processScannedBarcode(decodedText, target);
          },
          () => {}
        );
      } catch (err: any) {
        setScannerError(`Ошибка доступа к камере: ${err?.message || err}`);
      }
    }, 150);
  };

  const handleSwitchCamera = async (cameraId: string) => {
    setSelectedCameraId(cameraId);
    if (html5QrcodeRef.current) {
      await stopScannerInternal();
      setTimeout(() => {
        startScanner(scanTarget, cameraId);
      }, 250);
    }
  };

  const stopScannerInternal = async () => {
    if (html5QrcodeRef.current) {
      try {
        if (html5QrcodeRef.current.isScanning) {
          await html5QrcodeRef.current.stop();
        }
        html5QrcodeRef.current.clear();
      } catch (err) {}
      html5QrcodeRef.current = null;
    }
  };

  const processScannedBarcode = async (decodedText: string, target: 'adjust' | 'form_barcode' = 'adjust') => {
    if (target === 'form_barcode') {
      playBeep();
      await stopScannerInternal();
      setIsScannerOpen(false);
      setFormData(prev => ({ ...prev, barcode: decodedText }));
    } else {
      let matched: EquipmentItem | undefined;
      
      if (decodedText.startsWith("sphera-eq-")) {
        const id = parseInt(decodedText.replace("sphera-eq-", ""), 10);
        matched = equipment.find(i => i.id === id);
      } else {
        matched = equipment.find(i => i.barcode === decodedText);
      }

      if (matched) {
        playBeep();
        await stopScannerInternal();
        setIsScannerOpen(false);
        openStatusModal(matched);
      } else {
        setUnregisteredBarcode(decodedText);
        setScannerError('');
      }
    }
  };

  // Keyboard Scanner listener
  useEffect(() => {
    let keyBuffer = '';
    let timeout: ReturnType<typeof setTimeout> | null = null;
    
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }
      
      if (e.key === 'Enter') {
        if (keyBuffer.length > 2) {
          processScannedBarcode(keyBuffer, 'adjust');
        }
        keyBuffer = '';
      } else {
        if (e.key.length === 1) {
          keyBuffer += e.key;
        }
        if (timeout) clearTimeout(timeout);
        timeout = setTimeout(() => {
          keyBuffer = '';
        }, 100);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, [equipment]);

  // ----------------------------------------------------
  // Formatters & Filtering
  // ----------------------------------------------------
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Не обслуживалось';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Неверная дата';
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.inspector && item.inspector.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.object_name && item.object_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = selectedStatus === 'Все' || item.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  const totalCount = equipment.length;
  const activeCount = equipment.filter(e => e.status === 'На базе').length;
  const onObjectCount = equipment.filter(e => e.status === 'На объекте').length;
  const repairCount = equipment.filter(e => e.status === 'В ремонте').length;
  const decommissionedCount = equipment.filter(e => e.status === 'Списано').length;

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Оборудование | СФЕРА</title>
      </Helmet>

      {/* Top Tab Switcher */}
      <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-2 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('fleet')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'fleet'
              ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/20'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span>🚜 Шахматка спецтехники (Модуль 4.4)</span>
          <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-500 font-extrabold animate-pulse">
            NEW
          </span>
        </button>
        <button
          onClick={() => setActiveTab('list')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'list'
              ? 'bg-[#F95700] text-white shadow-md shadow-[#F95700]/20'
              : 'text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800'
          }`}
        >
          <span>📋 Реестр инвентаря</span>
        </button>
      </div>

      {activeTab === 'fleet' ? (
        <FleetChessboard />
      ) : (
        <div className="space-y-6">
          {/* Top statistics overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 group cursor-default">
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-medium uppercase tracking-wider">Всего</p>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">{totalCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-gray-50 dark:bg-zinc-800/50 text-gray-400 group-hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-colors">
            <PenTool className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 group cursor-default">
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-medium uppercase tracking-wider">На базе</p>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-emerald-600">{activeCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-500 group-hover:bg-emerald-100 transition-colors">
            <Check className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 group cursor-default">
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-medium uppercase tracking-wider">На объекте</p>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-blue-600">{onObjectCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-blue-50 text-blue-500 group-hover:bg-blue-100 transition-colors">
            <MapPin className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 group cursor-default">
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-medium uppercase tracking-wider">В ремонте</p>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-amber-600">{repairCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-amber-50 text-amber-500 group-hover:bg-amber-100 transition-colors">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-5 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:-translate-y-1 transition-transform duration-300 group cursor-default">
          <div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 mb-1 font-medium uppercase tracking-wider">Списано</p>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-red-500">{decommissionedCount}</h3>
          </div>
          <div className="p-3 rounded-xl bg-red-50 text-red-400 group-hover:bg-red-100 transition-colors">
            <Trash2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex flex-1 items-center space-x-3 bg-gray-50 dark:bg-zinc-800 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-[#F95700]/20 focus-within:border-[#F95700] transition-all">
          <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск по названию, объекту или инспектору..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500"
          />
        </div>

        <div className="flex items-center space-x-3 flex-wrap justify-end">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="active:scale-95 transition-all duration-200 flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 px-4 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="truncate">Удалить ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => startScanner('adjust')}
            className="active:scale-95 transition-all flex items-center justify-center bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-200 dark:hover:bg-zinc-700 shadow-sm cursor-pointer"
          >
            <Scan className="w-4 h-4 mr-2 text-[#F95700]" />
            Сканер QR
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="active:scale-95 transition-all flex items-center justify-center bg-[#F95700] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#e04e00] shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить оборудование
          </button>
        </div>
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((st) => (
          <button
            key={st}
            onClick={() => setSelectedStatus(st)}
            className={`active:scale-95 transition-all px-4 py-2 rounded-full text-xs font-semibold ${
              selectedStatus === st
                ? 'bg-[#1a1a1a] text-white shadow-md'
                : 'bg-white dark:bg-zinc-900 text-gray-600 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-800'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Equipment Table */}
      {isLoading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#F95700]" />
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-20 flex flex-col items-center justify-center text-gray-400">
          <PenTool className="w-12 h-12 mb-3 opacity-50 text-gray-300 dark:text-zinc-700" />
          <p className="text-sm text-gray-500 dark:text-zinc-400">Оборудование не найдено</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800 text-left">
                <thead className="bg-gray-50 dark:bg-zinc-800/40 text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">
                      <input
                        type="checkbox"
                        checked={filteredEquipment.length > 0 && selectedIds.length === filteredEquipment.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredEquipment.map(item => item.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded border-gray-300 dark:border-zinc-700 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4">QR</th>
                    <th className="px-6 py-4">Название оборудования</th>
                    <th className="px-6 py-4">Статус</th>
                    <th className="px-6 py-4">Локация</th>
                    <th className="px-6 py-4">Последнее ТО</th>
                    <th className="px-6 py-4">Ответственный инспектор</th>
                    <th className="px-6 py-4 text-center">Изменить статус</th>
                    <th className="px-6 py-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm text-[#1a1a1a] dark:text-zinc-200">
                  {filteredEquipment.map((item) => {
                    let statusColor = 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200';
                    if (item.status === 'На базе') statusColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
                    if (item.status === 'На объекте') statusColor = 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
                    if (item.status === 'В ремонте') statusColor = 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
                    if (item.status === 'Списано') statusColor = 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/30 transition-colors group">
                        <td className="px-6 py-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedIds(prev => [...prev, item.id]);
                              } else {
                                setSelectedIds(prev => prev.filter(id => id !== item.id));
                              }
                            }}
                            className="rounded border-gray-300 dark:border-zinc-700 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleShowQrModal(item)}
                            className="p-2 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors active:scale-95 cursor-pointer"
                            title="Показать QR код"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                        </td>
                        <td className="px-6 py-4 font-semibold text-gray-900 dark:text-white break-words max-w-[200px]">
                          {item.name}
                          {item.barcode && <div className="text-[10px] text-gray-400 dark:text-zinc-500 mt-1 font-mono">{item.barcode}</div>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase ${statusColor}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {item.status === 'На объекте' && item.object_name ? (
                            <div className="flex items-center space-x-1.5 text-blue-600 dark:text-blue-400 font-medium">
                              <MapPin className="w-4 h-4 flex-shrink-0" />
                              <span className="truncate max-w-[150px] block" title={item.object_name}>{item.object_name}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-zinc-500 italic">База Сфера</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-zinc-400">
                          <div className="flex items-center space-x-1.5">
                            <Calendar className="w-4 h-4 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                            <span>{formatDate(item.last_service)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-500 dark:text-zinc-400">
                          {item.inspector ? (
                            <div className="flex items-center space-x-1.5 bg-gray-100 dark:bg-zinc-800 px-2 py-1 rounded-md w-max">
                              <UserIcon className="w-3.5 h-3.5 text-gray-500 dark:text-zinc-400 flex-shrink-0" />
                              <span className="text-gray-700 dark:text-zinc-300 font-medium text-[13px]">{item.inspector}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 dark:text-zinc-500 italic">Не назначен</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-2">
                            <button
                              onClick={() => openStatusModal(item)}
                              className="active:scale-95 transition-all text-xs px-3 py-1.5 rounded-lg font-semibold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center min-w-[40px] justify-center cursor-pointer"
                            >
                              Изменить
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="active:scale-95 transition-all inline-flex items-center p-2 text-gray-400 dark:text-zinc-500 hover:text-[#F95700] dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg min-w-[40px] justify-center cursor-pointer"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="active:scale-95 transition-all inline-flex items-center p-2 text-gray-400 dark:text-zinc-500 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg min-w-[40px] justify-center cursor-pointer"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Список карточек для мобильных */}
          <div className="block md:hidden space-y-4">
            {filteredEquipment.map((item) => {
              let statusColor = 'bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200';
              if (item.status === 'На базе') statusColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
              if (item.status === 'На объекте') statusColor = 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
              if (item.status === 'В ремонте') statusColor = 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
              if (item.status === 'Списано') statusColor = 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20';

              return (
                <div key={item.id} className="bg-white dark:bg-zinc-900 p-4 rounded-xl border border-gray-150 dark:border-zinc-800 shadow-sm space-y-3 hover:border-[#F95700]/30 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5">
                      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedIds(prev => [...prev, item.id]);
                            } else {
                              setSelectedIds(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                          className="rounded border-gray-300 dark:border-zinc-700 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                        />
                      </div>
                      <div>
                        <h4 className="font-bold text-[#1a1a1a] dark:text-white text-base leading-tight break-words">{item.name}</h4>
                        {item.barcode && (
                          <div className="text-[10px] text-gray-400 dark:text-zinc-550 mt-1 font-mono">Штрихкод: {item.barcode}</div>
                        )}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase flex-shrink-0 ${statusColor}`}>
                      {item.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-650 dark:text-zinc-400 pt-1.5 border-t border-gray-100 dark:border-zinc-800">
                    <div>
                      <span className="text-gray-400 dark:text-zinc-550 text-[9px] font-semibold uppercase tracking-wider block">Локация</span>
                      {item.status === 'На объекте' && item.object_name ? (
                        <div className="flex items-center space-x-1 mt-0.5 text-blue-600 dark:text-blue-400 font-medium">
                          <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate max-w-[120px] block" title={item.object_name}>{item.object_name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-450 dark:text-zinc-500 italic block mt-0.5">База Сфера</span>
                      )}
                    </div>

                    <div>
                      <span className="text-gray-400 dark:text-zinc-550 text-[9px] font-semibold uppercase tracking-wider block">Последнее ТО</span>
                      <div className="flex items-center space-x-1 mt-0.5 text-gray-500 dark:text-zinc-400 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-gray-400 dark:text-zinc-500 flex-shrink-0" />
                        <span>{formatDate(item.last_service)}</span>
                      </div>
                    </div>
                  </div>

                  {item.inspector && (
                    <div className="text-xs pt-1.5 border-t border-gray-100 dark:border-zinc-800">
                      <span className="text-gray-400 dark:text-zinc-550 text-[9px] font-semibold uppercase tracking-wider block">Ответственный</span>
                      <div className="flex items-center space-x-1 mt-1 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded w-max text-gray-700 dark:text-zinc-300 font-medium">
                        <UserIcon className="w-3 h-3 flex-shrink-0 text-gray-550 dark:text-zinc-400" />
                        <span>{item.inspector}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2.5 border-t border-gray-100 dark:border-zinc-800">
                    <button
                      onClick={() => openStatusModal(item)}
                      className="active:scale-95 transition-all text-xs px-2.5 py-1.5 rounded-lg font-semibold bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 hover:text-black dark:hover:text-white flex items-center gap-1 cursor-pointer"
                    >
                      Изменить статус
                    </button>
                    
                    <div className="flex gap-1.5">
                      <button
                        onClick={() => handleShowQrModal(item)}
                        className="p-1.5 bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:text-indigo-650 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg active:scale-90 transition-all cursor-pointer"
                        title="Показать QR код"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 bg-gray-50 dark:bg-zinc-800 text-gray-550 dark:text-zinc-400 hover:text-[#F95700] dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 rounded-lg active:scale-90 transition-all cursor-pointer"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="p-1.5 bg-gray-50 dark:bg-zinc-800 text-gray-550 dark:text-zinc-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg active:scale-90 transition-all cursor-pointer"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 transition-all">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50">
              <h3 className="text-lg font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">
                {modalType === 'create' ? 'Новое оборудование' : 'Редактировать оборудование'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-full text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700 hover:text-gray-700 dark:text-zinc-200 transition-all active:scale-95"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs rounded-xl flex items-center font-medium">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Название оборудования
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Graco Mark V"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-zinc-100 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Штрихкод (заводской)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="EAN-13 или другой..."
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-zinc-100 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => { setIsModalOpen(false); startScanner('form_barcode'); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-95 transition-all"
                    title="Сканировать штрихкод камерой"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                  Статус
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-zinc-100 transition-all font-medium"
                >
                  <option value="На базе">На базе</option>
                  <option value="На объекте">На объекте</option>
                  <option value="В ремонте">В ремонте</option>
                  <option value="Списано">Списано</option>
                </select>
              </div>

              {formData.status === 'На объекте' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Выберите объект
                  </label>
                  <select
                    required
                    value={formData.object_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, object_id: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-zinc-100 transition-all font-medium"
                  >
                    <option value="">-- Не выбран --</option>
                    {objects.map(obj => (
                      <option key={obj.id} value={obj.id}>{obj.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Дата ТО
                  </label>
                  <input
                    type="date"
                    value={formData.last_service}
                    onChange={(e) => setFormData(prev => ({ ...prev, last_service: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-zinc-100 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">
                    Инспектор
                  </label>
                  <input
                    type="text"
                    placeholder="ФИО"
                    value={formData.inspector}
                    onChange={(e) => setFormData(prev => ({ ...prev, inspector: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-zinc-100 transition-all font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-5 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="active:scale-95 transition-all px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="active:scale-95 transition-all px-5 py-2.5 bg-[#F95700] hover:bg-[#e04e00] text-white rounded-xl text-sm font-bold flex items-center shadow-md shadow-orange-500/20"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {isStatusModalOpen && statusItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 transition-all">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-gray-100 dark:border-zinc-800 bg-gray-50/50">
              <h3 className="text-lg font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">Смена статуса</h3>
              <p className="text-sm text-gray-500 dark:text-zinc-400 mt-1">{statusItem.name}</p>
            </div>
            <form onSubmit={handleStatusSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Новый статус</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-zinc-100 transition-all font-medium"
                >
                  <option value="На базе">На базе</option>
                  <option value="На объекте">На объекте</option>
                  <option value="В ремонте">В ремонте</option>
                  <option value="Списано">Списано</option>
                </select>
              </div>

              {newStatus === 'На объекте' && (
                <div className="animate-in fade-in slide-in-from-top-2">
                  <label className="block text-[11px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1.5">Выберите объект</label>
                  <select
                    required
                    value={newObjectId}
                    onChange={(e) => setNewObjectId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[#1a1a1a] dark:text-zinc-100 transition-all font-medium"
                  >
                    <option value="">-- Не выбран --</option>
                    {objects.map(obj => (
                      <option key={obj.id} value={obj.id}>{obj.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-5 border-t border-gray-100 dark:border-zinc-800 mt-6">
                <button
                  type="button"
                  onClick={() => setIsStatusModalOpen(false)}
                  className="active:scale-95 transition-all px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="active:scale-95 transition-all px-5 py-2.5 bg-[#1a1a1a] hover:bg-black text-white rounded-xl text-sm font-bold flex items-center shadow-md shadow-black/20"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Применить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Viewer Modal */}
      {isQrModalOpen && qrItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 transition-all">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">QR Код</h3>
              <button onClick={() => setIsQrModalOpen(false)} className="p-2 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 transition-all">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-8 flex flex-col items-center justify-center bg-gray-50/50">
              <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 mb-4">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="QR" className="w-48 h-48 object-contain" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-gray-400">Генерация...</div>
                )}
              </div>
              <p className="font-bold text-center text-[#1a1a1a] dark:text-zinc-100 text-lg">{qrItem.name}</p>
              <p className="text-sm text-gray-500 dark:text-zinc-400 font-mono mt-1">ID: {qrItem.id}</p>
            </div>
            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-end gap-3 bg-white dark:bg-zinc-900">
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-zinc-400 bg-gray-100 dark:bg-zinc-800 rounded-xl hover:bg-gray-200 dark:hover:bg-zinc-700 transition-all"
              >
                Закрыть
              </button>
              <button
                onClick={handlePrintQr}
                className="px-4 py-2 text-sm font-bold text-white bg-[#F95700] rounded-xl hover:bg-[#e04e00] transition-all flex items-center shadow-md shadow-orange-500/20"
              >
                <Printer className="w-4 h-4 mr-2" />
                Печать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[6px] p-4">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-1.5">
                <Camera className="w-5 h-5 text-[#F95700]" /> Сканирование оборудования
              </h3>
              <button
                onClick={handleCloseScanner}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-gray-500 dark:text-zinc-400 text-center">
                Направьте камеру устройства на штрихкод или QR-код оборудования для изменения его статуса.
              </p>

              {cameras.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                    Активная камера
                  </label>
                  <select
                    value={selectedCameraId}
                    onChange={(e) => handleSwitchCamera(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white cursor-pointer"
                  >
                    {cameras.map((camera) => (
                      <option key={camera.id} value={camera.id}>
                        {camera.label || `Камера ${camera.id.slice(0, 5)}...`}
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-gray-400 dark:text-zinc-500 italic mt-1 leading-snug">
                    * Примечание: На смартфонах с несколькими объективами переключение между задними камерами может всё равно открывать только основную камеру из-за ограничений браузера.
                  </span>
                </div>
              )}

              <div className="relative overflow-hidden rounded-xl bg-black border border-zinc-800 aspect-square flex items-center justify-center">
                <div id={scannerId} className="w-full h-full"></div>
                {/* Scanner laser overlay line */}
                <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-[#F95700]/70 shadow-[0_0_8px_#F95700] animate-pulse"></div>
              </div>

              {scannerError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-650 dark:text-red-400 text-xs rounded-lg flex items-center font-medium">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 animate-bounce" />
                  <span>{scannerError}</span>
                </div>
              )}

              {unregisteredBarcode && (
                <div className="p-4 bg-amber-50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-xl text-center space-y-3">
                  <p className="text-xs text-amber-800 dark:text-amber-400 font-semibold leading-relaxed">
                    Штрихкод <span className="font-mono font-bold bg-amber-100 dark:bg-zinc-800 text-amber-950 dark:text-white px-2 py-0.5 rounded border border-amber-200 dark:border-zinc-700">{unregisteredBarcode}</span> не найден в базе оборудования.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateFromBarcode}
                    className="w-full py-2.5 bg-[#F95700] hover:bg-[#e04e00] active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-lg shadow-orange-500/10"
                  >
                    ➕ Зарегистрировать новое оборудование
                  </button>
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-zinc-950 border-t border-gray-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={handleCloseScanner}
                className="px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 font-semibold cursor-pointer"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 transition-all">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="p-3 bg-red-50 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-['Montserrat']">Списание?</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-zinc-400">
              Вы уверены, что хотите удалить оборудование из системы? Если оно сломано, лучше перевести его в статус "Списано".
            </p>
            <div className="flex justify-end space-x-3 pt-4 mt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="active:scale-95 transition-all px-5 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-200 rounded-xl text-sm hover:bg-gray-200 dark:hover:bg-zinc-700 font-semibold"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteId !== null && handleDeleteEquipment(deleteId)}
                className="active:scale-95 transition-all px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold shadow-md shadow-red-600/20"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4 transition-all">
          <div className="bg-white dark:bg-zinc-900 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-500">
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-['Montserrat']">Массовое удаление</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Вы уверены, что хотите удалить выбранное оборудование ({selectedIds.length} шт.)? Это действие нельзя отменить.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
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
            </div>
          </div>
        </div>
      )}
      </div>
      )}
    </div>
  );
};
