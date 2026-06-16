import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ShoppingCart, User, Moon, Sun } from "lucide-react";
import { SearchBar } from "./SearchBar";
import { authApi } from "../../config/api";
import { decodeJwt } from "../../utils/jwt";
import { fetchCartItems } from "../../utils/cart";
import RoleSwitchModal from "./RoleSwitchModal";

type Role = "customer" | "seller" | "admin" | null;

export const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isDark, setIsDark] = React.useState(
    localStorage.getItem("darkMode") === "true",
  );
  const [cartCount, setCartCount] = React.useState(0);
  const [role, setRole] = React.useState<Role>(null);
  const [roles, setRoles] = React.useState<Role[]>([]);
  const [roleModalOpen, setRoleModalOpen] = React.useState(false);
  const [roleTarget, setRoleTarget] = React.useState<Role>(null);
  const [roleEmail, setRoleEmail] = React.useState("");
  const [rolePassword, setRolePassword] = React.useState("");
  const [roleError, setRoleError] = React.useState<string | null>(null);
  const [roleLoading, setRoleLoading] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  /* ---------------- THEME ---------------- */
  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
    localStorage.setItem("darkMode", String(isDark));
  }, [isDark]);

  /* ---------------- AUTH / ROLE (REACTIVE) ---------------- */
  React.useEffect(() => {
    // First try explicit stored role (server returns activeRole on login)
    const storedRole = localStorage.getItem("role");
    const storedRolesRaw = localStorage.getItem("roles");
    if (storedRolesRaw) {
      try {
        const parsed = JSON.parse(storedRolesRaw);
        if (Array.isArray(parsed)) {
          setRoles(parsed.filter((r) => r === "admin" || r === "seller" || r === "customer"));
        }
      } catch {
        setRoles([]);
      }
    }
    if (
      storedRole === "admin" ||
      storedRole === "seller" ||
      storedRole === "customer"
    ) {
      setRole(storedRole as Role);
      return;
    }

    // Fallback: try decoding role from JWT (older behavior)
    const token = localStorage.getItem("token");
    if (!token) {
      setRole(null);
      return;
    }

    const payload = decodeJwt(token);
    const roles: string[] = Array.isArray(payload?.roles)
      ? payload.roles
      : payload?.role
        ? [payload.role]
        : [];

    if (roles.includes("admin")) setRole("admin");
    else if (roles.includes("seller")) setRole("seller");
    else if (roles.includes("customer")) setRole("customer");
    else setRole(null);
  }, [location.pathname]); // 🔑 re-evaluate on navigation

  /* ---------------- CART COUNT (REACTIVE) ---------------- */
  React.useEffect(() => {
    if (role !== "customer") {
      setCartCount(0);
      return;
    }
    // defensive: if we don't have a token stored, avoid calling the protected /cart endpoint
    // this prevents a client-side 401 when role is set but token is missing or expired
    const token = localStorage.getItem("token");
    if (!token) {
      setCartCount(0);
      return;
    }

    const loadCart = async () => {
      try {
        const items = await fetchCartItems();

        const totalQty = items.reduce(
          (sum: number, item) => sum + (Number(item.quantity) || 1),
          0,
        );

        setCartCount(totalQty);
      } catch {
        setCartCount(0);
      }
    };

    loadCart();
    window.addEventListener("cart-updated", loadCart);

    return () => window.removeEventListener("cart-updated", loadCart);
  }, [role, location.pathname]); // 🔑 reload when cart may change

  /* ---------------- LOGOUT ---------------- */
  const handleLogout = () => {
    localStorage.clear();
    setRole(null);
    setRoles([]);
    setCartCount(0);
    navigate("/auth", { replace: true });
  };

  const switchRole = async (next: Role) => {
    if (!next) return;
    const token = localStorage.getItem("token");
    const payload = token ? decodeJwt(token) : null;
    const email = typeof payload?.email === "string" ? payload.email : "";
    setRoleTarget(next);
    setRoleEmail(email);
    setRolePassword("");
    setRoleError(null);
    setRoleModalOpen(true);
  };

  const confirmRoleSwitch = async () => {
    if (!roleTarget) return;
    setRoleLoading(true);
    setRoleError(null);

    const email = roleEmail || "";
    if (!email) {
      setRoleError("Unable to read email from session.");
      setRoleLoading(false);
      return;
    }

    if (!rolePassword) {
      setRoleError("Password is required.");
      setRoleLoading(false);
      return;
    }

    try {
      const res = await authApi.login({ email, password: rolePassword });
      const newRoles: string[] = Array.isArray(res?.user?.roles) ? res.user.roles : [];
      if (!newRoles.includes(roleTarget)) {
        setRoleError("You do not have access to this role.");
        setRoleLoading(false);
        return;
      }

      localStorage.setItem("token", res.token);
      localStorage.setItem("roles", JSON.stringify(newRoles));
      localStorage.setItem("role", roleTarget);
      setRoles(newRoles.filter((r) => r === "admin" || r === "seller" || r === "customer") as Role[]);
      setRole(roleTarget);
      setMenuOpen(false);
      setRoleModalOpen(false);

      if (roleTarget === "seller") navigate("/seller", { replace: true });
      else if (roleTarget === "admin") navigate("/admin", { replace: true });
      else navigate("/", { replace: true });
    } catch {
      setRoleError("Password invalid.");
    } finally {
      setRoleLoading(false);
    }
  };

  React.useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (menuRef.current.contains(e.target as Node)) return;
      setMenuOpen(false);
    };

    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <header className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-4">
          {/* Logo */}
          <div
            onClick={() => {
              if (role === "seller") navigate("/seller");
              else if (role === "admin") navigate("/admin");
              else navigate("/");
            }}
            className="cursor-pointer text-xl font-semibold bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] bg-clip-text text-transparent"
          >
            Nexus-Qadr
          </div>

          {/* Search */}
          <div className="hidden md:block flex-1 max-w-2xl">
            <SearchBar />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Dark mode */}
            <button
              onClick={() => setIsDark(!isDark)}
              className="p-2 rounded-lg hover:bg-secondary"
            >
              {isDark ? (
                <Sun className="w-5 h-5 text-[#00B0FF]" />
              ) : (
                <Moon className="w-5 h-5 text-gray-600" />
              )}
            </button>

            {/* Cart — GUEST + CUSTOMER */}
            {(role === null || role === "customer") && (
              <button
                onClick={() => navigate("/cart")}
                className="relative flex h-10 w-10 items-center justify-center rounded-full border border-transparent hover:bg-secondary overflow-visible"
                aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ""}`}
              >
                <ShoppingCart className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                {cartCount > 0 && (
                  <span
                    className="pointer-events-none absolute z-10 flex items-center justify-center rounded-full bg-[#00B0FF] font-semibold text-white shadow-sm ring-2 ring-white dark:ring-[#0A0A0A]"
                    style={{
                      top: -5,
                      right: -5,
                      minWidth: 18,
                      height: 18,
                      padding: cartCount > 9 ? "0 5px" : 0,
                      fontSize: 10,
                      lineHeight: "18px",
                    }}
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </span>
                )}
              </button>
            )}

            {/* Login — ONLY GUEST */}
            {!role && (
              <button
                onClick={() => navigate("/auth")}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white text-sm"
              >
                Sign In
              </button>
            )}

            {/* Profile — AUTH USERS (compact avatar + menu) */}
            {role && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen((s) => !s)}
                  aria-label="Open profile"
                  className="w-10 h-10 flex items-center justify-center rounded-full border border-border hover:bg-secondary"
                >
                  <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#1a1a1a] rounded-lg shadow-lg border border-border z-50">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        if (role === "customer") navigate("/orders");
                        else if (role === "seller") navigate("/seller");
                        else navigate("/admin");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-secondary"
                    >
                      {role === "customer" ? "Orders" : "Dashboard"}
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        if (role === "customer") navigate("/profile");
                        else if (role === "seller") navigate("/seller/settings");
                        else navigate("/admin");
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-secondary"
                    >
                      Settings
                    </button>
                    {roles.length > 1 && (
                      <>
                        <hr />
                        <div className="px-4 py-2 text-xs text-muted-foreground">Switch Role</div>
                        {roles.map((r) => (
                          <button
                            key={r ?? "role"}
                            onClick={() => switchRole(r)}
                            className={`w-full text-left px-4 py-2 hover:bg-secondary flex items-center gap-2 ${
                              r === role ? "bg-[#00B0FF]/10 text-[#00B0FF]" : ""
                            }`}
                            aria-pressed={r === role}
                          >
                            <span
                              className={`w-3 h-3 rounded-full border ${
                                r === role ? "border-[#00B0FF] bg-[#00B0FF]" : "border-muted-foreground"
                              }`}
                            />
                            <span>{r === "admin" ? "Admin" : r === "seller" ? "Seller" : "Customer"}</span>
                            {r === role && <span className="ml-auto text-xs">Active</span>}
                          </button>
                        ))}
                      </>
                    )}
                    <hr />
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full text-left px-4 py-3 bg-red hover:bg-secondary text-red-600"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden mt-4">
          <SearchBar />
        </div>
      </div>

      <RoleSwitchModal
        open={roleModalOpen}
        target={roleTarget}
        email={roleEmail}
        password={rolePassword}
        onPasswordChange={setRolePassword}
        onClose={() => setRoleModalOpen(false)}
        onConfirm={confirmRoleSwitch}
        loading={roleLoading}
        error={roleError}
      />
    </header>
  );
};
