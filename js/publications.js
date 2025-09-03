/**
 * Publications.js
 * Script to fetch and display publication data from INSPIRE HEP
 */

const AUTHOR_QUERY = 'a E.Chaussidon.1';
const API_URL = `https://inspirehep.net/api/literature?sort=mostrecent&size=100&page=1&q=${encodeURIComponent(AUTHOR_QUERY)}`;

// Stats to track
let totalPublications = 0;
let totalCitations = 0;
let hIndex = 0;

// --- Cache helpers ---
// (imported from publications-cache.js if using modules, else copy here)
const PUBLICATIONS_CACHE_KEY = 'publications_cache_v1';
function savePublicationsToCache(data) {
  try {
    localStorage.setItem(PUBLICATIONS_CACHE_KEY, JSON.stringify({
      data,
      timestamp: Date.now()
    }));
  } catch (e) {}
}
function getPublicationsFromCache() {
  try {
    const cached = localStorage.getItem(PUBLICATIONS_CACHE_KEY);
    if (!cached) return null;
    return JSON.parse(cached);
  } catch (e) { return null; }
}

// Fetch publications data
async function fetchPublicationsData() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();
    savePublicationsToCache(data);
    return data;
  } catch (error) {
    console.error('Error fetching publications:', error);
    return null;
  }
}

// Render publications list and stats (état stable)
function renderPublications(data) {
  const publicationsContainer = document.getElementById('publications-container');
  const statsContainer = document.getElementById('publication-stats');
  if (!data || !data.hits || !data.hits.hits) {
    publicationsContainer.innerHTML = '<p>No publications found.</p>';
    return;
  }
  // Filtrer la publication à exclure
  const filteredPapers = data.hits.hits.filter(paper => {
    const title = paper.metadata && paper.metadata.titles && paper.metadata.titles[0] ? paper.metadata.titles[0].title : '';
    return title.trim() !== 'Studying inflation with quasars from the DESI spectroscopic survey';
  });
  totalPublications = filteredPapers.length;
  // Réinitialiser le compteur de citations
  totalCitations = 0;
  // Render publications et compter les citations
  let publicationsHTML = '';
  filteredPapers.forEach(paper => {
    totalCitations += paper.metadata.citation_count || 0;
    publicationsHTML += `<li>${createPublicationItem(paper)}</li>`;
  });
  publicationsContainer.innerHTML = publicationsHTML;
  // Calculate h-index
  hIndex = calculateHIndex(filteredPapers);
  // Render stats
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="publication-stat-box">
        <div class="publication-stat-number">${totalPublications}</div>
        <div class="publication-stat-label">Publications</div>
      </div>
      <div class="publication-stat-box">
        <div class="publication-stat-number">${totalCitations}</div>
        <div class="publication-stat-label">Citations</div>
      </div>
      <div class="publication-stat-box">
        <div class="publication-stat-number">${hIndex}</div>
        <div class="publication-stat-label">h-index</div>
      </div>
    `;
  }
}
function calculateHIndex(papers) {
  if (!papers || papers.length === 0) return 0;
  
  // Extract citation counts and sort in descending order
  const citationCounts = papers
    .map(paper => paper.metadata.citation_count || 0)
    .sort((a, b) => b - a);
  
  let h = 0;
  for (let i = 0; i < citationCounts.length; i++) {
    if (citationCounts[i] >= i + 1) {
      h = i + 1;
    } else {
      break;
    }
  }
  
  return h;
}

// Format publication date
function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'short' });
  
  return `${month} ${year}`;
}

// Extract authors with formatting
function formatAuthors(authors) {
  if (!authors || authors.length === 0) return '';
  
  // Limit to first 5 authors if there are many
  const authorList = authors.slice(0, 5);
  const authorNames = authorList.map(author => {
    const name = author.full_name || '';
    // Highlight your name
    if (name.includes('Chaussidon')) {
      return `<strong>${name}</strong>`;
    }
    return name;
  });
  
  let authorString = authorNames.join(', ');
  if (authors.length > 5) {
    authorString += ` et al.`;
  }
  
  return authorString;
}

// Render publication item
function createPublicationItem(publication) {
  const pub = publication.metadata;
  const title = pub.titles ? pub.titles[0].title : '';
  const authors = formatAuthors(pub.authors);
  const journal = pub.publication_info && pub.publication_info[0] ? 
    pub.publication_info[0].journal_title : '';
  const date = pub.date ? formatDate(pub.date) : '';
  const citations = pub.citation_count || 0;
  const doi = pub.dois && pub.dois.length > 0 ? pub.dois[0].value : null;
  const arxiv = pub.arxiv_eprints && pub.arxiv_eprints.length > 0 ? 
    pub.arxiv_eprints[0].value : null;
  
  // Ne pas incrémenter ici, le total est géré dans renderPublications
  
  // Build HTML
  // Format mois et année (ex: Sep 2025)
  let monthYear = '';
  if (pub.date) {
    const d = new Date(pub.date);
    const month = d.toLocaleString('en-US', { month: 'short' });
    const year = d.getFullYear();
    monthYear = `${month} ${year}`;
  }
  let arxivBtn = '';
  if (arxiv) {
    arxivBtn = `<a href="https://arxiv.org/abs/${arxiv}" target="_blank" rel="noopener" class="arxiv-btn">arXiv:${arxiv}</a>`;
  }
  let journalHTML = '';
  if (doi && journal) {
    journalHTML = `<a href="https://doi.org/${doi}" target="_blank" rel="noopener"><em>${journal}</em></a>`;
  } else {
    journalHTML = `<em>${journal || 'Preprint'}</em>`;
  }
  let pubHTML = `
    <div class="publication-item">
      <h3><a href="https://inspirehep.net/literature/${publication.id}" target="_blank" rel="noopener">${title}</a></h3>
      <p class="authors">${authors}</p>
      <p class="journal">
        ${journalHTML}
        ${monthYear ? `, <span class='pub-date'>${monthYear}</span>` : ''}
        ${arxivBtn ? ` | ${arxivBtn}` : ''}
        ${citations ? `<span class=\"citations-inline\"> | Citations: <strong>${citations}</strong></span>` : ''}
      </p>
      <div class="publication-links">
  `;
  
  // DOI link déjà intégré au nom du journal si présent
  
  // arxivBtn déjà affiché sur la ligne du journal
  
  pubHTML += `
      </div>
    </div>
  `;
  
  return pubHTML;
}

// --- Suppression du tri dynamique, retour à la version simple ---
// (renderPublications simple déjà défini plus haut)

// Affiche la date de mise à jour dans la barre info (en anglais)
function updateInspireInfoBar(cacheObj) {
  const infoBar = document.getElementById('inspire-update-info');
  if (!infoBar) return;
  if (cacheObj && cacheObj.timestamp) {
    const d = new Date(cacheObj.timestamp);
    const dateStr = d.toLocaleDateString('en-GB');
    const timeStr = d.toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});
    infoBar.textContent = `Last update: ${dateStr} at ${timeStr} from `;
  } else {
    infoBar.textContent = `Loading publication list from Inspire HEP...`;
  }
}

// Initialisation DOM
document.addEventListener('DOMContentLoaded', async () => {
  // 1. Affiche d'abord le cache s'il existe
  const cachedObj = getPublicationsFromCache();
  if (cachedObj && cachedObj.data) {
    renderPublications(cachedObj.data);
    updateInspireInfoBar(cachedObj);
  } else {
    updateInspireInfoBar(null);
  }
  // 2. Puis fetch et met à jour si besoin
  const data = await fetchPublicationsData();
  if (data) {
    renderPublications(data);
    // Met à jour la barre info avec la nouvelle date
    const newCache = getPublicationsFromCache();
    updateInspireInfoBar(newCache);
  }
});
