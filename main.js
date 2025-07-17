import * as THREE from 'https://cdn.skypack.dev/three@0.132.2';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js';
import { gsap } from 'https://cdn.skypack.dev/gsap';

// ======== 1. SCENE SETUP (No Changes) ========
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

// ======== 2. GAME ASSETS & DATA (No Changes) ========
const pieceGeometry = new THREE.SphereGeometry(0.4, 32, 16);
const blackMaterial = new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 });
const whiteMaterial = new THREE.MeshStandardMaterial({ color: 0xdddddd, roughness: 0.5 });

const piecesGroup = new THREE.Group();
scene.add(piecesGroup);
const boardGroup = new THREE.Group();
scene.add(boardGroup);

let board;
let currentPlayer;

// ======== 3. RAYCASTING AND UI (No Changes) ========
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const highlightGeometry = new THREE.BoxGeometry(1, 1, 1);
const highlightMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
highlightMesh.visible = false;
scene.add(highlightMesh);

// ======== 4. GAME LOGIC & VISUALIZATION (UPDATED) ========

// NEW: A constant array of all 26 possible directions in 3D space.
const DIRECTIONS = [];
for (let i = -1; i <= 1; i++) {
    for (let j = -1; j <= 1; j++) {
        for (let k = -1; k <= 1; k++) {
            if (i === 0 && j === 0 && k === 0) continue;
            DIRECTIONS.push({ x: i, y: j, z: k });
        }
    }
}

function newGame() {
    // Clear any existing pieces from the scene
    while(piecesGroup.children.length > 0){ 
        piecesGroup.remove(piecesGroup.children[0]); 
    }

    // Initialize the board data model
    board = Array(4).fill(0).map(() => Array(4).fill(0).map(() => Array(4).fill(0)));

    // --- START OF THE CHANGE ---
    // Black pieces (player 1)
    board[1][1][2] = 1;
    board[1][2][1] = 1;
    board[2][1][1] = 1;
    board[2][2][2] = 1;

    // White pieces (player 2)
    board[1][1][1] = 2;
    board[1][2][2] = 2;
    board[2][1][2] = 2;
    board[2][2][1] = 2;
    
    // --- END OF THE CHANGE ---

    currentPlayer = 1; // Black always starts
    
    // Update the visual scene and the score display
    updateVisuals();
    updateGameInfo();
}

function updateVisuals() {
    while(piecesGroup.children.length > 0) { piecesGroup.remove(piecesGroup.children[0]); }
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            for (let z = 0; z < 4; z++) {
                if (board[x][y][z] !== 0) {
                    const player = board[x][y][z];
                    const material = (player === 1) ? blackMaterial : whiteMaterial;
                    const piece = new THREE.Mesh(pieceGeometry, material);
                    piece.position.set(x - 1.5, y - 1.5, z - 1.5);
                    piece.userData = { x: x, y: y, z: z };
                    piecesGroup.add(piece);
                }
            }
        }
    }
}

function worldToBoardCoords(position) {
    return {
        x: Math.round(position.x + 1.5),
        y: Math.round(position.y + 1.5),
        z: Math.round(position.z + 1.5),
    };
}

// UPDATED: This now contains the full Reversi move validation logic.
function getFlipsInDirection(x, y, z, direction, player) {
    const opponent = player === 1 ? 2 : 1;
    let line = [];
    let currentX = x + direction.x;
    let currentY = y + direction.y;
    let currentZ = z + direction.z;

    while (currentX >= 0 && currentX < 4 && currentY >= 0 && currentY < 4 && currentZ >= 0 && currentZ < 4) {
        if (board[currentX][currentY][currentZ] === opponent) {
            line.push({ x: currentX, y: currentY, z: currentZ });
        } else if (board[currentX][currentY][currentZ] === player) {
            return line; // Found a valid sandwich, return the line of pieces to flip.
        } else {
            return []; // Found an empty spot, invalid line.
        }
        currentX += direction.x;
        currentY += direction.y;
        currentZ += direction.z;
    }
    return []; // Reached edge of board, invalid line.
}

// UPDATED: Checks if a move is valid by seeing if it flips at least one piece.
function isValidMove(x, y, z, player) {
    if (board[x][y][z] !== 0) return false;

    for (const direction of DIRECTIONS) {
        const flips = getFlipsInDirection(x, y, z, direction, player);
        if (flips.length > 0) {
            return true; // Found at least one valid line, so the move is valid.
        }
    }
    return false;
}

// UPDATED: This now executes the move and flips all necessary pieces.
function makeMove(x, y, z) {
    if (!isValidMove(x, y, z, currentPlayer)) {
        console.log("Invalid move!");
        return; // Do nothing if the move is not valid
    }

    let allFlips = [];
    for (const direction of DIRECTIONS) {
        const flips = getFlipsInDirection(x, y, z, direction, currentPlayer);
        allFlips = allFlips.concat(flips);
    }
    
    // Place the new piece
    board[x][y][z] = currentPlayer;
    // Flip all the opponent pieces
    for (const pos of allFlips) {
        board[pos.x][pos.y][pos.z] = currentPlayer;
    }

    // Switch to the next player
    switchPlayer();
    
    // Update everything
    updateVisuals();
    updateGameInfo();
}

// NEW: Handles player switching and checks for passes/game over.
function switchPlayer() {
    currentPlayer = (currentPlayer === 1) ? 2 : 1;

    // Check if the new player has any valid moves
    const validMoves = getValidMoves(currentPlayer);
    if (validMoves.length === 0) {
        // If they have no moves, check if the other player has moves.
        const otherPlayer = (currentPlayer === 1) ? 2 : 1;
        const otherPlayerMoves = getValidMoves(otherPlayer);
        if (otherPlayerMoves.length > 0) {
            // If the other player can move, pass the turn back.
            alert(`No valid moves for ${currentPlayer === 1 ? 'Black' : 'White'}. Passing turn.`);
            currentPlayer = otherPlayer;
        } else {
            // If neither player can move, the game is over.
            endGame();
        }
    }
}

// NEW: Helper function to get all valid moves for a player.
function getValidMoves(player) {
    const moves = [];
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            for (let z = 0; z < 4; z++) {
                if (isValidMove(x, y, z, player)) {
                    moves.push({ x, y, z });
                }
            }
        }
    }
    return moves;
}

// NEW: Logic to determine the winner.
function endGame() {
    let blackScore = 0;
    let whiteScore = 0;
    for (let x = 0; x < 4; x++) {
        for (let y = 0; y < 4; y++) {
            for (let z = 0; z < 4; z++) {
                if (board[x][y][z] === 1) blackScore++;
                if (board[x][y][z] === 2) whiteScore++;
            }
        }
    }

    let message = "Game Over!\n";
    message += `Final Score: Black ${blackScore} - White ${whiteScore}\n`;
    if (blackScore > whiteScore) message += "Black wins!";
    else if (whiteScore > blackScore) message += "White wins!";
    else message += "It's a draw!";
    
    alert(message);
}


function updateGameInfo() {
    const infoElement = document.getElementById('info');
    const scoreElement = document.getElementById('score');
    infoElement.textContent = `${currentPlayer === 1 ? 'Black' : 'White'}'s Turn`;
    
    let blackScore = 0;
    let whiteScore = 0;
    for (const cell of board.flat(2)) {
        if (cell === 1) blackScore++;
        if (cell === 2) whiteScore++;
    }
    scoreElement.textContent = `Score: Black ${blackScore} - White ${whiteScore}`;
}


// ======== 5. EVENT LISTENERS (UPDATED) ========
function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boardGroup.children);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const coords = worldToBoardCoords(intersectedObject.position);
        
        // UPDATED: Must now check the move for the *current* player
        if (isValidMove(coords.x, coords.y, coords.z, currentPlayer)) {
            highlightMesh.position.copy(intersectedObject.position);
            highlightMesh.visible = true;
        } else {
            highlightMesh.visible = false;
        }
    } else {
        highlightMesh.visible = false;
    }
}

function onMouseClick(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects(boardGroup.children);

    if (intersects.length > 0) {
        const intersectedObject = intersects[0].object;
        const coords = worldToBoardCoords(intersectedObject.position);
        makeMove(coords.x, coords.y, coords.z);
    }
}


// ======== 6. DRAWING THE BOARD & RUNNING THE GAME (CORRECTED) ========
function drawBoardGrid() {
    const gridGeometry = new THREE.BoxGeometry(1, 1, 1);
    for (let x = 0; x < 4; x++) {
        // The middle loop now correctly increments y (y++)
        for (let y = 0; y < 4; y++) { 
            for (let z = 0; z < 4; z++) {
                const gridMaterial = new THREE.MeshBasicMaterial({ color: 0x555555, wireframe: true, opacity: 0.2, transparent: true });
                const cube = new THREE.Mesh(gridGeometry, gridMaterial);
                cube.position.set(x - 1.5, y - 1.5, z - 1.5);
                cube.userData = { x: x, y: y, z: z };
                boardGroup.add(cube);
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// =========== LET'S START! ===========
drawBoardGrid();
newGame();
animate();
window.addEventListener('mousemove', onMouseMove);
window.addEventListener('mousedown', onMouseClick);
document.getElementById('newGameBtn').addEventListener('click', newGame);


// ======== ADVANCED VISUAL TOOLS ========

// The distance to separate each layer in the exploded view
const EXPLOSION_FACTOR = 4.0;

/**
 * Animates all board layers apart to inspect them individually.
 */
function explodeView() {
    const allObjects = [...boardGroup.children, ...piecesGroup.children];

    allObjects.forEach(obj => {
        const y_coord = obj.userData.y; // The layer index (0, 1, 2, or 3)
        const originalY = y_coord - 1.5; // The object's original centered Y position

        // Calculate the new Y position, pushing each layer up by the explosion factor
        const targetY = originalY + (y_coord * EXPLOSION_FACTOR);

        // Animate the object to its new exploded position using GSAP
        gsap.to(obj.position, {
            y: targetY,
            duration: 0.8, // Animation duration in seconds
            ease: "power2.inOut" // A nice smooth easing effect
        });
    });
}

/**
 * Animates all board layers back together into a single cube.
 */
function combineView() {
    const allObjects = [...boardGroup.children, ...piecesGroup.children];

    allObjects.forEach(obj => {
        const y_coord = obj.userData.y;
        const originalY = y_coord - 1.5; // The object's original Y position

        // Animate the object back to its original position
        gsap.to(obj.position, {
            y: originalY,
            duration: 0.8,
            ease: "power2.inOut"
        });
    });
}

// Even better! A function to inspect just ONE layer.
function inspectLayer(layerIndex) {
    const allObjects = [...boardGroup.children, ...piecesGroup.children];

    allObjects.forEach(obj => {
        const y_coord = obj.userData.y;
        const originalY = y_coord - 1.5;

        // If the object is on the layer we want to inspect, move it to the center.
        // If not, move it far away.
        let targetY;
        if (y_coord === layerIndex) {
            targetY = 0; // Move the selected layer to the visual center
        } else {
            // Move other layers far away (above or below)
            targetY = (y_coord < layerIndex) ? -20 : 20;
        }
        
        gsap.to(obj.position, {
            y: targetY,
            duration: 0.8,
            ease: "power2.inOut"
        });
    });
}


// Now add the new event listeners for the layer buttons

document.getElementById('reset-view').addEventListener('click', combineView);
document.getElementById('layer-0').addEventListener('click', () => inspectLayer(0));
document.getElementById('layer-1').addEventListener('click', () => inspectLayer(1));
document.getElementById('layer-2').addEventListener('click', () => inspectLayer(2));
document.getElementById('layer-3').addEventListener('click', () => inspectLayer(3));