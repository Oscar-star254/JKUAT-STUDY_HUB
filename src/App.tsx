import { useMemo, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  CreditCard,
  Heart,
  HelpCircle,
  Leaf,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  Shirt,
  Sparkles,
  Star,
  Truck,
  UserRound,
  WashingMachine,
  X,
} from 'lucide-react';

const servedZips = [
  '33549', '33602', '33603', '33604', '33605', '33609', '33610', '33612',
  '33613', '33615', '33617', '33618', '33624', '33625', '33629', '33637', '33647',
];

const areas = [
  ['USF / University Area', '33612, 33613, 33617', 'Mon · Wed · Fri'],
  ['Temple Terrace', '33617, 33637', 'Tue · Thu · Sat'],
  ['Carrollwood', '33618, 33624', 'Mon · Wed · Sat'],
  ['Seminole & Tampa Heights', '33602, 33603, 33604', 'Every weekday'],
  ['Downtown & Ybor City', '33602, 33605', 'Every weekday'],
  ["Town 'n' Country & Citrus Park", '33615, 33625', 'Tue · Thu · Sat'],
];

const steps = [
  { icon: CalendarDays, title: 'Book in 2 minutes', body: 'Choose a pickup window that fits your day. We’ll confirm everything by text.' },
  { icon: PackageCheck, title: 'We pick it up', body: 'A background-checked driver tags and photo-verifies every bag at your door.' },
  { icon: WashingMachine, title: 'We wash with care', body: 'Your laundry stays separate, is washed to your preferences, and neatly folded.' },
  { icon: Truck, title: 'Fresh to your door', body: 'Track your order and get fresh, folded laundry back in about 48 hours.' },
];

const reviews = [
  { name: 'Maya R.', detail: 'USF graduate student', quote: 'Pickup was right on time and every shirt came back perfectly folded. I got my whole Sunday back.', initials: 'MR' },
  { name: 'Daniel K.', detail: 'Carrollwood', quote: 'The photo updates made the whole process feel incredibly safe. Friendly, local, and worth every penny.', initials: 'DK' },
  { name: 'Alyssa P.', detail: 'Downtown Tampa', quote: 'I love that I can choose fragrance-free detergent. The weekly plan has been a lifesaver.', initials: 'AP' },
];

type Booking = {
  zip: string;
  phone: string;
  day: string;
  window: string;
  detergent: string;
  paymentMethod: 'Paystack' | 'PayPal' | 'Card';
};

function Button({
  children,
  className = '',
  variant = 'primary',
  onClick,
  type = 'button',
  disabled = false,
}: {
  children: React.ReactNode;
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  onClick?: () => void;
  type?: 'button' | 'submit';
  disabled?: boolean;
}) {
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`btn btn-${variant} ${className}`}>
      {children}
    </button>
  );
}

function Logo() {
  return (
    <a className="logo" href="#top" aria-label="Tampa Fresh home">
      <span className="logo-mark"><Sparkles size={21} strokeWidth={2.5} /></span>
      <span>Tampa<span>Fresh</span></span>
    </a>
  );
}

function Header({ onBook, onTrack }: { onBook: () => void; onTrack: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <div className="contact-strip">
        <div className="shell contact-inner">
          <span><MapPin size={14} /> 1427 E. Fowler Ave, Tampa, FL 33612</span>
          <span className="contact-right"><a href="tel:+12038950187"><Phone size={14} /> +1 (203) 895-0187</a> <i /> Mon–Sat, 7am–8pm</span>
        </div>
      </div>
      <header className="site-header">
        <div className="shell header-inner">
          <Logo />
          <nav className={`nav-links ${open ? 'open' : ''}`} aria-label="Main navigation">
            <a href="#how" onClick={() => setOpen(false)}>How it works</a>
            <a href="#pricing" onClick={() => setOpen(false)}>Pricing</a>
            <a href="#areas" onClick={() => setOpen(false)}>Service areas</a>
            <a href="#reviews" onClick={() => setOpen(false)}>Reviews</a>
            <button className="nav-track" onClick={onTrack}>Track an order</button>
            <Button onClick={onBook}>Book a pickup <ArrowRight size={17} /></Button>
          </nav>
          <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
    </>
  );
}

function TrustBar() {
  const trust = [
    [ShieldCheck, 'Insured & bonded'],
    [UserRound, 'Background-checked drivers'],
    [PackageCheck, 'Photo-verified pickups'],
    [Heart, '100% satisfaction promise'],
  ] as const;
  return (
    <div className="trust-bar">
      <div className="shell trust-grid">
        {trust.map(([Icon, label]) => <div key={label}><Icon size={20} /><span>{label}</span></div>)}
      </div>
    </div>
  );
}

function ZipChecker({ initial = '', onSuccess }: { initial?: string; onSuccess?: (zip: string) => void }) {
  const [zip, setZip] = useState(initial);
  const [result, setResult] = useState<'yes' | 'no' | null>(null);
  function check(e: React.FormEvent) {
    e.preventDefault();
    const clean = zip.replace(/\D/g, '').slice(0, 5);
    setZip(clean);
    const yes = servedZips.includes(clean);
    setResult(yes ? 'yes' : 'no');
    if (yes) onSuccess?.(clean);
  }
  return (
    <div>
      <form className="zip-form" onSubmit={check}>
        <MapPin size={20} />
        <input aria-label="ZIP code" inputMode="numeric" maxLength={5} placeholder="Enter your ZIP code" value={zip} onChange={e => setZip(e.target.value)} />
        <button type="submit">Check availability <ArrowRight size={17} /></button>
      </form>
      {result && (
        <p className={`zip-result ${result}`}>
          {result === 'yes' ? <><CheckCircle2 size={18} /> Great news—we pick up in your neighborhood!</> : <>We’re not there yet. Call us and we’ll see how we can help.</>}
        </p>
      )}
    </div>
  );
}

function Hero({ onBook }: { onBook: () => void }) {
  return (
    <main id="top">
      <section className="hero">
        <div className="hero-blob" />
        <div className="shell hero-grid">
          <div className="hero-copy">
            <div className="eyebrow"><Star size={15} fill="currentColor" /> Tampa’s trusted local laundry team</div>
            <h1>Fresh laundry.<br /><em>More time for you.</em></h1>
            <p className="hero-lede">We pick up, wash, dry, fold, and deliver your laundry right back to your door. Thoughtful care from real people, right here in Tampa.</p>
            <ZipChecker onSuccess={() => setTimeout(onBook, 550)} />
            <div className="hero-note">
              <span className="avatar-stack"><b>AM</b><b>JK</b><b>LP</b></span>
              <span><strong>4.9 from 380+ Tampa neighbors</strong><br />No hidden fees · Satisfaction guaranteed</span>
            </div>
          </div>
          <div className="hero-visual">
            <div className="photo-frame">
              <img src="https://images.unsplash.com/photo-1742485245446-8f7253cced72?auto=format&fit=crop&w=1100&q=85" alt="Friendly laundry specialist folding clean clothes" />
            </div>
            <div className="float-card order-float">
              <span className="float-icon"><Truck size={21} /></span>
              <span><small>YOUR ORDER</small><strong>Out for delivery</strong><em><i /> Arriving by 4:15pm</em></span>
            </div>
            <div className="float-card guarantee-float">
              <ShieldCheck size={25} />
              <span><strong>Freshness promised</strong><small>Or we’ll re-wash it free</small></span>
            </div>
            <div className="dots dots-one" /><div className="dots dots-two" />
          </div>
        </div>
      </section>
      <TrustBar />
    </main>
  );
}

function HowItWorks() {
  return (
    <section className="section how" id="how">
      <div className="shell">
        <div className="section-heading centered">
          <span className="kicker">So easy, it feels like magic</span>
          <h2>From hamper to happy in four steps</h2>
          <p>We handle the laundry. You keep the time.</p>
        </div>
        <div className="steps">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return <article className="step" key={step.title}>
              <div className="step-number">0{index + 1}</div>
              <div className="step-icon"><Icon size={28} /></div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
              {index < steps.length - 1 && <ChevronRight className="step-arrow" />}
            </article>;
          })}
        </div>
        <div className="tracking-note"><div><PackageCheck size={24} /></div><p><strong>Never wonder where your laundry is.</strong> Follow every step in real time, with a photo at pickup and delivery.</p><a href="#pricing">See how tracking works <ArrowRight size={16} /></a></div>
      </div>
    </section>
  );
}

function Pricing({ onBook }: { onBook: () => void }) {
  const [pounds, setPounds] = useState(20);
  const [rush, setRush] = useState(false);
  const total = Math.max(35, pounds * 2.15) + (rush ? 15 : 0);
  return (
    <section className="section pricing" id="pricing">
      <div className="shell pricing-grid">
        <div className="pricing-copy">
          <span className="kicker">Simple, honest pricing</span>
          <h2>Only pay for what’s in the bag</h2>
          <p>One clear per-pound price includes pickup, washing, drying, folding, and delivery. We weigh everything at our store and confirm your total before charging.</p>
          <ul className="check-list">
            <li><Check /> Your choice of premium detergent</li>
            <li><Check /> Whites and colors separated</li>
            <li><Check /> Neatly folded to fit your drawers</li>
            <li><Check /> Free pickup and delivery over $35</li>
          </ul>
          <div className="first-order"><span>NEW NEIGHBOR OFFER</span><strong>$35 for your first order</strong><small>Up to 20 lbs · Use code <b>FRESH35</b></small></div>
        </div>
        <div className="estimator-card">
          <div className="estimate-head"><div><span>Wash & fold</span><strong>$2.15 <small>/ lb</small></strong></div><div className="popular">MOST POPULAR</div></div>
          <hr />
          <label>About how much laundry?</label>
          <div className="weight-picker">
            <button onClick={() => setPounds(Math.max(10, pounds - 5))} aria-label="Remove 5 pounds"><Minus size={18} /></button>
            <div><strong>{pounds} lbs</strong><span>About {Math.ceil(pounds / 10)} full bag{pounds > 10 ? 's' : ''}</span></div>
            <button onClick={() => setPounds(Math.min(60, pounds + 5))} aria-label="Add 5 pounds"><Plus size={18} /></button>
          </div>
          <div className="toggle-row"><span><Clock3 size={20} /><i><strong>24-hour rush</strong><small>Get it back tomorrow</small></i></span><button onClick={() => setRush(!rush)} className={`switch ${rush ? 'on' : ''}`} aria-label="Toggle rush service"><b /></button></div>
          <div className="total-row"><span>Estimated total<small>Final price based on actual weight</small></span><strong>${total.toFixed(2)}</strong></div>
          <Button className="full" onClick={onBook}>Schedule my pickup <ArrowRight size={18} /></Button>
          <p className="secure"><ShieldCheck size={15} /> Secure checkout with card, Paystack, or PayPal</p>
        </div>
      </div>
    </section>
  );
}

function Areas() {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? areas : areas.slice(0, 4);
  return (
    <section className="section areas" id="areas">
      <div className="shell">
        <div className="areas-header">
          <div className="section-heading"><span className="kicker">Proudly local</span><h2>Made for Tampa neighborhoods</h2><p>Local drivers, familiar streets, and pickup windows that work for your neighborhood.</p></div>
          <ZipChecker />
        </div>
        <div className="area-grid">
          {shown.map(([name, zips, days]) => <article className="area-card" key={name}>
            <div className="area-pin"><MapPin size={21} /></div><div><h3>{name}</h3><p>{zips}</p><span><CalendarDays size={14} /> {days}</span></div><ChevronRight size={20} />
          </article>)}
        </div>
        <button className="show-all" onClick={() => setExpanded(!expanded)}>{expanded ? 'Show fewer areas' : 'View all service areas'} <ChevronDown size={18} className={expanded ? 'rotated' : ''} /></button>
      </div>
    </section>
  );
}

function Reviews() {
  return (
    <section className="section reviews" id="reviews">
      <div className="shell">
        <div className="section-heading centered"><span className="kicker">Laundry day, loved</span><h2>Your neighbors say it best</h2><div className="rating-line"><span>★★★★★</span><strong>4.9</strong> from 380+ verified customers</div></div>
        <div className="review-grid">
          {reviews.map(review => <article className="review-card" key={review.name}><div className="stars">★★★★★</div><blockquote>“{review.quote}”</blockquote><div className="reviewer"><span>{review.initials}</span><p><strong>{review.name}</strong><small>{review.detail} · Verified customer</small></p><CheckCircle2 size={18} /></div></article>)}
        </div>
      </div>
    </section>
  );
}

function OwnerStory({ onBook }: { onBook: () => void }) {
  return (
    <section className="owner-section">
      <div className="shell owner-grid">
        <div className="owner-photo"><img src="/delivery-pickup.jpeg" alt="Laundry delivery driver collecting a linen bag from a family at their front door" /><span><Truck size={18} /> Friendly doorstep pickup</span></div>
        <div className="owner-copy"><span className="kicker">From our family to yours</span><h2>Laundry care with a real local team behind it</h2><p>Hi, I’m <strong>Elena, owner of TampaFresh.</strong> We opened our Fowler Avenue laundromat because Tampa deserved a laundry service that felt personal, safe, and genuinely helpful.</p><p>Every order is cleaned right here in our own facility—never sent to a third party. My team and I treat your clothes like we treat our own.</p><div className="signature">Elena Morales <span>Owner & Tampa neighbor</span></div><Button variant="secondary" onClick={onBook}>Meet our team <ArrowRight size={17} /></Button></div>
      </div>
    </section>
  );
}

function FAQ() {
  const questions = [
    ['How quickly will I get my laundry back?', 'Most orders are returned within 48 hours. Choose 24-hour rush at checkout if you need it sooner.'],
    ['Is my laundry washed with other customers’ clothes?', 'Never. Every order is tagged and kept completely separate from check-in through delivery.'],
    ['What if I have sensitive skin or allergies?', 'Choose fragrance-free, hypoallergenic detergent and no dryer sheets during booking at no extra charge.'],
    ['What happens if something is damaged?', 'Tell us within 48 hours. We’ll make it right under our clear damage and loss policy—no runaround.'],
  ];
  const [open, setOpen] = useState(0);
  return (
    <section className="section faq"><div className="shell faq-grid"><div><span className="kicker">Good questions, clear answers</span><h2>Everything you need to know</h2><p>Can’t find your answer? Our Tampa team is happy to help.</p><a className="text-link" href="tel:+12038950187"><Phone size={17} /> Call +1 (203) 895-0187</a></div><div className="accordion">{questions.map(([q, a], i) => <article className={open === i ? 'open' : ''} key={q}><button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><Plus /></button>{open === i && <p>{a}</p>}</article>)}</div></div></section>
  );
}

function Footer({ onBook }: { onBook: () => void }) {
  return (
    <>
      <section className="cta"><div className="shell cta-inner"><div><span>Ready when you are</span><h2>Take laundry off your list this week.</h2><p>Your first pickup is just $35. No subscription required.</p></div><Button onClick={onBook}>Book my first pickup <ArrowRight size={18} /></Button></div></section>
      <footer><div className="shell footer-grid"><div><Logo /><p>Fresh laundry, picked up and delivered by people you can trust.</p><div className="social-proof"><strong>★★★★★ 4.9</strong><span>380+ happy Tampa customers</span></div></div><div><strong>Explore</strong><a href="#how">How it works</a><a href="#pricing">Services & pricing</a><a href="#areas">Service areas</a><a href="#reviews">Reviews</a></div><div><strong>Trust & help</strong><a href="#reviews">Trust center</a><a href="#faq">FAQs</a><a href="mailto:hello@tampafresh.com">Contact us</a><a href="#top">Policies & guarantee</a></div><div><strong>Visit or call</strong><p>1427 E. Fowler Avenue<br />Tampa, FL 33612</p><a href="tel:+12038950187">+1 (203) 895-0187</a><a href="https://wa.me/12038950187" target="_blank" rel="noreferrer">Message us on WhatsApp</a><a href="mailto:hello@tampafresh.com">hello@tampafresh.com</a><p>Mon–Sat 7am–8pm<br />Sunday 8am–6pm</p></div></div><div className="shell footer-bottom"><span>© 2025 TampaFresh Laundry Co.</span><span>Secure payments by card, Paystack & PayPal · Insured & bonded</span></div></footer>
    </>
  );
}

function BookingModal({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(1);
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'setup-required'>('idle');
  const [deposit, setDeposit] = useState(10);
  const [booking, setBooking] = useState<Booking>({ zip: '33612', phone: '', day: 'Tomorrow', window: '8am – 11am', detergent: 'Fresh linen', paymentMethod: 'Paystack' });
  const valid = servedZips.includes(booking.zip);
  const phoneValid = /^\d{10}$/.test(booking.phone);
  function verifyPaymentAndSubmit() {
    // Do not create a booking until a real provider transaction has been verified.
    // Merchant credentials and server-side webhook verification will be connected later.
    setPaymentStatus('setup-required');
  }
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true" aria-label="Book a pickup">
      <div className="modal">
        <button className="close" onClick={onClose}><X /></button>
        <div className="modal-title"><span>Step {step} of 3</span><h2>{step === 1 ? 'Where should we pick up?' : step === 2 ? 'Choose your pickup time' : 'Preferences & deposit'}</h2><p>{step === 1 ? 'First, let’s make sure we serve your neighborhood.' : step === 2 ? 'We’ll text when your driver is on the way.' : 'Choose your laundry preferences and secure the pickup with a deposit.'}</p></div>
        <div className="progress"><i className={step >= 1 ? 'active' : ''} /><i className={step >= 2 ? 'active' : ''} /><i className={step >= 3 ? 'active' : ''} /></div>
        {step === 1 && <div className="form-page"><label>Pickup ZIP code<input value={booking.zip} maxLength={5} onChange={e => setBooking({ ...booking, zip: e.target.value.replace(/\D/g, '') })} /></label>{booking.zip.length === 5 && <p className={`availability ${valid ? 'valid' : 'invalid'}`}>{valid ? <><CheckCircle2 /> We pick up here! Free delivery included.</> : <>We don’t currently serve this ZIP.</>}</p>}<label>Contact phone number<div className="phone-input"><span>+1</span><input aria-label="US phone number" inputMode="tel" autoComplete="tel-national" maxLength={10} placeholder="2038950187" value={booking.phone} onChange={e => setBooking({ ...booking, phone: e.target.value.replace(/\D/g, '').slice(0, 10) })} /></div></label>{booking.phone.length > 0 && <p className={`phone-hint ${phoneValid ? 'valid' : ''}`}>{phoneValid ? <><CheckCircle2 /> Contact number: +1 {booking.phone}</> : 'Enter the 10 digits after +1.'}</p>}<label>Street address<input placeholder="123 Your Street" /></label><label>Apartment or unit <small>Optional</small><input placeholder="Apt 4B" /></label></div>}
        {step === 2 && <div className="form-page"><label>Pickup day</label><div className="choice-grid">{['Tomorrow', 'Wednesday', 'Thursday'].map(day => <button className={booking.day === day ? 'selected' : ''} onClick={() => setBooking({ ...booking, day })} key={day}><CalendarDays /> <strong>{day}</strong><span>{day === 'Tomorrow' ? 'Jun 17' : day === 'Wednesday' ? 'Jun 18' : 'Jun 19'}</span></button>)}</div><label>Time window</label><div className="time-grid">{['8am – 11am', '12pm – 3pm', '5pm – 8pm'].map(window => <button className={booking.window === window ? 'selected' : ''} onClick={() => setBooking({ ...booking, window })} key={window}><Clock3 /> {window}</button>)}</div></div>}
        {step === 3 && <div className="form-page"><label>Detergent preference</label><div className="detergent-grid">{['Fresh linen', 'Fragrance-free', 'Hypoallergenic'].map(detergent => <button className={booking.detergent === detergent ? 'selected' : ''} onClick={() => setBooking({ ...booking, detergent })} key={detergent}>{detergent === 'Fresh linen' ? <Sparkles /> : <Leaf />}<strong>{detergent}</strong><small>No extra charge</small></button>)}</div><label>Special instructions <small>Optional</small><textarea placeholder="Gate code, leave at door, dog on property…" /></label><div className="deposit-panel"><div className="deposit-copy"><span><CircleDollarSign /> Pickup deposit</span><small>$10 minimum · Adjust in $1 increments</small></div><div className="deposit-picker"><button onClick={() => setDeposit(Math.max(10, deposit - 1))} disabled={deposit === 10} aria-label="Decrease deposit by one dollar"><Minus /></button><strong>${deposit}</strong><button onClick={() => setDeposit(Math.min(35, deposit + 1))} disabled={deposit === 35} aria-label="Increase deposit by one dollar"><Plus /></button></div></div><label>Payment method</label><div className="payment-grid">{(['Paystack', 'PayPal', 'Card'] as const).map(method => <button className={booking.paymentMethod === method ? 'selected' : ''} onClick={() => { setBooking({ ...booking, paymentMethod: method }); setPaymentStatus('idle'); }} key={method}><CreditCard /><strong>{method}</strong><small>{method === 'Card' ? 'Visa or Mastercard' : `Pay securely with ${method}`}</small></button>)}</div><div className="booking-total"><span><CircleDollarSign /> Order estimate</span><strong>$35.00</strong></div><p className={`payment-verification ${paymentStatus}`}><ShieldCheck /> {paymentStatus === 'setup-required' ? `${booking.paymentMethod} merchant account details are still required. No booking was submitted.` : 'Payment is required. Your booking will only be submitted after the provider verifies your deposit.'}</p><p className="deposit-note">Your deposit is applied to the final total. You’ll only pay the remaining balance after your laundry is weighed.</p></div>}
        <div className="modal-actions">{step > 1 && <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>}<Button className="next" disabled={step === 1 && (!valid || !phoneValid)} onClick={() => step < 3 ? setStep(step + 1) : verifyPaymentAndSubmit()}>{step < 3 ? <>Continue <ArrowRight size={18} /></> : paymentStatus === 'setup-required' ? <>Payment setup required</> : <>Pay ${deposit} deposit <ShieldCheck size={18} /></>}</Button></div>
      </div>
    </div>
  );
}

function TrackingModal({ onClose }: { onClose: () => void }) {
  const stages = ['Booked', 'Picked up', 'Received', 'Washing', 'Ready', 'Out for delivery', 'Delivered'];
  return (
    <div className="modal-wrap" role="dialog" aria-modal="true">
      <div className="modal tracking-modal"><button className="close" onClick={onClose}><X /></button><span className="kicker">Order TF-1842</span><h2>Your laundry is on its way</h2><p>Driver Marcus is headed to you. Estimated arrival: <strong>4:15pm</strong></p><div className="driver-card"><span>MJ</span><div><strong>Marcus J.</strong><small>Your delivery driver · 4.9 ★</small></div><a href="https://wa.me/12038950187" target="_blank" rel="noreferrer" aria-label="Message driver on WhatsApp"><MessageCircle /></a><a href="tel:+12038950187" aria-label="Call driver"><Phone /></a></div><div className="timeline">{stages.map((stage, i) => <div className={i <= 5 ? 'complete' : ''} key={stage}><i>{i < 5 ? <Check /> : i === 5 ? <Truck /> : <span />}</i><p><strong>{stage}</strong><small>{i < 5 ? ['Mon, 8:42am', 'Mon, 10:16am', 'Mon, 11:02am', 'Mon, 1:30pm', 'Tue, 2:10pm'][i] : i === 5 ? 'Today, 3:48pm' : 'Expected by 4:15pm'}</small></p></div>)}</div><div className="photo-proof"><PackageCheck /><span><strong>Photo verified at pickup</strong><small>Your 2 bags were tagged and photographed.</small></span><ChevronRight /></div></div>
    </div>
  );
}

export default function App() {
  const [booking, setBooking] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [help, setHelp] = useState(false);
  const content = useMemo(() => <>
    <Header onBook={() => setBooking(true)} onTrack={() => setTracking(true)} />
    <Hero onBook={() => setBooking(true)} />
    <HowItWorks />
    <Pricing onBook={() => setBooking(true)} />
    <Areas />
    <Reviews />
    <OwnerStory onBook={() => setBooking(true)} />
    <FAQ />
    <Footer onBook={() => setBooking(true)} />
  </>, []);
  return <div>{content}{booking && <BookingModal onClose={() => setBooking(false)} />}{tracking && <TrackingModal onClose={() => setTracking(false)} />}<div className={`help-widget ${help ? 'open' : ''}`}>{help && <div className="help-menu"><strong>How can we help?</strong><a href="tel:+12038950187"><Phone /> Call +1 (203) 895-0187</a><a href="https://wa.me/12038950187" target="_blank" rel="noreferrer"><MessageCircle /> WhatsApp us</a><a href="mailto:hello@tampafresh.com"><HelpCircle /> Email support</a></div>}<button onClick={() => setHelp(!help)}>{help ? <X /> : <MessageCircle />}<span>{help ? 'Close' : 'Need help?'}</span></button></div></div>;
}
