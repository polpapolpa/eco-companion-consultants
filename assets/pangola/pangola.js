(() => {
 const menu = document.getElementById('mobile-nav');
 const toggle = document.querySelector('.menu-button');
 function closeMenu() { menu.hidden = true; toggle.setAttribute('aria-expanded', 'false'); }
 toggle.addEventListener('click', () => { const open = menu.hidden; menu.hidden = !open; toggle.setAttribute('aria-expanded', String(open)); });
 menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
 document.addEventListener('keydown', event => { if (event.key === 'Escape' && !menu.hidden) { closeMenu(); toggle.focus(); } });
 document.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
  const lang = button.dataset.language;
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-language]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.language === lang)));
  document.querySelector('meta[name="description"]').content = lang === 'th' ? 'Pangola Farm ศูนย์การเรียนรู้ธรรมชาติและความหลากหลายทางชีวภาพของ Eco Companion กิจกรรมสำหรับเด็ก นักเรียน และนักศึกษาทั้งไทยและต่างประเทศ' : 'Pangola Farm is Eco Companion’s biodiversity learning hub for children, schools and university groups from Thailand and abroad.';
 }));
})();
