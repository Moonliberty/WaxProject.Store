import React, { useEffect, useMemo, useState } from "react";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDombadTGEayBlxLw-75dvZ0pn0loKRVkA",
  authDomain: "waxprojectstore-cfdfe.firebaseapp.com",
  projectId: "waxprojectstore-cfdfe",
  storageBucket: "waxprojectstore-cfdfe.firebasestorage.app",
  messagingSenderId: "204660105086",
  appId: "1:204660105086:web:72a9ed57bd6ab74b6b9d2f",
  measurementId: "G-LNHCQM4R7V"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const CONTACTS = {
  emailText: "waxprojectstore@gmail.com",
  phoneText: "+380 96 101 27 21",
  emailHref: "mailto:waxprojectstore@gmail.com",
  phoneHref: "tel:+380961012721",
  telegramUser: "WaxProject_Manager",
};

const OWNER_EMAIL = "waxprojectstore@gmail.com";

const starterProducts = [
  {
    id: "demo-1",
    name: "Luxury Zip Hoodie",
    price: 3200,
    category: "Худі",
    image: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?q=80&w=1200&auto=format&fit=crop",
    description: "Щільне худі під замовлення з Китаю. Розміри уточнюються перед викупом.",
    sizes: ["S", "M", "L", "XL"],
  },
  {
    id: "demo-2",
    name: "Designer Sneakers",
    price: 4600,
    category: "Взуття",
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=1200&auto=format&fit=crop",
    description: "Кросівки під замовлення. Перед оформленням уточнюємо розмірну сітку.",
    sizes: ["40", "41", "42", "43", "44"],
  },
  {
    id: "demo-3",
    name: "Premium Jacket",
    price: 5900,
    category: "Куртки",
    image: "https://images.unsplash.com/photo-1543076447-215ad9ba6923?q=80&w=1200&auto=format&fit=crop",
    description: "Куртка під замовлення з Китаю. Доставка зазвичай займає 12–18 днів.",
    sizes: ["S", "M", "L", "XL"],
  },
];

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function formatPrice(value) {
  return new Intl.NumberFormat("uk-UA").format(Number(value) || 0) + " ₴";
}

function normalizeCategory(category) {
  const map = {
    "Худи": "Худі",
    "Обувь": "Взуття",
    "Кроссовки": "Взуття",
    "Аксессуары": "Аксесуари",
    "Новое": "Нове",
    "T-Shirts": "Футболки",
    "Bags": "Сумки",
    "Accessories": "Аксесуари",
  };
  return map[category] || category || "Нове";
}

function safeSizes(sizes) {
  return Array.isArray(sizes) && sizes.length > 0 ? sizes : ["One Size"];
}

function getRoleByEmail(email) {
  const clean = String(email || "").trim().toLowerCase();
  if (clean === OWNER_EMAIL.toLowerCase()) return "admin";
  return "user";
}

function canOpenAdmin(user) {
  return user?.role === "admin";
}

export default function App() {
  const [products, setProducts] = useState(starterProducts);
  const [cart, setCart] = useState(() => readStorage("wax_cart", []));
  const [user, setUser] = useState(() => readStorage("wax_user", null));
  const [orders, setOrders] = useState(() => readStorage("wax_orders", []));
  const [page, setPage] = useState("shop");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Усі");
  const [menuOpen, setMenuOpen] = useState(false);
  const [error, setError] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "" });
  const [checkoutForm, setCheckoutForm] = useState({ name: "", phone: "", city: "", address: "", comment: "" });
  const [newProduct, setNewProduct] = useState({ name: "", price: "", category: "", image: "", description: "", sizes: "" });

  useEffect(() => localStorage.setItem("wax_cart", JSON.stringify(cart)), [cart]);
  useEffect(() => localStorage.setItem("wax_user", JSON.stringify(user)), [user]);
  useEffect(() => localStorage.setItem("wax_orders", JSON.stringify(orders)), [orders]);

  async function loadProducts() {
    setLoadingProducts(true);
    try {
      const snapshot = await getDocs(collection(db, "products"));
      const firebaseProducts = snapshot.docs.map((d) => ({
        id: d.id,
        firebaseId: d.id,
        ...d.data(),
      }));

      if (firebaseProducts.length > 0) {
        setProducts(firebaseProducts);
      } else {
        setProducts(starterProducts);
      }
    } catch (e) {
      console.error(e);
      setError("Не вдалося завантажити товари з Firebase.");
      setProducts(starterProducts);
    } finally {
      setLoadingProducts(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const cartCount = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const cartTotal = cart.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const bonus = Number(user?.bonus || 0);
  const finalTotal = Math.max(cartTotal - bonus, 0);

  const categories = useMemo(() => {
    const base = ["Усі", "Худі", "Взуття", "Куртки", "Футболки", "Аксесуари", "Сумки"];
    const extra = products.map((p) => normalizeCategory(p.category));
    return [...new Set([...base, ...extra])];
  }, [products]);

  const filteredProducts = products.filter((product) => {
    const text = `${product.name || ""} ${product.description || ""}`.toLowerCase();
    const matchesSearch = text.includes(query.toLowerCase());
    const matchesCategory = category === "Усі" || normalizeCategory(product.category) === category;
    return matchesSearch && matchesCategory;
  });

  function go(nextPage) {
    setPage(nextPage);
    setMenuOpen(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function scrollToId(id) {
    setPage("shop");
    setMenuOpen(false);
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }), 80);
  }

  function openTelegram(text = "") {
    const url = `https://t.me/${CONTACTS.telegramUser}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function addToCart(product, size) {
    const selectedSize = size || safeSizes(product.sizes)[0];
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id && item.size === selectedSize);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id && item.size === selectedSize
            ? { ...item, quantity: Number(item.quantity || 0) + 1 }
            : item
        );
      }
      return [...prev, { ...product, category: normalizeCategory(product.category), size: selectedSize, quantity: 1 }];
    });
  }

  function changeQuantity(id, size, delta) {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id && item.size === size ? { ...item, quantity: Number(item.quantity || 0) + delta } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(id, size) {
    setCart((prev) => prev.filter((item) => !(item.id === id && item.size === size)));
  }

  function registerOrLogin() {
    if (!authForm.email || !authForm.password) {
      setError("Вкажіть пошту та пароль.");
      return;
    }
    setUser({
      name: authForm.name || "Клієнт",
      email: authForm.email.trim().toLowerCase(),
      role: getRoleByEmail(authForm.email),
      bonus: user?.bonus || 0,
    });
    go("account");
  }

  function logout() {
    setUser(null);
    go("shop");
  }

  function placeOrder() {
    if (!cart.length) {
      setError("Кошик порожній.");
      return;
    }
    if (!checkoutForm.name || !checkoutForm.phone) {
      setError("Вкажіть ім’я та телефон.");
      return;
    }

    const order = {
      id: "WP-" + Date.now(),
      date: new Date().toLocaleDateString("uk-UA"),
      customer: checkoutForm,
      items: cart,
      total: cartTotal,
      finalTotal,
      status: "Очікує оплату",
    };

    const productLines = cart.map((item) => `${item.name} / ${item.size} / x${item.quantity}`).join(" | ");
    const message =
      "Нове замовлення WaxProject.Store" +
      " | Ім'я: " + checkoutForm.name +
      " | Телефон: " + checkoutForm.phone +
      " | Місто: " + (checkoutForm.city || "не вказано") +
      " | Доставка: " + (checkoutForm.address || "не вказано") +
      " | Коментар: " + (checkoutForm.comment || "немає") +
      " | Товари: " + productLines +
      " | Сума: " + finalTotal + " ₴";

    openTelegram(message);
    setOrders((prev) => [order, ...prev]);
    if (user) setUser({ ...user, bonus: Math.round(cartTotal * 0.05) });
    setCart([]);
    setCheckoutForm({ name: "", phone: "", city: "", address: "", comment: "" });
    go("success");
  }

  function handleProductImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Оберіть файл зображення.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setNewProduct((prev) => ({ ...prev, image: reader.result }));
    reader.readAsDataURL(file);
  }

  async function addProduct() {
    if (!newProduct.name || !newProduct.price) {
      setError("Вкажіть назву та ціну товару.");
      return;
    }

    const sizes = newProduct.sizes.split(",").map((s) => s.trim()).filter(Boolean);
    const product = {
      name: newProduct.name.trim(),
      price: Number(newProduct.price),
      category: normalizeCategory(newProduct.category || "Нове"),
      image: newProduct.image || "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?q=80&w=1200&auto=format&fit=crop",
      description: newProduct.description || "Товар під замовлення з Китаю. Доставка 12–18 днів.",
      sizes: sizes.length ? sizes : ["One Size"],
      createdAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, "products"), product);
      setNewProduct({ name: "", price: "", category: "", image: "", description: "", sizes: "" });
      setError("");
      await loadProducts();
    } catch (e) {
      console.error(e);
      setError("Не вдалося додати товар. Перевірте правила Firestore.");
    }
  }

  async function deleteProduct(product) {
    try {
      if (product.firebaseId) {
        await deleteDoc(doc(db, "products", product.firebaseId));
        await loadProducts();
      } else {
        setProducts((prev) => prev.filter((item) => item.id !== product.id));
      }
      setCart((prev) => prev.filter((item) => item.id !== product.id));
    } catch (e) {
      console.error(e);
      setError("Не вдалося видалити товар.");
    }
  }

  return (
    <div className="site">
      <header className="header">
        <button className="logo" onClick={() => go("shop")}>W</button>

        <nav className="nav desktop">
          <button onClick={() => go("shop")} className={page === "shop" ? "active" : ""}>Головна</button>
          <button onClick={() => scrollToId("catalog")}>Каталог</button>
          <button onClick={() => scrollToId("about")}>Про нас</button>
          <button onClick={() => scrollToId("how")}>Як це працює</button>
          <button onClick={() => scrollToId("reviews")}>Відгуки</button>
          <button onClick={() => scrollToId("contacts")}>Контакти</button>
          <button onClick={() => go(user ? "account" : "auth")}>{user ? "Кабінет" : "Вхід"}</button>
          {canOpenAdmin(user) && <button onClick={() => go("admin")}>Адмінка</button>}
        </nav>

        <div className="header-actions">
          <button className="cart-btn" onClick={() => go("cart")} aria-label="Кошик">
            <CartIcon />
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
          <button className="menu-btn" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? "×" : "☰"}</button>
        </div>
      </header>

      {menuOpen && (
        <div className="mobile-menu">
          <button onClick={() => go("shop")}>Головна</button>
          <button onClick={() => scrollToId("catalog")}>Каталог</button>
          <button onClick={() => go("cart")}>Кошик ({cartCount})</button>
          <button onClick={() => go(user ? "account" : "auth")}>{user ? "Кабінет" : "Вхід"}</button>
          {canOpenAdmin(user) && <button onClick={() => go("admin")}>Адмінка</button>}
        </div>
      )}

      <main>
        {page === "shop" && (
          <>
            <section className="hero">
              <div className="hero-left">
                <div className="hero-content">
                  <div className="pill"><span />Під замовлення</div>
                  <h1>Only by request</h1>
                  <p>Підбираємо та доставляємо стильні речі індивідуально для тебе з Китаю.</p>

                  <div className="hero-buttons">
                    <button className="primary" onClick={() => scrollToId("catalog")}>Перейти в каталог</button>
                    <button className="secondary" onClick={() => scrollToId("how")}>Як це працює?</button>
                  </div>

                  <div className="features">
                    <MiniFeature icon="♢" title="Перевірені продавці" text="Тільки надійні магазини" />
                    <MiniFeature icon="□" title="Доставка під ключ" text="Від магазину до тебе" />
                    <MiniFeature icon="☆" title="Якість гарантовано" text="Перевіряємо кожне замовлення" />
                  </div>
                </div>
              </div>
              <div className="hero-right">
                <div>
                  <h2>WaxProject.Store</h2>
                  <div className="line" />
                </div>
              </div>
            </section>

            <section id="about" className="info-grid">
              <Info title="Без складу" text="Працюємо чесно: усі речі під замовлення." />
              <Info title="Оплата після підтвердження" text="Реквізити надає менеджер після уточнення деталей." />
              <Info title="Бонуси" text="Зареєстровані клієнти отримують 5% від минулого замовлення." />
            </section>

            <section id="how" className="section">
              <Title label="Процес" title="Як це працює" />
              <div className="steps">
                <Step number="01" title="Оберіть товар" text="Додайте позицію у кошик та оберіть розмір." />
                <Step number="02" title="Залиште заявку" text="Вкажіть телефон, місто та коментар." />
                <Step number="03" title="Підтвердження" text="Менеджер уточнює всі деталі." />
                <Step number="04" title="Викуп" text="Ми викуповуємо товар у Китаї." />
                <Step number="05" title="Доставка" text="Середній термін — 12–18 днів." />
              </div>
            </section>

            <section id="catalog" className="section">
              <Title label="Каталог" title="Обрати позицію" />
              <div className="filters">
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пошук товару..." />
                <div>
                  {categories.map((item) => (
                    <button key={item} onClick={() => setCategory(item)} className={category === item ? "selected" : ""}>{item}</button>
                  ))}
                </div>
              </div>

              {loadingProducts && <p className="muted">Завантаження товарів...</p>}

              <div className="products">
                {filteredProducts.length ? filteredProducts.map((product) => <ProductCard key={product.id} product={product} addToCart={addToCart} />) : <Empty text="Товарів у цій категорії поки немає." />}
              </div>
            </section>

            <section className="trust-grid">
              <Trust title="Чесні умови" text="Ми одразу вказуємо, що речі викуповуються під клієнта, а не лежать на складі." />
              <Trust title="Статус замовлення" text="У кабінеті та адмінці можна бачити етап обробки замовлення." />
              <Trust title="Формат товарів" text="Товари можуть не бути оригінальною продукцією брендів. Деталі уточнюйте перед замовленням." />
            </section>

            <section id="reviews" className="section">
              <Title label="Відгуки" title="Реальні відгуки клієнтів" />
              <div className="empty">Поки що відгуків немає. Після перших замовлень тут будуть реальні відгуки з фото та відео.</div>
            </section>
          </>
        )}

        {page === "cart" && (
          <Page title="Кошик" subtitle="Кошик зберігається навіть без реєстрації, якщо клієнт заходить з того самого браузера.">
            {!cart.length ? <Empty text="Кошик поки порожній." /> : (
              <div className="checkout-layout">
                <div className="cart-list">
                  {cart.map((item) => <CartItem key={item.id + item.size} item={item} changeQuantity={changeQuantity} removeFromCart={removeFromCart} />)}
                </div>
                <div className="checkout-box">
                  <h3>Оформлення</h3>
                  <Notice />
                  <div className="form">
                    <Input label="Ім’я" value={checkoutForm.name} onChange={(v) => setCheckoutForm({ ...checkoutForm, name: v })} />
                    <Input label="Телефон" value={checkoutForm.phone} onChange={(v) => setCheckoutForm({ ...checkoutForm, phone: v })} />
                    <Input label="Місто" value={checkoutForm.city} onChange={(v) => setCheckoutForm({ ...checkoutForm, city: v })} />
                    <Input label="Відділення/адреса доставки" value={checkoutForm.address} onChange={(v) => setCheckoutForm({ ...checkoutForm, address: v })} />
                    <Input label="Коментар" value={checkoutForm.comment} onChange={(v) => setCheckoutForm({ ...checkoutForm, comment: v })} />
                  </div>
                  {error && <Error text={error} />}
                  <div className="total">
                    <p><span>Товари:</span><b>{formatPrice(cartTotal)}</b></p>
                    {user && <p><span>Бонус:</span><b>-{formatPrice(bonus)}</b></p>}
                    <p className="final"><span>Разом:</span><b>{formatPrice(finalTotal)}</b></p>
                  </div>
                  {!user && <button className="secondary wide" onClick={() => go("auth")}>Увійти та отримувати бонуси</button>}
                  <button className="primary wide" onClick={placeOrder}>Оформити замовлення</button>
                </div>
              </div>
            )}
          </Page>
        )}

        {page === "auth" && (
          <Page title="Вхід / реєстрація" subtitle="Можна купувати без акаунта, але з акаунтом будуть бонуси та історія замовлень.">
            <div className="auth-box">
              <Input label="Ім’я" value={authForm.name} onChange={(v) => setAuthForm({ ...authForm, name: v })} />
              <Input label="Пошта" value={authForm.email} onChange={(v) => setAuthForm({ ...authForm, email: v })} />
              <Input label="Пароль" type="password" value={authForm.password} onChange={(v) => setAuthForm({ ...authForm, password: v })} />
              {error && <Error text={error} />}
              <button className="primary wide" onClick={registerOrLogin}>Увійти / зареєструватися</button>
              <p className="hint">Для входу в адмінку використовуйте пошту waxprojectstore@gmail.com</p>
            </div>
          </Page>
        )}

        {page === "account" && user && (
          <Page title="Особистий кабінет" subtitle="Бонуси, історія замовлень і дані клієнта.">
            <div className="stats">
              <Stat title="Клієнт" value={user.name} />
              <Stat title="Бонусний баланс" value={formatPrice(user.bonus)} />
              <Stat title="Статус" value={user.role === "admin" ? "Owner / Admin" : "Покупець"} />
            </div>
            <div className="actions">
              {canOpenAdmin(user) && <button className="primary" onClick={() => go("admin")}>Адмінка</button>}
              <button className="secondary" onClick={logout}>Вийти</button>
            </div>
          </Page>
        )}

        {page === "admin" && canOpenAdmin(user) && (
          <Page title="Адмінка WaxProject" subtitle="Товари зберігаються у Firebase — їх бачать всі користувачі.">
            <div className="admin-layout">
              <div className="admin-form">
                <h3>Додати товар</h3>
                <Input label="Назва" value={newProduct.name} onChange={(v) => setNewProduct({ ...newProduct, name: v })} />
                <Input label="Ціна" type="number" value={newProduct.price} onChange={(v) => setNewProduct({ ...newProduct, price: v })} />
                <Input label="Категорія" value={newProduct.category} onChange={(v) => setNewProduct({ ...newProduct, category: v })} />
                <label className="file-label">
                  Обрати фото з галереї / файлів
                  <input type="file" accept="image/*" onChange={handleProductImageUpload} />
                </label>
                {newProduct.image && <img className="preview" src={newProduct.image} alt="preview" />}
                <Input label="Розміри через кому" value={newProduct.sizes} onChange={(v) => setNewProduct({ ...newProduct, sizes: v })} />
                <Input label="Опис" value={newProduct.description} onChange={(v) => setNewProduct({ ...newProduct, description: v })} />
                {error && <Error text={error} />}
                <button className="primary wide" onClick={addProduct}>Додати в Firebase</button>
              </div>
              <div className="admin-side">
                <div className="panel">
                  <h3>Товари</h3>
                  {products.map((product) => <AdminProduct key={product.id} product={product} deleteProduct={deleteProduct} />)}
                </div>
                <div className="panel">
                  <h3>Замовлення</h3>
                  {orders.length ? orders.map((order) => <Order key={order.id} order={order} />) : <p className="muted">Поки замовлень немає.</p>}
                </div>
              </div>
            </div>
          </Page>
        )}

        {page === "success" && (
          <Page title="Замовлення прийнято" subtitle="Менеджер зв’яжеться з вами для підтвердження товару, розміру та оплати.">
            <button className="primary" onClick={() => go("shop")}>Повернутися в каталог</button>
          </Page>
        )}
      </main>

      <footer id="contacts" className="footer">
        <div className="contact-grid">
          <Contact title="Телефон" text={CONTACTS.phoneText} onClick={() => window.location.href = CONTACTS.phoneHref} />
          <Contact title="Пошта" text={CONTACTS.emailText} onClick={() => window.location.href = CONTACTS.emailHref} />
        </div>
        <Contact title="Telegram" text={`https://t.me/${CONTACTS.telegramUser}`} onClick={() => openTelegram()} wide />
        <p>WaxProject.Store · товари під замовлення з Китаю · доставка 12–18 днів</p>
      </footer>
    </div>
  );
}

function CartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 64 64" fill="none">
      <path d="M14 24H50L46 50H18L14 24Z" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M22 24L28 12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M42 24L36 12" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M25 33V42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M32 33V42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M39 33V42" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <path d="M10 24H54" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

function MiniFeature({ icon, title, text }) {
  return <div className="mini-feature"><div>{icon}</div><section><h4>{title}</h4><p>{text}</p></section></div>;
}

function Info({ title, text }) {
  return <div className="info"><h3>{title}</h3><p>{text}</p></div>;
}

function Title({ label, title }) {
  return <div className="title"><p>{label}</p><h2>{title}</h2></div>;
}

function Step({ number, title, text }) {
  return <div className="step"><b>{number}</b><h3>{title}</h3><p>{text}</p></div>;
}

function Trust({ title, text }) {
  return <div className="trust"><h3>{title}</h3><p>{text}</p></div>;
}

function ProductCard({ product, addToCart }) {
  const sizes = safeSizes(product.sizes);
  const [size, setSize] = useState(sizes[0]);

  return (
    <article className="product">
      <img src={product.image} alt={product.name} />
      <div className="product-body">
        <div className="product-top">
          <h3>{product.name}</h3>
          <span>{normalizeCategory(product.category)}</span>
        </div>
        <p>{product.description}</p>
        <div className="sizes">
          {sizes.map((item) => <button key={item} onClick={() => setSize(item)} className={size === item ? "selected" : ""}>{item}</button>)}
        </div>
        <div className="product-bottom">
          <b>{formatPrice(product.price)}</b>
          <button onClick={() => addToCart(product, size)}>У кошик</button>
        </div>
      </div>
    </article>
  );
}

function CartItem({ item, changeQuantity, removeFromCart }) {
  return (
    <div className="cart-item">
      <img src={item.image} alt={item.name} />
      <div>
        <div className="cart-head">
          <section>
            <h3>{item.name}</h3>
            <p>Розмір: {item.size}</p>
            <b>{formatPrice(item.price)}</b>
          </section>
          <button onClick={() => removeFromCart(item.id, item.size)}>Видалити</button>
        </div>
        <div className="qty">
          <button onClick={() => changeQuantity(item.id, item.size, -1)}>−</button>
          <span>{item.quantity}</span>
          <button onClick={() => changeQuantity(item.id, item.size, 1)}>+</button>
        </div>
      </div>
    </div>
  );
}

function Page({ title, subtitle, children }) {
  return <section className="page"><h1>{title}</h1><p>{subtitle}</p><div>{children}</div></section>;
}

function Input({ label, value, onChange, type = "text" }) {
  return <label className="input"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Notice() {
  return <div className="notice">Товарів у наявності немає. Ми викуповуємо речі з Китаю індивідуально під замовлення. Доставка зазвичай займає 12–18 днів. Доставка доступна по всьому світу, крім Росії та Республіки Білорусь.</div>;
}

function Error({ text }) {
  return <div className="error">{text}</div>;
}

function Empty({ text }) {
  return <div className="empty">{text}</div>;
}

function Contact({ title, text, onClick, wide = false }) {
  return <button className={"contact " + (wide ? "wide" : "")} onClick={onClick}><h3>{title}</h3><p>{text}</p></button>;
}

function Stat({ title, value }) {
  return <div className="stat"><p>{title}</p><h3>{value}</h3></div>;
}

function AdminProduct({ product, deleteProduct }) {
  return <div className="admin-product"><img src={product.image} alt={product.name} /><div><b>{product.name}</b><p>{formatPrice(product.price)} · {normalizeCategory(product.category)}</p></div><button onClick={() => deleteProduct(product)}>Видалити</button></div>;
}

function Order({ order }) {
  return <div className="order"><div><b>{order.id}</b><span>{order.date}</span></div><p>{order.customer.name} · {order.customer.phone} · {order.customer.city}</p><section><span>{order.status}</span><p>Сума: {formatPrice(order.finalTotal)}</p></section></div>;
}
