import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ShoppingBag, ShieldCheck, Truck, ArrowRight, ArrowLeft } from 'lucide-react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';
import toast from 'react-hot-toast';
import { LAGOS_LGAS } from '../../lib/nigeriaData';

export const CartPage: React.FC = () => {
  const navigate = useNavigate();
  const { items, removeFromCart, updateQuantity, clearCart, getSubtotal } = useCartStore();
  const { user, isAuthenticated } = useAuthStore();

  const [deliveryLga, setDeliveryLga] = useState<string>('Ikeja');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [buyerPhone, setBuyerPhone] = useState<string>(user?.phone || '');
  const [notes, setNotes] = useState<string>('');
  const [loadingQuote, setLoadingQuote] = useState<boolean>(false);
  const [shippingQuote, setShippingQuote] = useState<{
    delivery_fee_ngn: number;
    courier: string;
    estimated_days: string;
  }>({
    delivery_fee_ngn: 2200,
    courier: 'Kwik Delivery / GIGL Express',
    estimated_days: 'Same-day or next-day delivery',
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Fetch live shipping quote whenever delivery LGA changes
  useEffect(() => {
    let isMounted = true;
    const fetchQuote = async () => {
      try {
        setLoadingQuote(true);
        const hasTonnage = items.some((i) => i.unit?.toLowerCase().includes('ton'));
        const totalWeight = items.reduce((acc, i) => acc + (i.unit?.toLowerCase() === 'kg' ? i.quantity : i.quantity * 2), 0);

        const res = await api.post('/logistics/quote', {
          destination_lga: deliveryLga,
          origin_lga: 'Ikeja',
          weight_kg: totalWeight,
          is_bulk_tonnage: hasTonnage,
        });
        if (isMounted && res.data) {
          setShippingQuote({
            delivery_fee_ngn: res.data.delivery_fee_ngn || 2200,
            courier: res.data.courier || 'Kwik Delivery',
            estimated_days: res.data.estimated_days || '1-2 days',
          });
        }
      } catch (err) {
        console.warn('Could not fetch dynamic quote, using standard Lagos rate:', err);
      } finally {
        if (isMounted) setLoadingQuote(false);
      }
    };

    if (items.length > 0) {
      fetchQuote();
    }
    return () => {
      isMounted = false;
    };
  }, [deliveryLga, items]);

  const subtotal = getSubtotal();
  const deliveryFee = items.length > 0 ? shippingQuote.delivery_fee_ngn : 0;
  const grandTotal = subtotal + deliveryFee;

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated) {
      toast.error('Please log in or sign up to complete your checkout');
      navigate('/login?redirect=/cart');
      return;
    }

    if (!deliveryAddress.trim()) {
      toast.error('Please enter your specific delivery address in Lagos');
      return;
    }

    if (!buyerPhone.trim()) {
      toast.error('Please enter a contact phone number for the courier rider');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: items.map((i) => ({
          listing_id: i.listingId,
          quantity: i.quantity,
        })),
        buyer_phone: buyerPhone.trim(),
        buyer_delivery_address: deliveryAddress.trim(),
        buyer_delivery_lga: deliveryLga,
        notes: notes.trim() || undefined,
      };

      const res = await api.post('/cart/checkout', payload);
      const data = res.data;

      toast.success(data.message || 'Order created! Redirecting to secure Paystack escrow...');
      clearCart();

      if (data.checkout_url) {
        // Redirect to Paystack Escrow Checkout
        window.location.href = data.checkout_url;
      } else {
        navigate('/orders');
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Checkout failed. Please try again.';
      toast.error(detail);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-20 h-20 bg-[#062E12]/10 text-[#062E12] rounded-full flex items-center justify-center mx-auto mb-6">
          <ShoppingBag className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Your Shopping Cart is Empty</h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          Explore Recoverable Materials (bulk agro-industrial feedstock) or Upcycled Products crafted by local artisans.
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to="/listings?group=circular_materials"
            className="px-6 py-3 bg-[#062E12] text-white rounded-lg font-medium hover:bg-[#083d18] transition flex items-center gap-2 shadow-sm"
          >
            <span>🌿</span> Recoverable Materials Hub
          </Link>
          <Link
            to="/listings?group=upcycled_products"
            className="px-6 py-3 bg-[#D4AF37] text-gray-950 rounded-lg font-medium hover:bg-[#c4a030] transition flex items-center gap-2 shadow-sm"
          >
            <span>♻️</span> Upcycled Products Hub
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-200">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-[#062E12]" /> Shopping Cart
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Consolidated checkout protected by <strong>Reva Escrow</strong> & automated 3PL dispatch.
          </p>
        </div>
        <button
          onClick={clearCart}
          className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1 transition"
        >
          <Trash2 className="w-4 h-4" /> Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Cart Items List */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-100 overflow-hidden">
            {items.map((item) => (
              <div key={item.listingId} className="p-4 sm:p-5 flex gap-4 items-center">
                <div className="w-20 h-20 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden flex-shrink-0">
                  {item.photo ? (
                    <img src={item.photo} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                      No Photo
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <Link
                    to={`/listings/${item.listingId}`}
                    className="text-base font-semibold text-gray-900 hover:text-[#062E12] truncate block"
                  >
                    {item.title}
                  </Link>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Seller: <span className="text-gray-700 font-medium">{item.sellerName || 'Verified Vendor'}</span>
                    {item.location && ` • ${item.location}`}
                  </p>
                  <p className="text-sm font-bold text-[#062E12] mt-1">
                    ₦{item.priceNgn.toLocaleString()} <span className="text-xs font-normal text-gray-500">/ {item.unit}</span>
                  </p>
                </div>

                {/* Quantity adjuster */}
                <div className="flex items-center border border-gray-200 rounded-lg bg-gray-50 p-1">
                  <button
                    onClick={() => updateQuantity(item.listingId, item.quantity - 1)}
                    className="p-1 text-gray-600 hover:text-gray-900 transition"
                    title="Decrease quantity"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="px-3 text-sm font-bold text-gray-800 min-w-[28px] text-center">
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.listingId, item.quantity + 1)}
                    className="p-1 text-gray-600 hover:text-gray-900 transition"
                    title="Increase quantity"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Total for item & Delete */}
                <div className="text-right flex-shrink-0 pl-2">
                  <p className="text-base font-bold text-gray-900">
                    ₦{(item.priceNgn * item.quantity).toLocaleString()}
                  </p>
                  <button
                    onClick={() => removeFromCart(item.listingId)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium mt-1 inline-flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-2">
            <Link
              to="/listings"
              className="text-sm font-medium text-[#062E12] hover:underline flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </Link>
            <span className="text-xs text-gray-500">
              {items.length} {items.length === 1 ? 'item' : 'items'} in cart
            </span>
          </div>
        </div>

        {/* Right: Delivery Form & Checkout Summary */}
        <div className="lg:col-span-5 space-y-6">
          <form onSubmit={handleCheckout} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-5">
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 border-b border-gray-100 pb-3">
              <Truck className="w-5 h-5 text-[#062E12]" /> Lagos Delivery Details
            </h3>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Lagos LGA (Delivery Zone)
              </label>
              <select
                value={deliveryLga}
                onChange={(e) => setDeliveryLga(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#062E12] focus:border-transparent outline-none transition"
              >
                {LAGOS_LGAS.map((lga) => (
                  <option key={lga} value={lga}>
                    {lga}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Specific Street Address in Lagos
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 14 Admiralty Way, Lekki Phase 1"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#062E12] focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Recipient Contact Phone
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. 08012345678"
                value={buyerPhone}
                onChange={(e) => setBuyerPhone(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#062E12] focus:border-transparent outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Delivery Instructions (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Call before dispatch, gate color is blue"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-xs text-gray-900 focus:ring-2 focus:ring-[#062E12] focus:border-transparent outline-none transition"
              />
            </div>

            {/* Live Courier Quote Box */}
            <div className="bg-[#062E12]/5 border border-[#062E12]/15 rounded-lg p-3 text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold text-[#062E12]">
                <span className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4" /> {shippingQuote.courier}
                </span>
                <span>{loadingQuote ? 'Updating...' : `₦${shippingQuote.delivery_fee_ngn.toLocaleString()}`}</span>
              </div>
              <p className="text-gray-600">{shippingQuote.estimated_days}</p>
            </div>

            {/* Order Summary Breakdown */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Items Subtotal</span>
                <span className="font-medium text-gray-900">₦{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Lagos 3PL Courier</span>
                <span className="font-medium text-gray-900">₦{deliveryFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm text-emerald-700 font-medium">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4" /> Escrow Buyer Protection
                </span>
                <span>FREE</span>
              </div>
              <div className="flex justify-between text-base font-extrabold text-gray-900 pt-2 border-t border-gray-200">
                <span>Total Amount Due</span>
                <span className="text-[#062E12] text-xl font-black">₦{grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Escrow Guarantee Pill */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 flex-shrink-0 mt-0.5" />
              <span>
                <strong>100% Escrow Protection:</strong> Funds are locked safely in Reva Escrow until you inspect the delivered items.
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-[#062E12] hover:bg-[#083d18] text-white font-bold rounded-lg transition shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Securing with Escrow...</span>
              ) : (
                <>
                  <span>Proceed to Paystack Escrow (₦{grandTotal.toLocaleString()})</span>
                  <ArrowRight className="w-5 h-5 text-[#D4AF37]" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
