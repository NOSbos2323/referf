import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { ErrorBoundary } from "./components/ui/error-boundary";
import PerformanceMonitor from "./components/ui/performance-monitor";

import { TempoDevtools } from "tempo-devtools";
TempoDevtools.init();

const basename = import.meta.env.BASE_URL;

// تحسين تسجيل Service Worker للعمل بدون إنترنت
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("✅ Service Worker مسجل بنجاح:", registration);

        // التحقق من التحديثات
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (
                newWorker.state === "installed" &&
                navigator.serviceWorker.controller
              ) {
                // إشعار المستخدم بوجود تحديث
                if (confirm("يتوفر تحديث جديد. هل تريد إعادة تحميل الصفحة؟")) {
                  window.location.reload();
                }
              }
            });
          }
        });

        // التحقق من التحديثات كل 30 دقيقة
        setInterval(
          () => {
            registration.update();
          },
          30 * 60 * 1000,
        );
      })
      .catch((registrationError) => {
        console.error("❌ فشل تسجيل Service Worker:", registrationError);
      });
  });
}

// تحسين إدارة حالة الشبكة
class NetworkStatusManager {
  private listeners: ((isOnline: boolean) => void)[] = [];
  private _isOnline = navigator.onLine;

  constructor() {
    window.addEventListener("online", () => {
      this._isOnline = true;
      this.notifyListeners();
      console.log("🟢 تم استعادة الاتصال بالإنترنت");
    });

    window.addEventListener("offline", () => {
      this._isOnline = false;
      this.notifyListeners();
      console.log("🔴 انقطع الاتصال بالإنترنت - التطبيق يعمل بوضع عدم الاتصال");
    });
  }

  get isOnline() {
    return this._isOnline;
  }

  subscribe(listener: (isOnline: boolean) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((listener) => listener(this._isOnline));
  }
}

const networkManager = new NetworkStatusManager();

// إنشاء Context محسن لحالة الشبكة
export const NetworkStatusContext = React.createContext({
  isOnline: networkManager.isOnline,
  subscribe: networkManager.subscribe.bind(networkManager),
});

// تحسين الأداء بتأخير الرندر
const renderApp = () => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <ErrorBoundary>
        <NetworkStatusContext.Provider
          value={{
            isOnline: networkManager.isOnline,
            subscribe: networkManager.subscribe.bind(networkManager),
          }}
        >
          <BrowserRouter basename={basename}>
            <App />
            <PerformanceMonitor />
          </BrowserRouter>
        </NetworkStatusContext.Provider>
      </ErrorBoundary>
    </React.StrictMode>,
  );
};

// تأخير الرندر قليلاً لتحسين الأداء
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", renderApp);
} else {
  // استخدام requestIdleCallback إذا كان متاحاً
  if ("requestIdleCallback" in window) {
    requestIdleCallback(renderApp);
  } else {
    setTimeout(renderApp, 0);
  }
}
