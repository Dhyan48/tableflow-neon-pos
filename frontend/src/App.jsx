import { useEffect, useMemo, useState } from 'react';

const API = 'http://localhost:5000/api';

// Curated high-resolution food photography mapped to your seeded dishes
const DISH_IMAGES = {
  'Paneer Tikka': 'https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=600&q=80',
  'Crispy Corn': 'https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&w=600&q=80',
  'Hyderabadi Veg Biryani': 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
  'Butter Naan & Dal Makhani': 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=80',
  'Masala Dosa': 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=80',
  'Fresh Lime Soda': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  'Filter Coffee': 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=80',
  'Gulab Jamun (2 pcs)': 'https://images.unsplash.com/photo-1666190092159-3171cf0fbb12?auto=format&fit=crop&w=600&q=80',
};

const FALLBACK_DISH_IMAGE =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80';

export default function App() {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tableNumber, setTableNumber] = useState(1);
  const [cart, setCart] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [dbLatency, setDbLatency] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showNeonModal, setShowNeonModal] = useState(false);
  const [toast, setToast] = useState('');
  const [justAddedId, setJustAddedId] = useState(null);

  const triggerToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3200);
  };

  const fetchData = async () => {
    setIsSyncing(true);
    const start = performance.now();
    try {
      const [menuRes, ordersRes] = await Promise.all([
        fetch(`${API}/menu`),
        fetch(`${API}/orders`),
      ]);
      const [menuData, ordersData] = await Promise.all([
        menuRes.json(),
        ordersRes.json(),
      ]);
      const elapsed = Math.round(performance.now() - start);
      setDbLatency(elapsed);
      setMenu(menuData);
      setOrders(ordersData);
    } catch (err) {
      console.error('Failed to connect to backend:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const categories = useMemo(() => {
    const unique = new Set(menu.map((m) => m.category));
    return ['All', ...Array.from(unique)];
  }, [menu]);

  const filteredMenu = useMemo(() => {
    return menu.filter((item) => {
      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;
      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCat && matchesSearch;
    });
  }, [menu, selectedCategory, searchQuery]);

  const addToCart = (item) => {
    setJustAddedId(item.id);
    setTimeout(() => setJustAddedId(null), 450);

    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === item.id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === item.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image: DISH_IMAGES[item.name] || FALLBACK_DISH_IMAGE,
        },
      ];
    });
  };

  const updateCartQty = (menuItemId, delta) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.menuItemId === menuItemId
            ? { ...item, quantity: item.quantity + delta }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const placeOrder = async () => {
    if (!cart.length) return;
    setIsSyncing(true);
    const start = performance.now();
    await fetch(`${API}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tableNumber, items: cart }),
    });
    const elapsed = Math.round(performance.now() - start);
    setDbLatency(elapsed);
    setCart([]);
    triggerToast(`Order #T${tableNumber} committed to Neon DB (${elapsed}ms)`);
    await fetchData();
  };

  const updateStatus = async (id, status) => {
    setIsSyncing(true);
    const start = performance.now();
    await fetch(`${API}/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const elapsed = Math.round(performance.now() - start);
    setDbLatency(elapsed);
    triggerToast(`Order #${id} updated → ${status}`);
    await fetchData();
  };

  // Live Analytics
  const totalRevenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const activeOrdersCount = orders.filter((o) => o.status !== 'SERVED').length;

  const topDish = useMemo(() => {
    const counts = {};
    orders.forEach((order) => {
      order.items?.forEach((i) => {
        const name = i.menuItem?.name || 'Unknown';
        counts[name] = (counts[name] || 0) + i.quantity;
      });
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    return sorted.length ? `${sorted[0][0]} (${sorted[0][1]})` : 'Awaiting first order';
  }, [orders]);

  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const gstAmount = Math.round(cartSubtotal * 0.05);
  const grandTotal = cartSubtotal + gstAmount;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 text-slate-900 font-sans">
      {/* Floating Animated Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-pop bg-slate-900/95 backdrop-blur-md text-white px-5 py-3 rounded-2xl shadow-xl border border-emerald-500/30 text-sm flex items-center gap-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="font-medium">{toast}</span>
        </div>
      )}

      {/* Top Navigation & Neon Telemetry Bar */}
      <header className="bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex flex-wrap justify-between items-center gap-4">
          <div className="flex items-center gap-3.5">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-extrabold text-lg shadow-md shadow-emerald-600/20">
              TF
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  TableFlow POS
                </h1>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Neon Serverless Postgres
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Cloud-Native Restaurant Ordering & Live Kitchen Telemetry
              </p>
            </div>
          </div>

          {/* Live Neon Connection Telemetry */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="relative flex h-2.5 w-2.5">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isSyncing ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                    isSyncing ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                ></span>
              </span>
              <div className="text-xs">
                <span className="text-slate-400 block text-[11px]">Neon Compute Engine</span>
                <span className="font-bold text-slate-800">
                  {dbLatency !== null ? `Active • ${dbLatency}ms RTT` : 'Waking Compute...'}
                </span>
              </div>
            </div>

            <button
              onClick={fetchData}
              className="px-3.5 py-2.5 text-xs font-semibold bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:border-slate-300 text-slate-700 active:scale-95 transition"
              title="Ping Neon Database"
            >
              ↻ Sync
            </button>

            <button
              onClick={() => setShowNeonModal(true)}
              className="px-4 py-2.5 text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-sm shadow-emerald-600/20 active:scale-95 transition"
            >
              ⚡ Why Neon DB?
            </button>
          </div>
        </div>
      </header>

      {/* Animated KPI Summary Strip */}
      <section className="max-w-7xl mx-auto px-6 pt-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Total Revenue',
              value: `₹${totalRevenue.toLocaleString()}`,
              sub: 'Committed in Neon PostgreSQL',
              color: 'text-emerald-600',
            },
            {
              label: 'Total Orders',
              value: orders.length,
              sub: 'Relational Order & Item records',
              color: 'text-slate-900',
            },
            {
              label: 'Active Kitchen Queue',
              value: activeOrdersCount,
              sub: 'Pending & Preparing dishes',
              color: 'text-amber-600',
            },
            {
              label: 'Most Ordered Dish',
              value: topDish,
              sub: 'Live relational aggregation',
              color: 'text-teal-700',
              smallText: true,
            },
          ].map((kpi, idx) => (
            <div
              key={kpi.label}
              style={{ animationDelay: `${idx * 70}ms` }}
              className="animate-card bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
            >
              <span className="text-xs font-medium text-slate-500">{kpi.label}</span>
              <p
                className={`${
                  kpi.smallText ? 'text-base mt-2 truncate' : 'text-2xl mt-1'
                } font-extrabold ${kpi.color}`}
              >
                {kpi.value}
              </p>
              <span className="text-[11px] text-slate-400">{kpi.sub}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Main 3-Column Workspace */}
      <main className="max-w-7xl mx-auto px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Visual Photo Menu (5 cols) */}
        <section className="lg:col-span-5 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-bold text-base text-slate-900">1. Select Dishes</h2>
            <span className="text-xs font-medium text-slate-400">
              {filteredMenu.length} dishes
            </span>
          </div>

          <input
            type="text"
            placeholder="Search Paneer, Biryani, Dosa..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full mb-3 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 focus:bg-white transition"
          />

          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-3 border-b border-slate-100">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Dish Cards Grid with Images & Hover Zoom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 overflow-y-auto max-h-[500px] pr-1">
            {filteredMenu.map((item, idx) => {
              const imgUrl = DISH_IMAGES[item.name] || FALLBACK_DISH_IMAGE;
              const isJustAdded = justAddedId === item.id;
              return (
                <div
                  key={item.id}
                  style={{ animationDelay: `${idx * 45}ms` }}
                  className="animate-card group bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs hover:shadow-md hover:border-emerald-200 transition-all duration-300 flex flex-col justify-between"
                >
                  <div className="relative h-28 w-full overflow-hidden bg-slate-100">
                    <img
                      src={imgUrl}
                      alt={item.name}
                      loading="lazy"
                      className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500 ease-out"
                    />
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/90 backdrop-blur-xs text-slate-700 shadow-2xs">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-3 flex flex-col justify-between flex-1">
                    <p className="font-bold text-xs text-slate-800 line-clamp-1">
                      {item.name}
                    </p>
                    <div className="flex justify-between items-center mt-2.5">
                      <span className="text-sm font-extrabold text-emerald-700">
                        ₹{item.price}
                      </span>
                      <button
                        onClick={() => addToCart(item)}
                        className={`px-3 py-1 text-xs font-bold rounded-lg transition-all duration-200 active:scale-90 ${
                          isJustAdded
                            ? 'bg-slate-900 text-white scale-105'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                      >
                        {isJustAdded ? '✓ Added' : '+ Add'}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Column 2: Table Cart & Billing (3 cols) */}
        <section className="lg:col-span-3 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80 flex flex-col justify-between">
          <div>
            <h2 className="font-bold text-base text-slate-900 mb-4">2. Table Order</h2>

            <div className="mb-4">
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">
                Assign Table
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                  <button
                    key={num}
                    onClick={() => setTableNumber(num)}
                    className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${
                      Number(tableNumber) === num
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs scale-105'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    T-{num}
                  </button>
                ))}
              </div>
            </div>

            {cart.length === 0 ? (
              <div className="py-12 px-4 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <p className="text-xs font-semibold text-slate-500">Cart is empty</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Select dishes from the menu to build Table #{tableNumber}'s order
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                {cart.map((c) => (
                  <div
                    key={c.menuItemId}
                    className="animate-pop flex items-center gap-2.5 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200/70"
                  >
                    <img
                      src={c.image}
                      alt={c.name}
                      className="h-10 w-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 truncate">{c.name}</p>
                      <p className="text-emerald-700 font-semibold">
                        ₹{c.price * c.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateCartQty(c.menuItemId, -1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 active:scale-90 transition"
                      >
                        -
                      </button>
                      <span className="w-5 text-center font-bold">{c.quantity}</span>
                      <button
                        onClick={() => updateCartQty(c.menuItemId, 1)}
                        className="w-6 h-6 rounded-lg bg-white border border-slate-200 font-bold text-slate-600 hover:bg-slate-100 active:scale-90 transition"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <div className="space-y-1 text-xs mb-3">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>GST (5%)</span>
                <span>₹{gstAmount}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-slate-900 pt-1.5 border-t border-slate-100">
                <span>Total Payable</span>
                <span className="text-emerald-700">₹{grandTotal}</span>
              </div>
            </div>

            <button
              onClick={placeOrder}
              disabled={!cart.length || isSyncing}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-bold rounded-xl hover:from-emerald-700 hover:to-teal-700 disabled:opacity-40 shadow-sm shadow-emerald-600/20 active:scale-98 transition-all"
            >
              Send Order to Kitchen →
            </button>
          </div>
        </section>

        {/* Column 3: Live Kitchen Display System (4 cols) */}
        <section className="lg:col-span-4 bg-white p-5 rounded-2xl shadow-xs border border-slate-200/80">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-bold text-base text-slate-900">3. Live Kitchen Queue</h2>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Neon Sync
            </span>
          </div>

          <div className="space-y-3 max-h-[540px] overflow-y-auto pr-1">
            {orders.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-12">
                No orders yet. Place a table order to watch it appear live!
              </p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="animate-card p-3.5 border border-slate-200/90 rounded-2xl bg-slate-50/60 hover:bg-white hover:shadow-sm transition-all duration-300"
                >
                  <div className="flex justify-between items-center mb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm text-slate-900">
                        Table #{order.tableNumber}
                      </span>
                      <span className="text-[11px] text-slate-400">#{order.id}</span>
                    </div>
                    <span
                      className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1.5 ${
                        order.status === 'SERVED'
                          ? 'bg-emerald-100 text-emerald-700'
                          : order.status === 'PREPARING'
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {order.status !== 'SERVED' && (
                        <span className="h-1.5 w-1.5 rounded-full bg-current animate-ping"></span>
                      )}
                      {order.status}
                    </span>
                  </div>

                  <ul className="text-xs text-slate-600 mb-3 space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-100">
                    {order.items?.map((i) => (
                      <li key={i.id} className="flex justify-between items-center">
                        <span className="font-medium">{i.menuItem?.name}</span>
                        <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                          ×{i.quantity}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-slate-800">
                      ₹{order.totalAmount}
                    </span>
                    <div className="flex gap-1.5">
                      {order.status === 'PENDING' && (
                        <button
                          onClick={() => updateStatus(order.id, 'PREPARING')}
                          className="text-[11px] font-bold px-3 py-1.5 bg-amber-500 text-white rounded-lg hover:bg-amber-600 active:scale-95 transition"
                        >
                          Start Cooking
                        </button>
                      )}
                      {order.status !== 'SERVED' && (
                        <button
                          onClick={() => updateStatus(order.id, 'SERVED')}
                          className="text-[11px] font-bold px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 active:scale-95 transition"
                        >
                          Mark Served
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {/* Neon Architecture Presentation Modal */}
      {showNeonModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="animate-pop bg-white max-w-2xl w-full rounded-3xl shadow-2xl border border-slate-200 p-6">
            <div className="flex justify-between items-center pb-3.5 border-b border-slate-100">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Why Neon Serverless PostgreSQL?
                </h3>
                <p className="text-xs text-slate-500">
                  Architectural advantages powering TableFlow POS
                </p>
              </div>
              <button
                onClick={() => setShowNeonModal(false)}
                className="h-8 w-8 rounded-full bg-slate-100 text-slate-500 hover:text-slate-800 font-bold flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-5 text-xs">
              <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-100">
                <p className="font-bold text-emerald-900 text-sm mb-1">
                  1. Scale-to-Zero Compute
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Storage and compute are separated. When the restaurant closes overnight, Neon suspends compute to 0—eliminating idle server bills.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-100">
                <p className="font-bold text-blue-900 text-sm mb-1">
                  2. Copy-on-Write Branching
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Clone the live production database in 1 second to test festival menu discounts or schema updates without touching live customer orders.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100">
                <p className="font-bold text-amber-900 text-sm mb-1">
                  3. Built-in PgBouncer Pooling
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Handles lunch and dinner rush concurrency spikes effortlessly via the{' '}
                  <code className="bg-white px-1.5 py-0.5 rounded border border-amber-200">
                    -pooler
                  </code>{' '}
                  endpoint without exhausting connections.
                </p>
              </div>
              <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100">
                <p className="font-bold text-purple-900 text-sm mb-1">
                  4. Instant Point-in-Time Restore
                </p>
                <p className="text-slate-600 leading-relaxed">
                  Immutable WAL history lets admins roll the database back to any exact timestamp if menu prices or orders are accidentally deleted.
                </p>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setShowNeonModal(false)}
                className="px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
              >
                Back to Live Demo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}