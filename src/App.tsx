import { BrowserRouter } from "react-router-dom";
import Shell from "@/layout/Shell";
import Modals from "@/layout/Modals";
import AppRoutes from "@/routes/AppRoutes";
import ErrorBoundary from "@/shared/components/ErrorBoundary";
import { QueryProvider } from "@/shared/query/QueryProvider";
import { useAppBootstrap } from "@/shared/store/useAppBootstrap";

function AppShell() {
  useAppBootstrap();
  return (
    <Shell>
      <AppRoutes />
      <Modals />
    </Shell>
  );
}

export default function App() {
  return (
    <ErrorBoundary level="root">
      <QueryProvider>
        <BrowserRouter>
          <AppShell />
        </BrowserRouter>
      </QueryProvider>
    </ErrorBoundary>
  );
}
