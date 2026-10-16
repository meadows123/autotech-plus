"""Generate services.html, faq.html, contact.html and sync the shared header/footer into index.html."""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PHONE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"/></svg>'
ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
EMAIL = 'info@autotechplus.co.uk'
FACEBOOK = 'https://www.facebook.com/autotechplusltd/'

GEARBOX = 'bristolgearbox/'  # Bristol Gearbox section; also served on its own domain (see tools/gen_gearbox.py)

NAV = [('Services', 'services.html', 'services'), ('MOT', 'services.html#mot', None), ('Gearbox', GEARBOX, None), ('About', 'index.html#about', None),
       ('Reviews', 'index.html#reviews', None), ('FAQ', 'faq.html', 'faq'), ('Contact', 'contact.html', 'contact')]


def head(title, desc, extra=''):
    return f'''<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <meta name="theme-color" content="#0d0f14">
  <link rel="icon" href="assets/ico32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="assets/ico180.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="css/styles.css">{extra}
</head>
<body class="subpage">
'''


def header(current):
    links = '\n'.join(
        f'        <a href="{href}"{" class=\"is-current\" aria-current=\"page\"" if key is not None and key == current else ""}>{label}</a>'
        for label, href, key in NAV)
    return f'''
  <!-- ============ NAV ============ -->
  <header class="nav" id="nav">
    <div class="wrap nav__inner">
      <a href="index.html" class="nav__logo" aria-label="AutoTech Plus home">
        <img src="assets/logo-autotech.png" alt="AutoTech Plus Ltd" width="300" height="44">
      </a>
      <nav class="nav__links" aria-label="Main">
{links}
      </nav>
      <div class="nav__cta">
        <a class="nav__phone" href="tel:+441173292050">
          {PHONE_SVG}
          0117 329 2050
        </a>
        <a class="btn btn--primary btn--sm" href="#book" data-book>Book MOT</a>
        <button class="nav__burger" id="burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
      </div>
    </div>
  </header>
'''


FOOTER = f'''
  <!-- ============ FOOTER ============ -->
  <footer class="footer">
    <div class="wrap footer__grid">
      <div class="footer__brand">
        <img src="assets/logo-autotech.png" alt="AutoTech Plus Ltd" width="220" height="32">
        <p>Independent MOT, servicing and repair centre in Brislington, Bristol. Over 15 years in the trade.</p>
        <a class="footer__social" href="{FACEBOOK}" target="_blank" rel="noopener" aria-label="AutoTech Plus on Facebook">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z"/></svg>
          Follow us on Facebook
        </a>
      </div>
      <div>
        <h4>Services</h4>
        <a href="services.html#mot">MOT testing</a><a href="services.html#servicing">Servicing</a><a href="services.html#diagnostics">Diagnostics</a><a href="{GEARBOX}">Gearbox repair</a><a href="services.html#brakes">Brakes &amp; clutch</a><a href="services.html#remapping">ECU remapping</a>
      </div>
      <div>
        <h4>Company</h4>
        <a href="index.html#about">About us</a><a href="index.html#reviews">Reviews</a><a href="faq.html">FAQ</a><a href="contact.html">Contact</a><a href="#book" data-book>Book an MOT</a>
      </div>
      <div>
        <h4>Visit us</h4>
        <p>8 Bonville Rd, Brislington<br>Bristol BS4 5NZ</p>
        <p><a href="tel:+441173292050">0117 329 2050</a><br><a href="mailto:{EMAIL}">{EMAIL}</a></p>
        <p class="footer__hours">Mon&ndash;Thu 8:00&ndash;17:00<br>Fri 8:00&ndash;16:30 &middot; Sat&ndash;Sun closed</p>
      </div>
    </div>
    <div class="wrap footer__base">
      <span>&copy; <span id="year">2026</span> AutoTech Plus Ltd. All rights reserved.</span>
      <span>8 Bonville Rd, Bristol BS4 5NZ</span>
    </div>
  </footer>

  <a class="fab" href="tel:+441173292050" aria-label="Call AutoTech Plus">
    {PHONE_SVG}
  </a>
'''

MOT_BAND = f'''
  <!-- ============ MOT CTA ============ -->
  <section class="mot">
    <div class="wrap mot__inner">
      <div>
        <p class="kicker kicker--dark">M.O.T. Testing</p>
        <h2>Is your MOT due?<br>Book it in today.</h2>
        <p>Enter your reg and pick a date and time that suits you. It takes under a minute.</p>
      </div>
      <form class="mot__form">
        <label class="reg">
          <span class="reg__flag">GB</span>
          <input type="text" placeholder="ENTER REG" maxlength="8" aria-label="Vehicle registration">
        </label>
        <button class="btn btn--dark" type="submit">Choose a date &amp; time</button>
      </form>
    </div>
  </section>
'''


def page_hero(crumb, title, lead, image, actions=''):
    return f'''
  <!-- ============ PAGE HERO ============ -->
  <section class="page-hero">
    <div class="page-hero__bg" style="background-image: url('assets/pages/{image}')" aria-hidden="true"></div>
    <div class="wrap page-hero__inner">
      <nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Home</a><span>/</span><span aria-current="page">{crumb}</span></nav>
      <h1>{title}</h1>
      <p class="page-hero__lead">{lead}</p>
      {actions}
    </div>
  </section>
'''


def scripts(extra=''):
    return f'''
  <script src="js/main.js" defer></script>
  <script src="js/booking.js" defer></script>{extra}
</body>
</html>
'''


# ---------------------------------------------------------------- services
SERVICES = [
    dict(id='mot', name='MOT testing', img='mot', short='MOT',
         intro=['A yearly check that your car is safe and legal. We test it properly and explain anything that needs doing in plain English.'],
         steps=[('Book in', 'Pick a date and time online. It takes under a minute.'),
                ('We test it', 'Lights, brakes, tyres, steering and more, checked against the official standard.'),
                ('You’re done', 'Pass and you get your certificate straight away. Fail and we tell you why, and what it costs to fix.')],
         cta=('Book your MOT', '#book" data-book="')),
    dict(id='servicing', name='Servicing', img='servicing', short='Servicing',
         intro=['Regular servicing keeps your car running smoothly, heads off bigger repair bills and helps it hold its value.'],
         steps=[('We check it over', 'A full look at your car before we start, so nothing gets missed.'),
                ('We service it', 'Oil, filters, fluids, brakes and tyres, done to your car maker’s schedule.'),
                ('We tell you how it’s doing', 'Anything coming up soon, so there are no surprises later.')],
         cta=('Get a service quote', 'contact.html?service=servicing')),
    dict(id='diagnostics', name='Diagnostics', img='diagnostics', short='Diagnostics',
         intro=['Warning light on or a noise you don’t like? We find out exactly what’s wrong before anything gets replaced.'],
         steps=[('Tell us what’s happening', 'What you’ve noticed and when it happens. It all helps.'),
                ('We find the cause', 'We plug into your car’s computer and check the parts by hand.'),
                ('We explain it', 'A straight answer and a clear price before any work starts.')],
         cta=('Book diagnostics', 'contact.html?service=diagnostics')),
    dict(id='gearbox', name='Gearbox repair', img='gearbox', short='Gearbox',
         intro=['Jerky gear changes, slipping or a gearbox warning light? We repair manual and automatic gearboxes, and we’re specialists in Powershift and DSG. Our gearbox team also trades as <a class="accent" href="bristolgearbox/">Bristol Gearbox</a>.'],
         steps=[('Find the fault', 'We test the gearbox to pinpoint exactly what’s wrong.'),
                ('Repair or rebuild', 'We only replace what needs replacing, so you don’t pay for more than you need.'),
                ('Back on the road', 'Every gearbox repair comes with a warranty.')],
         cta=('Visit Bristol Gearbox', GEARBOX)),
    dict(id='brakes', name='Brakes & clutch', img='brakes', short='Brakes & clutch',
         intro=['Squealing brakes, a soft pedal or a clutch that slips? Don’t leave it. We’ll check them and fix what’s needed.'],
         steps=[('We check them', 'Pads, discs, fluid and clutch, all inspected before any work starts.'),
                ('We replace what’s worn', 'Only the parts that need it, with a price agreed up front.'),
                ('We test drive it', 'So you know it stops and changes gear exactly as it should.')],
         cta=('Get a quote', 'contact.html?service=brakes')),
    dict(id='remapping', name='ECU remapping', img='remapping', short='Remapping',
         intro=['Remapping fine-tunes your engine’s settings for more power and, often, better fuel economy.'],
         steps=[('Health check', 'We make sure your car is in good shape before we change anything.'),
                ('Remap', 'We adjust the engine settings safely, to suit your car.'),
                ('Feel the difference', 'We talk you through what’s changed and how it drives.')],
         cta=('Ask about remapping', 'contact.html?service=remapping')),
    dict(id='steering', name='Suspension & steering', img='steering', short='Suspension',
         intro=['Knocks over bumps, the car pulling to one side or tyres wearing unevenly usually mean something needs attention.'],
         steps=[('We check it', 'Shocks, springs and steering parts, all looked at properly.'),
                ('We fix it', 'From a small adjustment to replacing worn parts.'),
                ('We test drive it', 'So it drives straight, rides smoothly and feels right.')],
         cta=('Get a quote', 'contact.html?service=steering')),
    dict(id='aircon', name='Air-con service', img='aircon', short='Air-con',
         intro=['Air-con not as cold as it used to be? A service gets it working properly again, and clears a misty windscreen faster.'],
         steps=[('We check for leaks', 'So we know the system will hold its gas.'),
                ('Clean & regas', 'We clean the system and top it back up.'),
                ('We fix any faults', 'If something’s broken, we’ll tell you and quote before fixing it.')],
         cta=('Book an air-con service', 'contact.html?service=aircon')),
]


def services_page():
    chips = ''.join(f'<a href="#{s["id"]}">{s["short"]}</a>' for s in SERVICES)
    rows = ''
    for i, s in enumerate(SERVICES):
        steps = ''.join(f'<li><span>{j + 1:02d}</span><div><h4>{t}</h4><p>{d}</p></div></li>' for j, (t, d) in enumerate(s['steps']))
        intro = ''.join(f'<p>{p}</p>' for p in s['intro'])
        label, href = s['cta']
        rows += f'''
      <article class="svc-row{' svc-row--flip' if i % 2 else ''}" id="{s['id']}">
        <div class="svc-row__media">
          <img src="assets/pages/{s['img']}.jpg" alt="{html.escape(s['name'])} at AutoTech Plus" loading="{'eager' if i == 0 else 'lazy'}" width="1280" height="720">
          <span class="svc-row__num">{i + 1:02d}</span>
        </div>
        <div class="svc-row__copy">
          <p class="stack-card__tag"><span>{i + 1:02d}</span> &middot; {s['short']}</p>
          <h2>{html.escape(s['name'])}</h2>
          {intro}
          <ol class="svc-steps">{steps}</ol>
          <div class="svc-row__actions">
            <a class="btn btn--primary" href="{href}">{label} {ARROW}</a>
            <a class="btn btn--ghost" href="tel:+441173292050">Call 0117 329 2050</a>
          </div>
        </div>
      </article>
'''
    body = (head('Services | MOT, Servicing, Gearbox &amp; Repairs in Bristol | AutoTech Plus',
                 'MOT testing, servicing, diagnostics, gearbox repair, brakes and clutch, ECU remapping, suspension and air-con at AutoTech Plus in Brislington, Bristol.')
            + header('services')
            + page_hero('Services', 'Our <span class="accent">services</span>',
                        'Almost every repair your vehicle needs, under one roof. We know the solutions, and we always go the extra mile.',
                        'hero-services.jpg',
                        f'<div class="page-hero__actions"><a class="btn btn--primary" href="#book" data-book>Book an MOT {ARROW}</a><a class="btn btn--ghost" href="contact.html">Get a quote</a></div>')
            + f'''
  <div class="jump" aria-label="Jump to a service">
    <div class="wrap jump__inner">{chips}</div>
  </div>

  <section class="section svc-list">
    <div class="wrap">{rows}    </div>
  </section>
''' + MOT_BAND + FOOTER + scripts())
    (ROOT / 'services.html').write_text(body)


# ---------------------------------------------------------------- FAQ
FAQ = [
    ('MOT & booking', [
        ('How long does an MOT take?', 'Usually around 45 minutes to an hour. You’re welcome to wait, or drop your car off and we’ll let you know when it’s ready.'),
        ('How early can I get my MOT done?', 'You can have your MOT up to a month (minus a day) before your current certificate runs out and still keep the same renewal date. You can check your due date on GOV.UK.'),
        ('What happens if my car fails its MOT?', 'We’ll explain exactly what failed and why, and give you a clear quote for the repairs. No work goes ahead without your OK.'),
        ('How do I book?', 'Book online in under a minute using the Book MOT button, or call us on 0117 329 2050.'),
    ]),
    ('Servicing & maintenance', [
        ('How often should I service my car?', 'We recommend servicing your car every 10,000–15,000 miles or once a year, whichever comes first. Regular checks help us spot potential issues before they become expensive.'),
        ('Which fluids should I regularly check and top up?', 'The key fluids are engine oil, coolant, brake fluid and power steering fluid. Always follow the manufacturer’s guidelines for the right levels and types.'),
        ('How often should I replace my tyres?', 'It depends on your driving style, road conditions and tyre type. Check your tyres every 6 months or every 10,000–15,000 miles. They need replacing when the tread depth falls below the legal limit.'),
        ('Do I need to use original replacement parts?', 'Not always. There are high-quality aftermarket parts that are just as good as the originals. The important thing is a trusted supplier, and we’ll advise on the right parts for your car.'),
        ('What are the most common causes of breakdowns?', 'Battery issues, worn brake pads, electrical problems, engine overheating, tyre damage and fuel system issues. Regular servicing and fixing small issues promptly helps prevent bigger breakdowns.'),
    ]),
    ('Warning signs & repairs', [
        ('What are the signs of worn brake pads?', 'Squeaking noises, a spongy brake pedal, longer braking distances or the steering wheel vibrating when you brake. If you notice any of these, get your brakes checked straight away.'),
        ('What causes steering wheel vibration while driving?', 'Unbalanced wheels, damaged tyres, worn suspension components or a steering system issue. We can pinpoint the exact cause and fix it.'),
        ('What causes fluid leaking under the car?', 'It could be oil, coolant, brake fluid or power steering fluid. If you spot a leak, bring it in so we can find the cause and repair it.'),
        ('What are the symptoms of exhaust problems?', 'Loud noises, engine misfires, higher fuel consumption, loss of power or exhaust leaks. If you notice any of these, book in for diagnostics.'),
    ]),
    ('Performance', [
        ('What are the benefits of engine remapping?', 'More power, torque and throttle response, improved fuel efficiency and better overall performance. We tailor the remap to your car and keep engine parameters safe.'),
    ]),
]


def faq_page():
    cats = ''.join(f'<button class="chip{" is-active" if i == 0 else ""}" data-cat="{c if i else "all"}">{"All questions" if i == 0 else c}</button>'
                   for i, c in enumerate(['all'] + [c for c, _ in FAQ]))
    groups = ''
    for cat, items in FAQ:
        qs = ''.join(f'''
          <details class="faq">
            <summary><span>{html.escape(q)}</span><i aria-hidden="true"></i></summary>
            <div class="faq__a"><p>{html.escape(a)}</p></div>
          </details>''' for q, a in items)
        groups += f'''
        <div class="faq-group" data-cat="{cat}">
          <h2>{html.escape(cat)}</h2>{qs}
        </div>'''
    schema = json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for _, items in FAQ for q, a in items]}, ensure_ascii=False)
    body = (head('FAQ | AutoTech Plus Bristol', 'Answers to common questions about MOTs, servicing, repairs and remapping at AutoTech Plus in Brislington, Bristol.',
                 f'\n  <script type="application/ld+json">{schema}</script>')
            + header('faq')
            + page_hero('FAQ', 'Frequently asked <span class="accent">questions</span>',
                        'Quick, honest answers to the questions we get asked most. Can’t find yours? Just give us a call.', 'hero-faq.jpg')
            + f'''
  <section class="section faq-section">
    <div class="wrap faq-layout">
      <aside class="faq-aside">
        <label class="faq-search">
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
          <input type="search" placeholder="Search questions..." aria-label="Search questions" id="faq-search">
        </label>
        <div class="chips" role="group" aria-label="Filter by topic">{cats}</div>
        <div class="help-card">
          <h3>Still have a question?</h3>
          <p>Our team is happy to help. Call us or send a message and we’ll get back to you.</p>
          <a class="btn btn--primary" href="tel:+441173292050">Call 0117 329 2050</a>
          <a class="btn btn--ghost" href="contact.html">Send a message</a>
        </div>
      </aside>
      <div class="faq-list">{groups}
        <p class="faq-empty" hidden>No questions match your search. <a href="contact.html">Ask us directly &rarr;</a></p>
        <div class="help-card help-card--mobile">
          <h3>Still have a question?</h3>
          <p>Our team is happy to help. Call us or send a message.</p>
          <a class="btn btn--primary" href="tel:+441173292050">Call 0117 329 2050</a>
          <a class="btn btn--ghost" href="contact.html">Send a message</a>
        </div>
      </div>
    </div>
  </section>
''' + MOT_BAND + FOOTER + scripts('\n  <script src="js/pages.js" defer></script>'))
    (ROOT / 'faq.html').write_text(body)


# ---------------------------------------------------------------- contact
def contact_page():
    options = ''.join(f'<option value="{v}">{l}</option>' for v, l in [
        ('mot', 'MOT test'), ('servicing', 'Servicing'), ('diagnostics', 'Diagnostics'), ('gearbox', 'Gearbox repair / rebuild'),
        ('brakes', 'Brakes &amp; clutch'), ('remapping', 'ECU remapping'), ('steering', 'Suspension &amp; steering'),
        ('aircon', 'Air-con service'), ('other', 'Something else')])
    body = (head('Contact | AutoTech Plus, Brislington, Bristol', 'Call 0117 329 2050, email or visit AutoTech Plus at 8 Bonville Rd, Brislington, Bristol BS4 5NZ. Open Monday to Friday.')
            + header('contact')
            + page_hero('Contact', 'Get in <span class="accent">touch</span>',
                        'Need help or have a question? Call, email or drop in. We’re at 8 Bonville Rd, Brislington.', 'hero-contact.jpg')
            + f'''
  <section class="section contact-page">
    <div class="wrap">
      <div class="contact-cards">
        <a class="c-card" href="tel:+441173292050">
          <span class="c-card__icon">{PHONE_SVG}</span>
          <span class="c-card__label">Call us</span>
          <strong>0117 329 2050</strong>
          <span class="c-card__hint">Mon&ndash;Fri during opening hours</span>
        </a>
        <a class="c-card" href="mailto:{EMAIL}">
          <span class="c-card__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></span>
          <span class="c-card__label">Email</span>
          <strong>{EMAIL}</strong>
          <span class="c-card__hint">We reply as soon as we can</span>
        </a>
        <a class="c-card" href="https://www.google.com/maps/dir/?api=1&amp;destination=8+Bonville+Rd,+Brislington,+Bristol+BS4+5NZ" target="_blank" rel="noopener">
          <span class="c-card__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg></span>
          <span class="c-card__label">Visit</span>
          <strong>8 Bonville Rd, Brislington</strong>
          <span class="c-card__hint">Bristol BS4 5NZ &middot; Get directions &rarr;</span>
        </a>
        <div class="c-card c-card--hours">
          <span class="c-card__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></span>
          <span class="c-card__label">Opening hours <span class="open-badge" id="open-badge" hidden></span></span>
          <table class="hours">
            <tr data-days="1,2,3,4"><td>Mon &ndash; Thu</td><td>8:00 &ndash; 17:00</td></tr>
            <tr data-days="5"><td>Friday</td><td>8:00 &ndash; 16:30</td></tr>
            <tr data-days="6,0"><td>Sat &ndash; Sun</td><td class="closed">Closed</td></tr>
          </table>
        </div>
      </div>

      <div class="contact-main">
        <form class="contact__form" id="contact-form" data-lead>
          <input type="hidden" name="source" value="autotechplus contact page">
          <h3>Send us a message</h3>
          <p class="contact__intro">Fill in the form and we’ll get back to you soon.</p>
          <div class="field-row">
            <label><span>Name</span><input type="text" name="name" required autocomplete="name"></label>
            <label><span>Phone</span><input type="tel" name="phone" required autocomplete="tel"></label>
          </div>
          <div class="field-row">
            <label><span>Email</span><input type="email" name="email" autocomplete="email"></label>
            <label><span>Vehicle reg</span><input type="text" name="reg" class="reg-input"></label>
          </div>
          <label><span>How can we help?</span><select name="service" id="service-select">{options}</select></label>
          <label><span>Message</span><textarea rows="4" name="message"></textarea></label>
          <button class="btn btn--primary" type="submit">Send message {ARROW}</button>
          <p class="contact__thanks">Thanks! We’ll be in touch shortly.</p>
        </form>
        <aside class="contact-side">
          <div class="help-card help-card--amber">
            <h3>Booking an MOT?</h3>
            <p>Skip the form. Pick a date and time online and you’re booked in.</p>
            <a class="btn btn--dark" href="#book" data-book>Book your MOT {ARROW}</a>
          </div>
          <div class="help-card">
            <h3>Follow us</h3>
            <p>News, updates and the cars we’ve been working on.</p>
            <a class="btn btn--ghost" href="{FACEBOOK}" target="_blank" rel="noopener">Facebook</a>
          </div>
        </aside>
      </div>

      <div class="map">
        <iframe title="Map to AutoTech Plus" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=AutoTech+Plus,+8+Bonville+Rd,+Brislington,+Bristol+BS4+5NZ&z=15&output=embed"></iframe>
        <a class="btn btn--primary map__directions" href="https://www.google.com/maps/dir/?api=1&amp;destination=8+Bonville+Rd,+Brislington,+Bristol+BS4+5NZ" target="_blank" rel="noopener">Get directions {ARROW}</a>
      </div>
    </div>
  </section>
''' + FOOTER + scripts('\n  <script src="js/pages.js" defer></script>'))
    (ROOT / 'contact.html').write_text(body)


# ---------------------------------------------------------------- homepage sync
def sync_index():
    p = ROOT / 'index.html'
    s = p.read_text()
    nav = header(None).replace('<a href="index.html" class="nav__logo"', '<a href="#top" class="nav__logo"')
    s = re.sub(r'\n  <!-- ============ NAV ============ -->.*?</header>\n', nav, s, count=1, flags=re.S)
    s = re.sub(r'\n  <!-- ============ FOOTER ============ -->.*?</a>\n(?=\n  <script)', FOOTER, s, count=1, flags=re.S)
    # Service tiles now link to their detail sections
    for tile, target in [('servicing', 'servicing'), ('diagnostics', 'diagnostics'), ('ecu', 'remapping'), ('gearbox', None), ('tyres', 'brakes')]:
        href = f'services.html#{target}' if target else GEARBOX
        s = re.sub(rf'<a class="tile tile--{tile}" href="[^"]*">', f'<a class="tile tile--{tile}" href="{href}">', s)
    s = s.replace('<a class="btn btn--ghost" href="#contact">', '<a class="btn btn--ghost" href="contact.html">')
    p.write_text(s)


if __name__ == '__main__':
    import gen_gearbox
    services_page()
    faq_page()
    contact_page()
    sync_index()
    gen_gearbox.build()
    print('ok')
