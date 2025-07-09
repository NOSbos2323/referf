import React, { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { useRoutes } from "react-router-dom";
import routes from "tempo-routes";
import { NetworkIndicator } from "./components/ui/network-indicator";
import { useOfflineSync } from "./hooks/useOfflineSync";

// تحميل المكونات بشكل تدريجي لتحسين الأداء
const Home = lazy(() => import("./components/home"));
const LoginPage = lazy(() => import("./components/auth/LoginPage"));
const PaymentsPage = lazy(() => import("./components/payments/PaymentsPage"));

// مكون التحميل
const LoadingSpinner = () => (
  <div className="min-h-screen bg-gradient-to-br from-bluegray-900 to-bluegray-800 flex items-center justify-center">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-white text-lg font-semibold">جاري التحميل...</p>
      <p className="text-gray-400 text-sm mt-2">Yacin Gym</p>
    </div>
  </div>
);

// مكون خطأ التحميل
const ErrorFallback = ({
  error,
  resetError,
}: {
  error: Error;
  resetError: () => void;
}) => (
  <div className="min-h-screen bg-gradient-to-br from-bluegray-900 to-bluegray-800 flex items-center justify-center p-4">
    <div className="bg-bluegray-800/50 backdrop-blur-xl border border-bluegray-600/50 rounded-2xl p-8 max-w-md w-full text-center">
      <div className="w-16 h-16 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
        <span className="text-red-400 text-2xl">⚠️</span>
      </div>
      <h2 className="text-xl font-bold text-white mb-4">خطأ في التحميل</h2>
      <p className="text-gray-300 mb-6 text-sm">{error.message}</p>
      <button
        onClick={resetError}
        className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300"
      >
        إعادة المحاولة
      </button>
    </div>
  </div>
);

function App() {
  const { syncStatus } = useOfflineSync();

  return (
    <div className="min-h-screen bg-background">
      {/* For the tempo routes */}
      {import.meta.env.VITE_TEMPO && useRoutes(routes)}

      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/home" element={<Home />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/payments" element={<PaymentsPage />} />

          {/* Add this before the catchall route */}
          {import.meta.env.VITE_TEMPO && <Route path="/tempobook/*" />}

          {/* Redirect root to login */}
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<LoginPage />} />
        </Routes>
      </Suspense>

      {/* Network status indicator */}
      <NetworkIndicator />

      {/* مؤشر حالة المزامنة */}
      {!syncStatus.isOnline && (
        <div className="fixed bottom-4 left-4 bg-yellow-500/90 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg border border-yellow-400/50 z-50">
          🔄 وضع عدم الاتصال
          {syncStatus.pendingChanges > 0 && (
            <span className="ml-2 bg-white/20 px-2 py-1 rounded text-xs">
              {syncStatus.pendingChanges} تغيير معلق
            </span>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
