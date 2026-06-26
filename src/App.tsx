import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { RegistryPage } from './pages/RegistryPage';
import { ParityMatrixPage } from './pages/ParityMatrixPage';
import { RolesSwitchPage } from './pages/RolesSwitchPage';
import { MetricsPage } from './pages/MetricsPage';
import { PhasePlanPage } from './pages/PhasePlanPage';
import { GanttPage } from './pages/GanttPage';
import { ImportPage } from './pages/ImportPage';

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<RegistryPage />} />
        <Route path="parity" element={<ParityMatrixPage />} />
        <Route path="roles" element={<RolesSwitchPage />} />
        <Route path="metrics" element={<MetricsPage />} />
        <Route path="plan" element={<PhasePlanPage />} />
        <Route path="gantt" element={<GanttPage />} />
        <Route path="import" element={<ImportPage />} />
      </Route>
    </Routes>
  );
}
