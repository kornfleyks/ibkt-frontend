import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import AppLayout from "../layouts/AppLayout/AppLayout";
import CatWorkspace from "../pages/CatWorkspace";
import ActiveApplicationWorkspace from "../pages/ActiveApplications/ActiveApplicationWorkspace";
import Dashboard from "../pages/Dashboard";
import Cats from "../pages/Cats";
import Adopters from "../pages/Adopters";
import ActiveApplications from "../pages/ActiveApplications";
import Adoptions from "../pages/Adoptions";
import AdoptionDetail from "../pages/Adoptions/AdoptionDetail";
import Matching from "../pages/Matching";
import Tasks from "../pages/Tasks";
import Login from "../pages/Login/Login";
import Forbidden from "../pages/Forbidden";

import ProtectedRoute from "../components/ProtectedRoute";

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}

        <Route path="/login" element={<Login />} />

        {/* Protected */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              roles={[
                "Administrator",
                "Volunteer",
                "Rescuer",
                "Foster",
                "Adopter",
                "SuperAdmin",
              ]}
            >
              <AppLayout>
                <Dashboard />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cats"
          element={
            <ProtectedRoute roles={["Administrator", "Volunteer"]}>
              <AppLayout>
                <Cats />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cats/:id"
          element={
            <ProtectedRoute roles={["Administrator", "Volunteer"]}>
              <AppLayout>
                <CatWorkspace />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/adopters"
          element={
            <ProtectedRoute roles={["Administrator", "Volunteer"]}>
              <AppLayout>
                <Adopters />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/active-applications/:id"
          element={
            <ProtectedRoute roles={["Administrator", "Volunteer"]}>
              <AppLayout>
                <ActiveApplicationWorkspace />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/active-applications"
          element={
            <ProtectedRoute roles={["Administrator", "Volunteer"]}>
              <AppLayout>
                <ActiveApplications />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/matching"
          element={
            <ProtectedRoute roles={["Administrator", "Volunteer"]}>
              <AppLayout>
                <Matching />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/adoptions/:id"
          element={
            <ProtectedRoute roles={["Administrator", "Volunteer", "SuperAdmin"]}>
              <AppLayout>
                <AdoptionDetail />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/adoptions"
          element={
            <ProtectedRoute roles={["Administrator", "Volunteer", "SuperAdmin"]}>
              <AppLayout>
                <Adoptions />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks"
          element={
            <ProtectedRoute
              roles={["Administrator", "Volunteer", "Rescuer", "Foster"]}
            >
              <AppLayout>
                <Tasks />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Redirects */}

        <Route path="/forbidden" element={<Forbidden />} />

        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* 404 */}

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
