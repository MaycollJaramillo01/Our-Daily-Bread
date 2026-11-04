(() => {
  // Lo que cambia con el idioma de la página (<html lang="es"> o <html lang="en">).
  const en = document.documentElement.lang === 'en';
  const T = en
    ? { loc: 'en-US', hoy: 'Today, ', pedir: (p, d) => `Hi, Our Daily Bread. I'd like to order ${p} for today, ${d}.`, hola: 'Hi, Our Daily Bread.', pausar: 'Pause video', seguir: 'Play video' }
    : { loc: 'es-US', hoy: 'Hoy, ', pedir: (p, d) => `Hola, Our Daily Bread. Quiero pedir ${p} para hoy, ${d}.`, hola: 'Hola, Our Daily Bread.', pausar: 'Pausar video', seguir: 'Reproducir video' };

  // La fecha de hoy en Maryland: "el pan de cada día" lleva la fecha del día.
  const now = new Date();
  const parts = (o) => Object.fromEntries(new Intl.DateTimeFormat(T.loc, { timeZone: 'America/New_York', ...o }).formatToParts(now).map((p) => [p.type, p.value.replace('.', '')]));
  const l = parts({ weekday: 'long', day: 'numeric', month: 'long' });
  const s = parts({ weekday: 'short', day: 'numeric', month: 'short' });
  const largo = en ? `${l.weekday}, ${l.month} ${l.day}` : `${l.weekday} ${l.day} de ${l.month}`;
  const corto = en ? `${s.weekday}, ${s.month} ${s.day}` : `${s.weekday} ${s.day} ${s.month}`;
  for (const el of document.querySelectorAll('[data-today]')) {
    const k = el.dataset.today;
    el.textContent = k === 'corto' ? corto : k === 'hoy' ? T.hoy + largo : largo;
  }
  // El mensaje de pedido queda escrito con el plato y la fecha.
  for (const a of document.querySelectorAll('[data-sms]')) {
    const plato = a.dataset.sms;
    a.href = `sms:+14439295727?&body=${encodeURIComponent(plato ? T.pedir(plato, largo) : T.hola)}`;
  }

  // El escenario: la mitad fija muestra lo que corresponde a la sección que se lee.
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const wide = matchMedia('(min-width: 56.25em)');
  const media = document.querySelector('.stage-media');
  const layers = new Map([...media.querySelectorAll('[data-layer]')].map((el) => [el.dataset.layer, el]));
  const pauseBtn = document.querySelector('[data-pause]');
  let current = 'freidora', plate = 'pollo', section = 'inicio';
  let paused = calm.matches, mediaInView = true, heroInView = true;

  const syncVideos = () => {
    const visible = wide.matches ? mediaInView : heroInView;
    layers.forEach((el, key) => {
      const v = el.querySelector('video');
      if (!v) return;
      if (key === current && visible && !paused) v.play().catch(() => {});
      else v.pause();
    });
    pauseBtn.textContent = paused ? T.seguir : T.pausar;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    pauseBtn.style.visibility = layers.get(current).querySelector('video') ? '' : 'hidden';
  };
  const show = (key, quick) => {
    if (key === current) return;
    media.style.setProperty('--fade', quick ? '650ms' : '1600ms');
    layers.get(current).classList.remove('is-on');
    layers.get(key).classList.add('is-on');
    current = key;
    syncVideos();
  };
  const keyFor = (name) => (!wide.matches ? 'freidora' : name === 'platos' ? plate : name === 'historia' ? 'historia' : 'freidora');

  const sectionWatch = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { section = e.target.dataset.stage; show(keyFor(section)); }
  }, { rootMargin: '-50% 0px -50% 0px' });
  document.querySelectorAll('[data-stage]').forEach((el) => sectionWatch.observe(el));
  new IntersectionObserver(([e]) => { mediaInView = e.isIntersecting; syncVideos(); }, { threshold: 0.15 }).observe(media);
  new IntersectionObserver(([e]) => { heroInView = e.isIntersecting; syncVideos(); }, { threshold: 0.1 }).observe(document.querySelector('.hero'));
  wide.addEventListener('change', () => show(keyFor(section)));
  calm.addEventListener('change', () => { paused = calm.matches; syncVideos(); });
  pauseBtn.addEventListener('click', () => { paused = !paused; syncVideos(); });

  // Elegir el plato: cambia la foto del escenario (o la del teléfono) y el mensaje.
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const fotoTel = document.querySelector('.plato-foto img');
  const tablist = document.querySelector('[role="tablist"]');
  const bar = tablist.querySelector('.tab-bar');
  tablist.hidden = false;
  // La barra se mide sobre la pestaña activa; la primera vez y al cambiar de tamaño se coloca sin animar.
  const moveBar = (tab, animate) => {
    const place = () => {
      bar.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop + tab.offsetHeight - 2}px)`;
      bar.style.width = `${tab.offsetWidth}px`;
    };
    if (animate) return place();
    bar.style.transition = 'none';
    place();
    void bar.offsetWidth;
    bar.style.transition = '';
  };
  let ready = false;
  const select = (tab, focus) => {
    for (const t of tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    }
    plate = tab.dataset.plate;
    const img = layers.get(plate).querySelector('img');
    fotoTel.src = img.getAttribute('src');
    fotoTel.alt = img.alt;
    if (section === 'platos') show(keyFor(section), true);
    moveBar(tab, ready);
    ready = true;
    if (focus) tab.focus();
  };
  const activeTab = () => tabs.find((t) => t.getAttribute('aria-selected') === 'true') || tabs[0];
  // Cualquier cambio de medida (ventana, letra que termina de cargar, salto de línea) vuelve a colocar la barra.
  const ro = new ResizeObserver(() => moveBar(activeTab(), false));
  [tablist, ...tabs].forEach((el) => ro.observe(el));
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      select(tabs[(map[e.key] + tabs.length) % tabs.length], true);
    });
  });
  select(tabs[0]);
  syncVideos();

  // Entradas, una vez, cuando la sección llega.
  const targets = document.querySelectorAll('[data-reveal]');
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
  }, { rootMargin: '100% 0px -10% 0px', threshold: 0.1 }); // el margen de arriba: lo que un salto de ancla deja atrás también entra
  targets.forEach((el) => io.observe(el));
  addEventListener('load', () => setTimeout(() => targets.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < innerHeight && r.bottom > 0) el.classList.add('is-in');
  }), 2500));
})();
