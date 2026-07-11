import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { MainLayout } from "./components/MainLayout";
import { RequireAuth } from "./components/RequireAuth";
import { WelcomePage } from "./pages/WelcomePage";
import { LoginPage } from "./pages/LoginPage";
import { OupsPage } from "./pages/OupsPage";
import { ErrorPage } from "./pages/ErrorPage";
import { ErrorRoute } from "./pages/ErrorRoute";
import { FindOwnersPage } from "./pages/FindOwnersPage";
import { OwnerDetailsPage } from "./pages/OwnerDetailsPage";
import { VeterinariansPlaceholderPage } from "./pages/VeterinariansPlaceholderPage";
import { AddOwnerPage } from "./pages/AddOwnerPage";
import { AddPetPage } from "./pages/AddPetPage";
import { EditOwnerPage } from "./pages/EditOwnerPage";
import { EditPetPage } from "./pages/EditPetPage";
import { AddVisitPage } from "./pages/AddVisitPage";

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<MainLayout />}>
              <Route index element={<WelcomePage />} />
              <Route path="login" element={<LoginPage />} />
              <Route path="oups" element={<OupsPage />} />
              <Route path="error" element={<ErrorRoute />} />
              <Route path="veterinarians" element={<VeterinariansPlaceholderPage />} />
              <Route
                path="owners"
                element={
                  <RequireAuth>
                    <FindOwnersPage />
                  </RequireAuth>
                }
              />
              <Route
                path="owners/new"
                element={
                  <RequireAuth>
                    <AddOwnerPage />
                  </RequireAuth>
                }
              />
              <Route
                path="owners/:ownerId"
                element={
                  <RequireAuth>
                    <OwnerDetailsPage />
                  </RequireAuth>
                }
              />
              <Route
                path="owners/:ownerId/edit"
                element={
                  <RequireAuth>
                    <EditOwnerPage />
                  </RequireAuth>
                }
              />
              <Route
                path="owners/:ownerId/pets/new"
                element={
                  <RequireAuth>
                    <AddPetPage />
                  </RequireAuth>
                }
              />
              <Route
                path="owners/:ownerId/pets/:petId/edit"
                element={
                  <RequireAuth>
                    <EditPetPage />
                  </RequireAuth>
                }
              />
              <Route
                path="owners/:ownerId/pets/:petId/visits/new"
                element={
                  <RequireAuth>
                    <AddVisitPage />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<ErrorPage variant="not-found" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
