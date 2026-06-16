import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Facebook,
  Twitter,
  Instagram,
  Youtube,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
// @ts-ignore: Treat image import as any to avoid missing module type declaration
import splashLogo from "../../assets/images/Title-logo.png";

export const Footer: React.FC = () => {
  const navigate = useNavigate();

  const go = (path: string) => () => navigate(path);

  return (
    <footer className="bg-[#0D47A1] dark:bg-[#0A0A0A] text-white border-t border-[#00B0FF]/20">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00B0FF] to-white flex items-center justify-center shadow-lg">
                  <img 
                  src={splashLogo} 
                  />
                </div>
                <div className="absolute inset-0 w-10 h-10 rounded-full bg-[#00B0FF] opacity-30 blur-lg" />
              </div>
              <span className="text-xl">Nexus-Qadr</span>
            </div>

            <p className="text-[#00B0FF] mb-4">Shop the Future</p>
            <p className="text-sm text-white/80">
              Your one-stop destination for modern shopping experiences.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <button onClick={go("/home")} className="hover:text-[#00B0FF]">
                  Home
                </button>
              </li>
              <li>
                <button onClick={go("/profile")} className="hover:text-[#00B0FF]">
                  Account
                </button>
              </li>
              <li>
                <button onClick={go("/wishlist")} className="hover:text-[#00B0FF]">
                  Wishlist
                </button>
              </li>
              <li>
                <button onClick={go("/orders")} className="hover:text-[#00B0FF]">
                  Orders
                </button>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="mb-4">Customer Service</h4>
            <ul className="space-y-2 text-sm text-white/80">
              <li>
                <button onClick={go("/orders")} className="hover:text-[#00B0FF]">
                  Track Order
                </button>
              </li>
              <li>
                <button onClick={go("/return")} className="hover:text-[#00B0FF]">
                  Returns (coming soon)
                </button>
              </li>
              <li>
                <span className="opacity-70 cursor-not-allowed">
                  Privacy Policy
                </span>
              </li>
              <li>
                <span className="opacity-70 cursor-not-allowed">
                  Terms & Conditions
                </span>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm text-white/80">
              <li className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-[#00B0FF]" />
                <span>support@nexusqadr.com</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-[#00B0FF]" />
                <span>+91 8722868308</span>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#00B0FF]" />
                <span>Mulki Mangalore 574154 (TBD)</span>
              </li>
            </ul>

            {/* Social */}
            <div className="flex items-center gap-3 mt-4">
              {[Facebook, Twitter, Instagram, Youtube].map(
                (Icon, i) => (
                  <span
                    key={i}
                    className="p-2 bg-white/10 rounded-lg opacity-60 cursor-not-allowed"
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                )
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 mt-8 pt-8 text-center text-sm text-white/60">
          © {new Date().getFullYear()} Nexus Qadr. All rights reserved.
        </div>
      </div>
    </footer>
  );
};
