// 스크롤 등장 효과, 문의 탭 전환, config.js 값(오픈채팅·전화·SNS·후기) 반영 — 빈 값은 화면에서 숨긴다
(function () {
  var config = window.CLUB_CONFIG || {};
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // 스크롤 등장 효과: 이 클래스가 붙어야만 CSS가 .reveal을 숨기므로, 여기까지 오지 못하면 내용은 그대로 보인다
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

  // 숫자 올라가는 효과: HTML에 적힌 최종값(20·22·2)에서 끝난다
  function countUp(el) {
    var target = Number(el.getAttribute('data-to'));
    var start = null;
    function step(time) {
      if (start === null) start = time;
      var progress = Math.min((time - start) / 1200, 1);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - progress, 3))));
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // 다음 모임 안내 — 보는 사람 폰의 시간대와 상관없이 한국 시간(UTC+9, 서머타임 없음)으로 계산한다
  var KST = 9 * 3600 * 1000;
  var SESSION_DAYS = [2, 5]; // 화, 금
  var START_HOUR = 19;
  var END_HOUR = 22;
  var DAY_NAMES = ['일', '월', '화', '수', '목', '금', '토'];

  // 반환값의 kst는 getUTC* 값이 한국 시각인 Date
  function findSession(nowMs) {
    var k = new Date(nowMs + KST);
    var minutes = k.getUTCHours() * 60 + k.getUTCMinutes();
    var today = k.getUTCDay();
    if (SESSION_DAYS.indexOf(today) !== -1 && minutes >= START_HOUR * 60 && minutes < END_HOUR * 60) {
      return { live: true, daysAhead: 0, kst: k };
    }
    for (var d = 0; d <= 7; d++) {
      if (SESSION_DAYS.indexOf((today + d) % 7) === -1) continue;
      if (d === 0 && minutes >= START_HOUR * 60) continue;
      var startMs = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() + d, START_HOUR) - KST;
      return { live: false, daysAhead: d, startMs: startMs, kst: new Date(startMs + KST) };
    }
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

  function renderSession() {
    var now = Date.now();
    var session = findSession(now);
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
      nextCard.querySelector('.next-label').textContent = '다음 모임';
      nextCard.querySelector('.next-when').textContent = dateLabel(session.kst) + ' 저녁 7시';
      nextCard.querySelector('.next-countdown').textContent = remainLabel(session.startMs - now);
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

  // 다음 모임 저녁(7~10시) 날씨 — Open-Meteo 무료 예보(키 없음). 실패하면 칸을 숨기고 이유는 콘솔에 남긴다
  var WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=35.898&longitude=128.598'
    + '&hourly=temperature_2m,precipitation_probability,weather_code&timezone=Asia%2FSeoul&forecast_days=7';

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function weatherLabel(code) {
    if (code === 0) return '맑음';
    if (code <= 2) return '구름 조금';
    if (code === 3) return '흐림';
    if (code <= 48) return '안개';
    if (code <= 57) return '이슬비';
    if (code <= 67) return '비';
    if (code <= 77) return '눈';
    if (code <= 82) return '소나기';
    if (code <= 86) return '눈';
    return '뇌우';
  }

  function isNumber(v) { return typeof v === 'number' && isFinite(v); }

  function loadWeather(session) {
    var box = nextCard.querySelector('.weather');
    var kst = session.kst;
    var dateKey = kst.getUTCFullYear() + '-' + pad(kst.getUTCMonth() + 1) + '-' + pad(kst.getUTCDate());
    var fromHour = session.live ? new Date(Date.now() + KST).getUTCHours() : START_HOUR;
    var controller = window.AbortController ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, 8000) : null;

    fetch(WEATHER_URL, controller ? { signal: controller.signal } : undefined)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        var h = data.hourly;
        var temps = [], probs = [], codes = [];
        for (var hour = fromHour; hour < END_HOUR; hour++) {
          var i = h.time.indexOf(dateKey + 'T' + pad(hour) + ':00');
          if (i === -1) continue;
          if (isNumber(h.temperature_2m[i])) temps.push(h.temperature_2m[i]);
          if (isNumber(h.precipitation_probability[i])) probs.push(h.precipitation_probability[i]);
          if (isNumber(h.weather_code[i])) codes.push(h.weather_code[i]);
        }
        if (!temps.length || !codes.length) throw new Error(dateKey + ' 저녁 예보가 응답에 없음');

        var low = Math.round(Math.min.apply(null, temps));
        var high = Math.round(Math.max.apply(null, temps));
        var worst = Math.max.apply(null, codes);
        var parts = [weatherLabel(worst), '기온 ' + (low === high ? low : low + '~' + high) + '°'];
        var rain = probs.length ? Math.max.apply(null, probs) : null;
        if (rain !== null) parts.push('비 올 확률 ' + rain + '%');
        box.querySelector('.weather-main').textContent = parts.join(' · ');
        box.querySelector('.weather-warn').hidden = !((rain !== null && rain >= 50) || worst >= 51);
        box.hidden = false;
      })
      .catch(function (err) {
        box.hidden = true;
        console.warn('[날씨] 표시 안 함:', err && err.message ? err.message : err);
      })
      .then(function () { if (timer) clearTimeout(timer); });
  }

  if (window.fetch) loadWeather(firstSession);

  // NTRP 자가 점검: 고른 개수에 따라 안내만 바꾼다 (가입 여부를 정해 주는 말은 쓰지 않음)
  var checks = document.querySelectorAll('.self-check input');
  var checkResult = document.querySelector('.self-check-result');
  checks.forEach(function (box) {
    box.addEventListener('change', function () {
      var n = document.querySelectorAll('.self-check input:checked').length;
      var total = checks.length;
      if (n === total) checkResult.textContent = total + '개 모두 해당 — 3.0 설명과 잘 맞아요. 문의할 때 구력과 함께 알려 주세요.';
      else if (n >= 2) checkResult.textContent = total + '개 중 ' + n + '개 해당 — 일부만 맞아요. 문의할 때 어려운 부분을 함께 알려 주세요.';
      else checkResult.textContent = total + '개 중 ' + n + '개 해당 — 아직은 3.0 설명과 거리가 있어요. 랠리와 복식 게임에 익숙해진 뒤 문의해 주세요.';
    });
  });

  // 알림 한 줄 (복사·공유 결과)
  var toast = document.querySelector('.toast');
  var toastTimer = null;
  function showToast(message) {
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toast.hidden = true; }, 2400);
  }

  // 클립보드 복사: 최신 방식이 막히면 예전 방식으로 한 번 더 시도
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
      else {
        console.warn('[복사] 클립보드에 넣지 못함');
        showToast('복사하지 못했어요. 길게 눌러 직접 복사해 주세요.');
      }
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { showToast(doneMessage); }, function (err) {
        console.warn('[복사] clipboard API 실패, 예전 방식으로 재시도:', err && err.message);
        legacyCopy();
      });
    } else {
      legacyCopy();
    }
  }

  document.querySelectorAll('.copy-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      copyText(document.getElementById(btn.getAttribute('data-copy')).textContent, '문의 양식을 복사했어요. 오픈채팅에 붙여 넣으세요.');
    });
  });

  // 공유: 휴대폰은 기본 공유 창(카톡 등), 안 되는 브라우저는 주소 복사
  var shareUrl = document.querySelector('meta[property="og:url"]').getAttribute('content');
  document.querySelectorAll('.share-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (navigator.share) {
        navigator.share({ title: document.title, text: '대구 연암공원 테니스 클럽 연사모 · 매주 화·금 저녁 7시~10시', url: shareUrl })
          .catch(function (err) {
            if (err && err.name === 'AbortError') return; // 사용자가 공유 창을 닫음
            console.warn('[공유] 실패, 주소 복사로 대신함:', err && err.message);
            copyText(shareUrl, '주소를 복사했어요');
          });
      } else {
        copyText(shareUrl, '주소를 복사했어요');
      }
    });
  });

  // 휴대폰 하단 고정 버튼: 첫 화면 버튼·문의 칸·바닥글이 화면에 있으면 겹치지 않게 숨긴다
  var mobileCta = document.querySelector('.mobile-cta');
  if ('IntersectionObserver' in window) {
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

  // 문의 탭: 누른 탭의 내용만 보이게
  var tabs = document.querySelectorAll('[role="tab"]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(function (t) {
        var selected = t === tab;
        t.setAttribute('aria-selected', String(selected));
        document.getElementById(t.getAttribute('aria-controls')).hidden = !selected;
      });
    });
  });

  // 오픈채팅 버튼: 링크가 없으면 누를 수 없는 "준비 중" 표시
  document.querySelectorAll('.openchat-slot').forEach(function (slot) {
    var el;
    if (config.openChatUrl) {
      el = document.createElement('a');
      el.className = 'btn btn-kakao';
      el.href = config.openChatUrl;
      el.target = '_blank';
      el.rel = 'noopener';
      el.textContent = '카카오톡 오픈채팅으로 문의';
    } else {
      el = document.createElement('span');
      el.className = 'btn btn-disabled';
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
