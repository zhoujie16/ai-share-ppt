import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const root = process.cwd();
const templatePath = `${root}/.codex/skills/guizang-ppt-skill-main/assets/template-swiss.html`;
const outlinePath = `${root}/AI制作版大纲.md`;
const outPath = `${root}/index.html`;

const template = readFileSync(templatePath, 'utf8');
const outline = readFileSync(outlinePath, 'utf8');

function esc(s = '') {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function splitRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

const rows = outline
  .split('\n')
  .filter((line) => /^\|\s*\d+/.test(line))
  .map((line) => {
    const [page, type, visible, asset, notes] = splitRow(line);
    return {
      page: Number(page),
      type,
      visible,
      asset: asset === '无' ? '' : asset,
      notes,
    };
  });

if (rows.length !== 82) {
  throw new Error(`Expected 82 rows from outline, got ${rows.length}`);
}

const missingAssets = rows
  .filter((row) => row.asset)
  .filter((row) => !existsSync(`${root}/${row.asset}`));

if (missingAssets.length) {
  throw new Error(`Missing assets:\n${missingAssets.map((row) => `${row.page}: ${row.asset}`).join('\n')}`);
}

function titleParts(visible) {
  const title = visible.match(/标题：([^；]+)/)?.[1]?.trim() || visible.split('；')[0].trim();
  const subtitle = visible.match(/副标题：(.+)/)?.[1]?.trim() || '';
  const pointsRaw = visible.match(/要点：(.+)/)?.[1]?.trim() || '';
  const points = pointsRaw ? pointsRaw.split(/[、；;]/).map((p) => p.trim()).filter(Boolean) : [];
  return { title, subtitle, points };
}

function speakerNotes(row) {
  return `<aside class="speaker-notes">${esc(row.notes || '')}</aside>`;
}

function chrome(left, right) {
  return `<div class="chrome-min"><div class="l">${esc(left)}</div><div class="r">${esc(right)}</div></div>`;
}

function cover(row) {
  const { title, subtitle } = titleParts(row.visible);
  return `
<section class="slide accent" data-layout="SWISS-COVER-ASCII" data-animate="hero">
  <div class="canvas-card">
    <canvas class="ascii-bg" aria-hidden="true"></canvas>
    ${chrome('CODEX APP · FIELD GUIDE', `${String(row.page).padStart(2, '0')} / 82`)}
    <div style="flex:1;padding:0;display:grid;grid-template-rows:auto 1fr auto;gap:2.6vh">
      <div data-anim="kicker" class="t-meta" style="color:rgba(255,255,255,.78);letter-spacing:.22em">PRODUCT WORKFLOW / LOCAL · CLOUD · MOBILE</div>
      <h1 data-anim="title" style="align-self:center;font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(9.2vw,16vh);line-height:.96;letter-spacing:-.025em;color:#fff">${esc(title).replace('App', '<span style="font-style:italic;font-weight:300">App</span>')}</h1>
      <div data-anim="bottom" style="display:grid;grid-template-rows:auto auto;gap:1.6vh;border-top:1px solid rgba(255,255,255,.22);padding-top:2vh">
        <div class="lead" style="max-width:58ch;color:rgba(255,255,255,.86)">${esc(subtitle)}</div>
        <div style="display:flex;justify-content:space-between;align-items:end">
          <div class="t-meta" style="color:rgba(255,255,255,.6)">AI SHARE · 2026</div>
          <div class="t-meta" style="color:rgba(255,255,255,.6)">← → 翻页 · ESC 索引</div>
        </div>
      </div>
    </div>
  </div>
  ${speakerNotes(row)}
</section>`;
}

function toc(row) {
  const items = row.visible.split('；').map((item) => item.trim()).filter(Boolean);
  const cards = items.map((item, i) => `
        <div data-anim="card" class="deck-grid-card">
          <div class="t-meta">${String(i + 1).padStart(2, '0')}</div>
          <div class="deck-card-title">${esc(item)}</div>
        </div>`).join('');
  return `
<section class="slide light" data-layout="S16" data-animate="grid-reveal">
  <div class="canvas-card">
    ${chrome('CONTENTS · 12 MODULES', `${String(row.page).padStart(2, '0')} / 82`)}
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">FROM LOCAL WORKBENCH TO CLOUD PR</div>
      <h2 class="h-xl-zh" style="font-size:min(5.2vw,9.2vh)">分享目录</h2>
    </div>
    <div class="deck-toc-grid">
${cards}
    </div>
  </div>
  ${speakerNotes(row)}
</section>`;
}

const introLayouts = ['S03', 'S04', 'S11', 'S13', 'S14', 'S17', 'S19', 'S08', 'S12'];

function intro(row, introIndex) {
  const { title, points } = titleParts(row.visible);
  const num = title.match(/^(\d{2})\s*(.*)$/);
  const sectionNo = num ? num[1] : String(introIndex + 1).padStart(2, '0');
  const cleanTitle = num ? num[2] : title;
  const layout = introLayouts[introIndex % introLayouts.length];
  const pointList = points.length ? points : ['理解入口', '确认范围', '观察过程', '验证结果'];
  const pointHtml = pointList.map((p, i) => `
          <div data-anim="item" class="intro-point">
            <div class="intro-point-nb">${String(i + 1).padStart(2, '0')}</div>
            <div>${esc(p)}</div>
          </div>`).join('');

  return `
<section class="slide split light" data-layout="${layout}" data-animate="split-statement">
  <div class="canvas-card">
    <div class="split-half">
      <div class="half ${introIndex % 3 === 1 ? 'b-ink' : 'b-accent'}" style="justify-content:space-between;position:relative;overflow:hidden">
        ${introIndex % 3 === 1 ? '' : '<canvas class="ascii-bg" aria-hidden="true"></canvas>'}
        ${chrome(`MODULE ${sectionNo}`, `${String(row.page).padStart(2, '0')} / 82`)}
        <div data-anim="manifesto" style="display:flex;flex-direction:column;gap:2.4vh">
          <div class="t-meta" style="color:currentColor;opacity:.72;letter-spacing:.22em">INTRODUCTION</div>
          <div style="font-family:var(--sans);font-weight:200;font-size:min(11vw,18vh);line-height:.85;letter-spacing:-.045em">${sectionNo}</div>
          <h2 style="font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(4.9vw,8.7vh);line-height:1.05;letter-spacing:-.025em;max-width:10em">${esc(cleanTitle)}</h2>
        </div>
        <div class="t-meta" style="opacity:.62;border-top:1px solid currentColor;padding-top:2vh">FOCUS BEFORE DEMO</div>
      </div>
      <div class="half r-border" style="justify-content:center;gap:3vh;background:var(--paper);color:var(--ink)">
        <div data-anim="grid" class="intro-points">
${pointHtml}
        </div>
      </div>
    </div>
  </div>
  ${speakerNotes(row)}
</section>`;
}

function summary(row) {
  const { title, points } = titleParts(row.visible);
  const pointHtml = points.map((p, i) => `
          <div data-anim="item" style="display:grid;grid-template-columns:auto 1fr;gap:2vw;align-items:start;padding:2.2vh 0;border-top:1px solid var(--border-subtle)">
            <div style="font-family:var(--sans);font-weight:200;font-size:min(4.2vw,7.5vh);line-height:.9;color:${i === points.length - 1 ? 'var(--accent)' : 'var(--text-primary)'}">${String(i + 1).padStart(2, '0')}</div>
            <div class="deck-card-title">${esc(p)}</div>
          </div>`).join('');
  return `
<section class="slide split" data-layout="S10" data-animate="split-statement">
  <div class="canvas-card">
    <div class="split-half">
      <div class="half b-ink" style="justify-content:center">
        ${chrome('SUMMARY', `${String(row.page).padStart(2, '0')} / 82`)}
        <h2 data-anim="manifesto" style="font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(6.2vw,10.8vh);line-height:.98;letter-spacing:-.025em">${esc(title)}</h2>
      </div>
      <div class="half" style="justify-content:center">
        <div data-anim="rules" style="display:flex;flex-direction:column;gap:0">
${pointHtml}
        </div>
      </div>
    </div>
  </div>
  ${speakerNotes(row)}
</section>`;
}

function codexVsCursor(row) {
  const comparisons = [
    ['核心定位', 'AI 工作台 / 任务执行助手', 'AI IDE / 编码编辑器'],
    ['适合场景', '从需求到执行、验证、PR、自动化、跨应用操作', '日常写代码、读代码、局部重构、补全'],
    ['交互方式', '更偏“给任务，让它推进”', '更偏“人在写，AI 辅助”'],
    ['项目上下文', '以任务、会话、项目为中心', '以代码仓库和编辑器为中心'],
    ['执行能力', '可运行命令、改文件、验证结果、连工具', '强在编辑器内代码理解和生成'],
    ['工作流', '需求 → 执行 → 验证 → 提交/PR/自动化', '阅读 → 修改 → 调试 → 提交'],
  ];
  const rowsHtml = comparisons.map(([label, codex, cursor]) => `
        <div class="compare-label">${esc(label)}</div>
        <div class="compare-cell accent-cell">${esc(codex)}</div>
        <div class="compare-cell">${esc(cursor)}</div>`).join('');

  return `
<section class="slide light" data-layout="S21" data-animate="grid-reveal">
  <div class="canvas-card">
    ${chrome('POSITIONING · CODEX APP VS CURSOR', `${String(row.page).padStart(2, '0')} / 82`)}
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.2vh">
      <div class="t-meta">WHERE EACH TOOL FITS</div>
      <h2 class="h-xl-zh" style="font-size:min(5.3vw,9.4vh)">Codex App vs Cursor</h2>
    </div>
    <div class="compare-grid" data-anim="grid">
      <div class="compare-head">对比点</div>
      <div class="compare-head accent-head">Codex App</div>
      <div class="compare-head">Cursor</div>
${rowsHtml}
    </div>
    <div data-anim="bottom" class="compare-conclusion">
      <span>Codex App 更像“能推进任务的 AI 协作者”</span>
      <span>Cursor 更像“增强版 IDE”</span>
    </div>
  </div>
  ${speakerNotes(row)}
</section>`;
}

function closing(row) {
  const { title, points } = titleParts(row.visible);
  const steps = points.map((p, i) => {
    const [, label = p, duration = ''] = p.match(/^(.+?章)\s*(.*)$/) || [];
    return `
            <div class="th-node ${i === 1 ? 'accent' : ''} ${i % 2 ? 'down' : 'up'}">
              <div class="label"><div class="yr">${String(i + 1).padStart(2, '0')}</div><div class="name">${esc(label)}</div><div class="desc">${esc(duration)}</div></div>
              <div class="dot"></div>
            </div>`;
  }).join('');
  return `
<section class="slide light" data-layout="S11" data-animate="timeline-walk">
  <div class="canvas-card">
    ${chrome('RUN OF SHOW', `${String(row.page).padStart(2, '0')} / 82`)}
    <div data-anim="head" style="display:flex;flex-direction:column;gap:1.4vh">
      <div class="t-meta">BACKUP / SPEAKER PREP</div>
      <h2 class="h-xl-zh" style="font-size:min(5.4vw,9.6vh)">${esc(title)}</h2>
    </div>
    <div class="timeline-h" data-anim="timeline">
      <div class="tl-row" style="grid-template-columns:repeat(${Math.max(points.length, 1)},1fr)">
${steps}
      </div>
    </div>
    <div class="t-meta" style="color:var(--text-helper);text-align:right">END · THANK YOU</div>
  </div>
  ${speakerNotes(row)}
</section>`;
}

function thanks(row) {
  const { title } = titleParts(row.visible);
  const line = row.visible.match(/底部句子：(.+)/)?.[1]?.trim() || '从“问 AI”到“让 AI 做事”，关键是把任务说清楚，把结果验证好。';
  return `
<section class="slide accent" data-layout="SWISS-CLOSING-ASCII" data-animate="hero">
  <div class="canvas-card">
    <canvas class="ascii-bg" aria-hidden="true"></canvas>
    ${chrome('THANK YOU', `${String(row.page).padStart(2, '0')} / 82`)}
    <div style="flex:1;padding:0;display:grid;grid-template-rows:1fr auto;gap:4vh">
      <h2 data-anim="title" style="align-self:center;font-family:var(--sans),var(--sans-zh);font-weight:200;font-size:min(12vw,20vh);line-height:.9;letter-spacing:-.025em;color:#fff">${esc(title)}</h2>
      <div data-anim="bottom" style="border-top:1px solid rgba(255,255,255,.24);padding-top:2.4vh;display:flex;justify-content:space-between;gap:4vw;align-items:end">
        <div class="lead" style="max-width:42ch;color:rgba(255,255,255,.88);font-size:min(2vw,3.6vh);line-height:1.42">${esc(line)}</div>
        <div class="t-meta" style="color:rgba(255,255,255,.62)">END · CODEX APP</div>
      </div>
    </div>
  </div>
  ${speakerNotes(row)}
</section>`;
}

function media(row) {
  const isVideo = /视频/.test(row.type) || /\.mp4$/i.test(row.asset);
  const tag = isVideo
    ? `<video data-image-slot="s22-hero-21x9" src="${esc(row.asset)}" controls preload="none" playsinline></video>`
    : `<img data-image-slot="s22-hero-21x9" src="${esc(row.asset)}" alt="">`;
  return `
<section class="slide light media-only" data-layout="S22" data-image-slot="s22-hero-21x9" data-animate="image-hero">
  <div class="media-stage" data-anim="img">
    ${tag}
  </div>
  ${speakerNotes(row)}
</section>`;
}

let introIndex = 0;
const slides = rows.map((row) => {
  if (row.page === 1) return cover(row);
  if (row.page === 2) return toc(row);
  if (row.page === 81) return codexVsCursor(row);
  if (row.page === 82) return thanks(row);
  if (/图片页|视频页/.test(row.type)) return media(row);
  if (/总结页/.test(row.type)) return summary(row);
  if (/收尾页/.test(row.type)) return closing(row);
  if (/导入页/.test(row.type)) return intro(row, introIndex++);
  return summary(row);
}).join('\n');

const extraCss = `
  /* Codex App deck additions */
  .speaker-notes{display:none!important}
  .deck-toc-grid{display:grid;grid-template-columns:repeat(4,1fr);grid-auto-rows:minmax(0,1fr);gap:var(--sp-5);flex:1;margin-top:var(--sp-8);min-height:0}
  .deck-grid-card{background:var(--grey-1);padding:var(--sp-6);display:flex;flex-direction:column;justify-content:space-between;gap:var(--sp-5);border:0}
  .deck-card-title{font-family:var(--sans),var(--sans-zh);font-weight:400;font-size:max(18px,1.35vw);line-height:1.28;letter-spacing:-.01em;color:var(--text-primary)}
  .intro-points{display:grid;grid-template-columns:1fr;gap:var(--sp-5)}
  .intro-point{display:grid;grid-template-columns:4.6em 1fr;gap:var(--sp-5);align-items:start;padding:var(--sp-5) 0;border-top:1px solid var(--border-subtle);font-family:var(--sans),var(--sans-zh);font-size:max(18px,1.2vw);line-height:1.4;font-weight:400;color:var(--text-primary)}
  .intro-point-nb{font-family:var(--mono);font-size:14px;font-weight:600;letter-spacing:.16em;color:var(--accent)}
  .compare-grid{display:grid;grid-template-columns:1.1fr 2fr 2fr;gap:0;margin-top:var(--sp-6);border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
  .compare-head{font-family:var(--mono);font-size:14px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--text-helper);padding:var(--sp-4) var(--sp-5);border-bottom:1px solid var(--border-subtle)}
  .compare-head.accent-head{color:var(--accent)}
  .compare-label{font-family:var(--mono);font-size:14px;font-weight:600;letter-spacing:.12em;color:var(--text-helper);padding:var(--sp-4) var(--sp-5);border-top:1px solid var(--border-subtle)}
  .compare-cell{font-family:var(--sans),var(--sans-zh);font-size:max(16px,.98vw);font-weight:400;line-height:1.36;color:var(--text-primary);padding:var(--sp-4) var(--sp-5);border-top:1px solid var(--border-subtle)}
  .compare-cell.accent-cell{color:var(--accent);font-weight:500}
  .compare-conclusion{margin-top:var(--sp-4);display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-5);border-top:1px solid var(--border-subtle);padding-top:var(--sp-4);font-family:var(--sans),var(--sans-zh);font-size:max(17px,1.15vw);line-height:1.3;letter-spacing:-.01em}
  .compare-conclusion span:first-child{color:var(--accent);font-weight:500}
  .slide.media-only{padding:0!important;background:#0a0a0a;color:#fff}
  .slide.media-only .media-stage{width:100vw;height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0a}
  .slide.media-only img,.slide.media-only video{width:100%;height:100%;object-fit:contain;object-position:center center;display:block;background:#0a0a0a}
  body.media-only-view #nav,body.media-only-view #hint{display:none!important}
  body.media-only-view{background:#0a0a0a}
  @media(max-width:900px){
    .deck-toc-grid{grid-template-columns:repeat(2,1fr)}
    .deck-card-title{font-size:18px}
  }
`;

let html = template
  .replace('<title>[必填] 替换为 PPT 标题 · Deck Title</title>', '<title>Codex App 的实践分享</title>')
  .replace('</style>', `${extraCss}\n</style>`);

const deckStart = html.indexOf('<div id="deck">');
const deckEndMarker = '\n\n<div id="nav"></div>';
const deckEnd = html.indexOf(deckEndMarker);
if (deckStart === -1 || deckEnd === -1) throw new Error('Could not locate deck replacement markers.');
html = `${html.slice(0, deckStart)}<div id="deck">\n${slides}\n</div>${html.slice(deckEnd)}`;

html = html.replace(
  'darkMode = isDark;\n  if(window.__playSlide) setTimeout(()=>window.__playSlide(idx), 450);',
  `darkMode = isDark;
  document.body.classList.toggle('media-only-view', el.classList.contains('media-only'));
  document.querySelectorAll('video').forEach((v)=>{ if(!v.closest('.slide')?.isSameNode(el)) v.pause(); });
  el.querySelectorAll('video').forEach((v)=>{ try { v.load(); } catch(e) {} });
  if(window.__playSlide) setTimeout(()=>window.__playSlide(idx), 450);`
);

if (html.includes('[必填]')) {
  throw new Error('Generated HTML still contains [必填] placeholders.');
}

writeFileSync(outPath, html);
console.log(`Generated ${outPath} with ${rows.length} slides.`);
