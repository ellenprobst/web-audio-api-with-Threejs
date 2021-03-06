// Music by The War On Drugs - Thinking Of A Place

var camera, scene, renderer, spotLight, controls;

var loader = new THREE.JSONLoader();
var landscape, planetBig, planetMedium, planetSmall;

var analyser, dataArray;
var audioData = [];
var stream = "./lib/TheWarOnDrugs.m4a";

var particles = [];
var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();
var intersected;
var selectableStars = [];
var currentIndex = 0;
var newIndex;

var colors = [
	["#e9ff00", "#1a1600"],
	["#c32c40", "#16001a"],
	["#06FFC4", "#001a19"],
	["#F69C3F", "#01131E"],
	["#FFFFFF", "#080808"]
];

// init
function init() {
	// scene
	scene = new THREE.Scene();
	scene.fog = new THREE.FogExp2(0x01131e, 0.025);

	// camera
	camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.01, 1000);
	camera.position.set(0.1, -0.14, 0.8);

	// renderer
	renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
	renderer.setSize(window.innerWidth, window.innerHeight);
	renderer.shadowMap.enabled = true;
	renderer.shadowMap.renderReverseSided = false;
	renderer.setClearColor("#01131E");
	document.body.appendChild(renderer.domElement);

	//load external geometry
	loader.load(
		"https://raw.githubusercontent.com/ellenprobst/web-audio-api-with-Threejs/master/lib/landscape.json",
		createLandscape
	);

	// controls
	controls = new THREE.OrbitControls(camera);
	var verticalAngle = controls.getPolarAngle();
	var horizontalAngle = controls.getAzimuthalAngle();

	controls.minPolarAngle = verticalAngle - 0.2;
	controls.maxPolarAngle = verticalAngle + 0.2;
	controls.minAzimuthAngle = horizontalAngle - 0.5;
	controls.maxAzimuthAngle = horizontalAngle + 0.5;

	// LIGHTS
	// add pointlight
	var pointLight = getPointLight(0.66);
	scene.add(pointLight);
	spotLight = getSpotLight(2.66);
	scene.add(spotLight);

	// add hemisphere light
	var hemiLight = new THREE.HemisphereLight("#00C2FF", "#FF9500", 0.4);
	hemiLight.position.set(0, 10, 0);
	scene.add(hemiLight);

	// add directional light
	var dirLight = new THREE.DirectionalLight("#FF5B2C", 1);
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

	// add ellipses
	var ellipses = createEllipses(30);
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

	// PARTICLES
	createParticles(50);

	// AUDIO
	var fftSize = 2048;
	var audioLoader = new THREE.AudioLoader();
	var listener = new THREE.AudioListener();
	var audio = new THREE.Audio(listener);
	audio.crossOrigin = "anonymous";
	audioLoader.load(
		stream,
		function(buffer) {
			audio.setBuffer(buffer);
			audio.setLoop(true);
			audio.play();
		}, // onProgress callback
		function(xhr) {
			var percentage = xhr.loaded / xhr.total * 100;
			var loader = document.getElementById("loader");
			var loadingBar = document.getElementById("percentage");

			if (percentage == 100) {
				setTimeout(function() {
					loadingBar.style.width = "100%";
					loader.style.transform.scale = 0;
					loader.style.opacity = 0;
				}, 1000);
			} else {
				loadingBar.style.width = `${Math.floor(percentage)}%`;
			}
		},

		// onError callback
		function(err) {
			console.log("An error happened");
		}
	);

	analyser = new THREE.AudioAnalyser(audio, fftSize);

	analyser.analyser.maxDecibels = -3;
	analyser.analyser.minDecibels = -100;
	dataArray = analyser.data;
	getAudioData(dataArray);

	// EVENTS
	window.addEventListener("keydown", onKeyDown, false);
	window.addEventListener("resize", onWindowResize, false);
	window.addEventListener("mousemove", onMouseMove, false);
	window.addEventListener("mousedown", onMouseDown, false);
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

// create landscape
function createLandscape(geometry) {
	geometry.computeVertexNormals();
	material = new THREE.MeshPhongMaterial({
		color: "#383948",
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

// create ellipses
function createEllipses(amount) {
	var ellipses = new THREE.Group();
	for (var i = 0; i < amount; i++) {
		var curve = new THREE.EllipseCurve(0, 0, 26, 35, 0, 2 * Math.PI, false, 0);
		var points = curve.getPoints(80);
		var geometry = new THREE.BufferGeometry().setFromPoints(points);

		var material = new THREE.LineBasicMaterial({ fog: false });
		var ellipse = new THREE.Line(geometry, material);

		var color = new THREE.Color().setHSL(21 / 360, 0.17, randBetween(0.1, 0.6));
		ellipse.material.color = color;

		ellipse.scale.x = 1 + i / 100;
		ellipse.scale.y = 0.9 + i / 30;
		ellipse.scale.z = 1 + i / 100;

		ellipses.add(ellipse);
	}

	return ellipses;
}

// create stars
function createStar() {
	var star = new THREE.Group();
	var geometry = new THREE.TetrahedronBufferGeometry(1, 0);
	var material = new THREE.MeshPhongMaterial({ color: "#14ebff", wireframe: false, fog: false, transparent: false });

	var starSideOne = new THREE.Mesh(geometry, material);
	var starSideTwo = new THREE.Mesh(geometry, material);
	starSideOne.castShadow = true;
	starSideTwo.castShadow = true;

	starSideOne.receiveShadow = true;
	starSideTwo.receiveShadow = true;

	starSideTwo.rotation.x = Math.PI / 2;

	star.add(starSideOne);
	star.add(starSideTwo);

	star.rotation.x = 90 * Math.PI / 180;
	star.rotation.y = randBetween(0, 45) * Math.PI / 180;

	star.position.set(randBetween(-4, 4), -0.43, randBetween(-5, -1));

	var color = new THREE.Color().setHSL(21 / 360, 0.17, 1 + Math.sin(new Date().getTime() * 0.0025));

	var tl = new TimelineMax();
	tl.fromTo(
		star.scale,
		1,
		{ y: 0.01, z: 0.01, x: 0.01 },
		{ y: 0.1, z: 0.1, x: 0.1, ease: Elastic.easeIn.config(1, 0.4) }
	);

	star.name = "star";
	scene.add(star);

	selectableStars.push(star);
}

// create particles
function createParticles(amount) {
	for (var i = 0; i < amount; i++) {
		var geometry = new THREE.SphereBufferGeometry(1, 12, 12);
		var material = new THREE.MeshPhongMaterial({ color: "hsl(340, 48%, 54%)", wireframe: true });
		var sphere = new THREE.Mesh(geometry, material);
		sphere.scale.set(0.1, 0.1, 0.1);

		sphere.position.x = randBetween(-6, 6);
		sphere.position.z = randBetween(-10, -4);

		sphere.castShadow = true;
		sphere.receiveShadow = true;

		particles.push(sphere);

		scene.add(sphere);
	}
}

// HELPER
function randBetween(min, max) {
	return Math.random() * (max - min) + min;
}

// EVENTS
//  on mouse down
function onMouseDown(event) {
	event.preventDefault();

	if (intersected) {
		// remove from array
		var index = selectableStars.indexOf(intersected);
		selectableStars.splice(index, 1);

		// animate stars
		var tl = new TimelineMax();
		tl.to(intersected.position, 5, {
			x: randBetween(-300, 300),
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

		if (index % 2 === 0) {
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
					repeatDelay: randBetween(3, 6),
					repeat: -1,
					yoyo: true
				}
			);
		}
	}
}

// on key down
function onKeyDown(event) {
	if (event.keyCode === 67) {
		// c
		var max = colors.length;
		newIndex = currentIndex !== 4 ? currentIndex + 1 : 0;
		currentIndex = newIndex;
		var color = colors[newIndex];

		renderer.setClearColor(color[1]);
		spotLight.color.set(color[0]);
	}
}

//  on mouse move
function onMouseMove(event) {
	event.preventDefault();
	mouse.x = event.clientX / window.innerWidth * 2 - 1;
	mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

	// update the ray with the camera and mouse position
	raycaster.setFromCamera(mouse, camera);

	// calculate objects intersecting the ray
	var intersects = raycaster.intersectObjects(selectableStars, true);

	// change color on hover
	if (intersects.length > 0) {
		for (var i = 0; i < selectableStars.length; i++) {
			if (intersects[0].object.parent === selectableStars[i]) {
				if (intersected) intersected.children.forEach(child => child.material.color.set("#14ebff"));
				intersected = intersects[0].object.parent;

				intersected.children.forEach(child => child.material.color.set("#fff"));
			}
		}
	} else {
		if (intersected) intersected.children.forEach(child => child.material.color.set("#14ebff"));
		intersected = null;
	}
}

// on resize
function onWindowResize() {
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize(window.innerWidth, window.innerHeight);
}

// AUDIO
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

// animate
function animate() {
	// get audio data
	getAudioData(dataArray);

	// animate particles
	particles.forEach((particle, i) => (particle.position.y = audioData[0] / 200 - 0.48));

	// animate planets
	if (audioData[2] >= 1) {
		planetBig.rotation.z += 0.005;
		planetSmall.scale.y = planetSmall.scale.x = planetSmall.scale.z = 5 + audioData[2] / 3;
		planetMedium.scale.y = planetMedium.scale.x = planetMedium.scale.z = 5 + audioData[2] / 3;
	}

	// create stars
	if (audioData[2] >= 10 && selectableStars.length < 100) {
		createStar();
	}

	requestAnimationFrame(animate);
	render();
}

// render
function render() {
	analyser.getFrequencyData();
	renderer.render(scene, camera);
}

init();
animate();
