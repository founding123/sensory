/* ============================================================
   사이트 설정

   ▣ 페이지 목록 관리 방법
     페이지 목록은 아래 PAGE_NUMBERS 배열에서 직접 관리한다.
     배열에는 파일명의 숫자를 앞의 0 없이 숫자로 적는다.

       예)
       window.PAGE_NUMBERS = [
         1,     // c0001.html
         101,   // c0101.html
         151,   // c0151.html
         300,   // c0300.html
         5000   // c5000.html
       ];

     목차(index)에는 번호순으로 표시된다.
     가운데 빠진 번호가 있어도 된다.

   ▣ 새 페이지 추가하는 법
     1) 파일을 cNNNN.html 이름으로 올린다.
        예) c0001.html, c0151.html, c3050.html

     2) pages.js의 PAGE_NUMBERS 배열에 해당 번호를 추가한다.
        예) c3050.html을 추가했다면 3050을 추가한다.

     3) 그 파일 <head> 안에 다음 meta 태그를 둔다.
            <meta name="page-title" content="">

        실제 목차 제목은 암호화된 pageMetaPayload의 title을
        잠금 해제 후 복호화하여 사용한다.

   ▣ 목차(index) 화면의 제목·강조어·라벨·태그라인은 평문으로 두지 않는다.
     아래 SITE_ENC는 그 네 문구를 담은 JSON을 index 비밀번호와 동일한 방식
     (PBKDF2 → AES-GCM)으로 암호화한 것이다.

       복호화된 평문 JSON 형태:
         { "title": "...", "highlight": "...", "eyebrow": "...", "tagline": "..." }

     잠금 해제 후 세션에 passphrase가 있을 때 unlock.js가 복호화하여 채운다.

   ▣ 문구 바꾸는 법
     1) 새 JSON을 파일로 저장한다. 예) site.json
          {"title":"...","highlight":"...","eyebrow":"...","tagline":"..."}

     2) 문항과 같은 도구로 암호화한다. 이때 동일한 비밀번호를 사용해야 한다.
          python tools/encrypt_fragment.py site.json --password <비밀번호>

     3) 출력된 salt/iv/data를 아래 SITE_ENC에 붙여 넣는다.
   ============================================================ */

window.SITE_ENC = 
{
  "kdf": "PBKDF2",
  "hash": "SHA-256",
  "iterations": 600000,
  "cipher": "AES-GCM",
  "salt": "QbGgFJ2xI0ujXBZuW3Ot+Q==",
  "iv": "3oyZ1j/aIjjeCZbk",
  "data": "dmoEdRk5WEua8FtkTgrxMxLmL5ZDvdZwO/OJhzJEhywiIJKLc/s7lkCY+poLGKxup2E86iNE5DDoi01ICgt2bc8kOotHJOIM1PQa9bzK9JqNDcTj8WaZcJcoDlRvFUsu3KH+7ofPuCPUca9diGJ33LbMzLHo3svpyXf0anff1UKfIfnqrhHzncVtTWiDlgvUsJlm+By9zVadOKIxOfhLkeDFMUsLT+okSeRBp6GIYPXv31tKsB9Y0qAnpaPvufgbgtOAFW9Dsbk="
}
;

window.PAGE_NUMBERS = [
  100, 200, 300, 400, 700, 800, 900, 1000, // 500->1833, 600->1867
  1100, 1200, 1300, 1400, 1450, 1500, 1600, 1700, 1800, 1833, 1867, 1900, 2000, // 1400->(1400, 1450)
  2100, 2300, 2350, 2400, 2500, 2600, 2700, 2800, 2900 // 2200->2350
];
