/* Cruz Control Concrete — conversion tracking. No dependencies.
   Added 2026-09-28 as part of the GA4 tracking retrofit. This site had no
   public/site.js before this; the nav toggle and phone auto-format stay
   inline in build.mjs's layout() where they already lived. */
(function () {
  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
    else if (window.dataLayer) window.dataLayer.push(Object.assign({ event: name }, params || {}));
  }

  // Phone taps, anywhere on the site.
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (a) track('contact_phone', { method: 'phone', link_url: a.getAttribute('href'), page_path: location.pathname });
  }, true);

  // Estimate form submissions, captured at submit so it fires even if the
  // ?ok=1 redirect is slow or blocked.
  document.addEventListener('submit', function (e) {
    var f = e.target;
    if (f && f.getAttribute && f.getAttribute('name') === 'estimate') {
      track('generate_lead', { form_name: f.getAttribute('name'), page_path: location.pathname });
    }
  }, true);

  // This site has no dedicated thank-you page. The form already redirects to
  // /contact/?ok=1 on success, so that query param IS the confirmation signal.
  if (location.pathname.indexOf('/contact') === 0 && location.search.indexOf('ok=1') !== -1) {
    track('generate_lead_confirmed', { page_path: location.pathname });
  }
})();
