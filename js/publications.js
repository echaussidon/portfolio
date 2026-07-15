/**
 * Publications.js
 * Script to fetch and display publication data from INSPIRE HEP
 */

// Utilise l'ID INSPIRE de l'auteur pour une requête robuste
const AUTHOR_QUERY = 'authors.recid:1908124';
// On ne demande que les champs utilisés par l'affichage : cela réduit fortement la taille de la
// réponse (par défaut l'API renvoie aussi les résumés, références, etc.) et accélère le chargement,
// en particulier sur les connexions mobiles/lentes.
const PUBLICATION_FIELDS = 'titles,authors,publication_info,dois,arxiv_eprints,citation_count,preprint_date,date';
const API_URL = `https://inspirehep.net/api/literature?sort=mostrecent&size=100&page=1&fields=${PUBLICATION_FIELDS}&q=${encodeURIComponent(AUTHOR_QUERY)}`;

// Stats to track
let totalPublications = 0;
let totalCitations = 0;
let hIndex = 0;

function getPublicationDate(metadata) {
  if (!metadata) return new Date(0);
  const rawDate = metadata.preprint_date || metadata.date;
  if (!rawDate) return new Date(0);
  const parsedDate = new Date(rawDate);
  return isNaN(parsedDate) ? new Date(0) : parsedDate;
}

function getPublicationYear(publication) {
  const date = getPublicationDate(publication && publication.metadata ? publication.metadata : null);
  const year = date.getFullYear();
  return year > 0 ? year : 'Unknown year';
}

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
  // Nouvelle logique : ne fetch que si le cache date de plus d'un jour
  let cached = getPublicationsFromCache();
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  let shouldFetch = true;
  if (cached && cached.timestamp && cached.data && (now - cached.timestamp < oneDay)) {
    // Moins d'un jour : on affiche le cache, mais on va quand même fetch en arrière-plan
    shouldFetch = false;
    setTimeout(async () => {
      try {
        const response = await fetch(API_URL);
        if (response.ok) {
          const data = await response.json();
          savePublicationsToCache(data);
        }
      } catch (e) {}
    }, 0);
    return cached.data;
  }
  // Sinon, fetch et met à jour le cache
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    let data = await response.json();
    // Fallback si aucun résultat (sécurité en cas de changement d'indexation)
    if (!data || !data.hits || !data.hits.hits || data.hits.hits.length === 0) {
      const altQuery = `https://inspirehep.net/api/literature?sort=mostrecent&size=100&page=1&fields=${PUBLICATION_FIELDS}&q=${encodeURIComponent('a "Chaussidon, E." OR author:"Edmond Chaussidon"')}`;
      try {
        const altResp = await fetch(altQuery);
        if (altResp.ok) {
          const altData = await altResp.json();
          if (altData && altData.hits && altData.hits.hits && altData.hits.hits.length > 0) {
            data = altData;
          }
        }
      } catch (e) { /* noop */ }
    }
    savePublicationsToCache(data);
    cached = getPublicationsFromCache();
    return data;
  } catch (error) {
    console.error('Error fetching publications:', error);
    cached = getPublicationsFromCache();
    if (cached && cached.data) return cached.data;
    return null;
  }
}

// Render publications list and stats (état stable)
function renderPublications(data, sortBy = 'date') {
  const publicationsContainer = document.getElementById('publications-container');
  const statsContainer = document.getElementById('publication-stats');
  if (!data || !data.hits || !data.hits.hits) {
    publicationsContainer.innerHTML = '<p>Unable to load publications from INSPIRE at the moment. Please try again later.</p>';
    return;
  }
  // Filtrer la publication à exclure
  let filteredPapers = data.hits.hits.filter(paper => {
    const title = paper.metadata && paper.metadata.titles && paper.metadata.titles[0] ? paper.metadata.titles[0].title : '';
    return title.trim() !== 'Studying inflation with quasars from the DESI spectroscopic survey';
  });

  // Filtre supplémentaire : seulement les articles où l'utilisateur est dans les 8 premiers auteurs
  const authorRankCheckbox = document.getElementById('author-rank-checkbox');
  const firstAuthorCheckbox = document.getElementById('first-author-checkbox');
  if (authorRankCheckbox && authorRankCheckbox.checked) {
    filteredPapers = filteredPapers.filter(paper => {
      const authors = paper.metadata && paper.metadata.authors ? paper.metadata.authors : [];
      // Cherche l'index de l'auteur (nom de famille insensible à la casse)
      const idx = authors.findIndex(a => a.full_name && a.full_name.toLowerCase().includes('chaussidon'));
      return idx > -1 && idx < 8;
    });
  }

  // Filtre supplémentaire : seulement les articles où l'utilisateur est premier auteur
  if (firstAuthorCheckbox && firstAuthorCheckbox.checked) {
    filteredPapers = filteredPapers.filter(paper => {
      const authors = paper.metadata && paper.metadata.authors ? paper.metadata.authors : [];
      const idx = authors.findIndex(a => a.full_name && a.full_name.toLowerCase().includes('chaussidon'));
      return idx === 0;
    });
  }

  // Tri dynamique
  if (sortBy === 'citations') {
    filteredPapers = filteredPapers.sort((a, b) => (b.metadata.citation_count || 0) - (a.metadata.citation_count || 0));
  } else {
    // Par date décroissante (plus récentes d'abord)
    filteredPapers = filteredPapers.sort((a, b) => {
      const dateA = getPublicationDate(a.metadata);
      const dateB = getPublicationDate(b.metadata);
      return dateB - dateA;
    });
  }

  totalPublications = filteredPapers.length;
  // Réinitialiser le compteur de citations
  totalCitations = 0;
  // Render publications et compter les citations
  let publicationsHTML = '';
  let lastRenderedYear = null;
  filteredPapers.forEach(paper => {
    totalCitations += paper.metadata.citation_count || 0;

    if (sortBy === 'date') {
      const currentYear = getPublicationYear(paper);
      if (currentYear !== lastRenderedYear) {
        publicationsHTML += `<li class="year-separator"><div class="year-separator-label">${currentYear}</div></li>`;
        lastRenderedYear = currentYear;
      }
    }

    publicationsHTML += `<li>${createPublicationItem(paper)}</li>`;
  });
  publicationsContainer.innerHTML = publicationsHTML;
  // Calculate h-index
  hIndex = calculateHIndex(filteredPapers);
  // Render year chart
  renderYearChart(filteredPapers);
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

// Render line chart of publications per year (reflects current filters), style plt.plot
function renderYearChart(papers) {
  const chartContainer = document.getElementById('publications-year-chart');
  if (!chartContainer) return;
  if (!papers || papers.length === 0) {
    chartContainer.innerHTML = '<p class="year-chart-empty">No publication to display.</p>';
    return;
  }

  const counts = {};
  papers.forEach(paper => {
    const year = getPublicationYear(paper);
    if (year === 'Unknown year') return;
    counts[year] = (counts[year] || 0) + 1;
  });

  const knownYears = Object.keys(counts).map(Number);
  if (knownYears.length === 0) {
    chartContainer.innerHTML = '<p class="year-chart-empty">No publication to display.</p>';
    return;
  }

  // Construit une série continue (une valeur par année, 0 si aucune publication)
  const minYear = Math.min(...knownYears);
  const maxYear = Math.max(...knownYears);
  const years = [];
  for (let y = minYear; y <= maxYear; y++) years.push(y);
  const values = years.map(y => counts[y] || 0);
  const maxCount = Math.max(...values, 1);

  // Dimensions du graphique SVG
  const width = 800;
  const height = 220;
  const marginLeft = 40;
  const marginRight = 20;
  const marginTop = 20;
  const marginBottom = 36;
  const plotWidth = width - marginLeft - marginRight;
  const plotHeight = height - marginTop - marginBottom;

  const xStep = years.length > 1 ? plotWidth / (years.length - 1) : 0;
  const xPos = i => marginLeft + i * xStep;
  const yPos = v => marginTop + plotHeight - (v / maxCount) * plotHeight;

  const points = values.map((v, i) => `${xPos(i)},${yPos(v)}`).join(' ');

  // Graduations horizontales (axe y)
  const yTicksCount = Math.min(maxCount, 5);
  let gridLines = '';
  for (let t = 0; t <= yTicksCount; t++) {
    const val = Math.round((maxCount / yTicksCount) * t);
    const y = yPos(val);
    gridLines += `
      <line x1="${marginLeft}" y1="${y}" x2="${width - marginRight}" y2="${y}" class="year-chart-grid" />
      <text x="${marginLeft - 8}" y="${y + 4}" class="year-chart-axis-label" text-anchor="end">${val}</text>`;
  }

  // Labels de l'axe x (années)
  let xLabels = '';
  years.forEach((y, i) => {
    xLabels += `<text x="${xPos(i)}" y="${height - marginBottom + 18}" class="year-chart-axis-label" text-anchor="middle">${y}</text>`;
  });

  // Points avec info-bulle (title)
  let dots = '';
  values.forEach((v, i) => {
    dots += `<circle cx="${xPos(i)}" cy="${yPos(v)}" r="4" class="year-chart-dot"><title>${v} publication${v !== 1 ? 's' : ''} in ${years[i]}</title></circle>`;
  });

  chartContainer.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="year-chart-svg" preserveAspectRatio="xMidYMid meet">
      ${gridLines}
      ${xLabels}
      <polyline points="${points}" class="year-chart-line" fill="none" />
      ${dots}
    </svg>`;
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
  const citations = pub.citation_count || 0;
  const doi = pub.dois && pub.dois.length > 0 ? pub.dois[0].value : null;
  const arxiv = pub.arxiv_eprints && pub.arxiv_eprints.length > 0 ? 
    pub.arxiv_eprints[0].value : null;
  const date = getPublicationDate(pub);

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
  ${date && !isNaN(date) ? `,  <span class='pub-date'>${date.toLocaleString('en-US', { month: 'short' })} ${date.getFullYear()}</span>` : ``}
        ${arxivBtn ? ` | ${arxivBtn}` : ''}
        ${citations ? `<span class=\"citations-inline\"> | Citations: <strong>${citations}</strong></span>` : ''}
      </p>
      <div class="publication-links">
  `;
  
  pubHTML += `
      </div>
    </div>
  `;
  
  return pubHTML;
}

// Initialisation DOM
document.addEventListener('DOMContentLoaded', async () => {
  let currentSort = 'date';
  const sortSelect = document.getElementById('publication-sort-select');
  const authorRankCheckbox = document.getElementById('author-rank-checkbox');
  const firstAuthorCheckbox = document.getElementById('first-author-checkbox');

  // Données gardées en mémoire (variable JS) une fois le fetch/cache initial résolu :
  // évite de relire/re-parser le localStorage (et donc tout délai perceptible) à chaque
  // changement de tri ou de filtre.
  let publicationsData = null;

  // Fonction pour afficher selon le tri courant et le filtre auteur
  function displayPublicationsWithSort(data) {
    if (!data) return;
    publicationsData = data;
    renderPublications(data, currentSort);
  }

  // 1. Affiche d'abord le cache s'il existe (instantané, aucune requête réseau)
  const cachedObj = getPublicationsFromCache();
  if (cachedObj && cachedObj.data) {
    displayPublicationsWithSort(cachedObj.data);
  } else {
    // Premier chargement (pas de cache) : on affiche un message d'attente immédiat
    const publicationsContainer = document.getElementById('publications-container');
    if (publicationsContainer) {
      publicationsContainer.innerHTML = '<p>Loading publications from INSPIRE HEP…</p>';
    }
  }

  // 2. Puis fetch (ou récupération du cache si trop récent pour refetch) et met à jour
  const data = await fetchPublicationsData();
  if (data) {
    displayPublicationsWithSort(data);
  }

  // 3. Gestion du select de tri et des filtres auteur : on réutilise directement les
  // données déjà en mémoire, sans repasser par le localStorage/JSON.parse.
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      currentSort = sortSelect.value;
      displayPublicationsWithSort(publicationsData);
    });
  }
  if (authorRankCheckbox) {
    authorRankCheckbox.addEventListener('change', () => {
      displayPublicationsWithSort(publicationsData);
    });
  }
  if (firstAuthorCheckbox) {
    firstAuthorCheckbox.addEventListener('change', () => {
      displayPublicationsWithSort(publicationsData);
    });
  }
});
