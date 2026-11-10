// ==UserScript==
// @name         禅道返回热键
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  按 Backspace 或 ESC 键自动点击 class="btn btn-secondary" 的 <a> 按钮（常用于“返回”按钮）。安装前将 @match 换为自己的禅道地址。
// @author       本地地址
// @match        http://zentao.example.invalid/*
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  'use strict';

  // 为了避免在输入框、文本区域里误触发，我们排除这些可编辑元素
  const editableTags = ['INPUT', 'TEXTAREA', 'SELECT', 'CONTENTEDITABLE'];

  document.addEventListener('keydown', function (e) {
      // 只响应 Backspace 键（keyCode 8 或 key === 'Backspace'）和 ESC 键（keyCode 27 或 key === 'Escape'）
      if (e.key !== 'Backspace' && e.keyCode !== 8 && e.key !== 'Escape' && e.keyCode !== 27) return;

      // 如果当前焦点在可编辑元素中，直接放行（让浏览器正常删除字符）
      if (editableTags.includes(document.activeElement.tagName) ||
          document.activeElement.isContentEditable) {
          return;
      }

      // 防止页面本身因为 Backspace 或 ESC 而后退
      e.preventDefault();

      // 查找目标元素：a[class="btn btn-secondary"]
      // 注意：class 完全等于 "btn btn-secondary"（不包含其他 class）
      const target = document.querySelector('a.btn.btn-secondary');

      // 如果你想兼容可能还有其他 class 的情况（如 btn-secondary me-2），使用下面这行代替上面那行：
      // const target = document.querySelector('a.btn.btn-secondary');

      if (target) {
          console.log('[Backspace 或 ESC → Click] 找到并点击:', target);
          target.click();
      } else {
          console.log('[Backspace 或 ESC → Click] 未找到 a.btn.btn-secondary 元素');
      }
  });
})();