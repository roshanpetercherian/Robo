// ==================== A* PATHFINDING ENGINE (Responsive) ====================

const canvas = document.getElementById('astarCanvas');
const ctx = canvas.getContext('2d');
const statusMsg = document.getElementById('pathStatus');

// Dynamic Grid Config
let CELL_SIZE = 25;
let COLS, ROWS;
let grid = []; 
let start = { x: 2, y: 2 };
let end = { x: 10, y: 10 }; // Safe default
let currentMode = 'wall';
let isDragging = false;

// ==================== INITIALIZATION & RESPONSIVENESS ====================

function initCanvas() {
    const maxWidth = window.innerWidth * 0.95; // 95% of screen width
    const maxHeight = window.innerHeight * 0.6; // 60% of screen height

    // Desktop vs Mobile sizing
    if (window.innerWidth < 768) {
        CELL_SIZE = 20; // Smaller cells on mobile
        canvas.width = maxWidth;
        canvas.height = maxHeight;
    } else {
        CELL_SIZE = 25;
        canvas.width = Math.min(800, maxWidth);
        canvas.height = 500;
    }

    COLS = Math.floor(canvas.width / CELL_SIZE);
    ROWS = Math.floor(canvas.height / CELL_SIZE);

    // Update End Point if it's out of bounds after resize
    if (end.x >= COLS) end.x = COLS - 2;
    if (end.y >= ROWS) end.y = ROWS - 2;
}

// 1. Init Empty Grid
function initEmptyGrid() {
    grid = new Array(COLS).fill(0).map(() => new Array(ROWS).fill(0));
}

// 2. Load Map
async function loadMapFromDB() {
    initCanvas(); // Ensure canvas is sized first
    
    try {
        const res = await fetch('/api/map/load');
        const data = await res.json();
        
        if (data.success && data.grid && data.grid.length === COLS && data.grid[0].length === ROWS) {
            grid = data.grid;
            console.log("Map loaded");
        } else {
            // Dimension mismatch or new map -> Reset
            initEmptyGrid();
            console.log("Starting blank map (dimensions changed or empty)");
        }
    } catch (error) {
        initEmptyGrid();
    }
    solveAStar();
}

// 3. Save Map
async function saveMapToDB() {
    statusMsg.textContent = "Saving...";
    statusMsg.style.color = '#fff';
    try {
        const res = await fetch('/api/map/save', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ grid: grid })
        });
        const data = await res.json();
        if(data.success) {
            statusMsg.textContent = "Layout Saved!";
            statusMsg.style.color = '#30d158'; // Green
            setTimeout(() => solveAStar(), 2000);
        }
    } catch (e) { alert("Failed to save map"); }
}

// ==================== ALGORITHM (A-Star) ====================

function solveAStar() {
    let openSet = [];
    let closedSet = [];
    let path = [];

    // Ensure start/end are valid
    if(start.x >= COLS || start.y >= ROWS) start = {x:0, y:0};
    if(end.x >= COLS || end.y >= ROWS) end = {x:COLS-1, y:ROWS-1};

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

        if (current.x === end.x && current.y === end.y) {
            let temp = current;
            path.push(temp);
            while (temp.parent) {
                path.push(temp.parent);
                temp = temp.parent;
            }
            statusMsg.textContent = `Path Found: ${path.length} steps`;
            statusMsg.style.color = '#30d158';
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

    statusMsg.textContent = "No Path Available";
    statusMsg.style.color = '#ff453a';
    draw([]); 
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
    // Clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Grid & Walls
    for (let i = 0; i < COLS; i++) {
        for (let j = 0; j < ROWS; j++) {
            if (grid[i][j] === 1) {
                // Wall Color (Dark Gray)
                ctx.fillStyle = '#4a4a4a'; 
                ctx.fillRect(i * CELL_SIZE + 1, j * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
            } else {
                // Grid Lines (Subtle)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)'; 
                ctx.strokeRect(i * CELL_SIZE, j * CELL_SIZE, CELL_SIZE, CELL_SIZE);
            }
        }
    }

    // Draw Path (Blue Neon)
    for (let i = 0; i < path.length; i++) {
        ctx.fillStyle = 'rgba(10, 132, 255, 0.6)'; 
        ctx.fillRect(path[i].x * CELL_SIZE + 1, path[i].y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
    }

    // Draw Start (Green)
    ctx.fillStyle = '#30d158';
    ctx.fillRect(start.x * CELL_SIZE + 1, start.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);

    // Draw End (Red)
    ctx.fillStyle = '#ff453a';
    ctx.fillRect(end.x * CELL_SIZE + 1, end.y * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
}

// ==================== INTERACTION (Mouse & Touch) ====================

function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.btn-control').forEach(b => b.classList.remove('active'));
    let id = mode === 'wall' ? 'btnWall' : mode === 'start' ? 'btnStart' : 'btnEnd';
    const btn = document.getElementById(id);
    if(btn) btn.classList.add('active');
}

function handleInput(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((clientY - rect.top) / CELL_SIZE);
    
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
    
    solveAStar();
}

function clearWalls() {
    initEmptyGrid();
    solveAStar();
}

// Mouse Events
canvas.addEventListener('mousedown', (e) => { isDragging = true; handleInput(e.clientX, e.clientY); });
canvas.addEventListener('mousemove', (e) => { if (isDragging && currentMode === 'wall') handleInput(e.clientX, e.clientY); });
window.addEventListener('mouseup', () => { isDragging = false; });

// Touch Events (Mobile)
canvas.addEventListener('touchstart', (e) => { 
    isDragging = true; 
    handleInput(e.touches[0].clientX, e.touches[0].clientY);
    e.preventDefault(); // Prevent scrolling
}, {passive: false});

canvas.addEventListener('touchmove', (e) => { 
    if (isDragging && currentMode === 'wall') {
        handleInput(e.touches[0].clientX, e.touches[0].clientY);
    }
    e.preventDefault(); 
}, {passive: false});

window.addEventListener('touchend', () => { isDragging = false; });

// Handle Resize
window.addEventListener('resize', () => {
    // Reload map to adjust grid size (this resets walls if dimensions change drastically)
    // For a production app, you'd want to interpolate old grid to new grid.
    loadMapFromDB();
});

// START
loadMapFromDB();
setMode('wall');