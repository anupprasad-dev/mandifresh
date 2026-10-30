import { Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Footer from "./components/Footer";
import { RequireAdmin, RequireCustomer, RequireSeller } from "./components/Guards";
import Header from "./components/Header";
import Account from "./pages/Account";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import ForgotPassword from "./pages/ForgotPassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Orders from "./pages/Orders";
import ProductDetail from "./pages/ProductDetail";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import Shop from "./pages/Shop";
import { SellerLogin, SellerRegister } from "./pages/seller/SellerAuth";
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerLayout from "./pages/seller/SellerLayout";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerProductForm from "./pages/seller/SellerProductForm";
import SellerProducts from "./pages/seller/SellerProducts";
import AdminCategories from "./pages/admin/AdminCategories";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLayout from "./pages/admin/AdminLayout";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminUsers from "./pages/admin/AdminUsers";

function ScrollTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function Storefront({ children }) {
  return (
    <>
      <Header />
      <main className="main">{children}</main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <>
      <ScrollTop />
      <Routes>
        {/* Seller portal: reachable only by typing /seller/login - never linked from the storefront. */}
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/register" element={<SellerRegister />} />
        <Route path="/seller/forgot-password" element={<ForgotPassword seller />} />
        <Route path="/seller/reset-password" element={<ResetPassword seller />} />
        <Route path="/seller" element={<RequireSeller><SellerLayout /></RequireSeller>}>
          <Route index element={<SellerDashboard />} />
          <Route path="products" element={<SellerProducts />} />
          <Route path="products/new" element={<SellerProductForm />} />
          <Route path="products/:id" element={<SellerProductForm />} />
          <Route path="orders" element={<SellerOrders />} />
        </Route>

        {/* Admin portal: URL-only access, never linked from the storefront. Accounts are created with `manage.py create_admin`. */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
          <Route index element={<AdminDashboard />} />
          <Route path="orders" element={<AdminOrders />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="sellers" element={<AdminUsers role="seller" />} />
          <Route path="customers" element={<AdminUsers role="customer" />} />
        </Route>

        {/* Customer storefront */}
        <Route path="/" element={<Storefront><Home /></Storefront>} />
        <Route path="/shop" element={<Storefront><Shop /></Storefront>} />
        <Route path="/product/:slug" element={<Storefront><ProductDetail /></Storefront>} />
        <Route path="/cart" element={<Storefront><Cart /></Storefront>} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/checkout" element={<Storefront><RequireCustomer><Checkout /></RequireCustomer></Storefront>} />
        <Route path="/orders" element={<Storefront><RequireCustomer><Orders /></RequireCustomer></Storefront>} />
        <Route path="/account" element={<Storefront><RequireCustomer><Account /></RequireCustomer></Storefront>} />
        <Route path="*" element={<Storefront><NotFound /></Storefront>} />
      </Routes>
    </>
  );
}
