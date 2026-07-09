import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Edit2, Trash2, X, AlertTriangle, Package, Check, RefreshCw, QrCode, Scan, Camera, Volume2, Printer } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { Helmet } from 'react-helmet-async';
import QRCode from 'qrcode';
import { apiClient } from '../../api/client';

interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string | null;
  barcode?: string | null;
}

export const Inventory: React.FC = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Все');
  const [isLoading, setIsLoading] = useState(false);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'create' | 'edit'>('create');
  const [currentItemId, setCurrentItemId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    quantity: '',
    unit: 'кг',
    category: 'Строительные материалы',
    barcode: ''
  });
  const [formError, setFormError] = useState('');

  // Delete confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
      setScannerError('Ошибка доступа к камере: Требуется защищенное соединение (HTTPS) для использования камеры. Пожалуйста, откройте сайт по адресу https://леоника56.рф');
      return;
    }
    
    let camId = forceCameraId || selectedCameraId;
    
    // Retrieve available cameras
    try {
      const devices = await Html5Qrcode.getCameras();
      if (devices && devices.length > 0) {
        setCameras(devices);
        if (!camId) {
          // Find environment/back camera if possible
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
        
        // Start scanner using camera ID if available, otherwise fallback to environment facingMode
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
      // Restart scanner with the new cameraId
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

  // Process a scanned barcode (from Camera or Hardware Scanner)
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

  // Hardware Scanner Integration
  useEffect(() => {
    let barcodeBuffer = '';
    let lastKeyTime = Date.now();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const currentTime = Date.now();
      
      // Hardware scanners typically input characters very fast (< 50ms between strokes)
      if (currentTime - lastKeyTime > 50) {
        barcodeBuffer = '';
      }
      lastKeyTime = currentTime;

      if (e.key === 'Enter') {
        if (barcodeBuffer.length > 3) {
          console.log('[Hardware Scanner] Detected barcode:', barcodeBuffer);
          processScannedBarcode(barcodeBuffer, scanTarget);
        }
        barcodeBuffer = '';
      } else if (e.key.length === 1) { // Only printable chars
        barcodeBuffer += e.key;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [items, scanTarget]); // Add dependencies so items are fresh

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
          console.error("Error looking up barcode from hardware scanner", e);
          handleOpenCreateModal(barcode);
        }
      }
    }
  };

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const handleHardwareScanRef = useRef(handleHardwareScan);
  useEffect(() => {
    handleHardwareScanRef.current = handleHardwareScan;
  }, [handleHardwareScan]);

  useEffect(() => {
    let buffer = '';
    let lastKeyTime = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now();
      
      if (e.key.length > 1 && e.key !== 'Enter') {
        return;
      }

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
      unit: 'кг',
      category: 'Строительные материалы',
      barcode: prefilledBarcode
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
      barcode: item.barcode || ''
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

    const payload = {
      name: formData.name,
      quantity: qty,
      unit: formData.unit,
      category: formData.category,
      barcode: formData.barcode.trim() || null
    };

    try {
      if (modalType === 'create') {
        await apiClient.post('/inventory/', payload);
      } else {
        await apiClient.patch(`/inventory/${currentItemId}`, payload);
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

  // Filter and Search logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'Все' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Inventory stats
  const totalItemsCount = items.length;
  const lowStockCount = items.filter(i => i.quantity < 10).length;
  const totalVolume = items.reduce((acc, curr) => acc + curr.quantity, 0);

  return (
    <div className="space-y-6">
      <Helmet>
        <title>Склад | СФЕРА</title>
      </Helmet>
      {/* Top statistics overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 ease-out cursor-default">
          <div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">Всего позиций</p>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">{totalItemsCount}</h3>
          </div>
          <div className="p-3 rounded-lg bg-orange-50">
            <Package className="w-6 h-6 text-[#F95700]" />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 ease-out cursor-default">
          <div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">Запас на исходе (&lt; 10)</p>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-red-600">{lowStockCount}</h3>
          </div>
          <div className={`p-3 rounded-lg ${lowStockCount > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
            <AlertTriangle className={`w-6 h-6 ${lowStockCount > 0 ? 'text-red-600' : 'text-green-600'}`} />
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between hover:-translate-y-1 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300 ease-out cursor-default">
          <div>
            <p className="text-sm text-gray-500 dark:text-zinc-400 mb-1">Общий объем запасов</p>
            <h3 className="text-2xl font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-zinc-100">
              {totalVolume.toLocaleString()} ед.
            </h3>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40">
            <RefreshCw className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-zinc-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800">
        <div className="flex flex-1 items-center space-x-3 bg-gray-50 dark:bg-zinc-800 px-3 py-2 rounded-lg border border-gray-200 dark:border-zinc-700 focus-within:ring-2 focus-within:ring-[#F95700]/20 focus-within:border-[#F95700] transition-all">
          <Search className="w-4 h-4 text-gray-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder="Поиск по названию..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none w-full text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500"
          />
        </div>

        <div className="flex gap-2 w-full md:w-auto flex-wrap justify-end">
          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="active:scale-95 transition-all duration-200 flex-1 md:flex-initial flex items-center justify-center bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              <span className="truncate">Удалить ({selectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => startScanner('adjust')}
            className="active:scale-95 transition-all flex-1 md:flex-initial flex items-center justify-center bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 px-4 py-2.5 rounded-lg text-sm font-semibold cursor-pointer"
          >
            <Scan className="w-4 h-4 mr-2 text-[#F95700]" />
            Сканировать QR
          </button>
          
          <button
            onClick={() => handleOpenCreateModal()}
            className="active:scale-95 transition-all flex-1 md:flex-initial flex items-center justify-center bg-[#F95700] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#e04e00] cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-2" />
            Добавить позицию
          </button>
        </div>
      </div>

      {/* Categories chips filter */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`active:scale-95 transition-all px-4 py-2 rounded-full text-xs font-semibold ${
              selectedCategory === cat
                ? 'bg-[#F95700] text-white'
                : 'bg-white dark:bg-zinc-900 text-gray-650 dark:bg-zinc-900 dark:text-zinc-400 dark:border-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 border border-gray-200 dark:border-zinc-800'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800 text-left">
              <thead className="bg-gray-50 dark:bg-zinc-800/40 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-12 text-center">
                    <div className="h-4 bg-zinc-200 dark:bg-zinc-850 rounded w-4 mx-auto" />
                  </th>
                  <th className="px-6 py-4">Наименование</th>
                  <th className="px-6 py-4">Категория</th>
                  <th className="px-6 py-4">Остаток</th>
                  <th className="px-6 py-4 text-center">Быстрое изменение</th>
                  <th className="px-6 py-4 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm animate-pulse">
                {Array.from({ length: 5 }).map((_, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 w-12 text-center">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-855 rounded w-4 mx-auto" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-48" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-5 bg-zinc-200 dark:bg-zinc-800 rounded-full w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="h-4 bg-zinc-250 dark:bg-zinc-800 rounded w-16" />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center space-x-1">
                        <div className="w-8 h-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="w-6 h-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                        <div className="w-8 h-6 bg-zinc-200 dark:bg-zinc-800 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end space-x-2">
                        <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                        <div className="w-8 h-8 bg-zinc-200 dark:bg-zinc-800 rounded-lg" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-20 flex flex-col items-center justify-center text-gray-400">
          <Package className="w-12 h-12 mb-3 opacity-50 text-gray-300 dark:text-zinc-700" />
          <p className="text-sm text-gray-500 dark:text-zinc-400">Товары на складе не найдены</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-800 text-left">
                <thead className="bg-gray-50 dark:bg-zinc-800/40 text-xs font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4 w-12 text-center">
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
                        className="rounded border-gray-350 dark:border-zinc-700 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                      />
                    </th>
                    <th className="px-6 py-4">Наименование</th>
                    <th className="px-6 py-4">Категория</th>
                    <th className="px-6 py-4">Остаток</th>
                    <th className="px-6 py-4 text-center">Быстрое изменение</th>
                    <th className="px-6 py-4 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-zinc-800/60 text-sm text-[#1a1a1a] dark:text-zinc-200">
                  {filteredItems.map((item) => {
                    const isLow = item.quantity < 10;
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800/30 transition-colors">
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
                            className="rounded border-gray-350 dark:border-zinc-700 text-[#F95700] focus:ring-[#F95700] cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 font-medium text-gray-900 dark:text-white">
                          <div className="flex items-center space-x-2">
                            <span>{item.name}</span>
                            {isLow && (
                              <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Мало
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 rounded-full text-xs bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300">
                            {item.category || 'Без категории'}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-semibold">
                          <span className={isLow ? 'text-red-650' : 'text-zinc-900 dark:text-white'}>
                            {item.quantity} {item.unit}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center space-x-1">
                            <button
                              onClick={() => handleQuickAdjust(item.id, -10)}
                              className="active:scale-95 transition-all text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-950/40 text-gray-700 dark:text-zinc-300 hover:text-red-750 dark:hover:text-red-400 px-2 py-1 rounded font-medium cursor-pointer"
                            >
                              -10
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(item.id, -1)}
                              className="active:scale-95 transition-all text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-950/40 text-gray-700 dark:text-zinc-300 hover:text-red-750 dark:hover:text-red-400 px-2 py-1 rounded font-medium cursor-pointer"
                            >
                              -1
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(item.id, 1)}
                              className="active:scale-95 transition-all text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-green-100 dark:hover:bg-green-950/40 text-gray-700 dark:text-zinc-300 hover:text-green-755 dark:hover:text-green-400 px-2 py-1 rounded font-medium cursor-pointer"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => handleQuickAdjust(item.id, 10)}
                              className="active:scale-95 transition-all text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-green-100 dark:hover:bg-green-950/40 text-gray-700 dark:text-zinc-300 hover:text-green-755 dark:hover:text-green-400 px-2 py-1 rounded font-medium cursor-pointer"
                            >
                              +10
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          <button
                            onClick={() => handleShowQrModal(item)}
                            className="active:scale-95 transition-all inline-flex items-center justify-center min-w-[40px] min-h-[40px] p-2 text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg cursor-pointer"
                            title="Показать QR-код"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="active:scale-95 transition-all inline-flex items-center justify-center min-w-[40px] min-h-[40px] p-2 text-gray-500 dark:text-zinc-400 hover:text-[#F95700] dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg cursor-pointer"
                            title="Редактировать"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteId(item.id)}
                            className="active:scale-95 transition-all inline-flex items-center justify-center min-w-[40px] min-h-[40px] p-2 text-gray-500 dark:text-zinc-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer"
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
              const isLow = item.quantity < 10;
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
                      </div>
                    </div>
                    {isLow && (
                      <span className="bg-red-50 text-red-600 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center flex-shrink-0">
                        <AlertTriangle className="w-3 h-3 mr-1" /> Мало
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1.5 border-t border-gray-100 dark:border-zinc-800">
                    <div>
                      <span className="text-gray-400 dark:text-zinc-550 text-[9px] font-semibold uppercase tracking-wider">Категория:</span>
                      <p className="font-medium text-gray-700 dark:text-zinc-300 mt-0.5">{item.category || 'Без категории'}</p>
                    </div>
                    <div>
                      <span className="text-gray-400 dark:text-zinc-550 text-[9px] font-semibold uppercase tracking-wider">Остаток:</span>
                      <p className={`font-extrabold text-sm mt-0.5 ${isLow ? 'text-red-650' : 'text-zinc-900 dark:text-white'}`}>{item.quantity} {item.unit}</p>
                    </div>
                  </div>

                  {item.barcode && (
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">
                      Штрихкод: {item.barcode}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleQuickAdjust(item.id, -1)}
                        className="active:scale-95 transition-all text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-red-100 dark:hover:bg-red-950/40 text-gray-700 dark:text-zinc-300 hover:text-red-750 dark:hover:text-red-400 px-2 py-1 rounded font-medium cursor-pointer"
                      >
                        -1
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(item.id, 1)}
                        className="active:scale-95 transition-all text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-green-100 dark:hover:bg-green-950/40 text-gray-700 dark:text-zinc-300 hover:text-green-755 dark:hover:text-green-400 px-2 py-1 rounded font-medium cursor-pointer"
                      >
                        +1
                      </button>
                      <button
                        onClick={() => handleQuickAdjust(item.id, 10)}
                        className="active:scale-95 transition-all text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-green-100 dark:hover:bg-green-950/40 text-gray-700 dark:text-zinc-300 hover:text-green-755 dark:hover:text-green-400 px-2 py-1 rounded font-medium cursor-pointer"
                      >
                        +10
                      </button>
                    </div>

                    <div className="flex gap-1">
                      <button
                        onClick={() => handleShowQrModal(item)}
                        className="p-2 text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg cursor-pointer"
                        title="Показать QR-код"
                      >
                        <QrCode className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-2 text-gray-500 dark:text-zinc-400 hover:text-[#F95700] dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/20 rounded-lg cursor-pointer"
                        title="Редактировать"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(item.id)}
                        className="p-2 text-gray-500 dark:text-zinc-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg cursor-pointer"
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

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold font-['Montserrat'] text-[#1a1a1a] dark:text-white">
                {modalType === 'create' ? 'Добавление позиции' : 'Редактирование позиции'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 hover:text-gray-600 dark:text-zinc-400 dark:hover:text-zinc-300 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-650 dark:text-red-400 text-xs rounded-lg flex items-center font-medium">
                  <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0 animate-bounce" />
                  <span>{formError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Наименование товара / материала
                </label>
                <input
                  type="text"
                  required
                  placeholder="Например: Грунт цинконаполненный"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Количество
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                    Ед. измерения
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-white cursor-pointer"
                  >
                    {units.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Категория
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-white cursor-pointer"
                >
                  {categories.filter(c => c !== 'Все').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase mb-1">
                  Штрихкод производителя
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Например: 4601234567890"
                    value={formData.barcode}
                    onChange={(e) => setFormData(prev => ({ ...prev, barcode: e.target.value }))}
                    className="flex-1 bg-gray-50 dark:bg-zinc-850 border border-gray-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-[#1a1a1a] dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => startScanner('form_barcode')}
                    className="p-2 border border-gray-200 dark:border-zinc-700 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 text-gray-500 dark:text-zinc-400 rounded-lg flex items-center justify-center transition-all cursor-pointer"
                    title="Сканировать штрихкод камерой"
                  >
                    <Camera className="w-5 h-5 text-[#F95700]" />
                  </button>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="active:scale-95 transition-all px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="active:scale-95 transition-all px-4 py-2 bg-[#F95700] hover:bg-[#e04e00] text-white rounded-lg text-sm font-semibold flex items-center cursor-pointer"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4">
          <div className="bg-white/90 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center space-x-3 text-red-600 dark:text-red-500">
              <div className="p-3 bg-red-50 dark:bg-red-500/10 rounded-full">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold font-['Montserrat'] text-gray-900 dark:text-white">Удалить позицию?</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-zinc-400">
              Данное действие необратимо. Вы действительно хотите удалить эту позицию со склада?
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteId(null)}
                className="active:scale-95 transition-all px-4 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 font-medium cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={() => deleteId !== null && handleDeleteItem(deleteId)}
                className="active:scale-95 transition-all px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-red-500/20 cursor-pointer"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1. QR Code Viewer Modal */}
      {isQrModalOpen && qrItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all p-6 text-center space-y-6">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-bold font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-1.5">
                <QrCode className="w-5 h-5 text-[#F95700]" /> QR-код товара
              </h3>
              <button
                onClick={() => setIsQrModalOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-4 rounded-xl inline-block border border-gray-100 dark:border-zinc-800 shadow-inner">
              <img src={qrDataUrl} alt="QR Code" className="w-48 h-48 mx-auto" />
            </div>

            <div className="space-y-1">
              <h4 className="font-bold text-base text-gray-900 dark:text-white break-words">{qrItem.name}</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400 bg-gray-50 dark:bg-zinc-950 py-1 px-3 rounded w-fit mx-auto font-mono">
                sphera-inv-{qrItem.id}
              </p>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setIsQrModalOpen(false)}
                className="flex-1 py-2 border border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-zinc-800/50 dark:bg-zinc-800/50 dark:hover:bg-zinc-800 font-medium transition-all cursor-pointer"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={handlePrintQr}
                className="flex-1 py-2 bg-[#F95700] hover:bg-[#e04e00] text-white font-bold text-sm rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Печать
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Camera Scanner Modal */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[6px] p-4">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-md border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
              <h3 className="text-lg font-bold font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-1.5">
                <Camera className="w-5 h-5 text-[#F95700]" /> Сканирование QR
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
                Направьте камеру мобильного устройства на QR-код товара для быстрого изменения остатков.
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
                    Штрихкод <span className="font-mono font-bold bg-amber-100 dark:bg-zinc-800 text-amber-950 dark:text-white px-2 py-0.5 rounded border border-amber-200 dark:border-zinc-700">{unregisteredBarcode}</span> не найден на складе.
                  </p>
                  <button
                    type="button"
                    onClick={handleCreateFromBarcode}
                    className="w-full py-2.5 bg-[#F95700] hover:bg-[#e04e00] active:scale-98 text-white font-bold text-xs uppercase tracking-wider rounded-lg transition-all cursor-pointer shadow-lg shadow-orange-500/10"
                  >
                    ➕ Зарегистрировать новый товар
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

      {/* 3. Scan Adjust/Quick Adjustment Modal */}
      {isScanAdjustOpen && scannedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[6px] p-4">
          <div className="bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 dark:border-zinc-800 overflow-hidden transform transition-all p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-gray-100 dark:border-zinc-800 pb-3">
              <h3 className="text-lg font-bold font-['Montserrat'] text-gray-900 dark:text-white flex items-center gap-1.5">
                <Volume2 className="w-5 h-5 text-green-500" /> Успешный скан!
              </h3>
              <button
                onClick={() => setIsScanAdjustOpen(false)}
                className="p-1 rounded-full text-gray-400 hover:bg-gray-100 dark:hover:bg-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/20 text-[#F95700] flex items-center justify-center">
                <Package className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-base text-gray-900 dark:text-white break-words">{scannedItem.name}</h4>
              <p className="text-xs text-gray-500 dark:text-zinc-400">Категория: {scannedItem.category || 'Без категории'}</p>
              <p className="text-sm font-semibold mt-1 text-gray-700 dark:text-zinc-300">
                Текущий остаток: <span className="text-gray-950 dark:text-white bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded font-mono font-bold">{scannedItem.quantity} {scannedItem.unit}</span>
              </p>
            </div>

            {adjustmentError && (
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-650 dark:text-red-400 text-xs rounded-lg flex items-center font-medium">
                <AlertTriangle className="w-4 h-4 mr-2 flex-shrink-0" />
                <span>{adjustmentError}</span>
              </div>
            )}

            <form className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Изменение объема ({scannedItem.unit})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustmentQty}
                  onChange={(e) => setAdjustmentQty(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-950 border border-gray-200 dark:border-zinc-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#F95700]/20 focus:border-[#F95700] text-gray-900 dark:text-white font-mono font-bold text-center"
                />
              </div>

              {/* Quick changes buttons */}
              <div className="flex flex-wrap justify-center gap-1.5">
                {[-10, -5, -1, 1, 5, 10].map(val => (
                  <button
                    type="button"
                    key={val}
                    onClick={() => {
                      setAdjustmentQty(prev => {
                        const parsed = parseFloat(prev) || 0;
                        return Math.max(0, parsed + val).toString();
                      });
                    }}
                    className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-750 text-gray-700 dark:text-zinc-300 rounded font-semibold transition-colors cursor-pointer"
                  >
                    {val > 0 ? `+${val}` : val}
                  </button>
                ))}
              </div>

              {/* Instant 1-click actions */}
              <div className="flex gap-2 border-t border-gray-100 dark:border-zinc-800 pt-3">
                <button
                  type="button"
                  onClick={() => handleInstantAdjust('remove', 1)}
                  className="flex-1 py-2 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-700 dark:text-red-450 font-bold text-xs rounded-lg transition-all text-center cursor-pointer border border-red-200/50 dark:border-red-900/30 flex items-center justify-center gap-1"
                >
                  ⚡ Быстрый Расход -1
                </button>
                <button
                  type="button"
                  onClick={() => handleInstantAdjust('add', 1)}
                  className="flex-1 py-2 bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30 text-green-700 dark:text-green-450 font-bold text-xs rounded-lg transition-all text-center cursor-pointer border border-green-200/50 dark:border-green-900/30 flex items-center justify-center gap-1"
                >
                  ⚡ Быстрый Приход +1
                </button>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={(e) => handleScanAdjustSubmit(e, 'remove')}
                  className="flex-1 py-2 bg-red-650 hover:bg-red-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Списать (Расход)
                </button>
                <button
                  type="button"
                  onClick={(e) => handleScanAdjustSubmit(e, 'add')}
                  className="flex-1 py-2 bg-green-650 hover:bg-green-700 active:scale-95 text-white font-bold text-xs rounded-lg transition-all flex items-center justify-center gap-1 cursor-pointer"
                >
                  Пополнить (Приход)
                </button>
              </div>
            </form>
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
              Вы уверены, что хотите удалить выбранные позиции ({selectedIds.length} шт.)? Это действие нельзя отменить.
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
  );
};
