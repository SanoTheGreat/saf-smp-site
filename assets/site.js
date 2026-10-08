/* SAF — shared behaviour for every page */

/* ===== EDIT HERE when the server host / ports change =====
   javaAddress   : what Java players type (add ":port" only if it isn't 25565
                   and you have no SRV record, e.g. "play.safsmp.online:25570")
   bedrockAddress: Bedrock server address
   bedrockPort   : Bedrock port
   The live status check tries Java first, then Bedrock, and shows whichever
   answers. */
var SAF_SERVER = {
  javaAddress: '104.234.6.162:26117',
  bedrockAddress: '104.234.6.162',
  bedrockPort: '26117'
};

(function(){
  var root = document.documentElement;
  root.classList.remove('no-js');
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Fill server addresses from the config above
  var bedrockFull = SAF_SERVER.bedrockAddress + ':' + SAF_SERVER.bedrockPort;
  var fills = {
    'java-address': SAF_SERVER.javaAddress,
    'bedrock-address': SAF_SERVER.bedrockAddress,
    'bedrock-port': SAF_SERVER.bedrockPort
  };
  document.querySelectorAll('[data-fill]').forEach(function(el){
    var v = fills[el.getAttribute('data-fill')];
    if(v) el.textContent = v;
  });
  document.querySelectorAll('[data-fill-copy]').forEach(function(el){
    var v = fills[el.getAttribute('data-fill-copy')];
    if(v) el.setAttribute('data-copy', v);
  });
  var year = document.getElementById('year');
  if(year) year.textContent = new Date().getFullYear();
  document.querySelectorAll('[data-copy-key]').forEach(function(el){
    var key = el.getAttribute('data-copy-key');
    el.setAttribute('data-copy', key === 'java' ? SAF_SERVER.javaAddress : bedrockFull);
  });

  // Mobile nav
  var navToggle = document.getElementById('navToggle');
  var navMobile = document.getElementById('navMobile');
  if(navToggle && navMobile){
    var setOpen = function(open){
      navMobile.classList.toggle('is-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    navToggle.addEventListener('click', function(){ setOpen(!navMobile.classList.contains('is-open')); });
    navMobile.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', function(){ setOpen(false); }); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') setOpen(false); });
  }

  // Copy buttons
  document.querySelectorAll('.copy-btn').forEach(function(btn){
    btn.addEventListener('click', function(){
      var text = btn.getAttribute('data-copy') || '';
      var done = function(){
        btn.classList.add('is-copied');
        setTimeout(function(){ btn.classList.remove('is-copied'); }, 1500);
      };
      if(navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(done).catch(done);
      } else { done(); }
    });
  });

  // Scroll reveal
  var revealEls = document.querySelectorAll('.reveal');
  if(prefersReduced || !('IntersectionObserver' in window)){
    revealEls.forEach(function(el){ el.classList.add('is-visible'); });
  } else {
    var observer = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function(el){ observer.observe(el); });
  }

  // Sky: stars + particles
  var sky = document.querySelector('.sky');
  if(sky){
    var starField = sky.querySelector('.stars');
    if(starField){
      for(var s=0; s<50; s++){
        var star = document.createElement('span');
        star.className = 'star';
        star.style.left = (Math.random()*100) + '%';
        star.style.top = (Math.random()*65) + '%';
        star.style.animationDelay = (Math.random()*3) + 's';
        starField.appendChild(star);
      }
    }
    if(!prefersReduced){
      for(var i=0; i<8; i++){
        var p = document.createElement('span');
        p.className = 'sky__particle';
        p.style.left = (6 + Math.random()*88) + '%';
        p.style.top = (30 + Math.random()*50) + '%';
        p.style.animationDelay = (Math.random()*6) + 's';
        p.style.animationDuration = (7 + Math.random()*5) + 's';
        sky.appendChild(p);
      }
    }
  }

  // Day / Night
  var toggleBtn = document.getElementById('daynightToggle');
  var metaTheme = document.getElementById('metaTheme');
  var THEME_KEY = 'saf-theme';
  function applyTheme(theme){
    root.setAttribute('data-theme', theme);
    if(toggleBtn) toggleBtn.setAttribute('aria-pressed', theme === 'day' ? 'true' : 'false');
    document.querySelectorAll('[data-theme-label]').forEach(function(el){ el.textContent = theme === 'day' ? 'Day' : 'Night'; });
    if(metaTheme) metaTheme.setAttribute('content', theme === 'day' ? '#8FD0F7' : '#0B1526');
  }
  var saved = null;
  try{ saved = localStorage.getItem(THEME_KEY); }catch(e){}
  applyTheme(saved === 'day' || saved === 'night' ? saved : 'night');
  if(toggleBtn){
    toggleBtn.addEventListener('click', function(){
      var next = root.getAttribute('data-theme') === 'day' ? 'night' : 'day';
      applyTheme(next);
      try{ localStorage.setItem(THEME_KEY, next); }catch(e){}
    });
  }

  // Live server status via mcsrvstat.us (public, no key required).
  // Java and Bedrock use different endpoints, so query each one properly.
  var statusEls = document.querySelectorAll('[data-status]');
  if(statusEls.length && window.fetch){
    var setStatus = function(state, text, detail){
      statusEls.forEach(function(el){
        el.classList.remove('is-online', 'is-offline', 'is-unknown');
        el.classList.add('is-' + state);
        var t = el.querySelector('[data-status-text]');
        var d = el.querySelector('[data-status-detail]');
        if(t) t.textContent = text;
        if(d) d.textContent = detail || '';
      });
      document.querySelectorAll('[data-players]').forEach(function(el){
        el.textContent = state === 'online' ? el.getAttribute('data-players-value') : '';
        var pill = el.closest('.players-pill');
        if(pill) pill.hidden = state !== 'online';
      });
    };
    // Remember whether the API answered at all, so "offline" and
    // "couldn't check" are reported differently.
    var apiAnswered = false;
    var query = function(url){
      return fetch(url).then(function(r){ return r.json(); }).then(function(d){
        apiAnswered = true;
        if(d && d.online) return d;
        throw new Error('offline');
      });
    };
    var javaUrl = 'https://api.mcsrvstat.us/3/' + SAF_SERVER.javaAddress;
    var bedrockUrl = 'https://api.mcsrvstat.us/bedrock/3/' + bedrockFull;

    query(javaUrl)
      .catch(function(){ return query(bedrockUrl); })
      .then(function(d){
        var online = (d.players && typeof d.players.online === 'number') ? d.players.online : 0;
        var max = (d.players && typeof d.players.max === 'number') ? d.players.max : null;
        var value = max ? online + ' / ' + max : String(online);
        document.querySelectorAll('[data-players]').forEach(function(el){ el.setAttribute('data-players-value', value); });
        setStatus('online',
          'Online — ' + online + ' player' + (online === 1 ? '' : 's') + ' in the world',
          d.version ? 'Version ' + String(d.version).slice(0, 40) : '');
      })
      .catch(function(){
        if(apiAnswered){
          setStatus('offline', 'Offline right now', 'The world is still here — check Discord for updates.');
        } else {
          setStatus('unknown', 'Status unavailable', 'Jump in and see for yourself.');
        }
      });
  }
})();

/* ---------- Fun stuff: click bursts, XP bar, logo, tabs, back-to-top ---------- */
(function(){
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PALETTES = {
    grass: ['#63A83B', '#7EFC20', '#4C7A2A', '#8B5A2B'],
    gold:  ['#FFD27A', '#F4BB5E', '#FFF1B8', '#D98A1B'],
    diamond: ['#5FD8E0', '#A8F4F8', '#1FA8B4', '#FFFFFF'],
    discord: ['#5865F2', '#8E97FF', '#C9CDFF', '#FFFFFF'],
    wood:  ['#B07A3E', '#6B4526', '#3E8A22', '#6CC23A', '#A6E05A']
  };

  // Minecraft-style block-break particles at (x, y)
  function burst(x, y, palette, count){
    if(prefersReduced) return;
    var colors = PALETTES[palette] || PALETTES.gold;
    var wrap = document.createElement('div');
    wrap.className = 'burst';
    wrap.style.left = x + 'px';
    wrap.style.top = y + 'px';
    for(var i = 0; i < (count || 12); i++){
      var p = document.createElement('i');
      var angle = Math.random() * Math.PI * 2;
      var dist = 30 + Math.random() * 60;
      p.style.setProperty('--x', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--y', Math.sin(angle) * dist - 20 + 'px');
      p.style.setProperty('--r', (Math.random() * 360 - 180) + 'deg');
      p.style.setProperty('--s', (5 + Math.round(Math.random() * 5)) + 'px');
      p.style.setProperty('--c', colors[i % colors.length]);
      p.style.animationDelay = (Math.random() * 60) + 'ms';
      wrap.appendChild(p);
    }
    document.body.appendChild(wrap);
    setTimeout(function(){ wrap.remove(); }, 900);
  }
  function floatText(x, y, text){
    if(prefersReduced) return;
    var t = document.createElement('span');
    t.className = 'float-text';
    t.textContent = text;
    t.style.left = x + 'px';
    t.style.top = y + 'px';
    document.body.appendChild(t);
    setTimeout(function(){ t.remove(); }, 950);
  }
  function press(el){
    el.classList.remove('is-pressed');
    void el.offsetWidth;
    el.classList.add('is-pressed');
  }
  function pointFor(e, el){
    if(e.clientX || e.clientY) return { x: e.clientX, y: e.clientY };
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  window.safBurst = burst;

  document.addEventListener('click', function(e){
    var el = e.target.closest('.btn, .copy-btn, .tab, .faq summary, [data-burst]');
    if(!el) return;
    var pt = pointFor(e, el);
    // Wooden buttons shed wood chips and leaves
    var palette = el.getAttribute('data-burst') || 'wood';
    if(!el.matches('summary')) press(el);
    burst(pt.x, pt.y, palette, el.classList.contains('copy-btn') ? 14 : 10);
    if(el.classList.contains('copy-btn')) floatText(pt.x, pt.y - 10, '+1 XP');
  });

  // Clickable logo: pop + big burst, with a little easter egg after 5 clicks
  var logo = document.querySelector('[data-logo]');
  if(logo){
    var clicks = 0;
    logo.addEventListener('click', function(e){
      clicks++;
      logo.classList.remove('logo-pop');
      void logo.offsetWidth;
      logo.classList.add('logo-pop');
      var pt = pointFor(e, logo);
      burst(pt.x, pt.y, ['grass', 'gold', 'diamond'][clicks % 3], 22);
      if(clicks % 5 === 0) floatText(pt.x, pt.y - 20, 'Achievement get!');
    });
  }

  // XP-bar scroll progress + back-to-top
  var fill = document.querySelector('.xp-bar__fill');
  var toTop = document.querySelector('.to-top');
  var ticking = false;
  function onScroll(){
    var h = document.documentElement.scrollHeight - window.innerHeight;
    var p = h > 0 ? Math.min(1, window.scrollY / h) : 0;
    if(fill) fill.style.transform = 'scaleX(' + p + ')';
    if(toTop) toTop.classList.toggle('is-visible', window.scrollY > 700);
    ticking = false;
  }
  window.addEventListener('scroll', function(){
    if(!ticking){ ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();
  if(toTop) toTop.addEventListener('click', function(){ window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' }); });

  // Tabs (Java / Bedrock)
  document.querySelectorAll('[data-tabs]').forEach(function(group){
    var tabs = group.querySelectorAll('[role="tab"]');
    function select(tab){
      tabs.forEach(function(t){
        var on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        var panel = document.getElementById(t.getAttribute('aria-controls'));
        if(panel) panel.hidden = !on;
      });
    }
    tabs.forEach(function(t, i){
      t.addEventListener('click', function(){ select(t); });
      t.addEventListener('keydown', function(e){
        if(e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        var next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
        select(next); next.focus();
      });
    });
  });

  // Subtle 3D tilt on rank cards (pointer devices only)
  if(!prefersReduced && window.matchMedia('(hover: hover)').matches){
    document.querySelectorAll('[data-tilt]').forEach(function(card){
      card.addEventListener('pointermove', function(e){
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - 0.5;
        var y = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform = 'perspective(800px) rotateX(' + (-y * 6) + 'deg) rotateY(' + (x * 6) + 'deg) translateY(-4px)';
      });
      card.addEventListener('pointerleave', function(){ card.style.transform = ''; });
    });
  }
})();

/* ---------- Page transition: wooden doors between Home and Store ---------- */
(function(){
  var KEY = 'saf-doors';
  var root = document.documentElement;
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function pageOf(url){
    var p = url.pathname.replace(/index\.html$/, '').replace(/\.html$/, '').replace(/\/$/, '');
    return p || '/';
  }

  var doors = document.createElement('div');
  doors.className = 'page-doors';
  doors.setAttribute('aria-hidden', 'true');
  doors.innerHTML =
    '<div class="page-doors__door page-doors__door--left"></div>' +
    '<div class="page-doors__door page-doors__door--right"></div>' +
    '<img class="page-doors__logo" src="/assets/img/logo.webp" alt="">';
  document.body.appendChild(doors);

  function open(){
    doors.classList.remove('is-closed');
    root.classList.remove('is-arriving');
  }

  // Arriving from another page: start shut, then swing the doors open
  var arriving = false;
  try{ arriving = !!sessionStorage.getItem(KEY); sessionStorage.removeItem(KEY); }catch(e){}
  if(arriving){
    doors.querySelectorAll('.page-doors__door, .page-doors__logo').forEach(function(el){ el.style.transition = 'none'; });
    doors.classList.add('is-closed');
    root.classList.remove('is-arriving');
    void doors.offsetWidth;
    doors.querySelectorAll('.page-doors__door, .page-doors__logo').forEach(function(el){ el.style.transition = ''; });
    setTimeout(open, 380);
  }

  // Coming back via the browser's back/forward cache: make sure the doors are open
  window.addEventListener('pageshow', function(e){ if(e.persisted) open(); });

  if(prefersReduced) return;

  // Leaving: close the doors, pop the logo, then navigate
  document.addEventListener('click', function(e){
    if(e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    var a = e.target.closest('a[href]');
    if(!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var url = new URL(a.href, location.href);
    if(url.origin !== location.origin || pageOf(url) === pageOf(location)) return;

    e.preventDefault();
    try{ sessionStorage.setItem(KEY, '1'); }catch(err){}
    doors.classList.add('is-closed');
    setTimeout(function(){ location.href = url.href; }, 750);
  });
})();
