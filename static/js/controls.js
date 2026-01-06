/**
 * Enhanced Robot Controls
 * Adds keyboard controls and visual feedback for robot movement
 */

// Keyboard mapping
const KEYBOARD_CONTROLS = {
    'ArrowUp': 'forward',
    'w': 'forward',
    'W': 'forward',
    'ArrowDown': 'backward',
    's': 'backward',
    'S': 'backward',
    'ArrowLeft': 'left',
    'a': 'left',
    'A': 'left',
    'ArrowRight': 'right',
    'd': 'right',
    'D': 'right',
    ' ': 'stop',  // Spacebar
    'h': 'dock',  // H for home
    'H': 'dock'
};

// Track active keys to prevent repeat
const activeKeys = new Set();

// Send command to robot
async function sendRobotCommand(command) {
    try {
        const response = await fetch('/api/robot/command', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ command })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Visual feedback on button
            highlightButton(command);
            return true;
        }
        return false;
    } catch (error) {
        console.error('Command error:', error);
        return false;
    }
}

// Highlight button when activated
function highlightButton(command) {
    const button = document.querySelector(`[data-cmd="${command}"]`);
    if (button) {
        button.style.transform = 'scale(0.95)';
        button.style.background = '#2e7cff';
        
        setTimeout(() => {
            button.style.transform = '';
            button.style.background = '';
        }, 200);
    }
}

// Keyboard controls
function setupKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        // Ignore if typing in input field
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
            return;
        }
        
        const command = KEYBOARD_CONTROLS[e.key];
        
        if (command && !activeKeys.has(e.key)) {
            activeKeys.add(e.key);
            e.preventDefault();
            sendRobotCommand(command);
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (KEYBOARD_CONTROLS[e.key]) {
            activeKeys.delete(e.key);
        }
    });
    
    console.log('⌨️  Keyboard controls enabled (WASD or Arrow keys)');
}

// Touch/mouse controls for mobile
function setupTouchControls() {
    const buttons = document.querySelectorAll('.d-btn, .dock-btn');
    
    buttons.forEach(button => {
        // Prevent button from sticking on mobile
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            button.click();
        });
        
        // Visual feedback
        button.addEventListener('mousedown', () => {
            button.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('mouseup', () => {
            button.style.transform = '';
        });
    });
}

// Gamepad support (experimental)
let gamepadIndex = null;

function detectGamepad() {
    window.addEventListener('gamepadconnected', (e) => {
        gamepadIndex = e.gamepad.index;
        console.log(`🎮 Gamepad connected: ${e.gamepad.id}`);
        showGamepadToast();
        startGamepadPolling();
    });
    
    window.addEventListener('gamepaddisconnected', (e) => {
        gamepadIndex = null;
        console.log('🎮 Gamepad disconnected');
    });
}

function showGamepadToast() {
    // Use the global showToast function if available
    if (typeof showToast === 'function') {
        showToast('🎮 Gamepad connected! Use D-pad or left stick to control robot', 'success');
    }
}

function startGamepadPolling() {
    let lastCommand = null;
    let commandTimeout = null;
    
    function poll() {
        if (gamepadIndex === null) return;
        
        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[gamepadIndex];
        
        if (!gamepad) {
            gamepadIndex = null;
            return;
        }
        
        // Check D-pad (buttons 12-15) and left stick (axes 0-1)
        let command = null;
        
        if (gamepad.buttons[12].pressed || gamepad.axes[1] < -0.5) {
            command = 'forward';
        } else if (gamepad.buttons[13].pressed || gamepad.axes[1] > 0.5) {
            command = 'backward';
        } else if (gamepad.buttons[14].pressed || gamepad.axes[0] < -0.5) {
            command = 'left';
        } else if (gamepad.buttons[15].pressed || gamepad.axes[0] > 0.5) {
            command = 'right';
        } else if (gamepad.buttons[0].pressed) {  // A button = stop
            command = 'stop';
        } else if (gamepad.buttons[1].pressed) {  // B button = dock
            command = 'dock';
        }
        
        // Send command if changed
        if (command && command !== lastCommand) {
            sendRobotCommand(command);
            lastCommand = command;
            
            // Auto-stop after 500ms of no input
            clearTimeout(commandTimeout);
            commandTimeout = setTimeout(() => {
                lastCommand = null;
            }, 500);
        }
        
        requestAnimationFrame(poll);
    }
    
    requestAnimationFrame(poll);
}

// Initialize all control methods
function initControls() {
    setupKeyboardControls();
    setupTouchControls();
    detectGamepad();
    console.log('✓ All control methods initialized');
}

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initControls);
} else {
    initControls();
}