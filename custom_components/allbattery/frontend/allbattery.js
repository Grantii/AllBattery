function e(e, t) {
	let n = e.filter((e) => Number.isFinite(e.t) && Number.isFinite(e.v)).sort((e, t) => e.t - t.t), r = {
		status: "insufficient-data",
		percentPerHour: 0,
		hoursRemaining: null,
		spanHours: 0,
		sampleCount: n.length
	};
	if (n.length < 3) return r;
	let i = n[0], a = n[n.length - 1], o = (a.t - i.t) / 36e5;
	if (o < .25) return {
		...r,
		spanHours: o
	};
	let s = n.length, c = n.reduce((e, t) => e + t.t, 0) / s, l = n.reduce((e, t) => e + t.v, 0) / s, u = 0, d = 0;
	for (let e of n) {
		let t = e.t - c;
		u += t * (e.v - l), d += t * t;
	}
	if (d === 0) return {
		...r,
		spanHours: o
	};
	let f = u / d * 36e5, p = t ?? a.v;
	return f < -.01 ? {
		status: "discharging",
		percentPerHour: f,
		hoursRemaining: p > 0 ? p / -f : 0,
		spanHours: o,
		sampleCount: s
	} : f > .01 ? {
		status: "charging",
		percentPerHour: f,
		hoursRemaining: null,
		spanHours: o,
		sampleCount: s
	} : {
		status: "stable",
		percentPerHour: f,
		hoursRemaining: null,
		spanHours: o,
		sampleCount: s
	};
}
function t(e) {
	if (e === null || !Number.isFinite(e)) return "unbekannt";
	if (e <= 0) return "jetzt";
	let t = Math.round(e * 60), n = Math.floor(t / 1440), r = Math.floor(t % 1440 / 60), i = t % 60;
	return n > 0 ? r > 0 ? `${n} Tage ${r} h` : `${n} Tage` : r > 0 ? `${r} h ${i} min` : `${i} min`;
}
var n = [
	"critical",
	"warning",
	"good",
	"unknown"
], r = {
	critical: "Kritisch",
	warning: "Warnung",
	good: "Gut",
	unknown: "Unbekannt / Offline"
}, i = /batter(y|ie)|akku|battery_level/i, a = /* @__PURE__ */ new Set([
	"",
	"unknown",
	"unavailable",
	"none",
	"null"
]);
function o(e) {
	return a.has(e.trim().toLowerCase());
}
function s(e) {
	if (o(e)) return null;
	let t = Number.parseFloat(e.replace(",", "."));
	return Number.isFinite(t) ? t : null;
}
function c(e) {
	return e === null || !Number.isFinite(e) ? "unknown" : e < 10 ? "critical" : e < 20 ? "warning" : "good";
}
function l(e) {
	let t = e.entity_id.split(".")[0] ?? "", n = e.attributes ?? {};
	if (String(n.device_class ?? "").toLowerCase() === "battery" && (t === "sensor" || t === "binary_sensor")) return !0;
	let r = String(n.unit_of_measurement ?? "");
	return t === "sensor" && r === "%" && i.test(e.entity_id);
}
function u(e) {
	let t = e.attributes?.friendly_name;
	return typeof t == "string" && t.trim() !== "" ? t.trim() : e.entity_id;
}
function d(e, t, n = "") {
	let r = e.attributes ?? {}, i = e.entity_id.startsWith("binary_sensor.") ? "low" : "level", a;
	if (i === "low") {
		let t = e.state.trim().toLowerCase();
		a = t === "on" ? 0 : t === "off" ? 100 : null;
	} else a = s(e.state);
	return {
		entityId: e.entity_id,
		name: u(e),
		device: n,
		area: t,
		kind: i,
		rawState: e.state,
		level: a,
		unit: i === "level" ? String(r.unit_of_measurement ?? "%") : "",
		group: c(a),
		lastChanged: e.last_changed ?? e.last_updated ?? "",
		forecast: null
	};
}
function f(e) {
	let t = [];
	for (let n of e) {
		let e = Date.parse(n.last_changed ?? n.last_updated ?? ""), r = s(String(n.state ?? ""));
		Number.isFinite(e) && r !== null && t.push({
			t: e,
			v: r
		});
	}
	return t;
}
function p(t, n) {
	return t.kind === "level" ? {
		...t,
		forecast: e(n, t.level)
	} : t;
}
function m(e) {
	let t = {
		critical: 0,
		warning: 0,
		good: 0,
		unknown: 0
	};
	for (let n of e) t[n.group] += 1;
	return t;
}
function h(e, t) {
	let n = new Intl.Collator("de", {
		sensitivity: "base",
		numeric: !0
	}), r = [...e];
	switch (t) {
		case "name": return r.sort((e, t) => n.compare(e.name, t.name));
		case "area": return r.sort((e, t) => n.compare(e.area, t.area) || n.compare(e.name, t.name));
		default: return r.sort((e, t) => (e.level ?? Infinity) - (t.level ?? Infinity) || n.compare(e.name, t.name));
	}
}
function g(e, t) {
	let n = t.query.trim().toLowerCase();
	return h(e.filter((e) => t.groups.length > 0 && !t.groups.includes(e.group) ? !1 : n === "" || e.name.toLowerCase().includes(n) || e.entityId.toLowerCase().includes(n) || e.area.toLowerCase().includes(n)), t.sort);
}
//#endregion
//#region src/loader.ts
var _ = [
	"{% for s in states if s.attributes.device_class == 'battery' %}",
	"{{ s.entity_id }}={{ area_name(s.entity_id) or '' }}	{{ device_attr(s.entity_id, 'name_by_user') or device_attr(s.entity_id, 'name') or '' }}\n",
	"{% endfor %}"
].join("");
function v(e) {
	let t = {};
	for (let n of e.split("\n")) {
		let e = n.indexOf("=");
		if (e <= 0) continue;
		let r = n.slice(0, e).trim();
		if (!r.includes(".")) continue;
		let [i = "", a = ""] = n.slice(e + 1).split("	");
		t[r] = {
			area: i.trim(),
			device: a.trim()
		};
	}
	return t;
}
async function y(e, t, n) {
	let r = [...e], i = Array.from({ length: Math.max(1, Math.min(t, r.length)) }, async () => {
		for (;;) {
			let e = r.shift();
			if (e === void 0) return;
			await n(e);
		}
	});
	await Promise.all(i);
}
async function b(e, t) {
	let n = await e.getStates(), r = {};
	try {
		r = await e.getMeta();
	} catch {}
	let i = n.filter(l).map((e) => {
		let t = r[e.entity_id];
		return d(e, t?.area ?? "", t?.device ?? "");
	});
	return t.onUpdate?.(i), !t.forecast || i.length === 0 || await y(i.filter((e) => e.kind === "level"), 4, async (n) => {
		try {
			let r = await e.getHistory(n.entityId, t.forecastHours), a = i.findIndex((e) => e.entityId === n.entityId);
			a >= 0 && (i[a] = p(i[a], f(r)), t.onUpdate?.(i));
		} catch {}
	}), i;
}
//#endregion
//#region src/storage.ts
var x = "allbattery.filter.v1";
function S() {
	try {
		return window.location.pathname.startsWith("/local/") ? window.location.origin : "";
	} catch {
		return "";
	}
}
S();
var C = {
	query: "",
	groups: [],
	sort: "level"
};
function w(e, t) {
	try {
		let n = localStorage.getItem(e);
		if (!n) return t;
		let r = JSON.parse(n);
		return {
			...t,
			...r
		};
	} catch {
		return t;
	}
}
function T(e, t) {
	try {
		localStorage.setItem(e, JSON.stringify(t));
	} catch {}
}
function E() {
	let e = w(x, C);
	return {
		...e,
		groups: Array.isArray(e.groups) ? e.groups : []
	};
}
function D(e) {
	T(x, e);
}
//#endregion
//#region src/ui.ts
var O = {
	critical: {
		badge: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30",
		fill: "bg-rose-500",
		dot: "bg-rose-500",
		card: "border-rose-500/30"
	},
	warning: {
		badge: "bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30",
		fill: "bg-amber-500",
		dot: "bg-amber-500",
		card: "border-amber-500/25"
	},
	good: {
		badge: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
		fill: "bg-emerald-500",
		dot: "bg-emerald-500",
		card: "border-slate-800"
	},
	unknown: {
		badge: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
		fill: "bg-slate-600",
		dot: "bg-slate-500",
		card: "border-slate-800"
	}
}, k = {
	idle: "bg-slate-500/15 text-slate-300 ring-1 ring-slate-500/30",
	loading: "bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30",
	ok: "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30",
	error: "bg-rose-500/15 text-rose-300 ring-1 ring-rose-500/30"
}, A = {
	idle: "bg-slate-400",
	loading: "bg-sky-400 animate-pulse",
	ok: "bg-emerald-400",
	error: "bg-rose-400"
}, j = "rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500", M = "text-xs font-medium uppercase tracking-wide text-slate-400";
function N(e) {
	return e.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function P(e) {
	return Number.isInteger(e) ? String(e) : e.toFixed(1);
}
function F(e) {
	return `${e.toFixed(2)} %/h`;
}
function I(e) {
	if (e.kind === "low") {
		let t = e.rawState.trim().toLowerCase();
		return t === "on" ? "Schwach" : t === "off" ? "OK" : "Unbekannt";
	}
	return e.level === null ? "Unbekannt" : `${P(e.level)} ${e.unit}`.trim();
}
function L(e) {
	let n = e.forecast;
	if (!n) return null;
	switch (n.status) {
		case "discharging": return `Reicht ca. ${t(n.hoursRemaining)} (${F(n.percentPerHour)})`;
		case "charging": return `Laedt (+${F(Math.abs(n.percentPerHour))})`;
		case "stable": return "Ladestand stabil";
		default: return "Zu wenig Verlaufsdaten";
	}
}
function R(e) {
	return `<span class="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ${k[e.kind]}">
    <span class="h-2 w-2 rounded-full ${A[e.kind]}"></span>${N(e.message)}
  </span>`;
}
var z = "rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm font-medium text-slate-200 transition hover:border-slate-600 hover:bg-slate-800";
function B(e) {
	return `
  <header class="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 backdrop-blur">
    <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
      <div class="flex items-center gap-3">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-emerald-500/15 text-lg" aria-hidden="true">&#128267;</span>
        <div>
          <h1 class="text-lg font-semibold tracking-tight">AllBattery</h1>
          <p class="text-xs text-slate-400">Batterie-Monitoring fuer Home Assistant</p>
        </div>
      </div>
      <div class="ml-auto flex flex-wrap items-center gap-2">
        ${R(e.status)}
        ${e.lastUpdate ? `<span class="text-xs text-slate-400">Stand: ${N(e.lastUpdate)}</span>` : ""}
        <button type="button" data-action="refresh" class="${z}">Aktualisieren</button>
        ${e.mode === "standalone" ? `<button type="button" data-action="toggle-settings" class="${z}">Einstellungen</button>` : ""}
      </div>
    </div>
  </header>`;
}
function V(e) {
	let { action: t, label: n, count: r, active: i, dotClass: a } = e;
	return `
      <button type="button" ${t} aria-pressed="${i}"
        class="flex cursor-pointer flex-col items-start gap-1 rounded-2xl border ${i ? "border-sky-500 bg-sky-500/15 ring-2 ring-sky-500/40" : "border-slate-800 bg-slate-900/60 hover:border-sky-500/40 hover:bg-slate-800/60"} p-4 text-left transition">
        <span class="flex w-full items-center gap-2 text-xs font-medium ${i ? "text-sky-100" : "text-slate-300"}">
          <span class="h-2 w-2 shrink-0 rounded-full ${a}"></span>
          <span class="truncate">${n}</span>
          ${i ? "<span class=\"ml-auto font-bold text-sky-300\" aria-hidden=\"true\">&#10003;</span>" : ""}
        </span>
        <span class="text-2xl font-semibold tabular-nums ${i ? "text-white" : "text-slate-100"}">${r}</span>
      </button>`;
}
function H(e) {
	let t = e.filter.groups, i = t.length === 0, a = V({
		action: "data-action=\"clear-groups\"",
		label: "Alle",
		count: e.items.length,
		active: i,
		dotClass: "bg-sky-400"
	}), o = n.map((n) => V({
		action: `data-action="toggle-group" data-group="${n}"`,
		label: r[n],
		count: e.counts[n],
		active: t.includes(n),
		dotClass: O[n].dot
	})).join(""), s = e.items.filter((e) => t.includes(e.group)).length;
	return `
  <section aria-label="Uebersicht und Filter">
    ${i ? "<p class=\"mb-2 text-xs text-slate-400\">\n        Klicke eine Gruppe, um nur diese Batterien anzuzeigen - mehrere Gruppen lassen sich kombinieren.\n      </p>" : `<p class="mb-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
        <span class="font-semibold text-sky-300">Filter aktiv:</span>
        <span>${t.map((e) => r[e]).join(" &middot; ")}</span>
        <span class="text-slate-400">(${s} von ${e.items.length} Batterien)</span>
        <button type="button" data-action="clear-groups"
          class="cursor-pointer rounded-full border border-slate-700 px-2 py-0.5 text-xs text-slate-200 transition hover:border-sky-500/60 hover:text-white">
          Alle anzeigen
        </button>
      </p>`}
    <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">${a}${o}</div>
  </section>`;
}
function U(e) {
	let t = e.mode === "panel", n = e.settings.url.trim() !== "" && e.settings.token.trim() !== "", r = !t && (!n || e.settingsOpen), i = t || n ? H(e) + K(e) + X(e) : W();
	return `
    ${B(e)}
    <main class="mx-auto max-w-7xl px-4 pb-16 pt-6">
      ${r ? G(e) : ""}
      ${i}
    </main>
    ${Z()}`;
}
function W() {
	return "\n  <section class=\"mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6\">\n    <h2 class=\"text-base font-semibold text-slate-100\">Willkommen bei AllBattery</h2>\n    <p class=\"mt-2 max-w-3xl text-sm text-slate-300\">\n      Trage deine Home-Assistant-URL und einen Long-Lived Access Token ein, um alle\n      Batterie-Entitaeten deiner Installation zu ueberwachen. AllBattery sucht Entitaeten mit\n      <code class=\"rounded bg-slate-800 px-1.5 py-0.5 text-xs\">device_class: battery</code>,\n      gruppiert sie nach Zustand und schaetzt die Restlaufzeit aus dem Entladetrend.\n    </p>\n    <ul class=\"mt-4 grid gap-2 text-sm text-slate-400 sm:grid-cols-2\">\n      <li>&#8226; Gruppierung: Kritisch, Warnung, Gut, Unbekannt</li>\n      <li>&#8226; Filter &amp; Sortierung nach Ladestand, Name und Raum</li>\n      <li>&#8226; Prognose der Restlaufzeit in Tagen und Stunden</li>\n      <li>&#8226; Responsives Dashboard im Dark Mode</li>\n    </ul>\n  </section>";
}
function G(e) {
	let t = e.settings;
	return `
  <section class="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
    <div class="mb-4 flex items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-slate-100">Verbindung zu Home Assistant</h2>
      ${e.settingsOpen ? "<button type=\"button\" data-action=\"toggle-settings\" class=\"text-sm text-slate-400 transition hover:text-slate-200\">Schliessen</button>" : ""}
    </div>

    <form data-role="connection-form" class="grid gap-4 sm:grid-cols-2">
      <label class="flex flex-col gap-1 sm:col-span-2">
        <span class="${M}">Home-Assistant-URL</span>
        <input type="text" name="url" required autocomplete="off" spellcheck="false"
          placeholder="http://homeassistant.local:8123" value="${N(t.url)}"
          class="${j}" />
      </label>

      <label class="flex flex-col gap-1 sm:col-span-2">
        <span class="${M}">Long-Lived Access Token</span>
        <input type="password" name="token" required autocomplete="off" spellcheck="false"
          placeholder="eyJhbGciOi..." value="${N(t.token)}"
          class="${j}" />
      </label>

      <label class="flex flex-col gap-1">
        <span class="${M}">Auto-Refresh (Sekunden, 0 = aus)</span>
        <input type="number" name="refreshSeconds" min="0" max="3600" step="5"
          value="${t.refreshSeconds}" class="${j}" />
      </label>

      <label class="flex flex-col gap-1">
        <span class="${M}">Prognose-Zeitraum (Stunden)</span>
        <input type="number" name="forecastHours" min="1" max="336" step="1"
          value="${t.forecastHours}" class="${j}" />
      </label>

      <label class="flex items-center gap-2 sm:col-span-2">
        <input type="checkbox" name="showForecast" ${t.showForecast ? "checked" : ""}
          class="h-4 w-4 rounded border-slate-600 bg-slate-950" />
        <span class="text-sm text-slate-300">Prognose-Modul aktivieren (nutzt /api/history/period)</span>
      </label>

      <div class="flex flex-wrap items-center gap-2 sm:col-span-2">
        <button type="submit" class="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400">Verbinden</button>
        <button type="button" data-action="forget" class="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 transition hover:border-rose-500/50 hover:text-rose-300">Zugangsdaten loeschen</button>
      </div>

      <p class="text-xs text-slate-400 sm:col-span-2">
        URL und Token bleiben ausschliesslich lokal in diesem Browser (localStorage) und werden
        nur an die oben angegebene Adresse gesendet - niemals an Dritte.
      </p>
    </form>
  </section>`;
}
function K(e) {
	let t = [
		{
			value: "level",
			label: "Ladestand (aufsteigend)"
		},
		{
			value: "name",
			label: "Name (A-Z)"
		},
		{
			value: "area",
			label: "Raum (A-Z)"
		}
	].map((t) => `<option value="${t.value}" ${e.filter.sort === t.value ? "selected" : ""}>${t.label}</option>`).join(""), n = e.filter.groups.length > 0 ? "<button type=\"button\" data-action=\"clear-groups\" class=\"text-sm text-sky-300 transition hover:text-sky-200\">Filter zuruecksetzen</button>" : "", r = e.forecastLoading ? "<span class=\"text-xs text-sky-300\">Prognose wird berechnet ...</span>" : "";
	return `
  <section class="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
    <input type="search" data-role="query" value="${N(e.filter.query)}"
      placeholder="Nach Name, Raum oder Entity-ID suchen ..."
      class="min-w-[14rem] flex-1 ${j}" />
    <label class="flex items-center gap-2 text-sm text-slate-300">
      <span>Sortieren:</span>
      <select data-role="sort" class="${j}">${t}</select>
    </label>
    ${r}
    ${n}
  </section>`;
}
function q(e) {
	return e.device || e.name;
}
function J(e) {
	let n = [
		["Gerät", e.device || "—"],
		["Bereich", e.area || "—"],
		["Entität", e.name],
		["Entity-ID", e.entityId],
		["Zustand", `${e.rawState}${e.unit ? ` ${e.unit}` : ""}`],
		["Gruppe", r[e.group]]
	], i = e.forecast;
	return i && (n.push(["Prognose", L(e) ?? "—"]), n.push(["Trend", `${F(i.percentPerHour)} · ${i.sampleCount} Messpunkte · ${t(i.spanHours)}`])), e.lastChanged && n.push(["Letzte Änderung", new Date(e.lastChanged).toLocaleString("de-DE")]), `
    <div class="pointer-events-none absolute bottom-full left-0 z-30 mb-2 hidden w-72 rounded-xl border border-slate-700 bg-slate-950/95 p-3 shadow-xl group-hover:block group-focus-within:block">
      <dl class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">${n.map(([e, t]) => `<dt class="text-slate-400">${N(e)}</dt><dd class="break-words text-slate-100">${N(t)}</dd>`).join("")}</dl>
    </div>`;
}
function Y(e) {
	let t = O[e.group], n = e.level === null, i = n ? 100 : Math.max(0, Math.min(100, e.level ?? 0)), a = L(e), o = e.lastChanged ? new Date(e.lastChanged).toLocaleString("de-DE") : "", s = q(e), c = [e.area, e.device ? e.name : ""].filter((e) => e !== "").join(" · ");
	return `
  <article tabindex="0"
    class="group relative flex flex-col gap-3 rounded-2xl border ${t.card} bg-slate-900/60 p-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500/60">
    ${J(e)}
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate text-sm font-semibold text-slate-100">${N(s)}</h3>
        ${c ? `<p class="mt-0.5 truncate text-xs text-slate-400">${N(c)}</p>` : ""}
        <p class="mt-0.5 truncate font-mono text-[11px] text-slate-500">${N(e.entityId)}</p>
      </div>
      <span class="shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${t.badge}">${N(I(e))}</span>
    </div>

    <div class="level-bar" role="img" aria-label="${N(I(e))}">
      <div class="level-bar__fill ${n ? "level-bar__fill--unknown" : t.fill}" style="width:${i}%"></div>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-2 text-xs">
      <span class="text-slate-400">${r[e.group]}</span>
      ${a ? `<span class="text-slate-300">${N(a)}</span>` : ""}
    </div>

    ${o ? `<p class="text-[11px] text-slate-500">Letzte Aenderung: ${N(o)}</p>` : ""}
  </article>`;
}
function X(e) {
	let t = g(e.items, e.filter), n = "mt-4 rounded-2xl border border-slate-800 bg-slate-900/60 p-6 text-sm text-slate-300";
	return e.items.length === 0 ? `<section data-role="grid" class="${n}">
      Keine Batterie-Entitaeten gefunden. AllBattery sucht nach Entitaeten mit
      <code class="rounded bg-slate-800 px-1.5 py-0.5 text-xs">device_class: battery</code>.
    </section>` : t.length === 0 ? `<section data-role="grid" class="${n}">Kein Eintrag passt zum aktuellen Filter.</section>` : `<section data-role="grid" class="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">${t.map(Y).join("")}</section>`;
}
function Z() {
	return "\n  <footer class=\"border-t border-slate-800 py-6\">\n    <div class=\"mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 text-xs text-slate-500\">\n      <span>AllBattery &middot; MIT-Lizenz</span>\n      <span>Zugangsdaten bleiben lokal im Browser - es werden keine Daten an Dritte gesendet.</span>\n      <a class=\"ml-auto text-slate-400 transition hover:text-slate-200\" href=\"https://github.com/Grantii/AllBattery\" target=\"_blank\" rel=\"noopener noreferrer\">Projekt auf GitHub</a>\n    </div>\n  </footer>";
}
//#endregion
//#region src/panel.ts
var Q = class {
	hass;
	meta = {};
	metaLoaded = !1;
	constructor(e) {
		this.hass = e;
	}
	async getStates() {
		return Object.values(this.hass.states);
	}
	async getHistory(e, t) {
		let n = /* @__PURE__ */ new Date(), r = /* @__PURE__ */ new Date(n.getTime() - t * 36e5), i = [
			`filter_entity_id=${encodeURIComponent(e)}`,
			`end_time=${encodeURIComponent(n.toISOString())}`,
			"minimal_response",
			"no_attributes"
		].join("&"), a = await this.hass.callApi("GET", `history/period/${encodeURIComponent(r.toISOString())}?${i}`);
		return Array.isArray(a) && Array.isArray(a[0]) ? a[0] : [];
	}
	async getMeta() {
		if (this.metaLoaded) return this.meta;
		let e = this.hass.user;
		if (e && e.is_admin !== !0 && e.is_owner !== !0) return this.metaLoaded = !0, {};
		let t = await this.hass.callApi("POST", "template", { template: _ });
		return this.meta = v(String(t)), this.metaLoaded = !0, this.meta;
	}
}, $ = ["allbattery-panel", "ha-panel-allbattery"], ee = class extends HTMLElement {
	shadow;
	hassObject;
	panelConfig = {};
	source;
	items = [];
	filter = E();
	status = {
		kind: "idle",
		message: "Warte auf Home Assistant ..."
	};
	lastUpdate = "";
	forecastLoading = !1;
	started = !1;
	loading = !1;
	lastSync = 0;
	timer;
	constructor() {
		super(), this.shadow = this.attachShadow({ mode: "open" });
	}
	set hass(e) {
		this.hassObject = e, this.started ? this.syncFromHass() : (this.started = !0, this.refresh());
	}
	get hass() {
		return this.hassObject;
	}
	set panel(e) {
		this.applyConfig(e?.config);
	}
	set config(e) {
		this.applyConfig(e);
	}
	set narrow(e) {
		this.toggleAttribute("narrow", !!e);
	}
	connectedCallback() {
		if (this.shadow.childElementCount === 0) {
			let e = document.createElement("style");
			e.textContent = "/*! tailwindcss v4.3.3 | MIT License | https://tailwindcss.com */\n@layer properties{@supports (((-webkit-hyphens:none)) and (not (margin-trim:inline))) or ((-moz-orient:inline) and (not (color:rgb(from red r g b)))){*,:before,:after,::backdrop{--tw-border-style:solid;--tw-font-weight:initial;--tw-tracking:initial;--tw-ordinal:initial;--tw-slashed-zero:initial;--tw-numeric-figure:initial;--tw-numeric-spacing:initial;--tw-numeric-fraction:initial;--tw-shadow:0 0 #0000;--tw-shadow-color:initial;--tw-shadow-alpha:100%;--tw-inset-shadow:0 0 #0000;--tw-inset-shadow-color:initial;--tw-inset-shadow-alpha:100%;--tw-ring-color:initial;--tw-ring-shadow:0 0 #0000;--tw-inset-ring-color:initial;--tw-inset-ring-shadow:0 0 #0000;--tw-ring-inset:initial;--tw-ring-offset-width:0px;--tw-ring-offset-color:#fff;--tw-ring-offset-shadow:0 0 #0000;--tw-blur:initial;--tw-brightness:initial;--tw-contrast:initial;--tw-grayscale:initial;--tw-hue-rotate:initial;--tw-invert:initial;--tw-opacity:initial;--tw-saturate:initial;--tw-sepia:initial;--tw-drop-shadow:initial;--tw-drop-shadow-color:initial;--tw-drop-shadow-alpha:100%;--tw-drop-shadow-size:initial;--tw-backdrop-blur:initial;--tw-backdrop-brightness:initial;--tw-backdrop-contrast:initial;--tw-backdrop-grayscale:initial;--tw-backdrop-hue-rotate:initial;--tw-backdrop-invert:initial;--tw-backdrop-opacity:initial;--tw-backdrop-saturate:initial;--tw-backdrop-sepia:initial}}}@layer theme{:root,:host{--font-sans:-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", \"Noto Sans\", Arial, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\";--font-mono:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;--color-amber-300:oklch(87.9% .169 91.605);--color-amber-500:oklch(76.9% .188 70.08);--color-emerald-300:oklch(84.5% .143 164.978);--color-emerald-400:oklch(76.5% .177 163.223);--color-emerald-500:oklch(69.6% .17 162.48);--color-sky-100:oklch(95.1% .026 236.824);--color-sky-200:oklch(90.1% .058 230.902);--color-sky-300:oklch(82.8% .111 230.318);--color-sky-400:oklch(74.6% .16 232.661);--color-sky-500:oklch(68.5% .169 237.323);--color-rose-300:oklch(81% .117 11.638);--color-rose-400:oklch(71.2% .194 13.428);--color-rose-500:oklch(64.5% .246 16.439);--color-slate-100:oklch(96.8% .007 247.896);--color-slate-200:oklch(92.9% .013 255.508);--color-slate-300:oklch(86.9% .022 252.894);--color-slate-400:oklch(70.4% .04 256.788);--color-slate-500:oklch(55.4% .046 257.417);--color-slate-600:oklch(44.6% .043 257.281);--color-slate-700:oklch(37.2% .044 257.287);--color-slate-800:oklch(27.9% .041 260.031);--color-slate-900:oklch(20.8% .042 265.755);--color-slate-950:oklch(12.9% .042 264.695);--color-white:#fff;--spacing:.25rem;--container-3xl:48rem;--container-7xl:80rem;--text-xs:.75rem;--text-xs--line-height:calc(1 / .75);--text-sm:.875rem;--text-sm--line-height:calc(1.25 / .875);--text-base:1rem;--text-base--line-height:calc(1.5 / 1);--text-lg:1.125rem;--text-lg--line-height:calc(1.75 / 1.125);--text-2xl:1.5rem;--text-2xl--line-height:calc(2 / 1.5);--font-weight-medium:500;--font-weight-semibold:600;--font-weight-bold:700;--tracking-tight:-.025em;--tracking-wide:.025em;--radius-lg:.5rem;--radius-xl:.75rem;--radius-2xl:1rem;--animate-pulse:pulse 2s cubic-bezier(.4, 0, .6, 1) infinite;--default-transition-duration:.15s;--default-transition-timing-function:cubic-bezier(.4, 0, .2, 1);--default-font-family:var(--font-sans);--default-mono-font-family:var(--font-mono)}}@layer base{*,:after,:before,::backdrop{box-sizing:border-box;border:0 solid;margin:0;padding:0}::file-selector-button{box-sizing:border-box;border:0 solid;margin:0;padding:0}html,:host{-webkit-text-size-adjust:100%;tab-size:4;line-height:1.5;font-family:var(--default-font-family,-apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, \"Helvetica Neue\", \"Noto Sans\", Arial, sans-serif, \"Apple Color Emoji\", \"Segoe UI Emoji\", \"Segoe UI Symbol\", \"Noto Color Emoji\");font-feature-settings:var(--default-font-feature-settings,normal);font-variation-settings:var(--default-font-variation-settings,normal);-webkit-tap-highlight-color:transparent}hr{height:0;color:inherit;border-top-width:1px}abbr:where([title]){-webkit-text-decoration:underline dotted;text-decoration:underline dotted}h1,h2,h3,h4,h5,h6{font-size:inherit;font-weight:inherit}a{color:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;-webkit-text-decoration:inherit;text-decoration:inherit}b,strong{font-weight:bolder}code,kbd,samp,pre{font-family:var(--default-mono-font-family,ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace);font-feature-settings:var(--default-mono-font-feature-settings,normal);font-variation-settings:var(--default-mono-font-variation-settings,normal);font-size:1em}small{font-size:80%}sub,sup{vertical-align:baseline;font-size:75%;line-height:0;position:relative}sub{bottom:-.25em}sup{top:-.5em}table{text-indent:0;border-color:inherit;border-collapse:collapse}:-moz-focusring:where(:not(iframe)){outline:auto}progress{vertical-align:baseline}summary{display:list-item}ol,ul,menu{list-style:none}img,svg,video,canvas,audio,iframe,embed,object{vertical-align:middle;display:block}img,video{max-width:100%;height:auto}button,input,select,optgroup,textarea{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}::file-selector-button{font:inherit;font-feature-settings:inherit;font-variation-settings:inherit;letter-spacing:inherit;color:inherit;opacity:1;background-color:#0000;border-radius:0}:where(select:is([multiple],[size])) optgroup{font-weight:bolder}:where(select:is([multiple],[size])) optgroup option{padding-inline-start:20px}::file-selector-button{margin-inline-end:4px}::placeholder{opacity:1}@supports (not ((-webkit-appearance:-apple-pay-button))) or (contain-intrinsic-size:1px){::placeholder{color:currentColor}@supports (color:color-mix(in lab, red, red)){::placeholder{color:color-mix(in oklab, currentcolor 50%, transparent)}}}textarea{resize:vertical}::-webkit-search-decoration{-webkit-appearance:none}::-webkit-date-and-time-value{min-height:1lh;text-align:inherit}::-webkit-datetime-edit{display:inline-flex}::-webkit-datetime-edit-fields-wrapper{padding:0}::-webkit-datetime-edit{padding-block:0}::-webkit-datetime-edit-year-field{padding-block:0}::-webkit-datetime-edit-month-field{padding-block:0}::-webkit-datetime-edit-day-field{padding-block:0}::-webkit-datetime-edit-hour-field{padding-block:0}::-webkit-datetime-edit-minute-field{padding-block:0}::-webkit-datetime-edit-second-field{padding-block:0}::-webkit-datetime-edit-millisecond-field{padding-block:0}::-webkit-datetime-edit-meridiem-field{padding-block:0}::-webkit-calendar-picker-indicator{line-height:1}:-moz-ui-invalid{box-shadow:none}button,input:where([type=button],[type=reset],[type=submit]){appearance:button}::file-selector-button{appearance:button}::-webkit-inner-spin-button{height:auto}::-webkit-outer-spin-button{height:auto}[hidden]:where(:not([hidden=until-found])){display:none!important}}@layer components;@layer utilities{.pointer-events-none{pointer-events:none}.absolute{position:absolute}.relative{position:relative}.sticky{position:sticky}.top-0{top:0}.bottom-full{bottom:100%}.left-0{left:0}.z-20{z-index:20}.z-30{z-index:30}.container{width:100%}@media (width>=40rem){.container{max-width:40rem}}@media (width>=48rem){.container{max-width:48rem}}@media (width>=64rem){.container{max-width:64rem}}@media (width>=80rem){.container{max-width:80rem}}@media (width>=96rem){.container{max-width:96rem}}.mx-auto{margin-inline:auto}.mt-0{margin-top:0}.mt-0\\.5{margin-top:calc(var(--spacing) * .5)}.mt-2{margin-top:calc(var(--spacing) * 2)}.mt-4{margin-top:calc(var(--spacing) * 4)}.mt-6{margin-top:calc(var(--spacing) * 6)}.mb-2{margin-bottom:calc(var(--spacing) * 2)}.mb-4{margin-bottom:calc(var(--spacing) * 4)}.mb-6{margin-bottom:calc(var(--spacing) * 6)}.ml-auto{margin-left:auto}.contents{display:contents}.flex{display:flex}.grid{display:grid}.hidden{display:none}.inline-flex{display:inline-flex}.table{display:table}.h-2{height:calc(var(--spacing) * 2)}.h-4{height:calc(var(--spacing) * 4)}.h-10{height:calc(var(--spacing) * 10)}.min-h-screen{min-height:100vh}.w-2{width:calc(var(--spacing) * 2)}.w-4{width:calc(var(--spacing) * 4)}.w-10{width:calc(var(--spacing) * 10)}.w-72{width:calc(var(--spacing) * 72)}.w-full{width:100%}.max-w-3xl{max-width:var(--container-3xl)}.max-w-7xl{max-width:var(--container-7xl)}.min-w-0{min-width:0}.min-w-\\[14rem\\]{min-width:14rem}.flex-1{flex:1}.shrink-0{flex-shrink:0}.animate-pulse{animation:var(--animate-pulse)}.cursor-pointer{cursor:pointer}.grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.grid-cols-\\[auto_1fr\\]{grid-template-columns:auto 1fr}.flex-col{flex-direction:column}.flex-wrap{flex-wrap:wrap}.place-items-center{place-items:center}.items-center{align-items:center}.items-start{align-items:flex-start}.justify-between{justify-content:space-between}.gap-1{gap:var(--spacing)}.gap-2{gap:calc(var(--spacing) * 2)}.gap-3{gap:calc(var(--spacing) * 3)}.gap-4{gap:calc(var(--spacing) * 4)}.gap-x-3{column-gap:calc(var(--spacing) * 3)}.gap-x-4{column-gap:calc(var(--spacing) * 4)}.gap-y-1{row-gap:var(--spacing)}.gap-y-2{row-gap:calc(var(--spacing) * 2)}.truncate{text-overflow:ellipsis;white-space:nowrap;overflow:hidden}.rounded{border-radius:.25rem}.rounded-2xl{border-radius:var(--radius-2xl)}.rounded-full{border-radius:2147483647px}.rounded-lg{border-radius:var(--radius-lg)}.rounded-xl{border-radius:var(--radius-xl)}.border{border-style:var(--tw-border-style);border-width:1px}.border-t{border-top-style:var(--tw-border-style);border-top-width:1px}.border-b{border-bottom-style:var(--tw-border-style);border-bottom-width:1px}.border-amber-500{border-color:var(--color-amber-500)}.border-amber-500\\/25{border-color:#f99c0040}@supports (color:color-mix(in lab, red, red)){.border-amber-500\\/25{border-color:color-mix(in oklab, var(--color-amber-500) 25%, transparent)}}.border-rose-500{border-color:var(--color-rose-500)}.border-rose-500\\/30{border-color:#ff23574d}@supports (color:color-mix(in lab, red, red)){.border-rose-500\\/30{border-color:color-mix(in oklab, var(--color-rose-500) 30%, transparent)}}.border-sky-500{border-color:var(--color-sky-500)}.border-sky-500\\/60{border-color:#00a5ef99}@supports (color:color-mix(in lab, red, red)){.border-sky-500\\/60{border-color:color-mix(in oklab, var(--color-sky-500) 60%, transparent)}}.border-slate-600{border-color:var(--color-slate-600)}.border-slate-700{border-color:var(--color-slate-700)}.border-slate-800{border-color:var(--color-slate-800)}.bg-amber-500{background-color:var(--color-amber-500)}.bg-amber-500\\/15{background-color:#f99c0026}@supports (color:color-mix(in lab, red, red)){.bg-amber-500\\/15{background-color:color-mix(in oklab, var(--color-amber-500) 15%, transparent)}}.bg-emerald-400{background-color:var(--color-emerald-400)}.bg-emerald-500{background-color:var(--color-emerald-500)}.bg-emerald-500\\/15{background-color:#00bb7f26}@supports (color:color-mix(in lab, red, red)){.bg-emerald-500\\/15{background-color:color-mix(in oklab, var(--color-emerald-500) 15%, transparent)}}.bg-rose-400{background-color:var(--color-rose-400)}.bg-rose-500{background-color:var(--color-rose-500)}.bg-rose-500\\/15{background-color:#ff235726}@supports (color:color-mix(in lab, red, red)){.bg-rose-500\\/15{background-color:color-mix(in oklab, var(--color-rose-500) 15%, transparent)}}.bg-sky-400{background-color:var(--color-sky-400)}.bg-sky-500{background-color:var(--color-sky-500)}.bg-sky-500\\/15{background-color:#00a5ef26}@supports (color:color-mix(in lab, red, red)){.bg-sky-500\\/15{background-color:color-mix(in oklab, var(--color-sky-500) 15%, transparent)}}.bg-slate-400{background-color:var(--color-slate-400)}.bg-slate-500{background-color:var(--color-slate-500)}.bg-slate-500\\/15{background-color:#62748e26}@supports (color:color-mix(in lab, red, red)){.bg-slate-500\\/15{background-color:color-mix(in oklab, var(--color-slate-500) 15%, transparent)}}.bg-slate-600{background-color:var(--color-slate-600)}.bg-slate-800{background-color:var(--color-slate-800)}.bg-slate-900{background-color:var(--color-slate-900)}.bg-slate-900\\/60{background-color:#0f172b99}@supports (color:color-mix(in lab, red, red)){.bg-slate-900\\/60{background-color:color-mix(in oklab, var(--color-slate-900) 60%, transparent)}}.bg-slate-950{background-color:var(--color-slate-950)}.bg-slate-950\\/85{background-color:#020618d9}@supports (color:color-mix(in lab, red, red)){.bg-slate-950\\/85{background-color:color-mix(in oklab, var(--color-slate-950) 85%, transparent)}}.bg-slate-950\\/95{background-color:#020618f2}@supports (color:color-mix(in lab, red, red)){.bg-slate-950\\/95{background-color:color-mix(in oklab, var(--color-slate-950) 95%, transparent)}}.p-3{padding:calc(var(--spacing) * 3)}.p-4{padding:calc(var(--spacing) * 4)}.p-5{padding:calc(var(--spacing) * 5)}.p-6{padding:calc(var(--spacing) * 6)}.px-1{padding-inline:var(--spacing)}.px-1\\.5{padding-inline:calc(var(--spacing) * 1.5)}.px-2{padding-inline:calc(var(--spacing) * 2)}.px-2\\.5{padding-inline:calc(var(--spacing) * 2.5)}.px-3{padding-inline:calc(var(--spacing) * 3)}.px-4{padding-inline:calc(var(--spacing) * 4)}.py-0{padding-block:0}.py-0\\.5{padding-block:calc(var(--spacing) * .5)}.py-1{padding-block:var(--spacing)}.py-1\\.5{padding-block:calc(var(--spacing) * 1.5)}.py-2{padding-block:calc(var(--spacing) * 2)}.py-3{padding-block:calc(var(--spacing) * 3)}.py-6{padding-block:calc(var(--spacing) * 6)}.pt-6{padding-top:calc(var(--spacing) * 6)}.pb-16{padding-bottom:calc(var(--spacing) * 16)}.text-left{text-align:left}.font-mono{font-family:var(--font-mono)}.text-2xl{font-size:var(--text-2xl);line-height:var(--tw-leading,var(--text-2xl--line-height))}.text-base{font-size:var(--text-base);line-height:var(--tw-leading,var(--text-base--line-height))}.text-lg{font-size:var(--text-lg);line-height:var(--tw-leading,var(--text-lg--line-height))}.text-sm{font-size:var(--text-sm);line-height:var(--tw-leading,var(--text-sm--line-height))}.text-xs{font-size:var(--text-xs);line-height:var(--tw-leading,var(--text-xs--line-height))}.text-\\[11px\\]{font-size:11px}.font-bold{--tw-font-weight:var(--font-weight-bold);font-weight:var(--font-weight-bold)}.font-medium{--tw-font-weight:var(--font-weight-medium);font-weight:var(--font-weight-medium)}.font-semibold{--tw-font-weight:var(--font-weight-semibold);font-weight:var(--font-weight-semibold)}.tracking-tight{--tw-tracking:var(--tracking-tight);letter-spacing:var(--tracking-tight)}.tracking-wide{--tw-tracking:var(--tracking-wide);letter-spacing:var(--tracking-wide)}.break-words{overflow-wrap:break-word}.text-amber-300{color:var(--color-amber-300)}.text-emerald-300{color:var(--color-emerald-300)}.text-rose-300{color:var(--color-rose-300)}.text-sky-100{color:var(--color-sky-100)}.text-sky-300{color:var(--color-sky-300)}.text-slate-100{color:var(--color-slate-100)}.text-slate-200{color:var(--color-slate-200)}.text-slate-300{color:var(--color-slate-300)}.text-slate-400{color:var(--color-slate-400)}.text-slate-500{color:var(--color-slate-500)}.text-slate-950{color:var(--color-slate-950)}.text-white{color:var(--color-white)}.uppercase{text-transform:uppercase}.tabular-nums{--tw-numeric-spacing:tabular-nums;font-variant-numeric:var(--tw-ordinal,) var(--tw-slashed-zero,) var(--tw-numeric-figure,) var(--tw-numeric-spacing,) var(--tw-numeric-fraction,)}.antialiased{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}.shadow{--tw-shadow:0 1px 3px 0 var(--tw-shadow-color,#0000001a), 0 1px 2px -1px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.shadow-xl{--tw-shadow:0 20px 25px -5px var(--tw-shadow-color,#0000001a), 0 8px 10px -6px var(--tw-shadow-color,#0000001a);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.ring-1{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.ring-2{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.ring-amber-500{--tw-ring-color:var(--color-amber-500)}.ring-amber-500\\/30{--tw-ring-color:#f99c004d}@supports (color:color-mix(in lab, red, red)){.ring-amber-500\\/30{--tw-ring-color:color-mix(in oklab, var(--color-amber-500) 30%, transparent)}}.ring-emerald-500{--tw-ring-color:var(--color-emerald-500)}.ring-emerald-500\\/30{--tw-ring-color:#00bb7f4d}@supports (color:color-mix(in lab, red, red)){.ring-emerald-500\\/30{--tw-ring-color:color-mix(in oklab, var(--color-emerald-500) 30%, transparent)}}.ring-rose-500{--tw-ring-color:var(--color-rose-500)}.ring-rose-500\\/30{--tw-ring-color:#ff23574d}@supports (color:color-mix(in lab, red, red)){.ring-rose-500\\/30{--tw-ring-color:color-mix(in oklab, var(--color-rose-500) 30%, transparent)}}.ring-sky-500{--tw-ring-color:var(--color-sky-500)}.ring-sky-500\\/30{--tw-ring-color:#00a5ef4d}@supports (color:color-mix(in lab, red, red)){.ring-sky-500\\/30{--tw-ring-color:color-mix(in oklab, var(--color-sky-500) 30%, transparent)}}.ring-sky-500\\/40{--tw-ring-color:#00a5ef66}@supports (color:color-mix(in lab, red, red)){.ring-sky-500\\/40{--tw-ring-color:color-mix(in oklab, var(--color-sky-500) 40%, transparent)}}.ring-slate-500{--tw-ring-color:var(--color-slate-500)}.ring-slate-500\\/30{--tw-ring-color:#62748e4d}@supports (color:color-mix(in lab, red, red)){.ring-slate-500\\/30{--tw-ring-color:color-mix(in oklab, var(--color-slate-500) 30%, transparent)}}.filter{filter:var(--tw-blur,) var(--tw-brightness,) var(--tw-contrast,) var(--tw-grayscale,) var(--tw-hue-rotate,) var(--tw-invert,) var(--tw-saturate,) var(--tw-sepia,) var(--tw-drop-shadow,)}.backdrop-blur{--tw-backdrop-blur:blur(8px);-webkit-backdrop-filter:var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,);backdrop-filter:var(--tw-backdrop-blur,) var(--tw-backdrop-brightness,) var(--tw-backdrop-contrast,) var(--tw-backdrop-grayscale,) var(--tw-backdrop-hue-rotate,) var(--tw-backdrop-invert,) var(--tw-backdrop-opacity,) var(--tw-backdrop-saturate,) var(--tw-backdrop-sepia,)}.transition{transition-property:color,background-color,border-color,outline-color,text-decoration-color,fill,stroke,--tw-gradient-from,--tw-gradient-via,--tw-gradient-to,opacity,box-shadow,transform,translate,scale,rotate,filter,-webkit-backdrop-filter,backdrop-filter,display,content-visibility,overlay,pointer-events;transition-timing-function:var(--tw-ease,var(--default-transition-timing-function));transition-duration:var(--tw-duration,var(--default-transition-duration))}.group-focus-within\\:block:is(:where(.group):focus-within *){display:block}@media (hover:hover){.group-hover\\:block:is(:where(.group):hover *){display:block}}.placeholder\\:text-slate-500::placeholder{color:var(--color-slate-500)}@media (hover:hover){.hover\\:border-rose-500\\/50:hover{border-color:#ff235780}@supports (color:color-mix(in lab, red, red)){.hover\\:border-rose-500\\/50:hover{border-color:color-mix(in oklab, var(--color-rose-500) 50%, transparent)}}.hover\\:border-sky-500\\/40:hover{border-color:#00a5ef66}@supports (color:color-mix(in lab, red, red)){.hover\\:border-sky-500\\/40:hover{border-color:color-mix(in oklab, var(--color-sky-500) 40%, transparent)}}.hover\\:border-sky-500\\/60:hover{border-color:#00a5ef99}@supports (color:color-mix(in lab, red, red)){.hover\\:border-sky-500\\/60:hover{border-color:color-mix(in oklab, var(--color-sky-500) 60%, transparent)}}.hover\\:border-slate-600:hover{border-color:var(--color-slate-600)}.hover\\:bg-emerald-400:hover{background-color:var(--color-emerald-400)}.hover\\:bg-slate-800:hover{background-color:var(--color-slate-800)}.hover\\:bg-slate-800\\/60:hover{background-color:#1d293d99}@supports (color:color-mix(in lab, red, red)){.hover\\:bg-slate-800\\/60:hover{background-color:color-mix(in oklab, var(--color-slate-800) 60%, transparent)}}.hover\\:text-rose-300:hover{color:var(--color-rose-300)}.hover\\:text-sky-200:hover{color:var(--color-sky-200)}.hover\\:text-slate-200:hover{color:var(--color-slate-200)}.hover\\:text-white:hover{color:var(--color-white)}}.focus\\:outline-none:focus{--tw-outline-style:none;outline-style:none}.focus-visible\\:ring-2:focus-visible{--tw-ring-shadow:var(--tw-ring-inset,) 0 0 0 calc(2px + var(--tw-ring-offset-width)) var(--tw-ring-color,currentcolor);box-shadow:var(--tw-inset-shadow), var(--tw-inset-ring-shadow), var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow)}.focus-visible\\:ring-sky-500\\/60:focus-visible{--tw-ring-color:#00a5ef99}@supports (color:color-mix(in lab, red, red)){.focus-visible\\:ring-sky-500\\/60:focus-visible{--tw-ring-color:color-mix(in oklab, var(--color-sky-500) 60%, transparent)}}@media (width>=40rem){.sm\\:col-span-2{grid-column:span 2/span 2}.sm\\:grid-cols-2{grid-template-columns:repeat(2,minmax(0,1fr))}.sm\\:grid-cols-5{grid-template-columns:repeat(5,minmax(0,1fr))}}@media (width>=80rem){.xl\\:grid-cols-3{grid-template-columns:repeat(3,minmax(0,1fr))}}}:root{--lightningcss-light: ;--lightningcss-dark:initial;color-scheme:dark}html,body{min-height:100%}body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica Neue,Arial,sans-serif}.level-bar{background-color:#1e293b;border-radius:9999px;width:100%;height:.625rem;position:relative;overflow:hidden}.level-bar__fill{border-radius:9999px;height:100%;transition:width .3s ease-out}.level-bar__fill--unknown{background-image:repeating-linear-gradient(45deg,#475569 0 6px,#334155 6px 12px);width:100%!important}button:not(:disabled){cursor:pointer}:where(button,input,select,a):focus-visible{outline-offset:2px;outline:2px solid #38bdf8}:host{color:#f1f5f9;background-color:#020617;height:100%;display:block;overflow:auto}@property --tw-border-style{syntax:\"*\";inherits:false;initial-value:solid}@property --tw-font-weight{syntax:\"*\";inherits:false}@property --tw-tracking{syntax:\"*\";inherits:false}@property --tw-ordinal{syntax:\"*\";inherits:false}@property --tw-slashed-zero{syntax:\"*\";inherits:false}@property --tw-numeric-figure{syntax:\"*\";inherits:false}@property --tw-numeric-spacing{syntax:\"*\";inherits:false}@property --tw-numeric-fraction{syntax:\"*\";inherits:false}@property --tw-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-shadow-color{syntax:\"*\";inherits:false}@property --tw-shadow-alpha{syntax:\"<percentage>\";inherits:false;initial-value:100%}@property --tw-inset-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-inset-shadow-color{syntax:\"*\";inherits:false}@property --tw-inset-shadow-alpha{syntax:\"<percentage>\";inherits:false;initial-value:100%}@property --tw-ring-color{syntax:\"*\";inherits:false}@property --tw-ring-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-inset-ring-color{syntax:\"*\";inherits:false}@property --tw-inset-ring-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-ring-inset{syntax:\"*\";inherits:false}@property --tw-ring-offset-width{syntax:\"<length>\";inherits:false;initial-value:0}@property --tw-ring-offset-color{syntax:\"*\";inherits:false;initial-value:#fff}@property --tw-ring-offset-shadow{syntax:\"*\";inherits:false;initial-value:0 0 #0000}@property --tw-blur{syntax:\"*\";inherits:false}@property --tw-brightness{syntax:\"*\";inherits:false}@property --tw-contrast{syntax:\"*\";inherits:false}@property --tw-grayscale{syntax:\"*\";inherits:false}@property --tw-hue-rotate{syntax:\"*\";inherits:false}@property --tw-invert{syntax:\"*\";inherits:false}@property --tw-opacity{syntax:\"*\";inherits:false}@property --tw-saturate{syntax:\"*\";inherits:false}@property --tw-sepia{syntax:\"*\";inherits:false}@property --tw-drop-shadow{syntax:\"*\";inherits:false}@property --tw-drop-shadow-color{syntax:\"*\";inherits:false}@property --tw-drop-shadow-alpha{syntax:\"<percentage>\";inherits:false;initial-value:100%}@property --tw-drop-shadow-size{syntax:\"*\";inherits:false}@property --tw-backdrop-blur{syntax:\"*\";inherits:false}@property --tw-backdrop-brightness{syntax:\"*\";inherits:false}@property --tw-backdrop-contrast{syntax:\"*\";inherits:false}@property --tw-backdrop-grayscale{syntax:\"*\";inherits:false}@property --tw-backdrop-hue-rotate{syntax:\"*\";inherits:false}@property --tw-backdrop-invert{syntax:\"*\";inherits:false}@property --tw-backdrop-opacity{syntax:\"*\";inherits:false}@property --tw-backdrop-saturate{syntax:\"*\";inherits:false}@property --tw-backdrop-sepia{syntax:\"*\";inherits:false}@keyframes pulse{50%{opacity:.5}}";
			let t = document.createElement("div");
			t.setAttribute("data-role", "app"), this.shadow.append(e, t), this.render();
		}
		this.shadow.addEventListener("click", this.handleClick), this.shadow.addEventListener("input", this.handleInput), this.shadow.addEventListener("change", this.handleChange);
	}
	disconnectedCallback() {
		this.stopTimer(), this.shadow.removeEventListener("click", this.handleClick), this.shadow.removeEventListener("input", this.handleInput), this.shadow.removeEventListener("change", this.handleChange);
	}
	applyConfig(e) {
		e && typeof e == "object" && (this.panelConfig = {
			...this.panelConfig,
			...e
		}, this.started && this.startTimer());
	}
	get refreshSeconds() {
		let e = Number(this.panelConfig.refresh_seconds ?? 60);
		return Number.isFinite(e) && e >= 0 ? Math.round(e) : 60;
	}
	get forecastEnabled() {
		return this.panelConfig.forecast !== !1;
	}
	get forecastHours() {
		let e = Number(this.panelConfig.forecast_hours ?? 24);
		return Number.isFinite(e) && e > 0 ? Math.round(e) : 24;
	}
	view() {
		return {
			mode: "panel",
			settings: {
				url: "",
				token: "",
				refreshSeconds: this.refreshSeconds,
				showForecast: this.forecastEnabled,
				forecastHours: this.forecastHours
			},
			filter: this.filter,
			items: this.items,
			counts: m(this.items),
			status: this.status,
			lastUpdate: this.lastUpdate,
			settingsOpen: !1,
			forecastLoading: this.forecastLoading
		};
	}
	render() {
		let e = this.shadow.querySelector("[data-role=\"app\"]");
		e && (e.innerHTML = U(this.view()));
	}
	updateGrid() {
		let e = this.shadow.querySelector("[data-role=\"grid\"]");
		if (!e) {
			this.render();
			return;
		}
		let t = document.createElement("div");
		t.innerHTML = X(this.view());
		let n = t.firstElementChild;
		n && e.replaceWith(n);
	}
	async refresh() {
		let e = this.hassObject;
		if (!e || this.loading) return;
		this.loading = !0, this.forecastLoading = this.forecastEnabled, this.status = {
			kind: "loading",
			message: "Lade Batterien ..."
		}, this.render();
		let t = this.source ?? new Q(e);
		this.source = t;
		try {
			let e = await b(t, {
				forecast: this.forecastEnabled,
				forecastHours: this.forecastHours,
				onUpdate: (e) => {
					this.items = [...e], this.lastUpdate = (/* @__PURE__ */ new Date()).toLocaleTimeString("de-DE"), this.status = {
						kind: "ok",
						message: "Verbunden"
					}, this.render();
				}
			});
			this.items = [...e], this.status = {
				kind: "ok",
				message: "Verbunden"
			};
		} catch (e) {
			this.items = [], this.lastUpdate = "", this.status = {
				kind: "error",
				message: e instanceof Error ? e.message : "Daten konnten nicht geladen werden."
			};
		} finally {
			this.loading = !1, this.forecastLoading = !1, this.render(), this.startTimer();
		}
	}
	syncFromHass() {
		let e = this.hassObject;
		if (!e || this.loading) return;
		let t = Date.now();
		if (t - this.lastSync < 2e3) return;
		this.lastSync = t;
		let n = new Map(this.items.map((e) => [e.entityId, e])), r = this.source?.meta ?? {};
		this.items = Object.values(e.states).filter(l).map((e) => {
			let t = r[e.entity_id], i = d(e, t?.area ?? "", t?.device ?? ""), a = n.get(i.entityId);
			return a?.forecast ? {
				...i,
				forecast: a.forecast
			} : i;
		}), this.lastUpdate = (/* @__PURE__ */ new Date()).toLocaleTimeString("de-DE"), this.render();
	}
	startTimer() {
		this.stopTimer();
		let e = this.refreshSeconds;
		e > 0 && (this.timer = window.setInterval(() => {
			this.refresh();
		}, e * 1e3));
	}
	stopTimer() {
		this.timer !== void 0 && (window.clearInterval(this.timer), this.timer = void 0);
	}
	setFilter(e) {
		this.filter = e, D(e), this.render();
	}
	handleClick = (e) => {
		let t = e.target?.closest("[data-action]");
		if (t) switch (t.dataset.action) {
			case "refresh":
				this.refresh();
				break;
			case "toggle-group": {
				let e = t.dataset.group, n = this.filter.groups.includes(e) ? this.filter.groups.filter((t) => t !== e) : [...this.filter.groups, e];
				this.setFilter({
					...this.filter,
					groups: n
				});
				break;
			}
			case "clear-groups": this.setFilter({
				...this.filter,
				groups: []
			});
		}
	};
	handleInput = (e) => {
		let t = e.target;
		t?.dataset.role === "query" && (this.filter = {
			...this.filter,
			query: t.value
		}, D(this.filter), this.updateGrid());
	};
	handleChange = (e) => {
		let t = e.target;
		t?.dataset.role === "sort" && this.setFilter({
			...this.filter,
			sort: t.value
		});
	};
};
for (let e of $) try {
	customElements.get(e) || customElements.define(e, ee);
} catch (t) {
	console.error(`AllBattery: Element "${e}" konnte nicht registriert werden.`, t);
}
//#endregion
