const defaultCenter = [11.237200, 125.001100];
const map = L.map('map', {
    center: defaultCenter,
    zoom: 17,               
    minZoom: 15,            
    maxZoom: 20,
    zoomControl: false 
});

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 20,
    maxNativeZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

let globalGeoJSONData = null;
let mapLayers = {};

const categoryColors = {
    "Academic Buildings": "#3b82f6",     
    "Administrative Offices": "#8b5cf6", 
    "Student Facilities": "#f97316",     
    "Resource Centers": "#10b981",       
    "Residential Areas": "#ef4444",      
    "Other Facilities": "#64748b"        
};

const aboutTrigger = document.getElementById('nav-about-trigger');
const contactTrigger = document.getElementById('nav-contact-trigger');
const aboutModal = document.getElementById('about-info-modal');
const contactModal = document.getElementById('contact-info-modal');
const aboutClose = document.getElementById('about-modal-close');
const contactClose = document.getElementById('contact-modal-close');

function toggleModalVisibility(modalTarget, makeVisible) {
    if (!modalTarget) return;
    if (makeVisible) {
        modalTarget.classList.remove('hidden');
    } else {
        modalTarget.classList.add('hidden');
    }
}

if (aboutTrigger) {
    aboutTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModalVisibility(aboutModal, true);
    });
}
if (contactTrigger) {
    contactTrigger.addEventListener('click', (e) => {
        e.preventDefault();
        toggleModalVisibility(contactModal, true);
    });
}
if (aboutClose) aboutClose.addEventListener('click', () => toggleModalVisibility(aboutModal, false));
if (contactClose) contactClose.addEventListener('click', () => toggleModalVisibility(contactModal, false));

[aboutModal, contactModal].forEach(modalBox => {
    if (modalBox) {
        modalBox.addEventListener('click', (e) => {
            if (e.target === modalBox) toggleModalVisibility(modalBox, false);
        });
    }
});

const mobileDrawerTrigger = document.getElementById('mobile-drawer-trigger');
const sidebarCloseBtn = document.getElementById('sidebar-close-btn');
const leftSidebar = document.getElementById('left-sidebar');

function openMobileSidebarDrawer() {
    if (leftSidebar) leftSidebar.classList.add('sidebar-open');
}
function closeMobileSidebarDrawer() {
    if (leftSidebar) leftSidebar.classList.remove('sidebar-open');
}
if (mobileDrawerTrigger) mobileDrawerTrigger.addEventListener('click', (e) => { e.stopPropagation(); openMobileSidebarDrawer(); });
if (sidebarCloseBtn) sidebarCloseBtn.addEventListener('click', closeMobileSidebarDrawer);
map.on('click', closeMobileSidebarDrawer);

const campusBoundaryPolygonCoords = [
    [11.239100, 124.999900], [11.239300, 125.002200], [11.236800, 125.002500],
    [11.235500, 125.001300], [11.235600, 124.999800], [11.237200, 124.999600]
];

const campusBoundaryHighlight = L.polygon(campusBoundaryPolygonCoords, {
    color: '#0f2c59', weight: 2, opacity: 0.5, fillColor: '#3b82f6', fillOpacity: 0.03, interactive: true       
}).addTo(map);

campusBoundaryHighlight.bindPopup(`
    <div class="popup-card">
        <span class="popup-tag" style="background-color: #0f2c59">Property Lines</span>
        <h3>Leyte Normal University</h3>
        <p>Main campus land perimeter overlay tracking context.</p>
    </div>
`);

function determineCategory(name) {
    if (!name) return "Other Facilities";
    const title = name.toLowerCase().trim();
    if (title.includes("igp trade park")) return "Student Facilities";
    if (title.includes("hrdc gym")) return "Other Facilities";
    if (title.includes("alba hall")) return "Other Facilities";
    if (title.includes("magdalena s. ramo") || title.includes("college of management and entrepreneurship") || title.includes("integrated laboratory school")) return "Academic Buildings";
    if (title.includes("obdulla r. cinco") || title.includes("obdulla") || title.includes("cinco")) return "Academic Buildings";
    if (title.includes("center for teaching excellence") || title.includes("teaching excellence")) return "Academic Buildings";
    if (title.includes("orc") || title.includes("pmf")) return "Academic Buildings";
    if (title.includes("admin") || title.includes("igp")) return "Administrative Offices";
    if (title.includes("library") || title.includes("teacher center")) return "Resource Centers";
    if (title.includes("hotel") || title.includes("dormitory") || title.includes("house")) return "Residential Areas";
    if (title.includes("student center") || title.includes("gym") || title.includes("canteen") || title.includes("cafeteria")) return "Student Facilities";
    if (title.includes("conversion") || title.includes("ils") || title.includes("acad") || title.includes("cme") || title.includes("humanities") || title.includes("cte") || title.includes("alba") || title.includes("msr")) return "Academic Buildings";
    return "Other Facilities";
}

function buildImageFilename(name) {
    const normalized = name.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return `img/${normalized}.jpg`;
}

async function loadQGISGeoJSON() {
    try {
        const response = await fetch('lnu_campus_map.geojson');
        if (!response.ok) throw new Error(`HTTP Error Status: ${response.status}`);
        globalGeoJSONData = await response.json();
        processAndRenderFeatures(globalGeoJSONData);
    } catch (error) {
        console.error("Failure loading QGIS GeoJSON layer:", error);
    }
}

function processAndRenderFeatures(geoJSON) {
    geoJSON.features.forEach(feature => {
        const props = feature.properties;
        const coords = feature.geometry.coordinates; 
        const cat = determineCategory(props.name);
        const markerColor = categoryColors[cat] || categoryColors["Other Facilities"];

        // Circle Marker Definition
        const marker = L.circleMarker([coords[1], coords[0]], {
            radius: 9, fillColor: markerColor, color: '#ffffff', weight: 2, opacity: 1, fillOpacity: 0.90
        });

        const quickPopupContent = `
            <div class="popup-card">
                <span class="popup-tag" style="background-color: ${markerColor}">${cat}</span>
                <h3>${props.name || 'Campus Infrastructure'}</h3>
                <p>Facility tracked inside active GIS grid layers.</p>
                <div class="click-hint"><i class="fa-solid fa-hand-pointer"></i> Click waypoint for full information</div>
            </div>
        `;
        
        marker.bindPopup(quickPopupContent, { closeButton: false, offset: L.point(0, -5), closeOnClick: false });

        /* ALIGNMENT HOVER POP FEATURE */
        marker.on('mouseover', function () {
            this.openPopup();
            this.setStyle({ weight: 3, radius: 11 });
        });
        marker.on('mouseout', function () {
            this.closePopup();
            this.setStyle({ weight: 2, radius: 9 });
        });

        /* SIDEBAR SYNCHRONIZATION CLICK EVENT */
        marker.on('click', function() {
            focusAndDisplayWaypointDetails(props, coords);
        });

        props.markerInstance = marker; 

        if (!mapLayers[cat]) {
            mapLayers[cat] = L.layerGroup();
            mapLayers[cat].addTo(map); 
        }
        mapLayers[cat].addLayer(marker);
    });

    const geoJsonLayer = L.geoJSON(geoJSON);
    map.fitBounds(geoJsonLayer.getBounds(), { padding: [40, 40] });

    generateCategoryControls();
    generateInteractiveWaypointLegend(geoJSON.features);
}

function focusAndDisplayWaypointDetails(properties, coordinates) {
    const placeholder = document.getElementById('sidebar-placeholder');
    const displayBox = document.getElementById('sidebar-detail-content');
    if (!displayBox) return;

    if (placeholder) placeholder.style.display = 'none';
    displayBox.classList.remove('hidden');

    const cat = determineCategory(properties.name);
    const accentThemeColor = categoryColors[cat] || "#64748b";
    const cleanImgFileName = properties.name ? buildImageFilename(properties.name) : "default_campus.jpg";
    
    const customDesc = properties.description ? properties.description : `This facility represents an essential landmark operating inside the Leyte Normal University campus parameters. It is verified and managed under active administrative spatial infrastructure guidelines.`;
    const elevationVal = properties.elevation && properties.elevation > 0 ? `${properties.elevation} meters` : `Not Available`;
    const sourceDataset = properties['url name'] ? properties['url name'] : `Digitized Layer Dataset Record`;
    const timestampRec = properties.time ? new Date(properties.time).toLocaleString() : `N/A (Standard QGIS Core Model)`;

    displayBox.innerHTML = `
        <div class="inspector-detail-card">
            <span class="inspector-tag" style="background-color: ${accentThemeColor}">${cat}</span>
            <h2 class="inspector-title">${properties.name || 'Campus Infrastructure Landmark'}</h2>
            
            <div class="inspector-image-wrap" onclick="openImageLightbox('${cleanImgFileName}', '${properties.name || 'LNU Facility Log'}')">
                <img class="inspector-img" src="${cleanImgFileName}" 
                     onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
                     alt="${properties.name}">
                <div class="photo-placeholder-wrapper" style="display:none;">
                    <img src="school_logo.jpg" class="fallback-seal-icon" alt="LNU Seal Icon" onerror="this.src='https://via.placeholder.com/50?text=LNU'">
                    <span>No Structural Image File Available</span>
                </div>
                <div class="inspector-img-hint">
                    <i class="fa-solid fa-up-right-and-down-left-from-center"></i> Click frame to expand image view
                </div>
            </div>

            <p class="inspector-description">${customDesc}</p>

            <ul class="meta-parameters-list">
                <li>
                    <span class="meta-label">Coordinates:</span>
                    <span class="meta-val">${coordinates[1].toFixed(6)}, ${coordinates[0].toFixed(6)}</span>
                </li>
                <li>
                    <span class="meta-label">Elevation:</span>
                    <span class="meta-val">${elevationVal}</span>
                </li>
                <li>
                    <span class="meta-label">Data Source:</span>
                    <span class="meta-val">${sourceDataset}</span>
                </li>
                <li>
                    <span class="meta-label">Sync Log:</span>
                    <span class="meta-val">${timestampRec}</span>
                </li>
            </ul>
        </div>
    `;
}

const lightboxModal = document.getElementById('image-lightbox-modal');
const lightboxImg = document.getElementById('lightbox-target-img');
const lightboxCaption = document.getElementById('lightbox-caption');
const lightboxCloseBtn = document.getElementById('lightbox-close-btn');

function openImageLightbox(imageSrc, buildingTitle) {
    if(!lightboxModal || !lightboxImg || !lightboxCaption) return;
    const testImg = new Image();
    testImg.src = imageSrc;
    testImg.onload = function() {
        lightboxImg.src = imageSrc;
        lightboxCaption.innerText = buildingTitle;
        lightboxModal.classList.remove('hidden');
    };
    testImg.onerror = function() {
        console.log("No full image to display in Lightbox window.");
    };
}

function closeImageLightbox() {
    if(!lightboxModal || !lightboxImg) return;
    lightboxModal.classList.add('hidden');
    lightboxImg.src = "";
    lightboxCaption.innerText = "";
}

if(lightboxCloseBtn) lightboxCloseBtn.addEventListener('click', closeImageLightbox);
if(lightboxModal) lightboxModal.addEventListener('click', (e) => { if(e.target === lightboxModal) closeImageLightbox(); });

window.openImageLightbox = openImageLightbox;

function generateCategoryControls() {
    const container = document.getElementById('layer-toggles');
    if(!container) return;
    container.innerHTML = '';
    
    const allLayersLabel = document.createElement('label');
    allLayersLabel.className = 'toggle-item';
    allLayersLabel.style.fontWeight = '600';
    allLayersLabel.innerHTML = `
        <input type="checkbox" id="checkbox-master-layer" checked>
        <span class="layer-color-dot" style="background-color: #0f2c59;"></span>
        <span>All Layers</span>
    `;
    allLayersLabel.querySelector('input').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        for (const cat in mapLayers) {
            const box = document.getElementById(`checkbox-${cat.replace(/\s+/g, '-')}`);
            if (box && box.checked !== isChecked) {
                box.checked = isChecked;
                if (isChecked) map.addLayer(mapLayers[cat]);
                else map.removeLayer(mapLayers[cat]);
            }
        }
    });
    container.appendChild(allLayersLabel);

    for (const cat in mapLayers) {
        const item = document.createElement('label');
        item.className = 'toggle-item';
        const layerColor = categoryColors[cat] || "#64748b";
        
        item.innerHTML = `
            <input type="checkbox" id="checkbox-${cat.replace(/\s+/g, '-')}" checked value="${cat}">
            <span class="layer-color-dot" style="background-color: ${layerColor};"></span>
            <span>${cat}</span>
        `;
        
        item.querySelector('input').addEventListener('change', (e) => {
            const categorySelected = e.target.value;
            if (e.target.checked) map.addLayer(mapLayers[categorySelected]);
            else map.removeLayer(mapLayers[categorySelected]);
        });
        container.appendChild(item);
    }
}

function generateInteractiveWaypointLegend(features) {
    const container = document.getElementById('map-legend');
    if(!container) return;
    container.innerHTML = '';

    const sortedFeatures = [...features].sort((a, b) => (a.properties.name || '').localeCompare(b.properties.name || ''));

    sortedFeatures.forEach(feature => {
        const props = feature.properties;
        if (!props.name) return; 

        const coords = feature.geometry.coordinates; 
        const cat = determineCategory(props.name);
        const indicatorColor = categoryColors[cat] || categoryColors["Other Facilities"];

        const legendButton = document.createElement('button');
        legendButton.className = 'legend-btn';
        legendButton.innerHTML = `
            <div class="legend-btn-left">
                <div class="legend-color-indicator" style="background-color: ${indicatorColor}"></div>
                <span class="legend-text-label">${props.name}</span>
            </div>
            <i class="fa-solid fa-location-crosshairs legend-action-icon"></i>
        `;

        legendButton.addEventListener('click', () => {
            closeMobileSidebarDrawer(); 

            const markerInstanceRef = props.markerInstance;
            const targetCheckbox = document.getElementById(`checkbox-${cat.replace(/\s+/g, '-')}`);
            if (targetCheckbox && !targetCheckbox.checked) {
                targetCheckbox.checked = true;
                map.addLayer(mapLayers[cat]);
            }

            map.setView([coords[1], coords[0]], 19);
            if (markerInstanceRef) markerInstanceRef.openPopup();
            focusAndDisplayWaypointDetails(props, coords);
        });

        container.appendChild(legendButton);
    });
}

const searchInput = document.getElementById('map-search');
const searchResults = document.getElementById('search-results');
const clearSearchBtn = document.getElementById('clear-search-btn');

if(searchInput) {
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        searchResults.innerHTML = '';

        if (query === '' || !globalGeoJSONData) {
            searchResults.classList.remove('active');
            clearSearchBtn.classList.add('hidden');
            return;
        }

        clearSearchBtn.classList.remove('hidden');
        
        const matchedFeatures = globalGeoJSONData.features.filter(feature => 
            feature.properties.name && feature.properties.name.toLowerCase().includes(query)
        );

        if (matchedFeatures.length > 0) {
            searchResults.classList.add('active');
            matchedFeatures.forEach(feature => {
                const div = document.createElement('div');
                div.className = 'search-item';
                div.innerText = feature.properties.name;
                
                div.addEventListener('click', () => {
                    closeMobileSidebarDrawer(); 
                    const coords = feature.geometry.coordinates;
                    const marker = feature.properties.markerInstance;
                    const cat = determineCategory(feature.properties.name);

                    const checkbox = document.getElementById(`checkbox-${cat.replace(/\s+/g, '-')}`);
                    if (checkbox && !checkbox.checked) {
                        checkbox.checked = true;
                        map.addLayer(mapLayers[cat]);
                    }

                    map.setView([coords[1], coords[0]], 19);
                    if (marker) marker.openPopup();
                    focusAndDisplayWaypointDetails(feature.properties, coords);
                    searchResults.classList.remove('active');
                    searchResults.innerHTML = '';
                });
                searchResults.appendChild(div);
            });
        } else {
            searchResults.classList.add('active');
            searchResults.innerHTML = `<div class="search-item" style="color: #94a3b8; cursor: default;">No building found...</div>`;
        }
    });
}

if(clearSearchBtn) {
    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        clearSearchBtn.classList.add('hidden');
        if (globalGeoJSONData) {
            const geoJsonLayer = L.geoJSON(globalGeoJSONData);
            map.fitBounds(geoJsonLayer.getBounds(), { padding: [40, 40] });
        }
    });
}

loadQGISGeoJSON();