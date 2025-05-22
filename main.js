import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

let camera, scene, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;
let raycaster, tempMatrix;
let canvasPanel;
let isVRMode = false;

// Check if WebXR is available
async function checkXR() {
    if ('xr' in navigator) {
        try {
            const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
            console.log('VR Supported:', isSupported);
            if (!isSupported) {
                console.error('VR not supported in this browser/device');
            }
        } catch (err) {
            console.error('Error checking XR support:', err);
        }
    } else {
        console.error('WebXR not available in this browser');
    }
}

checkXR();

init();
animate();

function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 3);

    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Enable WebXR features
    renderer.xr.setReferenceSpaceType('local');
    
    document.body.appendChild(renderer.domElement);

    // Add VR button with error handling
    try {
        const vrButton = VRButton.createButton(renderer);
        document.body.appendChild(vrButton);
        console.log('VR Button added successfully');
    } catch (err) {
        console.error('Error creating VR button:', err);
    }

    // Create canvas panel
    const canvasTexture = new THREE.CanvasTexture(createCanvasTexture());
    const panelGeometry = new THREE.PlaneGeometry(3.2, 1.8);
    const panelMaterial = new THREE.MeshBasicMaterial({ 
        map: canvasTexture,
        side: THREE.DoubleSide // Make the panel visible from both sides
    });
    canvasPanel = new THREE.Mesh(panelGeometry, panelMaterial);
    canvasPanel.position.set(0, 1.6, -2);
    scene.add(canvasPanel);

    // Add some light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 0);
    scene.add(directionalLight);

    // Controllers setup
    const controllerModelFactory = new XRControllerModelFactory();

    // Controller 1
    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('connected', (event) => {
        console.log('Controller 1 connected:', event);
        isVRMode = true;
    });
    controller1.addEventListener('disconnected', () => {
        console.log('Controller 1 disconnected');
    });
    scene.add(controller1);

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    // Controller 2
    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('connected', (event) => {
        console.log('Controller 2 connected:', event);
        isVRMode = true;
    });
    controller2.addEventListener('disconnected', () => {
        console.log('Controller 2 disconnected');
    });
    scene.add(controller2);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    // Raycaster setup
    raycaster = new THREE.Raycaster();
    tempMatrix = new THREE.Matrix4();

    // Controller event listeners
    controller1.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectstart', onSelectStart);

    // Window resize handler
    window.addEventListener('resize', onWindowResize, false);

    // Log when entering/exiting VR
    renderer.xr.addEventListener('sessionstart', () => {
        console.log('VR session started');
        isVRMode = true;
    });

    renderer.xr.addEventListener('sessionend', () => {
        console.log('VR session ended');
        isVRMode = false;
    });
}

function createCanvasTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    
    // Fill canvas with a light color
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add some sample content
    context.fillStyle = '#000000';
    context.font = '20px Arial';
    context.fillText('Interactive Canvas Panel', 20, 40);
    
    return canvas;
}

function onSelectStart(event) {
    if (!isVRMode) return;

    const controller = event.target;
    
    tempMatrix.identity().extractRotation(controller.matrixWorld);
    raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    const intersects = raycaster.intersectObject(canvasPanel);
    
    if (intersects.length > 0) {
        const intersect = intersects[0];
        const canvas = canvasPanel.material.map.image;
        const context = canvas.getContext('2d');
        
        // Convert intersection point to canvas coordinates
        const x = intersect.uv.x * canvas.width;
        const y = (1 - intersect.uv.y) * canvas.height;
        
        // Draw a dot where the ray intersects
        context.fillStyle = '#ff0000';
        context.beginPath();
        context.arc(x, y, 5, 0, Math.PI * 2);
        context.fill();
        
        canvasPanel.material.map.needsUpdate = true;
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    renderer.setAnimationLoop(render);
}

function render() {
    renderer.render(scene, camera);
} 