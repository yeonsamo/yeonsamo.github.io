// 스크롤 등장 효과, 실시간 야간 코트 예보(기온·강수·풍속), NTRP 자가 점검 연동, 맞춤형 문의 양식 자동 생성기
(function () {
  var config = window.CLUB_CONFIG || {};
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // config.js의 기본 수치/회비 설정 반영
  if (config.stats) {
    if (config.stats.years) {
      var yEl = document.getElementById('stat-years');
      if (yEl) { yEl.setAttribute('data-to', config.stats.years); yEl.textContent = config.stats.years; }
    }
    if (config.stats.members) {
      var mEl = document.getElementById('stat-members');
      if (mEl) { mEl.setAttribute('data-to', config.stats.members); mEl.textContent = config.stats.members; }
    }
    if (config.stats.weeklySessions) {
      var wEl = document.getElementById('stat-weekly');
      if (wEl) { wEl.setAttribute('data-to', config.stats.weeklySessions); wEl.textContent = config.stats.weeklySessions; }
    }
  }
  if (config.fees) {
    if (config.fees.joinFee) {
      var jf = document.getElementById('fee-join');
      if (jf) jf.textContent = config.fees.joinFee;
    }
    if (config.fees.monthlyFee) {
      var mf = document.getElementById('fee-monthly');
      if (mf) mf.textContent = config.fees.monthlyFee;
    }
    if (config.fees.guestNote) {
      var gn = document.getElementById('fee-guest-note');
      if (gn) gn.textContent = config.fees.guestNote;
    }
  }

  // 모바일 메뉴 드로어 열기/닫기
  var menuToggle = document.querySelector('.menu-toggle');
  var mobileDrawer = document.getElementById('mobile-drawer');
  if (menuToggle && mobileDrawer) {
    menuToggle.addEventListener('click', function () {
      var expanded = menuToggle.getAttribute('aria-expanded') === 'true';
      menuToggle.setAttribute('aria-expanded', String(!expanded));
      mobileDrawer.hidden = expanded;
    });
    mobileDrawer.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        menuToggle.setAttribute('aria-expanded', 'false');
        mobileDrawer.hidden = true;
      });
    });
  }

  // 스크롤 등장 효과: 이 클래스가 붙어야만 CSS가 .reveal을 숨기므로, JS가 실패해도 내용은 그대로 보인다
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    document.documentElement.classList.add('js');
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
        entry.target.querySelectorAll('.count').forEach(countUp);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { observer.observe(el); });
  }

  // 상단 네비게이션 현재 섹션 하이라이트 (Scroll-Spy)
  var navLinks = document.querySelectorAll('.site-nav a[data-nav]');
  if ('IntersectionObserver' in window && navLinks.length) {
    var secObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var id = entry.target.id;
        navLinks.forEach(function (a) {
          a.classList.toggle('is-active', a.getAttribute('data-nav') === id);
        });
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    ['about', 'schedule', 'level', 'fees', 'faq', 'location'].forEach(function (id) {
      var el = document.getElementById(id);
      if (el) secObserver.observe(el);
    });
    // 첫 화면(.hero)은 id가 없어 어느 메뉴와도 안 맞으므로, 맨 위로 돌아오면 밑줄이 모두 지워진다
    var heroSec = document.querySelector('.hero');
    if (heroSec) secObserver.observe(heroSec);
  }

  // 숫자 올라가는 효과
  function countUp(el) {
    var target = Number(el.getAttribute('data-to'));
    var start = null;
    function step(time) {
      if (start === null) start = time;
      var progress = Math.min((time - start) / 1100, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // 다음 모임 안내 — 보는 사람 기기의 시간대와 상관없이 한국 시간(UTC+9)으로 계산
  var KST = 9 * 3600 * 1000;
  var SESSION_DAYS = [2, 5]; // 화(2), 금(5)
  var START_HOUR = 19;
  var END_HOUR = 22;
  var DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  function findUpcomingSessions(nowMs, count) {
    var k = new Date(nowMs + KST);
    var minutes = k.getUTCHours() * 60 + k.getUTCMinutes();
    var today = k.getUTCDay();
    var results = [];

    if (SESSION_DAYS.indexOf(today) !== -1 && minutes >= START_HOUR * 60 && minutes < END_HOUR * 60) {
      results.push({ live: true, daysAhead: 0, kst: k, startMs: nowMs });
    }
    for (var d = 0; d <= 14 && results.length < count; d++) {
      if (SESSION_DAYS.indexOf((today + d) % 7) === -1) continue;
      if (d === 0 && minutes >= START_HOUR * 60) continue;
      var startMs = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() + d, START_HOUR) - KST;
      results.push({ live: false, daysAhead: d, startMs: startMs, kst: new Date(startMs + KST) });
    }
    return results;
  }

  function dateLabel(kst) {
    return (kst.getUTCMonth() + 1) + '월 ' + kst.getUTCDate() + '일 (' + DAY_NAMES[kst.getUTCDay()] + ')';
  }

  function dayWord(session) {
    if (session.daysAhead === 0) return '오늘';
    if (session.daysAhead === 1) return '내일';
    return DAY_NAMES[session.kst.getUTCDay()] + '요일';
  }

  function remainLabel(ms) {
    var total = Math.max(0, Math.ceil(ms / 60000));
    var days = Math.floor(total / 1440);
    var hours = Math.floor((total % 1440) / 60);
    var mins = total % 60;
    if (days) return days + '일 ' + hours + '시간 남음';
    if (hours) return hours + '시간 ' + mins + '분 남음';
    return mins + '분 남음';
  }

  var liveStatus = document.querySelector('.live-status');
  var nextCard = document.querySelector('.next-card');
  var upcomingSessions = [];

  function renderSession() {
    var now = Date.now();
    upcomingSessions = findUpcomingSessions(now, 3);
    var session = upcomingSessions[0];
    if (!session) return null;

    if (session.live) {
      liveStatus.classList.add('is-live');
      liveStatus.querySelector('.live-text').textContent = '지금 운영 시간 · 밤 10시까지';
      nextCard.classList.add('is-live');
      nextCard.querySelector('.next-label').textContent = '지금 운영 시간';
      nextCard.querySelector('.next-when').textContent = dateLabel(session.kst) + ' 저녁 7시~10시';
      nextCard.querySelector('.next-countdown').textContent = '밤 10시까지';
    } else {
      liveStatus.classList.remove('is-live');
      liveStatus.querySelector('.live-text').textContent = '다음 모임 ' + dayWord(session) + ' 저녁 7시 · ' + remainLabel(session.startMs - now);
      nextCard.classList.remove('is-live');
      nextCard.querySelector('.next-label').textContent = '다음 정기 모임';
      nextCard.querySelector('.next-when').textContent = dateLabel(session.kst) + ' 저녁 7시';
      nextCard.querySelector('.next-countdown').textContent = '시작까지 ' + remainLabel(session.startMs - now);
    }

    // 다가오는 2회 일정 배지 표시
    if (upcomingSessions.length >= 2) {
      var upPair = nextCard.querySelector('.upcoming-pair');
      var u1 = document.getElementById('upcoming-1');
      var u2 = document.getElementById('upcoming-2');
      if (upPair && u1 && u2) {
        u1.textContent = '1차: ' + dateLabel(upcomingSessions[0].kst) + ' 19:00';
        u2.textContent = '2차: ' + dateLabel(upcomingSessions[1].kst) + ' 19:00';
        upPair.hidden = false;
      }
    }

    nextCard.hidden = false;

    // 요일 띠에 오늘 표시
    var todayNum = new Date(now + KST).getUTCDay();
    document.querySelectorAll('.week li').forEach(function (li) {
      var isToday = Number(li.getAttribute('data-day')) === todayNum;
      var badge = li.querySelector('.week-today');
      li.classList.toggle('is-today', isToday);
      if (isToday && !badge) {
        badge = document.createElement('span');
        badge.className = 'week-today';
        badge.textContent = '오늘';
        li.insertBefore(badge, li.firstChild);
      } else if (!isToday && badge) {
        badge.remove();
      }
    });
    return session;
  }

  var firstSession = renderSession();
  setInterval(renderSession, 30000);

  // 게스트 희망 날짜 선택 칩 생성
  var guestChipsBox = document.getElementById('guest-date-chips');
  var selectedGuestDate = '';
  if (guestChipsBox && upcomingSessions.length) {
    upcomingSessions.forEach(function (s, idx) {
      var label = dateLabel(s.kst);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'choice-chip' + (idx === 0 ? ' is-active' : '');
      btn.textContent = label + ' 19시';
      if (idx === 0) selectedGuestDate = label;
      btn.addEventListener('click', function () {
        guestChipsBox.querySelectorAll('.choice-chip').forEach(function (c) { c.classList.remove('is-active'); });
        btn.classList.add('is-active');
        selectedGuestDate = label;
        updateInquiryTemplates();
      });
      guestChipsBox.appendChild(btn);
    });
  }

  // 다음 모임 저녁(19~22시) 날씨 및 야간 코트 컨디션 지수 — Open-Meteo 무료 예보
  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=35.898&longitude=128.598'
    + '&hourly=temperature_2m,precipitation_probability,weather_code,wind_speed_10m&timezone=Asia%2FSeoul&forecast_days=7';

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function weatherLabel(code) {
    if (code === 0) return '맑음 ☀️';
    if (code <= 2) return '구름 조금 ⛅';
    if (code === 3) return '흐림 ☁️';
    if (code <= 48) return '안개 🌫️';
    if (code <= 57) return '이슬비 🌦️';
    if (code <= 67) return '비 🌧️';
    if (code <= 77) return '눈 ❄️';
    if (code <= 82) return '소나기 🌧️';
    if (code <= 86) return '눈 ❄️';
    return '뇌우 ⛈️';
  }

  function isNumber(v) { return typeof v === 'number' && isFinite(v); }

  function loadWeather(session) {
    if (!session) return;
    var box = nextCard.querySelector('.weather');
    var condBadge = nextCard.querySelector('.condition-badge');
    var hourlyBox = nextCard.querySelector('.weather-hourly');
    var kst = session.kst;
    var dateKey = kst.getUTCFullYear() + '-' + pad(kst.getUTCMonth() + 1) + '-' + pad(kst.getUTCDate());
    var fromHour = session.live ? Math.max(START_HOUR, new Date(Date.now() + KST).getUTCHours()) : START_HOUR;
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;

    fetch(WEATHER_URL, controller ? { signal: controller.signal } : undefined)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var h = data.hourly;
        var temps = [], probs = [], codes = [], winds = [], slotItems = [];
        for (var hour = START_HOUR; hour < END_HOUR; hour++) {
          var i = h.time.indexOf(dateKey + 'T' + pad(hour) + ':00');
          if (i === -1) continue;
          var t = h.temperature_2m[i];
          var p = h.precipitation_probability ? h.precipitation_probability[i] : null;
          var c = h.weather_code[i];
          var w = h.wind_speed_10m ? h.wind_speed_10m[i] : null;
          if (hour >= fromHour) {
            if (isNumber(t)) temps.push(t);
            if (isNumber(p)) probs.push(p);
            if (isNumber(c)) codes.push(c);
            if (isNumber(w)) winds.push(w);
          }
          if (isNumber(t) && isNumber(c)) {
            slotItems.push({ hour: hour, temp: Math.round(t), prob: isNumber(p) ? p : 0, code: c, wind: isNumber(w) ? Math.round(w * 10) / 10 : null });
          }
        }
        if (!temps.length || !codes.length) throw new Error(dateKey + ' 저녁 예보가 응답에 없음');

        var low = Math.round(Math.min.apply(null, temps));
        var high = Math.round(Math.max.apply(null, temps));
        var worst = Math.max.apply(null, codes);
        var maxRain = probs.length ? Math.max.apply(null, probs) : null;
        var maxWind = winds.length ? Math.round(Math.max.apply(null, winds)) : null;

        var parts = [weatherLabel(worst), '기온 ' + (low === high ? low : low + '~' + high) + '°C'];
        if (maxRain !== null) parts.push('강수확률 ' + maxRain + '%');
        if (maxWind !== null) parts.push('바람 ' + maxWind + 'km/h');
        box.querySelector('.weather-main').textContent = parts.join(' · ');

        // 시간대별 미니 카드 렌더링 (19시, 20시, 21시)
        if (hourlyBox && slotItems.length) {
          hourlyBox.innerHTML = '';
          slotItems.forEach(function (item) {
            var div = document.createElement('div');
            div.className = 'hour-slot';
            div.innerHTML = '<strong>' + item.hour + ':00</strong>'
              + '<span class="hour-temp">' + item.temp + '°C</span>'
              + '<span class="hour-meta">' + weatherLabel(item.code) + ' · 강수 ' + item.prob + '%</span>';
            hourlyBox.appendChild(div);
          });
          hourlyBox.hidden = false;
        }

        // 코트 컨디션 배지 판단
        var isBadRain = (maxRain !== null && maxRain >= 50) || worst >= 51;
        var isWindy = maxWind !== null && maxWind >= 22;
        if (condBadge) {
          if (isBadRain) {
            condBadge.textContent = '☔ 우천 확인 필요';
            condBadge.classList.add('is-caution');
          } else if (isWindy) {
            condBadge.textContent = '💨 바람 다소 있음';
            condBadge.classList.add('is-caution');
          } else {
            condBadge.textContent = '🎾 비·바람 예보 없음';
            condBadge.classList.remove('is-caution');
          }
          condBadge.hidden = false;
        }

        box.querySelector('.weather-warn').hidden = !(isBadRain || isWindy);
        box.hidden = false;
      })
      .catch(function (err) {
        box.hidden = true;
        console.warn('[날씨] 표시 안 함:', err && err.message ? err.message : err);
      })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  if (window.fetch) loadWeather(firstSession);

  // NTRP 자가 점검: 고른 개수에 따라 안내 및 문의 양식 자동 연동
  var checks = document.querySelectorAll('.self-check input');
  var checkResult = document.querySelector('.self-check-result');
  var checkCounter = document.getElementById('check-counter');
  var applyCheckBtn = document.getElementById('apply-check-btn');
  var ntrpSelect = document.getElementById('input-ntrp');

  checks.forEach(function (box) {
    box.addEventListener('change', function () {
      var n = document.querySelectorAll('.self-check input:checked').length;
      var total = checks.length;
      if (checkCounter) checkCounter.textContent = n + ' / ' + total + ' 선택됨';

      if (n === total) {
        checkResult.textContent = '✅ ' + total + '개 모두 해당 — NTRP 3.0 이상 기준에 잘 맞아요! 편하게 가입·게스트 문의를 남겨 주세요.';
        if (applyCheckBtn) applyCheckBtn.hidden = false;
      } else if (n >= 2) {
        checkResult.textContent = '💡 ' + total + '개 중 ' + n + '개 해당 — 일부 항목이 맞아요. 문의할 때 구력과 함께 알려 주시면 안내해 드립니다.';
        if (applyCheckBtn) applyCheckBtn.hidden = false;
      } else if (n >= 1) {
        checkResult.textContent = total + '개 중 ' + n + '개 해당 — 아직은 3.0 설명과 거리가 있어요. 랠리와 복식 게임에 익숙해진 뒤 문의해 주세요.';
        if (applyCheckBtn) applyCheckBtn.hidden = true;
      } else {
        checkResult.textContent = '항목을 선택하면 여기에 안내가 표시됩니다.';
        if (applyCheckBtn) applyCheckBtn.hidden = true;
      }
    });
  });

  if (applyCheckBtn) {
    applyCheckBtn.addEventListener('click', function () {
      var n = document.querySelectorAll('.self-check input:checked').length;
      if (ntrpSelect) {
        ntrpSelect.value = n === checks.length ? '3.0' : '2.5~3.0 (자가점검 완료)';
        updateInquiryTemplates();
      }
      var contactSec = document.getElementById('contact');
      if (contactSec) contactSec.scrollIntoView({ behavior: 'smooth' });
      showToast('자가 점검 결과를 문의 양식에 반영했어요.');
    });
  }

  // 맞춤형 문의 양식 자동 업데이트
  var inputName = document.getElementById('input-name');
  var inputExp = document.getElementById('input-exp');
  var selectedDayChoice = '화·금 모두';

  document.querySelectorAll('[data-day-choice]').forEach(function (chip) {
    chip.addEventListener('click', function () {
      document.querySelectorAll('[data-day-choice]').forEach(function (c) { c.classList.remove('is-active'); });
      chip.classList.add('is-active');
      selectedDayChoice = chip.getAttribute('data-day-choice');
      updateInquiryTemplates();
    });
  });

  function updateInquiryTemplates() {
    var nameVal = inputName && inputName.value.trim() ? inputName.value.trim() : '';
    var expVal = inputExp && inputExp.value.trim() ? inputExp.value.trim() : '';
    var ntrpVal = ntrpSelect && ntrpSelect.value ? ntrpSelect.value : '';

    var joinPre = document.getElementById('template-join');
    if (joinPre) {
      joinPre.textContent = '안녕하세요, 연사모 가입 문의드립니다.\n'
        + '이름: ' + nameVal + '\n'
        + '구력: ' + expVal + '\n'
        + 'NTRP(대략): ' + ntrpVal + '\n'
        + '희망 요일: ' + selectedDayChoice;
    }

    var guestPre = document.getElementById('template-guest');
    if (guestPre) {
      guestPre.textContent = '안녕하세요, 연사모 게스트 참여 문의드립니다.\n'
        + '이름: ' + nameVal + '\n'
        + '구력: ' + expVal + '\n'
        + 'NTRP(대략): ' + ntrpVal + '\n'
        + '희망 날짜(화 또는 금): ' + selectedGuestDate;
    }
  }

  [inputName, inputExp, ntrpSelect].forEach(function (el) {
    if (!el) return;
    el.addEventListener('input', updateInquiryTemplates);
    el.addEventListener('change', updateInquiryTemplates);
  });
  updateInquiryTemplates();

  // 알림 한 줄 (복사·공유 결과)
  var toast = document.querySelector('.toast');
  var toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2600);
  }

  // 클립보드 복사
  function copyText(text, doneMessage) {
    function legacyCopy() {
      var area = document.createElement('textarea');
      area.value = text;
      area.setAttribute('readonly', '');
      area.style.position = 'fixed';
      area.style.opacity = '0';
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
      area.remove();
      if (ok) showToast(doneMessage);
      else showToast('복사하지 못했어요. 길게 눌러 직접 복사해 주세요.');
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(doneMessage); }, function () {
        legacyCopy();
      });
    } else {
      legacyCopy();
    }
  }

  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var targetId = btn.getAttribute('data-copy');
      var targetEl = document.getElementById(targetId);
      if (targetEl) {
        copyText(targetEl.textContent, '문의 양식을 복사했어요! 오픈채팅에 붙여 넣으세요.');
      }
    });
  });

  // 주소 복사 버튼
  var copyAddrBtn = document.getElementById('copy-address-btn');
  if (copyAddrBtn) {
    copyAddrBtn.addEventListener('click', function () {
      copyText(copyAddrBtn.getAttribute('data-address'), '연암공원 테니스장 주소를 복사했어요.');
    });
  }

  // 공유 버튼
  var shareUrl = document.querySelector('meta[property="og:url"]').getAttribute('content');
  document.querySelectorAll('.share-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({
          title: document.title,
          text: '대구 연암공원 테니스 클럽 연사모 · 매주 화·금 저녁 7시~10시',
          url: shareUrl
        }).catch(function (err) {
          if (err && err.name === 'AbortError') return;
          copyText(shareUrl, '사이트 주소를 복사했어요.');
        });
      } else {
        copyText(shareUrl, '사이트 주소를 복사했어요.');
      }
    });
  });

  // 휴대폰 하단 고정 버튼: 첫 화면 버튼·문의 칸·바닥글이 화면에 있으면 겹치지 않게 숨긴다
  var mobileCta = document.querySelector('.mobile-cta');
  if ('IntersectionObserver' in window && mobileCta) {
    var blockers = document.querySelectorAll('.hero-actions, #contact, .site-footer');
    var visibleBlockers = new Set();
    var ctaObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) visibleBlockers.add(entry.target);
        else visibleBlockers.delete(entry.target);
      });
      mobileCta.classList.toggle('is-away', visibleBlockers.size > 0);
    });
    blockers.forEach(function (el) { ctaObserver.observe(el); });
    mobileCta.classList.add('is-away');
    mobileCta.hidden = false;
  }

  // 문의 탭 전환 (마우스 클릭 + 키보드 방향키 접근성 지원)
  var tabs = Array.prototype.slice.call(document.querySelectorAll('[role="tab"]'));
  var builderJoinRow = document.getElementById('builder-join-row');
  var builderGuestRow = document.getElementById('builder-guest-row');

  function activateTab(tab) {
    tabs.forEach(function (t) {
      var selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.setAttribute('tabindex', selected ? '0' : '-1');
      var panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    });
    var isGuest = tab.id === 'tab-guest';
    if (builderJoinRow) builderJoinRow.hidden = isGuest;
    if (builderGuestRow) builderGuestRow.hidden = !isGuest;
  }

  tabs.forEach(function (tab, idx) {
    tab.addEventListener('click', function () { activateTab(tab); });
    tab.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var nextIdx = (idx + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
        tabs[nextIdx].focus();
        activateTab(tabs[nextIdx]);
      }
    });
  });

  // 운영 섹션의 "다음 모임일에 게스트 신청하기" 버튼 클릭 시 게스트 탭 활성화 후 스크롤
  var guestQuickBtn = document.getElementById('guest-quick-btn') || document.querySelector('.info-actions button');
  if (guestQuickBtn) {
    guestQuickBtn.addEventListener('click', function () {
      var guestTab = document.getElementById('tab-guest');
      if (guestTab) activateTab(guestTab);
      var contactSec = document.getElementById('contact');
      if (contactSec) contactSec.scrollIntoView({ behavior: 'smooth' });
    });
  }

  // 오픈채팅 버튼: 링크가 없으면 누를 수 없는 "준비 중" 표시
  document.querySelectorAll('.openchat-slot').forEach(function (slot) {
    var el;
    if (config.openChatUrl) {
      el = document.createElement('a');
      el.className = 'btn btn-small btn-kakao';
      el.href = config.openChatUrl;
      el.target = '_blank';
      el.rel = 'noopener';
      el.textContent = '💬 카카오톡 오픈채팅 열기';
    } else {
      el = document.createElement('span');
      el.className = 'btn btn-small btn-disabled';
      el.textContent = '오픈채팅 링크 준비 중';
    }
    slot.appendChild(el);
  });

  if (config.phone) {
    var phoneLink = document.querySelector('.phone-link');
    phoneLink.href = 'tel:' + config.phone.replace(/[^0-9+]/g, '');
    phoneLink.textContent = config.phone;
    document.querySelector('.phone-line').hidden = false;
  }

  var sns = [['.sns-instagram', config.instagramUrl], ['.sns-band', config.bandUrl]];
  sns.forEach(function (pair) {
    if (!pair[1]) return;
    var link = document.querySelector(pair[0]);
    link.href = pair[1];
    link.hidden = false;
    document.querySelector('.sns-links').hidden = false;
  });

  // 회원 후기: 하나라도 있을 때만 섹션을 보여 준다
  var reviews = config.reviews || [];
  if (reviews.length) {
    var list = document.querySelector('.review-list');
    reviews.forEach(function (r) {
      var card = document.createElement('blockquote');
      card.className = 'review';
      var text = document.createElement('p');
      text.textContent = r.text;
      card.appendChild(text);
      if (r.name) {
        var name = document.createElement('cite');
        name.textContent = r.name;
        card.appendChild(name);
      }
      list.appendChild(card);
    });
    document.getElementById('reviews').hidden = false;
  }
})();
