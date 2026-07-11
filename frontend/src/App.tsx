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
import { OwnersPlaceholderPage } from "./pages/OwnersPlaceholderPage";
import { VeterinariansPlaceholderPage } from "./pages/VeterinariansPlaceholderPage";
import { AddOwnerPage } from "./pages/AddOwnerPage";
import { AddPetPage } from "./pages/AddPetPage";

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
              <Route path="owners" element={<OwnersPlaceholderPage />} />
              <Route
                path="owners/new"
                element={
                  <RequireAuth>
                    <AddOwnerPage />
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
              <Route path="*" element={<ErrorPage variant="not-found" />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
