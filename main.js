import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';

// ======== 1. SCENE SETUP ========
// (Same as before)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(5, 5, 5);
controls.update();
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(10, 20, 5);
scene.add(directionalLight);

// ======== 2. GAME ASSETS & DATA ========
const pieceGeometry = new THREE.SphereGeometry(0.4, 32, 16);
const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });

const piecesGroup = new THREE.Group();
scene.add(piecesGroup);
const boardGroup = new THREE.Group(); // This will hold the clickable grid cubes
scene.add(boardGroup);

let board;
let currentPlayer; // 1 for Black, 2 for White

// ======== 3. RAYCASTING AND UI (NEW!) ========
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// A highlight mesh to show the user where they are aiming
const highlightGeometry = new THREE.BoxGeometry(1, 1, 1);
const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
highlightMesh.visible = false; // Start hidden
scene.add(highlightMesh);

// ======== 4. GAME LOGIC & VISUALIZATION ========

function newGame() {
    // (Same as before)
    while(piecesGroup.children.length > 0) { piecesGroup.remove(piecesGroup.children[0]); }
    board = Array(4).fill(0).map(() => Array(4).fill(0).map(() => Array(4).fill(0)));
    board[1][2][1] = 1; board[2][1][1] = 1;
    board[1][1][1] = 2; board[2][2][1] = 2;
    currentPlayer = 1; // Black always starts
    updateVisuals();
    updateGameInfo();
}

function updateVisuals() {
    // (Same as before)
    while(piecesGroup.children.length > 0) { piecesGroup.remove(piecesGroup.children[0]); }
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            for (let z = 0; z < 4; z++) {
                if (board[x][y][z] !== 0) {
                    const player = board[x][y][z];
                    const material = (player === 1) ? blackMaterial : whiteMaterial;
                    const piece = new THREE.Mesh(pieceGeometry, material);
                    piece.position.set(x - 1.5, y - 1.5, z - 1.5);
                    piecesGroup.add(piece);
                }
            }
        }
    }
}

// Function to convert 3D world position to board array coordinates
function worldToBoardCoords(position) {
    return {
        x: Math.round(position.x + 1.5),
        y: Math.round(position.y + 1.5),
        z: Math.round(position.z + 1.5),
    };
}

// **PLACEHOLDER** - This is where your Reversi rules will go!
function isValidMove(x, y, z) {
    // For now, any empty spot is a valid move. We'll add real rules later.
    if (x < 0 || x > 3 || y < 0 || y > 3 || z < 0 || z > 3) return false;
    return board[x][y][z] === 0;
}

// **PLACEHOLDER** - This will handle taking a turn
function makeMove(x, y, z) {
    if (isValidMove(x, y, z)) {
        board[x][y][z] = currentPlayer;
        // In a real game, you would flip opponent pieces here.

        // Switch player
        currentPlayer = (currentPlayer === 1) ? 2 : 1;
        
        updateVisuals();
        updateGameInfo();
    }
}

function updateGameInfo() {
    const infoElement = document.getElementById('info');
    const scoreElement = document.getElementById('score');
    infoElement.textContent = `${currentPlayer === 1 ? 'Black' : 'White'}'s Turn`;
    
    // In a real game, you'd calculate the score here.
    scoreElement.textContent = "Score will be calculated later";
}

// ======== 5. EVENT LISTENERS (NEW!) ========

// This function handles the green highlight box
function onMouseMove(event) {
    // Convert mouse position to normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boardGroup.children);

    if (intersects.length > 0) {
        // Get the closest intersected grid cube
        const intersectedObject = intersects[0].object;
        const coords = worldToBoardCoords(intersectedObject.position);
        
        // Check if it's a valid move for the current player
        if (isValidMove(coords.x, coords.y, coords.z)) {
            highlightMesh.position.copy(intersectedObject.position);
            highlightMesh.visible = true;
        } else {
            highlightMesh.visible = false;
        }
    } else {
        highlightMesh.visible = false;
    }
}

// This function handles clicking to place a piece
function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boardGroup.children);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const coords = worldToBoardCoords(intersectedObject.position);
        
        // Attempt to make a move at the clicked coordinates
        makeMove(coords.x, coords.y, coords.z);
    }
}


// ======== 6. DRAWING THE BOARD & RUNNING THE GAME ========
function drawBoardGrid() {
    const gridGeometry = new THREE.BoxGeometry(1, 1, 1);

    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            for (let z = 0; z < 4; z++) {
                // Use a slightly more visible material for the grid
                const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true, opacity: 0.2, transparent: true });
                const cube = new THREE.Mesh(gridGeometry, gridMaterial);
                cube.position.set(x - 1.5, y - 1.5, z - 1.5);
                boardGroup.add(cube); // Add to the group we raycast against
            }
        }
    }
}

// Main animation loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// =========== LET'S START! ===========
drawBoardGrid();
newGame();
animate();

// Add the event listeners to the window
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousedown', onMouseClick);
document.getElementById('newGameBtn').addEventListener('click', newGame);