/**
 * Publications Fetcher for INSPIRE-HEP
 * Fetches publications and statistics for a specific author from INSPIRE-HEP API
 * Updates data once per day
 */

class PublicationsFetcher {
    constructor(authorId, options = {}) {
        this.authorId = authorId;
        this.apiBaseUrl = 'https://inspirehep.net/api';
        this.size = options.size || 100; // Number of publications to fetch
        this.publicationsElement = document.getElementById(options.publicationsElementId || 'publications-list');
        this.statsElement = document.getElementById(options.statsElementId || 'publication-stats');
        this.loadingElement = document.getElementById(options.loadingElementId || 'publications-loading');
        this.errorElement = document.getElementById(options.errorElementId || 'publications-error');
        this.lastUpdatedElement = document.getElementById(options.lastUpdatedElementId || 'last-updated');
        this.cache = null;
        this.cacheExpiry = 86400000; // 24 hours in milliseconds (once per day)
        this.lastFetched = null;
    }

    /**
     * Initialize the fetcher
     */
    async init() {
        this.showLoading();
        try {
            // Try to load from localStorage first
            if (this.loadFromCache()) {
                this.renderPublications();
                this.renderStatistics();
                this.updateLastFetchedTime();
                this.hideLoading();
                
                // Refresh cache in the background if it's older than the expiry time (24 hours)
                if (Date.now() - this.lastFetched > this.cacheExpiry) {
                    await this.fetchData();
                    this.renderPublications();
                    this.renderStatistics();
                    this.updateLastFetchedTime();
                }
            } else {
                // If no cache or expired, fetch new data
                await this.fetchData();
                this.renderPublications();
                this.renderStatistics();
                this.updateLastFetchedTime();
                this.hideLoading();
            }
        } catch (error) {
            console.error('Failed to fetch publications:', error);
            this.showError(error.message);
        }
    }

    /**
     * Update the last fetched time display
     */
    updateLastFetchedTime() {
        if (this.lastUpdatedElement && this.lastFetched) {
            const date = new Date(this.lastFetched);
            const formattedDate = date.toISOString().slice(0, 10); // YYYY-MM-DD format
            const hours = String(date.getUTCHours()).padStart(2, '0');
            const minutes = String(date.getUTCMinutes()).padStart(2, '0');
            const seconds = String(date.getUTCSeconds()).padStart(2, '0');
            const formattedTime = `${hours}:${minutes}:${seconds}`;
            
            this.lastUpdatedElement.textContent = `${formattedDate} ${formattedTime} UTC`;
            
            // Calculate time until next update
            const nextUpdate = new Date(this.lastFetched + this.cacheExpiry);
            const timeUntilUpdate = nextUpdate - Date.now();
            const hoursUntil = Math.floor(timeUntilUpdate / 3600000);
            const minutesUntil = Math.floor((timeUntilUpdate % 3600000) / 60000);
            
            // Add next update info
            const nextUpdateElement = document.createElement('div');
            nextUpdateElement.className = 'next-update-info';
            nextUpdateElement.textContent = `Next update in approximately ${hoursUntil} hours and ${minutesUntil} minutes`;
            
            // Replace existing next update info or append new one
            const existingNextUpdate = this.lastUpdatedElement.nextElementSibling;
            if (existingNextUpdate && existingNextUpdate.className === 'next-update-info') {
                existingNextUpdate.replaceWith(nextUpdateElement);
            } else {
                this.lastUpdatedElement.parentNode.insertBefore(nextUpdateElement, this.lastUpdatedElement.nextSibling);
            }
        }
    }

    /**
     * Show loading indicator
     */
    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'block';
        }
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }

    /**
     * Hide loading indicator
     */
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
    }

    /**
     * Show error message
     */
    showError(message) {
        this.hideLoading();
        if (this.errorElement) {
            this.errorElement.textContent = `Error loading publications: ${message}`;
            this.errorElement.style.display = 'block';
        }
    }

    /**
     * Load data from localStorage cache
     */
    loadFromCache() {
        try {
            const cachedData = localStorage.getItem(`inspire-publications-${this.authorId}`);
            if (cachedData) {
                const data = JSON.parse(cachedData);
                this.cache = data.data;
                this.lastFetched = data.timestamp;
                return true;
            }
        } catch (e) {
            console.warn('Failed to load from cache:', e);
        }
        return false;
    }

    /**
     * Save data to localStorage cache
     */
    saveToCache() {
        try {
            localStorage.setItem(`inspire-publications-${this.authorId}`, JSON.stringify({
                data: this.cache,
                timestamp: Date.now()
            }));
        } catch (e) {
            console.warn('Failed to save to cache:', e);
        }
    }

    /**
     * Fetch publication data from INSPIRE-HEP API
     */
    async fetchData() {
        // Fetch publications
        const publicationsUrl = `${this.apiBaseUrl}/literature?size=${this.size}&sort=mostrecent&q=author:${this.authorId}`;
        const publicationsResponse = await fetch(publicationsUrl);
        
        if (!publicationsResponse.ok) {
            throw new Error(`API error: ${publicationsResponse.status} ${publicationsResponse.statusText}`);
        }
        
        const publicationsData = await publicationsResponse.json();
        
        // Fetch citation summary
        const citationsUrl = `${this.apiBaseUrl}/authors/${this.authorId}`;
        const citationsResponse = await fetch(citationsUrl);
        
        if (!citationsResponse.ok) {
            throw new Error(`API error: ${citationsResponse.status} ${citationsResponse.statusText}`);
        }
        
        const citationsData = await citationsResponse.json();
        
        // Combine the data
        this.cache = {
            publications: publicationsData.hits.hits,
            citationSummary: citationsData.metadata.citation_summary,
            metadata: citationsData.metadata
        };
        
        // Save to cache
        this.lastFetched = Date.now();
        this.saveToCache();
        
        return this.cache;
    }

    /**
     * Render publications list
     */
    renderPublications() {
        if (!this.publicationsElement || !this.cache) return;
        
        const publications = this.cache.publications;
        
        // Clear current content
        this.publicationsElement.innerHTML = '';
        
        if (publications.length === 0) {
            this.publicationsElement.innerHTML = '<p>No publications found.</p>';
            return;
        }
        
        // Create publication items
        publications.forEach(pub => {
            const metadata = pub.metadata;
            const title = metadata.titles ? metadata.titles[0].title : 'No title available';
            const year = metadata.publication_info && metadata.publication_info[0] && metadata.publication_info[0].year 
                ? metadata.publication_info[0].year : 'Preprint';
            
            // Format authors
            let authors = 'No authors listed';
            if (metadata.authors && metadata.authors.length > 0) {
                const authorNames = metadata.authors.map(author => author.full_name);
                if (authorNames.length > 5) {
                    authors = `${authorNames.slice(0, 5).join(', ')} et al.`;
                } else {
                    authors = authorNames.join(', ');
                }
            }
            
            // Get journal info
            let journalInfo = 'Preprint';
            if (metadata.publication_info && metadata.publication_info[0]) {
                const pubInfo = metadata.publication_info[0];
                if (pubInfo.journal_title) {
                    journalInfo = pubInfo.journal_title;
                    if (pubInfo.journal_volume) {
                        journalInfo += ` ${pubInfo.journal_volume}`;
                    }
                    if (pubInfo.page_start) {
                        journalInfo += `, ${pubInfo.page_start}`;
                    }
                    if (pubInfo.year) {
                        journalInfo += ` (${pubInfo.year})`;
                    }
                }
            }
            
            // Get citation count
            const citationCount = metadata.citation_count || 0;
            
            // Get links
            const links = [];
            if (metadata.arxiv_eprints && metadata.arxiv_eprints[0]) {
                const arxivId = metadata.arxiv_eprints[0].value;
                links.push(`<a href="https://arxiv.org/abs/${arxivId}" target="_blank" class="link-arxiv">arXiv:${arxivId}</a>`);
            }
            if (metadata.dois && metadata.dois[0]) {
                const doi = metadata.dois[0].value;
                links.push(`<a href="https://doi.org/${doi}" target="_blank" class="link-doi">DOI</a>`);
            }
            links.push(`<a href="https://inspirehep.net/literature/${pub.id}" target="_blank" class="link-inspire">INSPIRE</a>`);
            
            // Create publication element
            const pubElement = document.createElement('li');
            pubElement.className = 'publication-item';
            pubElement.innerHTML = `
                <h3>${title}</h3>
                <p class="authors">${authors}</p>
                <p class="journal">${journalInfo}</p>
                <div class="publication-meta">
                    <span class="citation-count"><i class="fas fa-quote-right"></i> ${citationCount} citation${citationCount !== 1 ? 's' : ''}</span>
                    <div class="publication-links">${links.join(' | ')}</div>
                </div>
            `;
            
            this.publicationsElement.appendChild(pubElement);
        });
    }

    /**
     * Render publication statistics
     */
    renderStatistics() {
        if (!this.statsElement || !this.cache) return;
        
        const stats = this.cache.citationSummary;
        const metadata = this.cache.metadata;
        
        // Total publications
        const totalPubs = this.cache.publications.length;
        
        // Extract citation stats
        const citations = stats ? stats.citation_count : 0;
        const hIndex = stats ? stats.h_index : 0;
        
        // Calculate publications by year
        const pubsByYear = {};
        this.cache.publications.forEach(pub => {
            const year = pub.metadata.publication_info && pub.metadata.publication_info[0] && pub.metadata.publication_info[0].year;
            if (year) {
                pubsByYear[year] = (pubsByYear[year] || 0) + 1;
            }
        });
        
        // Sort years
        const sortedYears = Object.keys(pubsByYear).sort((a, b) => b - a); // Descending order
        
        // Create HTML for publications by year
        let pubsByYearHTML = '';
        if (sortedYears.length > 0) {
            pubsByYearHTML = '<div class="pubs-by-year"><h3>Publications by Year</h3><ul>';
            sortedYears.forEach(year => {
                pubsByYearHTML += `<li>${year}: ${pubsByYear[year]} publication${pubsByYear[year] !== 1 ? 's' : ''}</li>`;
            });
            pubsByYearHTML += '</ul></div>';
        }
        
        // Render statistics
        this.statsElement.innerHTML = `
            <div class="stats-grid">
                <div class="stat-box">
                    <div class="stat-number">${totalPubs}</div>
                    <div class="stat-label">Publications</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${citations}</div>
                    <div class="stat-label">Total Citations</div>
                </div>
                <div class="stat-box">
                    <div class="stat-number">${hIndex}</div>
                    <div class="stat-label">h-index</div>
                </div>
            </div>
            ${pubsByYearHTML}
        `;
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // The author ID from the URL: https://inspirehep.net/authors/1908124
    const authorId = '1908124';
    
    // Create and initialize the publications fetcher
    const fetcher = new PublicationsFetcher(authorId, {
        publicationsElementId: 'publications-list',
        statsElementId: 'publication-stats',
        loadingElementId: 'publications-loading',
        errorElementId: 'publications-error',
        lastUpdatedElementId: 'last-updated'
    });
    
    fetcher.init();
});