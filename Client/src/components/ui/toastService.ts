type ToastPayload = {
  id?: string;
  type?: "success" | "error" | "info";
  title?: string;
  description?: string;
  timeout?: number;
};

type Listener = (t: ToastPayload) => void;

const listeners: Listener[] = [];

export const toastService = {
  notify(payload: ToastPayload) {
    for (const l of listeners) l({ ...payload, id: String(Date.now() + Math.random()) });
  },
  subscribe(l: Listener) {
    listeners.push(l);
    return () => {
      const idx = listeners.indexOf(l);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};

export type { ToastPayload };
