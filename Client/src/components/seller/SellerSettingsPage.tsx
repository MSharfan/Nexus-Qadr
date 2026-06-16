import React from "react";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { sellerApi } from "../../config/api";
import {
  Select as RadixSelect,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "../ui/select";
import { Input } from "../ui/input";

const initialDocsState = {
  gstin: null,
  pan: null,
  bank_account: null,
  cancelled_cheque: null,
  email: null,
  phone: null,
  business_type: "sole_proprietorship",
  additional: {},
  shiprocket_pickup_location: "Primary",
  pickup_address: {
    full_name: "",
    phone: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postal_code: "",
    country: "",
  },
  product_listed: false,
};

const normalizePickupAddress = (value: any) => {
  if (value && typeof value === "object") {
    return { ...initialDocsState.pickup_address, ...value };
  }

  return {
    ...initialDocsState.pickup_address,
    line1: typeof value === "string" ? value : "",
  };
};

const SellerSettingsPage: React.FC = () => {
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [docs, setDocs] = React.useState<any>(initialDocsState);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const res = await sellerApi.getDocuments();
        if (!mounted) return;
        if (res && res.documents) {
          setDocs((d: any) => ({
            ...d,
            ...res.documents,
            pickup_address: normalizePickupAddress(res.documents.pickup_address),
          }));
        }
      } catch (e) {
        // no-op if endpoint not configured
        console.warn(e);
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const handleFile = async (file: File | null, key: string) => {
    if (!file) {
      setDocs((s: any) => ({ ...s, [key]: null }));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setDocs((s: any) => ({ ...s, [key]: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  const handleBusinessSpecificChange = (k: string, v: any) => {
    setDocs((s: any) => ({ ...s, additional: { ...(s.additional || {}), [k]: v } }));
  };

  const handlePickupChange = (k: string, v: string) => {
    setDocs((s: any) => ({
      ...s,
      pickup_address: {
        ...normalizePickupAddress(s.pickup_address),
        [k]: v,
      },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await sellerApi.saveDocuments(docs);
      try {
        const { toast } = await import("sonner");
        toast.success("Seller documents saved. Admin approval within 24 hrs.");
      } catch {}
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl mb-2">Seller Settings</h1>
          <p className="text-muted-foreground">
            Provide the required documents below. Nexus Qadr allows you to start selling once Admin approves — it takes up to 24 hrs.
          </p>

          <div className="mt-6 bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border space-y-6">
            {loading ? (
              <div>Loading…</div>
            ) : (
              <>
                <section>
                  <h2 className="text-xl mb-2">Essential Documents for All Sellers</h2>
                  <p className="text-sm text-muted-foreground mb-4">Upload or paste URLs for each document. Files will be stored as data URLs for demo purposes. Clear, high-contrast images help speed up verification.</p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0b0b0b] rounded-lg p-4 border border-border">
                      <FileField label="GSTIN (if applicable)" value={docs.gstin} onFile={(f: File | null) => handleFile(f, 'gstin')} helperText="Optional: enter GSTIN or upload certificate" />
                    </div>

                    <div className="bg-[#0b0b0b] rounded-lg p-4 border border-border">
                      <FileField label="PAN Card" value={docs.pan} onFile={(f: File | null) => handleFile(f, 'pan')} helperText="Upload clear PAN card image (required)" />
                    </div>

                    <div className="bg-[#0b0b0b] rounded-lg p-4 border border-border">
                      <FileField label="Bank Account Details (image/pdf)" value={docs.bank_account} onFile={(f: File | null) => handleFile(f, 'bank_account')} helperText="Image or PDF of bank statement or cancelled cheque" />
                    </div>

                    <div className="bg-[#0b0b0b] rounded-lg p-4 border border-border">
                      <FileField label="Cancelled Cheque" value={docs.cancelled_cheque} onFile={(f: File | null) => handleFile(f, 'cancelled_cheque')} helperText="Optional - helps speed up payouts" />
                    </div>

                    <div className="bg-[#0b0b0b] rounded-lg p-4 border border-border">
                      <TextField label="Contact Email" value={docs.email} onChange={(v: string) => setDocs((s:any)=>({...s,email:v}))} />
                    </div>

                    <div className="bg-[#0b0b0b] rounded-lg p-4 border border-border">
                      <TextField label="Contact Phone" value={docs.phone} onChange={(v: string) => setDocs((s:any)=>({...s,phone:v}))} />
                    </div>
                  </div>
                </section>

                <section>
                  <h2 className="text-xl mb-2">Business Type Specific Documentation</h2>
                  <p className="text-sm text-muted-foreground mb-4">Select your business type to see required documents.</p>

                  <div className="flex items-center gap-4 mb-4">
                    <RadixSelect value={docs.business_type} onValueChange={(v: string) => setDocs((s: any) => ({ ...s, business_type: v }))}>
                      <SelectTrigger size="default">
                        <SelectValue />
                      </SelectTrigger>

                      <SelectContent>
                        <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                        <SelectItem value="private_limited">Private Limited Company</SelectItem>
                        <SelectItem value="partnership">Partnership Firm / LLP</SelectItem>
                      </SelectContent>
                    </RadixSelect>
                  </div>

                  {docs.business_type === 'sole_proprietorship' && (
                    <div className="space-y-3">
                      <FileField label="Proof of Identity (Passport/Voter/Driving/PAN)" value={docs.additional?.id_proof} onFile={(f: File | null)=>handleBusinessSpecificChange('id_proof', f ? URL.createObjectURL(f) : null)} />
                      <FileField label="Proof of Address (Utility bill / bank statement)" value={docs.additional?.address_proof} onFile={(f: File | null)=>handleBusinessSpecificChange('address_proof', f ? URL.createObjectURL(f) : null)} />
                    </div>
                  )}

                  {docs.business_type === 'private_limited' && (
                    <div className="space-y-3">
                      <FileField label="Company PAN Card" value={docs.additional?.company_pan} onFile={(f: File | null)=>handleBusinessSpecificChange('company_pan', f ? URL.createObjectURL(f) : null)} />
                      <FileField label="Incorporation Certificate" value={docs.additional?.incorporation_cert} onFile={(f: File | null)=>handleBusinessSpecificChange('incorporation_cert', f ? URL.createObjectURL(f) : null)} />
                      <FileField label="Memorandum of Association (MOA)" value={docs.additional?.moa} onFile={(f: File | null)=>handleBusinessSpecificChange('moa', f ? URL.createObjectURL(f) : null)} />
                    </div>
                  )}

                  {docs.business_type === 'partnership' && (
                    <div className="space-y-3">
                      <FileField label="Partnership/LLP Certificate" value={docs.additional?.partnership_cert} onFile={(f: File | null)=>handleBusinessSpecificChange('partnership_cert', f ? URL.createObjectURL(f) : null)} />
                      <FileField label="Partnership Deed" value={docs.additional?.partnership_deed} onFile={(f: File | null)=>handleBusinessSpecificChange('partnership_deed', f ? URL.createObjectURL(f) : null)} />
                      <FileField label="Firm PAN Card" value={docs.additional?.firm_pan} onFile={(f: File | null)=>handleBusinessSpecificChange('firm_pan', f ? URL.createObjectURL(f) : null)} />
                    </div>
                  )}
                </section>

                <section>
                  <h2 className="text-xl mb-2">Other Requirements</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block mb-2 text-sm">Carrier Pickup Location Name</label>
                      <input
                        value={docs.shiprocket_pickup_location || ""}
                        onChange={(e)=>setDocs((s:any)=>({...s,shiprocket_pickup_location:e.target.value}))}
                        className="w-full p-2 border rounded bg-transparent"
                        placeholder="For Shiprocket India, this must match the pickup location"
                      />
                    </div>

                    <div>
                      <label className="block mb-2 text-sm">Product Listings</label>
                      <div className="flex items-center gap-3">
                        <input type="checkbox" checked={!!docs.product_listed} onChange={(e)=>setDocs((s:any)=>({...s,product_listed:e.target.checked}))} />
                        <div className="text-sm text-muted-foreground">I have at least one product listed</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border border-border p-4">
                    <h3 className="text-lg mb-3">Pickup Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <PickupField label="Contact Name" value={docs.pickup_address?.full_name} onChange={(v: string) => handlePickupChange("full_name", v)} />
                      <PickupField label="Phone" value={docs.pickup_address?.phone} onChange={(v: string) => handlePickupChange("phone", v)} />
                      <PickupField label="Address Line 1" value={docs.pickup_address?.line1} onChange={(v: string) => handlePickupChange("line1", v)} className="md:col-span-2" />
                      <PickupField label="Address Line 2" value={docs.pickup_address?.line2} onChange={(v: string) => handlePickupChange("line2", v)} className="md:col-span-2" />
                      <PickupField label="City" value={docs.pickup_address?.city} onChange={(v: string) => handlePickupChange("city", v)} />
                      <PickupField label="State / Province / Region" value={docs.pickup_address?.state} onChange={(v: string) => handlePickupChange("state", v)} />
                      <PickupField label="Postal / ZIP Code" value={docs.pickup_address?.postal_code} onChange={(v: string) => handlePickupChange("postal_code", v)} />
                      <PickupField label="Country" value={docs.pickup_address?.country} onChange={(v: string) => handlePickupChange("country", v)} />
                    </div>
                  </div>
                </section>

                <div className="flex items-center gap-3">
                  <button onClick={handleSave} disabled={saving} className="px-4 py-2 bg-[#00B0FF] text-white rounded">{saving ? 'Saving…' : 'Save & Submit for Approval'}</button>
                  <div className="text-sm text-muted-foreground">Ensure the name on PAN matches the GST certificate. For books-only sellers, GST may not be required.</div>
                </div>

                {error && <div className="text-red-500">{error}</div>}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const FileField = ({ label, value, onFile, helperText }: any) => {
  const [preview, setPreview] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (!value) return setPreview(null);
    if (typeof value === 'string' && value.startsWith('data:')) setPreview(value);
    else if (typeof value === 'string') setPreview(value);
  }, [value]);

  return (
    <div className="flex gap-4 items-start">
      <div className="flex-1">
        <label className="block mb-2 text-sm font-medium">{label}</label>
        {helperText && <div className="text-xs text-muted-foreground mb-2">{helperText}</div>}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="px-3 py-2 bg-[#0D47A1] text-white rounded shadow-sm"
          >
            Choose file
          </button>
          <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />

          {preview ? (
            <div className="text-sm text-muted-foreground">{preview.startsWith('data:') ? 'Image uploaded' : <a href={preview} target="_blank" rel="noreferrer" className="text-[#00B0FF]">View file</a>}</div>
          ) : (
            <div className="text-sm text-muted-foreground">No file chosen</div>
          )}
        </div>
      </div>

      <div className="w-36 h-24 flex-shrink-0 rounded overflow-hidden bg-gray-900 border border-border flex items-center justify-center">
        {preview ? (
          preview.startsWith('data:') ? (
            <img src={preview} alt="preview" className="w-full h-full object-cover" />
          ) : (
            <a href={preview} target="_blank" rel="noreferrer" className="text-sm text-[#00B0FF]">Open</a>
          )
        ) : (
          <div className="text-xs text-muted-foreground text-center px-2">Preview will appear here</div>
        )}
      </div>
    </div>
  );
};

const TextField = ({ label, value, onChange }: any) => (
  <div>
    <label className="block mb-2 text-sm">{label}</label>
    <Input value={value || ""} onChange={(e) => onChange(e.target.value)} />
  </div>
);

const PickupField = ({ label, value, onChange, className = "" }: any) => (
  <div className={className}>
    <label className="block mb-2 text-sm">{label}</label>
    <input
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border rounded bg-transparent"
    />
  </div>
);

const SelectBusinessType = ({ value, onChange }: any) => (
  <select value={value} onChange={(e)=>onChange(e.target.value)} className="p-2 border rounded bg-transparent">
    <option value="sole_proprietorship">Sole Proprietorship</option>
    <option value="private_limited">Private Limited Company</option>
    <option value="partnership">Partnership Firm / LLP</option>
  </select>
);

export default SellerSettingsPage;
