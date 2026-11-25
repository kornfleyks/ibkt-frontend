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
import Forms from "../pages/Forms";
import Rescuers from "../pages/Rescuers";
import Fosters from "../pages/Fosters";
import ActivityLog from "../pages/ActivityLog";
import AppSettings from "../pages/AppSettings";
import ReviewItems from "../pages/ReviewItems/ReviewItems";
import Account from "../pages/Account";
import Login from "../pages/Login/Login";
import Register from "../pages/Register";
import ForgotPassword from "../pages/ForgotPassword";
import ResetPassword from "../pages/ResetPassword";
import BecomeRescuer from "../pages/BecomeRescuer";
import SharedAddCat from "../pages/SharedAddCat";
import RescuerAgreement from "../pages/RescuerAgreement";
import BecomeFoster from "../pages/BecomeFoster";
import PublicForm from "../pages/PublicForm";
import RescuerLogin from "../pages/RescuerLogin";
import RescuerSetPassword from "../pages/RescuerSetPassword";
import RescuerCats from "../pages/RescuerCats";
import RescuerAddCat from "../pages/RescuerAddCat";
import FosterLogin from "../pages/FosterLogin";
import FosterSetPassword from "../pages/FosterSetPassword";
import FosterCats from "../pages/FosterCats";
import FosterProfile from "../pages/FosterProfile";
import Forbidden from "../pages/Forbidden";

import ProtectedRoute from "../components/ProtectedRoute";
import RescuerRoute from "../components/RescuerRoute";
import FosterRoute from "../components/FosterRoute";
import PortalLayout from "../layouts/PortalLayout/PortalLayout";

function AppRoutes() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        {/* Public */}

        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/become-a-rescuer" element={<BecomeRescuer />} />
        <Route path="/become-a-rescuer/:code" element={<BecomeRescuer />} />
        <Route path="/rescuer-agreement/:code" element={<RescuerAgreement />} />
        <Route path="/add-cat/:code" element={<SharedAddCat />} />
        <Route path="/forms/:formKey" element={<PublicForm />} />
        <Route path="/rescuer/login" element={<RescuerLogin />} />
        <Route path="/rescuer/set-password" element={<RescuerSetPassword />} />
        <Route path="/become-a-foster" element={<BecomeFoster />} />
        <Route path="/foster/login" element={<FosterLogin />} />
        <Route path="/foster/set-password" element={<FosterSetPassword />} />

        {/* Foster portal (Foster role only) */}

        <Route
          path="/foster"
          element={
            <FosterRoute>
              <PortalLayout>
                <FosterCats />
              </PortalLayout>
            </FosterRoute>
          }
        />

        <Route
          path="/foster/cats/:id/profile"
          element={
            <FosterRoute>
              <PortalLayout>
                <FosterProfile />
              </PortalLayout>
            </FosterRoute>
          }
        />

        {/* Rescuer portal (Rescuer role only) */}

        <Route
          path="/rescuer"
          element={
            <RescuerRoute>
              <PortalLayout>
                <RescuerCats />
              </PortalLayout>
            </RescuerRoute>
          }
        />

        <Route
          path="/rescuer/add-cat"
          element={
            <RescuerRoute>
              <PortalLayout>
                <RescuerAddCat />
              </PortalLayout>
            </RescuerRoute>
          }
        />

        {/* Protected */}

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute
              roles={["Admin", "Volunteer"]}
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
          path="/forms"
          element={
            <ProtectedRoute roles={["Admin", "Volunteer"]}>
              <AppLayout>
                <Forms />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rescuers"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <AppLayout>
                <Rescuers />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/fosters"
          element={
            <ProtectedRoute roles={["Admin"]}>
              <AppLayout>
                <Fosters />
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
              roles={["Admin", "Volunteer"]}
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
            <ProtectedRoute roles={["Super Admin"]}>
              <AppLayout>
                <AppSettings />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/client-review"
          element={
            <ProtectedRoute roles={["Super Admin"]}>
              <AppLayout>
                <ReviewItems />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/account"
          element={
            <ProtectedRoute
              roles={["Admin", "Volunteer"]}
            >
              <AppLayout>
                <Account />
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
