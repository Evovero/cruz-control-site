import { biz, services, locations } from './src/data/site.mjs';
import { serviceDetail, locationDetail } from './src/data/content.mjs';
import { mkdirSync, writeFileSync, cpSync, existsSync, rmSync, readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.env.OUT || 'dist';
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');

/* ---------- shared pieces ---------- */
const addr = `${biz.street}, ${biz.city}, ${biz.state} ${biz.zip}`;

function localBusinessSchema(extra={}){
  const s = {
    "@context":"https://schema.org",
    "@type":"GeneralContractor",
    "name":biz.name,
    "image":`${biz.domain}/logo.png`,
    "@id":`${biz.domain}/#business`,
    "url":biz.domain,
    "telephone":`+1-${biz.phone}`,
    "email":biz.email,
    "address":{"@type":"PostalAddress","streetAddress":biz.street,"addressLocality":biz.city,"addressRegion":biz.state,"postalCode":biz.zip,"addressCountry":"US"},
    "areaServed":locations.map(l=>({"@type":"City","name":l.town})),
    "openingHours":"Mo-Sa 08:00-23:00",
    "geo":{"@type":"GeoCoordinates","latitude":21.4447,"longitude":-158.1861},
    "priceRange":"$$"
  };
  if(biz.gbpCidUrl) s.hasMap = biz.gbpCidUrl;
  return JSON.stringify({...s, ...extra});
}

function breadcrumbSchema(items){
  return {"@context":"https://schema.org","@type":"BreadcrumbList","itemListElement":
    items.map((it,i)=>({"@type":"ListItem","position":i+1,"name":it.name,"item":`${biz.domain}/${it.slug?it.slug+'/':''}`}))};
}
function faqListSchema(faqs){
  return {"@context":"https://schema.org","@type":"FAQPage","mainEntity":
    faqs.map(f=>({"@type":"Question","name":f.q,"acceptedAnswer":{"@type":"Answer","text":f.a}}))};
}
function faqSection(faqs, heading="Frequently Asked Questions"){
  return `<section class="section"><div class="container" style="max-width:900px">
    <div class="center"><p class="eyebrow">FAQ</p><h2>${esc(heading)}</h2></div>
    <div class="faq-list mt">${faqs.map(f=>`<details class="faq"><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join('')}</div>
  </div></section>`;
}
function processSection(steps, heading="How We Work"){
  return `<section class="section section--sand"><div class="container">
    <div class="center"><p class="eyebrow">Our Process</p><h2>${esc(heading)}</h2></div>
    <div class="steps mt">${steps.map((st,i)=>`<div class="step"><span class="step-num">${i+1}</span><div><h3>${esc(st.t)}</h3><p>${esc(st.d)}</p></div></div>`).join('')}</div>
  </div></section>`;
}

function header(){
  const servMenu = services.map(s=>`<a href="/${s.slug}/">${esc(s.title)}</a>`).join('');
  const areaMenu = locations.filter(l=>l.tier<=2).map(l=>`<a href="/${l.slug}/">${esc(l.town)}</a>`).join('');
  return `<header class="nav"><div class="container">
    <a class="brand" href="/"><img class="logo-img" src="/logo.png" alt="${esc(biz.name)} logo" width="56" height="56"></a>
    <nav><ul class="menu">
      <li><a href="/">Home</a></li>
      <li class="has"><a href="/concrete-services/">Services</a><div class="submenu">${servMenu}</div></li>
      <li class="has"><a href="/service-areas/">Service Areas</a><div class="submenu">${areaMenu}<a href="/service-areas/"><b>All areas →</b></a></div></li>
      <li><a href="/about-us/">About</a></li>
      <li><a href="/blog/">Blog</a></li>
      <li><a href="/contact/">Contact</a></li>
    </ul></nav>
    <div class="nav-cta"><a class="btn btn--primary nav-phone" href="${biz.phoneHref}">&#9742; ${esc(biz.phone)}</a><button class="hamb" type="button" aria-label="Open menu" aria-expanded="false"><span></span><span></span><span></span></button></div>
  </div></header>`;
}

function footer(){
  const servLinks = services.map(s=>`<a href="/${s.slug}/">${esc(s.title)}</a>`).join('');
  const areaLinks = locations.slice(0,8).map(l=>`<a href="/${l.slug}/">${esc(l.town)}</a>`).join('');
  return `<footer class="foot"><div class="container">
    <div class="foot-grid">
      <div>
        <h4>${esc(biz.name)}</h4>
        <p>Residential concrete flatwork built for Hawaii. Based in Waianae, serving all of Oahu with ${esc(biz.yearsExp)} years of experience.</p>
        <p><a href="${biz.phoneHref}">${esc(biz.phone)}</a><br>${esc(biz.email)}<br>${esc(addr)}<br>${esc(biz.hours)}</p>
      </div>
      <div><h4>Services</h4>${servLinks}</div>
      <div><h4>Service Areas</h4>${areaLinks}<a href="/service-areas/"><b>All areas →</b></a></div>
      <div><h4>Get Started</h4><a href="/contact/">Free Estimate</a><a href="${biz.phoneHref}">Call Now</a><a href="/about-us/">About Us</a><a href="/blog/">Blog</a></div>
    </div>
    <div class="foot-bottom"><span>© ${new Date().getFullYear()} ${esc(biz.name)}. All rights reserved.</span><span>Concrete Contractor on Oahu</span></div>
  </div></footer>`;
}

function layout({title,desc,slug,body,schema=''}){
  const url = `${biz.domain}/${slug?slug+'/':''}`;
  return `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(desc)}">
<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}">
<meta property="og:type" content="website"><meta property="og:url" content="${url}">
<meta property="og:image" content="${biz.domain}/logo.png">
<link rel="icon" type="image/png" href="/logo.png">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@600;700;800&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/styles.css">
<script type="application/ld+json">${localBusinessSchema()}</script>
${schema?`<script type="application/ld+json">${schema}</script>`:''}
</head><body>
${header()}
${body}
${footer()}
<script>document.addEventListener('click',function(e){var nav=document.querySelector('header.nav');var h=e.target.closest('.hamb');if(h){var open=nav.classList.toggle('open');h.setAttribute('aria-expanded',open?'true':'false');}else if(nav&&nav.classList.contains('open')&&e.target.closest('.menu a')){nav.classList.remove('open');}});
document.addEventListener('input',function(e){if(e.target&&e.target.type==='tel'){var v=e.target.value.replace(/\\D/g,'').slice(0,10),p='';if(v.length>6)p='('+v.slice(0,3)+') '+v.slice(3,6)+'-'+v.slice(6);else if(v.length>3)p='('+v.slice(0,3)+') '+v.slice(3);else if(v.length>0)p='('+v;e.target.value=p;}});</script>
</body></html>`;
}

/* ---------- reusable blocks ---------- */
const estimateForm = (heading="Request a Free Estimate")=>`
<form class="formwrap" name="estimate" method="POST" data-netlify="true" netlify-honeypot="bot-field" action="/contact/?ok=1">
  <input type="hidden" name="form-name" value="estimate"><p class="hp"><label>Don't fill <input name="bot-field"></label></p>
  <h3>${esc(heading)}</h3><p class="formsub">Fill out the form and we'll reach out shortly to schedule it.</p>
  <div class="frow">
    <div class="field"><label>First Name*</label><input name="first_name" required></div>
    <div class="field"><label>Last Name*</label><input name="last_name" required></div>
  </div>
  <div class="field"><label>Phone*</label><input name="phone" type="tel" inputmode="tel" placeholder="(808) 555-1234" required></div>
  <div class="field"><label>Email <span class="opt">(only if you'd like email contact)</span></label><input name="email" type="email" placeholder="you@email.com"></div>
  <div class="field"><label>How would you like to be contacted?</label><div class="checkrow">
    <label><input type="checkbox" name="contact" value="Call"> Call</label>
    <label><input type="checkbox" name="contact" value="Text"> Text</label>
    <label><input type="checkbox" name="contact" value="Email"> Email</label></div></div>
  <div class="field"><label>What do you need?*</label><textarea name="project" placeholder="Tell us about your project (type of work, size, timing)" required></textarea></div>
  <button class="btn btn--primary" type="submit" style="width:100%">Request My Estimate</button>
  <p class="formdisc">No pressure, no spam. We'll reach out the way you prefer. By submitting, you agree to be contacted about your request. We never sell your info.</p>
</form>`;

const ctaBand = ()=>`<section class="section section--ocean"><div class="container center">
  <h2>Ready to Start Your Concrete Project?</h2>
  <p class="lead" style="margin:10px auto 24px">Free, no-obligation estimates across Oahu. Talk to a real concrete pro today.</p>
  <div class="actions" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
    <a class="btn btn--primary" href="${biz.phoneHref}">Call ${esc(biz.phone)}</a>
    <a class="btn btn--ghost" href="/contact/">Request a Free Estimate</a>
  </div></div></section>`;

const IMG='/img/';
const pic=(file,alt)=>`<img class="ph" src="${IMG}${file}" alt="${esc(alt)}" loading="lazy">`;
const heroBg=(file)=>`<div class="imgslot" style="background-image:linear-gradient(90deg,rgba(15,22,27,.82),rgba(15,22,27,.45) 58%,rgba(15,22,27,.22)),url(${IMG}${file});background-size:cover;background-position:center 38%"></div>`;
// rotation pool for location pages (unique-ish per town)
const pool=['deck-view-1.jpg','deck-house.jpg','steps-feature.jpg','retaining-deck.jpg','deck-retaining.jpg','deck-view-2.jpg','deck-patio.jpg','pool-shell-1.jpg','pool-shell-2.jpg','finished-floor.jpg','tile-patio.jpg','concrete-steps.jpg','fresh-slab.jpg','slab-pour-2.jpg','big-pour.jpg'];
const serviceImg={
  'concrete-driveway-contractor':{hero:'fresh-slab.jpg',body:'driveway-paver.jpg',card:'driveway-paver.jpg'},
  'concrete-patio-contractor':{hero:'deck-patio.jpg',body:'deck-view-2.jpg',card:'deck-patio.jpg'},
  'concrete-slab-contractor':{hero:'big-pour.jpg',body:'slab-pour-2.jpg',card:'fresh-slab.jpg'},
  'custom-concrete-contractor':{hero:'breeze-block-wall.jpg',body:'tile-patio.jpg',card:'breeze-block-wall.jpg'},
  'masonry-contractor':{hero:'breeze-block-2.jpg',body:'breeze-block-progress.jpg',card:'breeze-block-2.jpg'},
};

/* ---------- pages ---------- */
function home(){
  const serviceCards = services.map(s=>`<div class="card">${pic(serviceImg[s.slug].card, s.title+' on Oahu by Cruz Control Concrete Hawaii')}<div class="body"><h3>${esc(s.title)}</h3><p>${esc(s.blurb)}</p><a class="more" href="/${s.slug}/">Learn more →</a></div></div>`).join('');
  const body = `
  <section class="hero hero--full">${heroBg('driveway-prep.jpg')}<div class="container">
    <div class="hero-copy">
      <p class="eyebrow eyebrow--sun">Serving Waianae &amp; All of Oahu</p>
      <h1>Oahu's Trusted Concrete Contractor</h1>
      <p>Durable driveways, patios, slabs, and custom flatwork, built for Hawaii's climate. Call or request a free, no-obligation estimate today.</p>
      <div class="actions"><a class="btn btn--primary" href="#estimate">Free Estimate &rarr;</a><a class="btn btn--white" href="${biz.phoneHref}">&#9742; Call ${esc(biz.phone)}</a></div>
    </div>
  </div></section>

  <section class="section--stats"><div class="container"><div class="stats">
    <div class="stat"><b>${esc(biz.yearsExp)}</b><span>Years Experience</span></div>
    <div class="stat"><b>5.0&#9733;</b><span>Homeowner Rated</span></div>
    <div class="stat"><b>Free</b><span>On-Site Estimates</span></div>
    <div class="stat"><b>All&nbsp;Oahu</b><span>Service Area</span></div>
  </div></div></section>

  <section class="section section--sand" id="estimate"><div class="container"><div class="estimate-grid">
    <div><p class="eyebrow">Free Estimate</p><h2>Tell us about your project</h2>
      <p class="lead">We'll get back to you fast with a free, no-obligation estimate. No pressure and no spam, just honest help from a local Oahu crew with ${esc(biz.yearsExp)} years of concrete experience.</p>
      ${pic('deck-patio.jpg','Finished concrete patio on Oahu by Cruz Control Concrete Hawaii')}
    </div>
    ${estimateForm('Request a Free Estimate')}
  </div></div></section>

  <section class="section"><div class="container split">
    <div><p class="eyebrow">Concrete Contractor on Oahu</p><h2>Built for Hawaii's climate, soil, and salt air</h2>
    <p class="lead">With ${esc(biz.yearsExp)} years of hands-on experience, we focus on proper preparation, precise installation, and clean finishing on every job, from new driveways to backyard patios and structural slabs.</p>
    <ul class="checks"><li>Residential flatwork specialists</li><li>Proper base prep, drainage & reinforcement</li><li>Reliable scheduling and clear communication</li><li>High-quality materials and workmanship</li></ul>
    <a class="btn btn--dark" href="/about-us/">About Cruz Control →</a></div>
    ${pic('deck-retaining.jpg','Finished concrete flatwork by Cruz Control Concrete Hawaii on Oahu')}
  </div></section>

  <section class="section section--sand"><div class="container">
    <div class="center"><p class="eyebrow">What We Do</p><h2>Residential Concrete Services</h2><p class="lead" style="margin:8px auto 0">Expert flatwork crafted with care across Oahu.</p></div>
    <div class="grid grid-3 mt">${serviceCards}</div>
  </div></section>

  <section class="section" id="work"><div class="container">
    <div class="center"><p class="eyebrow">Our Work</p><h2>Recent Projects Across Oahu</h2><p class="lead" style="margin:8px auto 0">Real driveways, patios, and slabs from our crew.</p></div>
    <div class="gallery mt">
      ${['driveway-prep.jpg','deck-view-1.jpg','deck-patio.jpg','breeze-block-wall.jpg','fresh-slab.jpg','steps-feature.jpg','retaining-deck.jpg'].map(f=>`<img src="/img/${f}" alt="Cruz Control Concrete Hawaii project on Oahu" loading="lazy">`).join('')}
    </div>
  </div></section>

  <section class="section section--sand"><div class="container">
    <div class="center"><p class="eyebrow">Reviews</p><h2>What Oahu Homeowners Say</h2></div>
    <div class="quotes mt">
      <div class="quote"><div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p>"Cruz Control Concrete transformed our driveway with flawless craftsmanship and timely service. Highly recommend for any Oahu homeowner!"</p><div class="who"><span class="av">M</span><div>Mia K.<small>Oahu homeowner</small></div></div></div>
      <div class="quote"><div class="stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><p>"Professional, reliable, and exceptional work from start to finish. The crew was clean, on time, and the result speaks for itself."</p><div class="who"><span class="av">L</span><div>Lani K.<small>Oahu homeowner</small></div></div></div>
      <div class="quote" style="background:linear-gradient(135deg,var(--ocean),var(--ocean-2));color:#fff;display:flex;flex-direction:column;justify-content:center;gap:6px"><h3 style="color:#fff;margin:0">Your project could be next.</h3><p style="color:#cfe3ea">Join the Oahu homeowners who trust Cruz Control with their concrete.</p><a class="btn btn--primary" href="/contact/">Get a Free Estimate</a></div>
    </div>
  </div></section>

  ${ctaBand()}`;
  return layout({title:`Oahu Concrete Contractor | Cruz Control Concrete Hawaii`,desc:`Concrete driveways, patios, slabs and custom finishes across Oahu. Based in Waianae with 12+ years of island experience. Free estimates: ${biz.phone}.`,slug:'',body});
}

function servicePage(s){
  const c = serviceDetail[s.slug];
  const si = serviceImg[s.slug];
  const others = services.filter(x=>x.slug!==s.slug).map(x=>`<a href="/${x.slug}/">${esc(x.title)}</a>`).join(' &middot; ');
  const townPills = c.towns.map(t=>{const l=locations.find(x=>x.slug===t);return l?`<a class="pill" href="/${l.slug}/">${esc(l.town)}</a>`:'';}).join('');
  const included = c.included.map(x=>`<div class="tile"><h3>${esc(x.t)}</h3><p>${esc(x.d)}</p></div>`).join('');
  const schema = JSON.stringify([
    {"@context":"https://schema.org","@type":"Service","serviceType":s.title,"url":`${biz.domain}/${s.slug}/`,"provider":{"@type":"GeneralContractor","name":biz.name,"@id":`${biz.domain}/#business`},"areaServed":locations.map(l=>({"@type":"City","name":l.town})),"description":c.intro},
    faqListSchema(c.faqs),
    breadcrumbSchema([{name:"Home",slug:""},{name:"Concrete Services",slug:"concrete-services"},{name:s.title,slug:s.slug}])
  ]);
  const body=`
  <section class="hero">${heroBg(si.hero)}<div class="container">
    <p class="eyebrow" style="color:#9fd4dd">Concrete Services</p><h1>${esc(s.title)} on Oahu</h1>
    <p>${esc(c.intro)}</p>
    <div class="actions"><a class="btn btn--primary" href="/contact/">Free Estimate</a><a class="btn btn--ghost" href="${biz.phoneHref}">Call ${esc(biz.phone)}</a></div>
  </div></section>
  <section class="section"><div class="container">
    <div class="center"><p class="eyebrow">What's included</p><h2>Professional ${esc(s.title)}</h2></div>
    <div class="grid grid-3 mt">${included}</div>
  </div></section>
  ${processSection(c.process, 'How your project comes together')}
  <section class="section"><div class="container split">
    <div><p class="eyebrow">Built for the island</p><h2>${esc(c.local.h2)}</h2>
      ${c.local.p.map(pp=>`<p class="lead">${esc(pp)}</p>`).join('')}
      <a class="btn btn--dark" href="/service-areas/">Areas we serve &rarr;</a>
    </div>${pic(si.body, s.title+' project on Oahu by Cruz Control Concrete Hawaii')}</div></section>
  <section class="section section--sand"><div class="container center">
    <p class="eyebrow">Where we work</p><h2>${esc(s.nav)} across Oahu</h2>
    <div class="pills pills--center mt">${townPills}<a class="pill" href="/service-areas/"><b>All areas &rarr;</b></a></div>
  </div></section>
  ${faqSection(c.faqs, s.title+': Your Questions Answered')}
  <section class="section section--sand"><div class="container split">${estimateForm(`Get a Free ${s.title} Estimate`)}
    <div><p class="eyebrow">Other services</p><h2>We do it all in concrete</h2><p class="lead">${others}</p>
    <p class="mt">Not sure what you need? Call us at <a href="${biz.phoneHref}">${esc(biz.phone)}</a> and we'll point you the right way.</p></div></div></section>
  ${ctaBand()}`;
  return layout({title:c.metaTitle,desc:c.metaDesc,slug:s.slug,body,schema});
}

function servicesHub(){
  const cards = services.map(s=>`<div class="card">${pic(serviceImg[s.slug].card, s.title+' on Oahu by Cruz Control Concrete Hawaii')}<div class="body"><h3>${esc(s.title)}</h3><p>${esc(s.blurb)}</p><a class="more" href="/${s.slug}/">Learn more →</a></div></div>`).join('');
  const body=`<section class="hero">${heroBg('deck-view-1.jpg')}<div class="container"><h1>Concrete Services on Oahu</h1><p>Full-service residential concrete flatwork, from driveways and patios to slabs, custom finishes, and masonry.</p><div class="actions"><a class="btn btn--primary" href="/contact/">Free Estimate</a></div></div></section>
  <section class="section"><div class="container"><div class="grid grid-3">${cards}</div></div></section>${ctaBand()}`;
  return layout({title:`Concrete Services on Oahu | ${biz.name}`,desc:`Residential concrete services on Oahu: driveways, patios, slabs, custom & decorative concrete, and masonry. Free estimates. Call ${biz.phone}.`,slug:'concrete-services',body});
}

function locationPage(l,i=0){
  const c = locationDetail[l.slug];
  const heroFile=pool[i%pool.length], bodyFile=pool[(i+8)%pool.length];
  const hoods=c.neighborhoods.map(n=>`<span class="pill pill--static">${esc(n)}</span>`).join('');
  const highlights=c.highlights.map(h=>`<div class="tile"><h3>${esc(h.t)}</h3><p>${esc(h.d)}</p></div>`).join('');
  const servList=services.map(sv=>`<li><a href="/${sv.slug}/">${esc(sv.title)}</a></li>`).join('');
  const nearby=locations.filter(x=>x.tier===l.tier&&x.slug!==l.slug).slice(0,3).map(x=>`<a href="/${x.slug}/">${esc(x.town)}</a>`).join(' &middot; ');
  const schema=JSON.stringify([
    {"@context":"https://schema.org","@type":"GeneralContractor","name":biz.name,"telephone":`+1-${biz.phone}`,"areaServed":{"@type":"City","name":l.town},"url":`${biz.domain}/${l.slug}/`,"@id":`${biz.domain}/${l.slug}/#business`,"image":`${biz.domain}/logo.png`},
    faqListSchema(c.faqs),
    breadcrumbSchema([{name:"Home",slug:""},{name:"Service Areas",slug:"service-areas"},{name:l.town,slug:l.slug}])
  ]);
  const body=`
  <section class="hero">${heroBg(heroFile)}<div class="container">
    <p class="eyebrow" style="color:#9fd4dd">Serving ${esc(l.town)}, Oahu</p><h1>Concrete Contractor in ${esc(l.town)}</h1>
    <p>${esc(c.intro)}</p>
    <div class="actions"><a class="btn btn--primary" href="/contact/">Free Estimate in ${esc(l.town)}</a><a class="btn btn--ghost" href="${biz.phoneHref}">Call ${esc(biz.phone)}</a></div>
  </div></section>
  <section class="section"><div class="container split">
    <div><p class="eyebrow">Local concrete experts</p><h2>Your concrete crew in ${esc(l.town)}</h2>
    ${c.about.map(pp=>`<p class="lead">${esc(pp)}</p>`).join('')}
    <div class="pills mt">${hoods}</div></div>
    ${pic(bodyFile,'Concrete project in '+l.town+', Oahu by Cruz Control Concrete Hawaii')}</div></section>
  <section class="section section--sand"><div class="container split">
    <div><p class="eyebrow">What we build</p><h2>Concrete services in ${esc(l.town)}</h2>
      <p class="lead">From new driveways to patios, slabs, and hollow tile walls, every ${esc(l.town)} project gets the same prep-first standard we hold everywhere on Oahu.</p>
      <ul class="checks checks--links">${servList}</ul>
      <a class="btn btn--dark" href="/concrete-services/">All services &rarr;</a></div>
    <div class="tiles-stack">${highlights}</div></div></section>
  <section class="section"><div class="container" style="max-width:900px">
    <p class="eyebrow">Around ${esc(l.town)}</p><h2>The concrete work ${esc(l.town)} calls us for</h2>
    ${c.projects.map(pp=>`<p class="lead">${esc(pp)}</p>`).join('')}
  </div></section>
  ${faqSection(c.faqs, 'Concrete in '+l.town+': Common Questions')}
  <section class="section section--sand"><div class="container split">${estimateForm(`Free Estimate in ${l.town}`)}
    <div><p class="eyebrow">Why ${esc(l.town)} homeowners call us</p><h2>Reliable, local, built to last</h2>
    <ul class="checks"><li>Based nearby in Waianae</li><li>Free, no-obligation estimates</li><li>Prep built for local soil and climate</li><li>Clear communication start to finish</li></ul>
    <p class="mt"><strong>Nearby areas:</strong> ${nearby} &middot; <a href="/service-areas/">All areas</a></p></div></div></section>
  ${ctaBand()}`;
  return layout({title:c.metaTitle,desc:c.metaDesc,slug:l.slug,body,schema});
}

function areasHub(){
  const byTier=t=>locations.filter(l=>l.tier===t).map(l=>`<a href="/${l.slug}/">${esc(l.town)}</a>`).join('');
  const body=`<section class="hero">${heroBg('deck-view-2.jpg')}<div class="container"><h1>Proudly Serving All of Oahu</h1><p>Based in Waianae, we provide residential concrete services across the island, from the Leeward coast to Honolulu and the windward side.</p><div class="actions"><a class="btn btn--primary" href="/contact/">Free Estimate</a></div></div></section>
  <section class="section"><div class="container">
    <p class="eyebrow">West / Leeward Coast</p><div class="areas-list">${byTier(1)}</div>
    <p class="eyebrow mt">Central Oahu</p><div class="areas-list">${byTier(2)}</div>
    <p class="eyebrow mt">Honolulu & East Side</p><div class="areas-list">${byTier(3)}</div>
  </div></section>${ctaBand()}`;
  return layout({title:`Service Areas on Oahu | ${biz.name}`,desc:`Cruz Control Concrete Hawaii serves all of Oahu, including Waianae, Kapolei, Ewa Beach, Honolulu, Kailua and more. Free estimates. Call ${biz.phone}.`,slug:'service-areas',body});
}

function about(){
  const body=`<section class="hero">${heroBg('crew-night-pour.jpg')}<div class="container"><h1>About Cruz Control Concrete Hawaii</h1><p>A local, Waianae-based concrete contractor delivering honest work and durable results across Oahu for ${esc(biz.yearsExp)} years.</p></div></section>
  <section class="section"><div class="container split"><div><p class="eyebrow">Who we are</p><h2>Craftsmanship you can count on</h2>
  <p class="lead">Cruz Control Concrete Hawaii specializes in residential flatwork built for Hawaii's climate and soil. We focus on proper preparation, precise installation, and clean finishing on every job.</p>
  <ul class="checks"><li>${esc(biz.yearsExp)} years of hands-on experience</li><li>Residential flatwork specialists</li><li>Based in Waianae, serving all of Oahu</li><li>Honest recommendations and clear communication</li></ul></div>${pic('deck-house.jpg','Cruz Control Concrete Hawaii finished concrete work on Oahu')}</div></section>${ctaBand()}`;
  return layout({title:`About Our Waianae Concrete Crew | Cruz Control Concrete`,desc:`Cruz Control Concrete Hawaii is a Waianae based crew pouring driveways, patios and slabs across Oahu for 12+ years. Free estimates: call ${biz.phone}.`,slug:'about-us',body});
}

function contact(){
  const body=`<section class="hero">${heroBg('fresh-slab.jpg')}<div class="container"><h1>Get a Free Concrete Estimate</h1><p>Tell us about your project. We'll get back to you fast with a free, no-obligation estimate.</p></div></section>
  <section class="section"><div class="container split">${estimateForm()}
    <div><p class="eyebrow">Contact</p><h2>Talk to a concrete pro</h2>
    <p class="lead">Call or text ${esc(biz.owner.split(' ')[0])} and the team. We serve homeowners across Oahu.</p>
    <p><strong>Phone:</strong> <a href="${biz.phoneHref}">${esc(biz.phone)}</a><br>
    <strong>Email:</strong> ${esc(biz.email)}<br>
    <strong>Address:</strong> ${esc(addr)}<br>
    <strong>Hours:</strong> ${esc(biz.hours)}</p></div></div></section>`;
  return layout({title:`Contact | Free Estimate | ${biz.name}`,desc:`Request a free concrete estimate on Oahu. Call or text ${biz.phone}, or send the form and we will reach out fast. Serving Waianae and all of Oahu.`,slug:'contact',body});
}

/* ---------- blog ---------- */
const POSTS_DIR='posts';
const slugify=s=>String(s).toLowerCase().replace(/<[^>]+>/g,'').replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
function parsePost(file){
  const raw=readFileSync(join(POSTS_DIR,file),'utf8');
  const m=raw.match(/^---\s*([\s\S]*?)\s*---\s*([\s\S]*)$/);
  if(!m) return null;
  const fm={}; m[1].split('\n').forEach(line=>{const i=line.indexOf(':'); if(i>0){const k=line.slice(0,i).trim(); const v=line.slice(i+1).trim().replace(/^["']|["']$/g,''); fm[k]=v;}});
  fm.body=m[2].trim();
  if(!fm.slug) fm.slug=slugify(fm.title||file.replace(/\.md$/,''));
  return fm;
}
function readPosts(){
  if(!existsSync(POSTS_DIR)) return [];
  return readdirSync(POSTS_DIR).filter(f=>f.endsWith('.md')).map(parsePost).filter(Boolean)
    .sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')));
}
function withTocIds(body){
  const items=[];
  const out=body.replace(/<h2(\s[^>]*)?>([\s\S]*?)<\/h2>/g,(mm,attrs,inner)=>{
    const id=slugify(inner); items.push({id,text:inner.replace(/<[^>]+>/g,'')});
    return `<h2 id="${id}"${attrs||''}>${inner}</h2>`;
  });
  const toc=items.length>=3?`<nav class="toc"><strong>On this page</strong><ul>${items.map(i=>`<li><a href="#${i.id}">${esc(i.text)}</a></li>`).join('')}</ul></nav>`:'';
  return {body:out,toc};
}
function faqSchema(body){
  try{
    const idx=body.search(/<h2[^>]*>[^<]*(frequently asked|faq)/i);
    if(idx<0) return null;
    const qs=[...body.slice(idx).matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>\s*<p>([\s\S]*?)<\/p>/g)];
    if(!qs.length) return null;
    return {"@context":"https://schema.org","@type":"FAQPage","mainEntity":qs.map(q=>({"@type":"Question","name":q[1].replace(/<[^>]+>/g,'').trim(),"acceptedAnswer":{"@type":"Answer","text":q[2].replace(/<[^>]+>/g,'').trim()}}))};
  }catch(e){return null;}
}
function fmtDate(d){ try{return new Date(d+'T12:00:00').toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});}catch(e){return d;} }
function postPage(p){
  const {body,toc}=withTocIds(p.body);
  const hero=p.hero||'concrete-steps.jpg';
  const url=`${biz.domain}/blog/${p.slug}/`;
  const blogSchema={"@context":"https://schema.org","@type":"BlogPosting","headline":p.title,"description":p.description||'',"datePublished":p.date,"dateModified":p.date,"image":`${biz.domain}/img/${hero}`,"author":{"@type":"Organization","name":biz.name},"publisher":{"@type":"Organization","name":biz.name,"logo":{"@type":"ImageObject","url":`${biz.domain}/logo.png`}},"mainEntityOfPage":{"@type":"WebPage","@id":url}};
  const faq=faqSchema(body);
  const schema=JSON.stringify(faq?[blogSchema,faq]:blogSchema);
  const css=`<style>.post-body{font-size:1.06rem}.post-body h2{margin:34px 0 12px}.post-body h3{margin:22px 0 8px}.post-body p{margin:0 0 16px}.post-body ul,.post-body ol{margin:0 0 16px 22px}.post-body li{margin:6px 0}.post-body a{font-weight:600}.toc{background:var(--sand);border-radius:12px;padding:18px 22px;margin:0 0 28px}.toc ul{margin:8px 0 0 18px}.toc li{margin:4px 0}</style>`;
  const bodyHtml=`${css}
  <section class="hero">${heroBg(hero)}<div class="container">
    <p class="eyebrow" style="color:#9fd4dd">Concrete Blog</p><h1>${esc(p.title)}</h1>
    <p>${fmtDate(p.date)} &middot; ${esc(biz.name)}</p>
  </div></section>
  <section class="section"><div class="container" style="max-width:840px">
    ${toc}
    <div class="post-body">${body}</div>
    <div class="mt" style="display:flex;gap:12px;flex-wrap:wrap"><a class="btn btn--primary" href="/contact/">Get a Free Estimate</a><a class="btn btn--dark" href="${biz.phoneHref}">Call ${esc(biz.phone)}</a></div>
  </div></section>${ctaBand()}`;
  return layout({title:`${p.title} | ${biz.name}`,desc:p.description||p.title,slug:`blog/${p.slug}`,body:bodyHtml,schema});
}
function blogIndex(){
  const posts=readPosts();
  const list = posts.length
    ? `<div class="grid grid-2">${posts.map(p=>`<div class="card">${pic(p.hero||'concrete-steps.jpg',esc(p.title))}<div class="body"><h3><a href="/blog/${p.slug}/">${esc(p.title)}</a></h3><p>${esc(p.description||'')}</p><a class="more" href="/blog/${p.slug}/">Read more &rarr;</a></div></div>`).join('')}</div>`
    : `<div class="center"><p class="lead" style="margin:0 auto">New posts are coming soon. Check back for concrete tips from the Cruz Control crew.</p></div>`;
  const body=`<section class="hero">${heroBg('concrete-steps.jpg')}<div class="container"><h1>Concrete Tips & Insights</h1><p>Guides and advice on concrete driveways, patios, slabs, and caring for concrete in Hawaii.</p></div></section>
  <section class="section"><div class="container">${list}</div></section>${ctaBand()}`;
  return layout({title:`Concrete Tips for Oahu Homeowners | Cruz Control Concrete`,desc:`Practical concrete advice for Hawaii homes: driveways, patios, slabs and maintenance, from the Cruz Control crew in Waianae. Free estimates: ${biz.phone}.`,slug:'blog',body});
}

/* ---------- write ---------- */
function page(slug, html){
  const dir = slug? join(OUT,slug) : OUT;
  mkdirSync(dir,{recursive:true});
  writeFileSync(join(dir,'index.html'), html);
}
if(existsSync(OUT)){ try{ rmSync(OUT,{recursive:true}); }catch(e){ console.warn('note: could not clear '+OUT+' ('+e.code+'), writing fresh'); } }
mkdirSync(OUT,{recursive:true});
// copy public assets per-file (mount FS rejects recursive dir cpSync)
function copyDir(src,dst){ mkdirSync(dst,{recursive:true}); for(const e of readdirSync(src)){ const s=join(src,e),d=join(dst,e); if(statSync(s).isDirectory()) copyDir(s,d); else writeFileSync(d, readFileSync(s)); } }
copyDir('public', OUT);

page('', home());
page('concrete-services', servicesHub());
services.forEach(s=>page(s.slug, servicePage(s)));
page('service-areas', areasHub());
locations.forEach((l,i)=>page(l.slug, locationPage(l,i)));
page('about-us', about());
page('contact', contact());
const posts = readPosts();
posts.forEach(p=>page('blog/'+p.slug, postPage(p)));
page('blog', blogIndex());

// sitemap + robots
const urls = ['', 'concrete-services','service-areas','about-us','contact','blog',
  ...services.map(s=>s.slug), ...locations.map(l=>l.slug),
  ...posts.map(p=>'blog/'+p.slug)];
writeFileSync(join(OUT,'sitemap.xml'),
`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`+
urls.map(u=>`<url><loc>${biz.domain}/${u?u+'/':''}</loc></url>`).join('\n')+`\n</urlset>`);
writeFileSync(join(OUT,'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${biz.domain}/sitemap.xml\n`);

const count = (function c(d){let n=0;for(const f of readdirSync(d)){const p=join(d,f);n+=statSync(p).isDirectory()?c(p):(f==='index.html'?1:0)}return n})(OUT);
console.log('Built '+count+' pages to /'+OUT);
