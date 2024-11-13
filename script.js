let video;
let objectDetector;
let objects = [];
let canvasContainer = document.getElementById('canvasContainer');
let overlayCanvas = document.getElementById('overlayCanvas');
let ctx = overlayCanvas.getContext('2d'); // Context for overlay canvas

let objectTimers = {}; // Store timers for each object by their label or id


// Initialize the video and ml5 object detector
function setup() {
    video = document.getElementById('video');
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        video.srcObject = stream;
  
        // Wait for the video to load before initializing object detection
        video.addEventListener('loadeddata', () => {
          objectDetector = ml5.objectDetector('cocossd', modelLoaded);
        });
      })
      .catch(error => console.error('Camera error:', error));

      //Ensure overlayCanvas is always synchronized with video resolution
      video.addEventListener('loadeddata', () => {
        overlayCanvas.width = video.videoWidth;
        overlayCanvas.height = video.videoHeight;
        objectDetector = ml5.objectDetector('cocossd', modelLoaded);
    });
  }

// Run when the model is loaded
function modelLoaded() {
  console.log('Model Loaded!');
  detectObjects();
}

// Detect objects in the video feed
function detectObjects() {
    objectDetector.detect(video, (error, results) => {
      if (error) {
        console.error(error);
        return;
      }
      objects = results;
      drawBoundingBoxes();
      // Run detection continuously
      detectObjects();
    });
  }

  // Draw bounding boxes on the overlay canvas
function drawBoundingBoxes() {
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); // Clear the canvas

  objects.forEach(obj => {
    if (obj.confidence > 0.1) { // Only display confident detections
        ctx.strokeStyle = '#00FF00'; // Green bounding box
        ctx.lineWidth = 2;
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height); // Draw the bounding box

        ctx.fillStyle = '#00FF00';
        ctx.font = '14px Arial';

        // Draw label above the box
        ctx.fillText(
            `${obj.label} (${(obj.confidence * 100).toFixed(1)}%)`,
            obj.x,
            obj.y > 10 ? obj.y - 5 : 10
        );

        // Initialize timer for this object
        if (!objectTimers[obj.label]) {
            objectTimers[obj.label] = { startTime: Date.now(), elapsed: 0 };
        }

        // Calculate elapsed time
        const elapsedTime = Math.floor((Date.now() - objectTimers[obj.label].startTime) / 1000);
        const minutes = Math.floor(elapsedTime / 60);
        const seconds = elapsedTime % 60;

        // Draw counter on the top-right corner of the bounding box
        ctx.fillStyle = '#FF69B4';
        ctx.fillText(
            `${minutes}:${seconds.toString().padStart(2, '0')}`,
            obj.x + obj.width - 25, // Position on top-right corner of the bounding box
            obj.y > 10 ? obj.y - 5 : 10
        );
    }
});

// Clean up timers for disappeared objects
const currentLabels = objects.map(obj => obj.label);
for (let label in objectTimers) {
    if (!currentLabels.includes(label)) {
        delete objectTimers[label];
    }
}

  
}

  document.getElementById('captureBtn').addEventListener('click', () => {
    objects.forEach(obj => {
      if (obj.confidence > 0.2) { // Only capture objects with high confidence
        captureObject(obj);
      }
    });
  });
  
function captureObject(obj) {
    // Create a container div for the object image and label
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = `${obj.y}px`;
    container.style.left = `${obj.x}px`;
  
    // Create a canvas element to capture the object as an image
    const canvas = document.createElement('canvas');
    canvas.width = obj.width;
    canvas.height = obj.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, obj.x, obj.y, obj.width, obj.height, 0, 0, obj.width, obj.height);
  
    // Convert the canvas to an image
    const img = new Image();
    img.src = canvas.toDataURL();
    img.classList.add('movable');
    
    // Create a label element
    const label = document.createElement('div');
    label.innerText = obj.label; // Display object name
    label.classList.add('label'); // Apply custom styles from CSS
    
    // Append the image and label to the container
    container.appendChild(img);
    container.appendChild(label);
  
    // Make the container draggable
    makeDraggable(container);
    
    // Add the container to the canvasContainer div
    canvasContainer.appendChild(container);
  }

// Make images draggable
function makeDraggable(element) {
  element.onmousedown = function(event) {
    event.preventDefault();
    let shiftX = event.clientX - element.getBoundingClientRect().left;
    let shiftY = event.clientY - element.getBoundingClientRect().top;

    function moveAt(pageX, pageY) {
      element.style.left = pageX - shiftX + 'px';
      element.style.top = pageY - shiftY + 'px';
    }

    function onMouseMove(event) {
      moveAt(event.pageX, event.pageY);
    }

    document.addEventListener('mousemove', onMouseMove);

    element.onmouseup = function() {
      document.removeEventListener('mousemove', onMouseMove);
      element.onmouseup = null;
    };
  };
  element.ondragstart = function() {
    return false;
  };
}

setup();
