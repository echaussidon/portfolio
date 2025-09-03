// publications-cache.js
// Simple cache for publications using localStorage

const PUBLICATIONS_CACHE_KEY = 'publications_cache_v1';

export function savePublicationsToCache(data) {
    try {
        localStorage.setItem(PUBLICATIONS_CACHE_KEY, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
    } catch (e) {
        // Ignore quota errors
    }
}

export function getPublicationsFromCache() {
    try {
        const cached = localStorage.getItem(PUBLICATIONS_CACHE_KEY);
        if (!cached) return null;
        return JSON.parse(cached).data;
    } catch (e) {
        return null;
    }
}
