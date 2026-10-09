import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layout Shells
import { PublicShell } from '../components/shells/PublicShell';
import { SeniorShell } from '../components/shells/SeniorShell';
import { CaregiverShell } from '../components/shells/CaregiverShell';

// Guards
import { ProtectedRoute } from '../components/shared/ProtectedRoute';

// Public Pages
import { LandingPage } from '../pages/public/LandingPage';
import { AboutPage } from '../pages/public/AboutPage';

// Registration & Login Pages
import { SeniorRegisterPage } from '../pages/senior/SeniorRegisterPage';
import { SeniorLoginPage } from '../pages/senior/SeniorLoginPage';
import { CaregiverRegisterPage } from '../pages/caregiver/CaregiverRegisterPage';
import { CaregiverLoginPage } from '../pages/caregiver/CaregiverLoginPage';
import { ForgotPasswordPage } from '../pages/public/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/public/ResetPasswordPage';

// Senior Pages
import { SeniorDashboardPage } from '../pages/senior/SeniorDashboardPage';
import { SeniorMedicinesPage } from '../pages/senior/SeniorMedicinesPage';
import { SeniorAddMedicinePage } from '../pages/senior/SeniorAddMedicinePage';
import { SeniorEditMedicinePage } from '../pages/senior/SeniorEditMedicinePage';
import { SeniorMedicineDetailPage } from '../pages/senior/SeniorMedicineDetailPage';
import { SeniorHistoryPage } from '../pages/senior/SeniorHistoryPage';
import { SeniorProfilePage } from '../pages/senior/SeniorProfilePage';
import { SeniorSettingsPage } from '../pages/senior/SeniorSettingsPage';

// Caregiver Pages
import { CaregiverDashboardPage } from '../pages/caregiver/CaregiverDashboardPage';
import { CaregiverAdultsPage } from '../pages/caregiver/CaregiverAdultsPage';
import { CaregiverAdultDetailPage } from '../pages/caregiver/CaregiverAdultDetailPage';
import { CaregiverAlertsPage } from '../pages/caregiver/CaregiverAlertsPage';
import { CaregiverHistoryPage } from '../pages/caregiver/CaregiverHistoryPage';
import { CaregiverProfilePage } from '../pages/caregiver/CaregiverProfilePage';
import { CaregiverSettingsPage } from '../pages/caregiver/CaregiverSettingsPage';

// Caretaker Shell & Pages (Dedicated Caretaker Portal)
import { CaretakerShell } from '../components/shells/CaretakerShell';
import { CaretakerDashboardPage } from '../pages/caretaker/CaretakerDashboardPage';
import { CaretakerAdultsPage } from '../pages/caretaker/CaretakerAdultsPage';
import { CaretakerAdultDetailPage } from '../pages/caretaker/CaretakerAdultDetailPage';
import { CaretakerAlertsPage } from '../pages/caretaker/CaretakerAlertsPage';
import { CaretakerHistoryPage } from '../pages/caretaker/CaretakerHistoryPage';
import { CaretakerProfilePage } from '../pages/caretaker/CaretakerProfilePage';
import { CaretakerSettingsPage } from '../pages/caretaker/CaretakerSettingsPage';

// Fallback
import { NotFoundPage } from '../pages/NotFoundPage';

export const AppRouter: React.FC = () => {
  return (
    <Routes>
      {/* Public Pages */}
      <Route element={<PublicShell />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/choose-role" element={<Navigate to="/" replace />} />
        <Route path="/login" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/" replace />} />

        {/* Public Dedicated Onboarding & Login Routes */}
        <Route path="/senior/register" element={<SeniorRegisterPage />} />
        <Route path="/senior/login" element={<SeniorLoginPage />} />
        <Route path="/caregiver/register" element={<CaregiverRegisterPage />} />
        <Route path="/caregiver/login" element={<CaregiverLoginPage />} />
        <Route path="/caretaker/register" element={<Navigate to="/caregiver/register" replace />} />
        <Route path="/caretaker/login" element={<CaregiverLoginPage />} />

        {/* Password Reset Routes */}
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
      </Route>

      {/* Senior Portal Protected Routes */}
      <Route
        path="/senior"
        element={
          <ProtectedRoute allowedRole="senior">
            <SeniorShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/senior/dashboard" replace />} />
        <Route path="dashboard" element={<SeniorDashboardPage />} />
        <Route path="medicines" element={<SeniorMedicinesPage />} />
        <Route path="medicines/add" element={<SeniorAddMedicinePage />} />
        <Route path="medicines/:id" element={<SeniorMedicineDetailPage />} />
        <Route path="medicines/:id/edit" element={<SeniorEditMedicinePage />} />
        <Route path="history" element={<SeniorHistoryPage />} />
        <Route path="profile" element={<SeniorProfilePage />} />
        <Route path="settings" element={<SeniorSettingsPage />} />
      </Route>

      {/* Caregiver Portal Protected Routes */}
      <Route
        path="/caregiver"
        element={
          <ProtectedRoute allowedRole="caregiver">
            <CaregiverShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/caregiver/dashboard" replace />} />
        <Route path="dashboard" element={<CaregiverDashboardPage />} />
        <Route path="adults" element={<CaregiverAdultsPage />} />
        <Route path="adults/:id" element={<CaregiverAdultDetailPage />} />
        <Route path="alerts" element={<CaregiverAlertsPage />} />
        <Route path="history" element={<CaregiverHistoryPage />} />
        <Route path="profile" element={<CaregiverProfilePage />} />
        <Route path="settings" element={<CaregiverSettingsPage />} />
      </Route>

      {/* Caretaker Portal Protected Routes (Dedicated Caretaker Workspace) */}
      <Route
        path="/caretaker"
        element={
          <ProtectedRoute allowedRole="caregiver">
            <CaretakerShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/caretaker/dashboard" replace />} />
        <Route path="dashboard" element={<CaretakerDashboardPage />} />
        <Route path="adults" element={<CaretakerAdultsPage />} />
        <Route path="adults/:id" element={<CaretakerAdultDetailPage />} />
        <Route path="alerts" element={<CaretakerAlertsPage />} />
        <Route path="history" element={<CaretakerHistoryPage />} />
        <Route path="profile" element={<CaretakerProfilePage />} />
        <Route path="settings" element={<CaretakerSettingsPage />} />
      </Route>

      {/* 404 Fallback */}
      <Route element={<PublicShell />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};
