import React from "react";
import { toastService } from "./toastService";

type Toast = {
  id: string;
  type?: "success" | "error" | "info";
  title?: string;
  description?: string;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    const unsub = toastService.subscribe((t) => {
      const id = t.id ?? String(Date.now() + Math.random());
      const timeout = t.timeout ?? 4000;
      setToasts((s) => [{ id, type: t.type, title: t.title, description: t.description }, ...s]);
      setTimeout(() => {
        setToasts((s) => s.filter((x) => x.id !== id));
      }, timeout);
    });

    return unsub;
  }, []);

  return (
    <>
      {children}
      <div style={{ position: "fixed", right: 16, top: 16, zIndex: 9999 }}>
        <div className="flex flex-col gap-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`max-w-sm w-full p-3 rounded-lg shadow-lg text-white ${
                t.type === "success" ? "bg-green-600" : t.type === "error" ? "bg-red-600" : "bg-gray-800"
              }`}
            >
              {t.title && <div className="font-semibold">{t.title}</div>}
              {t.description && <div className="text-sm mt-1">{t.description}</div>}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export const useToast = () => {
  return React.useCallback((p: { type?: "success" | "error" | "info"; title?: string; description?: string; timeout?: number }) => {
    toastService.notify(p);
  }, []);
};

export default ToastProvider;
