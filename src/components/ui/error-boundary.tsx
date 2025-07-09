import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "./button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("خطأ في التطبيق:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-bluegray-900 to-bluegray-800 flex items-center justify-center p-4">
          <div className="bg-bluegray-800/50 backdrop-blur-xl border border-bluegray-600/50 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl">
            <div className="w-16 h-16 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-yellow-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-4">
              حدث خطأ غير متوقع
            </h2>

            <p className="text-gray-300 mb-6 text-sm">
              نعتذر عن هذا الخطأ. يمكنك المحاولة مرة أخرى أو إعادة تحميل الصفحة.
            </p>

            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleRetry}
                className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 text-white"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                المحاولة مرة أخرى
              </Button>

              <Button
                onClick={this.handleReload}
                variant="outline"
                className="border-bluegray-600 text-gray-300 hover:bg-bluegray-700"
              >
                إعادة تحميل الصفحة
              </Button>
            </div>

            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-300">
                  تفاصيل الخطأ (للمطورين)
                </summary>
                <pre className="mt-2 text-xs text-red-400 bg-bluegray-900/50 p-3 rounded overflow-auto max-h-32">
                  {this.state.error.stack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Hook version for functional components
export function useErrorHandler() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = () => setError(null);

  const handleError = React.useCallback((error: Error) => {
    console.error("خطأ في التطبيق:", error);
    setError(error);
  }, []);

  React.useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error("Promise rejection غير معالج:", event.reason);
      // Don't set error state for network-related promise rejections
      if (
        event.reason?.name !== "NetworkError" &&
        event.reason?.name !== "TypeError"
      ) {
        handleError(new Error(event.reason));
      }
    };

    const handleError = (event: ErrorEvent) => {
      console.error("خطأ JavaScript:", event.error);
      setError(event.error);
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    return () => {
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      window.removeEventListener("error", handleError);
    };
  }, []);

  return { error, resetError, handleError };
}
