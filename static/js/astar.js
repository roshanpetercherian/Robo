// ==================== A* PATHFINDING ENGINE ====================

const canvas = document.getElementById('astarCanvas');
const ctx = canvas.getContext('2d');
const statusMsg = document.getElementById('pathStatus');

// Grid Configuration
const CELL_SIZE = 25;
const COLS = Math.floor(canvas.width / CELL_SIZE);
const ROWS = Math.floor(canvas.height / CELL_SIZE);

// State
let grid = []; // 0: Empty, 1: Wall
let start = { x: 2, y: 2 };
let end = { x: COLS - 3, y: ROWS - 3 };
let currentMode = 'wall';
let isDragging = false;

// ==================== INITIALIZATION & DB LOGIC ====================

// 1. Init Empty Grid
function initEmptyGrid() {
    grid = new Array(COLS).fill(0).map(() => new Array(ROWS).fill(0));
}

// 2. Load Map from Database
async function loadMapFromDB() {
    try {
        const res = await fetch('/api/map/load');
        const data = await res.json();
        
        if (data.success && data.grid) {
            grid = data.grid;
            console.log("Map loaded from DB");
        } else {
            initEmptyGrid();
            console.log("No saved map, starting blank");
        }
    } catch (error) {
        console.error("Error loading map:", error);
        initEmptyGrid();
    }
    
    // FIX: Only call solveAStar, do NOT call draw() separately
    solveAStar();
}

// 3. Save Map to Database
async function saveMapToDB() {
    statusMsg.textContent = "Saving...";
    try {
        const res = await fetch('/api/map/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ grid: grid })
        });
        const data = await res.json();
        if(data.success) {
            statusMsg.textContent = "Layout Saved!";
            setTimeout(() => solveAStar(), 2000); // Revert status text
        }
    } catch (e) {
        alert("Failed to save map");
    }
}

// ==================== ALGORITHM (A-Star) ====================

function solveAStar() {
    let openSet = [];
    let closedSet = [];
    let path = [];

    // Safety check: ensure start/end are not walls
    if (grid[start.x][start.y] === 1) grid[start.x][start.y] = 0;
    if (grid[end.x][end.y] === 1) grid[end.x][end.y] = 0;

    let startNode = { x: start.x, y: start.y, g: 0, h: 0, f: 0, parent: null };
    openSet.push(startNode);

    while (openSet.length > 0) {
        let lowestIndex = 0;
        for (let i = 0; i < openSet.length; i++) {
            if (openSet[i].f < openSet[lowestIndex].f) lowestIndex = i;
        }
        let current = openSet[lowestIndex];

        // PATH FOUND
        if (current.x === end.x && current.y === end.y) {
            let temp = current;
            path.push(temp);
            while (temp.parent) {
                path.push(temp.parent);
                temp = temp.parent;
            }
            statusMsg.textContent = `Path Found: ${path.length} steps`;
            statusMsg.style.color = '#48bb78';
            
            // FIX: This is the ONLY place we should draw the path
            draw(path); 
            return;
        }

        openSet.splice(lowestIndex, 1);
        closedSet.push(current);

        let neighbors = getNeighbors(current);
        for (let i = 0; i < neighbors.length; i++) {
            let neighbor = neighbors[i];

            if (!closedSet.find(n => n.x === neighbor.x && n.y === neighbor.y) && grid[neighbor.x][neighbor.y] !== 1) {
                let tempG = current.g + 1;
                let newPath = false;
                let existingNode = openSet.find(n => n.x === neighbor.x && n.y === neighbor.y);
                
                if (existingNode) {
                    if (tempG < existingNode.g) {
                        existingNode.g = tempG;
                        newPath = true;
                        neighbor = existingNode;
                    }
                } else {
                    neighbor.g = tempG;
                    newPath = true;
                    openSet.push(neighbor);
                }

                if (newPath) {
                    neighbor.h = Math.abs(neighbor.x - end.x) + Math.abs(neighbor.y - end.y);
                    neighbor.f = neighbor.g + neighbor.h;
                    neighbor.parent = current;
                }
            }
        }
    }

    // NO PATH FOUND
    statusMsg.textContent = "No Path Available";
    statusMsg.style.color = '#f56565';
    draw([]); // Draw empty path (just grid)
}

function getNeighbors(node) {
    let neighbors = [];
    let x = node.x;
    let y = node.y;
    if (x < COLS - 1) neighbors.push({ x: x + 1, y: y });
    if (x > 0) neighbors.push({ x: x - 1, y: y });
    if (y < ROWS - 1) neighbors.push({ x: x, y: y + 1 });
    if (y > 0) neighbors.push({ x: x, y: y - 1 });
    return neighbors;
}

// ==================== RENDERING ====================

function draw(path = []) {
    // Clear background
    ctx.fillStyle = '#0a0a14';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid & Walls
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            if (grid[i][j] === 1) {
                ctx.fillStyle = '#2d3748'; 
                ctx.fillRect(i * CELL_SIZE + 1, j * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            } else {
                ctx.strokeStyle = '#1a1a2e'; 
                ctx.strokeRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    // Draw Path (Blue Overlay)
    for (let i = 0; i < path.length; i++) {
        ctx.fillStyle = 'rgba(102, 126, 234, 0.6)'; // Increased opacity slightly
        ctx.fillRect(path[i].x * CELL_SIZE + 1, path[i].y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    // Draw Start (Green)
    ctx.fillStyle = '#48bb78';
    ctx.fillRect(start.x * CELL_SIZE + 1, start.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    // Draw End (Red)
    ctx.fillStyle = '#f56565';
    ctx.fillRect(end.x * CELL_SIZE + 1, end.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
}

// ==================== INTERACTION ====================

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.btn-control').forEach(b => b.classList.remove('active'));
    let id = mode === 'wall' ? 'btnWall' : mode === 'start' ? 'btnStart' : 'btnEnd';
    const btn = document.getElementById(id);
    if(btn) btn.classList.add('active');
}

function handleMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

    if (currentMode === 'wall') {
        grid[x][y] = grid[x][y] === 1 ? 0 : 1;
    } else if (currentMode === 'start') {
        start = { x, y };
        grid[x][y] = 0;
    } else if (currentMode === 'end') {
        end = { x, y };
        grid[x][y] = 0;
    }
    
    // FIX: Only call solveAStar, it handles the drawing
    solveAStar();
}

function clearWalls() {
    initEmptyGrid();
    solveAStar();
}

canvas.addEventListener('mousedown', (e) => { isDragging = true; handleMouse(e); });
canvas.addEventListener('mousemove', (e) => { if (isDragging && currentMode === 'wall') handleMouse(e); });
window.addEventListener('mouseup', () => { isDragging = false; });

// START
loadMapFromDB();
setMode('wall');