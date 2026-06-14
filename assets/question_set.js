function toggleAnswer(btn){const panel=btn.nextElementSibling;panel.classList.toggle('open');btn.textContent=panel.classList.contains('open')?'정답·해설 접기':'정답·해설';}function toggleEvidence(btn){const panel=btn.nextElementSibling;panel.classList.toggle('open');btn.textContent=panel.classList.contains('open')?btn.dataset.close:btn.dataset.open;}function collapseEvidence(btn){const panel=btn.closest('.evidence-panel');if(!panel)return;panel.classList.remove('open');const tg=panel.previousElementSibling;if(tg&&tg.classList.contains('evidence-toggle')){tg.textContent=tg.dataset.open;tg.scrollIntoView({block:'center',behavior:'smooth'});}}function showAll(){document.querySelectorAll('.answer-panel,.evidence-panel').forEach(e=>e.classList.add('open'));document.querySelectorAll('.toggle-answer').forEach(b=>b.textContent='정답·해설 접기');document.querySelectorAll('.evidence-toggle').forEach(b=>b.textContent=b.dataset.close);}function hideAll(){document.querySelectorAll('.answer-panel,.evidence-panel').forEach(e=>e.classList.remove('open'));document.querySelectorAll('.toggle-answer').forEach(b=>b.textContent='정답·해설');document.querySelectorAll('.evidence-toggle').forEach(b=>b.textContent=b.dataset.open);window.scrollTo({top:0,behavior:'smooth'});}function toggleAll(btn){var p=document.querySelectorAll('.answer-panel');var o=document.querySelectorAll('.answer-panel.open').length;if(o<p.length){showAll();btn.textContent='정답·해설 모두 접기';}else{hideAll();btn.textContent='정답·해설 모두 펼치기';}}

/* ============================================================
   테마: index.html과 동일한 localStorage 키('sok-index-theme')를 공유.
   - 페이지가 뜰 때 index에서 고른 테마를 그대로 적용
   - 이 페이지의 테마 선택 버튼으로 바꾸면 그 값이 다시 저장되어
     index를 포함한 모든 페이지에 반영됨
   ============================================================ */
(function(){
  var THEME_KEY = 'sok-index-theme';
  var THEMES = ['나이테','황혼','윤슬','쪽빛','미리내'];
  function validTheme(t){ return THEMES.indexOf(t) !== -1 ? t : '나이테'; }
  function applyTheme(t){
    t = validTheme(t);
    document.documentElement.setAttribute('data-theme', t);
    document.documentElement.style.colorScheme = /^(쪽빛|미리내)$/.test(t) ? 'dark' : 'light';
    var buttons = document.querySelectorAll('[data-theme-choice]');
    for (var i = 0; i < buttons.length; i++){
      buttons[i].setAttribute('aria-pressed', String(buttons[i].getAttribute('data-theme-choice') === t));
    }
    try { localStorage.setItem(THEME_KEY, t); } catch(e) {}
  }
  var picker = document.getElementById('themePicker');
  if (picker){
    picker.addEventListener('click', function(e){
      var btn = e.target.closest('[data-theme-choice]');
      if (!btn) return;
      applyTheme(btn.getAttribute('data-theme-choice'));
    });
  }
  // 다른 탭(예: index)에서 테마를 바꾸면 이 페이지도 즉시 따라가기
  window.addEventListener('storage', function(e){
    if (e.key === THEME_KEY && e.newValue) applyTheme(e.newValue);
  });
  try { applyTheme(validTheme(localStorage.getItem(THEME_KEY) || document.documentElement.getAttribute('data-theme'))); }
  catch(e) { applyTheme('나이테'); }
})();

(function(){
  // 이 페이지의 이름(h1·탭 제목)은 자기 자신의 <meta name="page-title">에서만 읽는다 (단일 출처)
  var m = document.querySelector('meta[name="page-title"]');
  var pageName = m ? (m.getAttribute('content')||'').trim() : '';
  if (pageName){
    document.title = pageName;
    var h = document.querySelector('.hero h1') || document.querySelector('h1');
    if (h) h.textContent = pageName;
  }
  // 상단/하단 '돌아가기' 띠의 사이트 제목은 더 이상 여기서 채우지 않는다.
  // 그 문구는 pages.js의 암호화된 SITE_ENC 안에 있고,
  // 잠금 해제 후 unlock.js가 복호화해서 채운다.
})();

/* ============================================================
   비신탁 / 신탁 토글
   - 신탁 카드: <section class="q-card oracle">
   - 우상단 토글 버튼: <button class="oracle-fab" onclick="toggleOracle(this)">
   ============================================================ */
function toggleOracle(btn){
  var on = document.body.classList.toggle('oracle-on');
  btn.setAttribute('aria-pressed', String(on));
  btn.textContent = on ? btn.dataset.on : btn.dataset.off;   // ✦ 라벨은 HTML의 data-on/data-off, 아이콘은 CSS ::before 라 유지됨
}

/* 잠금 해제로 문항이 #decryptedContent 에 주입되면:
   - 신탁(.q-card.oracle) 카드가 하나도 없으면 토글 버튼을 자동으로 숨기고
   - 기본 상태로 초기화한다.
   (content 페이지는 별도 이벤트가 없어 MutationObserver 로 주입 시점을 감지) */
(function(){
  var dc = document.getElementById('decryptedContent');
  if(!dc) return;
  function sync(){
    var fab = document.querySelector('.oracle-fab');
    if(!fab) return;
    fab.style.display = dc.querySelector('.q-card.oracle') ? '' : 'none';
    document.body.classList.remove('oracle-on');
    fab.setAttribute('aria-pressed','false');
    fab.textContent = fab.dataset.off;
  }
  if(!dc.hidden && dc.querySelector('.oracle-fab')) sync();
  new MutationObserver(function(){
    if(!dc.hidden && dc.querySelector('.oracle-fab')) sync();
  }).observe(dc, {childList:true, attributes:true, attributeFilter:['hidden']});
})();
