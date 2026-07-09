import React from 'react';
import { Helmet } from 'react-helmet-async';
import { FleetChessboard } from '../components/FleetChessboard';

export const FleetDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <Helmet>
        <title>Аренда спецтехники | СФЕРА</title>
      </Helmet>
      
      <div className="bg-gradient-to-r from-orange-500 to-[#F95700] rounded-2xl p-6 text-white shadow-md">
        <h1 className="text-2xl md:text-3xl font-black font-['Montserrat'] uppercase tracking-tight">Аренда спецтехники</h1>
        <p className="text-orange-100 mt-2 font-medium">Управление автопарком, контроль занятости и телеметрия</p>
      </div>

      <FleetChessboard />
    </div>
  );
};

export default FleetDashboard;
