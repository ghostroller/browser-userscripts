// ==UserScript==
// @name         Codex Quota Compass Shadow Edition
// @namespace    http://tampermonkey.net/
// @version      2.5.1
// @description  Codex 用量分析：Shadow DOM 隔离渲染，支持自选时间段、完整展示明细/客户端/模型数据，按 OpenAI 标准 API 模型价格估算金额
// @author       ChatGPT
// @match        https://chatgpt.com/codex/cloud/settings/analytics*
// @run-at       document-idle
// @grant        none
// @updateURL    https://raw.githubusercontent.com/ghostroller/browser-userscripts/main/scripts/codex-quota-compass-shadow.user.js
// @downloadURL  https://raw.githubusercontent.com/ghostroller/browser-userscripts/main/scripts/codex-quota-compass-shadow.user.js
// ==/UserScript==

(function () {
  "use strict";

  if (window.__codexQuotaCompassShadowInjected) return;
  window.__codexQuotaCompassShadowInjected = true;

  const CONFIG = {
    DEFAULT_RANGE_DAYS: 30,
    MAX_RANGE_DAYS: 366,
    DAY_MS: 24 * 60 * 60 * 1000,
    TARGET_WINDOW_SECONDS: 7 * 24 * 60 * 60,
    USE_UTC_DAY: true,
    EPS: 1e-9,

    PRICING_AS_OF: "2026-07-16",
    PRICING_SOURCE_URL: "https://developers.openai.com/api/docs/models",
    DEFAULT_MODEL_PRICE_KEY: "gpt-5.6-sol",

    // OpenAI 标准 API 文本 token 单价，单位：美元 / 1M tokens。
    // cachedInput 对应缓存读取；GPT-5.6 的缓存写入价未出现在此 analytics 接口中。
    MODEL_PRICE_PER_1M: {
      "gpt-5.6-sol": {
        label: "GPT-5.6 Sol",
        uncachedInput: 5.0,
        cachedInput: 0.5,
        output: 30.0,
      },
      "gpt-5.6-terra": {
        label: "GPT-5.6 Terra",
        uncachedInput: 2.5,
        cachedInput: 0.25,
        output: 15.0,
      },
      "gpt-5.6-luna": {
        label: "GPT-5.6 Luna",
        uncachedInput: 1.0,
        cachedInput: 0.1,
        output: 6.0,
      },
      "gpt-5.5-pro": {
        label: "GPT-5.5 Pro",
        uncachedInput: 30.0,
        cachedInput: 30.0,
        output: 180.0,
      },
      "gpt-5.5": {
        label: "GPT-5.5",
        uncachedInput: 5.0,
        cachedInput: 0.5,
        output: 30.0,
      },
      "gpt-5.4-pro": {
        label: "GPT-5.4 Pro",
        uncachedInput: 30.0,
        cachedInput: 30.0,
        output: 180.0,
      },
      "gpt-5.4": {
        label: "GPT-5.4",
        uncachedInput: 2.5,
        cachedInput: 0.25,
        output: 15.0,
      },
      "gpt-5.4-mini": {
        label: "GPT-5.4 mini",
        uncachedInput: 0.75,
        cachedInput: 0.075,
        output: 4.5,
      },
      "gpt-5.4-nano": {
        label: "GPT-5.4 nano",
        uncachedInput: 0.2,
        cachedInput: 0.02,
        output: 1.25,
      },
      "gpt-5.3-codex": {
        label: "GPT-5.3-Codex",
        uncachedInput: 1.75,
        cachedInput: 0.175,
        output: 14.0,
      },
      "gpt-5.2-codex": {
        label: "GPT-5.2-Codex",
        uncachedInput: 1.75,
        cachedInput: 0.175,
        output: 14.0,
      },
      "gpt-5.1-codex-mini": {
        label: "GPT-5.1-Codex mini",
        uncachedInput: 0.25,
        cachedInput: 0.025,
        output: 2.0,
      },
      "gpt-5.1-codex": {
        label: "GPT-5.1-Codex / Max",
        uncachedInput: 1.25,
        cachedInput: 0.125,
        output: 10.0,
      },
      "gpt-5-codex": {
        label: "GPT-5-Codex",
        uncachedInput: 1.25,
        cachedInput: 0.125,
        output: 10.0,
      },
      "codex-mini-latest": {
        label: "codex-mini-latest",
        uncachedInput: 1.5,
        cachedInput: 0.375,
        output: 6.0,
      },
    },
  };

  const MODEL_PRICE_MATCHERS = [
    ["gpt-5.6-terra", /^gpt-5\.6-terra(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.6-luna", /^gpt-5\.6-luna(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.6-sol", /^gpt-5\.6(?:-sol)?(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.5-pro", /^gpt-5\.5-pro(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.5", /^gpt-5\.5(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.4-pro", /^gpt-5\.4-pro(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.4-mini", /^gpt-5\.4-mini(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.4-nano", /^gpt-5\.4-nano(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.4", /^gpt-5\.4(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.3-codex", /^gpt-5\.3-codex(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.2-codex", /^gpt-5\.2-codex(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.1-codex-mini", /^gpt-5\.1-codex-mini(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5.1-codex", /^gpt-5\.1-codex(?:-max)?(?:-\d{4}-\d{2}-\d{2})?$/],
    ["gpt-5-codex", /^gpt-5-codex(?:-\d{4}-\d{2}-\d{2})?$/],
    ["codex-mini-latest", /^codex-mini-latest$/],
  ];

  const state = {
    token: null,
    loading: false,

    usage: null,
    quotaWindow: null,
    cycleStartMs: NaN,
    cycleEndMs: NaN,

    rawDailyData: null,
    dailyList: [],

    selectedStartDate: "",
    selectedEndDate: "",

    shadowRoot: null,
  };

  const HTML_ESCAPE = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };

  const escapeHtml = (value) =>
    String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPE[ch]);

  const n = (value) => {
    if (typeof value === "string") value = value.replace(/,/g, "").trim();
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const clamp = (value, min = 0, max = 1) =>
    Math.min(max, Math.max(min, n(value)));

  const trimFixed = (value, digits = 2) => {
    const str = n(value).toFixed(digits);
    return str.replace(/\.?0+$/, "");
  };

  const fmtNum = (value) => {
    const num = n(value);
    const abs = Math.abs(num);
    const sign = num < 0 ? "-" : "";

    if (abs >= 1e12) return sign + trimFixed(abs / 1e12, 2) + "T";
    if (abs >= 1e9) return sign + trimFixed(abs / 1e9, 2) + "B";
    if (abs >= 1e6) return sign + trimFixed(abs / 1e6, 2) + "M";
    if (abs >= 1e3) return sign + trimFixed(abs / 1e3, 2) + "K";

    return num.toLocaleString();
  };

  const fmtFullNum = (value, digits = 0) => {
    const num = n(value);
    return num.toLocaleString(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  };

  const fmtUsd = (value) => `$ ${n(value).toFixed(2)}`;

  const fmtTurns = (value) => {
    const num = n(value);
    return Math.abs(num - Math.round(num)) < 1e-9
      ? String(Math.round(num))
      : num.toFixed(1);
  };

  const pad2 = (value) => String(value).padStart(2, "0");

  const dateKeyFromMs = (ms) => {
    const d = new Date(ms);
    if (!Number.isFinite(d.getTime())) return "";

    if (CONFIG.USE_UTC_DAY) return d.toISOString().slice(0, 10);

    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  };

  const dayStartMs = (dateKey) => {
    const [year, month, day] = String(dateKey || "")
      .slice(0, 10)
      .split("-")
      .map(Number);

    if (!year || !month || !day) return NaN;

    return CONFIG.USE_UTC_DAY
      ? Date.UTC(year, month - 1, day)
      : new Date(year, month - 1, day).getTime();
  };

  const addDays = (dateKey, days) => {
    const ms = dayStartMs(dateKey);
    if (!Number.isFinite(ms)) return "";
    return dateKeyFromMs(ms + days * CONFIG.DAY_MS);
  };

  const formatDateTime = (ms) => {
    const d = new Date(ms);
    if (!Number.isFinite(d.getTime())) return "未知";

    return d.toLocaleString(undefined, {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  const formatDuration = (seconds) => {
    const s = n(seconds);
    if (!s) return "当前周期";

    const days = s / 86400;
    if (days >= 1) {
      const rounded = Math.round(days);
      return Math.abs(days - rounded) < 1e-6
        ? `${rounded} 天周期`
        : `${days.toFixed(1)} 天周期`;
    }

    const hours = s / 3600;
    return `${trimFixed(hours, 1)} 小时周期`;
  };

  const formatPercentFromRatio = (ratio) => {
    const pct = clamp(ratio) * 100;
    return `${pct >= 10 ? pct.toFixed(1) : pct.toFixed(2)}%`;
  };

  const firstFinite = (...values) => {
    for (const value of values) {
      const num = n(value);
      if (Number.isFinite(num) && num > 0) return num;
    }
    return 0;
  };

  const tokenParts = (obj = {}) => ({
    uncachedInput: n(obj.uncached_text_input_tokens),
    cachedInput: n(obj.cached_text_input_tokens),
    output: n(obj.text_output_tokens),
  });

  const tokenTotal = (obj = {}) => {
    const total = n(obj.text_total_tokens);
    const parts = tokenParts(obj);
    const derived = parts.uncachedInput + parts.cachedInput + parts.output;
    return total > 0 ? total : derived;
  };

  const normalizeModelName = (value) =>
    String(value || "")
      .trim()
      .toLowerCase()
      .replace(/[_\s]+/g, "-");

  const getBreakdownName = (item = {}, keyName = "") => {
    if (keyName === "models") {
      return item.model || item.model_id || item.name || item.id || "UNKNOWN";
    }

    if (keyName === "clients") {
      return item.client_id || item.client || item.name || item.id || "UNKNOWN";
    }

    return (
      item.client_id ||
      item.model ||
      item.name ||
      item.id ||
      item[keyName.replace(/s$/, "_id")] ||
      "UNKNOWN"
    );
  };

  const getModelPricing = (modelName) => {
    const normalized = normalizeModelName(modelName);
    const matched = MODEL_PRICE_MATCHERS.find(([, pattern]) =>
      pattern.test(normalized),
    );
    const key = matched?.[0] || CONFIG.DEFAULT_MODEL_PRICE_KEY;

    return {
      key,
      price: CONFIG.MODEL_PRICE_PER_1M[key],
      fallback: !matched,
    };
  };

  const estimateTokenPartsUsd = (parts, price) =>
    (n(parts?.uncachedInput) / 1_000_000) * price.uncachedInput +
    (n(parts?.cachedInput) / 1_000_000) * price.cachedInput +
    (n(parts?.output) / 1_000_000) * price.output;

  const estimateTokensUsd = (obj = {}, pricing = null) => {
    const price = pricing?.price ||
      CONFIG.MODEL_PRICE_PER_1M[CONFIG.DEFAULT_MODEL_PRICE_KEY];
    return estimateTokenPartsUsd(tokenParts(obj), price);
  };

  const estimateDailyRowUsd = (row = {}) => {
    const totals = row.totals || row || {};
    const totalParts = tokenParts(totals);
    const coveredParts = {
      uncachedInput: 0,
      cachedInput: 0,
      output: 0,
    };

    const modelItems = asArray(row.models).filter((item) => {
      const parts = tokenParts(item);
      return parts.uncachedInput + parts.cachedInput + parts.output > CONFIG.EPS;
    });

    if (modelItems.length === 0) return estimateTokensUsd(totals);

    let estimatedUsd = 0;

    modelItems.forEach((item) => {
      const parts = tokenParts(item);
      const modelName = getBreakdownName(item, "models");
      estimatedUsd += estimateTokenPartsUsd(
        parts,
        getModelPricing(modelName).price,
      );
      coveredParts.uncachedInput += parts.uncachedInput;
      coveredParts.cachedInput += parts.cachedInput;
      coveredParts.output += parts.output;
    });

    const residualParts = {
      uncachedInput: Math.max(
        0,
        totalParts.uncachedInput - coveredParts.uncachedInput,
      ),
      cachedInput: Math.max(
        0,
        totalParts.cachedInput - coveredParts.cachedInput,
      ),
      output: Math.max(0, totalParts.output - coveredParts.output),
    };

    const fallbackPrice =
      CONFIG.MODEL_PRICE_PER_1M[CONFIG.DEFAULT_MODEL_PRICE_KEY];
    return estimatedUsd + estimateTokenPartsUsd(residualParts, fallbackPrice);
  };

  async function getAccessToken() {
    const bootstrapData =
      document.getElementById("client-bootstrap")?.textContent || "";

    const jwtCandidates =
      bootstrapData.match(/eyJ[\w-]*\.[\w-]+\.[\w-]+/g) ||
      bootstrapData.match(/[\w-]{30,}\.[\w-]{30,}\.[\w-]{30,}/g) ||
      [];

    if (jwtCandidates.length > 0) return jwtCandidates[0];

    try {
      const res = await fetch("/api/auth/session", {
        credentials: "include",
        cache: "no-store",
      });

      if (!res.ok) return null;

      const session = await res.json();

      return (
        session?.accessToken ||
        session?.access_token ||
        session?.token ||
        null
      );
    } catch {
      return null;
    }
  }

  async function apiGet(path, token) {
    const res = await fetch(path, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      credentials: "include",
      cache: "no-store",
    });

    const text = await res.text();
    let json = null;

    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        // ignore parse error
      }
    }

    if (!res.ok) {
      const detail =
        json?.detail ||
        json?.message ||
        (typeof json?.error === "string" ? json.error : json?.error?.message) ||
        text.slice(0, 200);

      throw new Error(
        `${res.status} ${res.statusText}${detail ? `: ${detail}` : ""}`,
      );
    }

    if (json === null) throw new Error("接口返回的不是 JSON。");

    return json;
  }

  const getRateLimitObject = (usage = {}) =>
    usage?.rate_limit ||
    usage?.rateLimit ||
    usage?.rate_limits ||
    usage?.rateLimits ||
    usage?.limits ||
    {};

  const looksLikeWindow = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;

    return [
      "limit_window_seconds",
      "window_seconds",
      "duration_seconds",
      "reset_at",
      "resetAt",
      "used_percent",
      "usedPercent",
      "used_ratio",
      "remaining",
      "limit",
      "used",
    ].some((key) => Object.prototype.hasOwnProperty.call(value, key));
  };

  const rateLimitWindows = (rateLimit = {}) => {
    const windows = [];

    if (Array.isArray(rateLimit?.windows)) {
      rateLimit.windows.forEach((value, index) => {
        if (looksLikeWindow(value)) {
          windows.push({
            ...value,
            _window_name: value.name || value.window_name || `window_${index + 1}`,
          });
        }
      });
    }

    Object.entries(rateLimit || {}).forEach(([key, value]) => {
      if (looksLikeWindow(value)) {
        windows.push({
          ...value,
          _window_name: key,
        });
      }
    });

    return windows;
  };

  const getWindowDurationSeconds = (quotaWindow) =>
    firstFinite(
      quotaWindow?.limit_window_seconds,
      quotaWindow?.window_seconds,
      quotaWindow?.duration_seconds,
    );

  const pickQuotaWindow = (rateLimit = {}) => {
    const windows = rateLimitWindows(rateLimit);

    if (windows.length === 0 && looksLikeWindow(rateLimit)) {
      return { ...rateLimit, _window_name: "rate_limit" };
    }

    if (windows.length === 0) return null;

    const withDuration = windows.filter((w) => getWindowDurationSeconds(w) > 0);

    if (withDuration.length > 0) {
      return [...withDuration].sort(
        (a, b) =>
          Math.abs(getWindowDurationSeconds(a) - CONFIG.TARGET_WINDOW_SECONDS) -
          Math.abs(getWindowDurationSeconds(b) - CONFIG.TARGET_WINDOW_SECONDS),
      )[0];
    }

    if (rateLimit.secondary_window) {
      return { ...rateLimit.secondary_window, _window_name: "secondary_window" };
    }

    return windows[0];
  };

  const toEpochMs = (secondsOrMsOrIso) => {
    if (typeof secondsOrMsOrIso === "string") {
      const trimmed = secondsOrMsOrIso.trim();
      const numeric = Number(trimmed);

      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric > 1e12 ? numeric : numeric * 1000;
      }

      const parsed = Date.parse(trimmed);
      return Number.isFinite(parsed) ? parsed : NaN;
    }

    const value = n(secondsOrMsOrIso);
    if (!value) return NaN;

    return value > 1e12 ? value : value * 1000;
  };

  const cycleRangeFromWindow = (quotaWindow) => {
    const resetMs = toEpochMs(
      quotaWindow?.reset_at ||
        quotaWindow?.resetAt ||
        quotaWindow?.resets_at ||
        quotaWindow?.end_at ||
        quotaWindow?.window_end,
    );

    const durationMs = getWindowDurationSeconds(quotaWindow) * 1000;
    const nowMs = Date.now();

    if (Number.isFinite(resetMs) && durationMs > 0) {
      return {
        cycleStartMs: resetMs - durationMs,
        cycleEndMs: resetMs,
      };
    }

    return {
      cycleStartMs: nowMs - CONFIG.TARGET_WINDOW_SECONDS * 1000,
      cycleEndMs: nowMs + CONFIG.TARGET_WINDOW_SECONDS * 1000,
    };
  };

  const usedRatioFromWindow = (quotaWindow) => {
    if (!quotaWindow) return 0;

    const rawRatio = firstFinite(
      quotaWindow.used_ratio,
      quotaWindow.usedRatio,
      quotaWindow.fraction_used,
    );

    if (rawRatio > 0) return clamp(rawRatio);

    const rawPercent = firstFinite(
      quotaWindow.used_percent,
      quotaWindow.usedPercent,
    );

    if (rawPercent > 0) return clamp(rawPercent / 100);

    const limit = firstFinite(
      quotaWindow.limit,
      quotaWindow.credit_limit,
      quotaWindow.credits_limit,
      quotaWindow.max,
    );

    const used = firstFinite(
      quotaWindow.used,
      quotaWindow.used_credits,
      quotaWindow.consumed,
      quotaWindow.consumed_credits,
    );

    const remaining = firstFinite(
      quotaWindow.remaining,
      quotaWindow.remaining_credits,
      quotaWindow.available,
      quotaWindow.available_credits,
    );

    if (limit > 0 && used > 0) return clamp(used / limit);
    if (limit > 0 && remaining > 0) return clamp((limit - remaining) / limit);

    return 0;
  };

  const usedPercentTextFromWindow = (quotaWindow) => {
    const rawPercent = firstFinite(
      quotaWindow?.used_percent,
      quotaWindow?.usedPercent,
    );

    if (rawPercent > 0) return `${trimFixed(rawPercent, 2)}%`;

    const ratio = usedRatioFromWindow(quotaWindow);
    return ratio > CONFIG.EPS ? formatPercentFromRatio(ratio) : "未知";
  };

  const extractDailyList = (payload) => {
    if (Array.isArray(payload)) return payload;

    const candidates = [
      payload?.data,
      payload?.items,
      payload?.results,
      payload?.daily,
      payload?.daily_usage,
      payload?.dailyWorkspaceUsageCounts,
      payload?.daily_workspace_usage_counts,
      payload?.workspace_usage_counts,
    ];

    for (const candidate of candidates) {
      if (Array.isArray(candidate)) return candidate;
    }

    return [];
  };

  const getRowDateKey = (row) => String(row?.date || "").slice(0, 10);

  const normalizeDailyRows = (rows) =>
    asArray(rows)
      .map((row) => {
        const dateKey = getRowDateKey(row);
        return {
          ...row,
          _dateKey: dateKey,
          _displayDate: dateKey,
          _sortTs: dayStartMs(dateKey),
        };
      })
      .filter((row) => row._dateKey && Number.isFinite(row._sortTs));

  const filterRowsByRange = (rows, startDate, endDate) =>
    asArray(rows).filter((row) => {
      const dateKey = getRowDateKey(row);
      return dateKey >= startDate && dateKey <= endDate;
    });

  const getStats = (list) => {
    return asArray(list).reduce(
      (acc, row) => {
        const totals = row.totals || row || {};
        const parts = tokenParts(totals);

        acc.credits += n(totals.credits);
        acc.turns += n(totals.turns);
        acc.threads += n(totals.threads);
        acc.tokens += tokenTotal(totals);
        acc.uncachedInputTokens += parts.uncachedInput;
        acc.cachedInputTokens += parts.cachedInput;
        acc.outputTokens += parts.output;
        acc.estimatedUsd += estimateDailyRowUsd(row);

        return acc;
      },
      {
        credits: 0,
        turns: 0,
        threads: 0,
        tokens: 0,
        uncachedInputTokens: 0,
        cachedInputTokens: 0,
        outputTokens: 0,
        estimatedUsd: 0,
      },
    );
  };

  const aggregateBreakdown = (list, keyName) => {
    const map = new Map();

    asArray(list).forEach((row) => {
      asArray(row?.[keyName]).forEach((item) => {
        const name = getBreakdownName(item, keyName);
        const pricing =
          keyName === "models"
            ? getModelPricing(name)
            : getModelPricing(CONFIG.DEFAULT_MODEL_PRICE_KEY);

        const current =
          map.get(name) || {
            name,
            credits: 0,
            turns: 0,
            threads: 0,
            tokens: 0,
            uncachedInputTokens: 0,
            cachedInputTokens: 0,
            outputTokens: 0,
            estimatedUsd: 0,
            pricingKey: pricing.key,
            usesFallbackPricing: pricing.fallback,
          };

        const parts = tokenParts(item);

        current.credits += n(item.credits);
        current.turns += n(item.turns);
        current.threads += n(item.threads);
        current.tokens += tokenTotal(item);
        current.uncachedInputTokens += parts.uncachedInput;
        current.cachedInputTokens += parts.cachedInput;
        current.outputTokens += parts.output;
        current.estimatedUsd += estimateTokensUsd(item, pricing);
        current.usesFallbackPricing ||= pricing.fallback;

        map.set(name, current);
      });
    });

    return [...map.values()]
      .filter(
        (item) =>
          item.estimatedUsd > CONFIG.EPS ||
          item.tokens > CONFIG.EPS ||
          item.turns > CONFIG.EPS ||
          item.threads > CONFIG.EPS ||
          item.credits > CONFIG.EPS,
      )
      .sort(
        (a, b) =>
          b.estimatedUsd - a.estimatedUsd ||
          b.tokens - a.tokens ||
          b.turns - a.turns ||
          b.credits - a.credits,
      );
  };

  const validateRange = (startDate, endDate) => {
    if (!startDate || !endDate) {
      throw new Error("请选择开始日期和结束日期。");
    }

    const startMs = dayStartMs(startDate);
    const endMs = dayStartMs(endDate);

    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      throw new Error("日期格式不正确。");
    }

    if (startMs > endMs) {
      throw new Error("开始日期不能晚于结束日期。");
    }

    const days = Math.floor((endMs - startMs) / CONFIG.DAY_MS) + 1;

    if (days > CONFIG.MAX_RANGE_DAYS) {
      throw new Error(`单次最多查询 ${CONFIG.MAX_RANGE_DAYS} 天。`);
    }

    return { startMs, endMs, days };
  };

  const getDefaultRange = () => {
    const today = dateKeyFromMs(Date.now());
    const startDate = addDays(today, -(CONFIG.DEFAULT_RANGE_DAYS - 1));
    return { startDate, endDate: today };
  };

  const buildCsv = (rows) => {
    const header = [
      "date",
      "estimated_standard_api_usd",
      "total_tokens",
      "uncached_input_tokens",
      "cached_input_tokens",
      "output_tokens",
      "turns",
      "threads",
      "credits",
    ];

    const csvEscape = (value) => {
      const str = String(value ?? "");
      if (/[",\n\r]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
      return str;
    };

    const lines = [header.join(",")];

    [...asArray(rows)]
      .sort((a, b) => a._sortTs - b._sortTs)
      .forEach((row) => {
        const totals = row.totals || row || {};
        const parts = tokenParts(totals);

        lines.push(
          [
            row._displayDate || row.date || "",
            estimateDailyRowUsd(row).toFixed(6),
            tokenTotal(totals),
            parts.uncachedInput,
            parts.cachedInput,
            parts.output,
            n(totals.turns),
            n(totals.threads),
            n(totals.credits),
          ]
            .map(csvEscape)
            .join(","),
        );
      });

    return lines.join("\n");
  };

  const buildDetailText = (rows) => {
    const lines = [
      [
        "日期",
        "标准API估算",
        "总Tokens",
        "未缓存输入",
        "缓存输入",
        "输出",
        "轮数",
        "线程数",
        "Credits",
      ].join("\t"),
    ];

    [...asArray(rows)]
      .sort((a, b) => b._sortTs - a._sortTs)
      .forEach((row) => {
        const totals = row.totals || row || {};
        const parts = tokenParts(totals);

        lines.push(
          [
            row._displayDate || row.date || "",
            fmtUsd(estimateDailyRowUsd(row)),
            fmtFullNum(tokenTotal(totals)),
            fmtFullNum(parts.uncachedInput),
            fmtFullNum(parts.cachedInput),
            fmtFullNum(parts.output),
            fmtTurns(totals.turns),
            fmtTurns(totals.threads),
            fmtFullNum(totals.credits),
          ].join("\t"),
        );
      });

    return lines.join("\n");
  };

  const downloadTextFile = (filename, content, mimeType) => {
    const blob = new Blob([content], {
      type: mimeType || "text/plain;charset=utf-8",
    });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  };

  const createHostAndShadow = () => {
    let host = document.getElementById("codex-compass-shadow-host");

    if (!host) {
      host = document.createElement("div");
      host.id = "codex-compass-shadow-host";
      document.body.appendChild(host);
    }

    if (!host.shadowRoot) {
      state.shadowRoot = host.attachShadow({ mode: "open" });
    } else {
      state.shadowRoot = host.shadowRoot;
    }

    return state.shadowRoot;
  };

  const css = `
    :host {
      all: initial;
    }

    * {
      box-sizing: border-box;
    }

    .panel {
      position: fixed;
      top: 12px;
      left: 50%;
      transform: translateX(-50%);
      width: min(1380px, calc(100vw - 24px));
      height: calc(100vh - 24px);
      max-height: calc(100vh - 24px);
      z-index: 2147483647;
      background: #ffffff;
      color: #111827;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      box-shadow: 0 14px 60px rgba(0, 0, 0, 0.32);
      padding: 18px;
      overflow: auto;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
      font-size: 13px;
      line-height: 1.45;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
      color: #111827;
    }

    .subtitle {
      margin-top: 4px;
      color: #6b7280;
      font-size: 12px;
    }

    .close-btn {
      border: none;
      background: transparent;
      color: #6b7280;
      cursor: pointer;
      font-size: 28px;
      line-height: 1;
      padding: 0;
    }

    .close-btn:hover {
      color: #111827;
    }

    .range-panel {
      display: flex;
      flex-wrap: wrap;
      align-items: end;
      gap: 10px;
      padding: 12px;
      margin-bottom: 14px;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
    }

    .range-title {
      width: 100%;
      font-weight: 700;
      color: #374151;
    }

    label {
      display: flex;
      flex-direction: column;
      gap: 5px;
      color: #4b5563;
      font-size: 12px;
    }

    input[type="date"] {
      height: 34px;
      min-width: 155px;
      padding: 4px 8px;
      border: 1px solid #d1d5db;
      border-radius: 7px;
      background: #fff;
      color: #111827;
      font: inherit;
    }

    button {
      font: inherit;
    }

    .primary-btn,
    .secondary-btn {
      height: 34px;
      border-radius: 7px;
      padding: 0 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 700;
    }

    .primary-btn {
      border: none;
      background: #10a37f;
      color: #fff;
    }

    .secondary-btn {
      background: #fff;
      color: #374151;
      border: 1px solid #d1d5db;
    }

    .primary-btn:disabled,
    .secondary-btn:disabled {
      opacity: 0.6;
      cursor: wait;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 12px;
      margin-bottom: 14px;
    }

    .card {
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #f9fafb;
      min-width: 0;
    }

    .card.highlight {
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .card-label {
      color: #6b7280;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .card-value {
      color: #059669;
      font-weight: 800;
      font-size: 16px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .note {
      padding: 9px 11px;
      margin-bottom: 14px;
      border-radius: 9px;
      border: 1px solid #e5e7eb;
      background: #f8fafc;
      color: #6b7280;
      font-size: 12px;
    }

    .note.pricing {
      color: #065f46;
      background: #ecfdf5;
      border-color: #a7f3d0;
    }

    .note a {
      color: inherit;
      font-weight: 700;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin: 14px 0 7px;
    }

    .section-title {
      font-weight: 800;
      color: #111827;
      font-size: 14px;
    }

    .muted {
      color: #6b7280;
      font-weight: 400;
      margin-left: 6px;
      font-size: 12px;
    }

    .hint {
      color: #6b7280;
      font-size: 11px;
      white-space: nowrap;
    }

    .table-box {
      width: 100%;
      max-width: 100%;
      max-height: 560px;
      overflow: auto;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #fff;
      margin-bottom: 16px;
    }

    table {
      border-collapse: collapse;
      width: 100%;
      min-width: 1080px;
      background: #fff;
      color: #111827;
      font-size: 12px;
      table-layout: auto;
    }

    .breakdown-table {
      min-width: 1220px;
    }

    thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: #f3f4f6;
      color: #374151;
      font-weight: 800;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
      padding: 8px;
      white-space: nowrap;
    }

    tbody td {
      padding: 8px;
      border-bottom: 1px solid #f3f4f6;
      white-space: nowrap;
      color: #374151;
      max-width: 260px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    tfoot td {
      position: sticky;
      bottom: 0;
      z-index: 1;
      padding: 8px;
      border-top: 2px solid #e5e7eb;
      background: #f9fafb;
      font-weight: 800;
      white-space: nowrap;
    }

    .money {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      color: #059669;
      font-weight: 800;
    }

    .num {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    }

    .empty {
      padding: 16px;
      text-align: center;
      color: #6b7280;
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-bottom: 16px;
    }

    .text-dump {
      margin-bottom: 16px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      background: #f8fafc;
      padding: 10px;
    }

    .text-dump summary {
      cursor: pointer;
      font-weight: 800;
      color: #374151;
    }

    textarea {
      width: 100%;
      height: 260px;
      margin-top: 10px;
      padding: 10px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #111827;
      color: #e5e7eb;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      white-space: pre;
      overflow: auto;
      resize: vertical;
    }

    .raw-json-box {
      margin: 8px 0 4px;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 10px;
      background: #f8fafc;
      font-size: 12px;
    }

    .raw-json-box summary {
      cursor: pointer;
      font-weight: 800;
      color: #374151;
    }

    pre {
      max-height: 460px;
      overflow: auto;
      background: #111827;
      color: #e5e7eb;
      padding: 12px;
      border-radius: 8px;
      font-size: 11px;
      line-height: 1.45;
      margin: 10px 0 0;
      white-space: pre;
    }

    .loading {
      padding: 20px;
      color: #374151;
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      margin-top: 12px;
    }

    .error {
      padding: 12px;
      color: #991b1b;
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      margin-top: 12px;
      white-space: pre-wrap;
    }

    @media (max-width: 900px) {
      .cards {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
    }

    @media (max-width: 640px) {
      .panel {
        top: 8px;
        width: calc(100vw - 16px);
        height: calc(100vh - 16px);
        padding: 14px;
      }

      .cards {
        grid-template-columns: 1fr;
      }

      .range-panel {
        align-items: stretch;
      }

      label,
      input[type="date"],
      .primary-btn,
      .secondary-btn {
        width: 100%;
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
      }
    }
  `;

  const renderCard = (label, value, highlight = false) => `
    <div class="card ${highlight ? "highlight" : ""}">
      <div class="card-label">${escapeHtml(label)}</div>
      <div class="card-value" title="${escapeHtml(value)}">${escapeHtml(value)}</div>
    </div>
  `;

  const renderDailyTable = (rows, stats) => {
    const sortedRows = [...asArray(rows)].sort((a, b) => b._sortTs - a._sortTs);

    const body =
      sortedRows.length === 0
        ? `<tr><td colspan="9">暂无数据</td></tr>`
        : sortedRows
            .map((row) => {
              const totals = row.totals || row || {};
              const parts = tokenParts(totals);

              return `
                <tr>
                  <td>${escapeHtml(row._displayDate || row.date || "")}</td>
                  <td class="money">${fmtUsd(estimateDailyRowUsd(row))}</td>
                  <td class="num" title="${escapeHtml(fmtFullNum(tokenTotal(totals)))}">${fmtNum(tokenTotal(totals))}</td>
                  <td class="num" title="${escapeHtml(fmtFullNum(parts.uncachedInput))}">${fmtNum(parts.uncachedInput)}</td>
                  <td class="num" title="${escapeHtml(fmtFullNum(parts.cachedInput))}">${fmtNum(parts.cachedInput)}</td>
                  <td class="num" title="${escapeHtml(fmtFullNum(parts.output))}">${fmtNum(parts.output)}</td>
                  <td>${fmtTurns(totals.turns)}</td>
                  <td>${fmtTurns(totals.threads)}</td>
                  <td class="num">${fmtNum(totals.credits)}</td>
                </tr>
              `;
            })
            .join("");

    return `
      <div class="section-header">
        <div class="section-title">
          📅 明细数据
          <span class="muted">共 ${sortedRows.length} 行，完整展示</span>
        </div>
        <div class="hint">表格区域可上下、左右滚动</div>
      </div>

      <div class="table-box">
        <table>
          <thead>
            <tr>
              <th>日期</th>
              <th>标准 API 估算</th>
              <th>总 Tokens</th>
              <th>未缓存输入</th>
              <th>缓存输入</th>
              <th>输出</th>
              <th>轮数</th>
              <th>线程数</th>
              <th>Credits</th>
            </tr>
          </thead>
          <tbody>
            ${body}
          </tbody>
          <tfoot>
            <tr>
              <td>合计</td>
              <td class="money">${fmtUsd(stats.estimatedUsd)}</td>
              <td class="num" title="${escapeHtml(fmtFullNum(stats.tokens))}">${fmtNum(stats.tokens)}</td>
              <td class="num" title="${escapeHtml(fmtFullNum(stats.uncachedInputTokens))}">${fmtNum(stats.uncachedInputTokens)}</td>
              <td class="num" title="${escapeHtml(fmtFullNum(stats.cachedInputTokens))}">${fmtNum(stats.cachedInputTokens)}</td>
              <td class="num" title="${escapeHtml(fmtFullNum(stats.outputTokens))}">${fmtNum(stats.outputTokens)}</td>
              <td>${fmtTurns(stats.turns)}</td>
              <td>${fmtTurns(stats.threads)}</td>
              <td class="num">${fmtNum(stats.credits)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    `;
  };

  const renderBreakdown = (title, rows, note = "") => {
    const list = asArray(rows);

    if (list.length === 0) {
      return `
        <div class="section-header">
          <div class="section-title">
            ${escapeHtml(title)}
            ${note ? `<span class="muted">${escapeHtml(note)}</span>` : ""}
          </div>
        </div>
        <div class="empty">暂无数据</div>
      `;
    }

    const listedUsd = list.reduce((sum, row) => sum + row.estimatedUsd, 0);
    const listedTokens = list.reduce((sum, row) => sum + row.tokens, 0);
    const listedTurns = list.reduce((sum, row) => sum + row.turns, 0);
    const listedThreads = list.reduce((sum, row) => sum + row.threads, 0);
    const listedCredits = list.reduce((sum, row) => sum + row.credits, 0);
    const hasTokenParts = (row) =>
      row.uncachedInputTokens + row.cachedInputTokens + row.outputTokens >
      CONFIG.EPS;
    const hasIncompleteCostRows = list.some(
      (row) =>
        !hasTokenParts(row) &&
        (row.tokens > CONFIG.EPS ||
          row.turns > CONFIG.EPS ||
          row.credits > CONFIG.EPS),
    );
    const hasIncompleteTotalTokenRows = list.some(
      (row) =>
        row.tokens <= CONFIG.EPS &&
        (row.turns > CONFIG.EPS || row.credits > CONFIG.EPS),
    );
    const ratioBase = listedUsd > CONFIG.EPS && !hasIncompleteCostRows
      ? "cost"
      : listedTokens > CONFIG.EPS && !hasIncompleteTotalTokenRows
        ? "tokens"
        : listedTurns > CONFIG.EPS
          ? "turns"
          : listedCredits > CONFIG.EPS
            ? "credits"
            : "none";
    const ratioDenominator =
      ratioBase === "cost"
        ? listedUsd
        : ratioBase === "tokens"
          ? listedTokens
          : ratioBase === "turns"
            ? listedTurns
            : ratioBase === "credits"
              ? listedCredits
              : 0;
    const ratioLabel = {
      cost: "金额",
      tokens: "Tokens",
      turns: "轮数",
      credits: "Credits",
      none: "无数据",
    }[ratioBase];

    const body = list
      .map((row) => {
        const rowHasTokenParts = hasTokenParts(row);
        const rowHasTokens = row.tokens > CONFIG.EPS;
        const ratioValue =
          ratioBase === "cost"
            ? row.estimatedUsd
            : ratioBase === "tokens"
              ? row.tokens
              : ratioBase === "turns"
                ? row.turns
                : ratioBase === "credits"
                  ? row.credits
                  : 0;
        const ratio =
          ratioDenominator > CONFIG.EPS ? ratioValue / ratioDenominator : 0;

        return `
          <tr>
            <td title="${escapeHtml(row.name)}">${escapeHtml(row.name)}</td>
            <td class="money">${rowHasTokenParts ? fmtUsd(row.estimatedUsd) : "—"}</td>
            <td class="num" title="${rowHasTokens ? escapeHtml(fmtFullNum(row.tokens)) : ""}">${rowHasTokens ? fmtNum(row.tokens) : "—"}</td>
            <td class="num" title="${rowHasTokenParts ? escapeHtml(fmtFullNum(row.uncachedInputTokens)) : ""}">${rowHasTokenParts ? fmtNum(row.uncachedInputTokens) : "—"}</td>
            <td class="num" title="${rowHasTokenParts ? escapeHtml(fmtFullNum(row.cachedInputTokens)) : ""}">${rowHasTokenParts ? fmtNum(row.cachedInputTokens) : "—"}</td>
            <td class="num" title="${rowHasTokenParts ? escapeHtml(fmtFullNum(row.outputTokens)) : ""}">${rowHasTokenParts ? fmtNum(row.outputTokens) : "—"}</td>
            <td>${listedTurns > CONFIG.EPS ? fmtTurns(row.turns) : "—"}</td>
            <td>${listedThreads > CONFIG.EPS ? fmtTurns(row.threads) : "—"}</td>
            <td class="num">${listedCredits > CONFIG.EPS ? fmtNum(row.credits) : "—"}</td>
            <td>${formatPercentFromRatio(ratio)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="section-header">
        <div class="section-title">
          ${escapeHtml(title)}
          <span class="muted">共 ${list.length} 行，完整展示</span>
          ${note ? `<span class="muted">${escapeHtml(note)}</span>` : ""}
        </div>
        <div class="hint">表格区域可上下、左右滚动</div>
      </div>

      <div class="table-box">
        <table class="breakdown-table">
          <thead>
            <tr>
              <th>名称</th>
              <th>标准 API 估算</th>
              <th>Tokens</th>
              <th>未缓存输入</th>
              <th>缓存输入</th>
              <th>输出</th>
              <th>轮数</th>
              <th>线程数</th>
              <th>Credits</th>
              <th>占比（${escapeHtml(ratioLabel)}）</th>
            </tr>
          </thead>
          <tbody>
            ${body}
          </tbody>
        </table>
      </div>
    `;
  };

  const renderPanel = ({ error = "" } = {}) => {
    const shadow = createHostAndShadow();

    const selectedRows = filterRowsByRange(
      state.dailyList,
      state.selectedStartDate,
      state.selectedEndDate,
    );

    const stats = getStats(selectedRows);
    const clientRows = aggregateBreakdown(selectedRows, "clients");
    const modelRows = aggregateBreakdown(selectedRows, "models");

    const quotaWindow = state.quotaWindow;
    const usedRatio = usedRatioFromWindow(quotaWindow);
    const usedPercentText = usedPercentTextFromWindow(quotaWindow);

    const periodName = formatDuration(getWindowDurationSeconds(quotaWindow));
    const windowName = quotaWindow?._window_name || "unknown_window";

    const estCycleUsd =
      usedRatio > CONFIG.EPS && stats.estimatedUsd > 0
        ? stats.estimatedUsd / usedRatio
        : NaN;

    const estCycleTokens =
      usedRatio > CONFIG.EPS && stats.tokens > 0
        ? stats.tokens / usedRatio
        : NaN;

    const detailText = buildDetailText(selectedRows);
    const fallbackModelNames = modelRows
      .filter((row) => row.usesFallbackPricing && row.tokens > CONFIG.EPS)
      .map((row) => row.name);

    shadow.innerHTML = `
      <style>${css}</style>

      <div class="panel">
        <div class="header">
          <div>
            <div class="title">📊 Codex 配额深度分析 V2.5.1</div>
            <div class="subtitle">
              当前额度窗口：
              ${escapeHtml(periodName)}
              · ${escapeHtml(windowName)}
              · ${escapeHtml(formatDateTime(state.cycleStartMs))}
              →
              ${escapeHtml(formatDateTime(state.cycleEndMs))}
            </div>
          </div>
          <button class="close-btn" id="closeBtn" title="关闭">×</button>
        </div>

        <div class="range-panel">
          <div class="range-title">选择查询时间段</div>

          <label>
            开始日期
            <input id="startDate" type="date" value="${escapeHtml(state.selectedStartDate)}" />
          </label>

          <label>
            结束日期
            <input id="endDate" type="date" value="${escapeHtml(state.selectedEndDate)}" />
          </label>

          <button class="primary-btn" id="queryBtn" ${state.loading ? "disabled" : ""}>
            ${state.loading ? "查询中..." : "查询"}
          </button>

          <button class="secondary-btn" id="cycleBtn" ${state.loading ? "disabled" : ""}>本周期</button>
          <button class="secondary-btn" id="sevenBtn" ${state.loading ? "disabled" : ""}>近 7 天</button>
          <button class="secondary-btn" id="thirtyBtn" ${state.loading ? "disabled" : ""}>近 30 天</button>
          <button class="secondary-btn" id="ninetyBtn" ${state.loading ? "disabled" : ""}>近 90 天</button>
          <button class="secondary-btn" id="csvBtn" ${state.loading ? "disabled" : ""}>导出 CSV</button>
          <button class="secondary-btn" id="jsonBtn" ${state.loading ? "disabled" : ""}>导出 JSON</button>
        </div>

        ${
          error
            ? `<div class="error">${escapeHtml(error)}</div>`
            : ""
        }

        ${
          state.loading
            ? `<div class="loading">正在读取 Codex 用量数据，请稍等...</div>`
            : `
              <div class="cards">
                ${renderCard("当前额度已用比例", usedPercentText)}
                ${renderCard("所选范围标准 API 估算金额", fmtUsd(stats.estimatedUsd), true)}
                ${renderCard("所选范围 Tokens", fmtNum(stats.tokens))}
                ${renderCard("所选范围轮数", fmtTurns(stats.turns))}
              </div>

              <div class="cards">
                ${renderCard("未缓存输入", fmtNum(stats.uncachedInputTokens))}
                ${renderCard("缓存输入", fmtNum(stats.cachedInputTokens))}
                ${renderCard("输出 Tokens", fmtNum(stats.outputTokens))}
                ${renderCard(
                  "按当前已用比例推算周期金额",
                  Number.isFinite(estCycleUsd) && estCycleUsd > 0
                    ? fmtUsd(estCycleUsd)
                    : "未知",
                  true,
                )}
              </div>

              <div class="note pricing">
                标准 API 价格映射（${escapeHtml(CONFIG.PRICING_AS_OF)}）：
                GPT-5.6 Sol $5 / $0.50 / $30，
                Terra $2.50 / $0.25 / $15，
                Luna $1 / $0.10 / $6
                （依次为每 1M 未缓存输入 / 缓存读取 / 输出 tokens）。
                每日合计优先按模型明细计价；缺失的模型明细、未覆盖 tokens
                ${
                  fallbackModelNames.length > 0
                    ? `及未识别模型 ${escapeHtml(fallbackModelNames.join("、"))}`
                    : "或未识别模型"
                }
                按 GPT-5.6 Sol 回退价估算。
                <a href="${escapeHtml(CONFIG.PRICING_SOURCE_URL)}" target="_blank" rel="noopener noreferrer">查看 OpenAI 官方模型目录</a>。
                接口未提供单次请求上下文长度、缓存写入量和处理模式，因此未计入长上下文、缓存写入、Fast/Priority、Batch/Flex 或区域处理的倍率。
                ${
                  Number.isFinite(estCycleTokens) && estCycleTokens > 0
                    ? `按当前已用比例推算周期 Tokens：${escapeHtml(fmtNum(estCycleTokens))}。`
                    : ""
                }
                这里是按公开 API token 单价估算，不等同于 Codex、订阅或内部额度的真实账单。
              </div>

              <div class="note">
                当前选择范围：
                <b>${escapeHtml(state.selectedStartDate)}</b>
                至
                <b>${escapeHtml(state.selectedEndDate)}</b>。
                明细、客户端分布、模型分布均完整展示接口返回的所有行。
              </div>

              ${renderDailyTable(selectedRows, stats)}

              <details class="text-dump">
                <summary>如果表格仍不可见，点这里查看纯文本明细</summary>
                <textarea readonly>${escapeHtml(detailText)}</textarea>
              </details>

              ${renderBreakdown(
                "🧭 客户端分布",
                clientRows,
                "客户端数据没有模型维度时，金额按 GPT-5.6 Sol 回退价估算。",
              )}

              ${renderBreakdown(
                "🤖 模型分布",
                modelRows,
                modelRows.some((row) => row.tokens > CONFIG.EPS)
                  ? "模型级 token 由接口直接提供；存在缺失行时，占比自动回退为轮数。"
                  : "当前接口只提供模型级轮数/线程数，无法准确拆分 Tokens 与金额；缺失项显示为 —，占比按轮数计算。",
              )}

              <details class="raw-json-box">
                <summary>查看原始 daily 接口 JSON</summary>
                <pre>${escapeHtml(JSON.stringify(state.rawDailyData, null, 2))}</pre>
              </details>
            `
        }
      </div>
    `;

    bindShadowEvents();
  };

  const loadRange = async (startDate, endDate) => {
    validateRange(startDate, endDate);

    state.loading = true;
    state.selectedStartDate = startDate;
    state.selectedEndDate = endDate;
    renderPanel();

    try {
      const token = state.token || (await getAccessToken());

      if (!token) {
        throw new Error("令牌获取失败，请确认已登录 ChatGPT，或刷新页面后重试。");
      }

      state.token = token;

      const usage = await apiGet("/backend-api/wham/usage", token);
      const rateLimit = getRateLimitObject(usage);
      const quotaWindow = pickQuotaWindow(rateLimit);
      const { cycleStartMs, cycleEndMs } = cycleRangeFromWindow(quotaWindow);

      const apiEndDate = addDays(endDate, 1);

      const params = new URLSearchParams({
        start_date: startDate,
        end_date: apiEndDate,
        group_by: "day",
      });

      const dailyData = await apiGet(
        `/backend-api/wham/analytics/daily-workspace-usage-counts?${params.toString()}`,
        token,
      );

      const dailyList = normalizeDailyRows(extractDailyList(dailyData));

      if (dailyList.length === 0) {
        console.warn("[Codex Quota Compass] Unexpected daily payload:", dailyData);
        throw new Error(
          "daily usage 接口没有返回可识别的数据数组。请打开“查看原始 daily 接口 JSON”或浏览器控制台检查接口返回。",
        );
      }

      state.usage = usage;
      state.quotaWindow = quotaWindow;
      state.cycleStartMs = cycleStartMs;
      state.cycleEndMs = cycleEndMs;
      state.rawDailyData = dailyData;
      state.dailyList = dailyList;
      state.selectedStartDate = startDate;
      state.selectedEndDate = endDate;
      state.loading = false;

      renderPanel();
    } catch (e) {
      console.error("[Codex Quota Compass]", e);
      state.loading = false;
      renderPanel({ error: e?.message || String(e) });
    }
  };

  const bindShadowEvents = () => {
    const shadow = state.shadowRoot;
    if (!shadow) return;

    const $ = (id) => shadow.getElementById(id);

    const closeBtn = $("closeBtn");
    if (closeBtn) {
      closeBtn.onclick = () => {
        const host = document.getElementById("codex-compass-shadow-host");
        if (host) host.remove();
        state.shadowRoot = null;
      };
    }

    const queryBtn = $("queryBtn");
    if (queryBtn) {
      queryBtn.onclick = () => {
        const startDate = $("startDate")?.value;
        const endDate = $("endDate")?.value;
        loadRange(startDate, endDate);
      };
    }

    const cycleBtn = $("cycleBtn");
    if (cycleBtn) {
      cycleBtn.onclick = () => {
        const startDate = dateKeyFromMs(state.cycleStartMs);
        const endDate = dateKeyFromMs(Math.min(Date.now(), state.cycleEndMs));

        if (!startDate || !endDate) {
          const fallback = getDefaultRange();
          loadRange(fallback.startDate, fallback.endDate);
          return;
        }

        loadRange(startDate, endDate);
      };
    }

    const sevenBtn = $("sevenBtn");
    if (sevenBtn) {
      sevenBtn.onclick = () => {
        const today = dateKeyFromMs(Date.now());
        loadRange(addDays(today, -6), today);
      };
    }

    const thirtyBtn = $("thirtyBtn");
    if (thirtyBtn) {
      thirtyBtn.onclick = () => {
        const today = dateKeyFromMs(Date.now());
        loadRange(addDays(today, -29), today);
      };
    }

    const ninetyBtn = $("ninetyBtn");
    if (ninetyBtn) {
      ninetyBtn.onclick = () => {
        const today = dateKeyFromMs(Date.now());
        loadRange(addDays(today, -89), today);
      };
    }

    const csvBtn = $("csvBtn");
    if (csvBtn) {
      csvBtn.onclick = () => {
        const rows = filterRowsByRange(
          state.dailyList,
          state.selectedStartDate,
          state.selectedEndDate,
        );

        downloadTextFile(
          `codex-usage-${state.selectedStartDate}-to-${state.selectedEndDate}.csv`,
          buildCsv(rows),
          "text/csv;charset=utf-8",
        );
      };
    }

    const jsonBtn = $("jsonBtn");
    if (jsonBtn) {
      jsonBtn.onclick = () => {
        downloadTextFile(
          `codex-usage-raw-${state.selectedStartDate}-to-${state.selectedEndDate}.json`,
          JSON.stringify(state.rawDailyData, null, 2),
          "application/json;charset=utf-8",
        );
      };
    }
  };

  const run = () => {
    const range = getDefaultRange();
    loadRange(range.startDate, range.endDate);
  };

  const mountButton = () => {
    if (document.getElementById("codex-compass-shadow-btn")) return;

    const btn = document.createElement("button");
    btn.id = "codex-compass-shadow-btn";
    btn.textContent = "📊 运行用量分析";

    btn.style.position = "fixed";
    btn.style.right = "20px";
    btn.style.bottom = "20px";
    btn.style.zIndex = "2147483646";
    btn.style.padding = "10px 18px";
    btn.style.border = "none";
    btn.style.borderRadius = "8px";
    btn.style.background = "#10a37f";
    btn.style.color = "#fff";
    btn.style.fontWeight = "700";
    btn.style.cursor = "pointer";
    btn.style.boxShadow = "0 4px 20px rgba(0,0,0,0.18)";
    btn.style.fontFamily =
      '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

    btn.onclick = run;

    document.body.appendChild(btn);
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountButton, { once: true });
  } else {
    mountButton();
  }
})();
