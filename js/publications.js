/**
 * Instant-Loading Publications Component for INSPIRE-HEP
 * Displays publications immediately with pre-loaded data
 */

class PublicationsDisplay {
    constructor(authorId, options = {}) {
        this.authorId = authorId;
        this.apiBaseUrl = 'https://inspirehep.net/api';
        this.publicationsElement = document.getElementById(options.publicationsElementId || 'publications-list');
        this.statsElement = document.getElementById(options.statsElementId || 'publication-stats');
        this.loadingElement = document.getElementById(options.loadingElementId || 'publications-loading');
        this.errorElement = document.getElementById(options.errorElementId || 'publications-error');
        this.lastUpdatedElement = document.getElementById(options.lastUpdatedElementId || 'last-updated');
        this.refreshButton = document.getElementById(options.refreshButtonId || 'refresh-publications');
        
        // Bind event handler
        if (this.refreshButton) {
            this.refreshButton.addEventListener('click', () => this.refreshData());
        }
    }

    /**
     * Initialize with immediate data display
     */
    init() {
        // Hide loading state immediately
        this.hideLoading();
        
        // Display pre-loaded data instantly
        this.displayFallbackData();
        
        // Attempt API fetch in the background
        this.fetchDataInBackground();
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
     * Update timestamp display
     */
    updateTimestamp(isFallback = false) {
        if (this.lastUpdatedElement) {
            const now = new Date();
            const formattedDate = now.toISOString().split('T')[0]; // YYYY-MM-DD
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const formattedTime = `${hours}:${minutes}:${seconds}`;
            
            let timestampText = `${formattedDate} ${formattedTime}`;
            if (isFallback) {
                timestampText += ' (using pre-loaded data)';
            }
            
            this.lastUpdatedElement.textContent = timestampText;
        }
    }
    
    /**
     * Display error message
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
    
    /**
     * Force refresh of data
     */
    refreshData() {
        this.showLoading();
        this.hideError();
        this.fetchDataInBackground(true); // true = force refresh UI
    }

    /**
     * Fetch data in background without blocking UI
     */
    fetchDataInBackground(forceRefresh = false) {
        // Attempt to fetch from API without blocking page load
        setTimeout(() => {
            fetch(`${this.apiBaseUrl}/literature?size=100&sort=mostrecent&q=author:${this.authorId}&_=${Date.now()}`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json'
                },
                mode: 'cors'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`API error: ${response.status}`);
                }
                return response.json();
            })
            .then(publicationsData => {
                // If we successfully got publications data, try to get citation data
                return fetch(`${this.apiBaseUrl}/authors/${this.authorId}?_=${Date.now()}`, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    },
                    mode: 'cors'
                })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`Author API error: ${response.status}`);
                    }
                    return response.json();
                })
                .then(citationsData => {
                    // We have both data sources, update the UI
                    const data = {
                        publications: publicationsData.hits.hits,
                        citationSummary: citationsData.metadata.citation_summary,
                        metadata: citationsData.metadata
                    };
                    
                    if (forceRefresh) {
                        this.renderPublications(data.publications);
                        this.renderStatistics(data);
                        this.updateTimestamp(false);
                        this.hideLoading();
                    }
                    
                    // Store for future page loads
                    try {
                        localStorage.setItem(`inspire-publications-${this.authorId}`, JSON.stringify({
                            data: data,
                            timestamp: Date.now()
                        }));
                    } catch (e) {
                        console.warn('Failed to save to cache:', e);
                    }
                });
            })
            .catch(error => {
                console.warn('Background fetch failed:', error);
                if (forceRefresh) {
                    this.showError(`Could not refresh data: ${error.message}`);
                    this.hideLoading();
                }
            });
        }, 100); // Short delay to ensure UI loads first
    }

    /**
     * Immediately display pre-loaded data
     */
    displayFallbackData() {
        // First try to get data from localStorage
        try {
            const cachedData = localStorage.getItem(`inspire-publications-${this.authorId}`);
            if (cachedData) {
                const parsedData = JSON.parse(cachedData);
                this.renderPublications(parsedData.data.publications);
                this.renderStatistics(parsedData.data);
                this.updateTimestamp(false);
                return;
            }
        } catch (e) {
            console.warn('Failed to load from cache:', e);
        }
        
        // Otherwise use hardcoded data
        const fallbackData = {
            publications: [
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
            ],
            citationSummary: {
                citation_count: 20,
                h_index: 2
            },
            metadata: {
                name: 'Echaussidon, E.'
            }
        };
        
        this.renderPublications(fallbackData.publications);
        this.renderStatistics(fallbackData);
        this.updateTimestamp(true);
    }

    /**
     * Render publications list
     */
    renderPublications(publications) {
        if (!this.publicationsElement || !publications) return;
        
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
    renderStatistics(data) {
        if (!this.statsElement || !data) return;
        
        const stats = data.citationSummary;
        
        // Total publications
        const totalPubs = data.publications.length;
        
        // Extract citation stats
        const citations = stats ? stats.citation_count : 0;
        const hIndex = stats ? stats.h_index : 0;
        
        // Calculate publications by year
        const pubsByYear = {};
        data.publications.forEach(pub => {
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
    
    // Create and initialize the publications display
    const display = new PublicationsDisplay(authorId, {
        publicationsElementId: 'publications-list',
        statsElementId: 'publication-stats',
        loadingElementId: 'publications-loading',
        errorElementId: 'publications-error',
        lastUpdatedElementId: 'last-updated',
        refreshButtonId: 'refresh-publications'
    });
    
    display.init();
});
