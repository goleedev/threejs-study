import * as THREE from "three";

import Stats from "three/addons/libs/stats.module.js";
import { GUI } from "three/addons/libs/lil-gui.module.min.js";

import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

let camera, scene, renderer;
const mixers = [];
let stats;

const clock = new THREE.Clock();

init();
animate();

function init() {
  const container = document.getElementById("container");

  camera = new THREE.PerspectiveCamera(
    30,
    window.innerWidth / window.innerHeight,
    1,
    5000
  );
  camera.position.set(0, 0, 250);

  scene = new THREE.Scene();
  scene.background = new THREE.Color().setHSL(0.6, 0, 1);
  scene.fog = new THREE.Fog(scene.background, 1, 5000);

  // LIGHTS

  const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.6);
  hemiLight.color.setHSL(0.6, 1, 0.6);
  hemiLight.groundColor.setHSL(0.095, 1, 0.75);
  hemiLight.position.set(0, 50, 0);
  scene.add(hemiLight);

  const hemiLightHelper = new THREE.HemisphereLightHelper(hemiLight, 10);
  scene.add(hemiLightHelper);

  //

  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.color.setHSL(0.1, 1, 0.95);
  dirLight.position.set(-1, 1.75, 1);
  dirLight.position.multiplyScalar(30);
  scene.add(dirLight);

  dirLight.castShadow = true;

  dirLight.shadow.mapSize.width = 2048;
  dirLight.shadow.mapSize.height = 2048;

  const d = 50;

  dirLight.shadow.camera.left = -d;
  dirLight.shadow.camera.right = d;
  dirLight.shadow.camera.top = d;
  dirLight.shadow.camera.bottom = -d;

  dirLight.shadow.camera.far = 3500;
  dirLight.shadow.bias = -0.0001;

  const dirLightHelper = new THREE.DirectionalLightHelper(dirLight, 10);
  scene.add(dirLightHelper);

  // GROUND

  const groundGeo = new THREE.PlaneGeometry(10000, 10000);
  const groundMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  groundMat.color.setHSL(0.095, 1, 0.75);

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.position.y = -33;
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // SKYDOME

  const vertexShader = document.getElementById("vertexShader").textContent;
  const fragmentShader = document.getElementById("fragmentShader").textContent;
  const uniforms = {
    topColor: { value: new THREE.Color(0x0077ff) },
    bottomColor: { value: new THREE.Color(0xffffff) },
    offset: { value: 33 },
    exponent: { value: 0.6 },
  };
  uniforms["topColor"].value.copy(hemiLight.color);

  scene.fog.color.copy(uniforms["bottomColor"].value);

  const skyGeo = new THREE.SphereGeometry(4000, 32, 15);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: uniforms,
    vertexShader: vertexShader,
    fragmentShader: fragmentShader,
    side: THREE.BackSide,
  });

  const sky = new THREE.Mesh(skyGeo, skyMat);
  scene.add(sky);

  // MODEL

  const loader = new GLTFLoader();

  let model = null;

  loader.load(
    "/ANIM_Griffon_Fly.glb",
    function (gltf) {
      model = gltf.scene;
      scene.add(model);

      const mesh = gltf.scene.children[0];

      const s = 10;
      mesh.scale.set(s, s, s);
      //   mesh.position.y = -10;
      //   mesh.rotation.y = -1;

      mesh.castShadow = true;
      mesh.receiveShadow = true;

      scene.add(mesh);

      const mixer = new THREE.AnimationMixer(mesh);
      mixer.clipAction(gltf.animations[0]).setDuration(1).play();
      mixers.push(mixer);

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true; // Add damping to smooth the control movement
      controls.dampingFactor = 0.05; // Set the damping factor
      controls.rotateSpeed = 0.5; // Set the rotation speed

      //   function animate() {
      //     requestAnimationFrame(animate);
      //     controls.update();
      //     renderer.render(scene, camera);
      //   }

      //   animate();
      console.log(model);

      if (model) {
        model.moveSpeed = new THREE.Vector3(0, 0, 0);
      }

      function animate() {
        if (model) {
          model.position.x += model.moveSpeed.x;
          model.position.y += model.moveSpeed.y;
          model.position.z += model.moveSpeed.z;
        }

        renderer.render(scene, camera);
      }

      // Change the move speed of the model based on keyboard input
      const moveSpeed = 0.1;
      document.addEventListener("keydown", function (event) {
        if (model) {
          switch (event.code) {
            case "KeyW": // Move forward
              model.moveSpeed.z = -moveSpeed;
              animate();
              break;
            case "KeyS": // Move backward
              model.moveSpeed.z = moveSpeed;
              animate();
              break;
            case "KeyA": // Move left
              model.moveSpeed.x = -moveSpeed;
              animate();
              break;
            case "KeyD": // Move right
              model.moveSpeed.x = moveSpeed;
              animate();
              break;
            case "Space": // Jump
              model.moveSpeed.y = moveSpeed;
              animate();
              break;
          }
        }
      });

      // Stop the model's movement when a key is released
      document.addEventListener("keyup", function (event) {
        if (model) {
          switch (event.code) {
            case "KeyW":
            case "KeyS":
              model.moveSpeed.z = 0;
              animate();
              break;
            case "KeyA":
            case "KeyD":
              model.moveSpeed.x = 0;
              animate();
              break;
            case "Space":
              model.moveSpeed.y = 0;
              animate();
              break;
          }
        }
      });
    },
    undefined,
    function (error) {
      console.error(error);
    }
  );

  // RENDERER

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  container.appendChild(renderer.domElement);
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.shadowMap.enabled = true;

  // STATS

  stats = new Stats();
  container.appendChild(stats.dom);

  //

  const params = {
    toggleHemisphereLight: function () {
      hemiLight.visible = !hemiLight.visible;
      hemiLightHelper.visible = !hemiLightHelper.visible;
    },
    toggleDirectionalLight: function () {
      dirLight.visible = !dirLight.visible;
      dirLightHelper.visible = !dirLightHelper.visible;
    },
  };

  const gui = new GUI();

  gui.add(params, "toggleHemisphereLight").name("toggle hemisphere light");
  gui.add(params, "toggleDirectionalLight").name("toggle directional light");
  gui.open();

  //

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

//

function animate() {
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render() {
  const delta = clock.getDelta();

  for (let i = 0; i < mixers.length; i++) {
    mixers[i].update(delta);
  }

  renderer.render(scene, camera);
}