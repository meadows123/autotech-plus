"""Generate the Bristol Gearbox section into bristolgearbox/.

The folder is self-contained (it carries its own copy of the CSS, JS and images) so it can be
deployed as the root of https://bristolgearbox.co.uk, keeping the URLs Google already ranks
(/powershift/, /dsg/, /book-now/ ...). On the AutoTech Plus site it is linked as the "Gearbox"
section. Canonical tags always point at bristolgearbox.co.uk so the two never compete in search.

Run via `python3 tools/gen_pages.py` (builds both sites).
"""
import html
import json
import shutil
from datetime import date
from pathlib import Path

from gen_pages import ARROW, FACEBOOK, PHONE_SVG

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'bristolgearbox'
SITE = 'https://bristolgearbox.co.uk/'
MAIN = 'https://autotechplus.co.uk/'  # AutoTech Plus live domain: links out from the gearbox pages
EMAIL = 'info@bristolgearbox.co.uk'
PHONE = '0117 329 2050'
TEL = 'tel:+441173292050'
MAPS_DIR = 'https://www.google.com/maps/dir/?api=1&amp;destination=8+Bonville+Rd,+Brislington,+Bristol+BS4+5NZ'
GOOGLE_REVIEWS = 'https://www.google.com/maps/search/?api=1&amp;query=AutoTech+Plus+8+Bonville+Rd+Bristol+BS4+5NZ'
TODAY = date.today().isoformat()

# Files copied from the main site so the folder works on its own domain
SHARED = ['css/styles.css', 'js/main.js', 'js/pages.js', 'assets/ico32.png', 'assets/ico180.png', 'assets/logo-autotech.png', 'assets/logo-bristol-gearbox.png',
          'assets/pages/gearbox.jpg', 'assets/pages/diagnostics.jpg', 'assets/pages/servicing.jpg', 'assets/pages/brakes.jpg',
          'assets/pages/hero-services.jpg', 'assets/pages/hero-contact.jpg', 'assets/pages/hero-faq.jpg', 'assets/pages/remapping.jpg',
          'assets/services/gearbox.mp4', 'assets/services/gearbox.jpg', 'assets/workshop.jpg']

GBOX = [  # slug, name, short text, typical cars
    ('powershift', 'Powershift', 'Ford’s dual-clutch automatic. Judder, slipping and TCM faults diagnosed and fixed.', 'Fiesta · Focus · Kuga · Mondeo'),
    ('dsg', 'DSG', 'Volkswagen Group dual-clutch gearboxes: mechatronics, clutches, servicing and rebuilds.', 'VW · Audi · SEAT · Škoda'),
    ('cvt', 'CVT', 'Continuously variable transmissions, including Audi Multitronic.', 'Toyota · Nissan · Honda · Audi'),
    ('semi-auto', 'Semi-auto', 'Automated manual gearboxes: clutch actuators, calibration and control units.', 'Automated manuals'),
]

NAV = [('Home', ''), ('About us', 'about/'), ('Powershift', 'powershift/'), ('DSG', 'dsg/'), ('CVT', 'cvt/'), ('Semi-auto', 'semi-auto/'),
       ('Offer', 'offer/'), ('Contact', 'book-now/')]  # same order as the original site menu

REVIEWS = [
    ('Vikesh Tailor', 'vikesh-tailor', '#e8710a', 'These guys have great knowledge. They helped us a lot with our powershift gearboxes and got us in a lot quicker than their better-known rivals. Would definitely recommend.'),
    ('Jay Raja', 'jay-raja', '#188038', 'Very knowledgeable and competent engineers. Honest, reliable and competitive. Highly recommended.'),
    ('Kevin D', 'kevin-d', '#1a73e8', 'Great customer service, always go the extra mile! They are the first people you need to go to, you will not be disappointed.'),
    ('Gabriel', 'gabriel', '#a142f4', 'Fantastic service with a smile on every visit. Can’t recommend enough.'),
]
G_SVG = '<svg viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.7-.4-3.9z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.7-.4-3.9z"/></svg>'

BUSINESS = {
    '@type': 'AutoRepair', '@id': SITE + '#business', 'name': 'Bristol Gearbox', 'url': SITE,
    'description': 'Gearbox and transmission repair specialists in Bristol: Powershift, DSG, CVT and semi-automatic gearboxes.',
    'telephone': '+44 117 329 2050', 'email': EMAIL, 'image': SITE + 'assets/logo-bristol-gearbox.png',
    'address': {'@type': 'PostalAddress', 'streetAddress': '8 Bonville Road', 'addressLocality': 'Bristol',
                'postalCode': 'BS4 5NZ', 'addressCountry': 'GB'},
    'geo': {'@type': 'GeoCoordinates', 'latitude': 51.4396, 'longitude': -2.5508},
    'openingHoursSpecification': [
        {'@type': 'OpeningHoursSpecification', 'dayOfWeek': ['Monday', 'Tuesday', 'Wednesday', 'Thursday'], 'opens': '08:00', 'closes': '17:00'},
        {'@type': 'OpeningHoursSpecification', 'dayOfWeek': 'Friday', 'opens': '08:00', 'closes': '16:30'}],
    'areaServed': ['Bristol', 'South West England'],
    'parentOrganization': {'@type': 'AutoRepair', 'name': 'AutoTech Plus Ltd', 'url': MAIN},
    'sameAs': [FACEBOOK],
}


# ---------------------------------------------------------------- shared chrome
def head(p, slug, title, desc, schema, image='assets/pages/gearbox.jpg'):
    url = SITE + slug
    graph = json.dumps({'@context': 'https://schema.org', '@graph': [BUSINESS] + schema}, ensure_ascii=False)
    return f'''<!doctype html>
<html lang="en-GB">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{title}</title>
  <meta name="description" content="{desc}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="website">
  <meta property="og:site_name" content="Bristol Gearbox">
  <meta property="og:title" content="{title}">
  <meta property="og:description" content="{desc}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{SITE}{image}">
  <meta name="theme-color" content="#0d0f14">
  <link rel="icon" href="{p}assets/ico32.png" sizes="32x32">
  <link rel="apple-touch-icon" href="{p}assets/ico180.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Barlow:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="{p}css/styles.css">
  <script type="application/ld+json">{graph}</script>
</head>
<body class="subpage">
'''


def header(p, current):
    links = '\n'.join(
        f'        <a href="{(p + href) or './'}"{" class=\"is-current\" aria-current=\"page\"" if href == current else ""}>{label}</a>'
        for label, href in NAV)
    return f'''
  <!-- ============ NAV ============ -->
  <header class="nav nav--gb" id="nav">
    <div class="wrap nav__inner">
      <a href="{p or './'}" class="nav__logo gb-logo" aria-label="Bristol Gearbox home">
        <img src="{p}assets/logo-bristol-gearbox.png" alt="Bristol Gearbox" width="332" height="96">
      </a>
      <nav class="nav__links" aria-label="Main">
{links}
        <a class="nav__parent" href="{MAIN}">AutoTech Plus &#8599;</a>
      </nav>
      <div class="nav__cta">
        <a class="nav__phone" href="{TEL}">
          {PHONE_SVG}
          {PHONE}
        </a>
        <a class="btn btn--primary btn--sm" href="{p}book-now/#quote">Free quote</a>
        <button class="nav__burger" id="burger" aria-label="Open menu" aria-expanded="false"><span></span><span></span></button>
      </div>
    </div>
  </header>
'''


def footer(p):
    types = ''.join(f'<a href="{p}{s}/">{n} gearbox repair</a>' for s, n, *_ in GBOX)
    return f'''
  <!-- ============ FOOTER ============ -->
  <footer class="footer">
    <div class="wrap footer__grid">
      <div class="footer__brand">
        <img class="gb-footer-logo" src="{p}assets/logo-bristol-gearbox.png" alt="Bristol Gearbox" width="332" height="96">
        <p>Gearbox and transmission repair specialists in Brislington, Bristol. The gearbox division of AutoTech Plus Ltd, serving Bristol and the South West.</p>
        <a class="footer__parent" href="{MAIN}"><img src="{p}assets/logo-autotech.png" alt="AutoTech Plus" width="300" height="44"> MOT, servicing &amp; repairs &rarr;</a>
      </div>
      <div>
        <h4>Gearboxes</h4>
        {types}
      </div>
      <div>
        <h4>Company</h4>
        <a href="{p}about/">About us</a><a href="{p}offer/">Our offer</a><a href="{p}blog/">Blog</a><a href="{p}book-now/">Contact</a><a href="{MAIN}">AutoTech Plus</a>
      </div>
      <div>
        <h4>Visit us</h4>
        <p>8 Bonville Rd, Brislington<br>Bristol BS4 5NZ</p>
        <p><a href="{TEL}">{PHONE}</a><br><a href="mailto:{EMAIL}">{EMAIL}</a></p>
        <p class="footer__hours">Mon&ndash;Thu 8:00&ndash;17:00<br>Fri 8:00&ndash;16:30 &middot; Sat&ndash;Sun closed</p>
      </div>
    </div>
    <div class="wrap footer__base">
      <span>&copy; <span id="year">2026</span> Bristol Gearbox &middot; AutoTech Plus Ltd. All rights reserved.</span>
      <span>8 Bonville Rd, Bristol BS4 5NZ</span>
    </div>
  </footer>

  <a class="fab" href="{TEL}" aria-label="Call Bristol Gearbox">
    {PHONE_SVG}
  </a>

  <script src="{p}js/main.js" defer></script>
  <script src="{p}js/pages.js" defer></script>
</body>
</html>
'''


def crumbs_schema(trail):
    return {'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': SITE + s} for i, (n, s) in enumerate(trail)]}


def page_hero(p, crumb, title, lead, image, actions=True, eyebrow=''):
    crumbs = f'<nav class="crumbs" aria-label="Breadcrumb"><a href="{p or "./"}">Home</a><span>/</span><span aria-current="page">{crumb}</span></nav>' if crumb else ''
    acts = f'''<div class="page-hero__actions"><a class="btn btn--primary" href="{p}book-now/#quote">Get a free quote {ARROW}</a><a class="btn btn--ghost" href="{TEL}">Call {PHONE}</a></div>''' if actions else ''
    return f'''
  <!-- ============ PAGE HERO ============ -->
  <section class="page-hero">
    <div class="page-hero__bg" style="background-image: url('{p}{image}')" aria-hidden="true"></div>
    <div class="wrap page-hero__inner">
      {crumbs}{eyebrow}
      <h1>{title}</h1>
      <p class="page-hero__lead">{lead}</p>
      {acts}
    </div>
  </section>
'''


def quote_form(p, slug, selected='', title='Get a free quote', intro='Leave your details and we’ll call you back to talk through the options.'):
    opts = ''.join(f'<option{" selected" if v == selected else ""}>{v}</option>' for v in
                   ['Not sure', 'Powershift', 'DSG', 'CVT', 'Semi-auto', 'Other automatic', 'Manual', 'General repair / service'])
    return f'''
        <form class="contact__form" id="quote" data-lead>
          <h3>{title}</h3>
          <p class="contact__intro">{intro}</p>
          <input type="hidden" name="source" value="bristolgearbox.co.uk/{slug}">
          <div class="field-row">
            <label><span>Name</span><input type="text" name="name" required autocomplete="name"></label>
            <label><span>Phone</span><input type="tel" name="phone" required autocomplete="tel"></label>
          </div>
          <div class="field-row">
            <label><span>Vehicle reg</span><input type="text" name="reg" class="reg-input"></label>
            <label><span>Gearbox</span><select name="gearbox">{opts}</select></label>
          </div>
          <label><span>What’s it doing?</span><textarea rows="3" name="message" placeholder="e.g. juddering when pulling away"></textarea></label>
          <button class="btn btn--primary" type="submit">Request a call back {ARROW}</button>
          <p class="contact__thanks">Thanks! We’ll call you back shortly.</p>
        </form>'''


def help_card():
    return f'''
        <div class="help-card">
          <h3>Rather talk now?</h3>
          <p>Describe the symptoms and we’ll tell you what we think is going on.</p>
          <a class="btn btn--ghost" href="{TEL}">Call {PHONE}</a>
        </div>'''


def type_cards(p, exclude=None, head=True):
    cards = ''
    n = 0
    for slug, name, text, cars in GBOX:
        if slug == exclude:
            continue
        n += 1
        cards += f'''
        <a class="gb-type" href="{p}{slug}/">
          <span class="gb-type__num">{n:02d}</span>
          <h3>{name}</h3>
          <p>{text}</p>
          <p class="gb-type__cars">{cars}</p>
          <span class="gb-type__go">Find out more {ARROW}</span>
        </a>'''
    title = ('<div class="section__head"><p class="kicker">Gearboxes we repair</p><h2>Which gearbox <span class="accent">do you have?</span></h2>'
             '<p class="section__lead">Automatic and automated gearboxes are our speciality. Not sure which one your car has? Give us the reg and we’ll tell you.</p></div>'
             if head else '<div class="section__head"><p class="kicker">We also repair</p><h2>Other <span class="accent">gearboxes</span></h2></div>')
    return f'''
  <section class="section">
    <div class="wrap">
      {title}
      <div class="gb-types{' gb-types--3' if exclude else ''}">{cards}
      </div>
    </div>
  </section>
'''


def reviews(p):
    figs = ''.join(f'''
        <figure class="review">
          <figcaption>
            <span class="avatar" style="--av:{c}" data-initial="{n[0]}"><img src="{p}assets/reviews/{img}.jpg" alt="" loading="lazy" onerror="this.remove()"></span>
            <span class="review__who"><strong>{n}</strong><small>Google review</small></span>
            <span class="review__g">{G_SVG}</span>
          </figcaption>
          <div class="stars" aria-label="5 out of 5 stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div>
          <blockquote>{html.escape(q)}</blockquote>
        </figure>''' for n, img, c, q in REVIEWS)
    return f'''
  <section class="section section--alt">
    <div class="wrap">
      <div class="reviews-head">
        <div>
          <p class="kicker">Reviews</p>
          <h2>What our customers <span class="accent">say about us</span></h2>
          <p class="section__lead">Google reviews of our workshop, AutoTech Plus, at 8 Bonville Rd.</p>
        </div>
        <a class="g-badge" href="{GOOGLE_REVIEWS}" target="_blank" rel="noopener">
          <span class="g-badge__logo">{G_SVG}</span>
          <span class="g-badge__text">
            <strong>Google Reviews</strong>
            <span class="g-badge__rating"><b>4.8</b> <span class="g-badge__stars" aria-hidden="true">&#9733;&#9733;&#9733;&#9733;&#9733;</span> <em>(102)</em></span>
            <small>See all reviews on Google &rarr;</small>
          </span>
        </a>
      </div>
      <div class="reviews">{figs}
      </div>
    </div>
  </section>
'''


CROSS = f'''
  <!-- ============ AUTOTECH PLUS ============ -->
  <section class="mot">
    <div class="wrap mot__inner">
      <div>
        <p class="kicker kicker--dark">Part of AutoTech Plus</p>
        <h2>More than<br>gearboxes</h2>
        <p>Bristol Gearbox is the gearbox side of AutoTech Plus, the independent garage at the same address. MOTs, servicing, diagnostics, brakes, clutches and remapping: one team, one workshop.</p>
      </div>
      <div class="gb-cross__actions">
        <a class="btn btn--dark" href="{MAIN}services.html">AutoTech Plus services {ARROW}</a>
        <a class="btn btn--ghost" href="{MAIN}#book">Book an MOT</a>
      </div>
    </div>
  </section>
'''


def faq_block(items):
    qs = ''.join(f'''
          <details class="faq">
            <summary><span>{html.escape(q)}</span><i aria-hidden="true"></i></summary>
            <div class="faq__a"><p>{html.escape(a)}</p></div>
          </details>''' for q, a in items)
    return f'''
  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head"><p class="kicker">FAQ</p><h2>Frequently asked <span class="accent">questions</span></h2></div>
      <div class="gb-faq">{qs}
      </div>
    </div>
  </section>
'''


def faq_schema(items):
    return {'@type': 'FAQPage', 'mainEntity': [
        {'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}} for q, a in items]}


def signs(items):
    return '<ul class="gb-signs">' + ''.join(f'<li>{s}</li>' for s in items) + '</ul>'


def write(slug, body):
    path = OUT / slug / 'index.html' if slug else OUT / 'index.html'
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(body)


# ---------------------------------------------------------------- home
def home():
    p = ''
    steps = [('Diagnosis', 'Up-to-date Bosch diagnostic equipment with dedicated gearbox interfaces reads everything the gearbox controller has recorded.'),
             ('Report &amp; quote', 'You get a clear report on the gearbox’s condition and a quote before any work starts. No surprises.'),
             ('Repair or rebuild', 'Clutches, control units, mechatronics, dual-mass flywheels, a full rebuild or a quality replacement unit, whatever the fault needs.'),
             ('Warranty', 'Every repair is covered by a warranty, and we only replace parts that actually need replacing.')]
    steps_html = ''.join(f'<li><span>{i + 1:02d}</span><div><h4>{t}</h4><p>{d}</p></div></li>' for i, (t, d) in enumerate(steps))
    body = (head(p, '', 'Gearbox Repair Bristol | Powershift, DSG &amp; Automatic Specialists | Bristol Gearbox',
                 'Bristol Gearbox: gearbox and transmission repair specialists in Brislington, Bristol. Powershift, DSG, CVT and semi-automatic gearboxes diagnosed, repaired and rebuilt. Free quotes: 0117 329 2050.',
                 [{'@type': 'WebSite', 'name': 'Bristol Gearbox', 'url': SITE}])
            + header(p, '')
            + f'''
  <!-- ============ HERO ============ -->
  <section class="page-hero page-hero--home">
    <div class="page-hero__bg" aria-hidden="true">
      <video autoplay muted loop playsinline poster="assets/services/gearbox.jpg" src="assets/services/gearbox.mp4"></video>
    </div>
    <div class="wrap page-hero__inner">
      <p class="eyebrow"><span class="dot"></span> Brislington, Bristol &middot; Part of AutoTech Plus</p>
      <h1>Gearbox &amp; transmission <span class="accent">repair specialists</span></h1>
      <p class="page-hero__lead">Powershift, DSG, CVT and semi-automatic gearboxes diagnosed, repaired and rebuilt in Bristol. Trusted across Bristol and the South West.</p>
      <div class="page-hero__actions"><a class="btn btn--primary" href="book-now/#quote">Get a free quote {ARROW}</a><a class="btn btn--ghost" href="{TEL}">Call {PHONE}</a></div>
    </div>
  </section>

  <section class="strip" aria-label="Why Bristol Gearbox">
    <div class="wrap strip__grid">
      <div class="stat"><strong>15<small>+</small></strong><span>Years in the trade</span></div>
      <div class="stat"><strong>4.8<small>&#9733;</small></strong><span>Google rating</span></div>
      <div class="stat"><strong>Bosch</strong><span>Gearbox diagnostics</span></div>
      <div class="stat"><strong>Free</strong><span>Quotes</span></div>
    </div>
  </section>
'''
            + type_cards(p)
            + f'''
  <!-- ============ WARNING SIGNS + QUOTE ============ -->
  <section class="section section--alt" id="signs">
    <div class="wrap gb-split">
      <div>
        <p class="kicker">Warning signs</p>
        <h2>Get your gearbox <span class="accent">up and running</span></h2>
        <p class="section__lead">The first sign of gearbox trouble is often a jolt or a hesitation when the gears change. Catch it early and the repair is usually smaller and cheaper. Book a check if you notice any of these:</p>
        {signs(['A burning smell', 'Oil leaking under the car', 'Clutch slip: revs rise but the car doesn’t pick up', 'Jerky, harsh or delayed gear changes', 'Judder when pulling away', 'Engine or gearbox warning light, or limp mode'])}
      </div>
      <aside class="gb-aside">{quote_form(p, '', title='Need gearbox repair?')}
      </aside>
    </div>
  </section>

  <!-- ============ HOW WE WORK ============ -->
  <section class="section">
    <div class="wrap about">
      <div class="about__media">
        <img src="assets/pages/diagnostics.jpg" alt="Gearbox diagnostics at Bristol Gearbox" loading="lazy" width="1280" height="720">
        <div class="about__badge"><strong>15+</strong><span>years<br>experience</span></div>
      </div>
      <div class="about__copy">
        <p class="kicker">How we work</p>
        <h2>Trusted local <span class="accent">gearbox specialists</span></h2>
        <p>We have many years of experience repairing cars, and automatic transmissions in particular. Powershift and DSG gearboxes are what we’re best at. Customers come to us with gearbox problems they couldn’t get sorted elsewhere.</p>
        <ol class="svc-steps">{steps_html}</ol>
        <a class="btn btn--ghost" href="about/">More about us {ARROW}</a>
      </div>
    </div>
  </section>
'''
            + reviews(p)
            + f'''
  <!-- ============ BLOG ============ -->
  <section class="section">
    <div class="wrap">
      <div class="section__head"><p class="kicker">Latest news</p><h2>From the <span class="accent">blog</span></h2></div>
      <a class="gb-post" href="powershift-dsg-repair-bristol/">
        <img src="assets/pages/gearbox.jpg" alt="" loading="lazy" width="1280" height="720">
        <div>
          <p class="gb-meta">Guide &middot; Powershift &amp; DSG</p>
          <h2>Powershift &amp; DSG repair in Bristol</h2>
          <p>Why dual-clutch gearboxes go wrong, the symptoms to look out for, and what a repair involves.</p>
          <span class="gb-type__go">Read the article {ARROW}</span>
        </div>
      </a>
    </div>
  </section>
''' + CROSS + footer(p))
    write('', body)


# ---------------------------------------------------------------- gearbox type pages
TYPES = {
    'powershift': dict(
        title='Ford Powershift Gearbox Repair Bristol | Bristol Gearbox',
        desc='Ford Powershift gearbox repair in Bristol. Clutch judder, slipping and TCM faults diagnosed with Bosch equipment, then repaired or rebuilt with a warranty. Free quotes.',
        h1='Powershift <span class="accent">gearbox repair</span>', crumb='Powershift', img='assets/pages/gearbox.jpg',
        lead='Juddering, slipping or a “transmission malfunction” warning? We diagnose, repair and rebuild Ford Powershift gearboxes, including the clutches, the control module (TCM) and the complete unit.',
        prose=f'''
        <h2>What is a Powershift gearbox?</h2>
        <p>Powershift is Ford’s six-speed dual-clutch automatic gearbox. It works much like Volkswagen’s DSG: inside are effectively two gearboxes, each with its own clutch. One clutch handles the odd gears and the other the even gears, so the next gear is always ready. The result is quick, smooth changes and lower fuel consumption than a traditional automatic.</p>
        <p>There are two main versions. Smaller Fords such as the Fiesta, Focus, B-Max and EcoSport use a dry-clutch Powershift, where the clutches are operated electrically. Larger models such as the Mondeo, S-Max, Galaxy and Kuga use a wet-clutch version that runs in oil.</p>
        <h2>Common Powershift problems</h2>
        {signs(['Judder or shudder when pulling away, especially in slow traffic', 'Slipping, or a delay before the car moves', 'Harsh, clunky or jerky gear changes', 'Loss of drive or dropping into neutral', '“Transmission malfunction” or overheating warnings', 'Oil from leaking seals contaminating the dry clutches'])}
        <h3>Powershift diagnostics</h3>
        <p>We use up-to-date Bosch diagnostic systems with dedicated interfaces for automatic gearboxes. They read everything the gearbox controller has recorded, so we can pinpoint the fault precisely rather than guess. You get a report on the gearbox’s condition, including things like the oil level, and every repair is based on it.</p>
        <h3>Powershift repair and replacement</h3>
        <p>Depending on the diagnosis, we can renew the clutches, repair or replace the control module (TCM), replace seals and actuators, rebuild the gearbox or fit a high-quality replacement unit. We assess each component, so parts that work aren’t replaced unnecessarily.</p>
        <h3>Powershift servicing</h3>
        <p>Because of its dual-clutch design, a Powershift is more involved to service than a conventional gearbox. After clutch or control-module work, the clutches need a relearn with diagnostic equipment so the car drives as it should. We do this as standard.</p>''',
        faq=[('How much does a Powershift repair cost?', 'It depends which part needs work: the dual-mass flywheel, the clutch, the gearbox itself or the control module, or a combination of these. Once we’ve diagnosed the fault we give you a clear quote before any work starts. Call us for a guide price.'),
             ('Is there a warranty on Powershift repairs?', 'Yes. Our repairs and rebuilds of Powershift clutches and gearboxes come with a warranty, and we’ll confirm the terms with your quote.'),
             ('How long will a repaired Powershift gearbox last?', 'A professionally repaired and rebuilt clutch or gearbox is restored to the same specification as a new part. With the same driving style and use, you can expect a service life similar to the original components.'),
             ('Does a rebuild change how the gearbox drives?', 'No. A rebuilt Powershift clutch, gearbox or controller is restored to factory specification, and its technical parameters don’t change.')]),
    'dsg': dict(
        title='DSG Gearbox Repair &amp; Servicing Bristol | Bristol Gearbox',
        desc='DSG gearbox repair, servicing and mechatronic repairs in Bristol for VW, Audi, SEAT and Škoda. Bosch diagnostics, clear reports and a warranty. Free quotes.',
        h1='DSG <span class="accent">gearbox repair</span>', crumb='DSG', img='assets/pages/diagnostics.jpg',
        lead='Specialist diagnosis, servicing and repair of Volkswagen Group DSG gearboxes for VW, Audi, SEAT and Škoda, in Brislington, Bristol.',
        prose=f'''
        <h2>What is a DSG gearbox?</h2>
        <p>DSG (Direct Shift Gearbox) is the dual-clutch automatic used across the Volkswagen Group. It is effectively two gearboxes in one housing, each with its own clutch: one for the odd gears and one for the even gears. That means two gears can be selected at once. If you’re in second, third is already lined up, and the change itself is just one clutch releasing as the other engages. That’s why DSG changes are fast and smooth, without the jolt you get from a conventional automated gearbox.</p>
        <p>The changes are controlled by the mechatronic unit, which combines the electronic control module and the hydraulics. Depending on the version, DSG uses wet multi-plate clutches running in an oil bath or dry clutches, as fitted to many smaller cars.</p>
        <h2>Common DSG problems</h2>
        {signs(['Judder when pulling away or reversing', 'Jerky or delayed changes, especially between low gears', 'Flashing gear display or limp mode', 'Mechatronic and hydraulic pressure faults', 'Clunks or rattles from the dual-mass flywheel', 'Worn clutches and slipping'])}
        <h3>DSG diagnostics</h3>
        <p>Our workshop has modern Bosch diagnostic equipment adapted to Volkswagen DSG gearboxes, with dedicated interfaces that read the information recorded by the gearbox controller. That lets us identify faults quickly and accurately, assess the condition of the gearbox and its components, and avoid replacing parts that still work. You get a final report with the results.</p>
        <h3>DSG servicing</h3>
        <p>Wet-clutch DSG gearboxes need their oil and filter changed at the interval set by the manufacturer. A missed oil service is one of the most common causes of DSG problems. We carry out DSG oil services and clutch adaptations, and service the gearbox’s other consumables.</p>
        <h3>DSG repair and replacement</h3>
        <p>We repair mechatronic units, renew clutches and flywheels and rebuild DSG gearboxes, and we have access to high-quality replacement units when a rebuild isn’t the best option. Our experts will repair the gearbox quickly and professionally.</p>''',
        faq=[]),
    'cvt': dict(
        title='CVT Gearbox Repair Bristol | Bristol Gearbox',
        desc='CVT gearbox repair and servicing in Bristol: Toyota, Nissan, Honda and Audi Multitronic continuously variable transmissions. Bosch diagnostics and free quotes.',
        h1='CVT <span class="accent">gearbox repair</span>', crumb='CVT', img='assets/pages/servicing.jpg',
        lead='Diagnosis, servicing and repair of continuously variable transmissions, from Toyota, Nissan and Honda CVTs to Audi Multitronic.',
        prose=f'''
        <h2>What is a CVT gearbox?</h2>
        <p>CVT stands for Continuously Variable Transmission, a type of single-speed automatic gearbox. Instead of a set of fixed gears, it uses two variable pulleys linked by a steel belt or chain, so the ratio changes smoothly and the engine can stay at its most efficient speed. CVTs are used in many different cars, but they are most often found in smaller ones: their compact size and simple construction make them more cost-effective there than a conventional automatic. Toyota, Nissan and Honda all use CVTs, and Audi’s Multitronic is a variation of the design.</p>
        <p>In many ways a CVT drives like a regular automatic. There’s no clutch pedal, so you can drive one on an automatic-only UK licence. And like a regular automatic, a CVT version of a car usually costs more than the manual.</p>
        <h2>Common CVT problems</h2>
        {signs(['Whining or droning noise', 'Juddering or shuddering when accelerating', 'Revs rising without the car speeding up', 'Delay when selecting Drive or Reverse', 'Overheating warnings or limp mode', 'Fluid leaks'])}
        <h3>CVT diagnostics and servicing</h3>
        <p>CVTs are sensitive to the condition and type of their fluid, so using the correct manufacturer-spec fluid matters. We diagnose CVT faults with Bosch equipment that reads the transmission controller directly, then explain what we found and what it will cost to put right.</p>
        <h3>CVT repair and replacement</h3>
        <p>From fluid services and sensor faults to a full rebuild or a quality replacement unit, we’ll recommend the most sensible fix for your car and its value.</p>''',
        faq=[]),
    'semi-auto': dict(
        title='Semi-Automatic Gearbox Repair Bristol | Bristol Gearbox',
        desc='Semi-automatic and automated manual gearbox repair in Bristol: clutch actuators, calibration and control units. Bosch diagnostics and free quotes.',
        h1='Semi-auto <span class="accent">gearbox repair</span>', crumb='Semi-auto', img='assets/pages/brakes.jpg',
        lead='Repairs to semi-automatic (automated manual) gearboxes: clutch actuators, clutches, calibration and control units.',
        prose=f'''
        <h2>What is a semi-automatic gearbox?</h2>
        <p>A semi-automatic gearbox is much more like a manual than an automatic. In fact, the gearbox itself is practically identical to a manual one. In a manual car, you press the clutch pedal to change gear. In a semi-automatic there’s no clutch pedal. Instead, a computer uses sensors and an actuator to operate the clutch automatically when you move the gear lever or the car decides to change.</p>
        <p>Driving a semi-automatic feels very similar to driving a manual, except you don’t have to press a clutch pedal. You just move the lever and the car does the rest.</p>
        <h2>Common semi-auto problems</h2>
        {signs(['Gearbox won’t select a gear or gets stuck in neutral', 'Jerky or slow gear changes', 'Clutch slipping or biting in the wrong place', 'Clutch or gear-selection actuator failure', 'Hydraulic pump or fluid problems', 'Gearbox warning light on the dashboard'])}
        <h3>Diagnostics and calibration</h3>
        <p>Most semi-auto faults come down to the actuators, the clutch or the calibration between them. Our Bosch diagnostic equipment reads the gearbox controller and runs the calibration routines a semi-automatic needs after clutch or actuator work.</p>
        <h3>Repair and replacement</h3>
        <p>We replace clutches and actuators, repair hydraulic units and control modules, and calibrate everything so the gearbox changes smoothly again.</p>''',
        faq=[]),
}


def type_page(slug):
    t = TYPES[slug]
    p = '../'
    schema = [crumbs_schema([('Home', ''), (t['crumb'], slug + '/')]),
              {'@type': 'Service', 'name': f"{t['crumb']} gearbox repair", 'provider': {'@id': SITE + '#business'},
               'areaServed': 'Bristol', 'url': SITE + slug + '/'}]
    if t['faq']:
        schema.append(faq_schema(t['faq']))
    body = (head(p, slug + '/', t['title'], t['desc'], schema, t['img'])
            + header(p, slug + '/')
            + page_hero(p, t['crumb'], t['h1'], t['lead'], t['img'])
            + f'''
  <section class="section">
    <div class="wrap gb-split">
      <div class="gb-prose">{t['prose']}
      </div>
      <aside class="gb-aside">{quote_form(p, slug + '/', selected=t['crumb'])}{help_card()}
      </aside>
    </div>
  </section>
''' + (faq_block(t['faq']) if t['faq'] else '') + type_cards(p, exclude=slug, head=False) + CROSS + footer(p))
    write(slug, body)


# ---------------------------------------------------------------- about / offer
def about():
    p = '../'
    body = (head(p, 'about/', 'About Us | Bristol Gearbox, part of AutoTech Plus',
                 'Bristol Gearbox is the gearbox and transmission division of AutoTech Plus in Brislington, Bristol. Powershift and DSG specialists with over 15 years in the trade.',
                 [crumbs_schema([('Home', ''), ('About us', 'about/')])], 'assets/pages/hero-services.jpg')
            + header(p, 'about/')
            + page_hero(p, 'About us', 'About <span class="accent">us</span>',
                        'Bristol Gearbox is the gearbox and transmission side of AutoTech Plus, the independent garage at 8 Bonville Road, Brislington.',
                        'assets/pages/hero-services.jpg')
            + f'''
  <section class="section">
    <div class="wrap about">
      <div class="about__media">
        <img src="{p}assets/workshop.jpg" alt="The AutoTech Plus and Bristol Gearbox workshop in Brislington" loading="lazy">
        <div class="about__badge"><strong>15+</strong><span>years<br>experience</span></div>
      </div>
      <div class="about__copy">
        <p class="kicker">Our mission</p>
        <h2>Every gearbox, <span class="accent">sorted properly</span></h2>
        <p>Our team handles everything from an accurate diagnosis to repairing or replacing your gearbox, so you don’t have to worry about a thing.</p>
        <p>Powershift and DSG gearboxes are what we do best, alongside CVT, semi-automatic and general repairs. Because we’re part of AutoTech Plus, the same workshop can also look after your MOT, servicing and everything else your car needs.</p>
        <ul class="ticks">
          <li>Specialists in Powershift and DSG dual-clutch gearboxes</li>
          <li>Bosch diagnostic equipment with gearbox-specific interfaces</li>
          <li>Clear reports and quotes before any work starts</li>
          <li>Warranty on our repairs</li>
        </ul>
        <a class="btn btn--primary" href="{TEL}">Call {PHONE} {ARROW}</a>
      </div>
    </div>
  </section>

  <section class="section section--alt">
    <div class="wrap">
      <div class="section__head"><p class="kicker">Our promise</p><h2>Why choose <span class="accent">Bristol Gearbox</span></h2>
        <p class="section__lead">Our mission is to help with every gearbox problem. Here’s what you can expect when you bring your car to us.</p></div>
      <div class="gb-promise">
        <div><h3>Quality &amp; trust</h3><p>A well-trained, skilled team and diagnostic tools you can rely on, delivering a high standard of work.</p></div>
        <div><h3>Warranty</h3><p>Every repair we carry out comes with an appropriate warranty, confirmed with your quote.</p></div>
        <div><h3>Fair prices</h3><p>Competitive prices, and we only replace parts that actually need replacing.</p></div>
      </div>
    </div>
  </section>
''' + reviews(p) + CROSS + footer(p))
    write('about', body)


def offer():
    p = '../'
    body = (head(p, 'offer/', 'Our Offer | Gearbox &amp; Car Repairs in Bristol | Bristol Gearbox',
                 'Powershift and DSG gearbox repairs plus general car repairs in Brislington, Bristol. A well-known local garage with great reviews. Call 0117 329 2050.',
                 [crumbs_schema([('Home', ''), ('Our offer', 'offer/')])], 'assets/pages/remapping.jpg')
            + header(p, 'offer/')
            + page_hero(p, 'Our offer', 'Our <span class="accent">offer</span>',
                        'More than gearbox repair: specialist Powershift and DSG work, plus repairs for everyday faults on all kinds of cars.',
                        'assets/pages/remapping.jpg')
            + f'''
  <section class="section">
    <div class="wrap gb-split">
      <div class="gb-prose">
        <h2>More than just gearbox repair</h2>
        <p>We offer a wide range of repairs for everyday faults in passenger cars, as well as specialist repairs of Powershift and DSG gearboxes. We’re a well-known local company in Bristol with plenty of positive reviews.</p>
        <p>Our team will do everything from an accurate diagnosis to fixing or replacing your gearbox, so you don’t have to worry about a thing. Let us do what we’re best at: Powershift and DSG gearboxes and general repairs. Call us today.</p>
        <h3>Gearbox repairs</h3>
        <p>Diagnosis, repair, rebuild and replacement of <a href="{p}powershift/">Powershift</a>, <a href="{p}dsg/">DSG</a>, <a href="{p}cvt/">CVT</a> and <a href="{p}semi-auto/">semi-automatic</a> gearboxes, including clutches, control units, mechatronics and dual-mass flywheels.</p>
        <h3>General repairs and servicing</h3>
        <p>Through AutoTech Plus, our workshop also handles <a href="{MAIN}services.html#mot">MOTs</a>, <a href="{MAIN}services.html#servicing">servicing</a>, <a href="{MAIN}services.html#diagnostics">diagnostics</a>, <a href="{MAIN}services.html#brakes">brakes and clutches</a>, <a href="{MAIN}services.html#steering">suspension and steering</a> and <a href="{MAIN}services.html#aircon">air-con</a>.</p>
      </div>
      <aside class="gb-aside">{quote_form(p, 'offer/', title='Request a call back', intro='We’ll call you to talk through the best option for your car.')}
      </aside>
    </div>
  </section>
''' + type_cards(p) + CROSS + footer(p))
    write('offer', body)


# ---------------------------------------------------------------- contact (book-now)
def contact():
    p = '../'
    body = (head(p, 'book-now/', 'Contact &amp; Free Quote | Bristol Gearbox, Brislington',
                 'Contact Bristol Gearbox for a free gearbox repair quote. Call 0117 329 2050, email info@bristolgearbox.co.uk or visit 8 Bonville Rd, Brislington, Bristol BS4 5NZ.',
                 [crumbs_schema([('Home', ''), ('Contact', 'book-now/')])], 'assets/pages/hero-contact.jpg')
            + header(p, 'book-now/')
            + page_hero(p, 'Contact', 'Need gearbox <span class="accent">repair?</span>',
                        'Feel free to get in touch. We offer the best service around Bristol for Powershift and DSG gearboxes, and we’re happy to give you a free quote.',
                        'assets/pages/hero-contact.jpg', actions=False)
            + f'''
  <section class="section contact-page">
    <div class="wrap">
      <div class="contact-cards">
        <a class="c-card" href="{TEL}">
          <span class="c-card__icon">{PHONE_SVG}</span>
          <span class="c-card__label">Give us a call</span>
          <strong>{PHONE}</strong>
          <span class="c-card__hint">During opening hours</span>
        </a>
        <a class="c-card" href="mailto:{EMAIL}">
          <span class="c-card__icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/></svg></span>
          <span class="c-card__label">Send us an email</span>
          <strong>{EMAIL}</strong>
          <span class="c-card__hint">We reply as soon as we can</span>
        </a>
        <a class="c-card" href="{MAPS_DIR}" target="_blank" rel="noopener">
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

      <div class="contact-main">{quote_form(p, 'book-now/', title='Quick contact', intro='Tell us about your car and we’ll get back to you with a free quote.')}
        <aside class="contact-side">
          <div class="help-card help-card--amber">
            <h3>Need an MOT too?</h3>
            <p>Our sister garage AutoTech Plus is at the same address. Book online in under a minute.</p>
            <a class="btn btn--dark" href="{MAIN}#book">Book an MOT {ARROW}</a>
          </div>
          <div class="help-card">
            <h3>Follow us</h3>
            <p>News, updates and the cars we’ve been working on.</p>
            <a class="btn btn--ghost" href="{FACEBOOK}" target="_blank" rel="noopener">Facebook</a>
          </div>
        </aside>
      </div>

      <div class="map">
        <iframe title="Map to Bristol Gearbox" loading="lazy" referrerpolicy="no-referrer-when-downgrade"
          src="https://www.google.com/maps?q=AutoTech+Plus,+8+Bonville+Rd,+Brislington,+Bristol+BS4+5NZ&z=15&output=embed"></iframe>
        <a class="btn btn--primary map__directions" href="{MAPS_DIR}" target="_blank" rel="noopener">Get directions {ARROW}</a>
      </div>
    </div>
  </section>
''' + reviews(p) + footer(p))
    write('book-now', body)


# ---------------------------------------------------------------- blog
POST_SLUG = 'powershift-dsg-repair-bristol'


def blog():
    p = '../'
    body = (head(p, 'blog/', 'Blog | Bristol Gearbox', 'Gearbox advice and news from Bristol Gearbox, the Powershift and DSG specialists in Brislington, Bristol.',
                 [crumbs_schema([('Home', ''), ('Blog', 'blog/')])], 'assets/pages/hero-faq.jpg')
            + header(p, 'blog/')
            + page_hero(p, 'Blog', 'Gearbox <span class="accent">blog</span>', 'Advice and news from our gearbox specialists.', 'assets/pages/hero-faq.jpg', actions=False)
            + f'''
  <section class="section">
    <div class="wrap">
      <a class="gb-post" href="{p}{POST_SLUG}/">
        <img src="{p}assets/pages/gearbox.jpg" alt="" loading="lazy" width="1280" height="720">
        <div>
          <p class="gb-meta">28 February 2021 &middot; Powershift &amp; DSG</p>
          <h2>Powershift &amp; DSG repair in Bristol</h2>
          <p>Why dual-clutch gearboxes go wrong, the symptoms to look out for, and what a repair involves.</p>
          <span class="gb-type__go">Read the article {ARROW}</span>
        </div>
      </a>
    </div>
  </section>
''' + CROSS + footer(p))
    write('blog', body)


def post():
    p = '../'
    title = 'Powershift &amp; DSG Repair Bristol | Bristol Gearbox'
    desc = 'Powershift and DSG dual-clutch gearbox repair in Bristol: common symptoms, why diagnosis comes first, and what a repair involves.'
    article = {'@type': 'BlogPosting', 'headline': 'Powershift & DSG repair in Bristol', 'datePublished': '2021-02-28', 'dateModified': TODAY,
               'author': {'@id': SITE + '#business'}, 'publisher': {'@id': SITE + '#business'}, 'mainEntityOfPage': SITE + POST_SLUG + '/',
               'image': SITE + 'assets/pages/gearbox.jpg'}
    body = (head(p, POST_SLUG + '/', title, desc,
                 [article, crumbs_schema([('Home', ''), ('Blog', 'blog/'), ('Powershift & DSG repair in Bristol', POST_SLUG + '/')])])
            + header(p, 'blog/')
            + page_hero(p, 'Blog', 'Powershift &amp; DSG <span class="accent">repair Bristol</span>',
                        'Why dual-clutch gearboxes go wrong, what to look out for, and how we fix them.', 'assets/pages/gearbox.jpg')
            + f'''
  <section class="section">
    <div class="wrap gb-split">
      <article class="gb-prose">
        <p class="gb-meta">28 February 2021 &middot; Updated {date.today().strftime('%-d %B %Y')}</p>
        <p>Ford’s Powershift and the Volkswagen Group’s DSG are both dual-clutch gearboxes. They give you the convenience of an automatic with the efficiency of a manual, but they are more complex than either, and they need a specialist when something goes wrong. Here’s what you need to know.</p>
        <h2>How a dual-clutch gearbox works</h2>
        <p>A dual-clutch gearbox is effectively two gearboxes in one housing. One clutch handles the odd gears and the other the even gears, so the next gear is always pre-selected. A gear change is simply one clutch releasing as the other engages, which is why the changes are so quick and smooth. A control unit (on DSG, the mechatronic unit) decides when to change and operates the clutches.</p>
        <h2>Symptoms to look out for</h2>
        {signs(['Judder when pulling away or in slow traffic', 'Slipping, or a delay before the car moves', 'Jerky, harsh or delayed gear changes', 'A flashing gear display or warning message', 'Limp mode or loss of drive', 'A burning smell or oil leaks'])}
        <p>Problems often start small. A slight judder in traffic can become a slipping clutch or a failed control unit if it’s ignored, so it pays to get it checked early.</p>
        <h2>Why diagnosis comes first</h2>
        <p>The same symptom can have several causes: worn clutches, a faulty control module, a dual-mass flywheel, contaminated clutches from a leaking seal, or simply a clutch that needs relearning. Guessing gets expensive. We use Bosch diagnostic equipment with dedicated gearbox interfaces to read what the gearbox controller has recorded, then give you a report and a quote before any work starts.</p>
        <h2>What a repair involves</h2>
        <p>Depending on the fault, we may renew the clutches, repair or replace the control unit or mechatronics, replace seals and actuators, rebuild the gearbox or fit a quality replacement unit. After clutch or controller work, the gearbox is recalibrated so it drives as it should. Every repair comes with a warranty.</p>
        <p>Read more about <a href="{p}powershift/">Powershift gearbox repair</a> and <a href="{p}dsg/">DSG gearbox repair</a>, or call us on <a href="{TEL}">{PHONE}</a>.</p>
      </article>
      <aside class="gb-aside">{quote_form(p, POST_SLUG + '/')}
      </aside>
    </div>
  </section>
''' + CROSS + footer(p))
    write(POST_SLUG, body)


def not_found():
    # Served for any unknown URL, so links must be root-absolute
    body = (head('/', '', 'Page not found | Bristol Gearbox', 'This page could not be found.', []).replace(f'<link rel="canonical" href="{SITE}">\n', '<meta name="robots" content="noindex">\n')
            + header('/', None)
            + page_hero('/', '', 'Page <span class="accent">not found</span>',
                        'Sorry, that page doesn’t exist any more. Try one of our gearbox pages below, or give us a call.', 'assets/pages/gearbox.jpg')
            + type_cards('/') + footer('/'))
    (OUT / '404.html').write_text(body)


# ---------------------------------------------------------------- SEO + hosting files
PAGES = ['', 'about/', 'offer/', 'book-now/', 'powershift/', 'dsg/', 'cvt/', 'semi-auto/', 'blog/', POST_SLUG + '/']

# Old WordPress URLs that are being retired (theme demo leftovers) -> best live page
REDIRECTS = [('/sample-page/', '/'), ('/pass-plus/', '/'), ('/locations/', '/book-now/'), ('/home/', '/'),
             ('/category/*', '/blog/'), ('/author/*', '/'), ('/feed/', '/blog/'), ('/comments/feed/', '/blog/'),
             ('/courses/*', '/'), ('/wp-sitemap.xml', '/sitemap.xml'), ('/sitemap_index.xml', '/sitemap.xml')]


def seo_files():
    urls = ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{TODAY}</lastmod></url>\n' for u in PAGES)
    (OUT / 'sitemap.xml').write_text(f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{urls}</urlset>\n')
    (OUT / 'robots.txt').write_text(f'User-agent: *\nAllow: /\n\nSitemap: {SITE}sitemap.xml\n')
    # Azure Static Web Apps config: 301 the retired WordPress URLs so their ranking passes to a live page,
    # serve 404.html for unknown URLs, and keep the trailing-slash URLs the canonicals use
    config = {'trailingSlash': 'always',
              'routes': [{'route': a[:-1] + '*' if a.endswith('/') else a, 'redirect': b, 'statusCode': 301} for a, b in REDIRECTS],  # '/x*' matches /x and /x/
              'responseOverrides': {'404': {'rewrite': '/404.html'}}}
    (OUT / 'staticwebapp.config.json').write_text(json.dumps(config, indent=2) + '\n')
    (OUT / '_redirects').unlink(missing_ok=True)


def copy_shared():
    for rel in SHARED + [f'assets/reviews/{img}.jpg' for _, img, _, _ in REVIEWS]:
        if not (ROOT / rel).exists():  # review photos are optional (initials are shown instead)
            continue
        dst = OUT / rel
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel, dst)


def build():
    OUT.mkdir(exist_ok=True)
    copy_shared()
    home()
    for slug in TYPES:
        type_page(slug)
    about()
    offer()
    contact()
    blog()
    post()
    not_found()
    seo_files()
