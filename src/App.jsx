import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

const CONTACTS = {
  email: "waxprojectstore@gmail.com",
  phone: "+380 96 101 27 21",
  telegram: "https://t.me/WaxProject_Manager",
};

const OWNER_EMAIL = "waxprojectstore@gmail.com";
const MANAGER_EMAILS = ["waxprojectstore@gmail.com"];

const starterProducts = [
  {
    id: "p1",
    name: "Luxury Zip Hoodie",
    price: 3200,
    category: "Худі",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1200&auto=format&fit=crop",
    description: "Щільне худі під замовлення з Китаю. Розміри уточнюються перед викупом.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "p2",
    name: "Designer Sneakers",
    price: 4600,
    category: "Взуття",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop",
    description: "Кросівки під замовлення. Перед оформленням уточнюємо розмірну сітку.",
    sizes: ["40", "41", "42", "43", "44"],
  },
  {
    id: "p3",
    name: "Premium Jacket",
    price: 5900,
    category: "Куртки",
    image: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=1200&auto=format&fit=crop",
    description: "Куртка під замовлення з Китаю. Доставка зазвичай займає 12–18 днів.",
    sizes: ["S", "M", "L", "XL"],
  },
];

function getStored(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("uk-UA").format(value) + " ₴";
}

function normalizeCategory(category) {
  const map = {
    "Худи": "Худі",
    "Обувь": "Взуття",
    "Кроссовки": "Взуття",
    "Аксессуары": "Аксесуари",
    "Новое": "Нове",
  };
  return map[category] || category;
}

function getRoleByEmail(email) {
  const cleanEmail = email.trim().toLowerCase();
  if (cleanEmail === OWNER_EMAIL.toLowerCase()) return "admin";
  if (MANAGER_EMAILS.map((m) => m.toLowerCase()).includes(cleanEmail)) return "manager";
  return "user";
}

function canOpenAdmin(user) {
  return user?.role === "admin" || user?.role === "manager";
}

function canDeleteProducts(user) {
  return user?.role === "admin";
}

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  show: { opacity: 1, y: 0 },
};

export default function WaxProjectStorePrototype() {
  const [products, setProducts] = useState(() => getStored("wax_products", starterProducts));
  const [cart, setCart] = useState(() => getStored("wax_cart", []));
  const [user, setUser] = useState(() => getStored("wax_user", null));
  const [orders, setOrders] = useState(() => getStored("wax_orders", []));
  const [activePage, setActivePage] = useState("shop");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Усі");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [checkoutForm, setCheckoutForm] = useState({ name: "", phone: "", city: "", address: "", comment: "" });
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "", image: "", description: "", sizes: "" });

  useEffect(() => localStorage.setItem("wax_products", JSON.stringify(products)), [products]);
  useEffect(() => localStorage.setItem("wax_cart", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("wax_user", JSON.stringify(user)), [user]);
  useEffect(() => localStorage.setItem("wax_orders", JSON.stringify(orders)), [orders]);

  const categories = useMemo(() => {
    const base = ["Усі", "Худі", "Взуття", "Куртки", "Футболки", "Аксесуари", "Сумки"];
    const extra = products.map((p) => normalizeCategory(p.category)).filter(Boolean);
    return [...new Set([...base, ...extra])];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    const searchText = `${product.name} ${product.description}`.toLowerCase();
    const matchesSearch = searchText.includes(query.toLowerCase());
    const matchesCategory = category === "Усі" || normalizeCategory(product.category) === category;
    return matchesSearch && matchesCategory;
  });

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const bonus = user?.bonus || 0;
  const finalTotal = Math.max(cartTotal - bonus, 0);

  function goToPage(page) {
    setActivePage(page);
    setMobileMenuOpen(false);
  }

  function addToCart(product, size = product.sizes?.[0] || "One Size") {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id && item.size === size);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.size === size ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, size, quantity: 1 }];
    });
  }

  function changeQuantity(id, size, delta) {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id && item.size === size ? { ...item, quantity: item.quantity + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function registerOrLogin() {
    if (!authForm.email || !authForm.password) return;
    const role = getRoleByEmail(authForm.email);
    setUser({
      name: authForm.name || "Клієнт",
      email: authForm.email.trim().toLowerCase(),
      bonus: user?.bonus || 0,
      role,
    });
    goToPage("account");
  }

  function logout() {
    setUser(null);
    goToPage("shop");
  }

  function placeOrder() {
    if (!checkoutForm.name || !checkoutForm.phone || cart.length === 0) return;

    const order = {
      id: "WP-" + Date.now(),
      date: new Date().toLocaleDateString("uk-UA"),
      customer: checkoutForm,
      items: cart,
      total: cartTotal,
      usedBonus: user ? bonus : 0,
      finalTotal,
      status: "Очікує оплату",
    };

    const productLines = cart
      .map((item) => `${item.name} / розмір: ${item.size} / кількість: ${item.quantity}`)
      .join(" | ");

    const message =
      "Нове замовлення WaxProject.Store" +
      " | Ім'я: " + checkoutForm.name +
      " | Телефон: " + checkoutForm.phone +
      " | Місто: " + (checkoutForm.city || "не вказано") +
      " | Доставка: " + (checkoutForm.address || "не вказано") +
      " | Коментар: " + (checkoutForm.comment || "немає") +
      " | Товари: " + productLines +
      " | Сума: " + finalTotal + " ₴";

    window.open("https://t.me/WaxProject_Manager?text=" + encodeURIComponent(message), "_blank");
    setOrders((prev) => [order, ...prev]);
    if (user) setUser({ ...user, bonus: Math.round(cartTotal * 0.05) });
    setCart([]);
    setCheckoutForm({ name: "", phone: "", city: "", address: "", comment: "" });
    goToPage("success");
  }

  function addProduct() {
    if (!newProduct.name || !newProduct.price) return;
    const product = {
      id: "p" + Date.now(),
      name: newProduct.name,
      price: Number(newProduct.price),
      category: normalizeCategory(newProduct.category || "Нове"),
      image: newProduct.image || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=1200&auto=format&fit=crop",
      description: newProduct.description || "Товар під замовлення з Китаю. Доставка 12–18 днів.",
      sizes: newProduct.sizes.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setProducts((prev) => [product, ...prev]);
    setNewProduct({ name: "", price: "", category: "", image: "", description: "", sizes: "" });
  }

  function deleteProduct(id) {
    setProducts((prev) => prev.filter((product) => product.id !== id));
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <button onClick={() => goToPage("shop")} className="text-left">
            <div className="text-2xl font-black tracking-tight">
              WaxProject<span className="text-red-500">.Store</span>
            </div>
            <div className="text-[10px] uppercase tracking-[0.35em] text-white/40">Тільки під замовлення</div>
          </button>

          <nav className="hidden items-center gap-2 md:flex">
            <NavButton label="Каталог" onClick={() => goToPage("shop")} active={activePage === "shop"} />
            <NavButton label={`Кошик (${cart.length})`} onClick={() => goToPage("cart")} active={activePage === "cart"} />
            <NavButton label={user ? "Кабінет" : "Вхід"} onClick={() => goToPage(user ? "account" : "auth")} active={["account", "auth"].includes(activePage)} />
            {canOpenAdmin(user) && <NavButton label="Адмінка" onClick={() => goToPage("admin")} active={activePage === "admin"} />}
          </nav>

          <div className="flex items-center gap-2">
            <button onClick={() => goToPage("cart")} className="relative rounded-full bg-red-600 px-4 py-3 font-bold shadow-lg shadow-red-950/40 transition hover:bg-red-500 md:px-5">
              🛍️
              {cart.length > 0 && <span className="absolute -right-2 -top-2 rounded-full bg-white px-2 py-0.5 text-xs text-black">{cart.length}</span>}
            </button>
            <button onClick={() => setMobileMenuOpen((value) => !value)} className="rounded-full border border-white/10 px-4 py-3 font-black text-white md:hidden">
              {mobileMenuOpen ? "×" : "☰"}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-white/10 px-5 pb-5 md:hidden">
            <div className="mt-4 grid gap-2 rounded-[2rem] border border-white/10 bg-white/[0.03] p-3">
              <MobileNavButton label="Каталог" onClick={() => goToPage("shop")} active={activePage === "shop"} />
              <MobileNavButton label={`Кошик (${cart.length})`} onClick={() => goToPage("cart")} active={activePage === "cart"} />
              <MobileNavButton label={user ? "Кабінет" : "Вхід"} onClick={() => goToPage(user ? "account" : "auth")} active={["account", "auth"].includes(activePage)} />
              {canOpenAdmin(user) && <MobileNavButton label="Адмінка" onClick={() => goToPage("admin")} active={activePage === "admin"} />}
            </div>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-7xl px-5">
        {activePage === "shop" && (
          <>
            <section className="grid min-h-[620px] items-center gap-12 py-16 md:grid-cols-[1fr_0.85fr] md:py-24">
              <motion.div initial={{ opacity: 0, y: 42 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="mb-8 inline-flex rounded-full border border-red-500/30 px-4 py-2 text-sm text-white/60">
                  Під замовлення з Китаю · 12–18 днів
                </motion.div>

                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight md:text-7xl">
                  Під замовлення
                </motion.h1>

                <motion.p initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mt-8 max-w-xl text-lg leading-8 text-white/55">
                  Товарів у наявності немає. Ми викуповуємо обрану позицію індивідуально після оформлення замовлення.
                </motion.p>

                <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="mt-10 flex gap-3">
                  <button onClick={() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" })} className="rounded-full bg-red-600 px-7 py-4 font-bold hover:bg-red-500">Каталог</button>
                  <button onClick={() => window.open(CONTACTS.telegram, "_blank")} className="rounded-full border border-white/15 px-7 py-4 font-bold text-white/80 hover:border-red-500/50">Telegram</button>
                </motion.div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }} className="relative flex items-center justify-center h-[520px] rounded-[2rem] bg-gradient-to-br from-red-700 via-red-800 to-black">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.8 }}
                  className="text-center"
                >
                  <h2 className="text-2xl md:text-3xl font-light tracking-[0.4em] text-white/80">
                    WaxProject.Store
                  </h2>
                  <div className="mt-4 h-px w-24 bg-white/40 mx-auto" />
                </motion.div>
              </motion.div>
            </section>

            <section id="catalog" className="py-20">
              <SectionTitle label="Каталог" title="Обрати позицію" />

              <div className="mt-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-5 py-4 md:w-96">
                  <span className="text-white/40">🔎</span>
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пошук товару..." className="w-full bg-transparent text-sm outline-none placeholder:text-white/30" />
                </div>

                <div className="flex flex-wrap gap-2">
                  {categories.map((item) => (
                    <button key={item} onClick={() => setCategory(item)} className={`rounded-full px-4 py-2 text-sm transition ${category === item ? "bg-red-600 text-white" : "bg-white/[0.04] text-white/55 hover:bg-white/[0.08]"}`}>
                      {item}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} addToCart={addToCart} />
                ))}
              </div>
            </section>
          </>
        )}
      </main>

      <footer className="mt-20 border-t border-white/10 px-5 py-12">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-4 md:grid-cols-2">
            <ContactBlock title="Телефон" text={CONTACTS.phone} href={`tel:${CONTACTS.phone.replaceAll(" ", "")}`} />
            <ContactBlock title="Пошта" text={CONTACTS.email} href={`mailto:${CONTACTS.email}`} />
          </div>
          <ContactBlock title="Telegram" text={CONTACTS.telegram} href={CONTACTS.telegram} wide />
          <p className="mt-8 text-center text-sm text-white/35">WaxProject.Store · товари під замовлення з Китаю · доставка 12–18 днів</p>
        </div>
      </footer>
    </div>
  );
}

function NavButton({ label, onClick, active }) {
  return (
    <button onClick={onClick} className={`rounded-full px-4 py-2 text-sm font-bold transition ${active ? "bg-red-600 text-white" : "text-white/55 hover:text-white"}`}>
      {label}
    </button>
  );
}

function MobileNavButton({ label, onClick, active }) {
  return (
    <button onClick={onClick} className={`rounded-2xl px-4 py-4 text-left text-base font-bold transition ${active ? "bg-red-600 text-white" : "text-white/60 hover:bg-white/[0.05] hover:text-white"}`}>
      {label}
    </button>
  );
}

function SectionTitle({ label, title }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ duration: 0.65 }}>
      <p className="text-sm uppercase tracking-[0.35em] text-red-500">{label}</p>
      <h2 className="mt-3 text-3xl font-black md:text-5xl">{title}</h2>
    </motion.div>
  );
}

function InfoMini({ title, text }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} variants={fadeUp} transition={{ duration: 0.6 }} className="py-4">
      <h3 className="font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/45">{text}</p>
    </motion.div>
  );
}

function ProductCard({ product, addToCart }) {
  const [size, setSize] = useState(product.sizes?.[0] || "One Size");
  return (
    <motion.article initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} transition={{ duration: 0.65 }} whileHover={{ y: -8 }} className="group overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.03] transition hover:border-red-500/40">
      <div className="h-80 overflow-hidden">
        <img src={product.image} alt={product.name} className="h-full w-full object-cover opacity-85 transition duration-500 group-hover:scale-105 group-hover:opacity-100" />
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-xl font-black">{product.name}</h3>
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/55">{normalizeCategory(product.category)}</span>
        </div>
        <p className="mt-3 text-sm leading-6 text-white/45">{product.description}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(product.sizes?.length ? product.sizes : ["One Size"]).map((item) => (
            <button key={item} onClick={() => setSize(item)} className={`rounded-full px-3 py-2 text-sm transition ${size === item ? "bg-red-600 text-white" : "bg-white/10 text-white/55 hover:text-white"}`}>
              {item}
            </button>
          ))}
        </div>
        <div className="mt-6 flex items-center justify-between gap-3">
          <b className="text-2xl">{formatPrice(product.price)}</b>
          <button onClick={() => addToCart(product, size)} className="rounded-full bg-red-600 px-5 py-3 font-black transition hover:bg-red-500">У кошик</button>
        </div>
      </div>
    </motion.article>
  );
}

function PageCard({ title, subtitle, children }) {
  return (
    <motion.section initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.6 }} className="py-16">
      <h1 className="text-4xl font-black md:text-6xl">{title}</h1>
      <p className="mt-4 max-w-3xl text-white/50">{subtitle}</p>
      <div className="mt-10">{children}</div>
    </motion.section>
  );
}

function Input({ label, value, onChange, type = "text" }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/45">{label}</span>
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="w-full rounded-2xl border border-white/10 bg-black px-4 py-3 outline-none transition focus:border-red-500/60" />
    </label>
  );
}

function Notice() {
  return (
    <div className="mt-4 rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm leading-6 text-white/60">
      Товарів у наявності немає. Ми викуповуємо речі з Китаю індивідуально під замовлення. Доставка зазвичай займає 12–18 днів. Доставка доступна по всьому світу, крім Росії та Республіки Білорусь.
    </div>
  );
}

function StepCard({ number, title, text }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} transition={{ duration: 0.6 }} whileHover={{ y: -5 }} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-5">
      <div className="text-sm font-black text-red-500">{number}</div>
      <h3 className="mt-5 font-black">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/45">{text}</p>
    </motion.div>
  );
}

function TrustCard({ title, text }) {
  return (
    <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} transition={{ duration: 0.6 }} whileHover={{ y: -5 }} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
      <h3 className="text-lg font-black">{title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/45">{text}</p>
    </motion.div>
  );
}

function ContactBlock({ title, text, href, wide = false }) {
  return (
    <motion.a href={href} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.25 }} variants={fadeUp} transition={{ duration: 0.6 }} whileHover={{ y: -5 }} className={`${wide ? "mx-auto mt-4 max-w-xl" : ""} block rounded-[2rem] border border-white/10 bg-white/[0.03] p-6 text-center transition hover:border-red-500/40 hover:bg-red-500/10`}>
      <h3 className="font-black">{title}</h3>
      <p className="mt-2 text-white/55">{text}</p>
    </motion.a>
  );
}

function Stat({ title, value }) {
  return (
    <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.5 }} className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-6">
      <p className="text-sm text-white/45">{title}</p>
      <h3 className="mt-2 text-2xl font-black">{value}</h3>
    </motion.div>
  );
}

function Empty({ text }) {
  return <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] p-12 text-center text-white/45">{text}</div>;
}
