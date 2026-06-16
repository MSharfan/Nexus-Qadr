import React from "react";

type Role = "customer" | "seller" | "admin" | null;

type Props = {
  open: boolean;
  target: Role;
  email: string;
  password: string;
  onPasswordChange: (v: string) => void;
  onClose: () => void;
  onConfirm: () => void;
  loading?: boolean;
  error?: string | null;
};

const RoleSwitchModal: React.FC<Props> = ({
  open,
  target,
  email,
  password,
  onPasswordChange,
  onClose,
  onConfirm,
  loading = false,
  error = null,
}) => {
  const [pos, setPos] = React.useState<{ x: number; y: number } | null>(null);
  const [showPassword, setShowPassword] = React.useState(false);
  const dragRef = React.useRef<{
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    dragging: boolean;
  } | null>(null);

  const panelRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    // Reset position when modal opens
    if (open) setPos({ x: 0, y: 0 });
  }, [open]);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const origin = pos ?? { x: 0, y: 0 };
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      originX: origin.x,
      originY: origin.y,
      dragging: true,
    };

    const onMove = (ev: MouseEvent) => {
      if (!dragRef.current?.dragging) return;
      const dx = ev.clientX - dragRef.current.startX;
      const dy = ev.clientY - dragRef.current.startY;
      const nextX = dragRef.current.originX + dx;
      const nextY = dragRef.current.originY + dy;

      const panel = panelRef.current;
      if (!panel) {
        setPos({ x: nextX, y: nextY });
        return;
      }

      const rect = panel.getBoundingClientRect();
      const halfW = rect.width / 2;
      const halfH = rect.height / 2;
      const maxX = window.innerWidth / 2 - halfW;
      const maxY = window.innerHeight / 2 - halfH;
      const clampedX = Math.max(-maxX, Math.min(maxX, nextX));
      const clampedY = Math.max(-maxY, Math.min(maxY, nextY));
      setPos({ x: clampedX, y: clampedY });
    };

    const onUp = () => {
      if (dragRef.current) dragRef.current.dragging = false;
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const targetLabel =
    target === "admin" ? "Admin" : target === "seller" ? "Seller" : "Customer";

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/40">
      <div
        ref={panelRef}
        className="fixed w-full max-w-md bg-white dark:bg-[#1a1a1a] rounded-xl border border-border p-6"
        style={{
          left: "50%",
          top: "50%",
          transform: `translate(-50%, -50%) translate(${pos?.x ?? 0}px, ${pos?.y ?? 0}px) translateY(150px)`,
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm();
          }}
        >
          <div
            className="text-lg font-semibold mb-2 cursor-move select-none"
            onMouseDown={onMouseDown}
          >
            Switch Role
          </div>
          <div className="text-sm text-muted-foreground mb-4">
            Enter your password to switch to {targetLabel}.
          </div>

          <label className="block text-sm mb-2">Email</label>
          <input
            type="email"
            value={email}
            readOnly
            className="w-full px-3 py-2 rounded-lg border border-border bg-secondary text-muted-foreground mb-4"
            autoComplete="email"
          />

          <label className="block text-sm mb-2">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-border bg-secondary pr-10"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>

          {error && <div className="text-sm text-red-500 mt-2">{error}</div>}

          <div className="mt-4 flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-border"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white"
              disabled={loading}
            >
              {loading ? "Switching..." : "Confirm"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleSwitchModal;
