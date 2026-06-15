document.addEventListener('DOMContentLoaded', () => {
    // App State
    let releases = [];
    let activeFilters = {
        search: '',
        type: 'ALL'
    };

    // DOM Elements
    const releasesGrid = document.getElementById('releasesGrid');
    const loadingState = document.getElementById('loadingState');
    const emptyState = document.getElementById('emptyState');
    const searchInput = document.getElementById('searchInput');
    const typeFilter = document.getElementById('typeFilter');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const spinnerIcon = document.getElementById('spinnerIcon');
    const cacheTime = document.getElementById('cacheTime');

    // Stats Elements
    const statTotal = document.getElementById('statTotal');
    const statFeatures = document.getElementById('statFeatures');
    const statChanges = document.getElementById('statChanges');
    const statOthers = document.getElementById('statOthers');

    // Modal Elements
    const tweetModal = document.getElementById('tweetModal');
    const tweetTextarea = document.getElementById('tweetTextarea');
    const charCounter = document.getElementById('charCounter');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelTweetBtn = document.getElementById('cancelTweetBtn');
    const shareTweetBtn = document.getElementById('shareTweetBtn');

    // Initialize
    fetchReleases();

    // Event Listeners
    refreshBtn.addEventListener('click', () => fetchReleases(true));
    exportCsvBtn.addEventListener('click', exportToCsv);
    
    searchInput.addEventListener('input', (e) => {
        activeFilters.search = e.target.value.toLowerCase().trim();
        filterAndRenderReleases();
    });

    typeFilter.addEventListener('change', (e) => {
        activeFilters.type = e.target.value;
        filterAndRenderReleases();
    });

    // Close Modal Events
    closeModalBtn.addEventListener('click', hideTweetModal);
    cancelTweetBtn.addEventListener('click', hideTweetModal);
    tweetModal.addEventListener('click', (e) => {
        if (e.target === tweetModal) hideTweetModal();
    });

    // Character counting for Tweet Draft
    tweetTextarea.addEventListener('input', updateCharCount);

    // Fetch releases from Flask API
    async function fetchReleases(forceRefresh = false) {
        showLoading(true);
        try {
            const url = `/api/releases${forceRefresh ? '?refresh=true' : ''}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.success) {
                releases = data.releases;
                
                // Update Cache / Refresh times
                if (data.last_fetched) {
                    const fetchDate = new Date(data.last_fetched);
                    cacheTime.textContent = `Last synced: ${fetchDate.toLocaleTimeString()} (${data.cached ? 'cached' : 'freshly fetched'})`;
                }

                showToast(forceRefresh ? 'Releases successfully refreshed!' : 'Releases loaded successfully!', 'success');
                filterAndRenderReleases();
                updateStats();
            } else {
                showToast(`Error: ${data.error || 'Failed to fetch releases'}`, 'error');
                showErrorState();
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showToast('Network error while connecting to Flask backend.', 'error');
            showErrorState();
        } finally {
            showLoading(false);
        }
    }

    // Filter and Render UI
    function filterAndRenderReleases() {
        const filtered = releases.filter(item => {
            const matchesSearch = item.plain_text.toLowerCase().includes(activeFilters.search) || 
                                  item.type.toLowerCase().includes(activeFilters.search) ||
                                  item.date.toLowerCase().includes(activeFilters.search);
            const matchesType = activeFilters.type === 'ALL' || item.type === activeFilters.type;
            
            return matchesSearch && matchesType;
        });

        renderReleases(filtered);
    }

    function renderReleases(items) {
        releasesGrid.innerHTML = '';
        
        if (items.length === 0) {
            emptyState.classList.remove('hidden');
            releasesGrid.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        releasesGrid.classList.remove('hidden');

        items.forEach((item, index) => {
            const card = document.createElement('div');
            card.className = 'release-card';
            card.style.animationDelay = `${index * 0.05}s`;

            // Define pill class based on update type
            const typeLower = item.type.toLowerCase();
            let pillClass = 'pill-general';
            if (typeLower.includes('feature')) pillClass = 'pill-feature';
            else if (typeLower.includes('change') || typeLower.includes('update')) pillClass = 'pill-changed';
            else if (typeLower.includes('deprecat') || typeLower.includes('delete') || typeLower.includes('remove')) pillClass = 'pill-deprecated';
            else if (typeLower.includes('fix')) pillClass = 'pill-fixed';

            card.innerHTML = `
                <div>
                    <div class="card-top">
                        <span class="release-date">
                            <i class="fa-regular fa-calendar"></i>
                            ${item.date}
                        </span>
                        <span class="pill ${pillClass}">${item.type}</span>
                    </div>
                    <div class="card-content">
                        ${item.content_html}
                    </div>
                </div>
                <div class="card-actions" style="gap: 8px;">
                    <button class="btn btn-secondary btn-copy-card" data-id="${item.id}" title="Copy to clipboard">
                        <i class="fa-regular fa-copy"></i>
                        <span>Copy</span>
                    </button>
                    <button class="btn btn-twitter btn-tweet-card" data-id="${item.id}">
                        <i class="fa-brands fa-x-twitter"></i>
                        <span>Draft Tweet</span>
                    </button>
                </div>
            `;

            // Add Event Listener to Copy Button
            card.querySelector('.btn-copy-card').addEventListener('click', () => {
                copyToClipboard(item);
            });

            // Add Event Listener to Tweet Button
            card.querySelector('.btn-tweet-card').addEventListener('click', () => {
                openTweetComposer(item);
            });

            releasesGrid.appendChild(card);
        });
    }

    // Open Modal with Pre-filled Tweet
    function openTweetComposer(item) {
        const hashtags = ' #BigQuery #GoogleCloud';
        const dateStr = item.date;
        const prefix = `BigQuery Release (${dateStr}) - ${item.type}: `;
        
        // Compute available space for the description (280 characters max)
        const allowedDescLength = 280 - prefix.length - hashtags.length - 5; // offset
        let desc = item.plain_text;
        
        if (desc.length > allowedDescLength) {
            desc = desc.substring(0, allowedDescLength - 3) + '...';
        }

        const draftTweetText = `${prefix}${desc}${hashtags}`;
        
        tweetTextarea.value = draftTweetText;
        updateCharCount();
        
        // Show modal
        tweetModal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // prevent scrolling behind modal

        // Bind Share Button for this specific text
        shareTweetBtn.onclick = () => {
            const tweetContent = tweetTextarea.value;
            const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetContent)}`;
            window.open(twitterUrl, '_blank');
            hideTweetModal();
            showToast('Redirected to Twitter/X compose window!', 'info');
        };
    }

    function hideTweetModal() {
        tweetModal.classList.add('hidden');
        document.body.style.overflow = ''; // restore scrolling
    }

    function updateCharCount() {
        const len = tweetTextarea.value.length;
        charCounter.textContent = `${len} / 280`;
        
        if (len > 280) {
            charCounter.classList.add('danger');
            shareTweetBtn.disabled = true;
            shareTweetBtn.style.opacity = 0.5;
            shareTweetBtn.style.pointerEvents = 'none';
        } else {
            charCounter.classList.remove('danger');
            shareTweetBtn.disabled = false;
            shareTweetBtn.style.opacity = 1;
            shareTweetBtn.style.pointerEvents = 'auto';
        }
    }

    // Update Metrics
    function updateStats() {
        statTotal.textContent = releases.length;
        
        const features = releases.filter(r => r.type.toLowerCase().includes('feature')).length;
        const changes = releases.filter(r => r.type.toLowerCase().includes('change') || r.type.toLowerCase().includes('update')).length;
        const others = releases.length - features - changes;

        statFeatures.textContent = features;
        statChanges.textContent = changes;
        statOthers.textContent = others;
    }

    // Loading State helpers
    function showLoading(isLoading) {
        if (isLoading) {
            loadingState.classList.remove('hidden');
            releasesGrid.classList.add('hidden');
            emptyState.classList.add('hidden');
            spinnerIcon.classList.add('spinning');
            refreshBtn.disabled = true;
        } else {
            loadingState.classList.add('hidden');
            spinnerIcon.classList.remove('spinning');
            refreshBtn.disabled = false;
        }
    }

    function showErrorState() {
        emptyState.classList.remove('hidden');
        releasesGrid.classList.add('hidden');
        // Set custom text inside empty state for errors
        emptyState.querySelector('h3').textContent = 'Oops! Something went wrong';
        emptyState.querySelector('p').textContent = 'We were unable to load the release notes. Please click Refresh to try again.';
    }

    // Toast Notification helper
    function showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        let icon = '<i class="fa-solid fa-circle-info"></i>';
        if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
        if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';

        toast.innerHTML = `
            ${icon}
            <span>${message}</span>
        `;
        
        container.appendChild(toast);
        
        // Remove toast after 4 seconds
        setTimeout(() => {
            toast.style.animation = 'slideInRight 0.3s ease-in reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    // Copy update details to clipboard
    function copyToClipboard(item) {
        const textToCopy = `BigQuery Release Note (${item.date}) - ${item.type}:\n${item.plain_text}`;
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                showToast('Copied release note to clipboard!', 'success');
            })
            .catch(err => {
                console.error('Error copying text: ', err);
                showToast('Failed to copy to clipboard.', 'error');
            });
    }

    // Export currently filtered releases to CSV
    function exportToCsv() {
        const filtered = releases.filter(item => {
            const matchesSearch = item.plain_text.toLowerCase().includes(activeFilters.search) || 
                                  item.type.toLowerCase().includes(activeFilters.search) ||
                                  item.date.toLowerCase().includes(activeFilters.search);
            const matchesType = activeFilters.type === 'ALL' || item.type === activeFilters.type;
            return matchesSearch && matchesType;
        });

        if (filtered.length === 0) {
            showToast('No releases available to export.', 'error');
            return;
        }

        let csvRows = [];
        csvRows.push("Date,Type,Description");

        filtered.forEach(item => {
            const cleanDate = `"${item.date.replace(/"/g, '""')}"`;
            const cleanType = `"${item.type.replace(/"/g, '""')}"`;
            const cleanText = `"${item.plain_text.replace(/"/g, '""')}"`;
            csvRows.push(`${cleanDate},${cleanType},${cleanText}`);
        });

        const csvContent = csvRows.join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `bigquery_releases_${new Date().toISOString().slice(0,10)}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast(`Successfully exported ${filtered.length} release notes to CSV!`, 'success');
    }
});
