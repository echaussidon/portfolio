/**
 * INSPIRE-HEP Publications Component
 * Based on the official INSPIRE-HEP REST API documentation
 * https://github.com/inspirehep/rest-api-doc
 */

class InspirePublications {
    constructor(authorId, options = {}) {
        // Core properties
        this.authorId = authorId;
        this.apiBaseUrl = 'https://inspirehep.net/api';
        this.size = options.size || 100;
        
        // DOM elements
        this.publicationsElement = document.getElementById(options.publicationsElementId || 'publications-list');
        this.statsElement = document.getElementById(options.statsElementId || 'publication-stats');
        this.loadingElement = document.getElementById(options.loadingElementId || 'publications-loading');
        this.errorElement = document.getElementById(options.errorElementId || 'publications-error');
        this.lastUpdatedElement = document.getElementById(options.lastUpdatedElementId || 'last-updated');
        this.refreshButton = document.getElementById(options.refreshButtonId || 'refresh-publications');
        
        // Bind event handlers
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.fetchAndDisplayData(true));
        }
        
        // Initialize data storage
        this.publicationsData = null;
        this.authorData = null;
    }
    
    /**
     * Initialize the component
     */
    async init() {
        // First display cached data if available
        if (this.loadCachedData()) {
            this.renderUI();
        } else {
            this.showLoading();
        }
        
        // Then fetch fresh data
        await this.fetchAndDisplayData();
    }
    
    /**
     * Load data from localStorage
     */
    loadCachedData() {
        try {
            const cachedPublications = localStorage.getItem(`inspire-publications-${this.authorId}`);
            const cachedAuthor = localStorage.getItem(`inspire-author-${this.authorId}`);
            
            if (cachedPublications && cachedAuthor) {
                this.publicationsData = JSON.parse(cachedPublications);
                this.authorData = JSON.parse(cachedAuthor);
                return true;
            }
        } catch (e) {
            console.warn('Failed to load cached data:', e);
        }
        return false;
    }
    
    /**
     * Save data to localStorage
     */
    saveCachedData() {
        try {
            if (this.publicationsData) {
                localStorage.setItem(`inspire-publications-${this.authorId}`, 
                    JSON.stringify(this.publicationsData));
            }
            if (this.authorData) {
                localStorage.setItem(`inspire-author-${this.authorId}`, 
                    JSON.stringify(this.authorData));
            }
            localStorage.setItem(`inspire-last-updated-${this.authorId}`, Date.now().toString());
        } catch (e) {
            console.warn('Failed to save cached data:', e);
        }
    }
    
    /**
     * Fetch and display publication data
     */
    async fetchAndDisplayData(isManualRefresh = false) {
        if (isManualRefresh) {
            this.showLoading();
            this.hideError();
        }
        
        try {
            // First, get the author data which includes citation stats
            const authorResponse = await fetch(`${this.apiBaseUrl}/authors/${this.authorId}`);
            if (!authorResponse.ok) {
                throw new Error(`Author API error: ${authorResponse.status}`);
            }
            this.authorData = await authorResponse.json();
            
            // Then get the publications data
            // Using the literature endpoint with author search
            const publicationsResponse = await fetch(
                `${this.apiBaseUrl}/literature?size=${this.size}&sort=mostrecent&q=author:${this.authorId}`
            );
            if (!publicationsResponse.ok) {
                throw new Error(`Publications API error: ${publicationsResponse.status}`);
            }
            this.publicationsData = await publicationsResponse.json();
            
            // Save to cache
            this.saveCachedData();
            
            // Update UI
            this.renderUI();
            this.hideLoading();
        } catch (error) {
            console.error('Failed to fetch data from INSPIRE-HEP:', error);
            
            if (isManualRefresh) {
                this.showError(`Failed to refresh data: ${error.message}`);
                this.hideLoading();
            }
            
            // If it's the initial load and we have no cached data, show some fallback data
            if (!this.publicationsData && !this.authorData) {
                this.loadFallbackData();
                this.renderUI();
                this.hideLoading();
            }
        }
    }
    
    /**
     * Load fallback data for when the API is unavailable
     */
    loadFallbackData() {
        // Based on the publications found for the author
        this.publicationsData = {
            hits: {
                hits: [
                    {
                        id: '2105642',
                        metadata: {
                            titles: [{ title: 'Euclid preparation. XVII. Cosmic Dawn Survey: Spitzer Space Telescope observations of the Euclid deep fields and calibration fields' }],
                            authors: [
                                { full_name: 'Moneti, A.' },
                                { full_name: 'Echaussidon, E.' },
                                { full_name: 'et al.' }
                            ],
                            publication_info: [{ journal_title: 'Astron.Astrophys.', year: '2022', journal_volume: '658', page_start: 'A126' }],
                            citation_count: 13,
                            arxiv_eprints: [{ value: '2110.13923' }],
                            dois: [{ value: '10.1051/0004-6361/202141606' }]
                        }
                    },
                    {
                        id: '1891170',
                        metadata: {
                            titles: [{ title: 'Euclid preparation: XII. Optimizing the photometric sample of the Euclid survey for galaxy clustering and galaxy-galaxy lensing analyses' }],
                            authors: [
                                { full_name: 'Pocino, A.' },
                                { full_name: 'Echaussidon, E.' },
                                { full_name: 'et al.' }
                            ],
                            publication_info: [{ journal_title: 'Astron.Astrophys.', year: '2022', journal_volume: '661', page_start: 'A56' }],
                            citation_count: 5,
                            arxiv_eprints: [{ value: '2110.11416' }],
                            dois: [{ value: '10.1051/0004-6361/202141648' }]
                        }
                    },
                    {
                        id: '2133490',
                        metadata: {
                            titles: [{ title: 'Euclid preparation: XXV. The Euclid Morphology Challenge -- Towards model-fitting photometry for billions of galaxies' }],
                            authors: [
                                { full_name: 'Bretonniere, H.' },
                                { full_name: 'Echaussidon, E.' },
                                { full_name: 'et al.' }
                            ],
                            publication_info: [{ journal_title: 'Astron.Astrophys.', year: '2022', journal_volume: '664', page_start: 'A92' }],
                            citation_count: 2,
                            arxiv_eprints: [{ value: '2204.06540' }],
                            dois: [{ value: '10.1051/0004-6361/202142969' }]
                        }
                    }
                ]
            }
        };
        
        this.authorData = {
            metadata: {
                name: 'Echaussidon, E.',
                citation_summary: {
                    citation_count: 20,
                    h_index: 2
                }
            }
        };
    }
    
    /**
     * Render the UI with current data
     */
    renderUI() {
        this.renderPublications();
        this.renderStatistics();
        this.updateLastUpdatedTime();
    }
    
    /**
     * Render the publications list
     */
    renderPublications() {
        if (!this.publicationsElement || !this.publicationsData) return;
        
        const publications = this.publicationsData.hits.hits;
        
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
        if (!this.statsElement || !this.authorData || !this.publicationsData) return;
        
        const citationSummary = this.authorData.metadata.citation_summary || {};
        const publications = this.publicationsData.hits.hits;
        
        // Total publications
        const totalPubs = publications.length;
        
        // Extract citation stats
        const citations = citationSummary.citation_count || 0;
        const hIndex = citationSummary.h_index || 0;
        
        // Calculate publications by year
        const pubsByYear = {};
        publications.forEach(pub => {
            const year = pub.metadata.publication_info && 
                         pub.metadata.publication_info[0] && 
                         pub.metadata.publication_info[0].year;
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
    
    /**
     * Update the last updated timestamp
     */
    updateLastUpdatedTime() {
        if (!this.lastUpdatedElement) return;
        
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        this.lastUpdatedElement.textContent = timestamp;
    }
    
    /**
     * Show loading indicator
     */
    showLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'block';
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
        if (this.errorElement) {
            this.errorElement.textContent = message;
            this.errorElement.style.display = 'block';
        }
    }
    
    /**
     * Hide error message
     */
    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }
}

// Initialize when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // Author ID from INSPIRE-HEP
    const authorId = '1908124';
    
    // Create and initialize the component
    const publications = new InspirePublications(authorId, {
        publicationsElementId: 'publications-list',
        statsElementId: 'publication-stats',
        loadingElementId: 'publications-loading',
        errorElementId: 'publications-error',
        lastUpdatedElementId: 'last-updated',
        refreshButtonId: 'refresh-publications'
    });
    
    publications.init();
});
