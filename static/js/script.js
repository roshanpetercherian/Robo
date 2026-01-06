// ==================== 1. THREE.JS VISUALIZATION ====================
// Global variables for animation
let robotDrawer = null; 
let isDrawerOpen = false;

(function initThreeJS() {
    // --- 1. SETUP SCENE ---
    const container = document.getElementById('canvas-container');
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, container.clientWidth/container.clientHeight, 0.1, 100);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Orbit Controls (Mouse Interaction)
    THREE.OrbitControls = function(object, domElement) {
        this.object = object;
        this.domElement = domElement || document;
        this.enabled = true;
        this.target = new THREE.Vector3();
        this.autoRotate = true; this.autoRotateSpeed = 2.0;
        
        var scope = this;
        var spherical = new THREE.Spherical(), sphericalDelta = new THREE.Spherical();
        var rotateStart = new THREE.Vector2(), rotateEnd = new THREE.Vector2(), rotateDelta = new THREE.Vector2();
        var STATE = { NONE: -1, ROTATE: 0 }; var state = STATE.NONE;

        this.update = function() {
            var offset = new THREE.Vector3().copy(scope.object.position).sub(scope.target);
            spherical.setFromVector3(offset);
            if(scope.autoRotate && state === STATE.NONE) spherical.theta -= 0.002 * scope.autoRotateSpeed;
            spherical.theta += sphericalDelta.theta;
            spherical.phi += sphericalDelta.phi;
            spherical.makeSafe();
            offset.setFromSpherical(spherical);
            scope.object.position.copy(scope.target).add(offset);
            scope.object.lookAt(scope.target);
            sphericalDelta.set(0,0,0);
        };

        function onMouseDown(e) { if(e.button===0){ state=STATE.ROTATE; rotateStart.set(e.clientX, e.clientY); scope.autoRotate = false; } }
        function onMouseMove(e) { 
            if(state===STATE.ROTATE) {
                rotateEnd.set(e.clientX, e.clientY);
                rotateDelta.subVectors(rotateEnd, rotateStart).multiplyScalar(0.005);
                sphericalDelta.theta -= rotateDelta.x;
                sphericalDelta.phi -= rotateDelta.y;
                rotateStart.copy(rotateEnd);
            }
        }
        function onMouseUp() { state=STATE.NONE; scope.autoRotate = true; }
        this.domElement.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    };

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // ==================== ROBOT GEOMETRY (CUBOIDAL) ====================
    const robot = new THREE.Group();

    // Materials
    const matBody = new THREE.MeshStandardMaterial({ color: 0x2d3748, roughness: 0.3 }); // Dark Grey Box
    const matChassis = new THREE.MeshStandardMaterial({ color: 0x1a202c }); // Black Base
    const matWheel = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
    const matSilver = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.2 });
    const matWater = new THREE.MeshStandardMaterial({ color: 0x4299e1, transparent: true, opacity: 0.7 });
    const matPill = new THREE.MeshStandardMaterial({ color: 0xf6ad55 });
    const matPi = new THREE.MeshStandardMaterial({ color: 0x48bb78 });

    // 1. BASE CHASSIS
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 2.5), matChassis);
    chassis.position.y = 0.5;
    robot.add(chassis);

    // 2. WHEELS (2 Big Back, 2 Small Front)
    const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 32);
    const wheelL = new THREE.Mesh(wheelGeo, matWheel);
    wheelL.rotation.z = Math.PI/2; wheelL.position.set(-1.2, 0.7, -0.8); robot.add(wheelL);
    const wheelR = new THREE.Mesh(wheelGeo, matWheel);
    wheelR.rotation.z = Math.PI/2; wheelR.position.set(1.2, 0.7, -0.8); robot.add(wheelR);

    const casterGeo = new THREE.SphereGeometry(0.3);
    const casterL = new THREE.Mesh(casterGeo, matSilver); casterL.position.set(-0.7, 0.3, 1.0); robot.add(casterL);
    const casterR = new THREE.Mesh(casterGeo, matSilver); casterR.position.set(0.7, 0.3, 1.0); robot.add(casterR);

    // 3. MAIN CARGO BODY
    const bodyGeo = new THREE.BoxGeometry(1.8, 1.5, 2.0);
    const mainBody = new THREE.Mesh(bodyGeo, matBody);
    mainBody.position.set(0, 1.5, 0); 
    robot.add(mainBody);

    // 4. THE DRAWER (Sliding Tray)
    robotDrawer = new THREE.Group();
    robotDrawer.position.set(0, 1.2, 0); 

    const trayMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.8), matSilver);
    robotDrawer.add(trayMesh);
    const trayDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.1), matSilver);
    trayDoor.position.set(0, 0.15, 0.95); 
    robotDrawer.add(trayDoor);

    // Items
    const water = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16), matWater);
    water.position.set(0.4, 0.36, 0); robotDrawer.add(water);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.1, 16), matSilver);
    cap.position.set(0.4, 0.71, 0); robotDrawer.add(cap);
    const pill = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16), matPill);
    pill.position.set(-0.4, 0.26, 0.2); robotDrawer.add(pill);
    const pillCap = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.1, 16), matChassis);
    pillCap.position.set(-0.4, 0.51, 0.2); robotDrawer.add(pillCap);
    robot.add(robotDrawer);

    // 5. RASPBERRY PI
    const piBoard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.1), matPi);
    piBoard.position.set(0, 2.0, -1.01); 
    robot.add(piBoard);

    scene.add(robot);

    // Camera
    camera.position.set(3, 4, 4);
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 1, 0);

    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);
        // Drawer Logic
        const targetZ = isDrawerOpen ? 1.2 : 0;
        robotDrawer.position.z += (targetZ - robotDrawer.position.z) * 0.05;
        controls.update();
        renderer.render(scene, camera);
    }
    animate();

    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
})();

// ==================== 2. APPLICATION LOGIC ====================
document.addEventListener('DOMContentLoaded', () => {
    
    // --- SCHEDULE FETCHING ---
    const scheduleContainer = document.getElementById('scheduleContainer');

    // Make this globally accessible for the toggle/delete functions
    window.fetchSchedule = async function() {
        try {
            const res = await fetch('/api/schedule');
            const data = await res.json();
            renderSchedule(data);
        } catch (error) {
            console.error("Schedule error", error);
            scheduleContainer.innerHTML = '<div style="text-align:center; padding:10px; color:#f56565">Server Offline</div>';
        }
    };

    // --- NEW INTERACTIVE RENDERER ---
    function renderSchedule(data) {
        scheduleContainer.innerHTML = '';
        
        // Group by Day
        const groups = {};
        data.forEach(item => {
            if(!groups[item.day]) groups[item.day] = [];
            groups[item.day].push(item);
        });

        for (const [day, tasks] of Object.entries(groups)) {
            // Only Show Today for simplicity in this view
            if(day !== 'Today') continue; 

            tasks.forEach(task => {
                const el = document.createElement('div');
                // Styling based on status
                const opacity = task.is_done ? '0.5' : '1';
                const decoration = task.is_done ? 'line-through' : 'none';
                const checkColor = task.is_done ? '#48bb78' : 'transparent';
                const checkMark = task.is_done ? '✓' : '';

                el.className = `schedule-item`;
                el.style.opacity = opacity;
                el.style.display = 'flex';
                el.style.alignItems = 'center';
                el.style.justifyContent = 'space-between';
                
                el.innerHTML = `
                    <div style="flex-grow:1; display:flex; align-items:center; gap:15px;">
                        <div onclick="toggleTask(${task.id})" style="cursor:pointer; width:22px; height:22px; border:2px solid #48bb78; border-radius:50%; display:flex; align-items:center; justify-content:center; color:white; background:${checkColor}; font-weight:bold; font-size:14px; transition:0.2s;">
                            ${checkMark}
                        </div>
                        
                        <div>
                            <div class="schedule-task" style="text-decoration:${decoration}; color:white; font-size:1.05rem;">
                                ${task.task} 
                                <span style="font-size:0.8em; color:#a0aec0; margin-left:5px;">(${task.patient})</span>
                            </div>
                            <div class="schedule-time" style="color:#667eea;">${task.time}</div>
                        </div>
                    </div>
                    
                    <button onclick="deleteTask(${task.id})" style="background:transparent; border:none; color:#f56565; cursor:pointer; font-size:1.5rem; padding:0 10px; opacity:0.7;">&times;</button>
                `;
                scheduleContainer.appendChild(el);
            });
            
            if(tasks.length === 0) {
                 scheduleContainer.innerHTML = '<div style="text-align:center; padding:20px; color:#718096">No tasks remaining today.</div>';
            }
        }
    }

    // Initial Load
    window.fetchSchedule();
    setInterval(window.fetchSchedule, 5000);

    // --- VOICE COMMANDS ---
    const voiceBtn = document.getElementById('voiceBtn');
    const voiceOutput = document.getElementById('voiceOutput');
    let recognition;

    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            voiceBtn.classList.add('listening');
            document.getElementById('voiceBtnText').innerText = "Listening...";
        };
        
        recognition.onend = () => {
            voiceBtn.classList.remove('listening');
            document.getElementById('voiceBtnText').innerText = "Tap to Speak";
        };

        recognition.onresult = async (e) => {
            const text = e.results[0][0].transcript;
            voiceOutput.innerText = `"${text}"`;
            
            // LOCAL ANIMATION TRIGGER
            const lowerText = text.toLowerCase();
            if (lowerText.includes("open tray") || lowerText.includes("open drawer")) {
                isDrawerOpen = true;
                voiceOutput.innerHTML = `<span style="color:#48bb78">✓ Opening Drawer...</span>`;
            } else if (lowerText.includes("close tray") || lowerText.includes("close drawer")) {
                isDrawerOpen = false;
                voiceOutput.innerHTML = `<span style="color:#48bb78">✓ Closing Drawer...</span>`;
            }

            // BACKEND AI
            try {
                const res = await fetch('/api/voice/process', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ text: text })
                });
                const result = await res.json();
                
                if(result.success) {
                    voiceOutput.innerHTML = `<span style="color:#48bb78">✓ ${result.message}</span>`;
                    if(result.action === 'DISPENSE' || result.action === 'DISPENSE_MED') {
                        isDrawerOpen = true; 
                    }
                    window.fetchSchedule();
                } else {
                    voiceOutput.innerHTML = `<span style="color:#f56565">✗ ${result.error}</span>`;
                }
            } catch(err) {
                console.log("Server error");
            }
        };

        voiceBtn.addEventListener('click', () => recognition.start());
    } else {
        voiceOutput.innerText = "Voice not supported in this browser.";
    }

    // --- MANUAL COMMANDS ---
    const sendBtn = document.getElementById('sendCommandBtn');
    const input = document.getElementById('manualCommandInput');
    const responseArea = document.getElementById('responseArea');

    if(sendBtn){
        sendBtn.addEventListener('click', () => {
            const cmd = input.value.trim();
            if(!cmd) return;

            if(cmd.toLowerCase().includes("open")) isDrawerOpen = true;
            if(cmd.toLowerCase().includes("close")) isDrawerOpen = false;
            
            responseArea.innerText = `Sending: "${cmd}"...`;
            setTimeout(() => {
                responseArea.innerHTML = `<span style="color:#48bb78">✓ Robot Acknowledged: ${cmd}</span>`;
                input.value = '';
            }, 1000);
        });
    }
});

// ==================== 3. GLOBAL INTERACTIVE FUNCTIONS ====================
// These are attached to window so they can be called by onclick events in HTML

// 1. Toggle Task Status (Check/Uncheck) with Stock Management
window.toggleTask = async (id) => {
    try {
        const res = await fetch('/api/task/toggle', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id})
        });
        
        const data = await res.json();
        
        if (data.success) {
            // Success: Refresh to show new status and updated stock
            window.fetchSchedule(); 
        } else {
            // Failure: Likely Out of Stock
            alert(data.message); 
        }
    } catch(e) { 
        console.error("Error toggling task:", e);
        alert("Server communication error.");
    }
};

// 2. Delete Task
window.deleteTask = async (id) => {
    if(!confirm("Are you sure you want to delete this task?")) return;
    try {
        await fetch('/api/task/delete', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({id})
        });
        window.fetchSchedule();
    } catch(e) { console.error(e); }
};

// 3. Add Modal Helpers
window.openAddModal = () => {
    document.getElementById('addTaskModal').style.display = 'flex';
};

window.submitNewTask = async () => {
    const name = document.getElementById('newTaskName').value;
    const time = document.getElementById('newTaskTime').value;
    const pid = document.getElementById('newTaskPatient').value;
    
    if(!name || !time) return alert("Please enter medicine name and time");

    try {
        await fetch('/api/task/add', {
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ name, time, patient_id: pid })
        });
        
        document.getElementById('addTaskModal').style.display = 'none';
        document.getElementById('newTaskName').value = '';
        window.fetchSchedule();
    } catch(e) { console.error(e); }
};

// 4. Handle Patient Requests (Buttons)
window.sendRequest = async (type) => {
    // VISUAL FEEDBACK
    const voiceOutput = document.getElementById('voiceOutput');
    if(voiceOutput) voiceOutput.innerHTML = `<span style="color:#63b3ed">Sending ${type} request...</span>`;

    // ROBOT ACTION: Open Tray for Meds or Water
    if (type === 'medicine' || type === 'water') {
        if (typeof isDrawerOpen !== 'undefined') {
            isDrawerOpen = true; // Trigger 3D Animation
            console.log("🤖 Robot: Opening Tray for delivery");
        }
    } else if (type === 'help') {
        // For Help, maybe flash the screen or play a sound (optional)
        alert("🚨 EMERGENCY ALERT SENT TO NURSE STATION! 🚨");
    }

    // BACKEND LOGGING
    try {
        const res = await fetch('/api/request', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ type })
        });
        const data = await res.json();
        
        if(data.success && voiceOutput) {
            voiceOutput.innerHTML = `<span style="color:#48bb78">✓ Request Sent: ${type.toUpperCase()}</span>`;
        }
    } catch (e) {
        console.error("Request failed", e);
        alert("Failed to send request. Check connection.");
    }
};