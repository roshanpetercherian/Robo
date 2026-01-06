// Register GSAP ScrollTrigger
gsap.registerPlugin(ScrollTrigger);

// --- 1. THREE.JS SETUP ---
const container = document.getElementById('webgl-container');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); // Alpha true for transparent bg

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

// Lighting (Dramatic Apple-style lighting)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
scene.add(ambientLight);

const spotLight = new THREE.SpotLight(0xffffff, 2);
spotLight.position.set(5, 10, 5);
spotLight.castShadow = true;
scene.add(spotLight);

const blueRimLight = new THREE.PointLight(0x4299e1, 1, 10);
blueRimLight.position.set(-2, 2, -2);
scene.add(blueRimLight);

// --- 2. BUILD THE ROBOT (Your Cuboidal Design) ---
const robot = new THREE.Group();

// Materials
const matBody = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.2, metalness: 0.8 }); 
const matChassis = new THREE.MeshStandardMaterial({ color: 0x000000 });
const matWheel = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });
const matSilver = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 0.9, roughness: 0.1 });
const matPi = new THREE.MeshStandardMaterial({ color: 0x48bb78, emissive: 0x0f3c25 });
const matPill = new THREE.MeshStandardMaterial({ color: 0xf6ad55 });
const matWater = new THREE.MeshStandardMaterial({ color: 0x4299e1, transparent: true, opacity: 0.6 });

// Build Parts
// Chassis
const chassis = new THREE.Mesh(new THREE.BoxGeometry(2, 0.3, 2.5), matChassis);
chassis.position.y = 0.5;
robot.add(chassis);

// Wheels
const wheelGeo = new THREE.CylinderGeometry(0.7, 0.7, 0.3, 32);
const wheelL = new THREE.Mesh(wheelGeo, matWheel);
wheelL.rotation.z = Math.PI/2; wheelL.position.set(-1.2, 0.7, -0.8); robot.add(wheelL);
const wheelR = new THREE.Mesh(wheelGeo, matWheel);
wheelR.rotation.z = Math.PI/2; wheelR.position.set(1.2, 0.7, -0.8); robot.add(wheelR);

// Body
const bodyGeo = new THREE.BoxGeometry(1.8, 1.5, 2.0);
const mainBody = new THREE.Mesh(bodyGeo, matBody);
mainBody.position.set(0, 1.5, 0); 
robot.add(mainBody);

// Drawer Group
const robotDrawer = new THREE.Group();
robotDrawer.position.set(0, 1.2, 0); 
const trayMesh = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.1, 1.8), matSilver);
robotDrawer.add(trayMesh);
const trayDoor = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.4, 0.1), matSilver);
trayDoor.position.set(0, 0.15, 0.95);
robotDrawer.add(trayDoor);

// Meds
const pill = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.4, 16), matPill);
pill.position.set(-0.4, 0.26, 0.2); robotDrawer.add(pill);
const water = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.6, 16), matWater);
water.position.set(0.4, 0.36, 0); robotDrawer.add(water);

robot.add(robotDrawer);

// Pi
const piBoard = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 0.1), matPi);
piBoard.position.set(0, 2.0, -1.01); 
robot.add(piBoard);

scene.add(robot);

// Initial Camera Pos
camera.position.set(0, 2, 5);
camera.lookAt(0, 1.5, 0);

// --- 3. ANIMATION LOOP ---
function animate() {
    requestAnimationFrame(animate);
    // Subtle floating animation
    robot.position.y = Math.sin(Date.now() * 0.001) * 0.05; 
    renderer.render(scene, camera);
}
animate();

// Resize Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// --- 4. SCROLL ANIMATIONS (THE APPLE EFFECT) ---

// Initial State (Section 1)
robot.rotation.set(0, 0, 0);
robot.position.set(0, 0, 0);

// ANIMATION 1: Scroll from Sec 1 to Sec 2 (Show Drawer)
gsap.to(robot.rotation, {
    y: -Math.PI / 4, // Rotate slightly left
    x: 0.2,          // Tilt forward slightly
    scrollTrigger: {
        trigger: "#sec-2",
        start: "top bottom",
        end: "center center",
        scrub: 1 // Smooth scrubbing
    }
});

// Open Drawer when reaching Section 2
gsap.to(robotDrawer.position, {
    z: 1.2, // Slide out
    scrollTrigger: {
        trigger: "#sec-2",
        start: "top bottom",
        end: "center center",
        scrub: 1
    }
});

// ANIMATION 2: Scroll from Sec 2 to Sec 3 (Show Back/Pi)
gsap.to(robot.rotation, {
    y: Math.PI, // Rotate 180 degrees to show back
    x: 0,
    scrollTrigger: {
        trigger: "#sec-3",
        start: "top bottom",
        end: "center center",
        scrub: 1
    }
});

// Close Drawer when leaving Sec 2
gsap.to(robotDrawer.position, {
    z: 0, 
    scrollTrigger: {
        trigger: "#sec-3",
        start: "top bottom",
        end: "center center",
        scrub: 1
    }
});

// ANIMATION 3: Final Section (Center and Zoom)
gsap.to(camera.position, {
    z: 3.5, // Zoom in
    y: 1.5,
    scrollTrigger: {
        trigger: "#sec-4",
        start: "top bottom",
        end: "center center",
        scrub: 1
    }
});

gsap.to(robot.rotation, {
    y: Math.PI * 2, // Spin back to front
    scrollTrigger: {
        trigger: "#sec-4",
        start: "top bottom",
        end: "center center",
        scrub: 1
    }
});

// Text Fade In Effects
gsap.utils.toArray('.section').forEach(section => {
    gsap.to(section, {
        opacity: 1,
        y: 0,
        duration: 1,
        scrollTrigger: {
            trigger: section,
            start: "top 75%",
            end: "top 25%",
            toggleActions: "play none none reverse"
        }
    })
});