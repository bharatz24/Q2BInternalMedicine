import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import FlowLayout from "@/layout/FlowLayout";
import RouteFallback from "@/routes/RouteFallback";
import RouteErrorBoundary from "@/routes/RouteErrorBoundary";

// Every routed page is code-split. The marketing landing (`/`, rendered by
// FlowLayout → LandingView) is the only view in the initial bundle; a
// first-time visitor no longer downloads the Stripe bindings, the dashboard,
// the profile screen or the 9 wizard steps before the hero paints.
// `manualChunks` in vite.config.js peels the vendor stacks out on top of this.
const SignInPage = lazy(() => import("@/modules/Auth/pages/SignInPage"));
const RegistrationPage = lazy(() => import("@/modules/Auth/pages/RegistrationPage"));

const PracticeTypePage = lazy(() => import("@/modules/Quote/pages/PracticeTypePage"));
const SoftQuotePage = lazy(() => import("@/modules/Quote/pages/SoftQuotePage"));
const PracticeDetailsPage = lazy(() => import("@/modules/Quote/pages/PracticeDetailsPage"));
const PreviousInsuranceClaimsPage = lazy(
  () => import("@/modules/Quote/pages/PreviousInsuranceClaimsPage"),
);
const UnderwritingPage = lazy(() => import("@/modules/Quote/pages/UnderwritingPage"));
const ArticlesPage = lazy(() => import("@/modules/Quote/pages/ArticlesPage"));

const ReviewDocusignPage = lazy(() => import("@/modules/Payment/pages/ReviewDocusignPage"));
const PaymentPage = lazy(() => import("@/modules/Payment/pages/PaymentPage"));
const BinderInvoicePage = lazy(() => import("@/modules/Payment/pages/BinderInvoicePage"));
const CompleteOrderPage = lazy(() => import("@/modules/Payment/pages/CompleteOrderPage"));

const DashboardPage = lazy(() => import("@/modules/Dashboard/pages/DashboardPage"));
const OrderDetailsPage = lazy(() => import("@/modules/Dashboard/pages/OrderDetailsPage"));

const ProfilePage = lazy(() => import("@/modules/Profile/pages/ProfilePage"));

const UnderwriterReviewPage = lazy(
  () => import("@/modules/Underwriter/pages/UnderwriterReviewPage"),
);

export default function AppRoutes() {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/complete-order" element={<CompleteOrderPage />} />
          <Route path="/binder-invoice" element={<BinderInvoicePage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/order-details" element={<OrderDetailsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/articles" element={<ArticlesPage />} />
          <Route path="/underwriter-review" element={<UnderwriterReviewPage />} />
          <Route element={<FlowLayout />}>
            <Route path="/" element={<PracticeTypePage />} />
            <Route path="/quote" element={<SoftQuotePage />} />
            <Route path="/practice" element={<PracticeDetailsPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/previous-insurance" element={<PreviousInsuranceClaimsPage />} />
            <Route path="/underwriting" element={<UnderwritingPage />} />
            <Route path="/reviewDocusign" element={<ReviewDocusignPage />} />
            <Route path="/payment" element={<PaymentPage />} />
            <Route path="*" element={<PracticeTypePage />} />
          </Route>
        </Routes>
      </Suspense>
    </RouteErrorBoundary>
  );
}
