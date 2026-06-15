(function () {
  var PASS_KEY = 'sok-site-passphrase-v1';
  var UNLOCKED_KEY = 'sok-site-unlocked-v1';
  var EXPECTED_VERIFIER = 'SOK_INDEX_UNLOCK_OK_V1';

  function b64ToBytes(b64) {
    var bin = atob(String(b64).replace(/\s+/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }

  async function deriveKey(passphrase, saltBytes, iterations) {
    var enc = new TextEncoder();
    var keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(passphrase),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: iterations || 250000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );
  }

  async function decryptPayload(payload, passphrase) {
    var salt = b64ToBytes(payload.salt);
    var iv = b64ToBytes(payload.iv);
    var data = b64ToBytes(payload.data);
    var key = await deriveKey(passphrase, salt, payload.iterations || 250000);
    var plainBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data);
    return new TextDecoder().decode(plainBuffer);
  }

  // 텍스트가 아니라 '원본 바이트'가 필요한 경우(이미지 등)에 쓴다.
  // 문항 페이로드와 동일한 {salt, iv, data, iterations} 형식을 받아 ArrayBuffer를 돌려준다.
  async function decryptPayloadBytes(payload, passphrase) {
    var salt = b64ToBytes(payload.salt);
    var iv = b64ToBytes(payload.iv);
    var data = b64ToBytes(payload.data);
    var key = await deriveKey(passphrase, salt, payload.iterations || 250000);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data); // ArrayBuffer
  }

  /* ============================================================
     암호화된 이미지 채우기
     - 잠금 해제 후 주입된 HTML에서 <img data-enc-src="...jpg.enc"> 를 찾아
       .enc(JSON)를 내려받아 복호화 → Blob URL 로 img.src 를 채운다.
     - 비밀번호가 틀리면 GCM 인증 태그에서 막혀 복호화가 실패한다.
     ============================================================ */
  async function hydrateEncryptedImages(root, passphrase) {
    if (!root || !passphrase) return;
    var imgs = Array.prototype.slice.call(root.querySelectorAll('img[data-enc-src]'));
    await Promise.all(imgs.map(async function (img) {
      var url = img.getAttribute('data-enc-src');
      try {
        var res = await fetch(url);
        if (!res.ok) throw new Error('fetch ' + res.status);
        var payload = await res.json();
        var buf = await decryptPayloadBytes(payload, passphrase);
        var mime = payload.mime || 'image/jpeg';
        var objURL = URL.createObjectURL(new Blob([buf], { type: mime }));
        img.src = objURL;
        img.removeAttribute('data-enc-src');
      } catch (e) {
        img.removeAttribute('src');
        img.setAttribute('alt', (img.getAttribute('alt') || '') + ' (이미지 복호화 실패)');
      }
    }));
  }

  function getStoredPassphrase() {
    try {
      if (sessionStorage.getItem(UNLOCKED_KEY) !== '1') return '';
      return sessionStorage.getItem(PASS_KEY) || '';
    } catch (e) {
      return '';
    }
  }

  function storePassphrase(passphrase) {
    try {
      sessionStorage.setItem(PASS_KEY, passphrase);
      sessionStorage.setItem(UNLOCKED_KEY, '1');
    } catch (e) {}
  }

  function clearPassphrase() {
    try {
      sessionStorage.removeItem(PASS_KEY);
      sessionStorage.removeItem(UNLOCKED_KEY);
      sessionStorage.removeItem('sok-index-toc-v1'); // 목차 캐시도 함께 폐기
    } catch (e) {}
  }

  function setUnlockedView(isUnlocked) {
    document.body.setAttribute('data-unlocked', isUnlocked ? 'true' : 'false');
    if (isUnlocked) {
      try { window.dispatchEvent(new CustomEvent('sok:index-unlocked')); } catch (e) {}
    }
  }

  async function verifyIndexPassphrase(passphrase) {
    var payloadEl = document.getElementById('indexUnlockPayload');
    if (!payloadEl) throw new Error('index verifier payload not found');
    var payload = JSON.parse(payloadEl.textContent);
    var plain = await decryptPayload(payload, passphrase);
    if (plain !== (payload.expect || EXPECTED_VERIFIER)) throw new Error('index verifier mismatch');
    return true;
  }

  /* ============================================================
     브랜딩(제목·강조어·라벨·태그라인)
     - 평문 대신 pages.js의 window.SITE_ENC(암호문)에 들어 있습니다.
     - 잠금 해제 후 세션에 passphrase가 있을 때만 복호화해서 채웁니다.
     - passphrase가 없으면(잠긴 cNNNN 등) 비밀이 아닌 일반 문구로 대체합니다.
     ============================================================ */
  function escHtml(s) {
    return String(s).replace(/[&<>]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c];
    });
  }

  function fillBackLink(title) {
    var b = document.querySelector('[data-home="brand"]');
    if (b) b.textContent = title || '';
    var bf = document.querySelector('[data-home="brandfull"]');
    if (bf) bf.textContent = title ? (title + '으로 돌아가기') : '돌아가기';
  }

  function applyBranding(site) {
    site = site || {};
    window.SITE = site; // 혹시 다른 코드가 참조할 수 있으므로 노출
    var title = site.title || '';

    // 문서 제목은 index에서만 사이트 제목으로 둡니다.
    // (cNNNN 탭 제목은 그 페이지 자신의 <meta name="page-title">을 유지)
    var page = document.body.getAttribute('data-lock-page');
    if (title && page === 'index') document.title = title;

    // index 헤더/푸터
    var foot = document.getElementById('foot-title');
    if (foot) foot.textContent = title;

    var st = document.getElementById('site-title');
    if (st) {
      var hl = site.highlight;
      if (hl && title.indexOf(hl) !== -1) {
        var i = title.indexOf(hl);
        st.innerHTML = escHtml(title.slice(0, i)) +
          '<span class="pick">' + escHtml(hl) + '</span>' +
          escHtml(title.slice(i + hl.length));
      } else {
        st.textContent = title;
      }
    }

    var eb = document.getElementById('site-eyebrow');
    if (eb && site.eyebrow) eb.textContent = site.eyebrow;

    var tg = document.getElementById('site-tagline');
    if (tg && site.tagline) tg.textContent = site.tagline;

    // cNNNN 상단/하단 돌아가기 띠
    fillBackLink(title);
  }

  function applyFallbackBranding() {
    // 잠금 상태에서 보이는 cNNNN 돌아가기 띠가 비지 않도록 하는 일반 문구
    fillBackLink('');
  }

  function applyContentPageMeta(meta) {
    meta = meta || {};
    if (meta.title) document.title = meta.title;
    var eyebrow = document.getElementById('page-eyebrow');
    if (eyebrow && meta.eyebrow) eyebrow.textContent = meta.eyebrow;
    var title = document.getElementById('page-title') || document.querySelector('.hero h1') || document.querySelector('h1');
    if (title && meta.title) title.textContent = meta.title;
    var subtitle = document.getElementById('page-subtitle');
    if (subtitle && meta.subtitle) subtitle.textContent = meta.subtitle;
  }

  async function loadContentPageMeta(passphrase) {
    var payloadEl = document.getElementById('pageMetaPayload');
    if (!payloadEl || !passphrase) return;
    try {
      var payload = JSON.parse(payloadEl.textContent);
      var txt = await decryptPayload(payload, passphrase);
      applyContentPageMeta(JSON.parse(txt));
    } catch (e) {}
  }

  async function loadBranding() {
    var passphrase = getStoredPassphrase();
    if (!passphrase || !window.SITE_ENC) {
      applyFallbackBranding();
      return;
    }
    try {
      var txt = await decryptPayload(window.SITE_ENC, passphrase);
      applyBranding(JSON.parse(txt));
    } catch (e) {
      applyFallbackBranding();
    }
  }

  async function unlockIndexFromInput() {
    var input = document.getElementById('indexPassphrase');
    var msg = document.getElementById('indexUnlockMsg');
    if (!input || !msg) return;

    var passphrase = input.value;
    if (!passphrase) {
      msg.textContent = '상단 박스에 입력하세요.';
      return;
    }

    msg.textContent = '접신하는 중...';
    try {
      await verifyIndexPassphrase(passphrase);
      storePassphrase(passphrase);
      setUnlockedView(true);
      msg.textContent = '잠금이 해제되었습니다.';
      loadBranding();
    } catch (e) {
      clearPassphrase();
      setUnlockedView(false);
      msg.textContent = '틀렸습니다.';
      input.select();
    }
  }

  async function bootIndexLock() {
    var input = document.getElementById('indexPassphrase');
    var btn = document.getElementById('indexUnlockBtn');
    var msg = document.getElementById('indexUnlockMsg');

    setUnlockedView(false);

    if (btn) btn.addEventListener('click', unlockIndexFromInput);
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') unlockIndexFromInput();
      });
    }

    var stored = getStoredPassphrase();
    if (stored) {
      try {
        await verifyIndexPassphrase(stored);
        setUnlockedView(true);
        if (msg) msg.textContent = '이미 해제된 세션입니다.';
        loadBranding();
        return;
      } catch (e) {
        clearPassphrase();
      }
    }

    if (input) setTimeout(function () { input.focus(); }, 0);
  }

  async function bootContentLock() {
    var msg = document.getElementById('unlockMsg');
    var box = document.getElementById('unlockBox');
    var target = document.getElementById('decryptedContent');
    var payloadEl = document.getElementById('encryptedPayload');
    if (!payloadEl || !target) return;

    var passphrase = getStoredPassphrase();
    if (!passphrase) {
      if (msg) msg.textContent = '';
      if (box) box.hidden = false;
      target.hidden = true;
      applyFallbackBranding();
      return;
    }

    // 세션이 있으면 돌아가기 띠의 사이트 제목과 페이지 제목부터 채웁니다.
    loadBranding();
    await loadContentPageMeta(passphrase);

    if (msg) msg.textContent = '세션 해제 확인 후 처리 중...';

    try {
      var payload = JSON.parse(payloadEl.textContent);
      var html = await decryptPayload(payload, passphrase);
      target.innerHTML = html;
      target.hidden = false;
      if (box) box.hidden = true;
      // 주입된 문항 안의 암호화된 이미지(<img data-enc-src>)를 복호화해 채운다.
      hydrateEncryptedImages(target, passphrase);
    } catch (e) {
      clearPassphrase();
      target.hidden = true;
      if (box) box.hidden = false;
      if (msg) msg.textContent = '저장된 세션으로 복호화하지 못했습니다. 홈에서 다시 시도하세요.';
      applyFallbackBranding();
    }
  }

  window.SOK_LOCK = {
    unlockIndexFromInput: unlockIndexFromInput,
    decryptPayload: decryptPayload,
    decryptPayloadBytes: decryptPayloadBytes,
    hydrateEncryptedImages: hydrateEncryptedImages,
    decryptStoredPayload: async function (payload) {
      var passphrase = getStoredPassphrase();
      if (!passphrase) throw new Error('stored passphrase not found');
      return decryptPayload(payload, passphrase);
    },
    loadBranding: loadBranding,
    clear: clearPassphrase,
    isUnlocked: function () { return !!getStoredPassphrase(); }
  };

  var pageType = document.body.getAttribute('data-lock-page');
  if (pageType === 'index') bootIndexLock();
  if (pageType === 'content') bootContentLock();
})();
