var camera, scene, renderer, dirLight, dirLightHeper, hemiLight, hemiLightHelper, spotLight, controls;
var gui = new dat.GUI();
var loader = new THREE.JSONLoader();
var landscape, planetBig, planetMedium, planetSmall;
var analyser, dataArray;
var audioData = [];
var particles = [];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var intersected;
var selectableStars = [];
let currentIndex = 0;
let newIndex;
// #2e0a1e
var stream = "./lib/ThinkingOfAPlace.mp3";
var colors = [
	["#e9ff00", "#1a1600"],
	["#c32c40", "#16001a"],
	["#06FFC4", "#001a19"],
	["#F69C3F", "#01131E"],
	["#FFFFFF", "#080808"]
];

// init
function init() {
	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(0x01131e, 0.025);
	//gui.add(scene.fog, "density", 0.00025, 1);

	camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 1000);
	camera.position.set(0.1, -0.14, 0.8);

	// var camZPosition = new THREE.Group();
	// var camXRotation = new THREE.Group();
	// var camYRotation = new THREE.Group();
	// camZPosition.add(camera);
	// camXRotation.add(camZPosition);
	// camYRotation.add(camXRotation);
	// scene.add(camYRotation);
	// gui.add(camZPosition.position, "z", -50, 100);
	// gui.add(camYRotation.rotation, "y", -Math.PI, Math.PI);
	// gui.add(camXRotation.rotation, "x", -Math.PI, Math.PI);
	// console.log(camera.position);

	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.renderReverseSided = false;
	renderer.setClearColor("#01131E");
	document.body.appendChild(renderer.domElement);

	//load external geometry
	loader.load("./lib/landscape.json", createLandscape);

	controls = new THREE.OrbitControls(camera);
	const verticalAngle = controls.getPolarAngle();
	const horizontalAngle = controls.getAzimuthalAngle();

	controls.minPolarAngle = verticalAngle - 0.2;
	controls.maxPolarAngle = verticalAngle + 0.2;
	controls.minAzimuthAngle = horizontalAngle - 0.5;
	controls.maxAzimuthAngle = horizontalAngle + 0.5;

	// LIGHTS
	var pointLight = getPointLight(0.66);
	scene.add(pointLight);
	spotLight = getSpotLight(2.66);
	scene.add(spotLight);

	hemiLight = new THREE.HemisphereLight("#00C2FF", "#FF9500", 0.4);
	hemiLight.position.set(0, 10, 0);

	scene.add(hemiLight);

	dirLight = new THREE.DirectionalLight("#FF5B2C", 1);
	dirLight.position.set(5, 8.22, -3.68);
	scene.add(dirLight);

	dirLight.castShadow = true;
	dirLight.shadow.mapSize.width = 2048;
	dirLight.shadow.mapSize.height = 2048;
	dirLight.shadow.camera.near = 0.5;
	dirLight.shadow.camera.far = 500;
	dirLight.shadow.camera.left = -10;
	dirLight.shadow.camera.right = 10;

	// PLANETS
	// add big planet
	planetBig = createPlanet(25);

	planetBig.position.z = -180;
	planetBig.position.x = -150;
	planetBig.position.y = 40;

	planetBig.rotateAt = 0.2;
	planetBig.scale.set(1.5, 1.5, 1.5);

	planetBig.rotation.z = Math.PI / 2;
	planetBig.rotation.y = 0.3;
	planetBig.rotation.x = 1.5;

	scene.add(planetBig);

	// Create the ellipses
	const ellipses = createEllipses(30);
	planetBig.add(ellipses);

	// add medium planet
	planetMedium = createPlanet();

	planetMedium.position.z = -100;
	planetMedium.position.x = 40;
	planetMedium.position.y = 30;

	planetMedium.scale.set(5.5, 5.5, 5.5);

	scene.add(planetMedium);

	// add small planet
	planetSmall = createPlanet();

	planetSmall.position.z = -160;
	planetSmall.position.x = 20;
	planetSmall.position.y = 70;

	planetSmall.scale.set(5, 5, 5);

	scene.add(planetSmall);

	// audio
	var fftSize = 2048;
	var audioLoader = new THREE.AudioLoader();
	var listener = new THREE.AudioListener();
	var audio = new THREE.Audio(listener);
	audioLoader.load(
		stream,
		function(buffer) {
			audio.setBuffer(buffer);
			audio.setLoop(true);
			audio.play();
		},
		function(xhr) {
			// onProgress callback
			console.log(xhr.loaded / xhr.total * 100 + "% loaded");
		},

		// onError callback
		function(err) {
			console.error("An error happened");
		}
	);

	analyser = new THREE.AudioAnalyser(audio, fftSize);

	analyser.analyser.maxDecibels = -3;
	analyser.analyser.minDecibels = -100;
	dataArray = analyser.data;
	getAudioData(dataArray);

	// particles
	createParticles(50);

	// EVENTS
	window.addEventListener("keydown", onKeyDown, false);
	window.addEventListener("resize", onWindowResize, false);
	window.addEventListener("mousemove", onMouseMove, false);
	window.addEventListener("mousedown", onMouseDown, false);

	controls.update();
}

function createEllipses(amount) {
	const ellipses = new THREE.Group();
	for (let i = 0; i < amount; i++) {
		var curve = new THREE.EllipseCurve(0, 0, 26, 35, 0, 2 * Math.PI, false, 0);
		var points = curve.getPoints(80);
		var geometry = new THREE.BufferGeometry().setFromPoints(points);

		var material = new THREE.LineBasicMaterial({ fog: false });
		var ellipse = new THREE.Line(geometry, material);

		let color = new THREE.Color().setHSL(21 / 360, 0.17, randBetween(0.1, 0.6));
		ellipse.material.color = color;

		ellipse.scale.x = 1 + i / 100;
		ellipse.scale.y = 0.9 + i / 30;
		ellipse.scale.z = 1 + i / 100;

		ellipses.add(ellipse);
	}

	return ellipses;
}

function createStar() {
	const star = new THREE.Group();
	const geometry = new THREE.TetrahedronBufferGeometry(1, 0);
	const material = new THREE.MeshPhongMaterial({ color: "yellow", wireframe: false, fog: false, transparent: false });

	const starSideOne = new THREE.Mesh(geometry, material);
	const starSideTwo = new THREE.Mesh(geometry, material);
	starSideOne.castShadow = true;
	starSideTwo.castShadow = true;

	starSideOne.receiveShadow = true;
	starSideTwo.receiveShadow = true;

	starSideTwo.rotation.x = Math.PI / 2;

	star.add(starSideOne);
	star.add(starSideTwo);

	star.rotation.x = 90 * Math.PI / 180;
	star.rotation.y = randBetween(0, 45) * Math.PI / 180;

	star.scale.set(0.1, 0.1, 0.1);
	star.position.set(randBetween(-5, 5), -0.43, randBetween(-8, -1));

	let color = new THREE.Color().setHSL(21 / 360, 0.17, 1 + Math.sin(new Date().getTime() * 0.0025));
	var targetColor = new THREE.Color(0xe200ff);

	// TweenMax.to(object.material.color, 2, {
	// 	r: targetColor.r,
	// 	g: targetColor.g,
	// 	b: targetColor.b
	// });
	const tl = new TimelineMax();
	// star.children.forEach(child => {
	// 	tl.to(child.material.color, 1, {
	// 		r: targetColor.r,
	// 		g: targetColor.g,
	// 		b: targetColor.b,
	// 		repeatDelay: randBetween(3, 15),
	// 		repeat: -1,
	// 		yoyo: true
	// 	});
	// });
	//console.log(color);
	star.name = "star";
	scene.add(star);

	selectableStars.push(star);
}

function onMouseDown(event) {
	event.preventDefault();

	if (intersected) {
		// remove from array
		const index = selectableStars.indexOf(intersected);
		selectableStars.splice(index, 1);

		// animation
		const tl = new TimelineMax();
		tl.to(intersected.position, 5, {
			x: randBetween(-200, 200),
			y: randBetween(2, 200),
			z: randBetween(-200, -400),
			ease: Back.easeOut.config(0.3)
		});
		tl.to(intersected.scale, 5, {
			y: 0.8,
			z: 0.8,
			x: 0.8,
			ease: Elastic.easeIn.config(1, 0.3)
		});

		if (index % 3 === 0) {
			console.log("yep");
			tl.fromTo(
				intersected.scale,
				5,
				{
					y: 0.3,
					z: 0.3,
					x: 0.3
				},
				{
					y: 1,
					z: 1,
					x: 1,
					ease: Elastic.easeIn.config(1, 0.3),
					repeatDelay: randBetween(3, 8),
					repeat: -1,
					yoyo: true
				}
			);
		}
	}
}

function onKeyDown(event) {
	switch (event.keyCode) {
		case 67: // c
			const max = colors.length;
			//console.log("before", currentIndex, newIndex);
			newIndex = currentIndex !== 4 ? currentIndex + 1 : 0;
			currentIndex = newIndex;
			const color = colors[newIndex];

			renderer.setClearColor(color[1]);

			spotLight.color.set(color[0]);
			break;

		case 68: // d
			dirLight.visible = !dirLight.visible;
			break;
	}
}

function getAudioData(data) {
	// Split array into 3
	var frequencyArray = splitFrenquencyArray(data, 3);

	// Make average of frenquency array entries
	for (var i = 0; i < frequencyArray.length; i++) {
		var average = 0;

		for (var j = 0; j < frequencyArray[i].length; j++) {
			average += frequencyArray[i][j];
		}
		audioData[i] = average / frequencyArray[i].length;
	}
	return audioData;
}

function splitFrenquencyArray(arr, n) {
	var tab = Object.keys(arr).map(function(key) {
		return arr[key];
	});
	var len = tab.length,
		result = [],
		i = 0;

	while (i < len) {
		var size = Math.ceil((len - i) / n--);
		result.push(tab.slice(i, i + size));
		i += size;
	}

	return result;
}

// create particles
function createParticles(amount) {
	for (var i = 0; i < amount; i++) {
		var geometry = new THREE.SphereBufferGeometry(1, 12, 12);
		var material = new THREE.MeshPhongMaterial({ color: "hsl(340, 48%, 54%)", wireframe: true });
		var sphere = new THREE.Mesh(geometry, material);
		sphere.scale.set(0.1, 0.1, 0.1);

		sphere.position.x = randBetween(-5, 5);
		sphere.position.z = randBetween(-10, -4);

		sphere.castShadow = true;
		sphere.receiveShadow = true;

		particles.push(sphere);

		scene.add(sphere);
	}
}

function randBetween(min, max) {
	return Math.random() * (max - min) + min;
}

// create landscape
function createLandscape(geometry) {
	geometry.computeVertexNormals();
	material = new THREE.MeshPhongMaterial({
		color: "#383948",
		//color: "darksalmon",
		emissive: "#0D0D0D",
		specular: "#21141C",
		shininess: 6.84,
		side: THREE.DoubleSide,
		wireframe: false
	});

	landscape = new THREE.Mesh(geometry, material);

	landscape.position.y = -0.5;
	landscape.position.z = -4.79;

	landscape.castShadow = true;
	landscape.receiveShadow = true;

	scene.add(landscape);
}

// create pointlight
function getPointLight(intensity) {
	var light = new THREE.PointLight("#06FFC4", intensity);
	light.position.x = -33;
	light.position.y = 22;
	light.position.z = -40;

	return light;
}

// create spotlight
function getSpotLight(intensity) {
	var light = new THREE.SpotLight("#F69C3F", intensity);
	light.position.x = 104;
	light.position.y = 50;
	light.position.z = -500;

	return light;
}

// create planet
function createPlanet(size) {
	var geometry = new THREE.SphereGeometry(size, 32, 32);
	var material = new THREE.MeshPhongMaterial({
		color: "#3F3D3D",
		emissive: "#05001B",
		specular: "#111111",
		shininess: 10,
		wireframe: false,
		fog: false
	});
	var planet = new THREE.Mesh(geometry, material);

	return planet;
}

// on resize
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

function onMouseMove(event) {
	event.preventDefault();
	mouse.x = event.clientX / window.innerWidth * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	// update the ray with the camera and mouse position
	raycaster.setFromCamera(mouse, camera);

	// calculate objects intersecting the ray
	var intersects = raycaster.intersectObjects(selectableStars, true);

	if (intersects.length > 0) {
		for (var i = 0; i < selectableStars.length; i++) {
			if (intersects[0].object.parent === selectableStars[i]) {
				if (intersected) intersected.children.forEach(child => child.material.color.set("#fff"));
				intersected = intersects[0].object.parent;

				intersected.children.forEach(child => child.material.color.set("hsl(40, 100%, 80%)"));
			}
		}
	} else {
		if (intersected) intersected.children.forEach(child => child.material.color.set("white"));
		intersected = null;
	}
}

// animate
function animate() {
	requestAnimationFrame(animate);
	getAudioData(dataArray);

	particles.forEach((particle, i) => (particle.position.y = audioData[0] / 200 - 0.48));

	if (audioData[2] >= 1) {
		planetBig.rotation.z += 0.005;
		planetSmall.scale.y = planetSmall.scale.x = planetSmall.scale.z = 5 + audioData[2] / 3;
		planetMedium.scale.y = planetMedium.scale.x = planetMedium.scale.z = 5 + audioData[2] / 3;
	}
	//console.log(audioData[2]);
	if (audioData[2] >= 8 && selectableStars.length < 150) {
		createStar();
	}

	controls.update();
	render();
}

// render
function render() {
	analyser.getFrequencyData();
	renderer.render(scene, camera);
}

init();
animate();
