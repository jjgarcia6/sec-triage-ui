import { Routes, Route } from 'react-router-dom';
import { TriageDashboard } from '@/features/triage/components/TriageDashboard';
import { Login } from '@/features/auth/components/Login';
import { ProtectedRoute } from '@/features/auth/components/ProtectedRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={
        <ProtectedRoute>
          <TriageDashboard />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

export default App;
