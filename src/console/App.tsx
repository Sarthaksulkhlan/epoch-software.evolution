import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConsoleLayout } from './components/layout/ConsoleLayout';
import { CurrentView } from './views/CurrentView';
import { HistoryView } from './views/HistoryView';
import { TrajectoryView } from './views/TrajectoryView';
import { FuturesView } from './views/FuturesView';
import { ReportView } from './views/ReportView';

export const App: React.FC = () => {
  return (
    <BrowserRouter basename="/console">
      <Routes>
        <Route path="/" element={<ConsoleLayout />}>
          <Route index element={<CurrentView />} />
          <Route path="history" element={<HistoryView />} />
          <Route path="trajectory" element={<TrajectoryView />} />
          <Route path="futures" element={<FuturesView />} />
          <Route path="report" element={<ReportView />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
