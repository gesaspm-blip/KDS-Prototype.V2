/**
 * kds.js — KDS 智慧廚房控菜系統互動邏輯
 * Frame 907 切版對應功能
 *
 * 已移除（改用 Bootstrap 5 內建）：
 *   - initNoteToggle()  → BS5 Collapse (data-bs-toggle="collapse")
 *   - initSlider()      → BS5 Carousel (data-bs-touch="true")
 *   - updatePaginator() → BS5 Carousel indicators 自動處理
 */

'use strict';

// ─────────────────────────────────────────
// 1. 即時時鐘
// ─────────────────────────────────────────
function initClock() {
  const timeEl = document.getElementById('kds-time');
  const dateEl = document.getElementById('kds-date');
  if (!timeEl || !dateEl) return;

  const DAYS = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];

  function update() {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    const m   = now.getMonth() + 1;
    const d   = now.getDate();
    const w   = DAYS[now.getDay()];
    timeEl.textContent = `${hh}:${mm}`;
    dateEl.textContent = `${m}月${d}日 · ${w}`;
  }

  update();
  setInterval(update, 1000);
}

// ─────────────────────────────────────────
// 2. 等待時間分類（依分鐘數套用色彩 class）
// ─────────────────────────────────────────
function initWaitTimes() {
  document.querySelectorAll('.wait-time[data-minutes]').forEach(el => {
    const min = parseInt(el.dataset.minutes, 10);
    el.classList.remove('wait-time--danger', 'wait-time--warning', 'wait-time--normal');
    if (min >= 30)      el.classList.add('wait-time--danger');
    else if (min >= 10) el.classList.add('wait-time--warning');
    else                el.classList.add('wait-time--normal');
  });
}

function handleItemCheck(btn) {
  btn.classList.toggle('is-checked');
  btn.setAttribute('aria-checked', String(btn.classList.contains('is-checked')));

  const isChecked = btn.classList.contains('is-checked');
  const itemRow = btn.closest('.slip__item-row');
  if (itemRow) {
    if (isChecked) {
      itemRow.classList.add('is-hidden');
    } else {
      itemRow.classList.remove('is-hidden');
    }
  }

  const orderItem = btn.closest('.slip__order-item');
  if (orderItem) {
    const allRows = Array.from(orderItem.querySelectorAll('.slip__item-row'));
    const allHidden = allRows.every(row => row.classList.contains('is-hidden'));
    if (allHidden) {
      orderItem.classList.add('is-hidden');
    } else {
      orderItem.classList.remove('is-hidden');
    }
  }

  const slip = btn.closest('.slip');
  const slipCol = btn.closest('.slip-col');
  if (slip && slipCol) {
    const allOrderItems = Array.from(slip.querySelectorAll('.slip__order-item'));
    const allItemsHidden = allOrderItems.every(item => item.classList.contains('is-hidden'));
    if (allItemsHidden) {
      slipCol.classList.add('is-hidden');
      syncSlipPages();
    }
  }
}

function initIconButtons() {
  document.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleItemCheck(btn);
    });
  });
}

// ─────────────────────────────────────────
// 4. 全部完成按鈕
// ─────────────────────────────────────────
function initCompleteButtons() {
  document.querySelectorAll('.slip__complete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slipCol = btn.closest('.slip-col');
      if (!slipCol) return;
      
      // 標記所有品項完成
      slipCol.querySelectorAll('.icon-btn:not(.is-checked)').forEach(ib => {
        ib.classList.add('is-checked');
        ib.setAttribute('aria-checked', 'true');
      });

      // 隱藏整張訂單並重新分頁
      slipCol.classList.add('is-hidden');
      syncSlipPages();
    });
  });
}

let currentSlipPage = 0;
let slipTrackScrollInitialized = false;

function updateSlipActivePage(index) {
  const dots = document.querySelectorAll('.paginator__dot');
  if (!dots.length) return;

  const clampedIndex = Math.max(0, Math.min(index, dots.length - 1));
  dots.forEach((dot, i) => {
    const isActive = i === clampedIndex;
    dot.classList.toggle('is-active', isActive);
    dot.classList.toggle('active', isActive);
    dot.setAttribute('aria-current', isActive ? 'true' : 'false');
  });

  currentSlipPage = clampedIndex;
}

function setSlipPage(index) {
  const carousel = document.getElementById('slips-carousel');
  const track = carousel?.querySelector('.slips-track');
  if (!carousel || !track) return;

  const cols = Array.from(track.querySelectorAll('.slip-col'));
  if (!cols.length) return;

  const targetColIndex = index * 3;
  const targetCol = cols[targetColIndex];
  if (!targetCol) return;

  track.scrollTo({ left: targetCol.offsetLeft, behavior: 'smooth' });
  updateSlipActivePage(index);
}

// ─────────────────────────────────────────
// 5. 依現有結構對 slip-col 進行分頁指標與佔位處理（無 page 包裹層，可流暢單張滑動）
// ─────────────────────────────────────────
function syncSlipPages() {
  const carousel = document.getElementById('slips-carousel');
  const track = carousel?.querySelector('.slips-track');
  const paginator = document.querySelector('.kds-paginator .carousel-indicators');
  if (!carousel || !track || !paginator) return;

  if (typeof bootstrap !== 'undefined' && bootstrap.Carousel) {
    const instance = bootstrap.Carousel.getInstance(carousel);
    if (instance) {
      instance.dispose();
    }
  }

  const visibleCols = Array.from(track.querySelectorAll('.slip-col'))
    .filter(col => !col.classList.contains('is-hidden') && !col.classList.contains('slip-col--empty'));

  // 移除舊的頁面包裹容器與空白佔位
  track.querySelectorAll('.slips-page').forEach(page => page.remove());
  track.querySelectorAll('.slip-col--empty').forEach(empty => empty.remove());

  if (!visibleCols.length) {
    paginator.innerHTML = '';
    return;
  }

  // 將所有真實的 slip-col 放到 track 最外層
  visibleCols.forEach(col => track.appendChild(col));

  // 補足空欄位以 3 個為一頁進行對齊
  const remainder = visibleCols.length % 3;
  const pads = remainder === 0 ? 0 : 3 - remainder;
  for (let i = 0; i < pads; i++) {
    const placeholder = document.createElement('div');
    placeholder.className = 'slip-col slip-col--empty';
    placeholder.setAttribute('aria-hidden', 'true');
    track.appendChild(placeholder);
  }

  // 重新計算頁數（以 3 欄為一頁），並生成圓點
  const pageCount = Math.ceil(track.querySelectorAll('.slip-col').length / 3);
  paginator.innerHTML = '';
  for (let index = 0; index < pageCount; index++) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `paginator__dot${index === 0 ? ' is-active active' : ''}`;
    dot.setAttribute('aria-label', `第 ${index + 1} 頁`);
    dot.setAttribute('aria-current', index === 0 ? 'true' : 'false');
    dot.addEventListener('click', () => setSlipPage(index));
    paginator.appendChild(dot);
  }

  if (!slipTrackScrollInitialized) {
    track.addEventListener('scroll', () => {
      window.requestAnimationFrame(() => {
        const cols = Array.from(track.querySelectorAll('.slip-col'));
        if (!cols.length) return;
        
        // 依據目前 scrollLeft 佔 track 寬度的比例計算當前分頁索引
        const pageIndex = Math.round(track.scrollLeft / track.clientWidth);
        if (pageIndex !== currentSlipPage) {
          updateSlipActivePage(pageIndex);
        }
      });
    }, { passive: true });
    slipTrackScrollInitialized = true;
  }

  track.scrollLeft = 0;
  currentSlipPage = 0;
}

// ─────────────────────────────────────────
// 6. 移除顯示按鈕（已取消訂單）
// ─────────────────────────────────────────
function initRemoveButtons() {
  document.querySelectorAll('.slip__remove-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.slip-col')?.classList.add('is-hidden');
      syncSlipPages();
    });
  });
}

// ─────────────────────────────────────────
// 7. BS5 Carousel — dot active 狀態同步
//    BS5 會自動切換 carousel-item active，
//    這裡額外同步 paginator__dot 的 is-active class
// ─────────────────────────────────────────
function initCarouselDots() {
  const carousel = document.getElementById('slips-carousel');
  if (!carousel) return;

  carousel.addEventListener('slide.bs.carousel', e => {
    const dots = document.querySelectorAll('.paginator__dot');
    dots.forEach((dot, i) => {
      const isActive = i === e.to;
      dot.classList.toggle('is-active', isActive);
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  });
}

// ─────────────────────────────────────────
// 8. Station Tab Bar 選取
// ─────────────────────────────────────────
function initStationTabs() {
  document.querySelectorAll('.station-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.station-tab').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-pressed', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-pressed', 'true');
    });
  });
}

// ─────────────────────────────────────────
// 9. Section Tab（待排入 / 製餐 / 已出餐）
// ─────────────────────────────────────────
function initSectionTabs() {
  document.querySelectorAll('.section-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.section-tab').forEach(t => {
        t.classList.remove('is-active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('is-active');
      tab.setAttribute('aria-selected', 'true');
      // TODO: 切換對應內容區
    });
  });
}

// ─────────────────────────────────────────
// 10. OrderViewToggle（依訂單 / 依品項）
// ─────────────────────────────────────────
function initOrderViewToggle() {
  document.querySelectorAll('.order-view-toggle__btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.order-view-toggle__btn').forEach(b => {
        b.classList.remove('order-view-toggle__btn--active');
        b.classList.add('order-view-toggle__btn--inactive');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.remove('order-view-toggle__btn--inactive');
      btn.classList.add('order-view-toggle__btn--active');
      btn.setAttribute('aria-pressed', 'true');
      // TODO: 切換訂單視角 / 品項匯總視角
    });
  });
}

// ─────────────────────────────────────────
// 11. 暫停排入按鈕
// ─────────────────────────────────────────
function initPauseOrder() {
  const btn      = document.getElementById('pause-order-btn');
  const pauseBar = document.getElementById('pause-bar');
  const mainText = btn?.querySelector('.btn-main-text');
  const subText  = btn?.querySelector('.btn-sub-text');
  if (!btn || !mainText || !subText) return;

  const updatePauseButtonState = (isPaused) => {
    btn.classList.toggle('is-paused', isPaused);
    pauseBar?.classList.toggle('is-hidden', !isPaused);
    btn.setAttribute('aria-pressed', String(isPaused));

    if (isPaused) {
      mainText.textContent = '暫停排入中';
      subText.textContent = '｜待排 6 張';
      btn.setAttribute('aria-label', '暫停排入中，待排 6 張');
    } else {
      mainText.textContent = '持續排入中';
      subText.textContent = '｜點擊暫停';
      btn.setAttribute('aria-label', '持續排入中，點擊暫停');
    }
  };

  updatePauseButtonState(false);

  btn.addEventListener('click', () => {
    const isPaused = btn.classList.contains('is-paused');
    updatePauseButtonState(!isPaused);
  });
}

// ─────────────────────────────────────────
// 12. 解決子層 .slip__scroll 阻擋父層水平拖曳的問題（手勢分流）
// ─────────────────────────────────────────
function setupSingleSlipTouchFlow(child, track) {
  let startX = 0;
  let startY = 0;
  let isScrollingDirectionDetermined = false;
  let isHorizontalSwipe = false;
  let initialScrollLeft = 0;

  child.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    initialScrollLeft = track.scrollLeft;
    isScrollingDirectionDetermined = false;
    isHorizontalSwipe = false;
  }, { passive: true });

  child.addEventListener('touchmove', (e) => {
    if (!startX || !startY) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;

    const deltaX = currentX - startX;
    const deltaY = currentY - startY;

    // 判定滑動方向（位移大於 10 像素時觸發）
    if (!isScrollingDirectionDetermined && (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10)) {
      isScrollingDirectionDetermined = true;
      // 如果水平位移大於垂直位移，判定為水平拖曳換頁
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        isHorizontalSwipe = true;
      }
    }

    if (isHorizontalSwipe) {
      // 阻止子層垂直捲動與瀏覽器預設行為
      if (e.cancelable) e.preventDefault();

      // 直接手動控制外層 track 進行水平滾動同步
      track.scrollLeft = initialScrollLeft - deltaX;
    }
    // 如果是垂直滑動，不做任何處理，放行讓子層自然上下捲動
  }, { passive: false }); // 必須為 false 才能成功 preventDefault
}

function initSlipScrollTouchFlow() {
  const carousel = document.getElementById('slips-carousel');
  const track = carousel?.querySelector('.slips-track');
  const childScrolls = document.querySelectorAll('.slip__scroll');
  
  if (!carousel || !track || !childScrolls.length) return;

  childScrolls.forEach(child => setupSingleSlipTouchFlow(child, track));
}

// ─────────────────────────────────────────
// 13. 測試用：動態新增義大利麵套餐
// ─────────────────────────────────────────
let testOrderCounter = 300;
let testSeatCounter = 1;

function bindSlipListeners(slipColEl) {
  // 1. 單品點擊打勾切換
  slipColEl.querySelectorAll('.icon-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      handleItemCheck(btn);
    });
  });

  // 2. 整單完成按鈕
  slipColEl.querySelectorAll('.slip__complete-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const slipCol = btn.closest('.slip-col');
      if (!slipCol) return;
      
      slipCol.querySelectorAll('.icon-btn:not(.is-checked)').forEach(ib => {
        ib.classList.add('is-checked');
        ib.setAttribute('aria-checked', 'true');
      });

      // 隱藏所有單品行與卡片項目
      slipCol.querySelectorAll('.slip__item-row').forEach(row => {
        row.classList.add('is-hidden');
      });
      slipCol.querySelectorAll('.slip__order-item').forEach(item => {
        item.classList.add('is-hidden');
      });

      slipCol.classList.add('is-hidden');
      syncSlipPages();
    });
  });

  // 3. 手勢分流處理
  const scrollChild = slipColEl.querySelector('.slip__scroll');
  const track = document.querySelector('.slips-track');
  if (scrollChild && track) {
    setupSingleSlipTouchFlow(scrollChild, track);
  }
}

function initTestAddCombo() {
  const addBtn = document.getElementById('add-combo-btn');
  const track = document.querySelector('.slips-track');
  if (!addBtn || !track) return;

  addBtn.addEventListener('click', () => {
    testOrderCounter++;
    testSeatCounter = (testSeatCounter % 12) + 1;
    const orderNum = String(testOrderCounter).padStart(4, '0');
    const seatNum = testSeatCounter;

    const newCol = document.createElement('div');
    newCol.className = 'slip-col';
    newCol.innerHTML = `
      <article class="slip slip--normal h-100" aria-label="訂單 ${orderNum} - 1. 內用">
        <div class="slip__bar" aria-hidden="true"></div>
        <div class="slip__body">
          <!-- 表頭 -->
          <header class="slip__head">
            <div class="slip__head-row">
              <div class="slip__head-left">
                <span class="slip__service-type">1. 內用</span>
                <span class="slip__order-num">${orderNum}</span>
              </div>
              <div class="slip__head-right">
                <div class="wait-time wait-time--normal" data-minutes="0" aria-label="等待 0 分鐘">
                  <span class="wait-time__hourglass" aria-hidden="true">
                    <svg viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
                      <path d="M36.0005 4.56152C36.7956 4.56177 37.439 5.20584 37.439 6.00098C37.4388 6.79594 36.7954 7.43921 36.0005 7.43945H34.9536C34.9398 7.58697 34.9267 7.74492 34.9077 7.91113C34.7767 9.05711 34.5156 10.6441 33.9917 12.4111C33.7653 13.1731 32.9628 13.6067 32.2007 13.3809C31.4385 13.1548 31.0023 12.3531 31.228 11.5908C31.6941 10.0185 31.9299 8.60384 32.0464 7.58496C32.052 7.53558 32.055 7.4869 32.0601 7.43945H15.9399C15.9811 7.82184 16.038 8.26831 16.1206 8.76367C16.4049 10.4694 16.972 12.7212 18.0894 14.9561C18.5999 15.9772 19.542 17.2101 20.7983 18.6143C21.7589 19.6878 22.8543 20.8108 23.9976 21.9609C26.153 19.7934 28.1128 17.7556 29.2944 15.9971C29.738 15.3373 30.6335 15.1621 31.2935 15.6055C31.9533 16.0491 32.1285 16.9445 31.6851 17.6045C30.3519 19.5884 28.2012 21.8222 26.0327 24.001C27.1911 25.1644 28.337 26.3348 29.3481 27.4648C30.6414 28.9103 31.7994 30.3772 32.4888 31.7559C33.7713 34.321 34.4045 36.8694 34.7202 38.7637C34.8354 39.4545 34.9026 40.0642 34.9497 40.5615H36.0005C36.7956 40.5618 37.439 42.001C37.439 42.001C37.4388 42.7959 36.7954 43.4392 36.0005 43.4395H12.0005C11.2053 43.4395 10.5612 42.7961 10.561 42.001C10.561 41.2057 11.2052 40.5615 12.0005 40.5615H13.0444C13.0916 40.0641 13.1646 39.4548 13.2798 38.7637C13.5955 36.8694 14.2287 34.321 15.5112 31.7559C16.1471 30.4843 17.1796 29.1433 18.3403 27.8184C19.429 26.5757 20.6904 25.2806 21.9653 23.999C20.8075 22.8361 19.6625 21.6657 18.6519 20.5361C17.3585 19.0907 16.2006 17.6238 15.5112 16.2451C14.2286 13.6799 13.5955 11.1316 13.2798 9.2373C13.1646 8.54643 13.0974 7.93682 13.0503 7.43945H12.0005C11.2053 7.43945 10.5612 6.79609 10.561 6.00098C10.561 5.20569 11.2052 4.56152 12.0005 4.56152H36.0005ZM24.0005 26.0381C22.7342 27.3111 21.5295 28.5478 20.5054 29.7168C19.3903 30.9896 18.5572 32.1094 18.0894 33.0449C17.3684 34.4869 16.8771 35.9364 16.5425 37.2412C18.447 35.9625 21.1612 34.5615 24.0005 34.5615C26.8395 34.5617 29.5523 35.9635 31.4565 37.2422C31.1219 35.9372 30.6318 34.4872 29.9106 33.0449C29.4 32.0238 28.458 30.7909 27.2017 29.3867C26.2406 28.3126 25.1445 27.1889 24.0005 26.0381Z"/>
                    </svg>
                  </span>
                  <span class="wait-time__text">0分</span>
                </div>
              </div>
            </div>
            <div class="slip__head-row">
              <div class="slip__head-left">
                <span class="slip__seat-tag">2F-${seatNum}</span>
              </div>
            </div>
          </header>

          <!-- 備註 -->
          <div class="slip__note is-open">
            <button type="button" class="slip__note-btn"
                    data-bs-toggle="collapse"
                    data-bs-target="#note-slip-${orderNum}"
                    aria-expanded="true"
                    aria-controls="note-slip-${orderNum}">
              <span class="note-label">備註</span>
              <span class="note-chevron" aria-hidden="true">
                <svg viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
                  <polyline points="8,14 18,24 28,14" stroke="white" stroke-width="3" fill="none" stroke-linecap="round"/>
                </svg>
              </span>
            </button>
            <div class="slip__note-content collapse show" id="note-slip-${orderNum}">
              茄香烤雞腿全熟，巧克力千層不要冰淇淋。
            </div>
          </div>

          <!-- 捲動品項區 -->
          <div class="slip__scroll" role="list" aria-label="訂單品項">
            <div class="slip__scroll-content">
              <!-- 套餐主列與子品項 -->
              <div class="slip__order-item" role="listitem">
                <div class="slip__combo-head">
                  <div class="slip__combo-name-row">
                    <span class="combo-qty">1x</span>
                    <span class="combo-name">義大利麵套餐</span>
                  </div>
                  <div class="slip__combo-note-row">
                    <span class="combo-note-label">套餐備註</span>
                    <span class="combo-note-text">主餐醬少、飲料去冰</span>
                  </div>
                </div>
                <!-- 子品項 1：茄香烤雞腿 -->
                <div class="slip__item-row">
                  <div class="slip__item-content slip__item-content--sub">
                    <div class="slip__qty slip__qty--default" aria-label="數量 1">1</div>
                    <div class="slip__item-info">
                      <p class="slip__item-name">茄香烤雞腿</p>
                      <p class="slip__item-option">- 醬多</p>
                      <p class="slip__item-option">* 備註：全熟</p>
                    </div>
                    <button type="button" class="icon-btn" aria-label="標記完成：茄香烤雞腿" aria-checked="false">
                      <span class="icon-btn__icon icon-btn__icon--cross" aria-hidden="true">
                        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                          <line x1="10" y1="10" x2="40" y2="40" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
                          <line x1="40" y1="10" x2="10" y2="40" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
                        </svg>
                      </span>
                      <span class="icon-btn__icon icon-btn__icon--check" aria-hidden="true">
                        <svg viewBox="0 0 50 46" xmlns="http://www.w3.org/2000/svg">
                          <polyline points="5,24 18,38 45,8" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
                <!-- 子品項 2：巧克力千層 -->
                <div class="slip__item-row">
                  <div class="slip__item-content slip__item-content--sub">
                    <div class="slip__qty slip__qty--default" aria-label="數量 1">1</div>
                    <div class="slip__item-info">
                      <p class="slip__item-name">巧克力千層</p>
                      <p class="slip__item-option">- 醬多</p>
                      <p class="slip__item-option">* 備註：不要冰淇淋</p>
                    </div>
                    <button type="button" class="icon-btn" aria-label="標記完成：巧克力千層" aria-checked="false">
                      <span class="icon-btn__icon icon-btn__icon--cross" aria-hidden="true">
                        <svg viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                          <line x1="10" y1="10" x2="40" y2="40" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
                          <line x1="40" y1="10" x2="10" y2="40" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
                        </svg>
                      </span>
                      <span class="icon-btn__icon icon-btn__icon--check" aria-hidden="true">
                        <svg viewBox="0 0 50 46" xmlns="http://www.w3.org/2000/svg">
                          <polyline points="5,24 18,38 45,8" stroke="currentColor" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <!-- 全部完成按鈕 -->
              <div class="slip__order-complete" role="button">
                <button type="button" class="slip__complete-btn" aria-label="全部完成，共 1 項">
                  <span class="complete-icon" aria-hidden="true">
                    <img src="assets/icons/icon-check-list.svg" alt="" width="25" height="23" />
                  </span>
                  <span class="complete-text">全部完成 1</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>
    `;

    track.appendChild(newCol);
    bindSlipListeners(newCol);
    syncSlipPages();
    track.scrollTo({ left: track.scrollWidth, behavior: 'smooth' });
  });
}

// ─────────────────────────────────────────
// 初始化入口
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  initWaitTimes();
  initIconButtons();
  initCompleteButtons();
  syncSlipPages();
  initRemoveButtons();
  initCarouselDots();   // BS5 Carousel dot 同步
  initStationTabs();
  initSectionTabs();
  initOrderViewToggle();
  initPauseOrder();
  initSlipScrollTouchFlow();
  initTestAddCombo();
});
