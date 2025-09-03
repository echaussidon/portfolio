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

// Fetch publications data
async function fetchPublicationsData() {
  try {
    const response = await fetch(API_URL);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching publications:', error);
    document.getElementById('publications-container').innerHTML = 
      `<p class="error">Failed to load publications data. Please try again later.</p>`;
    return null;
  }
}

// Calculate h-index from citation data
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
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.toLocaleString('default', { month: 'short' });
  
  return `${month} ${year}`;
}

// Extract authors with formatting
function formatAuthors(authors) {
  if (!authors || authors.length === 0) return 'N/A';
  
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
  const title = pub.titles ? pub.titles[0].title : 'No title';
  const authors = formatAuthors(pub.authors);
  const journal = pub.publication_info && pub.publication_info[0] ? 
    pub.publication_info[0].journal_title : 'Preprint';
  const date = pub.date ? formatDate(pub.date) : 'N/A';
  const citations = pub.citation_count || 0;
  const doi = pub.dois && pub.dois.length > 0 ? pub.dois[0].value : null;
  const arxiv = pub.arxiv_eprints && pub.arxiv_eprints.length > 0 ? 
    pub.arxiv_eprints[0].value : null;
  
  // Update total citations
  totalCitations += citations;
  
  // Build HTML
  let pubHTML = `
    <div class="publication-item">
      <h3>${title}</h3>
      <p class="authors">${authors}</p>
      <p class="journal"><em>${journal}</em>, ${date}</p>
      <p class="citations">Citations: ${citations}</p>
      <div class="publication-links">
  `;
  
  if (doi) {
    pubHTML += `<a href="https://doi.org/${doi}" target="_blank" rel="noopener">DOI</a>`;
  }
  
  if (arxiv) {
    pubHTML += `<a href="https://arxiv.org/abs/${arxiv}" target="_blank" rel="noopener">arXiv</a>`;
  }
  
  pubHTML += `
        <a href="https://inspirehep.net/literature/${publication.id}" target="_blank" rel="noopener">INSPIRE</a>
      </div>
    </div>
  `;
  
  return pubHTML;
}

// Render publications list and stats
function renderPublications(data) {
  const publicationsContainer = document.getElementById('publications-container');
  const statsContainer = document.getElementById('publication-stats');
  
  if (!data || !data.hits || !data.hits.hits) {
    publicationsContainer.innerHTML = '<p>No publications found.</p>';
    return;
  }
  
  const papers = data.hits.hits;
  totalPublications = papers.length;
  
  // Calculate h-index
  hIndex = calculateHIndex(papers);
  
  // Render stats
  if (statsContainer) {
    statsContainer.innerHTML = `
      <div class="stat-item">
        <span class="stat-number">${totalPublications}</span>
        <span class="stat-label">Publications</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${totalCitations}</span>
        <span class="stat-label">Citations</span>
      </div>
      <div class="stat-item">
        <span class="stat-number">${hIndex}</span>
        <span class="stat-label">h-index</span>
      </div>
    `;
  }
  
  // Render publications
  let publicationsHTML = '<div class="publications-list">';
  
  papers.forEach(paper => {
    publicationsHTML += createPublicationItem(paper);
  });
  
  publicationsHTML += '</div>';
  publicationsContainer.innerHTML = publicationsHTML;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const data = await fetchPublicationsData();
  if (data) {
    renderPublications(data);
  }
});
