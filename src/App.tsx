import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import AdminDashboard from './pages/AdminDashboard';
import StudentDashboard from './pages/StudentDashboard';
import CompanyDashboard from './pages/CompanyDashboard';
import UniversityDashboard from './pages/UniversityDashboard';
import OpportunitiesPage from './pages/OpportunitiesPage';
import StudentLogbooksPage from './pages/StudentLogbooksPage';
import SupervisorLogbooksPage from './pages/SupervisorLogbooksPage';
import ProfileSettingsPage from './pages/ProfileSettingsPage';
import HelpSystem from './components/HelpSystem';

export default function App() {
  return (
    <BrowserRouter>
      <HelpSystem />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/student/dashboard" element={<StudentDashboard />} />
        <Route path="/student/opportunities" element={<OpportunitiesPage />} />
        <Route path="/student/logbooks" element={<StudentLogbooksPage />} />
        <Route path="/student/settings" element={<ProfileSettingsPage userRole="student" />} />
        <Route path="/company/dashboard" element={<CompanyDashboard />} />
        <Route path="/company/settings" element={<ProfileSettingsPage userRole="company" />} />
        <Route path="/supervisor/dashboard" element={<UniversityDashboard />} />
        <Route path="/supervisor/logbooks" element={<SupervisorLogbooksPage />} />
        <Route path="/supervisor/settings" element={<ProfileSettingsPage userRole="supervisor" />} />
      </Routes>
    </BrowserRouter>
  );
}
