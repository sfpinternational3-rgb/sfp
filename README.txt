SFP LOGIN AND SIGN-UP SYSTEM
============================

WHAT YOU GET
  login.html, register.html, dashboard.html   the pages
  auth.css, auth.js                           shared style and script
  api/                                        PHP files that do the real work
  data/                                       created automatically; holds the user database

REQUIREMENTS
  Web hosting with PHP 7.4 or newer (nearly all cPanel hosts qualify).
  No database setup needed: the first visit creates a SQLite file in data/.

INSTALL
  1. Upload everything to ONE folder on your site (for example public_html/).
     The pages and the api/ folder must be side by side.
  2. Open register.html, create an account, and you land on dashboard.html.
  3. Sign out, then test login.html with the same email and password.

DO THESE BEFORE GOING LIVE
  * Use HTTPS (a free SSL certificate in cPanel is enough).
  * Move the data/ folder OUTSIDE public_html, then change the DATA_DIR line at the top of
    api/config.php to match. data/.htaccess already blocks web access on Apache hosts, but
    outside the web folder is safer and works on every server.
  * Back up data/sfp.sqlite regularly. It holds all your students.
  * On dashboard.html, replace the placeholder box with links to your course pages.

HOW IT PROTECTS STUDENTS
  Passwords are stored as bcrypt hashes, never as plain text.
  All database calls use prepared statements.
  Every sign-in, sign-up and sign-out request carries a CSRF token.
  Sessions use HttpOnly, SameSite cookies and get a new ID at login.
  5 failed sign-ins per email per device locks that email out for 15 minutes.

NOT INCLUDED YET
  Forgot-password emails (the link on the login page points to forgot-password.html,
  which does not exist yet). Needs outgoing email set up on your host.
  Protecting course pages: to require sign-in on a course page, copy the Auth.get('api/me.php')
  check from dashboard.html into it.
