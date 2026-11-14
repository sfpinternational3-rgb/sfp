/* Shared helpers for login.html, register.html and dashboard.html.
   Pages and the api/ folder must sit in the same folder on your site. */
(function () {
  var csrfToken = null;

  function getCsrf() {
    if (csrfToken) return Promise.resolve(csrfToken);
    return fetch('api/csrf.php', { credentials: 'same-origin' })
      .then(function (r) { return r.json(); })
      .then(function (d) { csrfToken = d.token; return csrfToken; });
  }

  // POST JSON with the CSRF token. Resolves to { ok, status, data }.
  function post(url, body) {
    return getCsrf().then(function (token) {
      return fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
        body: JSON.stringify(body || {})
      });
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        // After sign-in or registration, send the learner back to the page they
        // came from (saved by the course pages as "sfp_next").
        if (r.ok && data.redirect && /api\/(login|register)\.php/.test(url)) {
          try {
            var next = sessionStorage.getItem('sfp_next');
            if (next && /^[a-z0-9-]+\.html$/i.test(next)) {
              sessionStorage.removeItem('sfp_next');
              data.redirect = next;
            }
          } catch (e) {}
        }
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }

  function get(url) {
    return fetch(url, { credentials: 'same-origin' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (data) {
        return { ok: r.ok, status: r.status, data: data };
      });
    });
  }

  window.Auth = { post: post, get: get };
})();
