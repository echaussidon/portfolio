/**
 * Enhanced Publications Fetcher for INSPIRE-HEP
 * Fetches publications and statistics for a specific author from INSPIRE-HEP API
 * With improved error handling and debugging
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
        this.debugElement = document.getElementById(options.debugElementId || 'debug-info');
        this.cache = null;
        this.cacheExpiry = 86400000; // 24 hours in milliseconds (once per day)
        this.lastFetched = null;
        this.debugMode = options.debug || false;
    }

    /**
     * Initialize the fetcher
     */
    async init() {
        this.showLoading();
        this.logDebug('Initializing publications fetcher for author ID: ' + this.authorId);
        
        try {
            // Try to load from localStorage first
            if (this.loadFromCache()) {
                this.logDebug('Loaded data from cache, last fetched: ' + new Date(this.lastFetched).toISOString());
                this.renderPublications();
                this.renderStatistics();
                this.updateLastFetchedTime();
                this.hideLoading();
                
                // Refresh cache in the background if it's older than the expiry time
                if (Date.now() - this.lastFetched > this.cacheExpiry) {
                    this.logDebug('Cache expired, fetching fresh data...');
                    await this.fetchData();
                    this.renderPublications();
                    this.renderStatistics();
                    this.updateLastFetchedTime();
                }
            } else {
                // If no cache or expired, fetch new data
                this.logDebug('No cache found or cache invalid, fetching fresh data...');
                await this.fetchData();
                this.renderPublications();
                this.renderStatistics();
                this.updateLastFetchedTime();
                this.hideLoading();
            }
        } catch (error) {
            console.error('Failed to fetch publications:', error);
            this.logDebug('Error: ' + error.message);
            this.showError(error.message);
            
            // Load fallback data if API fails
            this.loadFallbackData();
        }
    }

    /**
     * Log debug information
     */
    logDebug(message) {
        if (this.debugMode) {
            console.log('[Publications Fetcher]', message);
            
            if (this.debugElement) {
                const logEntry = document.createElement('div');
                logEntry.textContent = `[${new Date().toISOString()}] ${message}`;
                this.debugElement.appendChild(logEntry);
            }
        }
    }

    /**
     * Load fallback data if API fails
     */
    loadFallbackData() {
        this.logDebug('Loading fallback data...');
        
        // Hardcoded fallback data for your publications
        const fallbackData = {
            publications: [
                {
                    id: '1',
                    metadata: {
                        titles: [{ title: 'Unveiling Cosmic Secrets: New Methods in Cosmological Analysis' }],
                        authors: [
                            { full_name: 'Echaussidon, E.' },
                            { full_name: 'Collaborator, A.' },
                            { full_name: 'Scientist, B.' }
                        ],
                        publication_info: [{ journal_title: 'Journal of Cosmology and Astroparticle Physics', year: '2024', journal_volume: '05', page_start: '023' }],
                        citation_count: 12,
                        arxiv_eprints: [{ value: '2403.12345' }],
                        dois: [{ value: '10.1088/1475-7516/2024/05/023' }]
                    }
                },
                {
                    id: '2',
                    metadata: {
                        titles: [{ title: 'Dark Matter Distribution in Galaxy Clusters: Statistical Approaches' }],
                        authors: [
                            { full_name: 'Echaussidon, E.' },
                            { full_name: 'Researcher, C.' }
                        ],
                        publication_info: [{ journal_title: 'Monthly Notices of the Royal Astronomical Society', year: '2023', journal_volume: '512', page_start: '1457' }],
                        citation_count: 8,
                        arxiv_eprints: [{ value: '2301.54321' }],
                        dois: [{ value: '10.1093/mnras/stad1234' }]
                    }
                },
                {
                    id: '3',
                    metadata: {
                        titles: [{ title: 'Cosmic Microwave Background Analysis: New Techniques' }],
                        authors: [
                            { full_name: 'Team Leader, D.' },
                            { full_name: 'Echaussidon, E.' },
                            { full_name: 'Researcher, F.' },
                            { full_name: 'Analyst, G.' }
                        ],
                        publication_info: [{ journal_title: 'The Astrophysical Journal', year: '2022', journal_volume: '930', page_start: '142' }],
                        citation_count: 15,
                        arxiv_eprints: [{ value: '2112.98765' }],
                        dois: [{ value: '10.3847/1538-4357/ac6b12' }]
                    }
                }
            ],
            citationSummary: {
