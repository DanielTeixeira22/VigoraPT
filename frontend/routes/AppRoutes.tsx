import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import AppLayout from '../components/layout/AppLayout';

// Pages
import LoginPage from '../pages/LoginPage/LoginPage';
import RegisterPage from '../pages/RegisterPage/RegisterPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import PlansPage from '../pages/PlansPage/PlansPage';
import TrainingCalendarPage from '../pages/TrainingCalendarPage/TrainingCalendarPage';
import TrainerDirectoryPage from '../pages/TrainerDirectoryPage/TrainerDirectoryPage';
import MyClientsPage from '../pages/MyClientsPage/MyClientsPage';
import ChatPage from '../pages/ChatPage/ChatSPage';
import AdminPage from '../pages/AdminPage/AdminPage';

const AppRoutes = () => {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Routes accessible to all authenticated users */}
      <Route
        element={
          <PrivateRoute>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/trainers" element={<TrainerDirectoryPage />} />
        <Route path="/chat" element={<ChatPage />} />
      </Route>

      {/* Trainer-only routes */}
      <Route
        element={
          <PrivateRoute allowedRoles={['TRAINER', 'ADMIN']}>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/clients" element={<MyClientsPage />} />
        <Route path="/my-clients" element={<MyClientsPage />} />
      </Route>

      {/* Client-only routes */}
      <Route
        element={
          <PrivateRoute allowedRoles={['CLIENT']}>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/calendar" element={<TrainingCalendarPage />} />
        <Route path="/trainings" element={<TrainingCalendarPage />} />
      </Route>

      {/* Admin route with AppLayout */}
      <Route
        element={
          <PrivateRoute allowedRoles={['ADMIN']}>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Default redirect */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;
