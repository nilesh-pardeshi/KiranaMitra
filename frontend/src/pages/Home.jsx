import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Store, Package, Boxes, Truck, ShoppingCart, Users, BarChart3,
  Receipt, Wallet, ArrowRight, CheckCircle2, ShieldCheck, Menu, X,
  Sparkles, TrendingUp, LayoutDashboard, MoveUpRight
} from "lucide-react";
import "./Home.css";

const features = [
  { icon: Package, title: "Product Management", desc: "Keep products, categories, prices and variants organised.", color: "violet", link: "/products" },
  { icon: Boxes, title: "Smart Inventory", desc: "Monitor stock levels and identify items that need attention.", color: "green", link: "/inventory" },
  { icon: Truck, title: "Suppliers & Purchases", desc: "Manage supplier details and record incoming stock.", color: "orange", link: "/suppliers" },
  { icon: ShoppingCart, title: "Sales & Billing", desc: "Record sales and create clean digital invoices.", color: "blue", link: "/sales" },
  { icon: Users, title: "Customer Credit", desc: "Maintain customer credit and payment records.", color: "pink", link: "/customers" },
  { icon: BarChart3, title: "Business Reports", desc: "Review sales, purchases and store activity.", color: "amber", link: "/reports" },
];

const miniPhotos = [
  ["https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=240&q=75", "Fresh produce"],
  ["https://images.unsplash.com/photo-1543168256-418811576931?auto=format&fit=crop&w=240&q=75", "Grocery shelves"],
  ["https://images.unsplash.com/photo-1546549032-9571cd6b27df?auto=format&fit=crop&w=240&q=75", "Pasta and pantry"],
  ["https://images.unsplash.com/photo-1601593768796-1e4f3b3f8e3d?auto=format&fit=crop&w=240&q=75", "Fresh vegetables"],
  ["https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=240&q=75", "Fresh greens"],
  ["https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=240&q=75", "Pantry essentials"],
  ["https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?auto=format&fit=crop&w=240&q=75", "Fresh food"],
];

const mainImage = "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85";
const storeImage = "https://images.unsplash.com/photo-1604719312566-8912e9c8a213?auto=format&fit=crop&w=900&q=85";

function SectionTitle({ tag, title, description }) {
  return (
    <div className="km-section-title">
      <span className="km-eyebrow"><Sparkles size={14} />{tag}</span>
      <h2>{title}</h2>
      <p>{description}</p>
    </div>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const goTo = (id) => {
    setMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="home-page">
      <header className="km-header">
        <nav className="km-nav">
          <Link to="/" className="km-brand" onClick={() => setMenuOpen(false)}>
            <span className="km-brand-icon"><Store size={23} /></span>
            <span><strong>Kirana<span>Mitra</span></strong><small>SMART STORE MANAGEMENT</small></span>
          </Link>

          <div className="km-nav-links">
            <button onClick={() => goTo("features")}>Features</button>
            <button onClick={() => goTo("workflow")}>How it works</button>
            <button onClick={() => goTo("about")}>About</button>
          </div>

          <div className="km-nav-actions">
            <Link className="km-login" to="/login">Login</Link>
            <Link className="km-button km-button-small" to="/register">Get Started <ArrowRight size={16} /></Link>
          </div>

          <button className="km-menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu" aria-expanded={menuOpen}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </nav>
        {menuOpen && (
          <div className="km-mobile-menu">
            <button onClick={() => goTo("features")}>Features</button>
            <button onClick={() => goTo("workflow")}>How it works</button>
            <button onClick={() => goTo("about")}>About</button>
            <div><Link to="/login" onClick={() => setMenuOpen(false)}>Login</Link><Link to="/register" onClick={() => setMenuOpen(false)}>Create account</Link></div>
          </div>
        )}
      </header>

      <main>
        <section className="km-hero">
          <div className="km-hero-glow km-glow-one" />
          <div className="km-hero-glow km-glow-two" />
          <div className="km-hero-inner">
            <div className="km-hero-copy">
              <span className="km-eyebrow"><span className="km-live-dot" /> YOUR STORE. YOUR CONTROL.</span>
              <h1>Grow your store.<br /><span>Simplify every day.</span></h1>
              <p className="km-hero-description">Meet <strong>KiranaMitra</strong> — your digital partner for smarter kirana store management. Handle products, inventory, billing, purchases and customer credit in one organised place.</p>
              <div className="km-hero-actions">
                <Link to="/register" className="km-button">Start managing your store <ArrowRight size={18} /></Link>
                <button className="km-button km-button-light" onClick={() => goTo("features")}>Explore features <MoveUpRight size={17} /></button>
              </div>
              <div className="km-trust-points">
                <span><CheckCircle2 size={17} /> Easy to use</span>
                <span><ShieldCheck size={17} /> Organised records</span>
                <span><TrendingUp size={17} /> One platform</span>
              </div>
            </div>

            <div className="km-hero-visual">
              <div className="km-photo-halo" />
              <div className="km-main-photo-frame">
                <img className="km-main-photo" src={mainImage} alt="Fresh grocery produce" />
                <div className="km-photo-caption"><span>MADE FOR EVERYDAY STORES</span><strong>Everyday essentials,<br />beautifully organised.</strong></div>
              </div>
              <div className="km-floating-card km-float-top"><span className="km-float-icon green"><TrendingUp size={19} /></span><span><small>Store overview</small><strong>At a glance</strong></span></div>
              <div className="km-floating-card km-float-bottom"><span className="km-float-icon gold"><Wallet size={19} /></span><span><small>Customer credit</small><strong>Easy tracking</strong></span></div>
            </div>
          </div>
          <div className="km-photo-ribbon" aria-label="Grocery and fresh food gallery">
            {miniPhotos.map(([src, alt], index) => <div className="km-mini-photo" key={alt}><img src={src} alt={alt} loading="lazy" /><span>{String(index + 1).padStart(2, "0")}</span></div>)}
          </div>
        </section>

        <section className="km-feature-section" id="features">
          <div className="km-container">
            <SectionTitle tag="EVERYTHING IN ONE PLACE" title={<>Tools to run your store <em>better.</em></>} description="Bring your daily store activities together with simple, practical tools." />
            <div className="km-feature-grid">
              {features.map(({ icon: Icon, title, desc, color, link }) => (
                <Link to="/login" className="km-feature-card" key={title}>
                  <div className={`km-feature-icon ${color}`}><Icon size={23} /></div>
                  <span className="km-card-arrow"><ArrowRight size={17} /></span>
                  <h3>{title}</h3><p>{desc}</p>
                  <span className="km-feature-link">Explore feature <ArrowRight size={15} /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="km-workflow-section" id="workflow">
          <div className="km-container km-workflow-layout">
            <div className="km-workflow-photo">
              <img src={storeImage} alt="Well organised grocery store shelves" loading="lazy" />
              <div className="km-photo-note"><LayoutDashboard size={20} /><span><strong>Your store, in sync</strong><small>One workspace for everyday operations</small></span></div>
            </div>
            <div className="km-workflow-copy">
              <span className="km-eyebrow"><Sparkles size={14} /> SIMPLE BY DESIGN</span>
              <h2>Less confusion.<br /><em>More control.</em></h2>
              <p>Start with your store details, manage daily transactions and keep track of your business from one place.</p>
              <div className="km-steps">
                <div><b>01</b><span><strong>Set up your store</strong><small>Create your account and organise store information.</small></span></div>
                <div><b>02</b><span><strong>Manage daily operations</strong><small>Add products, inventory, suppliers and customers.</small></span></div>
                <div><b>03</b><span><strong>Track your business</strong><small>Record sales and review reports when needed.</small></span></div>
              </div>
              <Link to="/register" className="km-text-link">Get started today <ArrowRight size={17} /></Link>
            </div>
          </div>
        </section>

        <section className="km-about-section" id="about">
          <div className="km-container km-about-inner">
            <div><span className="km-eyebrow km-eyebrow-light"><Sparkles size={14} /> BUILT FOR EVERYDAY BUSINESS</span><h2>Your store deserves<br /><em>a smarter system.</em></h2><p>From product entry to customer payments, KiranaMitra helps keep your records clear and your everyday work organised.</p><Link to="/register" className="km-button km-button-gold">Create your account <ArrowRight size={17} /></Link></div>
            <div className="km-about-grid">
              <div><Package size={21} /><strong>Products</strong><small>Manage your catalogue</small></div>
              <div><Receipt size={21} /><strong>Invoices</strong><small>Create digital bills</small></div>
              <div><Wallet size={21} /><strong>Customer credit</strong><small>Track outstanding balances</small></div>
              <div><BarChart3 size={21} /><strong>Reports</strong><small>Review business data</small></div>
            </div>
          </div>
        </section>

        <section className="km-final-cta">
          <div className="km-container km-cta-inner"><span className="km-cta-icon"><Store size={25} /></span><div><h2>Ready to make your store smarter?</h2><p>Bring your store operations together with KiranaMitra.</p></div><div className="km-cta-actions"><Link to="/register" className="km-button">Create account <ArrowRight size={17} /></Link><Link to="/login" className="km-cta-login">Already registered? Login</Link></div></div>
        </section>
      </main>

      <footer className="km-footer">
        <div className="km-container km-footer-inner">
          <Link to="/" className="km-brand km-footer-brand"><span className="km-brand-icon"><Store size={21} /></span><span><strong>Kirana<span>Mitra</span></strong><small>SMART STORE MANAGEMENT</small></span></Link>
          <p>A smarter, more organised way to manage your everyday kirana store.</p>
          <div className="km-footer-links"><button onClick={() => goTo("features")}>Features</button><button onClick={() => goTo("workflow")}>How it works</button><Link to="/login">Login</Link><Link to="/register">Create account</Link></div>
          <small className="km-copyright">© {new Date().getFullYear()} KiranaMitra. Built for everyday business.</small>
        </div>
      </footer>
    </div>
  );
}
