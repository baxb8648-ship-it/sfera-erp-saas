import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, Search, Edit2, Trash2, X, AlertTriangle, Package, Check, 
  RefreshCw, QrCode, Scan, Camera, Volume2, Printer, ClipboardCheck,
  ShoppingBag, Loader2
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Helmet } from 'react-helmet-async';
import QRCode from 'qrcode';
import { apiClient } from '../../api/client';
import { useToast } from '../../components/ui/Toast';

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  barcode?: string | null;
}

export const Inventory: React.FC = () => {
  const toast = useToast();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [isLoading, setIsLoading] = useState(false);

  // Страховой запас (Safety Stock)
  const [thresholds, setThresholds] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem('sphera_inventory_thresholds');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  useEffect(() => {
    localStorage.setItem('sphera_inventory_thresholds', JSON.stringify(thresholds));
  }, [thresholds]);

  const getMinThreshold = (item: InventoryItem) => {
    if (thresholds[item.id] !== undefined) {
      return thresholds[item.id];
    }
    // Дефолтные значения по единицам измерения
    if (item.unit === 'шт') return 10;
    if (item.unit === 'т') return 1;
    return 25; // для кг, л, м
  };

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'шт',
    category: 'Строительные материалы',
    barcode: '',
    min_threshold: ''
  });
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [auditFacts, setAuditFacts] = useState<{ [id: number]: number }>({});

  const handleOpenAudit = () => {
    const facts: { [id: number]: number } = {};
    items.forEach(i => {
      facts[i.id] = i.quantity;
    });
    setAuditFacts(facts);
    setIsAuditModalOpen(true);
  };

  const handlePrintAuditAct = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;
    const rows = items.map(i => {
      const fact = auditFacts[i.id] ?? i.quantity;
      const diff = fact - i.quantity;
      return `
        <tr>
          <td>${i.id}</td>
          <td>${i.name}</td>
          <td>${i.category || '—'}</td>
          <td>${i.quantity} ${i.unit}</td>
          <td><b>${fact} ${i.unit}</b></td>
          <td style="color:${diff < 0 ? 'red' : diff > 0 ? 'green' : '#444'}">${diff > 0 ? '+' : ''}${diff} ${i.unit}</td>
        </tr>
      `;
    }).join('');

    printWin.document.write(`
      <html>
        <head>
          <title>Инвентаризационная опись ИНВ-3 • СФЕРА ERP</title>
          <style>
            body { font-family: sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 20px; margin-bottom: 4px; }
            p { font-size: 13px; color: #666; margin-bottom: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: left; }
            th { background: #f4f4f5; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <h1>ИНВЕНТАРИЗАЦИОННАЯ СЛИЧИТЕЛЬНАЯ ВЕДОМОСТЬ (ИНВ-3)</h1>
          <p>Дата формирования: ${new Date().toLocaleDateString('ru-RU')} • Склад: Основной склад СФЕРА ERP</p>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Наименование ТМЦ</th>
                <th>Категория</th>
                <th>По учету (книга)</th>
                <th>Фактически на складе</th>
                <th>Отклонение (Излишек / Недостача)</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  useEffect(() => {
    setSelectedIds([]);
  }, [selectedCategory, searchQuery]);

  // QR Code States
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [qrItem, setQrItem] = useState<InventoryItem | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');

  // Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const scannerId = "qr-reader-container";
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [scanTarget, setScanTarget] = useState<'adjust' | 'form_barcode'>('adjust');

  // Scan adjustment states
  const [isScanAdjustOpen, setIsScanAdjustOpen] = useState(false);
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [adjustmentQty, setAdjustmentQty] = useState('1');
  const [adjustmentError, setAdjustmentError] = useState('');
  const [unregisteredBarcode, setUnregisteredBarcode] = useState('');

  const categories = [
    'Все',
    'Строительные материалы',
    'Инструменты и оборудование',
    'Спецодежда и СИЗ',
    'Расходные материалы',
    'Запчасти и комплектующие',
    'Электрика и освещение',
    'Сантехника и трубы'
  ];

  const units = ['кг', 'л', 'шт', 'т', 'м'];

  useEffect(() => {
    fetchInventory();
    return () => {
      stopScannerInternal();
    };
  }, []);

  const handleShowQrModal = (item: InventoryItem) => {
    setQrItem(item);
    QRCode.toDataURL(`sphera-inv-${item.id}`, { width: 256, margin: 2 }, (err, url) => {
      if (err) {
        console.error(err);
        return;
      }
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
              box-shadow: 0 4px 6px rgba(0,0,0,0.05);
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
            <p>${qrItem.name} (${qrItem.category || ''})</p>
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
    } catch (e) {
      console.error("Audio Context beep failed", e);
    }
  };

  const startScanner = async (target: 'adjust' | 'form_barcode' = 'adjust', forceCameraId?: string) => {
    setScanTarget(target);
    setIsScannerOpen(true);
    setScannerError('');
    setUnregisteredBarcode('');
    
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      setScannerError('Ошибка доступа к камере: Требуется защищенное соединение (HTTPS) для использования камеры.');
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
        console.error("Failed to start scanner", err);
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
      } catch (err) {
        console.error("Failed to clear scanner", err);
      }
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
      if (decodedText.startsWith("sphera-inv-")) {
        const id = parseInt(decodedText.replace("sphera-inv-", ""), 10);
        const matched = items.find(i => i.id === id);
        if (matched) {
          playBeep();
          await stopScannerInternal();
          setIsScannerOpen(false);
          setScannedItem(matched);
          setAdjustmentQty('1');
          setAdjustmentError('');
          setIsScanAdjustOpen(true);
        } else {
          setScannerError(`Товар с ID ${id} не найден на складе`);
        }
      } else {
        try {
          const matchedItem = await apiClient.get(`/inventory/barcode/${encodeURIComponent(decodedText)}`);
          if (matchedItem) {
            playBeep();
            await stopScannerInternal();
            setIsScannerOpen(false);
            setScannedItem(matchedItem);
            setAdjustmentQty('1');
            setAdjustmentError('');
            setIsScanAdjustOpen(true);
          } else {
            setUnregisteredBarcode(decodedText);
            setScannerError('');
          }
        } catch (e) {
          setUnregisteredBarcode(decodedText);
          setScannerError('');
        }
      }
    }
  };

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const handleHardwareScan = async (barcode: string) => {
    playBeep();
    await stopScannerInternal();
    setIsScannerOpen(false);

    if (barcode.startsWith("sphera-inv-")) {
      const id = parseInt(barcode.replace("sphera-inv-", ""), 10);
      const matched = itemsRef.current.find(i => i.id === id);
      if (matched) {
        setScannedItem(matched);
        setAdjustmentQty('1');
        setAdjustmentError('');
        setIsScanAdjustOpen(true);
      } else {
        alert(`Товар с ID ${id} не найден на складе`);
      }
    } else {
      const matched = itemsRef.current.find(i => i.barcode === barcode);
      if (matched) {
        setScannedItem(matched);
        setAdjustmentQty('1');
        setAdjustmentError('');
        setIsScanAdjustOpen(true);
      } else {
        try {
          const matchedItem = await apiClient.get(`/inventory/barcode/${encodeURIComponent(barcode)}`);
          if (matchedItem) {
            setScannedItem(matchedItem);
            setAdjustmentQty('1');
            setAdjustmentError('');
            setIsScanAdjustOpen(true);
          } else {
            handleOpenCreateModal(barcode);
          }
        } catch (e) {
          console.error("Error looking up barcode", e);
          handleOpenCreateModal(barcode);
        }
      }
    }
  };

  const handleHardwareScanRef = useRef(handleHardwareScan);
  useEffect(() => {
    handleHardwareScanRef.current = handleHardwareScan;
  }, [handleHardwareScan]);

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      if (e.key.length > 1 && e.key !== 'Enter') return;

      const diff = now - lastKeyTime;
      lastKeyTime = now;

      if (buffer.length > 0 && diff > 50) {
        buffer = '';
      }

      if (e.key === 'Enter') {
        if (buffer.length >= 3) {
          e.preventDefault();
          e.stopPropagation();
          const barcode = buffer;
          buffer = '';
          if (handleHardwareScanRef.current) {
            handleHardwareScanRef.current(barcode);
          }
        }
        buffer = '';
      } else {
        buffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, []);

  const handleCloseScanner = async () => {
    await stopScannerInternal();
    setIsScannerOpen(false);
  };

  const handleScanAdjustSubmit = async (e: React.FormEvent, action: 'add' | 'remove') => {
    e.preventDefault();
    if (!scannedItem) return;
    setAdjustmentError('');

    const qtyVal = parseFloat(adjustmentQty);
    if (isNaN(qtyVal) || qtyVal <= 0) {
      setAdjustmentError('Количество должно быть числом больше 0');
      return;
    }

    const currentQty = scannedItem.quantity;
    let targetQty = action === 'add' ? currentQty + qtyVal : currentQty - qtyVal;
    if (targetQty < 0) {
      setAdjustmentError('Расход превышает имеющийся остаток на складе');
      return;
    }
    try {
      await apiClient.patch(`/inventory/${scannedItem.id}`, {
        name: scannedItem.name,
        quantity: targetQty,
        unit: scannedItem.unit,
        category: scannedItem.category
      });
      setIsScanAdjustOpen(false);
      fetchInventory();
    } catch (err: any) {
      setAdjustmentError(err?.message || 'Не удалось обновить остаток');
    }
  };

  const handleCreateFromBarcode = async () => {
    const code = unregisteredBarcode;
    setUnregisteredBarcode('');
    await stopScannerInternal();
    setIsScannerOpen(false);
    handleOpenCreateModal(code);
  };

  const handleInstantAdjust = async (action: 'add' | 'remove', amount: number) => {
    if (!scannedItem) return;
    setAdjustmentError('');

    const currentQty = scannedItem.quantity;
    let targetQty = action === 'add' ? currentQty + amount : currentQty - amount;
    if (targetQty < 0) {
      setAdjustmentError('Расход превышает имеющийся остаток на складе');
      return;
    }
    try {
      await apiClient.patch(`/inventory/${scannedItem.id}`, {
        name: scannedItem.name,
        quantity: targetQty,
        unit: scannedItem.unit,
        category: scannedItem.category
      });
      setIsScanAdjustOpen(false);
      fetchInventory();
    } catch (err: any) {
      setAdjustmentError(err?.message || 'Не удалось обновить остаток');
    }
  };

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient.get('/inventory/');
      setItems(data || []);
    } catch (e) {
      console.error('Failed to fetch inventory', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenCreateModal = (prefilledBarcode: string = '') => {
    setModalType('create');
    setFormData({
      name: '',
      quantity: '0',
      unit: 'шт',
      category: 'Строительные материалы',
      barcode: prefilledBarcode,
      min_threshold: '10'
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: InventoryItem) => {
    setModalType('edit');
    setCurrentItemId(item.id);
    setFormData({
      name: item.name,
      quantity: item.quantity.toString(),
      unit: item.unit,
      category: item.category || 'Строительные материалы',
      barcode: item.barcode || '',
      min_threshold: getMinThreshold(item).toString()
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Укажите наименование');
      return;
    }

    const qty = parseFloat(formData.quantity);
    if (isNaN(qty) || qty < 0) {
      setFormError('Количество должно быть неотрицательным числом');
      return;
    }

    const minT = parseFloat(formData.min_threshold);
    if (isNaN(minT) || minT < 0) {
      setFormError('Минимальный запас должен быть числом');
      return;
    }

    const payload = {
      name: formData.name,
      quantity: qty,
      unit: formData.unit,
      category: formData.category,
      barcode: formData.barcode.trim() || null
    };

    try {
      let savedItem: any = null;
      if (modalType === 'create') {
        savedItem = await apiClient.post('/inventory/', payload);
      } else {
        savedItem = await apiClient.patch(`/inventory/${currentItemId}`, payload);
      }

      if (savedItem && savedItem.id) {
        setThresholds(prev => ({ ...prev, [savedItem.id]: minT }));
      }
      setIsModalOpen(false);
      fetchInventory();
    } catch (err: any) {
      setFormError(err?.message || 'Ошибка при сохранении');
    }
  };

  const handleQuickAdjust = async (id: number, delta: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;

    const newQty = Math.max(0, item.quantity + delta);
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty } : i));

    try {
      await apiClient.patch(`/inventory/${id}`, {
        name: item.name,
        quantity: newQty,
        unit: item.unit,
        category: item.category
      });
    } catch (e) {
      console.error(e);
      fetchInventory();
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await apiClient.delete(`/inventory/${id}`);
      setDeleteId(null);
      setSelectedIds(prev => prev.filter(item_id => item_id !== id));
      fetchInventory();
    } catch (e) {
      console.error('Failed to delete item', e);
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
        await apiClient.delete(`/inventory/${id}`);
      }
      setSelectedIds([]);
      fetchInventory();
    } catch (e) {
      console.error(e);
      alert("Ошибка при удалении некоторых позиций");
      fetchInventory();
    }
  };

  // Автозаказ поставщику на дефицитные позиции
  const handleGenerateOrderSupplier = () => {
    const deficitItems = items.filter(item => item.quantity < getMinThreshold(item));
    if (deficitItems.length === 0) {
      toast.success('Все запасы в норме! Заказ поставщику не требуется.');
      return;
    }

    let textOrder = `
========================================
ЗАЯВКА НА ПОПОЛНЕНИЕ СКЛАДА: СФЕРА ERP
========================================
Дата: ${new Date().toLocaleDateString('ru-RU')}
Склад: Основной склад компании (SaaS)

ТРЕБУЕТСЯ ЗАКУПИТЬ ДЛЯ ВОССТАНОВЛЕНИЯ МИН. ЗАПАСОВ:
----------------------------------------
`;

    deficitItems.forEach((item, idx) => {
      const threshold = getMinThreshold(item);
      const toOrder = threshold * 2 - item.quantity; // заказываем с запасом до двойного минимума
      textOrder += `${idx + 1}) ${item.name}\n   Текущий остаток: ${item.quantity} ${item.unit} | Мин. порог: ${threshold} ${item.unit}\n   Рекомендуемый объем закупки: +${toOrder} ${item.unit}\n\n`;
    });

    textOrder += `----------------------------------------\nВсего позиций к заказу: ${deficitItems.length}\n========================================`;
    
    navigator.clipboard.writeText(textOrder.trim());
    toast.success('Спецификация автозаказа скопирована в буфер обмена!');
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Все' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalItemsCount = items.length;
  // Запас на исходе — те, что меньше своего индивидуального порога
  const lowStockCount = items.filter(i => i.quantity < getMinThreshold(i)).length;
  const totalVolume = items.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12 p-1 text-left font-['Inter']">
      <Helmet>
        <title>Склад | СФЕРА</title>
      </Helmet>

      {/* Top statistics overview cards - DOUBLE BEZEL & GEIST MONO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-orange-500/5 hover:border-orange-500/20 group">
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-[calc(2rem-0.25rem)] flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-405 dark:text-zinc-500 font-black font-mono">Всего позиций ТМЦ</p>
              <h3 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white font-mono mt-2">{totalItemsCount}</h3>
            </div>
            <div className="p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 text-[#F95700]">
              <Package className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-rose-500/5 hover:border-rose-500/20 group">
          <div className="bg-white dark:bg-zinc-950 p-5 rounded-[calc(2rem-0.25rem)] flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-405 dark:text-zinc-500 font-black font-mono">Критический дефицит</p>
              <h3 className={`text-xl lg:text-2xl font-black font-mono mt-2 ${lowStockCount > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{lowStockCount}</h3>
            </div>
            <div className={`p-3 rounded-xl border ${lowStockCount > 0 ? 'bg-red-500/5 border-red-500/10 text-red-500' : 'bg-emerald-500/5 border-emerald-500/10 text-emerald-500'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm transition-all duration-300 hover:shadow-blue-500/5 hover:border-blue-500/20 group">
          <div className="bg-white dark:bg-zinc-955 p-5 rounded-[calc(2rem-0.25rem)] flex items-center justify-between">
            <div>
              <p className="text-[9px] uppercase tracking-widest text-zinc-405 dark:text-zinc-500 font-black font-mono">Суммарный объем запасов</p>
              <h3 className="text-xl lg:text-2xl font-black text-gray-900 dark:text-white font-mono mt-2">
                {totalVolume.toLocaleString('ru-RU')} ед.
              </h3>
            </div>
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-500">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      {/* Voice Telegram Command Info Panel */}
      <div className="bg-zinc-900 border border-zinc-850 p-6 rounded-[2.5rem] relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4 text-white">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#F95700]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="w-11 h-11 bg-[#F95700]/10 border border-[#F95700]/20 rounded-2xl flex items-center justify-center text-[#F95700] shrink-0">
            <Volume2 className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-extrabold text-sm uppercase tracking-wider font-sans">
              Голосовое списание ТМЦ в Telegram-боте
            </h4>
            <p className="text-xs text-zinc-405 mt-1 leading-relaxed max-w-3xl">
              Ваши прорабы и мастера цеха могут просто наговаривать списание материалов голосом прямо на объекте. ИИ-ассистент платформы СФЕРА автоматически распознает аудиосообщение, найдет позицию, рассчитает расход и скорректирует складской остаток.
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            window.location.hash = '#/crm/ai-agents';
          }}
          className="px-4.5 py-3 bg-[#F95700] hover:bg-orange-600 text-white font-black rounded-2xl text-[10px] uppercase tracking-wider font-mono transition-colors cursor-pointer shrink-0"
        >
          Настроить бота ПТО ➔
        </button>
      </div>

      {/* Control bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm">
        <div className="flex flex-1 items-center space-x-3 bg-zinc-50 dark:bg-zinc-900 px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800">
          <Search className="w-4 h-4 text-zinc-450 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск по наименованию ТМЦ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-xs text-zinc-850 dark:text-white placeholder-zinc-400 font-bold focus:ring-0"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full xl:w-auto justify-end">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="px-4 py-2.5 bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 active:scale-[0.97] rounded-xl transition-all font-mono uppercase tracking-wider text-[10px] font-black cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-1 inline" /> Удалить ({selectedIds.length})
            </button>
          )}

          <button
            onClick={handleGenerateOrderSupplier}
            className="px-4 py-2.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 active:scale-[0.97] rounded-xl transition-all font-mono uppercase tracking-wider text-[10px] font-black cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 mr-1 text-[#F95700] inline" /> Автозаказ поставщику
          </button>

          <button
            onClick={handleOpenAudit}
            className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-[0.97] rounded-xl transition-all font-mono uppercase tracking-wider text-[10px] font-black cursor-pointer border border-zinc-200 dark:border-zinc-800"
          >
            <ClipboardCheck className="w-4 h-4 mr-1 text-[#F95700] inline" /> Сличительный акт (ИНВ-3)
          </button>

          <button
            onClick={() => startScanner('adjust')}
            className="px-4 py-2.5 bg-zinc-100 dark:bg-zinc-900 text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-800 active:scale-[0.97] rounded-xl transition-all font-mono uppercase tracking-wider text-[10px] font-black cursor-pointer border border-zinc-200 dark:border-zinc-800"
          >
            <Scan className="w-4 h-4 mr-1 text-blue-500 inline" /> Сканировать QR
          </button>
          
          <button
            onClick={() => handleOpenCreateModal()}
            className="px-4.5 py-2.5 bg-[#F95700] hover:bg-orange-600 text-white active:scale-[0.97] rounded-xl transition-all font-mono uppercase tracking-wider text-[10px] font-black shadow-md shadow-orange-500/15 cursor-pointer"
          >
            <Plus className="w-4.5 h-4.5 mr-1 inline" /> Добавить ТМЦ
          </button>
        </div>
      </div>

      {/* Categories chips filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4.5 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-[#F95700] text-white shadow-sm shadow-orange-500/10'
                : 'bg-white dark:bg-zinc-950 text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40">
          <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)] py-16 text-center font-mono text-[10px] uppercase text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-[#F95700]" /> Синхронизация склада ТМЦ...
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40">
          <div className="bg-white dark:bg-zinc-955 p-12 rounded-[calc(2rem-0.25rem)] text-center text-zinc-400 font-mono text-[10px] uppercase space-y-2 flex flex-col items-center justify-center">
            <Package className="w-12 h-12 text-[#F95700] opacity-40 mb-2" />
            <span>Товары на складе не обнаружены</span>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block relative overflow-hidden p-1 rounded-[2rem] bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/40 shadow-sm">
            <div className="bg-white dark:bg-zinc-950 p-6 rounded-[calc(2rem-0.25rem)]">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 text-[10px] font-black text-zinc-400 dark:text-zinc-500 uppercase font-mono tracking-wider">
                    <th className="pb-3.5 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={filteredItems.length > 0 && selectedIds.length === filteredItems.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(filteredItems.map(i => i.id));
                          } else {
                            setSelectedIds([]);
                          }
                        }}
                        className="rounded border-zinc-300 dark:border-zinc-750 text-[#F95700] focus:ring-[#F95700] cursor-pointer w-4 h-4"
                      />
                    </th>
                    <th className="pb-3.5 px-4">Наименование ТМЦ</th>
                    <th className="pb-3.5 px-4">Категория</th>
                    <th className="pb-3.5 px-4">Текущий остаток</th>
                    <th className="pb-3.5 px-4 text-center">Мин. страховой порог</th>
                    <th className="pb-3.5 px-4 text-center">Быстрое изменение</th>
                    <th className="pb-3.5 text-center">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/40 text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                  {filteredItems.map((item) => {
                    const threshold = getMinThreshold(item);
                    const isDeficit = item.quantity < threshold;
                    return (
                      <tr key={item.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/10 transition-colors">
                        <td className="py-3.5 text-center">
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
                            className="rounded border-zinc-300 dark:border-zinc-750 text-[#F95700] focus:ring-[#F95700] cursor-pointer w-4 h-4"
                          />
                        </td>
                        <td className="py-3.5 px-4 font-bold text-zinc-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <span>{item.name}</span>
                            {isDeficit && (
                              <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono tracking-wider border border-red-500/20">
                                ДЕФИЦИТ
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-zinc-100 dark:bg-zinc-900 text-zinc-650 dark:text-zinc-400">
                            {item.category || 'Без категории'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-black text-sm">
                          <span className={isDeficit ? 'text-red-500' : 'text-zinc-900 dark:text-white'}>
                            {item.quantity} {item.unit}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-mono font-black text-zinc-400">
                          {threshold} {item.unit}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center justify-center space-x-1 font-mono">
                            <button
                              onClick={() => handleQuickAdjust(item.id, -10)}
                              className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-rose-500/10 hover:text-rose-500 rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              -10
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(item.id, -1)}
                              className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-rose-500/10 hover:text-rose-500 rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(item.id, 1)}
                              className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-500 rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(item.id, 10)}
                              className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 hover:bg-emerald-500/10 hover:text-emerald-500 rounded text-[10px] font-bold cursor-pointer transition-colors"
                            >
                              +10
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 text-center space-x-1.5">
                          <button
                            onClick={() => handleShowQrModal(item)}
                            className="p-1.5 text-zinc-400 hover:text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors cursor-pointer"
                            title="QR-код"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 text-zinc-400 hover:text-[#F95700] hover:bg-orange-500/10 rounded-md transition-colors cursor-pointer"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-500/10 rounded-md transition-colors cursor-pointer"
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

          {/* Mobile Cards View */}
          <div className="block md:hidden space-y-4 py-2">
            {filteredItems.map((item) => {
              const threshold = getMinThreshold(item);
              const isDeficit = item.quantity < threshold;
              return (
                <div key={item.id} className="bg-white dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-sm space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-start gap-2.5">
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
                        className="rounded border-zinc-300 dark:border-zinc-750 text-[#F95700] focus:ring-[#F95700] cursor-pointer w-4 h-4 mt-0.5"
                      />
                      <div>
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm leading-tight break-words">{item.name}</h4>
                        <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{item.category || 'Без категории'}</p>
                      </div>
                    </div>
                    {isDeficit && (
                      <span className="bg-red-500/10 text-red-500 px-1.5 py-0.5 rounded text-[8px] font-black uppercase font-mono tracking-wider border border-red-500/20 shrink-0">
                        ДЕФИЦИТ
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-zinc-200/40 dark:border-zinc-800/40">
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black uppercase font-mono">Остаток:</span>
                      <p className={`font-mono font-black text-sm mt-0.5 ${isDeficit ? 'text-red-500' : 'text-zinc-900 dark:text-white'}`}>{item.quantity} {item.unit}</p>
                    </div>
                    <div>
                      <span className="text-zinc-400 dark:text-zinc-500 text-[9px] font-black uppercase font-mono">Мин. порог:</span>
                      <p className="font-mono font-black text-zinc-450 dark:text-zinc-400 text-sm mt-0.5">{threshold} {item.unit}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40">
                    <div className="flex items-center space-x-1 font-mono">
                      <button
                        onClick={() => handleQuickAdjust(item.id, -1)}
                        className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-305 hover:bg-rose-500/10 hover:text-rose-500 rounded text-[9px] font-bold cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(item.id, 1)}
                        className="px-2 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-305 hover:bg-emerald-500/10 hover:text-emerald-500 rounded text-[9px] font-bold cursor-pointer"
                      >
                        +1
                      </button>
                    </div>

                    <div className="flex gap-1">
                      <button onClick={() => handleShowQrModal(item)} className="p-1.5 text-zinc-400 hover:text-blue-500 rounded-md"><QrCode className="w-4 h-4" /></button>
                      <button onClick={() => handleOpenEditModal(item)} className="p-1.5 text-zinc-400 hover:text-[#F95700] rounded-md"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(item.id)} className="p-1.5 text-zinc-400 hover:text-red-500 rounded-md"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            
            <div className="flex items-center justify-between mb-5 border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <Package className="w-5 h-5 text-[#F95700]" /> {modalType === 'create' ? 'Создать ТМЦ карточку' : 'Редактировать ТМЦ'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4">
              {formError && (
                <div className="p-3 bg-rose-500/10 text-rose-505 border border-rose-500/20 text-xs font-bold rounded-xl">{formError}</div>
              )}

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Наименование ТМЦ *</label>
                <input
                  type="text" required
                  placeholder="Грунт полиуретановый..."
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Количество</label>
                  <input
                    type="number" step="any" required
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Ед. измерения</label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Мин. страховой порог</label>
                  <input
                    type="number" required
                    value={formData.min_threshold}
                    onChange={(e) => setFormData(prev => ({ ...prev, min_threshold: e.target.value }))}
                    className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Категория</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-955 text-xs font-bold focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  >
                    {categories.filter(c => c !== 'Все').map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Штрихкод</label>
                <div className="flex gap-2">
                  <input
                    type="text" placeholder="Штрихкод производителя..."
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="flex-1 px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-955 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono dark:text-white focus:outline-none focus:ring-1 focus:ring-[#F95700]"
                  />
                  <button
                    type="button"
                    onClick={() => startScanner('form_barcode')}
                    className="p-2 border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 text-zinc-450 dark:text-zinc-400 rounded-xl cursor-pointer transition-colors"
                  >
                    <Camera className="w-5 h-5 text-[#F95700]" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-pointer">
                  Отмена
                </button>
                <button type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#F95700] hover:bg-orange-600 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-500">
              <div className="p-2.5 bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black font-sans uppercase tracking-wider">Удалить позицию ТМЦ?</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-bold">
              Вы хотите навсегда стереть эту ТМЦ позицию со склада? Все связанные приходы и расходы по объектам станут архивными.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-505 cursor-pointer">
                Отмена
              </button>
              <button onClick={() => deleteId !== null && handleDeleteItem(deleteId)}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer font-mono uppercase tracking-wider">
                Удалить ТМЦ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. QR Code Viewer Modal */}
      {isQrModalOpen && qrItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <QrCode className="w-5 h-5 text-blue-500" /> QR Этикетка ТМЦ
              </h3>
              <button onClick={() => setIsQrModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4.5 h-4.5 text-zinc-400" />
              </button>
            </div>
            
            <div className="bg-white p-4 rounded-2xl inline-block border border-zinc-200 shadow-inner">
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-sm text-gray-900 dark:text-white break-words">{qrItem.name}</h4>
              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-950 py-1 px-3 rounded w-fit mx-auto font-mono font-bold border border-zinc-200 dark:border-zinc-800">
                sphera-inv-{qrItem.id}
              </p>
            </div>

            <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button onClick={() => setIsQrModalOpen(false)} className="w-full py-2 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 font-bold text-xs rounded-xl cursor-pointer">
                Закрыть
              </button>
              <button onClick={handlePrintQr} className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider">
                <Printer className="w-4 h-4" /> Печать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Camera Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-md w-full p-6 shadow-2xl relative overflow-hidden text-left space-y-4">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#F95700]" /> Сканер штрих/QR-кода
              </h3>
              <button onClick={handleCloseScanner} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4.5 h-4.5 text-zinc-400" />
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 text-center leading-relaxed font-bold">
              Поместите QR-код или линейный штрихкод товара в рамку видоискателя для быстрого поиска ТМЦ.
            </p>

            {cameras.length > 0 && (
              <div className="space-y-1.5">
                <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-550 uppercase tracking-widest font-mono">Выбор камеры</label>
                <select
                  value={selectedCameraId}
                  onChange={(e) => handleSwitchCamera(e.target.value)}
                  className="w-full px-2 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 text-xs font-bold focus:outline-none"
                >
                  {cameras.map((camera) => (
                    <option key={camera.id} value={camera.id}>
                      {camera.label || `Видеокамера ${camera.id.slice(0, 5)}...`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="relative overflow-hidden rounded-2xl bg-black aspect-square flex items-center justify-center border border-zinc-800">
              <div id={scannerId} className="w-full h-full"></div>
              {/* Laser Line */}
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-[#F95700]/70 shadow-[0_0_8px_#F95700] animate-pulse"></div>
            </div>

            {scannerError && (
              <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold rounded-xl">{scannerError}</div>
            )}

            {unregisteredBarcode && (
              <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl text-center space-y-3">
                <p className="text-xs text-amber-600 leading-relaxed font-bold">
                  Код <span className="font-mono bg-zinc-100 dark:bg-zinc-950 px-1 py-0.5 rounded text-amber-500">{unregisteredBarcode}</span> отсутствует на складе.
                </p>
                <button
                  type="button"
                  onClick={handleCreateFromBarcode}
                  className="w-full py-2 bg-[#F95700] hover:bg-orange-600 text-white font-black text-[10px] uppercase tracking-wider font-mono rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Зарегистрировать ТМЦ
                </button>
              </div>
            )}
            
            <div className="flex justify-end pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button type="button" onClick={handleCloseScanner}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-pointer">
                Закрыть сканер
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Scan Adjust/Quick Adjustment Modal */}
      {isScanAdjustOpen && scannedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-[#F95700]/10 to-transparent rounded-full blur-2xl pointer-events-none" />
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-500" /> ТМЦ Код Распознан!
              </h3>
              <button onClick={() => setIsScanAdjustOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4.5 h-4.5 text-zinc-400" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-orange-500/10 text-[#F95700] flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-gray-900 dark:text-white break-words">{scannedItem.name}</h4>
              <p className="text-[10px] text-zinc-405 dark:text-zinc-500 font-mono font-bold">Остаток: {scannedItem.quantity} {scannedItem.unit} | Мин: {getMinThreshold(scannedItem)} {scannedItem.unit}</p>
            </div>

            {adjustmentError && (
              <div className="p-3 bg-rose-500/10 text-rose-500 border border-rose-500/20 text-xs font-bold rounded-xl">{adjustmentError}</div>
            )}

            <form className="space-y-4 text-left">
              <div>
                <label className="block text-[8px] font-black text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono mb-1">Количество для прихода/расхода</label>
                <input
                  type="number" step="any" required
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs font-mono font-bold dark:text-white text-center focus:ring-1 focus:ring-[#F95700] focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap justify-center gap-1.5">
                {[-10, -5, -1, 1, 5, 10].map(val => (
                  <button
                    type="button" key={val}
                    onClick={() => {
                      const parsed = parseFloat(adjustmentQty) || 0;
                      setAdjustmentQty(Math.max(0, parsed + val).toString());
                    }}
                    className="px-3 py-1 bg-zinc-50 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 rounded font-black text-[10px] cursor-pointer"
                  >
                    {val > 0 ? `+${val}` : val}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-[10px] font-black uppercase font-mono">
                <button
                  type="button"
                  onClick={() => handleInstantAdjust('remove', 1)}
                  className="flex-1 py-2 bg-rose-500/5 text-rose-500 rounded-xl border border-rose-500/10 hover:bg-rose-500/10 cursor-pointer"
                >
                  Расход -1
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantAdjust('add', 1)}
                  className="flex-1 py-2 bg-emerald-500/5 text-emerald-500 rounded-xl border border-emerald-500/10 hover:bg-emerald-500/10 cursor-pointer"
                >
                  Приход +1
                </button>
              </div>

              <div className="flex gap-2 pt-2 text-[10px] font-black uppercase font-mono">
                <button type="button" onClick={(e) => handleScanAdjustSubmit(e, 'remove')}
                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl cursor-pointer">
                  Списать
                </button>
                <button type="button" onClick={(e) => handleScanAdjustSubmit(e, 'add')}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl cursor-pointer">
                  Пополнить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {isBulkDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
            <div className="flex items-center space-x-3 text-red-500 justify-center">
              <div className="p-2.5 bg-red-500/10 rounded-full">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black font-sans uppercase tracking-wider">Массовое удаление ТМЦ</h3>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed font-bold">
              Вы хотите стереть {selectedIds.length} позиций ТМЦ? Данное действие необратимо и пересчитает объемы ТМЦ в связанных модулях.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setIsBulkDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-pointer">
                Отмена
              </button>
              <button onClick={confirmBulkDelete}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-700 text-white cursor-pointer font-mono uppercase tracking-wider">
                Стереть все
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ИНВ-3 Audit Modal */}
      {isAuditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 text-left">
            <div className="flex justify-between items-center border-b border-zinc-100 dark:border-zinc-800 pb-3">
              <h3 className="text-sm font-black dark:text-white uppercase tracking-widest font-sans flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#F95700]" /> Инвентаризационная ведомость ИНВ-3
              </h3>
              <button onClick={() => setIsAuditModalOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer">
                <X className="w-4.5 h-4.5 text-zinc-400" />
              </button>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed font-bold">
              Укажите фактическое наличие товаров на складе для выгрузки сличительного акта ИНВ-3 с автоматическим расчетом излишков и недостач.
            </p>

            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
              {items.map(item => {
                const fact = auditFacts[item.id] ?? item.quantity;
                const diff = fact - item.quantity;
                return (
                  <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs">
                    <div className="font-bold text-gray-900 dark:text-white sm:max-w-xs truncate">{item.name}</div>
                    <div className="flex items-center gap-4">
                      <div className="font-mono text-zinc-450">Учет: <b>{item.quantity}</b> {item.unit}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold">Факт:</span>
                        <input
                          type="number"
                          value={fact}
                          onChange={(e) => setAuditFacts({ ...auditFacts, [item.id]: Number(e.target.value) })}
                          className="w-16 px-2 py-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded text-xs font-mono font-bold text-center"
                        />
                      </div>
                      <div className={`font-mono font-black w-24 text-right ${diff > 0 ? 'text-green-500' : diff < 0 ? 'text-red-500' : 'text-zinc-450'}`}>
                        {diff > 0 ? `+${diff}` : diff} {item.unit}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 mt-4">
              <button type="button" onClick={() => setIsAuditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-500 cursor-pointer">
                Отмена
              </button>
              <button type="button" onClick={handlePrintQr} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer font-mono uppercase tracking-wider" style={{ display: 'none' }} />
              <button
                type="button"
                onClick={handlePrintAuditAct}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-[#F95700] hover:bg-orange-600 text-white shadow-md transition-all cursor-pointer font-mono uppercase tracking-wider"
              >
                🖨 Печать акта ИНВ-3
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
