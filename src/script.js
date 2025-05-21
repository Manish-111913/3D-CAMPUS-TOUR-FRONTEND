let isLogin = true;
let isSidebarOpen = true;
let scene, camera, renderer, controls;
let currentModel = null;
let arrowSprite = null;
let moveForward = false, moveBackward = false, moveLeft = false, moveRight = false;
let velocity = new THREE.Vector3();
const clock = new THREE.Clock();
let isThreeJSInitialized = false;
let userRole = 'user';
let initialCanvasSize = null; // Store initial canvas size

// Predefined list of available .glb models
const availableModels = {
    './public/main_campus.glb': 'Main Campus',
    './public/library.glb': 'Library',
    './public/student_center.glb': 'Student Center',
    './public/science_building.glb': 'Science Building',
    './public/sports_complex.glb': 'Sports Complex'
};

// Track current model index for hotspot cycling
let currentModelIndex = 0;
const modelPaths = Object.keys(availableModels);

function init3DScene() {
    if (isThreeJSInitialized) {
        console.log('Three.js already initialized, skipping');
        return;
    }
    isThreeJSInitialized = true;

    console.log('Initializing Three.js');
    const tourView = document.getElementById('tourView');
    console.log('tourView display:', tourView.style.display);
    const canvas = document.getElementById('threeCanvas');
    const container = document.querySelector('.viewer');
    const mainContent = document.getElementById('mainContent');

    // Calculate available width based on mainContent, accounting for sidebar
    const sidebarWidth = isSidebarOpen ? 16 * 16 : 5 * 16; // 16rem or 5rem in pixels (1rem = 16px)
    const availableWidth = mainContent.clientWidth;
    console.log('Main content width:', mainContent.clientWidth, 'Sidebar width:', sidebarWidth);

    // Store initial canvas size
    initialCanvasSize = {
        width: availableWidth,
        height: container.clientHeight // Use CSS-defined height (e.g., 500px)
    };
    console.log('Initial canvas size:', initialCanvasSize);

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);

    camera = new THREE.PerspectiveCamera(75, initialCanvasSize.width / initialCanvasSize.height, 0.1, 2000);
    camera.position.set(0, 5, 0);
    camera.lookAt(new THREE.Vector3(0, 5, 1));

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(initialCanvasSize.width, initialCanvasSize.height);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 2.0;
    canvas.style.width = `${initialCanvasSize.width}px`;
    canvas.style.height = `${initialCanvasSize.height}px`;

    controls = new THREE.PointerLockControls(camera, document.body);
    scene.add(controls.getObject());

    canvas.addEventListener('click', () => {
        controls.lock();
    });

    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x888888, 1.0);
    hemiLight.position.set(0, 20, 0);
    scene.add(hemiLight);

    // Load default main campus model
    loadModel('./public/main_campus.glb', () => {
        document.getElementById('currentLocation').textContent = 'Current Location: Main Campus';
        document.getElementById('locationDescription').textContent = 'The main campus features modern architecture blending with historical buildings, creating a unique learning environment for our students.';
        currentModelIndex = 0; // Reset index for hotspot cycling
    });

    // Handle fullscreen changes
    const onFullscreenChange = () => {
        console.log('Fullscreen changed');
        if (document.fullscreenElement) {
            // In fullscreen, use full screen size
            const width = window.innerWidth;
            const height = window.innerHeight;
            camera.aspect = width / height;
            camera.updateProjectionMatrix();
            renderer.setSize(width, height);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            console.log('Fullscreen size:', width, height);
        } else {
            // Restore initial size
            camera.aspect = initialCanvasSize.width / initialCanvasSize.height;
            camera.updateProjectionMatrix();
            renderer.setSize(initialCanvasSize.width, initialCanvasSize.height);
            canvas.style.width = `${initialCanvasSize.width}px`;
            canvas.style.height = `${initialCanvasSize.height}px`;
            console.log('Restored initial size:', initialCanvasSize);
        }
    };

    document.addEventListener('fullscreenchange', onFullscreenChange);

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        velocity.x -= velocity.x * 10.0 * delta;
        velocity.z -= velocity.z * 10.0 * delta;

        if (moveForward) velocity.z -= 400.0 * delta;
        if (moveBackward) velocity.z += 400.0 * delta;
        if (moveLeft) velocity.x -= 400.0 * delta;
        if (moveRight) velocity.x += 400.0 * delta;

        controls.getObject().translateX(velocity.x * delta);
        controls.getObject().translateZ(velocity.z * delta);

        if (arrowSprite) arrowSprite.lookAt(camera.position);

        renderer.render(scene, camera);
    }
    animate();

    // Keyboard controls
    document.addEventListener('keydown', (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
        }
    });

    document.addEventListener('keyup', (event) => {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                moveForward = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                moveBackward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                moveLeft = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                moveRight = true;
                break;
        }
    });
}

function loadModel(url, onSuccess = () => {}) {
    console.log('Loading model:', url);
    const loader = new THREE.GLTFLoader();
    if (currentModel) {
        scene.remove(currentModel);
        disposeModel(currentModel);
    }

    loader.load(
        url,
        (gltf) => {
            gltf.scene.traverse((child) => {
                if (child.isMesh) {
                    child.material.side = THREE.DoubleSide;
                    child.material.transparent = false;
                    child.material.opacity = 1;
                    child.material.roughness = 0.7;
                    child.material.metalness = 0.1;
                    child.material.emissive = new THREE.Color(0x000000);
                    child.material.emissiveIntensity = 0.0;
                }
            });

            const bbox = new THREE.Box3().setFromObject(gltf.scene);
            const center = bbox.getCenter(new THREE.Vector3());
            gltf.scene.position.sub(center);
            gltf.scene.scale.set(10, 10, 10);

            scene.add(gltf.scene);
            currentModel = gltf.scene;
            console.log('Model loaded:', gltf.scene.position, gltf.scene.scale);
            loadHotspots();
            onSuccess();
        },
        undefined,
        (error) => {
            console.error('Error loading model:', error);
            alert(`Failed to load 3D model: ${url}. Ensure the file exists in the public folder.`);
        }
    );
}

function disposeModel(model) {
    model.traverse((child) => {
        if (child.isMesh) {
            child.geometry.dispose();
            if (Array.isArray(child.material)) {
                child.material.forEach(m => m.dispose());
            } else {
                child.material.dispose();
            }
        }
    });
}

function loadHotspots() {
    if (arrowSprite) scene.remove(arrowSprite);

    const textureLoader = new THREE.TextureLoader();
    const arrowTexture = textureLoader.load('./public/assets/arrow.png');
    const spriteMaterial = new THREE.SpriteMaterial({ map: arrowTexture, transparent: true });

    arrowSprite = new THREE.Sprite(spriteMaterial);
    arrowSprite.position.set(5, 2, -8);
    arrowSprite.scale.set(2, 2, 2);
    scene.add(arrowSprite);

    // Ensure only one mousedown listener is active
    document.removeEventListener('mousedown', onMouseClick);
    document.addEventListener('mousedown', onMouseClick, false);
}

function onMouseClick(event) {
    if (!arrowSprite) return;

    const mouse = new THREE.Vector2();
    mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
    mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);

    const intersects = raycaster.intersectObject(arrowSprite, true);
    if (intersects.length > 0) {
        console.log('Arrow clicked. Loading next model...');
        scene.remove(arrowSprite);
        arrowSprite = null;
        // Cycle to the next model
        currentModelIndex = (currentModelIndex + 1) % modelPaths.length;
        const nextModel = modelPaths[currentModelIndex];
        loadModel(nextModel, () => {
            document.getElementById('currentLocation').textContent = `Current Location: ${availableModels[nextModel]}`;
            document.getElementById('locationDescription').textContent = `Explore the ${availableModels[nextModel]} with its unique features.`;
        });
    }
}

function resetView() {
    if (controls) {
        controls.getObject().position.set(0, 5, 0);
        camera.lookAt(new THREE.Vector3(0, 5, 1));
    }
}

function toggleFullScreen() {
    const viewer = document.querySelector('.viewer');
    if (!document.fullscreenElement) {
        viewer.requestFullscreen().catch(err => {
            console.error('Fullscreen error:', err);
        });
    } else {
        document.exitFullscreen();
    }
}

function zoomIn() {
    if (camera) {
        camera.position.z -= 0.5;
    }
}

function zoomOut() {
    if (camera) {
        camera.position.z += 0.5;
    }
}

function showAuthForm(show = true) {
    const authForm = document.getElementById('authForm');
    const landingPage = document.getElementById('landingPage');
    const dashboard = document.getElementById('dashboard');

    isLogin = show;
    if (show) {
        authForm.style.display = 'block';
        landingPage.style.display = 'none';
        dashboard.style.display = 'none';
        updateAuthForm();
        console.log('Auth form shown:', {
            authForm: authForm.style.display,
            landingPage: landingPage.style.display,
            dashboard: dashboard.style.display
        });
    } else {
        authForm.style.display = 'none';
        landingPage.style.display = 'block';
        dashboard.style.display = 'none';
        console.log('Landing page shown:', {
            authForm: authForm.style.display,
            landingPage: landingPage.style.display,
            dashboard: dashboard.style.display
        });
    }
}

function showLandingPage() {
    showAuthForm(false);
}

function showDashboard() {
    document.getElementById('landingPage').style.display = 'none';
    document.getElementById('authForm').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    document.getElementById('tourView').style.display = 'block';
    document.querySelectorAll('.view').forEach(view => {
        if (view.id !== 'tourView') view.style.display = 'none';
    });
    console.log('Showing dashboard, calling init3DScene');
    init3DScene();
    if (userRole === 'admin') {
        document.getElementById('buildingAdminControls').style.display = 'block';
        document.getElementById('eventAdminControls').style.display = 'block';
    }
    fetchBuildings();
    fetchEvents();
}

function toggleAuthMode() {
    const isLoginCurrent = document.getElementById('authTitle').textContent === 'Welcome Back';
    isLogin = !isLoginCurrent;
    updateAuthForm();
}

function updateAuthForm() {
    const fullNameGroup = document.getElementById('fullNameGroup');
    const authTitle = document.getElementById('authTitle');
    const authSubtitle = document.getElementById('authSubtitle');
    const authButtonText = document.getElementById('authButtonText');
    const toggleAuthButton = document.getElementById('toggleAuthButton');
    const loginOptions = document.getElementById('loginOptions');

    if (isLogin) {
        fullNameGroup.style.display = 'none';
        authTitle.textContent = 'Welcome Back';
        authSubtitle.textContent = 'Sign in to continue your journey';
        authButtonText.textContent = 'Sign In';
        toggleAuthButton.textContent = "Don't have an account? Sign up";
        loginOptions.style.display = 'flex';
    } else {
        fullNameGroup.style.display = 'block';
        authTitle.textContent = 'Create Account';
        authSubtitle.textContent = 'Join us to explore the campus';
        authButtonText.textContent = 'Create Account';
        toggleAuthButton.textContent = 'Already have an account? Sign in';
        loginOptions.style.display = 'none';
    }
}

async function handleAuth(event) {
    event.preventDefault();

    const form = document.getElementById('authFormElement');
    const isLoginCurrent = document.getElementById('authTitle').textContent === 'Welcome Back';
    const email = form.querySelector('input[name="email"]').value;
    const password = form.querySelector('input[name="password"]').value;

    try {
        if (isLoginCurrent) {
            const rememberMe = form.querySelector('#rememberMe').checked;
            console.log('Attempting login with:', { email, password, rememberMe });
            const loginResponse = await fetch('https://threed-campus-tour-backend.onrender.com/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password, rememberMe })
            });
            const loginData = await loginResponse.json();
            console.log('Login response:', loginData);
            if (loginResponse.ok) {
                const usernameElement = document.querySelector('.username');
                const username = loginData.user.fullName || email;
                userRole = loginData.user.role || 'user';
                console.log('Setting username:', username, 'Role:', userRole);
                if (usernameElement) {
                    usernameElement.textContent = username;
                }
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userName', username);
                localStorage.setItem('token', loginData.token);
                if (loginData.user.rememberMe) {
                    localStorage.setItem('rememberMe', 'true');
                }
                showDashboard();
            } else {
                console.error('Login failed:', loginData.message);
                alert(loginData.message || 'Invalid email or password.');
            }
        } else {
            const fullName = form.querySelector('input[name="fullName"]').value;
            console.log('Attempting registration with:', { fullName, email });
            const registerResponse = await fetch('https://threed-campus-tour-backend.onrender.com/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ fullName, email, password, role: 'user' })
            });
            const registerData = await registerResponse.json();
            console.log('Register response:', registerData);
            if (registerResponse.ok) {
                toggleAuthMode();
                alert('Registration successful! Please sign in.');
            } else {
                console.error('Registration failed:', registerData.message);
                alert(registerData.message || 'Registration failed. Please try again.');
            }
        }
    } catch (error) {
        console.error('Connection error:', error);
        alert('Unable to connect to the server. Please ensure the backend server is running at https://threed-campus-tour-backend.onrender.com and try again.');
        const usernameElement = document.querySelector('.username');
        const username = email;
        if (usernameElement) {
            usernameElement.textContent = username;
        }
        localStorage.setItem('userEmail', email);
        localStorage.setItem('userName', username);
        userRole = 'user';
        showDashboard();
    }
}

async function fetchBuildings() {
    try {
        const response = await fetch('https://threed-campus-tour-backend.onrender.com/api/buildings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const buildings = await response.json();
        console.log('Fetched buildings:', buildings);
        
        // Update buildings grid
        const buildingsGrid = document.getElementById('buildingsGrid');
        buildingsGrid.innerHTML = '';
        buildings.forEach(building => {
            const buildingCard = document.createElement('div');
            buildingCard.className = 'building-card';
            buildingCard.innerHTML = `
                <div class="building-image">🏢</div>
                <div class="building-info">
                    <h3>${building.name}</h3>
                    <p>${building.description}</p>
                    <p><strong>Model:</strong> ${availableModels[building.modelPath] || 'None'}</p>
                    <button class="view-details" data-id="${building._id}">View Details</button>
                    ${userRole === 'admin' ? `
                        <button class="edit-building" data-id="${building._id}">Edit</button>
                        <button class="delete-building" data-id="${building._id}">Delete</button>
                    ` : ''}
                </div>
            `;
            buildingsGrid.appendChild(buildingCard);
        });

        // Update location list in tour view
        const locationList = document.getElementById('locationList');
        locationList.innerHTML = '';
        buildings.forEach(building => {
            if (building.modelPath) {
                const button = document.createElement('button');
                button.textContent = building.name;
                button.setAttribute('data-model', building.modelPath);
                button.setAttribute('data-name', building.name);
                button.setAttribute('data-description', building.description);
                locationList.appendChild(button);
            }
        });

        // Add event listeners for view, edit, and delete
        document.querySelectorAll('.view-details').forEach(button => {
            button.addEventListener('click', () => {
                const id = button.getAttribute('data-id');
                const building = buildings.find(b => b._id === id);
                if (building && building.modelPath) {
                    setActiveView('tour');
                    // Find index of the model for hotspot cycling
                    currentModelIndex = modelPaths.indexOf(building.modelPath);
                    if (currentModelIndex === -1) currentModelIndex = 0;
                    loadModel(building.modelPath, () => {
                        document.getElementById('currentLocation').textContent = `Current Location: ${building.name}`;
                        document.getElementById('locationDescription').textContent = building.description;
                    });
                } else {
                    alert('No 3D model associated with this building.');
                }
            });
        });

        if (userRole === 'admin') {
            document.querySelectorAll('.edit-building').forEach(button => {
                button.addEventListener('click', () => {
                    const id = button.getAttribute('data-id');
                    const building = buildings.find(b => b._id === id);
                    showEditBuildingForm(building);
                });
            });
            document.querySelectorAll('.delete-building').forEach(button => {
                button.addEventListener('click', async () => {
                    const id = button.getAttribute('data-id');
                    await deleteBuilding(id);
                });
            });
        }
    } catch (error) {
        console.error('Error fetching buildings:', error);
        alert('Error fetching buildings. Please check the server connection.');
    }
}

async function fetchEvents() {
    try {
        const response = await fetch('https://threed-campus-tour-backend.onrender.com/api/events', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        const events = await response.json();
        console.log('Fetched events:', events);
        const eventsGrid = document.getElementById('eventsGrid');
        eventsGrid.innerHTML = '';
        events.forEach(event => {
            const eventCard = document.createElement('div');
            eventCard.className = 'event-card';
            eventCard.innerHTML = `
                <h4>${event.name}</h4>
                <p>${new Date(event.date).toLocaleDateString()}</p>
                <button class="learn-more">Learn More</button>
                ${userRole === 'admin' ? `<button class="delete-event" data-id="${event._id}">Delete</button>` : ''}
            `;
            eventsGrid.appendChild(eventCard);
        });

        if (userRole === 'admin') {
            document.querySelectorAll('.delete-event').forEach(button => {
                button.addEventListener('click', async () => {
                    const id = button.getAttribute('data-id');
                    await deleteEvent(id);
                });
            });
        }
    } catch (error) {
        console.error('Error fetching events:', error);
        alert('Error fetching events. Please check the server connection.');
    }
}

async function addBuilding(event) {
    event.preventDefault();
    const form = document.getElementById('addBuildingForm');
    const name = form.querySelector('input[name="name"]').value;
    const description = form.querySelector('textarea[name="description"]').value;
    const modelPath = form.querySelector('select[name="modelPath"]').value;

    try {
        const response = await fetch('https://threed-campus-tour-backend.onrender.com/api/buildings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name, description, modelPath })
        });
        if (response.ok) {
            form.reset();
            await fetchBuildings();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to add building.');
        }
    } catch (error) {
        console.error('Error adding building:', error);
        alert('Error adding building.');
    }
}

async function updateBuilding(event) {
    event.preventDefault();
    const form = document.getElementById('editBuildingForm');
    const id = form.querySelector('input[name="id"]').value;
    const name = form.querySelector('input[name="name"]').value;
    const description = form.querySelector('textarea[name="description"]').value;
    const modelPath = form.querySelector('select[name="modelPath"]').value;

    try {
        const response = await fetch(`https://threed-campus-tour-backend.onrender.com/api/buildings/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name, description, modelPath })
        });
        if (response.ok) {
            hideEditBuildingForm();
            await fetchBuildings();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to update building.');
        }
    } catch (error) {
        console.error('Error updating building:', error);
        alert('Error updating building.');
    }
}

function showEditBuildingForm(building) {
    const addForm = document.getElementById('addBuildingForm');
    const editForm = document.getElementById('editBuildingForm');
    addForm.style.display = 'none';
    editForm.style.display = 'block';

    editForm.querySelector('input[name="id"]').value = building._id;
    editForm.querySelector('input[name="name"]').value = building.name;
    editForm.querySelector('textarea[name="description"]').value = building.description;
    editForm.querySelector('select[name="modelPath"]').value = building.modelPath || '';
}

function hideEditBuildingForm() {
    const addForm = document.getElementById('addBuildingForm');
    const editForm = document.getElementById('editBuildingForm');
    addForm.style.display = 'block';
    editForm.style.display = 'none';
    editForm.reset();
}

async function deleteBuilding(id) {
    try {
        const response = await fetch(`https://threed-campus-tour-backend.onrender.com/api/buildings/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (response.ok) {
            await fetchBuildings();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to delete building.');
        }
    } catch (error) {
        console.error('Error deleting building:', error);
        alert('Error deleting building.');
    }
}

async function addEvent(event) {
    event.preventDefault();
    const form = document.getElementById('addEventForm');
    const name = form.querySelector('input[name="name"]').value;
    const date = form.querySelector('input[name="date"]').value;

    try {
        const response = await fetch('https://threed-campus-tour-backend.onrender.com/api/events', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ name, date })
        });
        if (response.ok) {
            form.reset();
            await fetchEvents();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to add event.');
        }
    } catch (error) {
        console.error('Error adding event:', error);
        alert('Error adding event.');
    }
}

async function deleteEvent(id) {
    try {
        const response = await fetch(`https://threed-campus-tour-backend.onrender.com/api/events/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });
        if (response.ok) {
            await fetchEvents();
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to delete event.');
        }
    } catch (error) {
        console.error('Error deleting event:', error);
        alert('Error deleting event.');
    }
}

function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');

    if (isSidebarOpen) {
        sidebar.style.width = '16rem';
        sidebar.classList.remove('collapsed');
        mainContent.style.marginLeft = '16rem';
        document.body.classList.remove('sidebar-collapsed');
    } else {
        sidebar.style.width = window.innerWidth <= 768 ? '0' : '5rem';
        sidebar.classList.add('collapsed');
        mainContent.style.marginLeft = window.innerWidth <= 768 ? '0' : '5rem';
        document.body.classList.add('sidebar-collapsed');
    }
}

function closeSidebarOnMobile() {
    if (window.innerWidth <= 768 && isSidebarOpen) {
        toggleSidebar();
    }
}

function setActiveView(view) {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelector(`#nav${view.charAt(0).toUpperCase() + view.slice(1)}Button`).classList.add('active');

    document.querySelectorAll('.view').forEach(viewElement => {
        viewElement.style.display = 'none';
    });
    const viewElement = document.getElementById(`${view}View`);
    viewElement.style.display = 'block';
    console.log(`Set view to ${view}, display: ${viewElement.style.display}`);

    const titles = {
        tour: '3D Tour',
        buildings: 'Buildings',
        events: 'Events'
    };
    document.getElementById('pageTitle').textContent = titles[view];

    if (view === 'tour') {
        console.log('Tour view activated');
        init3DScene();
    } else if (view === 'buildings') {
        fetchBuildings();
    } else if (view === 'events') {
        fetchEvents();
    }

    closeSidebarOnMobile();
}

function handleLogout() {
    console.log('Logout initiated');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userName');
    localStorage.removeItem('rememberMe');
    localStorage.removeItem('token');
    isThreeJSInitialized = false;
    userRole = 'user';
    const usernameElement = document.querySelector('.username');
    if (usernameElement) {
        usernameElement.textContent = '';
        console.log('Username cleared');
    }
    showLandingPage();
    toggleAuthMode();
    console.log('Logout successful');
}

// Attach event listeners
window.addEventListener('load', async () => {
    console.log('Script loaded');
    const email = localStorage.getItem('userEmail');
    const storedUsername = localStorage.getItem('userName');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';

    if (email && storedUsername && rememberMe) {
        try {
            console.log('Attempting auto-login for:', email);
            const response = await fetch(`https://threed-campus-tour-backend.onrender.com/api/user/${email}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                userRole = data.role || 'user';
                const usernameElement = document.querySelector('.username');
                if (usernameElement) {
                    usernameElement.textContent = storedUsername;
                    console.log('Auto-login username set:', storedUsername, 'Role:', userRole);
                }
                showDashboard();
            } else {
                console.warn('Auto-login failed:', response.statusText);
                localStorage.removeItem('userEmail');
                localStorage.removeItem('userName');
                localStorage.removeItem('rememberMe');
                localStorage.removeItem('token');
                showLandingPage();
            }
        } catch (error) {
            console.error('Auto-login connection error:', error);
            localStorage.removeItem('userEmail');
            localStorage.removeItem('userName');
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('token');
            showLandingPage();
        }
    } else {
        showLandingPage();
    }

    document.getElementById('startTourButton').addEventListener('click', () => showAuthForm(true));
    document.getElementById('beginTourButton').addEventListener('click', () => showAuthForm(true));
    document.getElementById('authFormElement').addEventListener('submit', handleAuth);
    document.getElementById('toggleAuthButton').addEventListener('click', toggleAuthMode);
    document.getElementById('returnHomeButton').addEventListener('click', showLandingPage);
    document.getElementById('sidebarToggleButton').addEventListener('click', toggleSidebar);
    document.getElementById('navTourButton').addEventListener('click', () => setActiveView('tour'));
    document.getElementById('navBuildingsButton').addEventListener('click', () => setActiveView('buildings'));
    document.getElementById('navEventsButton').addEventListener('click', () => setActiveView('events'));
    document.getElementById('logoutButton').addEventListener('click', handleLogout);
    document.getElementById('resetViewButton').addEventListener('click', resetView);
    document.getElementById('fullScreenButton').addEventListener('click', toggleFullScreen);
    document.getElementById('zoomInButton').addEventListener('click', zoomIn);
    document.getElementById('zoomOutButton').addEventListener('click', zoomOut);
    document.getElementById('mainContent').addEventListener('click', () => {
        closeSidebarOnMobile();
    });
    document.getElementById('addBuildingForm').addEventListener('submit', addBuilding);
    document.getElementById('editBuildingForm').addEventListener('submit', updateBuilding);
    document.getElementById('cancelEdit').addEventListener('click', hideEditBuildingForm);
    document.getElementById('locationList').addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') {
            const modelPath = e.target.getAttribute('data-model');
            const name = e.target.getAttribute('data-name');
            const description = e.target.getAttribute('data-description');
            if (modelPath) {
                currentModelIndex = modelPaths.indexOf(modelPath);
                if (currentModelIndex === -1) currentModelIndex = 0;
                loadModel(modelPath, () => {
                    document.getElementById('currentLocation').textContent = `Current Location: ${name}`;
                    document.getElementById('locationDescription').textContent = description;
                });
            }
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && !isSidebarOpen) {
            toggleSidebar();
        } else if (window.innerWidth <= 768 && isSidebarOpen) {
            toggleSidebar();
        }
    });
});