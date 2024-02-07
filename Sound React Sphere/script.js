let scene, camera, renderer;
  let particles, geometry, material;
let composer, renderPass, bloomPass;
  function init() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(126, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 500;
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  // Post-processing setup
  composer = new THREE.EffectComposer(renderer);
  renderPass = new THREE.RenderPass(scene, camera);
  composer.addPass(renderPass);

  bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
  bloomPass.threshold = 0;
  bloomPass.strength = 1.5; // Adjust for more/less bloom
  bloomPass.radius = 1;
  composer.addPass(bloomPass);

    geometry = new THREE.BufferGeometry();
    let positions = [];
    let colors = [];
    let fibonacciIndex = 0;
    for (let i = 0; i < 200000; i++) {
      let theta = Math.random() * Math.PI * 2;
      let phi = Math.acos(Math.random() * 2 - 1);
      let r = 500;
      let x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.sin(phi) * Math.sin(theta);
      let z = r * Math.cos(phi);
      positions.push(x, y, z);

      let color = new THREE.Color();
      color.setHSL((x + 500) / 1000, 1.5, 0.5); //0.5 0.5
      colors.push(color.r, color.g, color.b);

      if (i % 5 == 0) {
        let fibFactor = (fibonacciIndex % 10) + 1;
        let fibValue = fibonacci(fibFactor) / 200;
        let dx = fibValue * Math.sin(theta + phi);
        let dy = fibValue * Math.cos(theta + phi);
        let dz = fibValue * Math.sin(theta - phi);
        positions.push(x + dx, y + dy, z + dz);
        fibonacciIndex++;

        color.setHSL((x + dx + 500) / 1000, 1.5, 0.5);
        colors.push(color.r, color.g, color.b);
      }
    }
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      alphaTest: -0.0002,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      map: new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/circle.png')
    });
    particles = new THREE.Points(geometry, material);
    scene.add(particles);
  }

  function fibonacci(n) {
    return (n <= 1) ? n : fibonacci(n - 1) + fibonacci(n - 2);
  }

let audioContext, analyser, microphone;
let isAudioInitialized = false; // New flag to check if audio is initialized

function initAudio() {
  navigator.mediaDevices.getUserMedia({ audio: true, video: false })
    .then(stream => {
      audioContext = new AudioContext();
      microphone = audioContext.createMediaStreamSource(stream);
      analyser = audioContext.createAnalyser();

      microphone.connect(analyser);
      analyser.fftSize = 512;

      isAudioInitialized = true; // Set the flag to tue after initialization
      animate(); // Start the animation here
    })
    .catch(err => {
      console.error('Oops! Something went wrong with audio:', err);
    });
}
function getAverageVolume(array) {
  let values = 0;
  let length = array.length;

  for (let i = 0; i < length; i++) {
    values += array[i];
  }

  return values / length;
}

function animate() {
  if (!isAudioInitialized) {
    return; // Exit the function if audio is not initialized
  }

  requestAnimationFrame(animate);

  let frequencyData = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(frequencyData);
  let avgVolume = getAverageVolume(frequencyData);

  let time = performance.now() * mapTempo(avgVolume);
  let soundFactor = mapSoundToMovement(avgVolume);

  let positions = geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    let x = positions[i];
    let y = positions[i + 1];
    let z = positions[i + 2];

    let r = Math.sqrt(x * x + y * y + z * z);
    let forceMagnitude = 1000 / (r * r * r);
    let force = new THREE.Vector3(-x, -y, -z).multiplyScalar(forceMagnitude);

    let rotation = new THREE.Euler(
      y * (soundFactor.yFactor + 0.0001), // Adding a small constant value
      x * (soundFactor.xFactor + 0.001) + time,//0.03
      0
    );

    let position = new THREE.Vector3(x, y, z)
      .add(force)
      .applyEuler(rotation);

    positions[i] = position.x;
    positions[i + 1] = position.y;
    positions[i + 2] = position.z;
  }

  geometry.attributes.position.needsUpdate = true;

  // Orbit the camera around the center of the scene
  let cameraOrbitRadius = 650; //650
  camera.position.x = cameraOrbitRadius * Math.sin(time * 0.5) * Math.cos(time * 0.3);
  camera.position.y = cameraOrbitRadius * Math.sin(time * 0.5) * Math.sin(time * 0.3);//.3
  camera.position.z = cameraOrbitRadius * Math.cos(time * 0.5);
  camera.lookAt(scene.position);

  renderer.render(scene, camera);
}


function mapSoundToMovement(volume) {
  // Adjust these ranges based on your nee
  let yFactor = mapVolumeToRange(volume, 0.0001, 0.001);//0.001 0.1
  let xFactor = mapVolumeToRange(volume, 0.01, 0.001);//0.01 0.1
  return { yFactor, xFactor };
}

function mapVolumeToRange(volume, min, max) {
  // Map volume to a range between min and max
  let normalizedVolume = volume / 128; // Normalize volume to 0-1128
  return min + normalizedVolume * (max - min);
}

function mapTempo(volume) {
  // Map volume to a tempo range
  return volume > 50 ? 0.0005 : 0.0005; // Adjust thresholds a needed 0.005 0.000005  0.000005 0.00000005
}



  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  window.addEventListener('resize', onWindowResize, false);

// In your init function, call initAudio()
init();
initAudio();
animate();