import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, Zap, Wifi, WifiOff } from "lucide-react";

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  memoryUsage: number;
  isOnline: boolean;
  connectionType: string;
}

export const PerformanceMonitor = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    memoryUsage: 0,
    isOnline: navigator.onLine,
    connectionType: "unknown",
  });
  const [showMonitor, setShowMonitor] = useState(false);

  useEffect(() => {
    // قياس وقت التحميل
    const measureLoadTime = () => {
      if (performance.timing) {
        const loadTime =
          performance.timing.loadEventEnd - performance.timing.navigationStart;
        setMetrics((prev) => ({ ...prev, loadTime }));
      }
    };

    // قياس استخدام الذاكرة
    const measureMemoryUsage = () => {
      if ("memory" in performance) {
        const memory = (performance as any).memory;
        const memoryUsage = Math.round(
          (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
        );
        setMetrics((prev) => ({ ...prev, memoryUsage }));
      }
    };

    // قياس نوع الاتصال
    const measureConnection = () => {
      if ("connection" in navigator) {
        const connection = (navigator as any).connection;
        setMetrics((prev) => ({
          ...prev,
          connectionType: connection.effectiveType || "unknown",
        }));
      }
    };

    // قياس وقت الرندر
    const startTime = performance.now();
    requestAnimationFrame(() => {
      const renderTime = performance.now() - startTime;
      setMetrics((prev) => ({ ...prev, renderTime }));
    });

    measureLoadTime();
    measureMemoryUsage();
    measureConnection();

    // تحديث المقاييس كل 5 ثوان
    const interval = setInterval(() => {
      measureMemoryUsage();
      measureConnection();
    }, 5000);

    // مراقبة حالة الاتصال
    const handleOnline = () =>
      setMetrics((prev) => ({ ...prev, isOnline: true }));
    const handleOffline = () =>
      setMetrics((prev) => ({ ...prev, isOnline: false }));

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // إظهار المراقب في وضع التطوير أو عند الضغط على مفاتيح معينة
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "P") {
        setShowMonitor((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, []);

  const getPerformanceColor = (value: number, type: "time" | "memory") => {
    if (type === "time") {
      if (value < 1000) return "text-green-400";
      if (value < 3000) return "text-yellow-400";
      return "text-red-400";
    } else {
      if (value < 50) return "text-green-400";
      if (value < 80) return "text-yellow-400";
      return "text-red-400";
    }
  };

  const getConnectionIcon = () => {
    return metrics.isOnline ? (
      <Wifi className="h-4 w-4 text-green-400" />
    ) : (
      <WifiOff className="h-4 w-4 text-red-400" />
    );
  };

  if (process.env.NODE_ENV === "production" && !showMonitor) {
    return null;
  }

  return (
    <AnimatePresence>
      {(process.env.NODE_ENV === "development" || showMonitor) && <></>}
    </AnimatePresence>
  );
};

export default PerformanceMonitor;
