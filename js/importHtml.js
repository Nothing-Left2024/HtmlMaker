// HTML 导入解析器：将上传的 HTML 文件转换成积木树
// - <body> 下的标签 → HTML 页积木（递归嵌套）
// - 标签的 style 属性 → 该积木的 styles 对象
// - <style> 标签内容 → CSS 页积木（选择器 + 样式属性子积木）
// - <title> → meta.name
// - class/id 属性 → props.group / props.name
// - 其他属性（href/src/alt 等）→ props.extra
const ImportHtml = (() => {

  // CSS 属性名 → camelKey 映射（与 compile.js 的 STYLE_MAP 对应）
  const CSS_PROP_MAP = {
    'width':'width', 'height':'height', 'color':'color',
    'background':'background', 'background-color':'background',
    'font-size':'fontSize', 'margin':'margin', 'padding':'padding',
    'opacity':'opacity', 'border':'border', 'border-radius':'radius',
    'display':'display', 'position':'position'
  };
  // size 类型的 key（需解析成 {value, unit} 结构）
  const SIZE_KEYS = ['width','height','fontSize','margin','padding','radius'];
  // 跳过的标签（不转成积木）
  const SKIP_TAGS = ['script','style','head','meta','link','title','base','noscript'];

  // 从 tag 名找积木定义
  function findTagDef(tag){
    return Blocks.tagDefs.find(d => d.tag === tag);
  }

  // 解析尺寸值："14px" → {value:'14', unit:'px'}，"auto" → {value:'auto', unit:'px'}
  function parseSizeValue(val){
    const m = val.match(/^(-?[\d.]+)\s*(px|em|rem|%|vw|vh)?$/);
    if(m) return { value:m[1], unit:m[2] || 'px' };
    return { value:val, unit:'' };
  }

  // 将一条 CSS 声明应用到 styles 对象
  function applyStyle(styles, cssProp, val){
    const camelKey = CSS_PROP_MAP[cssProp];
    if(!camelKey) return false;
    if(SIZE_KEYS.indexOf(camelKey) >= 0){
      styles[camelKey] = parseSizeValue(val);
    } else {
      styles[camelKey] = val;
    }
    return true;
  }

  // 解析内联 style 属性 → block.styles
  function parseInlineStyle(styleStr, block){
    if(!styleStr) return;
    styleStr.split(';').forEach(decl => {
      const idx = decl.indexOf(':');
      if(idx < 0) return;
      const prop = decl.slice(0, idx).trim().toLowerCase();
      const val = decl.slice(idx + 1).trim();
      if(prop && val) applyStyle(block.styles, prop, val);
    });
  }

  // 解析标签属性 → block.props
  function parseAttributes(el, block){
    const def = Blocks.get(block.def);
    // class → group，id → name
    const cls = el.getAttribute('class');
    if(cls) block.props.group = cls;
    const id = el.getAttribute('id');
    if(id) block.props.name = id;
    // extraAttrs 定义的可编辑属性
    if(def && def.extraAttrs){
      def.extraAttrs.forEach(attr => {
        const val = el.getAttribute(attr.name);
        if(val != null && val !== '') block.props.extra[attr.name] = val;
      });
    }
  }

  // 获取直接文本子节点内容（不包含子元素的文本）
  function getDirectText(el){
    let text = '';
    el.childNodes.forEach(n => {
      if(n.nodeType === Node.TEXT_NODE) text += n.textContent;
    });
    return text;
  }

  // 递归遍历 DOM 节点 → 积木树
  function walkDom(node, parentBlocks){
    node.childNodes.forEach(child => {
      if(child.nodeType !== Node.ELEMENT_NODE) return;
      const tag = child.tagName.toLowerCase();
      if(SKIP_TAGS.indexOf(tag) >= 0) return;

      const def = findTagDef(tag);
      if(!def) return; // 未知标签跳过

      const block = Store.createBlock(def);
      parseAttributes(child, block);
      parseInlineStyle(child.getAttribute('style') || '', block);

      // 文本内容（仅可直接编辑文本的标签）
      if(Blocks.isTextTag(tag)){
        block.text = getDirectText(child);
      }

      // 递归子元素
      if(block.children){
        walkDom(child, block.children);
      }
      parentBlocks.push(block);
    });
  }

  // 解析 CSS 文本 → CSS 页积木列表（选择器 + 样式属性子积木）
  function parseCss(cssText){
    const blocks = [];
    if(!cssText) return blocks;
    // 移除注释
    cssText = cssText.replace(/\/\*[\s\S]*?\*\//g, '');
    // 匹配 selector { declarations }
    const ruleRe = /([^{}]+)\{([^{}]*)\}/g;
    let match;
    while((match = ruleRe.exec(cssText)) !== null){
      const selectorStr = match[1].trim();
      const body = match[2].trim();
      if(!selectorStr || !body) continue;

      // 判断选择器类型（仅处理简单选择器：.class / #id / tag）
      let kind, value;
      if(selectorStr.charAt(0) === '.'){
        kind = 'group';
        value = selectorStr.slice(1).split(/[\s,>+~:]/)[0];
      } else if(selectorStr.charAt(0) === '#'){
        kind = 'name';
        value = selectorStr.slice(1).split(/[\s,>+~:]/)[0];
      } else {
        kind = 'tag';
        value = selectorStr.split(/[\s,>+~:]/)[0];
      }
      if(!value) continue;

      const selDef = Blocks.selectorDefs.find(d => d.selectorKind === kind);
      if(!selDef) continue;
      const selBlock = Store.createBlock(selDef);
      selBlock.selectorValue = value;

      // 解析声明块
      body.split(';').forEach(decl => {
        const idx = decl.indexOf(':');
        if(idx < 0) return;
        const prop = decl.slice(0, idx).trim().toLowerCase();
        const val = decl.slice(idx + 1).trim();
        if(!prop || !val) return;
        const camelKey = CSS_PROP_MAP[prop];
        if(!camelKey) return;
        const propDef = Blocks.stylePropDefs.find(d => d.propKey === camelKey);
        if(!propDef) return;
        const propBlock = Store.createBlock(propDef);
        propBlock.text = val;
        selBlock.children.push(propBlock);
      });

      blocks.push(selBlock);
    }
    return blocks;
  }

  // 主入口：解析 HTML 字符串 → { html, css, js, title }
  function parse(htmlString){
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlString, 'text/html');

    // 提取 <title>
    let title = '';
    const titleEl = doc.querySelector('title');
    if(titleEl) title = titleEl.textContent.trim();

    // 提取所有 <style> 内容 → CSS 积木
    let cssBlocks = [];
    doc.querySelectorAll('style').forEach(styleEl => {
      cssBlocks = cssBlocks.concat(parseCss(styleEl.textContent));
    });

    // 提取 <body> 子元素 → HTML 积木（body 不存在时回退到 documentElement）
    const htmlBlocks = [];
    walkDom(doc.body || doc.documentElement, htmlBlocks);

    // 提取所有 <script> 内容 → JS 积木（跳过 src 引用的外部脚本）
    let jsBlocks = [];
    doc.querySelectorAll('script').forEach(scriptEl => {
      // 外部脚本（有 src）无法读取内容，跳过
      if(scriptEl.getAttribute('src')) return;
      const code = scriptEl.textContent;
      if(code && code.trim()){
        jsBlocks = jsBlocks.concat(parseJs(code));
      }
    });

    return { html: htmlBlocks, css: cssBlocks, js: jsBlocks, title };
  }

  // ===== JS 解析器（简化版：基于正则 + 花括号配对） =====
  // 识别常见模式：事件监听、变量声明、赋值、console.log、alert、DOM 操作、if/for/while/function

  // 从 openIndex（指向 '{'）开始找匹配的 '}'，返回 { end, inner }
  function extractBlock(code, openIndex){
    let depth = 1;
    let i = openIndex + 1;
    while(i < code.length && depth > 0){
      const ch = code[i];
      if(ch === '{') depth++;
      else if(ch === '}') depth--;
      else if(ch === '"' || ch === "'" || ch === '`'){
        const quote = ch;
        i++;
        while(i < code.length && code[i] !== quote){
          if(code[i] === '\\') i++;
          i++;
        }
      }
      i++;
    }
    return { end: i, inner: code.slice(openIndex + 1, i - 1) };
  }

  // 把代码体按语句分割（考虑花括号块、字符串、分号）
  // 块语句（if/for/while/function）作为整体保留，附带其条件和关键字
  function splitStatements(code){
    const stmts = [];
    let i = 0;
    let start = 0;
    while(i < code.length){
      const ch = code[i];
      if(ch === '{'){
        // 跳过整个花括号块（属于前面的关键字 if/for/while/function 等）
        const block = extractBlock(code, i);
        i = block.end;
      } else if(ch === '"' || ch === "'" || ch === '`'){
        const quote = ch;
        i++;
        while(i < code.length && code[i] !== quote){
          if(code[i] === '\\') i++;
          i++;
        }
        i++;
      } else if(ch === ';'){
        const stmt = code.slice(start, i + 1).trim();
        if(stmt) stmts.push(stmt);
        start = i + 1;
        i++;
      } else {
        i++;
      }
    }
    // 处理末尾无分号的语句（可能是块语句）
    const rest = code.slice(start).trim();
    if(rest) stmts.push(rest);
    return stmts;
  }

  // 创建 JS 积木实例（带默认 args）
  function makeJsBlock(defId, args){
    const def = Blocks.jsDefs.find(d => d.id === defId);
    if(!def) return null;
    const block = Store.createBlock(def);
    block.args = args || {};
    return block;
  }

  // 解析事件监听器：返回 event 积木（含子语句）
  // 匹配：window.addEventListener('load', fn) 或 document.querySelector('sel').addEventListener('click'|'input', fn)
  function parseEventListener(code){
    const blocks = [];
    // window.addEventListener('load', ...)
    const winRe = /window\s*\.\s*addEventListener\s*\(\s*['"]load['"]\s*,\s*/g;
    let m;
    while((m = winRe.exec(code)) !== null){
      // 找到回调函数体的花括号
      let i = m.index + m[0].length;
      // 跳过空白和可能的 function/async () =>
      while(i < code.length && /\s/.test(code[i])) i++;
      // 跳过 "function" 或 "async" 关键字
      const funcPrefix = code.slice(i).match(/^(async\s+)?function\s*\([^)]*\)\s*/);
      const arrowPrefix = code.slice(i).match(/^(async\s*)?\([^)]*\)\s*=>\s*/);
      if(funcPrefix){ i += funcPrefix[0].length; }
      else if(arrowPrefix){ i += arrowPrefix[0].length; }
      if(code[i] !== '{') continue;
      const block = extractBlock(code, i);
      const blockEl = makeJsBlock('jsOnLoad', {});
      if(blockEl){
        blockEl.children = parseStatements(block.inner);
        blocks.push(blockEl);
      }
      winRe.lastIndex = block.end;
    }
    // document.querySelector('sel').addEventListener('click'|'input', ...)
    const qsaRe = /document\s*\.\s*querySelector\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*addEventListener\s*\(\s*(['"])(click|input)\4\s*,\s*/g;
    while((m = qsaRe.exec(code)) !== null){
      const selector = m[2];
      const evtType = m[4];
      let i = m.index + m[0].length;
      while(i < code.length && /\s/.test(code[i])) i++;
      const funcPrefix = code.slice(i).match(/^(async\s+)?function\s*\([^)]*\)\s*/);
      const arrowPrefix = code.slice(i).match(/^(async\s*)?\([^)]*\)\s*=>\s*/);
      if(funcPrefix){ i += funcPrefix[0].length; }
      else if(arrowPrefix){ i += arrowPrefix[0].length; }
      if(code[i] !== '{') continue;
      const block = extractBlock(code, i);
      const defId = evtType === 'click' ? 'jsOnClick' : 'jsOnInput';
      const blockEl = makeJsBlock(defId, { selector: selector });
      if(blockEl){
        blockEl.children = parseStatements(block.inner);
        blocks.push(blockEl);
      }
      qsaRe.lastIndex = block.end;
    }
    return blocks;
  }

  // 解析语句列表 → JS 积木列表（递归处理块语句）
  function parseStatements(code){
    const blocks = [];
    const stmts = splitStatements(code);
    stmts.forEach(stmt => {
      const block = parseSingleStatement(stmt);
      if(block) blocks.push(block);
    });
    return blocks;
  }

  // 解析单条语句 → JS 积木（识别常见模式）
  function parseSingleStatement(stmt){
    stmt = stmt.trim();
    if(!stmt) return null;

    // ----- 块语句：if / for / while / function -----
    // if (cond) { ... }
    let m = stmt.match(/^if\s*\(([\s\S]+)\)\s*\{([\s\S]*)\}\s*$/);
    if(m){
      const block = makeJsBlock('jsIf', { cond: m[1].trim() });
      if(block) block.children = parseStatements(m[2]);
      return block;
    }
    // if (cond) { ... } else { ... }
    m = stmt.match(/^if\s*\(([\s\S]+)\)\s*\{([\s\S]*?)\}\s*else\s*\{([\s\S]*)\}\s*$/);
    if(m){
      const block = makeJsBlock('jsIfElse', { cond: m[1].trim() });
      if(block){
        // jsIfElse 支持两个子块：第一个 children，第二个用 elseChildren
        // 现有积木系统用 children 数组，jsIfElse 编译时需要区分——查看 compile.js 实现
        // 简化处理：把 if 体放 children，else 体也追加（编译器按顺序处理）
        block.children = parseStatements(m[2]).concat(parseStatements(m[3]));
      }
      return block;
    }
    // for (init; cond; update) { ... }
    m = stmt.match(/^for\s*\(([^;]*);([^;]*);([^)]*)\)\s*\{([\s\S]*)\}\s*$/);
    if(m){
      // jsFor 是"循环 N 次"，用 cond 作为 times，init 提取变量名
      const varMatch = m[1].match(/(?:let|var|const)\s+(\w+)/);
      const block = makeJsBlock('jsFor', {
        times: m[2].trim(),
        var: varMatch ? varMatch[1] : 'i'
      });
      if(block) block.children = parseStatements(m[4]);
      return block;
    }
    // while (cond) { ... }
    m = stmt.match(/^while\s*\(([\s\S]+)\)\s*\{([\s\S]*)\}\s*$/);
    if(m){
      const block = makeJsBlock('jsWhile', { cond: m[1].trim() });
      if(block) block.children = parseStatements(m[2]);
      return block;
    }
    // function name(args) { ... } / async function name(args) { ... }
    m = stmt.match(/^(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{([\s\S]*)\}\s*$/);
    if(m){
      const block = makeJsBlock('jsFunc', { name: m[1], args: m[2].trim() });
      if(block) block.children = parseStatements(m[3]);
      return block;
    }

    // ----- 单行语句 -----
    // 去掉末尾分号方便匹配
    const s = stmt.replace(/;\s*$/, '');

    // let x = value / const x = value / var x = value
    m = s.match(/^(?:let|var)\s+(\w+)\s*=\s*([\s\S]+)$/);
    if(m) return makeJsBlock('jsVar', { name: m[1], value: m[2].trim() });
    m = s.match(/^const\s+(\w+)\s*=\s*([\s\S]+)$/);
    if(m) return makeJsBlock('jsConst', { name: m[1], value: m[2].trim() });

    // console.log(value)
    m = s.match(/^console\s*\.\s*log\s*\(([\s\S]*)\)$/);
    if(m) return makeJsBlock('jsLog', { value: m[1].trim() });

    // alert(value)
    m = s.match(/^alert\s*\(([\s\S]*)\)$/);
    if(m) return makeJsBlock('jsAlert', { value: m[1].trim() });

    // return value
    m = s.match(/^return\s+([\s\S]+)$/);
    if(m) return makeJsBlock('jsReturn', { value: m[1].trim() });

    // await new Promise(r => setTimeout(r, N * 1000)) → jsWait
    m = s.match(/^await\s+new\s+Promise\s*\(\s*(\w+)\s*=>\s*setTimeout\s*\(\s*\1\s*,\s*([\s\S]+?)\s*\*\s*1000\s*\)\s*\)$/);
    if(m) return makeJsBlock('jsWait', { seconds: m[2].trim() });

    // setTimeout(() => { ... }, ms) → jsTimeout（含子语句）
    m = stmt.match(/^setTimeout\s*\(\s*(?:function\s*\([^)]*\)|\([^)]*\)\s*=>)\s*\{([\s\S]*?)\}\s*,\s*([\s\S]+?)\s*\)\s*;?\s*$/);
    if(m){
      const block = makeJsBlock('jsTimeout', { ms: m[2].trim() });
      if(block) block.children = parseStatements(m[1]);
      return block;
    }

    // DOM 操作：document.querySelector('sel').textContent = value
    m = s.match(/^document\s*\.\s*querySelector\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*textContent\s*=\s*([\s\S]+)$/);
    if(m) return makeJsBlock('jsSetText', { selector: m[2], value: m[3].trim() });

    // document.querySelector('sel').innerHTML = value
    m = s.match(/^document\s*\.\s*querySelector\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*innerHTML\s*=\s*([\s\S]+)$/);
    if(m) return makeJsBlock('jsSetHtml', { selector: m[2], value: m[3].trim() });

    // document.querySelector('sel').style.prop = value
    m = s.match(/^document\s*\.\s*querySelector\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*style\.(\w+)\s*=\s*([\s\S]+)$/);
    if(m) return makeJsBlock('jsSetStyle', { selector: m[2], prop: m[3], value: m[4].trim() });

    // document.querySelector('sel').classList.add('cls')
    m = s.match(/^document\s*\.\s*querySelector\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*classList\s*\.\s*add\s*\(\s*(['"])([^'"]+)\3\s*\)$/);
    if(m) return makeJsBlock('jsAddClass', { selector: m[2], cls: m[4] });

    // document.querySelector('sel').classList.remove('cls')
    m = s.match(/^document\s*\.\s*querySelector\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*classList\s*\.\s*remove\s*\(\s*(['"])([^'"]+)\3\s*\)$/);
    if(m) return makeJsBlock('jsRemoveClass', { selector: m[2], cls: m[4] });

    // document.querySelector('sel').setAttribute('name', value)
    m = s.match(/^document\s*\.\s*querySelector\s*\(\s*(['"])([^'"]+)\1\s*\)\s*\.\s*setAttribute\s*\(\s*(['"])([^'"]+)\3\s*,\s*([\s\S]+)\)$/);
    if(m) return makeJsBlock('jsSetAttr', { selector: m[2], name: m[4], value: m[5].trim() });

    // let var = document.querySelector('sel').textContent → jsGetText
    m = s.match(/^(?:let|var|const)\s+(\w+)\s*=\s*document\s*\.\s*querySelector\s*\(\s*(['"])([^'"]+)\2\s*\)\s*\.\s*textContent$/);
    if(m) return makeJsBlock('jsGetText', { var: m[1], selector: m[3] });

    // 赋值：name = value
    m = s.match(/^(\w+)\s*=\s*([\s\S]+)$/);
    if(m) return makeJsBlock('jsAssign', { name: m[1], value: m[2].trim() });

    // 函数调用：name(args)
    m = s.match(/^(\w+)\s*\(([\s\S]*)\)$/);
    if(m) return makeJsBlock('jsCall', { name: m[1], args: m[2].trim() });

    // 无法识别 → 跳过
    return null;
  }

  // JS 主解析入口：识别事件监听器作为顶级积木
  function parseJs(code){
    const blocks = [];
    // 先提取所有事件监听器（作为顶级积木）
    const eventBlocks = parseEventListener(code);
    blocks.push(...eventBlocks);
    // 识别顶层函数定义（function name() {}，不在任何事件回调内）
    // 简化：用正则找所有顶层 function 定义
    const funcRe = /(?:async\s+)?function\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    let m;
    while((m = funcRe.exec(code)) !== null){
      const blockStart = code.indexOf('{', m.index + m[0].length - 1);
      if(blockStart < 0) continue;
      const block = extractBlock(code, blockStart);
      const blockEl = makeJsBlock('jsFunc', { name: m[1], args: m[2].trim() });
      if(blockEl){
        blockEl.children = parseStatements(block.inner);
        blocks.push(blockEl);
      }
      funcRe.lastIndex = block.end;
    }
    return blocks;
  }

  return { parse };
})();
