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
import Users from "../pages/Users";
import ActivityLog from "../pages/ActivityLog";
import AppSettings from "../pages/AppSettings";
import Login from "../pages/Login/Login";
import Register from "../pages/Register";
import Forbidden from "../pages/Forbidden";

import ProtectedRoute from "../components/ProtectedRoute";

function AppRoutes() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Public */}

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              roles={["Admin", "Volunteer", "Rescuer", "Foster", "Adopter"]}
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
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
              <AppLayout>
                <Cats />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/cats/:id"
          element={
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
              <AppLayout>
                <CatWorkspace />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/adopters"
          element={
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
              <AppLayout>
                <Adopters />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/active-applications/:id"
          element={
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
              <AppLayout>
                <ActiveApplicationWorkspace />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/active-applications"
          element={
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
              <AppLayout>
                <ActiveApplications />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/matching"
          element={
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
              <AppLayout>
                <Matching />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/adoptions/:id"
          element={
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
              <AppLayout>
                <AdoptionDetail />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/adoptions"
          element={
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
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
              roles={["Admin", "Volunteer", "Rescuer", "Foster"]}
            >
              <AppLayout>
                <Tasks />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/users"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <AppLayout>
                <Users />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/activity"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <AppLayout>
                <ActivityLog />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute roles={["Admin"]} emails={["billkifonidis@gmail.com"]}>
              <AppLayout>
                <AppSettings />
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
