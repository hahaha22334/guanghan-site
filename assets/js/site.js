(() => {
  const root = document.documentElement;
  root.classList.add('js');

  const menuButton = document.querySelector('[data-menu-button]');
  const navigation = document.querySelector('[data-navigation]');
  const mobileQuery = window.matchMedia('(max-width: 47.999rem)');

  const setMenu = (open, returnFocus = false) => {
    if (!menuButton || !navigation) return;
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.setAttribute('aria-label', open ? '关闭导航' : '打开导航');
    navigation.classList.toggle('is-open', open);
    const use = menuButton.querySelector('use');
    if (use) use.setAttribute('href', open ? 'assets/icons.svg#icon-close' : 'assets/icons.svg#icon-menu');
    if (open) navigation.querySelector('a')?.focus();
    if (!open && returnFocus) menuButton.focus();
  };

  if (menuButton && navigation) {
    menuButton.addEventListener('click', () => setMenu(menuButton.getAttribute('aria-expanded') !== 'true'));
    navigation.addEventListener('click', (event) => {
      if (event.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') setMenu(false, true);
    });
    document.addEventListener('click', (event) => {
      if (!navigation.contains(event.target) && !menuButton.contains(event.target)) setMenu(false);
    });
    mobileQuery.addEventListener?.('change', () => setMenu(false));
  }

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealItems = [...document.querySelectorAll('.reveal')];
  if (reduceMotion || !('IntersectionObserver' in window)) {
    revealItems.forEach((item) => item.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealItems.forEach((item) => revealObserver.observe(item));
  }

  const sectionLinks = [...document.querySelectorAll('[data-section-link]')];
  const linkedSections = sectionLinks.map((link) => document.querySelector(link.getAttribute('href'))).filter(Boolean);
  if (sectionLinks.length && linkedSections.length && 'IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      sectionLinks.forEach((link) => {
        const active = link.getAttribute('href') === `#${visible.target.id}`;
        link.classList.toggle('is-active', active);
        if (active) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
    }, { rootMargin: '-25% 0px -65% 0px', threshold: [0, 0.1, 0.5] });
    linkedSections.forEach((section) => sectionObserver.observe(section));
  }

  document.querySelectorAll('[data-copy-address]').forEach((button) => {
    button.addEventListener('click', async () => {
      const card = button.closest('.visit-card');
      const address = card?.querySelector('[data-address]')?.textContent.trim();
      const status = card?.querySelector('[data-copy-status]');
      if (!address) return;
      try {
        await navigator.clipboard.writeText(address);
        if (status) status.textContent = '地址已复制';
      } catch {
        const range = document.createRange();
        const selection = window.getSelection();
        range.selectNodeContents(card.querySelector('[data-address]'));
        selection.removeAllRanges();
        selection.addRange(range);
        if (status) status.textContent = '请复制已选中的地址';
      }
    });
  });

  document.querySelectorAll('[data-current-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
})();
