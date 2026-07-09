import React from 'react';
import { useNavigate } from 'react-router-dom';
import { LeadsDatabase } from './LeadsDatabase';

export const LeadsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="w-full h-full">
      <LeadsDatabase
        taskId={0}
        taskName="Общая база лидов"
        offerContext=""
        onClose={() => navigate('/crm')}
        asPage={true}
      />
    </div>
  );
};
