import { Routes, Route, Navigate } from 'react-router-dom';
import PrivateRoute from './PrivateRoute';
import AppLayout from '../components/layout/AppLayout';

// Pages
import AuthPage from '../pages/AuthPage/AuthPage';
import ForgotPasswordPage from '../pages/AuthPage/ForgotPasswordPage';
import ResetPasswordPage from '../pages/AuthPage/ResetPasswordPage';
import DashboardPage from '../pages/DashboardPage/DashboardPage';
import ProfilePage from '../pages/ProfilePage/ProfilePage';
import PlansPage from '../pages/PlansPage/PlansPage';
import TrainingCalendarPage from '../pages/TrainingCalendarPage/TrainingCalendarPage';
import TrainerDirectoryPage from '../pages/TrainerDirectoryPage/TrainerDirectoryPage';
import MyClientsPage from '../pages/MyClientsPage/MyClientsPage';
import ChatPage from '../pages/ChatPage/ChatPage';
import AdminPage from '../pages/AdminPage/AdminPage';
import Homepage from '../pages/Homepage/Homepage';

import SessionDetailsPage from '../pages/SessionDetailsPage/SessionDetailsPage';

// Central route map with role-based protection.
const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth routes - login and register with custom transition */}
      <Route path="/login" element={<AuthPage />} />
      <Route path="/register" element={<AuthPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />

      {/* Routes available to authenticated users */}
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
        <Route path="/trainings/:sessionId" element={<SessionDetailsPage />} />
      </Route>

      {/* Admin-only routes with shared layout */}
      <Route
        element={
          <PrivateRoute allowedRoles={['ADMIN']}>
            <AppLayout />
          </PrivateRoute>
        }
      >
        <Route path="/admin" element={<AdminPage />} />
      </Route>

      {/* Homepage como rota principal */}
      <Route path="/" element={<Homepage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;
