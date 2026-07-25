// 导出：完整 HTML / 仅 CSS / 项目 JSON，支持复制与下载
const Exporter = (() => {
  let mode = 'html';

  const overlay = () => document.getElementById('exportOverlay');
  const codeEl = () => document.getElementById('exportCode');

  function open(){
    render();
    overlay().classList.remove('hidden');
  }
  function close(){ overlay().classList.add('hidden'); }

  function currentCode(){
    const s = Store.getState();
    if(mode === 'html') return Compile.compileFull();
    if(mode === 'css') return Compile.compileCssOnly();
    if(mode === 'js') return Compile.compileJsOnly();
    return JSON.stringify(s, null, 2);
  }
  function fileName(){
    const name = (Store.getState().meta.name || '未命名项目').replace(/[\\/:*?"<>|]/g,'_');
    if(mode === 'html') return name + '.html';
    if(mode === 'css') return name + '.css';
    if(mode === 'js') return name + '.js';
    return name + '.json';
  }

  function render(){
    codeEl().textContent = currentCode();
    document.querySelectorAll('.export-tabs .tab').forEach(t => {
      t.classList.toggle('active', t.dataset.exp === mode);
    });
  }

  function copy(){
    const text = currentCode();
    navigator.clipboard.writeText(text).then(()=>{}, ()=>{
      // 后备
      const ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta); ta.select();
      try{ document.execCommand('copy'); }catch(e){}
      ta.remove();
    });
    const btn = document.getElementById('exportCopy');
    const old = btn.textContent; btn.textContent = '已复制';
    setTimeout(()=>btn.textContent = old, 1200);
  }

  function download(){
    const text = currentCode();
    const blob = new Blob([text], {type: 'text/plain;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName();
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  function init(){
    document.getElementById('exportClose').addEventListener('click', close);
    document.getElementById('exportCopy').addEventListener('click', copy);
    document.getElementById('exportDownload').addEventListener('click', download);
    document.querySelectorAll('.export-tabs .tab').forEach(t => {
      t.addEventListener('click', () => { mode = t.dataset.exp; render(); });
    });
    overlay().addEventListener('click', e => { if(e.target === overlay()) close(); });
  }

  return { open, close, init };
})();
