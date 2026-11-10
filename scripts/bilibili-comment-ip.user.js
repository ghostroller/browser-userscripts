// ==UserScript==
// @name         BiliBili 评论区显示IP属地 BiliBili Comment IP Geolocation
// @namespace    https://mozz.ie/
// @version      0.4.4
// @description  让 B 站 PC 版评论区显示 IP 属地（不包含用户主页属地）
// @author       Archeb
// @match        https://*.bilibili.com/*
// @icon         https://www.bilibili.com/favicon.ico
// @run-at       document-start
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/xhook@1.6.2/dist/xhook.min.js
// ==/UserScript==

(function () {
	"use strict";

	const SCRIPT_NAME = "BiliBili Comment IP";
	const FETCH_RESPONSE_PATCHED = Symbol("bilibili-comment-ip-patched");
	const IP_ACTION_ATTRIBUTE = "data-bilibili-comment-ip-action";
	const IP_LOCATION_ATTRIBUTE = "data-bilibili-comment-ip-location";
	const IP_LOCATION_PATTERN = /^IP属地[：:].+$/;
	const SUB_REPLY_PREFIX_PATTERN = /^（(IP属地[：:][^）]+)）\s*/;
	const LEGACY_SUB_REPLY_PREFIX_PATTERN = /^ \((IP属地[：:][^)]+)\)\s*/;
	const COMMENT_COMPONENT_SELECTOR = [
		"bili-comments",
		"bili-comment-thread-renderer",
		"bili-comment-renderer",
		"bili-comment-replies-renderer",
		"bili-comment-reply-renderer",
		"bili-rich-text",
		"bili-comment-action-buttons-renderer",
	].join(", ");
	const REPLY_API_PATHS = new Set([
		"/x/v2/reply/main",
		"/x/v2/reply/wbi/main",
		"/x/v2/reply/reply",
	]);

	function isReplyApi(url) {
		if (typeof url !== "string" || url.length === 0) return false;

		try {
			const parsedUrl = new URL(url, location.href);
			return parsedUrl.hostname === "api.bilibili.com" && REPLY_API_PATHS.has(parsedUrl.pathname);
		} catch {
			return false;
		}
	}

	function getRequestUrl(input) {
		if (typeof input === "string") return input;
		if (input instanceof URL) return input.href;
		return typeof input?.url === "string" ? input.url : "";
	}

	function createLocationLabel(reply, locationText) {
		return {
			rpid: reply.rpid,
			text_content: locationText,
			text_color_day: "#757575",
			text_color_night: "#939393",
			label_color_day: "#F4F4F4",
			label_color_night: "#1E1E1E",
			image: "",
			type: 0,
			background: "",
			background_width: 0,
			background_height: 0,
			jump_url: "",
			effect: 0,
			effect_start_time: 0,
		};
	}

	function addRootLocation(reply, locationText) {
		if (!Array.isArray(reply.card_label)) reply.card_label = [];

		const alreadyAdded = reply.card_label.some(
			(label) => label && label.text_content === locationText,
		);
		if (alreadyAdded) return false;

		reply.card_label.push(createLocationLabel(reply, locationText));
		return true;
	}

	function addSubReplyLocation(reply, locationText) {
		if (!reply.content || typeof reply.content.message !== "string") return false;

		const prefix = `（${locationText}） `;
		const legacyPrefix = ` (${locationText}) `;
		if (
			reply.content.message.startsWith(prefix) ||
			reply.content.message.startsWith(legacyPrefix)
		) {
			return false;
		}

		reply.content.message = prefix + reply.content.message;
		return true;
	}

	function processReplies(replies, nested = false, visited = new WeakSet()) {
		if (!Array.isArray(replies)) return false;

		let changed = false;
		for (const reply of replies) {
			if (!reply || typeof reply !== "object" || visited.has(reply)) continue;
			visited.add(reply);

			const rawLocation = reply.reply_control?.location;
			const locationText = typeof rawLocation === "string" ? rawLocation.trim() : "";
			if (locationText) {
				const isRootReply = !nested && (reply.root === 0 || reply.root === "0");
				changed =
					(isRootReply
						? addRootLocation(reply, locationText)
						: addSubReplyLocation(reply, locationText)) || changed;
			}

			changed = processReplies(reply.replies, true, visited) || changed;
		}

		return changed;
	}

	function transformReplyPayload(payload) {
		if (!payload || typeof payload !== "object" || !payload.data) return payload;

		const visited = new WeakSet();
		processReplies(payload.data.replies, false, visited);
		processReplies(payload.data.top_replies, false, visited);
		return payload;
	}

	function transformReplyText(text) {
		if (typeof text !== "string" || text.length === 0) return text;

		try {
			return JSON.stringify(transformReplyPayload(JSON.parse(text)));
		} catch (error) {
			console.warn(`[${SCRIPT_NAME}] 评论接口响应不是有效的 JSON，已保持原响应。`, error);
			return text;
		}
	}

	function patchFetchResponse(response) {
		if (!response || response[FETCH_RESPONSE_PATCHED]) return response;

		const originalJson = response.json.bind(response);
		const originalText = response.text.bind(response);
		const originalClone = response.clone.bind(response);

		Object.defineProperties(response, {
			[FETCH_RESPONSE_PATCHED]: { value: true },
			json: {
				configurable: true,
				value: async () => transformReplyPayload(await originalJson()),
			},
			text: {
				configurable: true,
				value: async () => transformReplyText(await originalText()),
			},
			clone: {
				configurable: true,
				value: () => patchFetchResponse(originalClone()),
			},
		});

		return response;
	}

	function appendIpToActionBar(actionRoot, locationText) {
		if (!actionRoot || !locationText) return;

		let locationElement = actionRoot.querySelector(`[${IP_ACTION_ATTRIBUTE}]`);
		if (!locationElement) {
			locationElement = document.createElement("div");
			locationElement.setAttribute(IP_ACTION_ATTRIBUTE, "");
			locationElement.style.cssText = [
				"display:flex",
				"align-items:center",
				"flex:none",
				"box-sizing:border-box",
				"height:20px",
				"padding:0 6px",
				"border-radius:2px",
				"background-color:rgba(148,153,160,.12)",
				"background-color:color-mix(in srgb,currentColor 10%,transparent)",
				"color:inherit",
				"font-size:12px",
				"line-height:20px",
				"margin-left:20px",
				"white-space:nowrap",
			].join(";");
		}

		// 重建文本节点会再次触发观察器；仅在内容变化时写入。
		if (locationElement.textContent !== locationText) {
			locationElement.textContent = locationText;
		}
		const moreButton = actionRoot.querySelector("#more");
		if (moreButton && locationElement.nextElementSibling !== moreButton) {
			actionRoot.insertBefore(locationElement, moreButton);
		} else if (!moreButton && actionRoot.lastElementChild !== locationElement) {
			actionRoot.append(locationElement);
		}
	}

	function hideEmptyTagsContainer(tagsContainer, ipTag) {
		ipTag.hidden = true;
		ipTag.style.display = "none";

		const hasOtherTags = Array.from(tagsContainer.querySelectorAll(".tag")).some(
			(tag) =>
				tag !== ipTag &&
				((tag.textContent || "").trim().length > 0 || tag.childElementCount > 0),
		);
		tagsContainer.hidden = !hasOtherTags;
		if (hasOtherTags) {
			tagsContainer.style.removeProperty("display");
		} else {
			tagsContainer.style.setProperty("display", "none", "important");
		}
	}

	function relocateRootCommentIp(commentRenderer) {
		const commentRoot = commentRenderer.shadowRoot;
		if (!commentRoot) return;

		const tagsContainer = commentRoot.querySelector("#tags");
		const ipTag = tagsContainer
			? Array.from(tagsContainer.querySelectorAll(".tag")).find((tag) =>
					IP_LOCATION_PATTERN.test((tag.textContent || "").trim()),
				)
			: null;
		const locationText =
			(ipTag?.textContent || "").trim() ||
			commentRenderer.getAttribute(IP_LOCATION_ATTRIBUTE) ||
			"";
		if (!locationText) return;

		const actionRoot = commentRoot.querySelector(
			"#footer > bili-comment-action-buttons-renderer",
		)?.shadowRoot;
		if (!actionRoot) return;

		commentRenderer.setAttribute(IP_LOCATION_ATTRIBUTE, locationText);
		appendIpToActionBar(actionRoot, locationText);
		if (tagsContainer && ipTag) hideEmptyTagsContainer(tagsContainer, ipTag);
	}

	function stripPrefixFromElement(element, length) {
		let remaining = length;
		for (const node of element.childNodes) {
			if (remaining <= 0) break;

			if (node.nodeType === Node.TEXT_NODE) {
				const text = node.textContent || "";
				const removedLength = Math.min(remaining, text.length);
				node.textContent = text.slice(removedLength);
				remaining -= removedLength;
			} else if (node.nodeType === Node.ELEMENT_NODE) {
				remaining = stripPrefixFromElement(node, remaining);
			}
		}

		return remaining;
	}

	function relocateSubReplyIp(replyRenderer) {
		const replyRoot = replyRenderer.shadowRoot;
		if (!replyRoot) return;

		const richTextRoot = replyRoot.querySelector("#main > bili-rich-text")?.shadowRoot;
		const contents = richTextRoot?.querySelector("#contents");
		const messageText = contents?.textContent || "";
		const prefixMatch =
			messageText.match(SUB_REPLY_PREFIX_PATTERN) ||
			messageText.match(LEGACY_SUB_REPLY_PREFIX_PATTERN);
		const locationText =
			prefixMatch?.[1]?.trim() ||
			replyRenderer.getAttribute(IP_LOCATION_ATTRIBUTE) ||
			"";
		if (!locationText) return;

		const actionRoot = replyRoot.querySelector(
			"#footer > bili-comment-action-buttons-renderer",
		)?.shadowRoot;
		if (!actionRoot) return;

		replyRenderer.setAttribute(IP_LOCATION_ATTRIBUTE, locationText);
		appendIpToActionBar(actionRoot, locationText);
		if (contents && prefixMatch) stripPrefixFromElement(contents, prefixMatch[0].length);
	}

	function installLayoutObserver() {
		const observedRoots = new WeakSet();
		let scanPending = false;

		const observer = new MutationObserver((mutations) => {
			if (mutations.some(shouldScheduleForMutation)) scheduleScan();
		});

		function containsCommentsComponent(node) {
			if (node.nodeType !== Node.ELEMENT_NODE) return false;
			return (
				node.matches?.("bili-comments") ||
				Boolean(node.querySelector?.("bili-comments"))
			);
		}

		function shouldScheduleForMutation(mutation) {
			if (mutation.target.getRootNode() !== document) return true;
			// 页面其他区域更新频繁，顶层只关注新挂载的评论组件。
			return Array.from(mutation.addedNodes).some(containsCommentsComponent);
		}

		function observeRoot(root) {
			if (observedRoots.has(root)) return;
			observedRoots.add(root);
			observer.observe(root, { childList: true, subtree: true });
		}

		function scanRoot(root) {
			observeRoot(root);

			for (const element of root.querySelectorAll(COMMENT_COMPONENT_SELECTOR)) {
				if (element.tagName === "BILI-COMMENT-RENDERER") {
					relocateRootCommentIp(element);
				} else if (element.tagName === "BILI-COMMENT-REPLY-RENDERER") {
					relocateSubReplyIp(element);
				}

				if (element.shadowRoot) scanRoot(element.shadowRoot);
			}
		}

		function scheduleScan() {
			if (scanPending) return;
			scanPending = true;
			requestAnimationFrame(() => {
				scanPending = false;
				scanRoot(document);
			});
		}

		observeRoot(document);
		scheduleScan();
	}

	function installFetchHook() {
		if (typeof window.fetch !== "function") return;

		const originalFetch = window.fetch;
		window.fetch = async function (input, init) {
			const url = getRequestUrl(input);
			if (!isReplyApi(url)) {
				return Reflect.apply(originalFetch, this, arguments);
			}

			const requestInit = { ...init, credentials: "include" };
			const response = await Reflect.apply(originalFetch, this, [input, requestInit]);
			return patchFetchResponse(response);
		};
	}

	function installXhrHooks() {
		if (!globalThis.xhook) {
			console.warn(`[${SCRIPT_NAME}] xhook 加载失败，XMLHttpRequest 评论无法处理。`);
			return;
		}

		globalThis.xhook.before((request) => {
			if (isReplyApi(request.url)) request.withCredentials = true;
		});

		globalThis.xhook.after((request, response) => {
			if (!isReplyApi(request.url) || !response) return;

			if (typeof response.text === "string" && response.text.length > 0) {
				response.text = transformReplyText(response.text);
			}

			if (response.data && typeof response.data === "object") {
				response.data = transformReplyPayload(response.data);
			}
		});
	}

	installFetchHook();
	installXhrHooks();
	installLayoutObserver();
})();
