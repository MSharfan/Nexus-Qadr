import React from "react";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";

const SettingsPage: React.FC = () => {
  const [dark, setDark] = React.useState(localStorage.getItem('darkMode') === 'true');

  React.useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('darkMode', String(dark));
  }, [dark]);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl mb-4">Settings</h1>

          <div className="bg-white dark:bg-[#1a1a1a] p-6 rounded-xl border border-border max-w-lg">
            <label className="flex items-center gap-3">
              <input type="checkbox" checked={dark} onChange={() => setDark(d => !d)} />
              <span>Enable dark mode</span>
            </label>

            <p className="text-sm text-muted-foreground mt-4">Change password and other account settings are managed elsewhere.</p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default SettingsPage;
