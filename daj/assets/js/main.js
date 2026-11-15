/* DAJ — interactions & animations */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const WA = '201107487200';
  const esc = v => String(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const store = {
    get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
  };

  /* ---------- Preloader ---------- */
  const pre = $('.preloader');
  const hidePre = () => pre && pre.classList.add('done');
  window.addEventListener('load', () => setTimeout(hidePre, 350));
  setTimeout(hidePre, 2500);

  /* ---------- Split text into animated chars ---------- */
  $$('[data-split]').forEach(el => {
    const txt = el.textContent; el.textContent = ''; el.setAttribute('aria-label', txt);
    [...txt].forEach((ch, i) => {
      const s = document.createElement('span');
      s.className = 'char'; s.style.setProperty('--i', i + (+el.dataset.split || 0));
      s.textContent = ch === ' ' ? ' ' : ch; s.setAttribute('aria-hidden', 'true');
      el.appendChild(s);
    });
  });

  /* ---------- Header / progress / to-top ---------- */
  const header = $('.header'), prog = $('.progress'), toTop = $('.to-top');
  const onScroll = () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    header && header.classList.toggle('scrolled', y > 40);
    prog && (prog.style.width = (h > 0 ? y / h * 100 : 0) + '%');
    toTop && toTop.classList.toggle('show', y > 600);
  };
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  toTop && toTop.addEventListener('click', () => scrollTo({ top: 0, behavior: 'smooth' }));

  /* ---------- Mobile nav ---------- */
  const burger = $('.burger'), links = $('.nav-links');
  burger && burger.addEventListener('click', () => {
    const o = links.classList.toggle('open'); burger.classList.toggle('open', o);
    burger.setAttribute('aria-expanded', o); document.body.style.overflow = o ? 'hidden' : '';
  });
  $$('.nav-links a').forEach(a => a.addEventListener('click', () => {
    links.classList.remove('open'); burger && burger.classList.remove('open'); document.body.style.overflow = '';
  }));

  /* ---------- Reveal on scroll ---------- */
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .15, rootMargin: '0px 0px -40px 0px' });
  $$('[data-reveal],.reveal-group,.stars,.underline').forEach(el => io.observe(el));
  // auto stagger children
  $$('[data-stagger]').forEach(g => [...g.children].forEach((c, i) => {
    c.setAttribute('data-reveal', g.dataset.stagger || 'up'); c.style.setProperty('--d', (i * .08) + 's'); io.observe(c);
  }));
  $$('.stars').forEach(s => [...s.children].forEach((c, i) => c.style.setProperty('--i', i)));

  /* ---------- Counters ---------- */
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; cio.unobserve(e.target);
    const el = e.target, end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length;
    const suf = el.dataset.suffix || '', t0 = performance.now(), dur = 1800;
    const tick = t => {
      const p = Math.min((t - t0) / dur, 1), v = end * (1 - Math.pow(1 - p, 4));
      el.textContent = v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }) + suf;
      p < 1 && requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), { threshold: .5 });
  $$('[data-count]').forEach(el => cio.observe(el));

  /* ---------- Scroll parallax ---------- */
  const px = $$('[data-parallax]');
  const tl = $('.timeline'), fill = tl && $('.fill', tl);
  let ticking = false;
  const para = () => {
    px.forEach(el => {
      const r = el.getBoundingClientRect(); if (r.bottom < -200 || r.top > innerHeight + 200) return;
      const c = (r.top + r.height / 2 - innerHeight / 2) * (+el.dataset.parallax);
      el.style.transform = `translate3d(0,${c}px,0)` + (el.dataset.scale ? ` scale(${el.dataset.scale})` : '');
    });
    if (fill) {
      const r = tl.getBoundingClientRect(), p = Math.min(Math.max((innerHeight * .6 - r.top) / r.height, 0), 1);
      fill.style.height = p * 100 + '%';
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { requestAnimationFrame(para); ticking = true; } }, { passive: true });
  para();

  /* ---------- Mouse tilt on hero visuals ---------- */
  if (matchMedia('(hover:hover)').matches) $$('[data-tilt]').forEach(el => {
    const wrap = el.closest('section') || el;
    wrap.addEventListener('mousemove', e => {
      const x = e.clientX / innerWidth - .5, y = e.clientY / innerHeight - .5;
      el.style.transform = `perspective(900px) rotateY(${x * 10}deg) rotateX(${-y * 8}deg) translate(${x * 20}px,${y * 14}px)`;
    });
    wrap.addEventListener('mouseleave', () => el.style.transform = '');
  });

  /* ---------- Open / closed status (1 PM – 1 AM Cairo) ---------- */
  $$('[data-status]').forEach(el => {
    let h;
    try { h = +new Intl.DateTimeFormat('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Africa/Cairo' }).format(new Date()); }
    catch { h = new Date().getHours(); }
    const open = h >= 13 || h < 1;
    el.className = 'status ' + (open ? 'open' : 'closed');
    el.textContent = open ? 'Open now' : 'Closed · opens 1:00 PM';
  });

  /* ---------- Gallery carousel + lightbox ---------- */
  $$('.carousel').forEach(car => {
    const track = $('.track', car), slides = $$('.slide', car), dotsWrap = $('.dots', car.parentElement);
    let i = 0, timer;
    const per = () => innerWidth <= 620 ? 2 : innerWidth <= 1080 ? 3 : 5;
    const max = () => Math.max(slides.length - per(), 0);
    const draw = () => {
      const w = slides[0].getBoundingClientRect().width + 20;
      track.style.transform = `translateX(${-i * w}px)`;
      dotsWrap && $$('button', dotsWrap).forEach((d, k) => d.classList.toggle('on', k === i));
    };
    const mkDots = () => {
      if (!dotsWrap) return; dotsWrap.innerHTML = '';
      for (let k = 0; k <= max(); k++) {
        const b = document.createElement('button'); b.setAttribute('aria-label', 'Go to slide ' + (k + 1));
        b.onclick = () => { i = k; draw(); reset(); }; dotsWrap.appendChild(b);
      }
    };
    const go = d => { i = i + d > max() ? 0 : i + d < 0 ? max() : i + d; draw(); };
    const reset = () => { clearInterval(timer); timer = setInterval(() => go(1), 3500); };
    $('.prev', car).onclick = () => { go(-1); reset(); };
    $('.next', car).onclick = () => { go(1); reset(); };
    car.addEventListener('mouseenter', () => clearInterval(timer));
    car.addEventListener('mouseleave', reset);
    let sx = 0;
    track.addEventListener('touchstart', e => sx = e.touches[0].clientX, { passive: true });
    track.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - sx; if (Math.abs(dx) > 40) { go(dx < 0 ? 1 : -1); reset(); } });
    addEventListener('resize', () => { i = Math.min(i, max()); mkDots(); draw(); });
    mkDots(); draw(); reset();

    // lightbox
    const lb = $('.lightbox'); if (!lb) return;
    const img = $('img', lb); let li = 0;
    const show = k => { li = (k + slides.length) % slides.length; const s = $('img', slides[li]); img.src = s.src; img.alt = s.alt; };
    slides.forEach((s, k) => s.addEventListener('click', () => { show(k); lb.classList.add('open'); }));
    $('.lb-close', lb).onclick = () => lb.classList.remove('open');
    $('.prev', lb).onclick = () => show(li - 1);
    $('.next', lb).onclick = () => show(li + 1);
    lb.addEventListener('click', e => e.target === lb && lb.classList.remove('open'));
    addEventListener('keydown', e => {
      if (!lb.classList.contains('open')) return;
      if (e.key === 'Escape') lb.classList.remove('open');
      if (e.key === 'ArrowRight') show(li + 1);
      if (e.key === 'ArrowLeft') show(li - 1);
    });
  });

  /* ---------- Reviews slider ---------- */
  const rc = $('.review-card');
  if (rc) {
    const reviews = [
      { t: 'The best fried chicken in Obour! Always fresh and super tasty.', n: 'Mariam A.', img: 'assets/img/avatar.jpg' },
      { t: 'The Hot Honey Chick is unreal — crunchy, sweet and spicy at the same time.', n: 'Omar K.' },
      { t: 'Chicken AND waffles in one place? DAJ really is the best of both worlds.', n: 'Nour H.' },
      { t: 'Great vibes, fast service and the Truffle Chick is worth every pound.', n: 'Youssef S.' },
      { t: 'Our family Friday spot. The Family Box disappears in minutes!', n: 'Salma R.' }
    ];
    let k = 0, timer;
    const p = $('p', rc), who = $('.who', rc);
    const render = () => {
      rc.classList.add('swap');
      setTimeout(() => {
        const r = reviews[k]; p.textContent = '“' + r.t + '”';
        $('.av', who).innerHTML = r.img ? `<img src="${r.img}" alt="${r.n}">` : `<span class="avatar">${r.n[0]}</span>`;
        $('small', who).textContent = r.n;
        rc.classList.remove('swap');
      }, 350);
    };
    const go = d => { k = (k + d + reviews.length) % reviews.length; render(); clearInterval(timer); timer = setInterval(() => go(1), 5000); };
    $('.rv-prev').onclick = () => go(-1); $('.rv-next').onclick = () => go(1);
    timer = setInterval(() => go(1), 5000);
  }

  /* ---------- Toast ---------- */
  const toast = $('.toast');
  let tt;
  const notify = msg => { if (!toast) return; toast.innerHTML = msg; toast.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => toast.classList.remove('show'), 2400); };

  /* ---------- Cart ---------- */
  let cart = store.get('daj-cart', []);
  const countEl = $$('.cart-count'), drawer = $('.drawer'), overlay = $('.overlay');
  const list = drawer && $('.list', drawer), totalEl = drawer && $('.total b', drawer);
  const save = () => store.set('daj-cart', cart);
  const renderCart = () => {
    const n = cart.reduce((a, c) => a + c.q, 0), sum = cart.reduce((a, c) => a + c.q * c.p, 0);
    countEl.forEach(c => { c.textContent = n; c.classList.remove('bump'); void c.offsetWidth; c.classList.add('bump'); });
    if (!list) return;
    totalEl.textContent = sum.toLocaleString() + ' EGP';
    list.innerHTML = cart.length ? cart.map((c, idx) => `
      <div class="ci"><img src="${esc(c.img)}" alt=""><div class="n">${esc(c.name)}<small>${(c.p * c.q).toLocaleString()} EGP</small></div>
      <div class="qty"><button data-q="${idx}" data-d="-1" aria-label="Decrease">−</button><b>${c.q}</b><button data-q="${idx}" data-d="1" aria-label="Increase">+</button></div></div>`).join('')
      : `<div class="empty"><img src="assets/img/mascot-arms.jpg" alt=""><p><b>Your cart is empty</b><br>Go grab something crispy!</p></div>`;
  };
  const openCart = () => { drawer.classList.add('open'); overlay.classList.add('open'); };
  const closeCart = () => { drawer.classList.remove('open'); overlay.classList.remove('open'); };
  $$('.cart-btn').forEach(b => b.addEventListener('click', openCart));
  overlay && overlay.addEventListener('click', closeCart);
  drawer && $('header button', drawer).addEventListener('click', closeCart);
  list && list.addEventListener('click', e => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const it = cart[+b.dataset.q]; it.q += +b.dataset.d;
    if (it.q <= 0) cart.splice(+b.dataset.q, 1);
    save(); renderCart();
  });
  const flyTo = (src, from) => {
    const target = $('.cart-btn'); if (!target || !src) return;
    const a = from.getBoundingClientRect(), b = target.getBoundingClientRect();
    const f = document.createElement('img'); f.src = src; f.className = 'fly';
    f.style.left = a.left + a.width / 2 - 30 + 'px'; f.style.top = a.top - 30 + 'px';
    document.body.appendChild(f);
    requestAnimationFrame(() => { f.style.left = b.left - 6 + 'px'; f.style.top = b.top - 6 + 'px'; f.style.transform = 'scale(.3)'; f.style.opacity = '.4'; });
    setTimeout(() => f.remove(), 850);
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-add]'); if (!b) return;
    const d = b.dataset, found = cart.find(c => c.id === d.add);
    found ? found.q++ : cart.push({ id: d.add, name: d.name, p: +d.price, img: d.img, q: 1 });
    save(); flyTo(d.img, b); setTimeout(renderCart, 700);
    b.classList.add('added'); const old = b.innerHTML; b.innerHTML = old.trim() === '+' ? '✓' : 'Added ✓';
    setTimeout(() => { b.classList.remove('added'); b.innerHTML = old; }, 1100);
    notify(`🍗 <b>${esc(d.name)}</b> added to your order`);
  });
  const checkout = $('.checkout');
  checkout && checkout.addEventListener('click', () => {
    if (!cart.length) return notify('Your cart is empty 🐔');
    const sum = cart.reduce((a, c) => a + c.q * c.p, 0);
    const msg = 'Hi DAJ! I would like to order:\n' + cart.map(c => `• ${c.q} × ${c.name} — ${c.q * c.p} EGP`).join('\n') + `\n\nTotal: ${sum} EGP`;
    window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  });
  renderCart();

  /* ---------- Menu tabs filter ---------- */
  const tabs = $$('.menu-tabs button');
  if (tabs.length) {
    const cats = $$('.menu-cat');
    const select = cat => {
      tabs.forEach(t => t.classList.toggle('on', t.dataset.cat === cat));
      cats.forEach(c => {
        const show = cat === 'all' || c.dataset.cat.split(' ').includes(cat);
        c.classList.toggle('hide', !show);
        if (show) $$('[data-reveal]', c).forEach(x => { x.classList.remove('in'); void x.offsetWidth; requestAnimationFrame(() => x.classList.add('in')); });
      });
    };
    tabs.forEach(t => t.addEventListener('click', () => {
      select(t.dataset.cat);
      const top = $('#menu-list').getBoundingClientRect().top + scrollY - 150;
      scrollTo({ top, behavior: 'smooth' });
    }));
    const q = new URLSearchParams(location.search).get('cat');
    if (q && tabs.some(t => t.dataset.cat === q)) select(q);
    const st = $('.tabs-sticky');
    st && addEventListener('scroll', () => st.classList.toggle('stuck', st.getBoundingClientRect().top <= 80), { passive: true });
  }

  /* ---------- Contact form ---------- */
  const form = $('#contact-form');
  form && form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    const check = (name, test, msg) => {
      const f = form.elements[name], wrap = f.closest('.field');
      const bad = !test(f.value.trim()); wrap.classList.toggle('err', bad); $('.msg', wrap).textContent = bad ? msg : '';
      if (bad) ok = false;
    };
    check('name', v => v.length >= 2, 'Please enter your name');
    check('phone', v => /^(\+?20)?0?1[0125]\d{8}$/.test(v.replace(/[\s-]/g, '')), 'Enter a valid Egyptian mobile number');
    check('email', v => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), 'Enter a valid email');
    check('message', v => v.length >= 5, 'Tell us a little more');
    if (!ok) return;
    const btn = $('.send', form); btn.classList.add('loading'); btn.firstChild.textContent = 'Sending… ';
    const d = Object.fromEntries(new FormData(form));
    const msg = `New message from DAJ website\nName: ${d.name}\nPhone: ${d.phone}${d.email ? '\nEmail: ' + d.email : ''}\n\n${d.message}`;
    setTimeout(() => {
      window.open(`https://wa.me/${WA}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
      btn.classList.remove('loading'); btn.firstChild.textContent = 'Send Message ';
      form.reset(); notify('✅ Thanks! We’ll get back to you soon.');
    }, 700);
  });
  form && $$('input,textarea', form).forEach(i => i.addEventListener('input', () => i.closest('.field').classList.remove('err')));

  /* ---------- Year ---------- */
  $$('[data-year]').forEach(y => y.textContent = new Date().getFullYear());
})();
