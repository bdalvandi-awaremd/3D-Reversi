import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';

// ======== 1. SCENE SETUP (You likely have this already) ========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(10, 20, 5);
scene.add(directionalLight);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(5, 5, 5);
controls.update();

// ======== 2. GAME ASSETS & DATA (NEW AND IMPORTANT!) ========

// We create one geometry and two materials that we can reuse for all pieces.
const pieceGeometry = new THREE.SphereGeometry(0.4, 32, 16); // Radius 0.4 fits well in a 1x1 box
const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });

// This group will hold all the piece meshes (the spheres).
const piecesGroup = new THREE.Group();
scene.add(piecesGroup);

// The 3D array for our game logic. 0 = empty, 1 = black, 2 = white.
let board; 

// ======== 3. GAME LOGIC & VISUALIZATION (THE MISSING LINK!) ========

function newGame() {
    // Clear any existing pieces from the scene
    while(piecesGroup.children.length > 0){ 
        piecesGroup.remove(piecesGroup.children[0]); 
    }

    // Initialize the board data model
    board = Array(4).fill(0).map(() => Array(4).fill(0).map(() => Array(4).fill(0)));

    // Set the initial four pieces in the center (a more 3D-friendly starting layout)
    // Black pieces
    board[1][2][1] = 1;
    board[2][1][1] = 1;
    // White pieces
    board[1][1][1] = 2;
    board[2][2][1] = 2;
    
    // Update the visual scene to match the board data
    updateVisuals();
}

/**
 * This is the core function that connects the data to the visuals.
 * It clears the old pieces and creates new ones based on the `board` array.
 */
function updateVisuals() {
    // Clear previous pieces to prevent duplicates
    while(piecesGroup.children.length > 0){ 
        piecesGroup.remove(piecesGroup.children[0]); 
    }

    // Loop through every cell of our 4x4x4 board
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            for (let z = 0; z < 4; z++) {
                
                // If the cell is not empty, create a piece
                if (board[x][y][z] !== 0) {
                    const player = board[x][y][z];
                    const material = (player === 1) ? blackMaterial : whiteMaterial;
                    
                    const piece = new THREE.Mesh(pieceGeometry, material);
                    
                    // Position the piece in the 3D world.
                    // We subtract 1.5 to center the 4x4 grid around the world origin (0,0,0).
                    piece.position.set(x - 1.5, y - 1.5, z - 1.5);
                    
                    piecesGroup.add(piece);
                }
            }
        }
    }
}

// ======== 4. DRAWING THE BOARD & RUNNING THE GAME ========

// This function draws the transparent grid cubes. Your original cube was likely this.
function drawBoardGrid() {
    const boardGroup = new THREE.Group();
    const gridMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.1 });
    const gridGeometry = new THREE.BoxGeometry(1, 1, 1);

    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            for (let z = 0; z < 4; z++) {
                const cube = new THREE.Mesh(gridGeometry, gridMaterial);
                cube.position.set(x - 1.5, y - 1.5, z - 1.5);
                boardGroup.add(cube);
            }
        }
    }
    scene.add(boardGroup);
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// =========== LET'S START! ===========
drawBoardGrid();
newGame(); // This call initializes the board and places the first pieces.
animate();