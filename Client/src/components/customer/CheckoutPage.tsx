import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, Smartphone, Check } from "lucide-react";
import { Banknote } from "lucide-react";
import { Header } from "../shared/Header";
import { Footer } from "../shared/Footer";
import { addressApi, orderApi, shippingApi } from "../../config/api";
import { useCart } from "../../hooks/useCart";
import { toastError, toastSuccess } from "../../utils/toast";
import { COUNTRY_OPTIONS, findCountry, flagEmoji } from "../../utils/countries";

type CheckoutAddress = {
  name: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

type SavedAddress = {
  id: string;
  label?: string | null;
  full_name?: string;
  phone?: string;
  line1?: string;
  line2?: string | null;
  city?: string;
  state?: string | null;
  postal_code?: string;
  country?: string;
  is_default?: boolean;
};

const REGION_SUGGESTIONS: Record<string, { states: string[]; cities: string[] }> = {
  India: {
    states: [
      "Andhra Pradesh",
      "Delhi",
      "Gujarat",
      "Karnataka",
      "Kerala",
      "Maharashtra",
      "Tamil Nadu",
      "Telangana",
      "Uttar Pradesh",
      "West Bengal",
    ],
    cities: [
      "Ahmedabad",
      "Bengaluru",
      "Chennai",
      "Delhi",
      "Hyderabad",
      "Kolkata",
      "Mumbai",
      "Pune",
    ],
  },
  "United States": {
    states: [
      "California",
      "Florida",
      "Illinois",
      "New York",
      "Pennsylvania",
      "Texas",
      "Washington",
    ],
    cities: [
      "Chicago",
      "Houston",
      "Los Angeles",
      "New York",
      "Philadelphia",
      "San Francisco",
      "Seattle",
    ],
  },
  "United Kingdom": {
    states: ["England", "Northern Ireland", "Scotland", "Wales"],
    cities: ["Birmingham", "Edinburgh", "Glasgow", "London", "Manchester"],
  },
  Canada: {
    states: ["Alberta", "British Columbia", "Ontario", "Quebec"],
    cities: ["Calgary", "Montreal", "Ottawa", "Toronto", "Vancouver"],
  },
  Australia: {
    states: ["New South Wales", "Queensland", "Victoria", "Western Australia"],
    cities: ["Brisbane", "Melbourne", "Perth", "Sydney"],
  },
};

const INDIA_PIN_STATE_PREFIXES: Record<string, string> = {
  "11": "Delhi",
  "12": "Haryana",
  "13": "Haryana",
  "14": "Punjab",
  "15": "Punjab",
  "16": "Chandigarh",
  "17": "Himachal Pradesh",
  "18": "Jammu and Kashmir",
  "19": "Jammu and Kashmir",
  "20": "Uttar Pradesh",
  "21": "Uttar Pradesh",
  "22": "Uttar Pradesh",
  "23": "Uttar Pradesh",
  "24": "Uttar Pradesh",
  "25": "Uttar Pradesh",
  "26": "Uttar Pradesh",
  "27": "Uttar Pradesh",
  "28": "Uttar Pradesh",
  "30": "Rajasthan",
  "31": "Rajasthan",
  "32": "Rajasthan",
  "33": "Rajasthan",
  "34": "Rajasthan",
  "36": "Gujarat",
  "37": "Gujarat",
  "38": "Gujarat",
  "39": "Gujarat",
  "40": "Maharashtra",
  "41": "Maharashtra",
  "42": "Maharashtra",
  "43": "Maharashtra",
  "44": "Maharashtra",
  "45": "Madhya Pradesh",
  "46": "Madhya Pradesh",
  "47": "Madhya Pradesh",
  "48": "Madhya Pradesh",
  "49": "Chhattisgarh",
  "50": "Telangana",
  "51": "Andhra Pradesh",
  "52": "Andhra Pradesh",
  "53": "Andhra Pradesh",
  "56": "Karnataka",
  "57": "Karnataka",
  "58": "Karnataka",
  "59": "Karnataka",
  "60": "Tamil Nadu",
  "61": "Tamil Nadu",
  "62": "Tamil Nadu",
  "63": "Tamil Nadu",
  "64": "Tamil Nadu",
  "67": "Kerala",
  "68": "Kerala",
  "69": "Kerala",
  "70": "West Bengal",
  "71": "West Bengal",
  "72": "West Bengal",
  "73": "West Bengal",
  "74": "West Bengal",
  "75": "Odisha",
  "76": "Odisha",
  "77": "Odisha",
  "78": "Assam",
  "79": "North East",
  "80": "Bihar",
  "81": "Bihar",
  "82": "Jharkhand",
  "83": "Jharkhand",
  "84": "Bihar",
};

const uniqueValues = (values: Array<string | null | undefined>) =>
  Array.from(new Set(values.map((value) => value?.trim()).filter(Boolean) as string[]));

const splitPhone = (phone?: string | null) => {
  const value = String(phone ?? "").trim();
  const matchedCountry = COUNTRY_OPTIONS
    .slice()
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => value.startsWith(country.dialCode));

  if (!matchedCountry) {
    return { countryCode: "IN", dialCode: "+91", localPhone: value };
  }

  return {
    countryCode: matchedCountry.code,
    dialCode: matchedCountry.dialCode,
    localPhone: value.slice(matchedCountry.dialCode.length).trim(),
  };
};

const EMPTY_ADDRESS: CheckoutAddress = {
  name: "",
  phone: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  country: "",
};

const mapSavedAddressToCheckout = (saved: SavedAddress): CheckoutAddress => ({
  name: saved.full_name ?? "",
  phone: splitPhone(saved.phone).localPhone,
  street: [saved.line1, saved.line2].filter(Boolean).join(", "),
  city: saved.city ?? "",
  state: saved.state ?? "",
  zip: saved.postal_code ?? "",
  country: saved.country ?? "",
});

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate();

  const { items, loading, totalAmount } = useCart();

  const [paymentMethod, setPaymentMethod] = React.useState<"card" | "upi" | "cod">("card");

  const [address, setAddress] = React.useState<CheckoutAddress>(EMPTY_ADDRESS);
  const [savedAddresses, setSavedAddresses] = React.useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = React.useState("");
  const [phoneCountryCode, setPhoneCountryCode] = React.useState("IN");
  const [phoneError, setPhoneError] = React.useState<string | null>(null);
  const [shippingQuote, setShippingQuote] = React.useState<null | {
    configured: boolean;
    serviceable: boolean;
    total_shipping: number;
    quotes: any[];
  }>(null);
  const [shippingLoading, setShippingLoading] = React.useState(false);
  const [shippingError, setShippingError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadAddresses = async () => {
      try {
        const rows = await addressApi.getAll();
        const list = Array.isArray(rows) ? rows : [];
        setSavedAddresses(list);

        const preferred =
          list.find((item: SavedAddress) => item.is_default) ?? list[0];
        if (preferred) {
          setSelectedAddressId(String(preferred.id));
          setAddress(mapSavedAddressToCheckout(preferred));
          const phoneCountry = splitPhone(preferred.phone);
          setPhoneCountryCode(phoneCountry.countryCode);
        }
      } catch (err) {
        console.error("Failed to load saved addresses", err);
      }
    };

    loadAddresses();
  }, []);

  const updateAddress = (patch: Partial<CheckoutAddress>) => {
    setSelectedAddressId("");
    setAddress((current) => ({ ...current, ...patch }));
  };

  const handleSavedAddressChange = (id: string) => {
    setSelectedAddressId(id);

    if (!id) {
      setAddress(EMPTY_ADDRESS);
      setPhoneCountryCode("IN");
      setPhoneError(null);
      return;
    }

    const saved = savedAddresses.find((item) => String(item.id) === id);
    if (saved) {
      setAddress(mapSavedAddressToCheckout(saved));
      const phoneCountry = splitPhone(saved.phone);
      setPhoneCountryCode(phoneCountry.countryCode);
      setPhoneError(null);
    }
  };

  const countrySuggestions = React.useMemo(
    () =>
      uniqueValues([
        ...COUNTRY_OPTIONS.map((country) => country.name),
        ...savedAddresses.map((saved) => saved.country),
      ]),
    [savedAddresses],
  );

  const stateSuggestions = React.useMemo(() => {
    const country = findCountry(address.country)?.name ?? address.country;
    return uniqueValues([
      ...(REGION_SUGGESTIONS[country]?.states ?? []),
      ...savedAddresses
        .filter((saved) => !country || saved.country === country)
        .map((saved) => saved.state),
    ]);
  }, [address.country, savedAddresses]);

  const citySuggestions = React.useMemo(() => {
    const country = findCountry(address.country)?.name ?? address.country;
    return uniqueValues([
      ...(REGION_SUGGESTIONS[country]?.cities ?? []),
      ...savedAddresses
        .filter(
          (saved) =>
            (!country || saved.country === country) &&
            (!address.state || saved.state === address.state),
        )
        .map((saved) => saved.city),
    ]);
  }, [address.country, address.state, savedAddresses]);

  const streetSuggestions = React.useMemo(
    () =>
      uniqueValues(
        savedAddresses.map((saved) =>
          [saved.line1, saved.line2].filter(Boolean).join(", "),
        ),
      ),
    [savedAddresses],
  );

  const handleStreetChange = (street: string) => {
    const normalized = street.trim().toLowerCase();
    const matched =
      normalized.length >= 4
        ? savedAddresses.find((saved) => {
            const savedStreet = [saved.line1, saved.line2]
              .filter(Boolean)
              .join(", ")
              .trim()
              .toLowerCase();
            return savedStreet === normalized;
          })
        : null;

    if (!matched) {
      updateAddress({ street });
      return;
    }

    const country = matched.country ? findCountry(matched.country) : null;
    if (country) setPhoneCountryCode(country.code);

    updateAddress({
      street,
      city: address.city || matched.city || "",
      state: address.state || matched.state || "",
      zip: address.zip || matched.postal_code || "",
      country: address.country || matched.country || "",
    });
  };

  React.useEffect(() => {
    const postalCode = address.zip.trim();
    if (postalCode.length < 3 || !address.country || items.length === 0) {
      setShippingQuote(null);
      setShippingError(null);
      return;
    }

    const loadQuote = async () => {
      try {
        setShippingLoading(true);
        setShippingError(null);
        const quote = await shippingApi.quote({
          delivery_postcode: postalCode,
          delivery_country: address.country,
          payment_method: paymentMethod,
        });
        setShippingQuote(quote);
      } catch (err: any) {
        setShippingQuote(null);
        setShippingError(err?.message || "Shipping quote unavailable");
      } finally {
        setShippingLoading(false);
      }
    };

    const timer = window.setTimeout(loadQuote, 500);
    return () => window.clearTimeout(timer);
  }, [address.zip, address.country, items.length, paymentMethod]);

  const shippingAmount = shippingQuote?.serviceable ? Number(shippingQuote.total_shipping || 0) : 0;
  const payableTotal = totalAmount + shippingAmount;

  /* ===========================
     PLACE ORDER
  =========================== */
  const placeOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      let addressId: string | null = selectedAddressId || null;

      if (!addressId) {
        const addressRes = await addressApi.add({
          label: "Checkout",
          full_name: address.name,
          phone: `${COUNTRY_OPTIONS.find((country) => country.code === phoneCountryCode)?.dialCode ?? "+91"} ${address.phone}`.trim(),
          line1: address.street,
          line2: null,
          city: address.city,
          state: address.state || null,
          postal_code: address.zip,
          country: address.country,
          type: "home",
        });

        const createdAddress = (addressRes as any)?.address ?? addressRes;
        addressId =
          createdAddress?.id ?? createdAddress?.address_id ?? null;
      }

      if (!addressId) {
        throw new Error("Failed to create address");
      }

      await orderApi.create({
        address_id: addressId,
        payment_method: paymentMethod,
        shipping_quote: shippingQuote,
      });

      window.dispatchEvent(new Event("cart-updated"));
      toastSuccess("Order placed successfully 🎉");
      navigate("/orders", { replace: true });
    } catch (err) {
      console.error(err);
      toastError("Failed to place order");
    }
  };

  /* ===========================
     STATES
  =========================== */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading checkout…
      </div>
    );
  }

  /* ===========================
     UI (DESIGN UNCHANGED)
  =========================== */
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 bg-gray-50 dark:bg-[#0A0A0A]">
        <div className="container mx-auto px-4 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Cart</span>
          </button>

          <h1 className="text-3xl mb-8">Checkout</h1>

          <form onSubmit={placeOrder} autoComplete="on">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Delivery & Payment */}
              <div className="lg:col-span-2 space-y-6">
                {/* Address */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-xl p-6 border border-border">
                  <h2 className="text-xl mb-6">Delivery Address</h2>

                  {savedAddresses.length > 0 && (
                    <div className="field mb-4">
                      <label>Use Saved Address</label>
                      <select
                        value={selectedAddressId}
                        onChange={(e) => handleSavedAddressChange(e.target.value)}
                        className="w-full p-3 rounded border bg-secondary"
                      >
                        <option value="">Enter a new address</option>
                        {savedAddresses.map((saved) => (
                          <option key={saved.id} value={saved.id}>
                            {saved.is_default ? "Default - " : ""}
                            {saved.label || saved.full_name || "Saved address"}
                            {saved.city ? `, ${saved.city}` : ""}
                            {saved.postal_code ? ` ${saved.postal_code}` : ""}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="field">
                      <label>Full Name</label>
                      <input
                        name="name"
                        autoComplete="shipping name"
                        placeholder="John Doe"
                        value={address.name}
                        onChange={(e) =>
                          updateAddress({ name: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Phone</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <select
                          value={phoneCountryCode}
                          onChange={(e) => {
                            const nextCountry = COUNTRY_OPTIONS.find((country) => country.code === e.target.value);
                            setPhoneCountryCode(e.target.value);
                            if (nextCountry && !address.country) {
                              updateAddress({ country: nextCountry.name });
                            }
                          }}
                          className="w-full sm:w-36 p-3 rounded border bg-secondary"
                          aria-label="Country calling code"
                        >
                          {COUNTRY_OPTIONS.map((country) => (
                            <option key={country.code} value={country.code}>
                              {flagEmoji(country.code)} {country.code} {country.dialCode}
                            </option>
                          ))}
                        </select>
                        <input
                          name="tel"
                          autoComplete="shipping tel-national"
                          placeholder="555 123 4567"
                          value={address.phone}
                          onChange={(e) => {
                            const value = e.target.value.replace(/[^\d+()\-\s]/g, "").slice(0, 24);
                            const selectedDialCode =
                              COUNTRY_OPTIONS.find((country) => country.code === phoneCountryCode)?.dialCode ?? "";
                            const digits = `${selectedDialCode}${value}`.replace(/\D/g, "");
                            updateAddress({ phone: value });
                            if (digits.length < 7 || digits.length > 15) setPhoneError("Enter a valid phone number with country code");
                            else setPhoneError(null);
                          }}
                          onBlur={() => {
                            const selectedDialCode =
                              COUNTRY_OPTIONS.find((country) => country.code === phoneCountryCode)?.dialCode ?? "";
                            const digits = `${selectedDialCode}${address.phone}`.replace(/\D/g, "");
                            if (digits.length < 7 || digits.length > 15) setPhoneError("Enter a valid phone number with country code");
                            else setPhoneError(null);
                          }}
                          className="min-w-0 flex-3 w-full"
                          required
                          inputMode="tel"
                        />
                      </div>
                      {phoneError && <div className="text-sm text-red-500 mt-1">{phoneError}</div>}
                    </div>

                    <div className="field md:col-span-2">
                      <label>Street Address</label>
                      <input
                        name="street-address"
                        autoComplete="shipping street-address"
                        list="checkout-street-suggestions"
                        placeholder="House no, Street name"
                        value={address.street}
                        onChange={(e) => handleStreetChange(e.target.value)}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>City</label>
                      <input
                        name="address-level2"
                        autoComplete="shipping address-level2"
                        list="checkout-city-suggestions"
                        placeholder="City"
                        value={address.city}
                        onChange={(e) =>
                          updateAddress({ city: e.target.value })
                        }
                        required
                      />
                    </div>

                    <div className="field">
                      <label>State / Province / Region</label>
                      <input
                        name="address-level1"
                        autoComplete="shipping address-level1"
                        list="checkout-state-suggestions"
                        placeholder="State, province, or region"
                        value={address.state}
                        onChange={(e) => updateAddress({ state: e.target.value })}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Postal / ZIP Code</label>
                      <input
                        name="postal-code"
                        autoComplete="shipping postal-code"
                        placeholder="Postal or ZIP code"
                        value={address.zip}
                        onChange={(e) => {
                          const zip = e.target.value;
                          const country = findCountry(address.country)?.name ?? address.country;
                          const inferredState =
                            country === "India" ? INDIA_PIN_STATE_PREFIXES[zip.slice(0, 2)] : undefined;
                          updateAddress({
                            zip,
                            ...(inferredState && !address.state ? { state: inferredState } : {}),
                          });
                        }}
                        required
                      />
                    </div>

                    <div className="field">
                      <label>Country</label>
                      <input
                        name="country-name"
                        autoComplete="shipping country-name"
                        list="checkout-country-suggestions"
                        placeholder="Country"
                        value={address.country}
                        onChange={(e) => {
                          const country = findCountry(e.target.value);
                          if (country) setPhoneCountryCode(country.code);
                          updateAddress({ country: e.target.value });
                        }}
                        required
                      />
                    </div>
                  </div>
                  <datalist id="checkout-country-suggestions">
                    {countrySuggestions.map((country) => (
                      <option key={country} value={country} />
                    ))}
                  </datalist>
                  <datalist id="checkout-street-suggestions">
                    {streetSuggestions.map((street) => (
                      <option key={street} value={street} />
                    ))}
                  </datalist>
                  <datalist id="checkout-state-suggestions">
                    {stateSuggestions.map((state) => (
                      <option key={state} value={state} />
                    ))}
                  </datalist>
                  <datalist id="checkout-city-suggestions">
                    {citySuggestions.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>

                {/* Payment */}
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-border">
                  <h2 className="text-xl mb-6">Payment Method</h2>

                  <PaymentOption
                    selected={paymentMethod === "card"}
                    onClick={() => setPaymentMethod("card")}
                    icon={<CreditCard />}
                    label="Credit / Debit Card"
                  />
                  <PaymentOption
                    selected={paymentMethod === "upi"}
                    onClick={() => setPaymentMethod("upi")}
                    icon={<Smartphone />}
                    label="UPI"
                  />
                  <PaymentOption
                    selected={paymentMethod === "cod"}
                    onClick={() => setPaymentMethod("cod")}
                    icon={<Banknote />}
                    label="Cash on Delivery (COD)"
                  />
                </div>
              </div>

              {/* Summary */}
              <div>
                <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl p-6 border border-border sticky top-24">
                  <h3 className="text-xl mb-6">Order Summary</h3>

                  <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
                    {items.map((item) => (
                      <div
                        key={item.product_id}
                        className="flex justify-between text-sm"
                      >
                        <span className="line-clamp-1">
                          {item.name} × {item.quantity}
                        </span>
                        <span>₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t border-border pt-4 mb-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span>Subtotal</span>
                      <span>Rs. {totalAmount.toFixed(2)}</span>
                    </div>

                    <div className="flex justify-between text-sm mb-2">
                      <span>Shipping</span>
                      <span>
                        {shippingLoading
                          ? "Calculating..."
                          : shippingQuote?.serviceable
                            ? `Rs. ${shippingAmount.toFixed(2)}`
                            : "Enter address"}
                      </span>
                    </div>

                    {shippingQuote && !shippingQuote.configured && (
                      <div className="text-xs text-muted-foreground mb-2">
                        Shipping is estimated locally until Shiprocket credentials are configured.
                      </div>
                    )}

                    {shippingError && (
                      <div className="text-xs text-red-500 mb-2">{shippingError}</div>
                    )}

                    {shippingQuote && !shippingQuote.serviceable && (
                      <div className="text-xs text-red-500 mb-2">
                        Courier service is not available for this postal code.
                      </div>
                    )}

                    <div className="flex justify-between text-xl">
                      <span>Total</span>
                      <span className="text-[#0D47A1] dark:text-[#00B0FF]">
                        Rs. {payableTotal.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={Boolean(shippingQuote && !shippingQuote.serviceable)}
                    className="w-full bg-gradient-to-r from-[#0D47A1] to-[#00B0FF] text-white py-4 rounded-xl flex items-center justify-center gap-2"
                  >
                    <Check className="w-5 h-5" />
                    Place Order
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      <Footer />
    </div>
  );
};

const PaymentOption = ({
  selected,
  onClick,
  icon,
  label,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full p-4 rounded-xl border-2 flex items-center gap-4 mb-3 ${
      selected
        ? "border-[#00B0FF] bg-[#00B0FF]/5"
        : "border-border hover:border-[#00B0FF]/50"
    }`}
  >
    <div
      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
        selected ? "border-[#00B0FF]" : "border-border"
      }`}
    >
      {selected && <div className="w-3 h-3 rounded-full bg-[#00B0FF]" />}
    </div>
    {icon}
    <span className="flex-1 text-left">{label}</span>
  </button>
);

export default CheckoutPage;
