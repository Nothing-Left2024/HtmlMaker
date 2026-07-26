// 预览面板：显示生成的 HTML 代码（可切换为 iframe 渲染预览）+ 防抖刷新
const Preview = (() => {
  let timer = null;
  let el;
  let frameEl;
  let previewMode = false;

  // 注入到预览 iframe 中的拦截脚本：禁用跳转和重定向
  // - 拦截 a 标签点击、表单提交、window.open、location 赋值等
  // - 这些操作会跳出 iframe，污染父页面或导致预览失效
  const NAV_BLOCKER = `
<script>
(function(){
  // 阻止 a 标签默认跳转（保留锚点滚动行为）
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a');
    if(!a) return;
    var href = a.getAttribute('href') || '';
    // 仅阻止会触发导航的链接（含 http、//、相对路径、javascript:）
    if(/^(https?:)?\\/\\//i.test(href) || /^(\\/|\\.\\.?\\/|\\w)/i.test(href) || /^javascript:/i.test(href)){
      e.preventDefault();
    }
  }, true);
  // 阻止表单提交导致的导航
  document.addEventListener('submit', function(e){ e.preventDefault(); }, true);
  // 禁用 window.open（弹窗会脱离 iframe 控制且无意义）
  window.open = function(){ return null; };
  // 拦截 location 赋值跳转（重定向）
  try {
    var origLoc = window.location;
    var fakeLoc = { };
    ['href','assign','replace','reload','ancestorOrigins','origin','protocol','host','hostname','port','pathname','search','hash'].forEach(function(k){
      Object.defineProperty(fakeLoc, k, {
        get: function(){ return origLoc[k]; },
        set: function(){ /* 拦截跳转 */ },
        configurable: true
      });
    });
    Object.defineProperty(window, 'location', { value: fakeLoc, configurable: true });
  } catch(e) {}
})();
<\/script>`;

  function init(){
    el = document.getElementById('htmlCode');
    frameEl = document.getElementById('previewFrame');
    // 监听 iframe 即将跳转：sandbox 已禁用 top 导航，这里额外拦截同源跳转
    if(frameEl){
      frameEl.addEventListener('load', function(){
        try{
          var doc = frameEl.contentDocument;
          if(doc){
            // 同源跳转尝试 → 回滚到 srcdoc 内容
            var url = doc.location.href;
            if(url === 'about:blank' || url.indexOf('about:srcdoc') === 0) return;
          }
        }catch(e){}
      });
    }
  }
  function refresh(){
    if(!el) return;
    const code = Compile.compileFull();
    el.textContent = code;
    if(previewMode && frameEl){
      // 注入拦截脚本到 </body> 前（或末尾）
      frameEl.srcdoc = injectBlocker(code);
    }
  }
  function schedule(){
    if(timer) clearTimeout(timer);
    timer = setTimeout(refresh, 150);
  }
  // 切换代码视图 / 渲染预览
  function togglePreview(){
    previewMode = !previewMode;
    if(frameEl) frameEl.classList.toggle('hidden', !previewMode);
    if(el) el.classList.toggle('hidden', previewMode);
    if(previewMode && frameEl) frameEl.srcdoc = injectBlocker(Compile.compileFull());
    const btn = document.getElementById('btnPreviewToggle');
    if(btn) btn.textContent = previewMode ? '代码' : '预览';
  }
  // 把导航拦截脚本注入到 HTML 中
  function injectBlocker(code){
    if(code.indexOf('</body>') !== -1){
      return code.replace('</body>', NAV_BLOCKER + '</body>');
    }
    return code + NAV_BLOCKER;
  }

  return { init, refresh, schedule, togglePreview };
})();
