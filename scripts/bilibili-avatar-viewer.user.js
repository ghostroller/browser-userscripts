// ==UserScript==
// @name         Bilibili Avatar Viewer
// @namespace    https://github.com/ghostroller
// @version      1.1.5
// @description  Bilibili 用户主页头像原图预览；直播时头像下方提供进入直播间按钮；Ctrl/Cmd+单击或中键在新标签页打开原图；保留原生右键菜单。
// @match        https://space.bilibili.com/*
// @grant        none
// @run-at       document-idle
// @updateURL    https://raw.githubusercontent.com/ghostroller/browser-userscripts/main/scripts/bilibili-avatar-viewer.user.js
// @downloadURL  https://raw.githubusercontent.com/ghostroller/browser-userscripts/main/scripts/bilibili-avatar-viewer.user.js
// ==/UserScript==

(() => {
    'use strict';

    if (document.getElementById('bav-overlay')) return;

    const APP_SELECTOR = '#app';
    const HEADER_SELECTOR = '.space-header';
    const ROOT_SELECTOR = '.space-header .upinfo-avatar .space-avatar';
    const IMAGE_SELECTOR = '.b-avatar__layer.center .b-avatar__layer__res img';
    const LIVE_LINK_SELECTOR = 'a.live-ani[href]';
    const LIVE_ENTRY_CLASS = 'bav-live-entry';
    const LIVE_ENTRY_SELECTOR = `.${LIVE_ENTRY_CLASS}`;
    const FACE_RE = /\/bfs\/face\//i;

    function getAvatarFromTarget(target) {
        if (!(target instanceof Element)) return null;
        if (target.closest(LIVE_ENTRY_SELECTOR)) return null;

        const root = target.closest(ROOT_SELECTOR);
        if (!root) return null;

        const img = root.querySelector(IMAGE_SELECTOR);
        if (!(img instanceof HTMLImageElement)) return null;

        const src = img.currentSrc || img.src || '';
        if (!FACE_RE.test(src)) return null;

        return img;
    }

    function getOriginalUrl(img) {
        const raw = img.currentSrc || img.src || '';
        if (!raw) return null;

        try {
            const url = new URL(raw, location.href);
            url.pathname = url.pathname.split('@')[0];
            return url.href;
        } catch {
            return raw.split('@')[0];
        }
    }

    function openInNewTab(url) {
        window.open(url, '_blank', 'noopener,noreferrer');
    }

    const overlay = document.createElement('div');
    overlay.id = 'bav-overlay';
    overlay.innerHTML = `
        <div id="bav-panel" role="dialog" aria-modal="true" aria-label="Bilibili avatar viewer">
            <button id="bav-close" type="button" title="关闭" aria-label="关闭头像预览">
                <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
                    <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                </svg>
            </button>
            <div id="bav-image-wrap">
                <img id="bav-image" alt="Bilibili avatar original image">
            </div>
            <div id="bav-toolbar">
                <div id="bav-info">加载中…</div>
                <button id="bav-copy" type="button">复制原图链接</button>
                <button id="bav-open" type="button">新标签打开</button>
            </div>
            <div id="bav-toast">已复制</div>
        </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
        ${ROOT_SELECTOR} > ${LIVE_ENTRY_SELECTOR} {
            position: absolute;
            top: calc(100% + 4px);
            left: 50%;
            z-index: 100;
            transform: translateX(-50%);
            box-sizing: border-box;
            border: 1px solid rgba(255, 255, 255, .6);
            border-radius: 6px;
            padding: 3px 8px;
            background: rgba(0, 0, 0, .75);
            color: #fff;
            font: 12px/18px -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
            white-space: nowrap;
            text-decoration: none;
            cursor: pointer;
        }
        ${ROOT_SELECTOR} > ${LIVE_ENTRY_SELECTOR}[hidden] { display: none; }
        ${ROOT_SELECTOR} > ${LIVE_ENTRY_SELECTOR}:hover { background: #202024; }
        ${ROOT_SELECTOR} > ${LIVE_ENTRY_SELECTOR}:focus-visible {
            outline: 2px solid #00aeec;
            outline-offset: 2px;
        }
        #bav-overlay {
            position: fixed;
            inset: 0;
            z-index: 2147483647;
            display: none;
            align-items: center;
            justify-content: center;
            padding: 40px;
            box-sizing: border-box;
            background: rgba(0, 0, 0, .72);
            backdrop-filter: blur(3px);
        }
        #bav-overlay.bav-open { display: flex; }
        #bav-panel {
            position: relative;
            display: flex;
            flex-direction: column;
            max-width: min(92vw, 1200px);
            max-height: 92vh;
            overflow: hidden;
            border-radius: 12px;
            background: #18181c;
            color: #f5f5f5;
            box-shadow: 0 20px 60px rgba(0, 0, 0, .45);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
        }
        #bav-image-wrap {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 260px;
            min-height: 260px;
            max-height: calc(92vh - 58px);
            overflow: auto;
            background: #202024;
        }
        #bav-image {
            display: block;
            max-width: min(88vw, 1100px);
            max-height: calc(92vh - 70px);
            width: auto;
            height: auto;
            object-fit: contain;
        }
        #bav-toolbar {
            display: flex;
            align-items: center;
            gap: 10px;
            min-height: 58px;
            padding: 10px 12px;
            box-sizing: border-box;
        }
        #bav-info {
            flex: 1;
            min-width: 0;
            color: #cfcfd3;
            font-size: 13px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        #bav-panel button {
            border: 0;
            border-radius: 7px;
            padding: 8px 12px;
            color: #f5f5f5;
            background: #2f2f36;
            cursor: pointer;
            font: inherit;
        }
        #bav-panel button:hover { background: #414149; }
        #bav-close {
            position: absolute;
            display: grid;
            place-items: center;
            top: 10px;
            right: 10px;
            z-index: 2;
            width: 34px;
            height: 34px;
            padding: 0 !important;
            border-radius: 50% !important;
            background: rgba(0, 0, 0, .55) !important;
        }
        #bav-close > svg {
            display: block;
            width: 18px;
            height: 18px;
            pointer-events: none;
        }
        #bav-toast {
            position: absolute;
            left: 50%;
            bottom: 76px;
            transform: translateX(-50%);
            padding: 7px 12px;
            border-radius: 7px;
            background: rgba(0, 0, 0, .78);
            color: #fff;
            font-size: 13px;
            opacity: 0;
            transition: opacity .16s ease;
            pointer-events: none;
        }
        #bav-toast.bav-show { opacity: 1; }
    `;

    document.documentElement.append(style, overlay);

    const image = overlay.querySelector('#bav-image');
    const info = overlay.querySelector('#bav-info');
    const closeBtn = overlay.querySelector('#bav-close');
    const copyBtn = overlay.querySelector('#bav-copy');
    const openBtn = overlay.querySelector('#bav-open');
    const toast = overlay.querySelector('#bav-toast');

    let currentUrl = '';
    let toastTimer = 0;

    function closeViewer() {
        overlay.classList.remove('bav-open');
        image.removeAttribute('src');
        currentUrl = '';
    }

    function showViewer(url) {
        currentUrl = url;
        info.textContent = '加载中…';
        image.src = url;
        overlay.classList.add('bav-open');
    }

    function showToast(text) {
        toast.textContent = text;
        toast.classList.add('bav-show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => toast.classList.remove('bav-show'), 1200);
    }

    image.addEventListener('load', () => {
        let ext = 'IMAGE';
        try {
            const pathname = new URL(currentUrl).pathname;
            ext = pathname.match(/\.([a-z0-9]+)$/i)?.[1]?.toUpperCase() || 'IMAGE';
        } catch {}
        info.textContent = `${image.naturalWidth} × ${image.naturalHeight} · ${ext}`;
    });

    image.addEventListener('error', () => {
        info.textContent = '原图加载失败';
    });

    overlay.addEventListener('click', event => {
        if (event.target === overlay) closeViewer();
    });

    closeBtn.addEventListener('click', closeViewer);

    openBtn.addEventListener('click', () => {
        if (currentUrl) openInNewTab(currentUrl);
    });

    copyBtn.addEventListener('click', async () => {
        if (!currentUrl) return;
        try {
            await navigator.clipboard.writeText(currentUrl);
            showToast('已复制原图链接');
        } catch {
            showToast('复制失败');
        }
    });

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && overlay.classList.contains('bav-open')) {
            event.preventDefault();
            closeViewer();
        }
    }, true);

    document.addEventListener('click', event => {
        if (event.button !== 0) return;

        const img = getAvatarFromTarget(event.target);
        if (!img) return;

        const url = getOriginalUrl(img);
        if (!url) return;

        event.preventDefault();
        event.stopPropagation();

        if (event.ctrlKey || event.metaKey) {
            openInNewTab(url);
        } else {
            showViewer(url);
        }
    }, true);

    document.addEventListener('auxclick', event => {
        if (event.button !== 1) return;

        const img = getAvatarFromTarget(event.target);
        if (!img) return;

        const url = getOriginalUrl(img);
        if (!url) return;

        event.preventDefault();
        event.stopPropagation();
        openInNewTab(url);
    }, true);

    function watchAvatarHeader(app) {
        let header = null;

        function updateLiveEntries() {
            if (!header) return;

            for (const root of header.querySelectorAll(ROOT_SELECTOR)) {
                let entry = root.querySelector(LIVE_ENTRY_SELECTOR);
                const liveLink = root.querySelector(LIVE_LINK_SELECTOR);
                const available = liveLink instanceof HTMLAnchorElement && !!getAvatarFromTarget(root);
                if (available && !entry) {
                    entry = document.createElement('a');
                    entry.className = LIVE_ENTRY_CLASS;
                    entry.textContent = '进入直播间';
                    entry.title = '进入直播间';
                    entry.rel = 'noopener noreferrer';
                    root.append(entry);
                }
                if (entry) {
                    entry.hidden = !available;
                    if (available) {
                        // 只写入变化的属性，避免自身的 href 更新反复触发 observer。
                        if (entry.href !== liveLink.href) entry.href = liveLink.href;
                        const target = liveLink.getAttribute('target');
                        if (target === null) {
                            if (entry.hasAttribute('target')) entry.removeAttribute('target');
                        } else if (entry.getAttribute('target') !== target) {
                            entry.setAttribute('target', target);
                        }
                    }
                }
            }
        }

        const headerObserver = new MutationObserver(updateLiveEntries);
        function observeHeader() {
            const nextHeader = app.querySelector(HEADER_SELECTOR);
            if (nextHeader === header) return;

            headerObserver.disconnect();
            header = nextHeader;
            updateLiveEntries();
            if (header) {
                headerObserver.observe(header, {
                    childList: true,
                    subtree: true,
                    attributes: true,
                    attributeFilter: ['href', 'target', 'src', 'srcset'],
                });
            }
        }

        // 页面主体只观察直接子节点，头像内的异步变化由头部 observer 处理。
        const appObserver = new MutationObserver(observeHeader);
        appObserver.observe(app, { childList: true });
        observeHeader();
    }

    const app = document.querySelector(APP_SELECTOR);
    if (app) {
        watchAvatarHeader(app);
    } else {
        const bootstrapObserver = new MutationObserver(() => {
            const app = document.querySelector(APP_SELECTOR);
            if (!app) return;
            bootstrapObserver.disconnect();
            watchAvatarHeader(app);
        });
        bootstrapObserver.observe(document.body, { childList: true, subtree: true });
    }

    // 不监听 contextmenu：保留浏览器原生右键菜单。
})();
