import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Phone, Globe, RefreshCw, Printer, Download, Edit3, Undo } from 'lucide-react';
import { Link } from 'react-router-dom';
import QRCode from 'qrcode';
import { jsPDF } from 'jspdf';

interface CardData {
  companyName: string;
  companySubtitle: string;
  legalName: string;
  tagline: string;
  phone1: string;
  phone2: string;
  website: string;
  websiteUrl: string;
  regions: string;
}

export const BusinessCardPage: React.FC = () => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light' | 'orange'>('dark');
  const [layoutTemplate, setLayoutTemplate] = useState<'classic' | 'minimal' | 'grid' | 'qr'>('classic');
  const [useTexture, setUseTexture] = useState<boolean>(true);
  const [showSafetyZones, setShowSafetyZones] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState(false);

  const defaultCardData: CardData = {
    companyName: 'СФЕРА',
    companySubtitle: 'Промышленная группа',
    legalName: 'ООО "СФЕРА"',
    tagline: 'Промышленная защита и изоляция',
    phone1: '+7 (963) 600-63-46',
    phone2: '+7 (987) 341-21-39',
    website: 'леоника56.рф',
    websiteUrl: 'https://xn--56-6kc6dma2c.xn--p1ai', // Punycode for леоника56.рф
    regions: 'Оренбург • Самара • Уфа'
  };

  const [cardData, setCardData] = useState<CardData>(defaultCardData);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetch((import.meta.env.VITE_API_URL || 'http://localhost:8000') + '/settings/');
        if (response.ok) {
          const data = await response.json();
          setCardData({
            companyName: data.company_name,
            companySubtitle: data.company_subtitle,
            legalName: data.company_legal_name,
            tagline: 'ПРОМЫШЛЕННАЯ ЗАЩИТА И ИЗОЛЯЦИЯ',
            phone1: data.company_phone,
            phone2: data.company_phone,
            website: data.company_website,
            websiteUrl: data.company_website_url,
            regions: data.company_regions
          });
        }
      } catch (e) {
        console.error(e);
      }
    };
    loadSettings();
  }, []);

  // States for offline QR code generation
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrCodeSvgPath, setQrCodeSvgPath] = useState<string>('');
  const [qrCodeSvgSize, setQrCodeSvgSize] = useState<number>(29);

  // Derive colors based on the selected brand theme
  const getThemeColors = (currentTheme: 'dark' | 'light' | 'orange') => {
    switch (currentTheme) {
      case 'light':
        return {
          bgColor: '#ffffff',
          textColor: '#18181b',
          accentColor: '#F95700'
        };
      case 'orange':
        return {
          bgColor: '#F95700',
          textColor: '#ffffff',
          accentColor: '#0F0F11'
        };
      case 'dark':
      default:
        return {
          bgColor: '#0F0F11',
          textColor: '#ffffff',
          accentColor: '#F95700'
        };
    }
  };

  const { bgColor, textColor, accentColor } = getThemeColors(theme);
  const texture = useTexture ? 'stripes' : 'none';

  // Generate QR Code offline using local qrcode library
  useEffect(() => {
    const generateQrCode = async () => {
      try {
        // Generate SVG string for vector exports
        const qrSvg = await QRCode.toString(cardData.websiteUrl, { type: 'svg', margin: 0 });
        const viewBoxMatch = qrSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
        const size = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 29;
        const pathMatches = Array.from(qrSvg.matchAll(/d="([^"]+)"/g));
        // Extract modules path (usually the second path if background path exists, otherwise the first)
        const pathData = pathMatches.length > 1 ? pathMatches[1][1] : (pathMatches.length > 0 ? pathMatches[0][1] : '');
        
        setQrCodeSvgSize(size);
        setQrCodeSvgPath(pathData);

        // Generate Data URL for browser previews and canvas rendering
        const dataUrl = await QRCode.toDataURL(cardData.websiteUrl, {
          margin: 1,
          width: 250,
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
  }, [cardData.websiteUrl]);

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
    return [words.slice(0, bestSplitIndex).join(' '), words.slice(bestSplitIndex).join(' ')];
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCardData(prev => ({ ...prev, [name]: value }));
  };

  const resetToDefault = () => {
    setCardData(defaultCardData);
  };

  const handlePrint = () => {
    window.print();
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

  const getSvgFrontContent = () => {
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
  
  <!-- Rounded Card Base -->
  <rect x="0.5" y="0.5" width="89" height="49" rx="3.5" fill="${bgColor}" stroke="${textColor}15" stroke-width="0.5" />
  
  <!-- Texture overlay -->
  ${texture !== 'none' ? `
  <rect x="0.5" y="0.5" width="89" height="49" rx="3.5" fill="url(#${texture})" clip-path="url(#card-clip)" />
  ` : ''}
  
  ${layoutTemplate === 'classic' ? `
  <!-- Subtle line styling -->
  <line x1="7" y1="34" x2="83" y2="34" stroke="${textColor}15" stroke-width="0.2" />
  
  <!-- Logo Header -->
  <text x="8" y="11" font-family="Montserrat, sans-serif" font-weight="900" font-size="4.8" fill="${textColor}" letter-spacing="-0.2">${cardData.companyName.toUpperCase()}</text>
  <text x="8" y="14.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${accentColor}" letter-spacing="0.8">${cardData.companySubtitle.toUpperCase()}</text>
  
  <!-- Badge -->
  <rect x="66" y="6" width="17" height="3.5" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="0.25" />
  <text x="74.5" y="7.75" font-family="Inter, sans-serif" font-weight="700" font-size="1.1" fill="${textColor}" letter-spacing="0.2" text-anchor="middle" dominant-baseline="central">АКЗ • ИЗОЛЯЦИЯ</text>
  
  <!-- Legal details -->
  <circle cx="8" cy="22.2" r="0.45" fill="${accentColor}" />
  <text x="10" y="22.7" font-family="Inter, sans-serif" font-weight="700" font-size="1.5" fill="${textColor}a0" letter-spacing="0.4">${cardData.legalName.toUpperCase()}</text>
  <text x="8" y="27.8" font-family="Montserrat, sans-serif" font-weight="900" font-size="2.8" fill="${textColor}" letter-spacing="-0.1">${cardData.tagline.toUpperCase()}</text>
  
  <!-- Footer contacts -->
  <!-- Left Column: Phones with icons -->
  <g transform="translate(8, 36.5)">
    <g transform="scale(0.09)" stroke="${accentColor}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </g>
    <text x="3.0" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.8" fill="${textColor}" letter-spacing="0.1">${cardData.phone1}</text>
  </g>
  
  <g transform="translate(8, 41.0)">
    <g transform="scale(0.09)" stroke="${accentColor}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </g>
    <text x="3.0" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.8" fill="${textColor}" letter-spacing="0.1">${cardData.phone2}</text>
  </g>
  
  <!-- Right Column: Web with Globe icon & Regions (Right Aligned) -->
  <g transform="translate(82, 36.5)">
    <g transform="translate(-23, 0) scale(0.09)" stroke="${accentColor}" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="0" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.8" fill="${textColor}" letter-spacing="0.05em" text-anchor="end">${cardData.website.toUpperCase()}</text>
  </g>
  
  <text x="82.0" y="42.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.3" fill="${textColor}a0" letter-spacing="0.2" text-anchor="end">${cardData.regions.toUpperCase()}</text>
  ` : layoutTemplate === 'minimal' ? `
  <!-- Minimal Layout elements -->
  <rect x="35.5" y="4.5" width="19" height="3" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="0.2" />
  <text x="45" y="6.6" font-family="Inter, sans-serif" font-weight="700" font-size="1.0" fill="${textColor}" letter-spacing="0.2" text-anchor="middle" dominant-baseline="central">АКЗ • ИЗОЛЯЦИЯ</text>
  
  <text x="45" y="14" font-family="Montserrat, sans-serif" font-weight="900" font-size="4.2" fill="${textColor}" text-anchor="middle" letter-spacing="-0.1">${cardData.companyName.toUpperCase()}</text>
  <text x="45" y="17.2" font-family="Inter, sans-serif" font-weight="700" font-size="1.2" fill="${accentColor}" letter-spacing="0.8" text-anchor="middle">${cardData.companySubtitle.toUpperCase()}</text>
  
  <line x1="32" y1="20" x2="58" y2="20" stroke="${textColor}20" stroke-width="0.2" />
  
  <text x="45" y="24" font-family="Inter, sans-serif" font-weight="700" font-size="1.3" fill="${textColor}a0" letter-spacing="0.3" text-anchor="middle">${cardData.legalName.toUpperCase()}</text>
  <text x="45" y="29.5" font-family="Montserrat, sans-serif" font-weight="900" font-size="2.5" fill="${textColor}" letter-spacing="-0.1" text-anchor="middle">${cardData.tagline.toUpperCase()}</text>
  
  <line x1="15" y1="34" x2="75" y2="34" stroke="${textColor}10" stroke-width="0.15" />
  
  <text x="45" y="38" font-family="Inter, sans-serif" font-weight="700" font-size="1.8" fill="${textColor}" letter-spacing="0.1" text-anchor="middle">${cardData.phone1}   •   ${cardData.phone2}</text>
  <text x="45" y="42.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${textColor}" letter-spacing="0.4" text-anchor="middle"><tspan fill="${accentColor}">${cardData.website.toUpperCase()}</tspan>   •   ${cardData.regions.toUpperCase()}</text>
  ` : layoutTemplate === 'grid' ? `
  <!-- Grid Layout elements -->
  <line x1="32" y1="0.5" x2="32" y2="47.5" stroke="${textColor}15" stroke-width="0.3" />
  
  <!-- Left Panel -->
  <text x="16" y="14" font-family="Montserrat, sans-serif" font-weight="900" font-size="3.8" fill="${textColor}" text-anchor="middle" letter-spacing="-0.2">${cardData.companyName.toUpperCase()}</text>
  <text x="16" y="18.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.2" fill="${accentColor}" letter-spacing="0.5" text-anchor="middle">${cardData.companySubtitle.toUpperCase()}</text>
  
  <line x1="4" y1="24" x2="28" y2="24" stroke="${textColor}15" stroke-width="0.2" />
  
  <rect x="5" y="32" width="22" height="4" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="0.25" />
  <text x="16" y="34.2" font-family="Inter, sans-serif" font-weight="700" font-size="1.0" fill="${textColor}" letter-spacing="0.1" text-anchor="middle" dominant-baseline="central">АКЗ • ИЗОЛЯЦИЯ</text>
  
  <!-- Right Panel -->
  <text x="38" y="11" font-family="Inter, sans-serif" font-weight="700" font-size="1.5" fill="${textColor}a0" letter-spacing="0.4">${cardData.legalName.toUpperCase()}</text>
  ${(() => {
    const [l1, l2] = splitTagline(cardData.tagline);
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
    <text x="2.5" y="1.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}">${cardData.phone1}</text>
  </g>
  
  <g transform="translate(38, 31.8)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </g>
    <text x="2.5" y="1.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}">${cardData.phone2}</text>
  </g>
  
  <line x1="35" y1="36" x2="85" y2="36" stroke="${textColor}10" stroke-width="0.15" />
  
  <g transform="translate(38, 39.5)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="2.5" y="1.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}" letter-spacing="0.05em">${cardData.website.toUpperCase()}</text>
  </g>
  <text x="38" y="44.2" font-family="Inter, sans-serif" font-weight="700" font-size="1.3" fill="${textColor}a0" letter-spacing="0.2">${cardData.regions.toUpperCase()}</text>
  ` : `
  <!-- QR-Focused Layout elements -->
  <line x1="7" y1="30" x2="55" y2="30" stroke="${textColor}15" stroke-width="0.2" />
  
  <!-- Left Column -->
  <text x="8" y="11" font-family="Montserrat, sans-serif" font-weight="900" font-size="4.8" fill="${textColor}" letter-spacing="-0.2">${cardData.companyName.toUpperCase()}</text>
  <text x="8" y="14.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${accentColor}" letter-spacing="0.8">${cardData.companySubtitle.toUpperCase()}</text>
  
  <text x="8" y="20.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${textColor}a0" letter-spacing="0.3">${cardData.legalName.toUpperCase()}</text>
  ${(() => {
    const [l1, l2] = splitTagline(cardData.tagline);
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
    <text x="2.5" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}">${cardData.phone1}</text>
  </g>
  
  <g transform="translate(8, 37.5)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </g>
    <text x="2.5" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}">${cardData.phone2}</text>
  </g>
  
  <g transform="translate(8, 42)">
    <g transform="scale(0.08)" stroke="${accentColor}" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      <path d="M2 12h20"/>
    </g>
    <text x="2.5" y="1.8" font-family="Inter, sans-serif" font-weight="700" font-size="1.7" fill="${textColor}" letter-spacing="0.05em">${cardData.website.toUpperCase()}</text>
  </g>
  
  <!-- Right Column -->
  <rect x="62" y="5.5" width="20" height="3" fill="${accentColor}" fill-opacity="0.1" stroke="${accentColor}" stroke-opacity="0.3" stroke-width="0.2" />
  <text x="72" y="7.5" font-family="Inter, sans-serif" font-weight="700" font-size="0.9" fill="${textColor}" letter-spacing="0.1" text-anchor="middle" dominant-baseline="central">АКЗ • ИЗОЛЯЦИЯ</text>
  
  <!-- QR Code Image Container -->
  <rect x="64" y="12" width="16" height="16" rx="1.5" fill="#FFFFFF" />
  <g transform="translate(65, 13) scale(${14 / qrCodeSvgSize})">
    <path d="${qrCodeSvgPath}" fill="none" stroke="#0f0f11" stroke-width="1" shape-rendering="crispEdges" />
  </g>
  
  <text x="72" y="42" font-family="Inter, sans-serif" font-weight="700" font-size="1.2" fill="${textColor}a0" letter-spacing="0.1" text-anchor="middle">${cardData.regions.toUpperCase()}</text>
  `}
  
  <!-- Accent orange bar clipped to rounded corner -->
  <rect x="0.5" y="47.5" width="89" height="2" fill="${accentColor}" clip-path="url(#card-clip)" />
</svg>`;
  };

  const getSvgBackContent = () => {
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
  
  <!-- Rounded Card Base -->
  <rect x="0.5" y="0.5" width="89" height="49" rx="3.5" fill="${bgColor}" stroke="${textColor}15" stroke-width="0.5" />
  
  <!-- Texture overlay -->
  ${texture !== 'none' ? `
  <rect x="0.5" y="0.5" width="89" height="49" rx="3.5" fill="url(#${texture})" clip-path="url(#card-clip)" />
  ` : ''}
  
  <!-- Logo Header -->
  <text x="45" y="11" font-family="Montserrat, sans-serif" font-weight="900" font-size="6" fill="${textColor}" letter-spacing="-0.2" text-anchor="middle">${cardData.companyName.toUpperCase()}</text>
  <text x="45" y="14.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.4" fill="${accentColor}" letter-spacing="0.8" text-anchor="middle">${cardData.companySubtitle.toUpperCase()}</text>
  
  <!-- QR Code Image Container -->
  <rect x="37" y="18" width="16" height="16" rx="1.5" fill="#FFFFFF" />
  <g transform="translate(38, 19) scale(${14 / qrCodeSvgSize})">
    <path d="${qrCodeSvgPath}" fill="none" stroke="#0f0f11" stroke-width="1" shape-rendering="crispEdges" />
  </g>
  <text x="45" y="38.5" font-family="Inter, sans-serif" font-weight="700" font-size="1.2" fill="${textColor}a0" letter-spacing="0.4" text-anchor="middle">СКАНИРУЙТЕ ДЛЯ ПЕРЕХОДА</text>

  <!-- Footer Website link -->
  <text x="45" y="44.0" font-family="Inter, sans-serif" font-weight="700" font-size="1.8" fill="${textColor}" letter-spacing="0.05em" text-anchor="middle">${cardData.website.toUpperCase()}</text>

  <!-- Accent orange bar clipped to rounded corner -->
  <rect x="0.5" y="47.5" width="89" height="2" fill="${accentColor}" clip-path="url(#card-clip)" />
</svg>`;
  };

  const downloadSvgFront = () => {
    const content = getSvgFrontContent();
    triggerDownload(content, 'СФЕРА_BusinessCard_Front.svg');
  };

  const downloadSvgBack = () => {
    const content = getSvgBackContent();
    triggerDownload(content, 'СФЕРА_BusinessCard_Back.svg');
  };

  const triggerPngDownload = (svgContent: string, fileName: string) => {
    const svgBlob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      // 300 DPI high resolution dimensions: 1063 x 591 pixels
      canvas.width = 1063;
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

  const downloadPngFront = () => {
    const content = getSvgFrontContent();
    triggerPngDownload(content, 'СФЕРА_BusinessCard_Front.png');
  };

  const downloadPngBack = () => {
    const content = getSvgBackContent();
    triggerPngDownload(content, 'СФЕРА_BusinessCard_Back.png');
  };

  const downloadPdfFront = () => triggerPdfDownload(getSvgFrontContent(), 'СФЕРА_BusinessCard_Front.pdf');
  const downloadPdfBack = () => triggerPdfDownload(getSvgBackContent(), 'СФЕРА_BusinessCard_Back.pdf');

  return (
    <div className="min-h-screen bg-bg text-text-muted py-12 md:py-20 relative overflow-hidden">
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none" />
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#F95700]/5 rounded-full blur-3xl pointer-events-none" />
      
      <div className="max-w-6xl mx-auto px-6 relative z-10">
        
        {/* Header Breadcrumbs */}
        <div className="mb-10 flex items-center justify-between">
          <Link
            to="/"
            className="text-xs font-black text-primary hover:text-white uppercase tracking-widest transition flex items-center gap-2"
          >
            ← Назад на сайт
          </Link>
          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
            СФЕРА • БРЕНДБУК
          </span>
        </div>

        {/* Title */}
        <div className="mb-12 text-center md:text-left">
          <h1 className="text-3xl md:text-5xl font-black text-text uppercase tracking-tight leading-none mb-4">
            Дизайн визитной карточки
          </h1>
          <p className="text-sm md:text-base text-text-muted max-w-2xl">
            Интерактивный макет визитки ООО «СФЕРА» в фирменном стиле промышленной группы. 
            Здесь вы можете изменить данные в реальном времени, выбрать цветовую схему и отправить карту в печать в оригинальном размере.
          </p>
        </div>

        {/* Main Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Left Side: Business Card Container (3D Flip) */}
          <div className="lg:col-span-7 flex flex-col items-center">
            
            {/* Flip Wrapper */}
            <div className="w-full max-w-[540px] h-[300px] [perspective:1000px] cursor-pointer group" onClick={() => setIsFlipped(!isFlipped)}>
              <motion.div 
                className="w-full h-full relative [transform-style:preserve-3d] transition-all duration-700"
                animate={{ rotateY: isFlipped ? 180 : 0 }}
              >
                
                {/* FRONT SIDE */}
                <div 
                  className="absolute inset-0 w-full h-full rounded-2xl border p-8 flex flex-col justify-between overflow-hidden [backface-visibility:hidden] transition-colors duration-300"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: `${textColor}15`,
                    color: textColor,
                    boxShadow: theme === 'dark' || bgColor === '#0F0F11' ? '0 20px 40px -15px rgba(0,0,0,0.7), 0 0 50px -10px rgba(249, 87, 0, 0.15)' : '0 20px 40px -15px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Texture Pattern Overlay */}
                  {texture !== 'none' && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                      <defs>
                        <pattern id="stripes-pat" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                          <line x1="0" y1="0" x2="0" y2="10" stroke={accentColor} strokeWidth="0.7" opacity="0.15" />
                        </pattern>
                      </defs>
                      <rect width="100%" height="100%" fill="url(#stripes-pat)" />
                    </svg>
                  )}
                  
                  {layoutTemplate === 'classic' && (
                    <>
                      {/* Front: Logo Header */}
                      <div className="flex justify-between items-start z-10 w-full">
                        <div className="leading-none flex-1">
                          <span 
                            className="font-black tracking-tighter block uppercase text-2xl md:text-3xl"
                            style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              color: textColor
                            }}
                          >
                            {cardData.companyName}
                          </span>
                          <span 
                            className="tracking-[0.25em] uppercase font-bold block mt-1 text-[8px]"
                            style={{ 
                              fontFamily: 'Inter, sans-serif', 
                              color: accentColor
                            }}
                          >
                            {cardData.companySubtitle}
                          </span>
                        </div>
                        
                        <div 
                          className="text-[9px] font-bold tracking-widest uppercase px-3 py-1 border"
                          style={{ 
                            fontFamily: 'Inter, sans-serif',
                            backgroundColor: `${accentColor}15`,
                            borderColor: `${accentColor}30`,
                            color: textColor
                          }}
                        >
                          АКЗ • ИЗОЛЯЦИЯ
                        </div>
                      </div>

                      {/* Front: Center Slogan / Details */}
                      <div className="my-auto z-10 pt-4">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: accentColor }} />
                          <span 
                            className="text-[10px] tracking-widest font-black uppercase"
                            style={{ fontFamily: 'Inter, sans-serif', color: textColor, opacity: 0.6 }}
                          >
                            {cardData.legalName}
                          </span>
                        </div>
                        <h2 
                          className="font-black uppercase tracking-tight leading-tight text-lg md:text-xl"
                          style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            color: textColor
                          }}
                        >
                          {cardData.tagline}
                        </h2>
                      </div>

                      {/* Front: Footer Info */}
                      <div className="border-t pt-4 flex justify-between items-end z-10 mt-2" style={{ borderColor: `${textColor}15` }}>
                        {/* Contacts Left */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            <span className="text-xs font-bold tracking-wider font-mono" style={{ color: textColor }}>{cardData.phone1}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            <span className="text-xs font-bold tracking-wider font-mono" style={{ color: textColor }}>{cardData.phone2}</span>
                          </div>
                        </div>

                        {/* Contacts Right */}
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end mb-1">
                            <Globe className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            <span 
                              className="text-xs font-bold uppercase tracking-wider"
                              style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                            >
                              {cardData.website}
                            </span>
                          </div>
                          <span 
                            className="text-[8px] uppercase tracking-widest font-bold"
                            style={{ fontFamily: 'Inter, sans-serif', color: textColor, opacity: 0.6 }}
                          >
                            {cardData.regions}
                          </span>
                        </div>
                      </div>
                    </>
                  )}

                  {layoutTemplate === 'minimal' && (
                    <div className="flex flex-col items-center justify-between h-full text-center z-10 w-full py-1">
                      {/* Header Badge */}
                      <div 
                        className="text-[8px] font-bold tracking-widest uppercase px-2 py-0.5 border"
                        style={{ 
                          fontFamily: 'Inter, sans-serif',
                          backgroundColor: `${accentColor}10`,
                          borderColor: `${accentColor}25`,
                          color: textColor
                        }}
                      >
                        АКЗ • ИЗОЛЯЦИЯ
                      </div>

                      {/* Logo & Subtitle */}
                      <div className="leading-none mt-2">
                        <span 
                          className="font-black tracking-tighter block uppercase text-2xl md:text-3xl"
                          style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            color: textColor
                          }}
                        >
                          {cardData.companyName}
                        </span>
                        <span 
                          className="tracking-[0.25em] uppercase font-bold block mt-1 text-[8px]"
                          style={{ 
                            fontFamily: 'Inter, sans-serif', 
                            color: accentColor
                          }}
                        >
                          {cardData.companySubtitle}
                        </span>
                      </div>

                      {/* Divider */}
                      <div className="w-16 h-px my-1.5" style={{ backgroundColor: `${textColor}20` }} />

                      {/* Tagline & Legal */}
                      <div className="my-1">
                        <span 
                          className="text-[9px] tracking-wider font-bold uppercase block opacity-60 mb-0.5"
                          style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                        >
                          {cardData.legalName}
                        </span>
                        <h2 
                          className="font-black uppercase tracking-tight leading-tight text-base md:text-lg"
                          style={{ 
                            fontFamily: 'Montserrat, sans-serif', 
                            color: textColor
                          }}
                        >
                          {cardData.tagline}
                        </h2>
                      </div>

                      {/* Horizontal line for footer */}
                      <div className="w-3/4 h-px my-2" style={{ backgroundColor: `${textColor}15` }} />

                      {/* Centered Contacts */}
                      <div className="space-y-1 text-center w-full">
                        <div className="flex justify-center gap-4 text-[10px] font-bold tracking-wider font-mono" style={{ color: textColor }}>
                          <span>{cardData.phone1}</span>
                          <span style={{ color: accentColor }}>•</span>
                          <span>{cardData.phone2}</span>
                        </div>
                        <div className="flex justify-center gap-3 text-[10px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif', color: textColor }}>
                          <span style={{ color: accentColor }}>{cardData.website}</span>
                          <span className="opacity-40">•</span>
                          <span className="opacity-60">{cardData.regions}</span>
                        </div>
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
                          <span 
                            className="font-black tracking-tighter block uppercase text-lg md:text-xl"
                            style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              color: textColor
                            }}
                          >
                            {cardData.companyName}
                          </span>
                          <span 
                            className="tracking-[0.15em] uppercase font-bold block mt-1 text-[7px]"
                            style={{ 
                              fontFamily: 'Inter, sans-serif', 
                              color: accentColor
                            }}
                          >
                            {cardData.companySubtitle}
                          </span>
                        </div>

                        <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                        <div 
                          className="text-[8px] font-bold tracking-wider uppercase px-1.5 py-0.5 border text-center"
                          style={{ 
                            fontFamily: 'Inter, sans-serif',
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
                            <span 
                              className="text-[8px] tracking-wider font-bold uppercase opacity-60"
                              style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                            >
                              {cardData.legalName}
                            </span>
                          </div>
                          <h2 
                            className="font-black uppercase tracking-tight leading-[1.1] text-xs md:text-sm"
                            style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              color: textColor
                            }}
                          >
                            {(() => {
                              const [l1, l2] = splitTagline(cardData.tagline);
                              return l2 ? <>{l1}<br />{l2}</> : l1;
                            })()}
                          </h2>
                        </div>

                        <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                        {/* Contacts Block */}
                        <div className="space-y-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3" style={{ color: accentColor }} />
                              <span className="text-[10px] font-bold font-mono" style={{ color: textColor }}>{cardData.phone1}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3 h-3" style={{ color: accentColor }} />
                              <span className="text-[10px] font-bold font-mono" style={{ color: textColor }}>{cardData.phone2}</span>
                            </div>
                          </div>
                          
                          <div className="w-full h-px" style={{ backgroundColor: `${textColor}10` }} />

                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <Globe className="w-3 h-3" style={{ color: accentColor }} />
                              <span 
                                className="text-[10px] font-bold uppercase tracking-wider"
                                style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                              >
                                {cardData.website}
                              </span>
                            </div>
                            <span 
                              className="text-[8px] uppercase tracking-wider font-bold block opacity-60 pl-4.5"
                              style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                            >
                              {cardData.regions}
                            </span>
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
                          <span 
                            className="font-black tracking-tighter block uppercase text-lg md:text-xl"
                            style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              color: textColor
                            }}
                          >
                            {cardData.companyName}
                          </span>
                          <span 
                            className="tracking-[0.25em] uppercase font-bold block mt-1 text-[8px]"
                            style={{ 
                              fontFamily: 'Inter, sans-serif', 
                              color: accentColor
                            }}
                          >
                            {cardData.companySubtitle}
                          </span>
                        </div>

                        <div className="my-1.5">
                          <span 
                            className="text-[8px] tracking-wider font-bold uppercase block opacity-60"
                            style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                          >
                            {cardData.legalName}
                          </span>
                          <h2 
                            className="font-black uppercase tracking-tight leading-[1.1] text-xs md:text-sm"
                            style={{ 
                              fontFamily: 'Montserrat, sans-serif', 
                              color: textColor
                            }}
                          >
                            {(() => {
                              const [l1, l2] = splitTagline(cardData.tagline);
                              return l2 ? <>{l1}<br />{l2}</> : l1;
                            })()}
                          </h2>
                        </div>

                        <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                        {/* Staged contacts */}
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" style={{ color: accentColor }} />
                            <span className="text-[10px] font-bold font-mono" style={{ color: textColor }}>{cardData.phone1}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Phone className="w-3 h-3" style={{ color: accentColor }} />
                            <span className="text-[10px] font-bold font-mono" style={{ color: textColor }}>{cardData.phone2}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Globe className="w-3.5 h-3.5" style={{ color: accentColor }} />
                            <span 
                              className="text-[10px] font-bold uppercase tracking-wider"
                              style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                            >
                              {cardData.website}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Right side: QR Code Block */}
                      <div className="w-[120px] flex flex-col justify-between items-center py-1">
                        <div 
                          className="text-[8px] font-bold tracking-widest uppercase px-1.5 py-0.5 border w-full text-center"
                          style={{ 
                            fontFamily: 'Inter, sans-serif',
                            backgroundColor: `${accentColor}10`,
                            borderColor: `${accentColor}25`,
                            color: textColor
                          }}
                        >
                          АКЗ • ИЗОЛЯЦИЯ
                        </div>

                        <div className="bg-white p-1.5 rounded-lg my-auto shadow-md">
                          {qrCodeDataUrl ? (
                            <img 
                              src={qrCodeDataUrl}
                              alt="QR Code Front"
                              className="w-[75px] h-[75px] object-contain"
                            />
                          ) : (
                            <div className="w-[75px] h-[75px] bg-zinc-800 animate-pulse" />
                          )}
                        </div>

                        <span 
                          className="text-[7px] uppercase tracking-normal font-bold opacity-60 text-center w-full whitespace-nowrap"
                          style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                        >
                          {cardData.regions}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Decorative Angled Cut Bar */}
                  <div className="absolute bottom-0 left-0 w-full h-1" style={{ backgroundColor: accentColor }} />

                  {showSafetyZones && (
                    <div className="absolute top-[18px] left-[18px] right-[18px] bottom-[18px] border border-dashed border-red-500/50 pointer-events-none rounded-lg z-20 flex items-center justify-center">
                      <span className="absolute top-1 left-2 text-[7px] font-black text-red-500/70 uppercase tracking-widest bg-black/60 px-1 py-0.5 rounded">
                        Безопасная зона (3мм)
                      </span>
                    </div>
                  )}
                </div>

                {/* BACK SIDE */}
                <div 
                  className="absolute inset-0 w-full h-full rounded-2xl border p-8 flex flex-col justify-between items-center [backface-visibility:hidden] [transform:rotateY(180deg)] transition-colors duration-300"
                  style={{
                    backgroundColor: bgColor,
                    borderColor: `${textColor}15`,
                    color: textColor,
                    boxShadow: theme === 'dark' || bgColor === '#0F0F11' ? '0 20px 40px -15px rgba(0,0,0,0.7), 0 0 50px -10px rgba(249, 87, 0, 0.15)' : '0 20px 40px -15px rgba(0,0,0,0.1)'
                  }}
                >
                  {/* Texture Pattern Overlay */}
                  {texture !== 'none' && (
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                      <rect width="100%" height="100%" fill="url(#stripes-pat)" />
                    </svg>
                  )}

                  {/* Back Content: Header / Branding */}
                  <div className="text-center z-10 leading-none flex flex-col items-center">
                    <span 
                      className="font-black tracking-tighter block uppercase text-2xl md:text-3xl"
                      style={{ 
                        fontFamily: 'Montserrat, sans-serif', 
                        color: textColor
                      }}
                    >
                      {cardData.companyName}
                    </span>
                    <span 
                      className="tracking-[0.3em] uppercase font-bold block mt-1.5 text-[8px]"
                      style={{ 
                        fontFamily: 'Inter, sans-serif', 
                        color: accentColor
                      }}
                    >
                      {cardData.companySubtitle}
                    </span>
                  </div>

                  {/* Back Content: QR Code */}
                  <div className="flex flex-col items-center justify-center z-10 my-4">
                    <div className="bg-white p-2 rounded-lg">
                      {qrCodeDataUrl ? (
                        <img 
                          src={qrCodeDataUrl}
                          alt="QR Code Website"
                          className="w-[110px] h-[110px] object-contain"
                        />
                      ) : (
                        <div className="w-[110px] h-[110px] bg-zinc-800 animate-pulse" />
                      )}
                    </div>
                    <span 
                      className="text-[7px] tracking-widest uppercase font-bold mt-2"
                      style={{ fontFamily: 'Inter, sans-serif', color: textColor, opacity: 0.6 }}
                    >
                      Сканируйте для перехода на сайт
                    </span>
                  </div>

                  {/* Back Content: Website Text */}
                  <div className="z-10 text-center">
                    <span 
                      className="text-xs font-black tracking-widest uppercase"
                      style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
                    >
                      {cardData.website}
                    </span>
                  </div>

                  {/* Bottom Line */}
                  <div className="absolute bottom-0 left-0 w-full h-1" style={{ backgroundColor: accentColor }} />

                  {showSafetyZones && (
                    <div className="absolute top-[18px] left-[18px] right-[18px] bottom-[18px] border border-dashed border-red-500/50 pointer-events-none rounded-lg z-20 flex items-center justify-center">
                      <span className="absolute top-1 left-2 text-[7px] font-black text-red-500/70 uppercase tracking-widest bg-black/60 px-1 py-0.5 rounded">
                        Безопасная зона (3мм)
                      </span>
                    </div>
                  )}
                </div>

              </motion.div>
            </div>

            {/* Helper Hint */}
            <p className="mt-4 text-xs text-zinc-500 font-bold uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
              <RefreshCw className="w-3 h-3" /> Нажмите на карту, чтобы перевернуть
            </p>

            {/* Print Layout Info */}
            <div className="mt-8 p-5 bg-surface border border-border rounded-xl max-w-[540px] text-xs leading-relaxed">
              <h4 className="text-text font-black uppercase mb-2">Советы по печати</h4>
              <p className="mb-2">
                Кнопка <strong>«Печать визитки»</strong> откроет стандартное диалоговое окно печати вашего браузера. Мы настроили специальные стили: все элементы интерфейса сайта скроются, и останутся только печатные формы визиток.
              </p>
              <ul className="list-disc list-inside space-y-1 text-zinc-400">
                <li>Стандартный размер визитки: 90 × 50 мм</li>
                <li>Печать адаптирована для формата A4 с метками для реза (Crop Marks)</li>
                <li>В настройках печати выберите: <strong>«Альбомная ориентация»</strong> и отключите <strong>«Поля»</strong> (Margins: None / Без полей)</li>
              </ul>
            </div>

          </div>

          {/* Right Side: Options & Customization Controls */}
          <div className="lg:col-span-5 bg-surface border border-border p-6 rounded-2xl flex flex-col gap-6">
            
            {/* Action buttons */}
            <div>
              <h3 className="text-xs font-black tracking-widest uppercase text-primary mb-3">Действия</h3>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handlePrint}
                  className="px-4 py-3 bg-primary hover:bg-[#FF7426] text-white text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F95700]/10"
                >
                  <Printer className="w-4 h-4" /> Печать визитки
                </button>
                
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-4 py-3 border text-xs font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer ${
                    isEditing ? 'border-primary bg-primary/5 text-primary' : 'border-zinc-700 hover:border-zinc-500 text-zinc-300'
                  }`}
                >
                  <Edit3 className="w-4 h-4" /> {isEditing ? 'Готово' : 'Редактировать'}
                </button>
              </div>
            </div>

            {/* Theme Selector */}
            <div>
              <h3 className="text-xs font-black tracking-widest uppercase text-primary mb-3">Фирменная гамма</h3>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTheme('dark')}
                  className={`py-3 text-[10px] font-bold uppercase tracking-widest transition border cursor-pointer text-center ${
                    theme === 'dark' ? 'bg-[#0F0F11] border-primary text-white font-black' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Темный техно
                </button>
                <button
                  onClick={() => setTheme('light')}
                  className={`py-3 text-[10px] font-bold uppercase tracking-widest transition border cursor-pointer text-center ${
                    theme === 'light' ? 'bg-white border-primary text-zinc-950 font-black' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Чистый белый
                </button>
                <button
                  onClick={() => setTheme('orange')}
                  className={`py-3 text-[10px] font-bold uppercase tracking-widest transition border cursor-pointer text-center ${
                    theme === 'orange' ? 'bg-[#F95700] border-primary text-white font-black' : 'bg-zinc-900/40 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Оранжевый
                </button>
              </div>
            </div>

            {/* Layout Templates */}
            <div>
              <h3 className="text-xs font-black tracking-widest uppercase text-primary mb-3">Компоновка</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLayoutTemplate('classic')}
                  className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition border cursor-pointer text-center ${
                    layoutTemplate === 'classic' ? 'border-primary bg-primary/5 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Классическая
                </button>
                <button
                  onClick={() => setLayoutTemplate('minimal')}
                  className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition border cursor-pointer text-center ${
                    layoutTemplate === 'minimal' ? 'border-primary bg-primary/5 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Минимализм
                </button>
                <button
                  onClick={() => setLayoutTemplate('grid')}
                  className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition border cursor-pointer text-center ${
                    layoutTemplate === 'grid' ? 'border-primary bg-primary/5 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  Инженерная сетка
                </button>
                <button
                  onClick={() => setLayoutTemplate('qr')}
                  className={`py-2 px-3 text-[10px] font-bold uppercase tracking-wider transition border cursor-pointer text-center ${
                    layoutTemplate === 'qr' ? 'border-primary bg-primary/5 text-white' : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  QR на лицевой
                </button>
              </div>
            </div>

            {/* Options Toggle */}
            <div className="border-t border-border pt-4 space-y-3">
              <h3 className="text-xs font-black tracking-widest uppercase text-primary">Настройки отображения</h3>
              
              {/* Texture Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block">Фирменные полосы</label>
                  <span className="text-[10px] text-zinc-500 block">Наложение диагональных линий</span>
                </div>
                <button
                  onClick={() => setUseTexture(!useTexture)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    useTexture ? 'bg-primary' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      useTexture ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Safety Zone Toggle */}
              <div className="flex items-center justify-between p-3 bg-zinc-900/40 border border-zinc-800 rounded-lg">
                <div>
                  <label className="text-xs font-bold text-zinc-300 block">Поля реза (3мм)</label>
                  <span className="text-[10px] text-zinc-500 block">Показывает границу безопасности</span>
                </div>
                <button
                  onClick={() => setShowSafetyZones(!showSafetyZones)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    showSafetyZones ? 'bg-primary' : 'bg-zinc-800'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showSafetyZones ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Live Editor Panel */}
            {isEditing && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-4 border-t border-border pt-4"
              >
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-black tracking-widest uppercase text-primary">Редактор данных</h3>
                  <button 
                    onClick={resetToDefault} 
                    className="text-[10px] text-zinc-500 hover:text-white flex items-center gap-1 uppercase font-bold"
                  >
                    <Undo className="w-3 h-3" /> Сбросить
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Направление работ / Слоган</label>
                    <input 
                      type="text" 
                      name="tagline" 
                      value={cardData.tagline} 
                      onChange={handleInputChange}
                      className="w-full bg-[#0F0F11] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Телефон 1</label>
                      <input 
                        type="text" 
                        name="phone1" 
                        value={cardData.phone1} 
                        onChange={handleInputChange}
                        className="w-full bg-[#0F0F11] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-primary font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Телефон 2</label>
                      <input 
                        type="text" 
                        name="phone2" 
                        value={cardData.phone2} 
                        onChange={handleInputChange}
                        className="w-full bg-[#0F0F11] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Домен сайта</label>
                      <input 
                        type="text" 
                        name="website" 
                        value={cardData.website} 
                        onChange={handleInputChange}
                        className="w-full bg-[#0F0F11] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Ссылка для QR-кода</label>
                      <input 
                        type="text" 
                        name="websiteUrl" 
                        value={cardData.websiteUrl} 
                        onChange={handleInputChange}
                        className="w-full bg-[#0F0F11] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-primary font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-zinc-500 font-bold mb-1">Регионы</label>
                    <input 
                      type="text" 
                      name="regions" 
                      value={cardData.regions} 
                      onChange={handleInputChange}
                      className="w-full bg-[#0F0F11] border border-zinc-800 text-white text-xs px-3 py-2 outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Export Section */}
            <div className="border-t border-border pt-6">
              <h3 className="text-xs font-black tracking-widest uppercase text-primary mb-3">Экспорт макетов для типографии</h3>
              <p className="text-[11px] leading-relaxed mb-4">
                Скачайте макеты высокого разрешения (в масштабе 90х50 мм) для передачи в печать:
              </p>
              
              <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-wider">Макеты для печати (.PDF 300 DPI)</h4>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={downloadPdfFront}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/10"
                >
                  <Download className="w-3.5 h-3.5" /> Лицевая (PDF)
                </button>
                <button
                  onClick={downloadPdfBack}
                  className="py-3 bg-red-600 hover:bg-red-700 text-white text-[11px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-red-600/10"
                >
                  <Download className="w-3.5 h-3.5" /> Оборотная (PDF)
                </button>
              </div>

              <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-wider">Векторные макеты (.SVG)</h4>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button
                  onClick={downloadSvgFront}
                  className="py-3 bg-[#F95700] hover:bg-[#FF7426] text-white text-[11px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F95700]/10"
                >
                  <Download className="w-3.5 h-3.5" /> Лицевая (SVG)
                </button>
                <button
                  onClick={downloadSvgBack}
                  className="py-3 bg-[#F95700] hover:bg-[#FF7426] text-white text-[11px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#F95700]/10"
                >
                  <Download className="w-3.5 h-3.5" /> Оборотная (SVG)
                </button>
              </div>

              <h4 className="text-[10px] font-black uppercase text-zinc-400 mb-2 tracking-wider">Растровые макеты (.PNG 300 DPI)</h4>
              <div className="grid grid-cols-2 gap-3 mb-6">
                <button
                  onClick={downloadPngFront}
                  className="py-3 bg-[#0F0F11] border border-zinc-800 hover:border-zinc-700 text-white text-[11px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" /> Лицевая (PNG)
                </button>
                <button
                  onClick={downloadPngBack}
                  className="py-3 bg-[#0F0F11] border border-zinc-800 hover:border-zinc-700 text-white text-[11px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" /> Оборотная (PNG)
                </button>
              </div>
            </div>

            {/* Downloads section */}
            <div className="border-t border-border pt-6">
              <h3 className="text-xs font-black tracking-widest uppercase text-primary mb-3">Скачать макеты от AI дизайнеров</h3>
              <p className="text-[11px] leading-relaxed mb-4">
                Мы сгенерировали высококачественные демонстрационные 3D-визуализации визитки в промышленном окружении. Скачайте их для презентации или отправки в типографию в качестве референса:
              </p>
              <div className="space-y-3">
                <a
                  href="/business_card_front.png"
                  download="СФЕРА_BusinessCard_Front_Mockup.png"
                  className="w-full py-3 bg-[#0F0F11] border border-zinc-800 hover:border-zinc-700 text-white text-[11px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" /> Лицевая сторона (Mockup)
                </a>
                <a
                  href="/business_card_back.png"
                  download="СФЕРА_BusinessCard_Back_Mockup.png"
                  className="w-full py-3 bg-[#0F0F11] border border-zinc-800 hover:border-zinc-700 text-white text-[11px] font-bold uppercase tracking-widest transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-primary" /> Обратная сторона (Mockup)
                </a>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* PRINT-ONLY CSS CONTAINER (for standard physical printing) */}
      <style>{`
        @media print {
          /* Hide everything on the page except the printable cards */
          body * {
            visibility: hidden;
          }
          
          #printable-card-area, #printable-card-area * {
            visibility: visible;
          }
          
          #printable-card-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm; /* A4 width */
            height: 297mm; /* A4 height */
            background: white !important;
            padding: 20mm;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 25mm;
          }
          
          .print-card-wrapper {
            position: relative;
            width: 90mm;
            height: 50mm;
            border: 1px solid #e4e4e7;
            box-sizing: border-box;
            background: ${theme === 'dark' ? '#0F0F11' : theme === 'orange' ? '#F95700' : '#ffffff'} !important;
            color: ${theme === 'light' ? '#18181b' : '#ffffff'} !important;
            padding: 6mm 8mm;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            overflow: hidden;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          /* Crop marks for printing */
          .print-card-wrapper::before, .print-card-wrapper::after {
            content: '';
            position: absolute;
            width: 10mm;
            height: 10mm;
            border: 0.5px solid #a1a1aa;
            pointer-events: none;
          }
          
          /* Top left crop mark */
          .crop-mark {
            position: absolute;
            width: 15mm;
            height: 15mm;
            pointer-events: none;
          }
          
          .crop-tl { top: -5mm; left: -5mm; border-right: 0.2mm solid #a1a1aa; border-bottom: 0.2mm solid #a1a1aa; }
          .crop-tr { top: -5mm; right: -5mm; border-left: 0.2mm solid #a1a1aa; border-bottom: 0.2mm solid #a1a1aa; }
          .crop-bl { bottom: -5mm; left: -5mm; border-right: 0.2mm solid #a1a1aa; border-top: 0.2mm solid #a1a1aa; }
          .crop-br { bottom: -5mm; right: -5mm; border-left: 0.2mm solid #a1a1aa; border-top: 0.2mm solid #a1a1aa; }
        }
      `}</style>

      {/* RENDER DYNAMIC PRINT BLOCKS IN REAL mm FOR PHYSICAL PRINTER */}
      <div id="printable-card-area" className="hidden">
        {/* Front Print Card */}
        <div className="relative">
          {/* Crop marks */}
          <div className="crop-mark crop-tl"></div>
          <div className="crop-mark crop-tr"></div>
          <div className="crop-mark crop-bl"></div>
          <div className="crop-mark crop-br"></div>
          
          <div 
            className="print-card-wrapper"
            style={{
              backgroundColor: bgColor,
              borderColor: `${textColor}15`,
              color: textColor
            }}
          >
            {/* Texture Pattern Overlay */}
            {texture !== 'none' && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 90 50">
                <defs>
                  <pattern id="stripes-pat-print-f" width="1.66" height="1.66" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                    <line x1="0" y1="0" x2="0" y2="1.66" stroke={accentColor} strokeWidth="0.12" opacity="0.15" />
                  </pattern>
                </defs>
                <rect width="90" height="50" fill="url(#stripes-pat-print-f)" />
              </svg>
            )}

            {layoutTemplate === 'classic' && (
              <>
                {/* Header */}
                <div className="flex justify-between items-start w-full z-10">
                  <div>
                    <div 
                      className="font-extrabold uppercase leading-none tracking-tighter" 
                      style={{ 
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '18px'
                      }}
                    >
                      {cardData.companyName}
                    </div>
                    <div 
                      className="uppercase tracking-[0.25em] font-bold mt-0.5"
                      style={{ 
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '6px',
                        color: accentColor
                      }}
                    >
                      {cardData.companySubtitle}
                    </div>
                  </div>
                  <div 
                    className="text-[6px] font-black tracking-widest uppercase border px-2 py-0.5 opacity-80"
                    style={{ 
                      fontFamily: 'Inter, sans-serif',
                      borderColor: accentColor,
                      color: textColor
                    }}
                  >
                    АКЗ • ИЗОЛЯЦИЯ
                  </div>
                </div>
                
                {/* Subtitle */}
                <div className="my-auto z-10">
                  <div 
                    className="text-[7px] uppercase tracking-wider font-extrabold opacity-80 mb-0.5"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {cardData.legalName}
                  </div>
                  <div 
                    className="font-black uppercase tracking-tight leading-none" 
                    style={{ 
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '10px'
                    }}
                  >
                    {cardData.tagline}
                  </div>
                </div>
                
                {/* Footer details */}
                <div className="flex justify-between items-end border-t pt-2 w-full z-10" style={{ borderColor: `${textColor}15` }}>
                  <div 
                    className="space-y-0.5 text-[7px] font-bold font-mono"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    <div>Тел: {cardData.phone1}</div>
                    <div>Тел: {cardData.phone2}</div>
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-[7px] font-black uppercase tracking-wider"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {cardData.website}
                    </div>
                    <div 
                      className="text-[5px] uppercase tracking-widest font-semibold opacity-70 mt-0.5"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {cardData.regions}
                    </div>
                  </div>
                </div>
              </>
            )}

            {layoutTemplate === 'minimal' && (
              <div className="flex flex-col items-center justify-between h-full text-center z-10 w-full py-0.5">
                {/* Header Badge */}
                <div 
                  className="text-[6px] font-black tracking-widest uppercase px-1.5 py-0.5 border"
                  style={{ 
                    fontFamily: 'Inter, sans-serif',
                    backgroundColor: `${accentColor}10`,
                    borderColor: `${accentColor}25`,
                    color: textColor
                  }}
                >
                  АКЗ • ИЗОЛЯЦИЯ
                </div>

                {/* Logo & Subtitle */}
                <div className="leading-none mt-1">
                  <div 
                    className="font-extrabold uppercase leading-none tracking-tighter" 
                    style={{ 
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '16px'
                    }}
                  >
                    {cardData.companyName}
                  </div>
                  <div 
                    className="uppercase tracking-[0.25em] font-bold mt-0.5"
                    style={{ 
                      fontFamily: 'Inter, sans-serif',
                      fontSize: '5px',
                      color: accentColor
                    }}
                  >
                    {cardData.companySubtitle}
                  </div>
                </div>

                {/* Divider */}
                <div className="w-12 h-px my-1" style={{ backgroundColor: `${textColor}20` }} />

                {/* Tagline & Legal */}
                <div className="my-0.5">
                  <div 
                    className="text-[6px] uppercase tracking-wider font-extrabold opacity-80 mb-0.5"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {cardData.legalName}
                  </div>
                  <div 
                    className="font-black uppercase tracking-tight leading-none" 
                    style={{ 
                      fontFamily: 'Montserrat, sans-serif',
                      fontSize: '9px'
                    }}
                  >
                    {cardData.tagline}
                  </div>
                </div>

                {/* Horizontal line for footer */}
                <div className="w-3/4 h-px my-1.5" style={{ backgroundColor: `${textColor}15` }} />

                {/* Centered Contacts */}
                <div className="space-y-0.5 text-center w-full">
                  <div className="flex justify-center gap-3 text-[7px] font-bold font-mono" style={{ color: textColor }}>
                    <span>{cardData.phone1}</span>
                    <span style={{ color: accentColor }}>•</span>
                    <span>{cardData.phone2}</span>
                  </div>
                  <div className="flex justify-center gap-2 text-[6px] font-bold uppercase tracking-wider" style={{ fontFamily: 'Inter, sans-serif', color: textColor }}>
                    <span style={{ color: accentColor }}>{cardData.website}</span>
                    <span className="opacity-40">•</span>
                    <span className="opacity-60">{cardData.regions}</span>
                  </div>
                </div>
              </div>
            )}

            {layoutTemplate === 'grid' && (
              <div className="flex h-full w-full z-10 text-left relative">
                {/* Vertical line divider */}
                <div className="absolute top-0 bottom-0 left-[35%] w-px" style={{ backgroundColor: `${textColor}15` }} />

                {/* Left Column (35% width) */}
                <div className="w-[35%] pr-2 flex flex-col justify-between h-full py-0.5">
                  <div className="leading-none">
                    <div 
                      className="font-extrabold uppercase leading-none tracking-tighter" 
                      style={{ 
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '14px'
                      }}
                    >
                      {cardData.companyName}
                    </div>
                    <div 
                      className="uppercase tracking-[0.15em] font-bold mt-0.5 text-[5px]"
                      style={{ 
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '5px',
                        color: accentColor
                      }}
                    >
                      {cardData.companySubtitle}
                    </div>
                  </div>

                  <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                  <div 
                    className="text-[6px] font-black tracking-widest uppercase border px-1.5 py-0.5 text-center"
                    style={{ 
                      fontFamily: 'Inter, sans-serif',
                      backgroundColor: `${accentColor}10`,
                      borderColor: `${accentColor}25`,
                      color: textColor
                    }}
                  >
                    АКЗ • ИЗОЛЯЦИЯ
                  </div>
                </div>

                {/* Right Column (65% width) */}
                <div className="w-[65%] pl-4 flex flex-col justify-between h-full py-0.5">
                  <div>
                    <div 
                      className="text-[6px] uppercase tracking-wider font-extrabold opacity-80 mb-0.5"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {cardData.legalName}
                    </div>
                    <div 
                      className="font-black uppercase tracking-tight leading-[1.1]" 
                      style={{ 
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '8.5px'
                      }}
                    >
                      {(() => {
                        const [l1, l2] = splitTagline(cardData.tagline);
                        return l2 ? <>{l1}<br />{l2}</> : l1;
                      })()}
                    </div>
                  </div>

                  <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                  {/* Contacts Block */}
                  <div className="space-y-1">
                    <div className="space-y-0.5 text-[7px] font-bold font-mono">
                      <div>Тел: {cardData.phone1}</div>
                      <div>Тел: {cardData.phone2}</div>
                    </div>
                    
                    <div className="w-full h-px" style={{ backgroundColor: `${textColor}10` }} />

                    <div className="flex justify-between items-end">
                      <div 
                        className="text-[7px] font-black uppercase tracking-wider"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {cardData.website}
                      </div>
                      <div 
                        className="text-[5px] uppercase tracking-widest font-semibold opacity-70"
                        style={{ fontFamily: 'Inter, sans-serif' }}
                      >
                        {cardData.regions}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {layoutTemplate === 'qr' && (
              <div className="flex h-full w-full z-10 text-left items-stretch">
                {/* Left side: details */}
                <div className="flex-1 flex flex-col justify-between h-full py-0.5 pr-2">
                  <div className="leading-none">
                    <div 
                      className="font-extrabold uppercase leading-none tracking-tighter" 
                      style={{ 
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '15px'
                      }}
                    >
                      {cardData.companyName}
                    </div>
                    <div 
                      className="uppercase tracking-[0.25em] font-bold mt-0.5"
                      style={{ 
                        fontFamily: 'Inter, sans-serif',
                        fontSize: '5.5px',
                        color: accentColor
                      }}
                    >
                      {cardData.companySubtitle}
                    </div>
                  </div>

                  <div className="my-0.5">
                    <div 
                      className="text-[6px] uppercase tracking-wider font-extrabold opacity-80"
                      style={{ fontFamily: 'Inter, sans-serif' }}
                    >
                      {cardData.legalName}
                    </div>
                    <div 
                      className="font-black uppercase tracking-tight leading-[1.1]" 
                      style={{ 
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '8.5px'
                      }}
                    >
                      {(() => {
                        const [l1, l2] = splitTagline(cardData.tagline);
                        return l2 ? <>{l1}<br />{l2}</> : l1;
                      })()}
                    </div>
                  </div>

                  <div className="w-full h-px my-1" style={{ backgroundColor: `${textColor}15` }} />

                  {/* Staged contacts */}
                  <div className="space-y-0.5 text-[6.5px] font-bold font-mono">
                    <div>Тел: {cardData.phone1}</div>
                    <div>Тел: {cardData.phone2}</div>
                    <div className="font-sans uppercase text-[6.5px] font-black" style={{ color: accentColor }}>{cardData.website}</div>
                  </div>
                </div>

                {/* Right side: QR Code Block */}
                <div className="w-[80px] flex flex-col justify-between items-center py-0.5">
                  <div 
                    className="text-[6px] font-black tracking-widest uppercase border px-1.5 py-0.5 w-full text-center"
                    style={{ 
                      fontFamily: 'Inter, sans-serif',
                      borderColor: accentColor,
                      color: textColor
                    }}
                  >
                    АКЗ • ИЗОЛЯЦИЯ
                  </div>

                  <div className="bg-white p-1 rounded my-auto">
                    {qrCodeDataUrl ? (
                      <img 
                        src={qrCodeDataUrl}
                        alt="QR Code Print"
                        className="w-[14mm] h-[14mm]"
                      />
                    ) : (
                      <div className="w-[14mm] h-[14mm] bg-zinc-200" />
                    )}
                  </div>

                  <div 
                    className="text-[5px] uppercase tracking-widest font-semibold opacity-70 text-center w-full"
                    style={{ fontFamily: 'Inter, sans-serif' }}
                  >
                    {cardData.regions}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Back Print Card */}
        <div className="relative">
          {/* Crop marks */}
          <div className="crop-mark crop-tl"></div>
          <div className="crop-mark crop-tr"></div>
          <div className="crop-mark crop-bl"></div>
          <div className="crop-mark crop-br"></div>
          
          <div 
            className="print-card-wrapper flex flex-col justify-between items-center" 
            style={{ 
              padding: '6mm',
              backgroundColor: bgColor,
              borderColor: `${textColor}15`,
              color: textColor
            }}
          >
            {/* Texture Pattern Overlay */}
            {texture !== 'none' && (
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-0" viewBox="0 0 90 50">
                <rect width="90" height="50" fill="url(#stripes-pat-print-f)" />
              </svg>
            )}

            <div className="text-center flex flex-col items-center z-10">
              <div 
                className="font-extrabold uppercase leading-none tracking-tighter" 
                style={{ 
                  fontFamily: 'Montserrat, sans-serif',
                  fontSize: '18px'
                }}
              >
                {cardData.companyName}
              </div>
              <div 
                className="uppercase tracking-[0.25em] font-bold mt-0.5"
                style={{ 
                  fontFamily: 'Inter, sans-serif',
                  fontSize: '5px',
                  color: accentColor
                }}
              >
                {cardData.companySubtitle}
              </div>
            </div>

            <div className="flex flex-col items-center justify-center my-0.5 z-10">
              <div className="bg-white p-1 rounded">
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl}
                    alt="QR Code"
                    className="w-[20mm] h-[20mm]"
                  />
                ) : (
                  <div className="w-[20mm] h-[20mm] bg-zinc-200" />
                )}
              </div>
              <span 
                className="text-[4px] uppercase tracking-widest font-black opacity-60 mt-1"
                style={{ fontFamily: 'Inter, sans-serif', color: textColor }}
              >
                сканируйте для перехода
              </span>
            </div>

            <div 
              className="text-[7px] font-black tracking-widest uppercase z-10"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              {cardData.website}
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-[1mm]" style={{ backgroundColor: accentColor }}></div>
          </div>
        </div>
      </div>

    </div>
  );
};
