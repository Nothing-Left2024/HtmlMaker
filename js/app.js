// 主入口：接线、事件、页面切换、快捷键
(() => {
  let activePage = 'html';
  let clipboard = null;

  function $(id){ return document.getElementById(id); }

  // 结构变化 → 重渲染工作区 + 预览 + CSS/JS（palette 只在初始化与搜索时渲染）
  function onChange(){
    Engine.renderWorkspace($('workspaceHtml'), 'html');
    Engine.renderWorkspace($('workspaceCss'), 'css');
    Engine.renderWorkspace($('workspaceJs'), 'js');
    Preview.schedule();
    CssPage.refresh();
    JsPage.refresh();
    updateUndoRedo();
  }
  // 软变化（文本/选择器值/页面标题/JS 参数编辑）→ 仅刷新预览与 CSS/JS 代码
  function softUpdate(){
    Preview.schedule();
    CssPage.refresh();
    JsPage.refresh();
    // 页面标题输入框在工作区外，不会被重渲染影响
  }

  function switchPage(page){
    activePage = page;
    document.querySelectorAll('.page-switch .tab').forEach(t => t.classList.toggle('active', t.dataset.page === page));
    $('page-html').classList.toggle('active', page === 'html');
    $('page-css').classList.toggle('active', page === 'css');
    $('page-js').classList.toggle('active', page === 'js');
  }

  function updateUndoRedo(){
    $('btnUndo').disabled = !Store.canUndo();
    $('btnRedo').disabled = !Store.canRedo();
    $('btnUndo').style.opacity = Store.canUndo() ? '1' : '.4';
    $('btnRedo').style.opacity = Store.canRedo() ? '1' : '.4';
  }

  function init(){
    Props.init();
    Exporter.init();
    Preview.init();

    // 调色板只渲染一次（搜索框自身负责后续刷新）
    Engine.renderPalette($('paletteHtml'), Blocks.htmlCategories, 'html');
    Engine.renderPalette($('paletteCss'), Blocks.cssCategories, 'css');
    Engine.renderPalette($('paletteJs'), Blocks.jsCategories, 'js');

    Store.load();
    Store.subscribe(onChange);
    Store.subscribeSoft(softUpdate);

    // 页面标题输入
    const titleInput = $('pageTitleInput');
    titleInput.value = Store.getState().meta.name || '';
    titleInput.addEventListener('input', () => Store.setPageTitle(titleInput.value));

    // 顶栏
    document.querySelectorAll('.page-switch .tab').forEach(t => t.addEventListener('click', () => switchPage(t.dataset.page)));
    $('btnUndo').addEventListener('click', () => Store.undo());
    $('btnRedo').addEventListener('click', () => Store.redo());
    $('btnExport').addEventListener('click', () => Exporter.open());
    $('btnCopyHtml').addEventListener('click', () => copyText(Compile.compileFull(), $('btnCopyHtml')));
    $('btnCopyJs').addEventListener('click', () => copyText(Compile.compileJsOnly(), $('btnCopyJs')));
    $('btnPreviewToggle').addEventListener('click', () => Preview.togglePreview());
    $('btnAbout').addEventListener('click', () => openAbout());
    $('aboutClose').addEventListener('click', () => closeAbout());
    $('aboutOverlay').addEventListener('click', e => { if(e.target === $('aboutOverlay')) closeAbout(); });

    // 主题切换
    const themeBtn = $('btnTheme');
    function applyTheme(dark){
      document.body.classList.toggle('dark', dark);
      themeBtn.textContent = dark ? '浅色' : '深色';
      try{ localStorage.setItem('htmlmaker_theme', dark ? 'dark' : 'light'); }catch(e){}
    }
    let initDark = false;
    try{ initDark = localStorage.getItem('htmlmaker_theme') === 'dark'; }catch(e){}
    applyTheme(initDark);
    themeBtn.addEventListener('click', () => applyTheme(!document.body.classList.contains('dark')));

    // 调色板积木悬浮提示（仅左侧调色板区域）
    initPaletteTooltip();

    // 监听右键菜单的复制事件
    document.addEventListener('htmlmaker:copy', e => {
      const { id, page } = e.detail;
      const r = Store.findBlockAny(id);
      if(r) clipboard = Store.cloneBlock(r.block);
    });

    // 剪贴板内容查询（供 Props.openWorkspace 判断粘贴按钮是否可用）
    document.addEventListener('htmlmaker:clipboard-query', e => {
      if(e.detail && typeof e.detail.result === 'function') e.detail.result(!!clipboard);
    });

    // 工作区右键菜单的粘贴操作
    document.addEventListener('htmlmaker:paste', e => {
      if(!clipboard) return;
      const page = (e.detail && e.detail.page) || activePage;
      const copy = Store.cloneBlock(clipboard);
      const newId = Store.pasteBlock(copy, null, page);
      if(newId && page === activePage) Engine.setSelected(newId);
    });

    // 全局右键：拦截浏览器默认菜单，工作区空白处显示自定义菜单
    document.addEventListener('contextmenu', e => {
      // 在积木上：积木自己的 contextmenu 处理器已 open + preventDefault，这里跳过
      if(e.target.closest('.block')) return;
      // 在工作区空白处：显示通用菜单
      const ws = e.target.closest('.workspace');
      if(ws){
        e.preventDefault();
        const page = ws.id === 'workspaceHtml' ? 'html' : (ws.id === 'workspaceCss' ? 'css' : 'js');
        Props.openWorkspace(page, e.clientX, e.clientY);
        return;
      }
      // 其他位置（顶栏/调色板/预览区/弹层等）：仅阻止浏览器默认菜单
      e.preventDefault();
    });

    // 快捷键
    document.addEventListener('keydown', e => {
      if(e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if((e.ctrlKey || e.metaKey) && e.key === 'z'){ e.preventDefault(); Store.undo(); }
      else if((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))){ e.preventDefault(); Store.redo(); }
      else if((e.ctrlKey || e.metaKey) && e.key === 's'){ e.preventDefault(); Store.save(); }
      else if((e.ctrlKey || e.metaKey) && e.key === 'c'){
        const id = Engine.getSelected();
        if(id){
          e.preventDefault();
          const r = Store.findBlockAny(id);
          if(r) clipboard = Store.cloneBlock(r.block);
        }
      }
      else if((e.ctrlKey || e.metaKey) && e.key === 'v'){
        if(clipboard){
          e.preventDefault();
          const copy = Store.cloneBlock(clipboard);
          let parentId = null;
          const selId = Engine.getSelected();
            if(selId){
              const r = Store.findBlockAny(selId);
              const sd = r && Blocks.get(r.block.def);
              if(sd && (sd.type === 'tag' || sd.type === 'selector' || sd.type === 'js')) parentId = selId;
            }
          const newId = Store.pasteBlock(copy, parentId, activePage);
          if(newId) Engine.setSelected(newId);
        }
      }
      else if((e.ctrlKey || e.metaKey) && e.key === 'd'){
        const id = Engine.getSelected();
        if(id){ e.preventDefault(); const newId = Store.duplicateBlock(id, activePage); if(newId) Engine.setSelected(newId); }
      }
      else if(e.key === 'Delete' && Engine.getSelected()){
        Store.deleteBlock(Engine.getSelected(), activePage);
      }
      else if(e.key === 'Escape'){
        Props.close();
      }
    });

    // 离开前保存
    window.addEventListener('beforeunload', () => Store.save());

    // 点击工作区空白处取消选中
    document.addEventListener('pointerdown', e => {
      if(e.target.closest('.block') || e.target.closest('#ctxBackdrop') || e.target.closest('.palette') || e.target.closest('#topbar') || e.target.closest('.ws-toolbar')) return;
      Engine.clearSelected();
    });

    // 初始渲染
    onChange();
  }

  // ===== 关于模态框 =====
  function openAbout(){
    const iconEl = $('aboutIcon');
    if(iconEl){
      iconEl.innerHTML = '';
      const img = document.createElement('img');
      img.src = 'src/img/html5icon.png';
      img.alt = 'HtmlMaker';
      img.style.width = '64px';
      img.style.height = '64px';
      img.style.objectFit = 'contain';
      iconEl.appendChild(img);
    }
    $('aboutOverlay').classList.remove('hidden');
  }
  function closeAbout(){
    $('aboutOverlay').classList.add('hidden');
  }

  // ===== 调色板积木悬浮提示 =====
  // 根据积木定义生成描述文字
  function describeBlock(def){
    if(!def) return '';
    let desc = def.desc;
    if(!desc){
      if(def.type === 'tag'){
        desc = '<' + def.tag + '> 标签' + (def.canHaveChildren === false ? '（自闭合，无子元素）' : '，可嵌套子标签或属性');
      } else if(def.type === 'selector'){
        const kind = def.selectorKind === 'tag' ? '标签选择器' : (def.selectorKind === 'group' ? '类选择器（.class）' : 'ID 选择器（#id）');
        desc = kind + '，拖入工作区后下方可放样式属性积木';
      } else if(def.type === 'property'){
        desc = '样式属性积木：拖入选择器内，设置 ' + def.propKey;
      } else if(def.type === 'js'){
        if(def.jsType === 'event') desc = '事件起点，必须放在顶层（不能嵌套）';
        else if(def.canHaveChildren === false) desc = '单行语句，参数在积木内输入';
        else desc = '代码块，可嵌套子语句，参数在积木内输入';
      } else {
        desc = def.label;
      }
    }
    return def.label + ' — ' + desc;
  }
  // 绑定调色板悬浮提示（事件委托，对 .pal-item 和 .cat-rail-btn 生效）
  function initPaletteTooltip(){
    const tip = $('blockTip');
    if(!tip) return;
    let tipTimer = null;
    let currentTarget = null;       // 记录当前触发提示的元素，避免在同一元素内重复触发

    // 从触发元素提取提示文字：优先 data-tip-text，否则从积木定义生成
    function getTipText(item){
      if(item.dataset.tipText) return item.dataset.tipText;
      const defId = item.dataset.defId;
      const def = defId && Blocks.get(defId);
      return def ? describeBlock(def) : '';
    }

    document.addEventListener('mouseover', e => {
      const item = e.target.closest && (e.target.closest('.pal-item') || e.target.closest('.cat-rail-btn'));
      if(!item) return;
      if(item === currentTarget) return;              // 同一元素不重复触发
      currentTarget = item;
      const text = getTipText(item);
      if(!text) return;
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => {
        tip.textContent = text;
        tip.classList.remove('hidden');
        positionTip(e.clientX, e.clientY);
      }, 300);
    });
    document.addEventListener('mousemove', e => {
      if(tip.classList.contains('hidden')) return;
      positionTip(e.clientX, e.clientY);
    });
    document.addEventListener('mouseout', e => {
      const item = e.target.closest && (e.target.closest('.pal-item') || e.target.closest('.cat-rail-btn'));
      if(!item) return;
      const related = e.relatedTarget;
      // 真正离开触发元素（related 不再属于任何 pal-item/cat-rail-btn）才隐藏
      if(!related || !related.closest || (!related.closest('.pal-item') && !related.closest('.cat-rail-btn'))){
        clearTimeout(tipTimer);
        currentTarget = null;
        tip.classList.add('hidden');
      }
    });
    function positionTip(x, y){
      const offset = 14;
      let left = x + offset, top = y + offset;
      const rect = tip.getBoundingClientRect();
      if(left + rect.width > window.innerWidth - 8) left = x - rect.width - offset;
      if(top + rect.height > window.innerHeight - 8) top = y - rect.height - offset;
      tip.style.left = left + 'px';
      tip.style.top = top + 'px';
    }
  }

  function copyText(text, btn){
    if(navigator.clipboard){
      navigator.clipboard.writeText(text).then(()=>{ flashBtn(btn); }, ()=>fallbackCopy(text, btn));
    } else fallbackCopy(text, btn);
  }
  function fallbackCopy(text, btn){
    const ta = document.createElement('textarea');
    ta.value = text; document.body.appendChild(ta); ta.select();
    try{ document.execCommand('copy'); flashBtn(btn); }catch(e){}
    ta.remove();
  }
  function flashBtn(btn){
    if(!btn) return;
    const old = btn.textContent; btn.textContent = '已复制';
    setTimeout(()=>btn.textContent = old, 1200);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
