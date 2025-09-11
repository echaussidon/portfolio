// selected-citations.js
// Minimal script to append Inspire citation counts to the Selected Publications on the homepage.
// It reads arXiv IDs from the publication links, queries Inspire, and appends "Citations: N".

(function () {
	const CACHE_KEY = 'selected_citations_cache_v1';
	const ONE_DAY = 24 * 60 * 60 * 1000;

	function readCache() {
		try {
			return JSON.parse(localStorage.getItem(CACHE_KEY) || '{}');
		} catch (_) { return {}; }
	}
	function writeCache(obj) {
		try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch (_) {}
	}
	function getCached(key) {
		const c = readCache();
		const e = c[key];
		if (!e) return null;
		if (Date.now() - (e.ts || 0) > ONE_DAY) return null;
		return e.value;
	}
	function setCached(key, value) {
		const c = readCache();
		c[key] = { value, ts: Date.now() };
		writeCache(c);
	}

	function extractArxivId(container) {
		const aTags = Array.from(container.querySelectorAll('a[href]'));
		for (const a of aTags) {
			const href = a.getAttribute('href') || '';
			const m = href.match(/arxiv\.org\/(abs|pdf)\/([\w.-]+)/i);
			if (m && m[2]) {
				return m[2].replace(/\.pdf$/i, '');
			}
		}
		return null;
	}

	async function fetchCitationsByArxiv(arxivId) {
		const url = `https://inspirehep.net/api/literature?q=${encodeURIComponent('arxiv:' + arxivId)}&size=1`;
		const r = await fetch(url);
		if (!r.ok) throw new Error('HTTP ' + r.status);
		const data = await r.json();
		const rec = data && data.hits && data.hits.hits && data.hits.hits[0];
		return rec && rec.metadata ? (rec.metadata.citation_count || 0) : null;
	}

	function appendCitationBadge(linksEl, count) {
		// If last link already ends with a pipe, we don't add another separator; we just add the text.
		const span = document.createElement('span');
		span.className = 'selected-citation-badge';
		span.innerHTML = `Citations: <strong>${count}</strong>`;
		linksEl.appendChild(span);
	}

	async function handleItem(li) {
		const links = li.querySelector('.publication-links');
		if (!links) return;
		const arxivId = extractArxivId(links);
		if (!arxivId) return;
		const cacheKey = `arxiv:${arxivId}`;
		const cached = getCached(cacheKey);
		if (cached != null) {
			appendCitationBadge(links, cached);
			return;
		}
		try {
			const count = await fetchCitationsByArxiv(arxivId);
			if (typeof count === 'number') {
				setCached(cacheKey, count);
				appendCitationBadge(links, count);
			}
		} catch (_) {
			// silently ignore
		}
	}

	function init() {
		// Only on homepage selected publications
		const list = document.querySelector('.selected-publications .publication-list');
		if (!list) return;
		const items = Array.from(list.querySelectorAll('li'));
		items.forEach(handleItem);
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init);
	} else {
		init();
	}
})();
