import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import AuthCallback from "./pages/auth/Callback.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

export default function App() {
  console.log("AUTHORITY", import.meta.env.VITE_HERCULES_OIDC_AUTHORITY);
  console.log("CLIENT_ID", import.meta.env.VITE_HERCULES_OIDC_CLIENT_ID);
  console.log("PROMPT", import.meta.env.VITE_HERCULES_OIDC_PROMPT);
  console.log(
    "RESPONSE_TYPE",
    import.meta.env.VITE_HERCULES_OIDC_RESPONSE_TYPE,
  );
  console.log("SCOPE", import.meta.env.VITE_HERCULES_OIDC_SCOPE);
  console.log("REDIRECT_URI", import.meta.env.VITE_HERCULES_OIDC_REDIRECT_URI);

  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
