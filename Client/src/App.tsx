import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";

/* ---------- PRE-AUTH ---------- */
import SplashScreen from "./components/preauth/SplashScreen";
import OnboardingScreen from "./components/preauth/OnboardingScreen";
import AuthPage from "./components/preauth/AuthPage";
import ForgotPassword from "./components/auth/ForgotPasswordPage";
import ResetPasswordPage from "./components/auth/ResetPasswordPage";

/* ---------- PUBLIC CUSTOMER ---------- */
import HomePage from "./components/customer/HomePage";
import ProductDetailsPage from "./components/customer/ProductDetailsPage";
import SearchResultsPage from "./components/customer/SearchResultsPage";

/* ---------- PROTECTED CUSTOMER ---------- */
import CartPage from "./components/customer/CartPage";
import CheckoutPage from "./components/customer/CheckoutPage";
import OrdersPage from "./components/customer/OrdersPage";
import OrderDetailsPage from "./components/customer/OrderDetailsPage";
import WishlistPage from "./components/customer/WishlistPage";
import ProfilePage from "./components/customer/ProfilePage";

/* ---------- SELLER ---------- */
import SellerDashboard from "./components/seller/SellerDashboard";
import SellerProductsPage from "./components/seller/SellerProductsPage";
import AddProductPage from "./components/seller/AddProductForm";
import SellerOrdersPage from "./components/seller/OrdersPage";
import SellerSettingsPage from "./components/seller/SellerSettingsPage";
import EarningsPage from "./components/seller/EarningsPage";

/* ---------- ADMIN ---------- */
import AdminDashboard from "./components/admin/AdminDashboard";
import BannerEditor from "./components/admin/BannerEditor";
import AdminRegister from "./components/admin/AdminRegister";
import AdminProductsPage from "./components/admin/AdminProductsPage";
import AdminUsers from "./components/admin/AdminUsers";
import AdminOrdersPage from "./components/admin/AdminOrdersPage";
import SellerList from "./components/admin/SellerList";
import AdminSellerProducts from "./components/admin/AdminSellerProducts";

/* Customer profile subpages */
import EditProfilePage from "./components/customer/EditProfilePage";
import AddressesPage from "./components/customer/AddressesPage";
import SettingsPage from "./components/customer/SettingsPage";

/* ---------- SHARED ---------- */
import UnauthorizedPage from "./components/shared/UnauthorizedPage";

/* ---------- ROUTE GUARDS ---------- */
import RequireAuth from "./routes/RequireAuth";
import CustomerOnly from "./routes/CustomerOnly";
import SellerOnly from "./routes/SellerOnly";
import AdminOnly from "./routes/AdminOnly";

export default function App() {
  const [booting, setBooting] = React.useState(true);


  React.useEffect(() => {
    const t = setTimeout(() => setBooting(false), 2000);
    return () => clearTimeout(t);
  }, []);

  if (booting) return <SplashScreen />;

  return (
    <>
      <Routes>
        {/* ---------- PUBLIC ---------- */}
        <Route path="/" element={<HomePage />} />
  <Route path="/admin/register" element={<AdminRegister />} />
  <Route path="/product/:id" element={<ProductDetailsPage />} />
  <Route path="/search" element={<SearchResultsPage />} />

        <Route path="/onboarding" element={<OnboardingScreen />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password/:token" element={<ResetPasswordPage />} />

        {/* ---------- AUTH REQUIRED ---------- */}
        <Route element={<RequireAuth />}>
          {/* CUSTOMER */}
          <Route element={<CustomerOnly />}>
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/orders" element={<OrdersPage />} />
            <Route path="/orders/:id" element={<OrderDetailsPage />} />
            <Route path="/wishlist" element={<WishlistPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/profile/edit" element={<EditProfilePage />} />
            <Route path="/profile/addresses" element={<AddressesPage />} />
            <Route path="/profile/settings" element={<SettingsPage />} />
          </Route>

          {/* SELLER */}
          <Route element={<SellerOnly />}>
            <Route path="/seller" element={<SellerDashboard />} />
            <Route path="/seller/earnings" element={<EarningsPage />} />
            <Route path="/seller/products" element={<SellerProductsPage />} />
            <Route path="/seller/orders" element={<SellerOrdersPage />} />
            <Route path="/seller/products/add" element={<AddProductPage />} />
            <Route path="/seller/products/edit/:id" element={<AddProductPage />} />
            <Route path="/seller/settings" element={<SellerSettingsPage />} />
          </Route>

          {/* ADMIN */}
          <Route element={<AdminOnly />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<AdminUsers />} />
            <Route path="/admin/products" element={<AdminProductsPage />} />
            <Route path="/admin/sellers" element={<SellerList />} />
            <Route path="/admin/sellers/:sellerId/products" element={<AdminSellerProducts />} />
            <Route path="/admin/orders" element={<AdminOrdersPage />} />
            <Route path="/admin/banner" element={<BannerEditor />} />
          </Route>

          <Route path="/unauthorized" element={<UnauthorizedPage />} />
        </Route>

        {/* ---------- FALLBACK ---------- */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
        
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "#ffffffff", // 🔵 blue
            color: "#000000ff",
            border: "2px solid #0026ffff",
          },
          className: "sonner-toast",
        }}
      />
    </>
  );
}
