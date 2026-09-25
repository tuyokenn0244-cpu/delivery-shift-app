/* Loaded before app.js: failures in application startup must remain visible. */
(function () {
  'use strict';
  const lines = [];
  let latest = '', level = 'info';
  const errorText = error => error && error.message ? error.message : String(error || '原因不明のエラー');
  function render() {
    const log = document.getElementById('scanDebugLog');
    if (log) log.textContent = lines.join('\n');
    for (const id of ['readFeedback', 'scanStatus', 'rowPickerStatus', 'previewFeedback']) {
      const node = document.getElementById(id);
      if (node && latest) { node.textContent = latest; node.dataset.level = level; }
    }
    const feedback = document.getElementById('readFeedback');
    if (feedback && latest) feedback.hidden = false;
  }
  function log(message) {
    lines.push(new Date().toLocaleTimeString('ja-JP') + ' ' + message);
    if (lines.length > 120) lines.shift();
    render();
  }
  function show(message, kind = 'info') { latest = message; level = kind; log(message); }
  function fail(error) { log('ERROR: ' + errorText(error)); show('読み取りに失敗しました。' + errorText(error) + '。写真・入力内容・通信状態を確認し、再試行してください。', 'error'); }
  window.ScanFeedback = { log, show, fail, errorText };
  window.addEventListener('error', event => {
    if (event.target && event.target.tagName === 'SCRIPT') {
      fail(new Error('必要なスクリプトを読み込めません: ' + event.target.src.split('/').pop()));
    } else if (event.message) fail(event.error || event.message);
  }, true);
  window.addEventListener('unhandledrejection', event => fail(event.reason));
  // A touch can lose its compatibility click when an input blurs/layout shifts.
  // Handle a stationary pointer release, then consume its compatibility click.
  let touchStart = null, lastTouch = null;
  const readButton = target => target && target.closest && target.closest('#runManualRead');
  function activate(button, source) {
    if (!button || button.disabled) return;
    log('読み取りボタン：押下検知 (' + source + ')');
    show('読み取り中…');
    try {
      if (typeof window.startShiftRead !== 'function') throw new Error('アプリの準備が完了していません。再読み込みしてください');
      Promise.resolve(window.startShiftRead()).catch(fail);
    } catch (error) { fail(error); }
  }
  function startTouch(event, point) {
    const button = readButton(event.target);
    touchStart = button && !button.disabled ? {button, x: point.clientX, y: point.clientY} : null;
  }
  function endTouch(event, point) {
    const start = touchStart; touchStart = null;
    if (!start || start.button.disabled || Math.hypot(point.clientX-start.x, point.clientY-start.y)>12) return;
    const bounds = start.button.getBoundingClientRect();
    if (point.clientX<bounds.left || point.clientX>bounds.right || point.clientY<bounds.top || point.clientY>bounds.bottom) return;
    if (event.cancelable) event.preventDefault();
    lastTouch = {button:start.button, time:Date.now(), x:point.clientX, y:point.clientY};
    activate(start.button, event.pointerType || 'touch');
  }
  if (window.PointerEvent) {
    document.addEventListener('pointerdown', e => {if(e.isPrimary && e.button===0)startTouch(e,e)}, true);
    document.addEventListener('pointerup', e => {if(e.isPrimary && e.button===0)endTouch(e,e)}, true);
    document.addEventListener('pointercancel', () => {touchStart=null}, true);
  } else {
    document.addEventListener('touchstart', e => {if(e.touches.length===1)startTouch(e,e.touches[0]);else touchStart=null}, {capture:true,passive:true});
    document.addEventListener('touchend', e => {if(e.changedTouches.length===1)endTouch(e,e.changedTouches[0])}, {capture:true,passive:false});
    document.addEventListener('touchcancel', () => {touchStart=null}, true);
  }
  document.addEventListener('click', event => {
    // A compatibility click may land on a different control after layout changes.
    if (lastTouch && event.detail!==0 && Date.now()-lastTouch.time<800 && Math.hypot(event.clientX-lastTouch.x,event.clientY-lastTouch.y)<32) {
      event.preventDefault(); event.stopImmediatePropagation(); lastTouch=null; return;
    }
    const button = readButton(event.target);
    if (!button || button.disabled) return;
    event.preventDefault();
    if (lastTouch && lastTouch.button===button && event.detail!==0 && Date.now()-lastTouch.time<800) return;
    activate(button, 'click');
  }, true);
  document.addEventListener('DOMContentLoaded', () => { log('画面：準備完了 / v13'); render(); });
})();
