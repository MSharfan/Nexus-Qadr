import React from "react";
import { ArrowLeft, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

const UserManagementPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          {/* Back */}
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </button>

          <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-[#00B0FF]" />
              <h1 className="text-2xl">User Management</h1>
            </div>

            <div className="bg-yellow-100 dark:bg-yellow-900/30 p-4 rounded-xl">
              <p className="text-sm">
                Backend does not currently expose user management endpoints.
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                This page is intentionally disabled to prevent unsafe
                assumptions or unauthorized actions.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default UserManagementPage;
