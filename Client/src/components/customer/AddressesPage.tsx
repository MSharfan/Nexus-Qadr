import React from "react";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { addressApi } from "../../config/api";

const AddressesPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [addresses, setAddresses] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true);
      const res = await addressApi.getAll();
      setAddresses(Array.isArray(res) ? res : []);
    } catch (e) {
      console.error(e);
      setError("Failed to load addresses");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      await addressApi.remove(id);
      await load();
    } catch (e) {
      console.error(e);
      setError("Failed to delete");
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await addressApi.setDefault(id);
      await load();
    } catch (e) {
      console.error(e);
      setError("Failed to set default");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-2xl mb-4">Addresses</h1>

          {loading ? (
            <div>Loading…</div>
          ) : (
            <div className="space-y-4">
              {addresses.length === 0 && <div>No addresses yet</div>}
              {addresses.map((a) => (
                <div key={a.id} className="bg-white dark:bg-[#1a1a1a] p-4 rounded-lg border border-border flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{a.full_name} {a.is_default && <span className="text-sm text-green-500">(Default)</span>}</div>
                    <div className="text-sm text-muted-foreground">{a.line1} {a.line2 || ''}, {a.city} {a.postal_code}</div>
                    <div className="text-sm text-muted-foreground">{a.phone}</div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {!a.is_default && (
                      <button onClick={() => handleSetDefault(a.id)} className="px-3 py-1 border rounded text-sm">Set default</button>
                    )}
                    <button onClick={() => handleDelete(a.id)} className="px-3 py-1 border rounded text-sm text-red-500">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AddressesPage;
