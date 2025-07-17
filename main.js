import * as THREE from "https://cdn.skypack.dev/three@0.132.2";
import { OrbitControls } from "https://cdn.skypack.dev/three@0.132.2/examples/jsm/controls/OrbitControls.js";

// ======== 1. SCENE SETUP (No Changes) ========
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(5, 5, 5);
controls.update();
controls.mouseButtons = {
  LEFT: null, // Setting LEFT to null makes OrbitControls ignore left-clicks.
  MIDDLE: THREE.MOUSE.DOLLY, // Middle-mouse button still zooms.
  RIGHT: THREE.MOUSE.ROTATE, // RIGHT mouse button now rotates the camera.
};
const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);
const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
directionalLight.position.set(10, 20, 5);
scene.add(directionalLight);

// ======== 2. GAME ASSETS & DATA (UPDATED) ========
const pieceGeometry = new THREE.SphereGeometry(0.4, 32, 16);

// Normal, solid materials
const blackMaterial = new THREE.MeshStandardMaterial({
  color: 0x111111,
  roughness: 0.5,
});
const whiteMaterial = new THREE.MeshStandardMaterial({
  color: 0xeeeeee,
  roughness: 0.5,
});

// UPDATED: GHOST MODE ASSETS
// We now use MeshBasicMaterial for predictable, unlit transparent colors.
const ghostBlackMaterial = new THREE.MeshBasicMaterial({
  color: 0x000000, // Pure black
  transparent: true,
  opacity: 0.35,
});
const ghostWhiteMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff, // Pure white
  transparent: true,
  opacity: 0.35,
});

// NEW: Assets for the "light up" empty cell markers
const markerGeometry = new THREE.BoxGeometry(0.6, 0.6, 0.6); // Slightly smaller cubes
const markerMaterial = new THREE.MeshBasicMaterial({
  color: 0xffff00, // A nice highlight yellow
  transparent: true,
  opacity: 0.2,
});

const piecesGroup = new THREE.Group();
scene.add(piecesGroup);

const validMoveMaterial = new THREE.MeshBasicMaterial({
  color: 0x0099ff, // A nice highlight blue
  transparent: true,
  opacity: 0.35,
});

const boardGroup = new THREE.Group();
scene.add(boardGroup);
const emptyCellMarkersGroup = new THREE.Group(); // NEW: A group for our markers
scene.add(emptyCellMarkersGroup);

const validMovesGroup = new THREE.Group(); // NEW: A group for the blue markers
scene.add(validMovesGroup);

// NEW: Add the state variable
let areValidMovesShown = false;

let board;
let currentPlayer;

// ======== 3. RAYCASTING AND UI (No Changes) ========
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const highlightGeometry = new THREE.BoxGeometry(1, 1, 1);
const highlightMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff00,
  transparent: true,
  opacity: 0.5,
});
const highlightMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
highlightMesh.visible = false;
scene.add(highlightMesh);

// ======== 4. GAME LOGIC & VISUALIZATION (Minor Update) ========
// ... (All of your core game logic functions like newGame, getFlipsInDirection, etc. remain here without change) ...

function updateVisuals() {
  while (piecesGroup.children.length > 0) {
    piecesGroup.remove(piecesGroup.children[0]);
  }
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        if (board[x][y][z] !== 0) {
          const player = board[x][y][z];
          const material = player === 1 ? blackMaterial : whiteMaterial;
          const piece = new THREE.Mesh(pieceGeometry, material);
          piece.position.set(x - 1.5, y - 1.5, z - 1.5);
          piece.userData.player = player;
          piecesGroup.add(piece);
        }
      }
    }
  }
}
// (Keep all your other unchanged logic functions here...)
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

  const gameOverScreen = document.getElementById('game-over-screen');
  gameOverScreen.classList.add('hidden');
  gameOverScreen.classList.remove('visible');

  while (piecesGroup.children.length > 0) {
    piecesGroup.remove(piecesGroup.children[0]);
  }
  board = Array(4)
    .fill(0)
    .map(() =>
      Array(4)
        .fill(0)
        .map(() => Array(4).fill(0))
    );
  board[1][1][2] = 1;
  board[1][2][1] = 1;
  board[2][1][1] = 1;
  board[2][2][2] = 1;
  board[1][1][1] = 2;
  board[1][2][2] = 2;
  board[2][1][2] = 2;
  board[2][2][1] = 2;
  currentPlayer = 1;
  updateVisuals();
  areValidMovesShown = false;
  updateValidMovesVisuals(); // clear any old visuals
  updateGameInfo();
}

function worldToBoardCoords(position) {
  return {
    x: Math.round(position.x + 1.5),
    y: Math.round(position.y + 1.5),
    z: Math.round(position.z + 1.5),
  };
}
function getFlipsInDirection(x, y, z, direction, player) {
  const opponent = player === 1 ? 2 : 1;
  let line = [];
  let cX = x + direction.x;
  let cY = y + direction.y;
  let cZ = z + direction.z;
  while (cX >= 0 && cX < 4 && cY >= 0 && cY < 4 && cZ >= 0 && cZ < 4) {
    if (board[cX][cY][cZ] === opponent) {
      line.push({ x: cX, y: cY, z: cZ });
    } else if (board[cX][cY][cZ] === player) {
      return line;
    } else {
      return [];
    }
    cX += direction.x;
    cY += direction.y;
    cZ += direction.z;
  }
  return [];
}
function isValidMove(x, y, z, player) {
  if (board[x][y][z] !== 0) return false;
  for (const direction of DIRECTIONS) {
    const flips = getFlipsInDirection(x, y, z, direction, player);
    if (flips.length > 0) {
      return true;
    }
  }
  return false;
}
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

function endGame() {
    // 1. Get the HTML elements for the game over screen
    const gameOverScreen = document.getElementById('game-over-screen');
    const winnerText = document.getElementById('winner-text');
    const finalScoreText = document.getElementById('final-score-text');

    // 2. Calculate the final score
    let blackScore = 0;
    let whiteScore = 0;
    for (const cell of board.flat(2)) {
        if (cell === 1) blackScore++;
        if (cell === 2) whiteScore++;
    }

    // 3. Determine the winner and set the text content
    if (blackScore > whiteScore) {
        winnerText.textContent = "Black Wins!";
    } else if (whiteScore > blackScore) {
        winnerText.textContent = "White Wins!";
    } else {
        winnerText.textContent = "It's a Draw!";
    }
    finalScoreText.textContent = `Final Score: Black ${blackScore} - White ${whiteScore}`;

    // 4. Make the game over screen visible with a smooth fade
    gameOverScreen.classList.remove('hidden');
    gameOverScreen.classList.add('visible');
}

function switchPlayer() {
  currentPlayer = currentPlayer === 1 ? 2 : 1;
  const validMoves = getValidMoves(currentPlayer);
  if (validMoves.length === 0) {
    const otherPlayer = currentPlayer === 1 ? 2 : 1;
    const otherPlayerMoves = getValidMoves(otherPlayer);
    if (otherPlayerMoves.length > 0) {
      alert(
        `No valid moves for ${
          currentPlayer === 1 ? "Black" : "White"
        }. Passing turn.`
      );
      currentPlayer = otherPlayer;
    } else {
      endGame();
    }
  }
  updateValidMovesVisuals();
}

function makeMove(x, y, z) {
  if (!isValidMove(x, y, z, currentPlayer)) {
    return;
  }
  let allFlips = [];
  for (const direction of DIRECTIONS) {
    const flips = getFlipsInDirection(x, y, z, direction, currentPlayer);
    allFlips = allFlips.concat(flips);
  }
  board[x][y][z] = currentPlayer;
  for (const pos of allFlips) {
    board[pos.x][pos.y][pos.z] = currentPlayer;
  }
  switchPlayer();
  updateVisuals();
  updateGameInfo();
}
function updateGameInfo() {
  const i = document.getElementById("info");
  const s = document.getElementById("score");
  i.textContent = `${currentPlayer === 1 ? "Black" : "White"}'s Turn`;
  let b = 0;
  let w = 0;
  for (const c of board.flat(2)) {
    if (c === 1) b++;
    if (c === 2) w++;
  }
  s.textContent = `Score: Black ${b} - White ${w}`;
}

function updateValidMovesVisuals() {
  // Always clear any old markers first.
  while (validMovesGroup.children.length > 0) {
    validMovesGroup.remove(validMovesGroup.children[0]);
  }

  // If the feature is turned on, find and display the new markers.
  if (areValidMovesShown) {
    const validMoves = getValidMoves(currentPlayer);

    for (const move of validMoves) {
      // Use a slightly smaller geometry so it doesn't overlap ugly.
      const markerGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const marker = new THREE.Mesh(markerGeo, validMoveMaterial);
      marker.position.set(move.x - 1.5, move.y - 1.5, move.z - 1.5);
      validMovesGroup.add(marker);
    }
  }
}

// ======== 5. EVENT LISTENERS (UPDATED) ========

// UPDATED: This function now also controls the empty cell markers.
function setGhostMode(enabled) {
  // Part 1: Make existing pieces transparent
  for (const piece of piecesGroup.children) {
    const player = piece.userData.player;
    if (enabled) {
      piece.material = player === 1 ? ghostBlackMaterial : ghostWhiteMaterial;
    } else {
      piece.material = player === 1 ? blackMaterial : whiteMaterial;
    }
  }

  // Part 2: Show or hide the markers for empty cells
  // First, always clear any existing markers
  while (emptyCellMarkersGroup.children.length > 0) {
    emptyCellMarkersGroup.remove(emptyCellMarkersGroup.children[0]);
  }

  // If ghost mode is being enabled, create new markers
  if (enabled) {
    for (let x = 0; x < 4; x++) {
      for (let y = 0; y < 4; y++) {
        for (let z = 0; z < 4; z++) {
          // If the cell in our data model is empty...
          if (board[x][y][z] === 0) {
            // ...create a "light" marker and add it.
            const marker = new THREE.Mesh(markerGeometry, markerMaterial);
            marker.position.set(x - 1.5, y - 1.5, z - 1.5);
            emptyCellMarkersGroup.add(marker);
          }
        }
      }
    }
  }
}

// ... (onMouseMove and onMouseClick listeners remain the same) ...
function onMouseMove(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(boardGroup.children);
  if (intersects.length > 0) {
    const coords = worldToBoardCoords(intersects[0].object.position);
    if (isValidMove(coords.x, coords.y, coords.z, currentPlayer)) {
      highlightMesh.position.copy(intersects[0].object.position);
      highlightMesh.visible = true;
    } else {
      highlightMesh.visible = false;
    }
  } else {
    highlightMesh.visible = false;
  }
}
function onMouseClick(event) {
  if (event.button !== 0) return;
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(boardGroup.children);
  if (intersects.length > 0) {
    const coords = worldToBoardCoords(intersects[0].object.position);
    makeMove(coords.x, coords.y, coords.z);
  }
}

// ======== 6. DRAWING THE BOARD & RUNNING THE GAME (No Changes) ========
function drawBoardGrid() {
  const gridGeometry = new THREE.BoxGeometry(1, 1, 1);
  for (let x = 0; x < 4; x++) {
    for (let y = 0; y < 4; y++) {
      for (let z = 0; z < 4; z++) {
        const gridMaterial = new THREE.MeshBasicMaterial({
          color: 0x555555,
          wireframe: true,
          opacity: 0.2,
          transparent: true,
        });
        const cube = new THREE.Mesh(gridGeometry, gridMaterial);
        cube.position.set(x - 1.5, y - 1.5, z - 1.5);
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

// Listeners (No changes here)
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mousedown", onMouseClick);
document.getElementById("newGameBtn").addEventListener("click", newGame);
document.getElementById('play-again-btn').addEventListener('click', newGame);

window.addEventListener("keydown", (event) => {
  if (event.key === "Shift") {
    setGhostMode(true);
  }

  if (event.key === ' ') { // ' ' is the spacebar
        event.preventDefault(); // Prevents the page from scrolling
        areValidMovesShown = !areValidMovesShown; // Toggle the state
        updateValidMovesVisuals(); // Update the visuals immediately
    }
});

window.addEventListener("keyup", (event) => {
  if (event.key === "Shift") {
    setGhostMode(false);
  }
});




