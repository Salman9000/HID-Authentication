"use strict";
// useful articles
// MDN documentation
// http://tangiblejs.com/posts/viewing-webcam-feeds-and-grabbing-still-frames-in-a-modern-way

// face detection
// https://wesbos.com/html5-video-face-detection-canvas-javascript/
// https://github.com/wesbos/HTML5-Face-Detection

// TODO: Current changes are to local version of SDK. Need to move to real version after Face prototype approved
var faceSDK = faceSDK || {};
var vm;
var circle = Math.PI * 2;
var quarter = Math.PI / 2;
var alphaDelta = 0.025;
var alphaMax = 0.7;
var percentDelta = 0.02;
var minFaceSize = 150;
var maxFaceSize = 300;
var states = {
    ok: {
        code: 1,
        message: "Face detection ok"
    },
    tooSmall: {
        code: 2,
        message: "Face too far"
    },
    tooBig: {
        code: 3,
        message: "Face too close"
    },
    havePermission: {
        code: 4,
        message: "Camera permission ok"
    },
    noFace: {
        code: 6,
        message: "No face detected"
    },
    multiFace: {
        code: 7,
        message: "Multiple face detected"
    },
    inactive: {
        code: 8,
        message: "Media stream not active"
    }
};
var lastCameraId = null;

// initialize the video element, constraints and the canvas element which we will use for displaying video and capturing image
faceSDK.init = function(videoElement, constraints, canvas, displayCanvas, imageCount, successCallback, errorCallback, progressCallback) {
    console.log(canvas.getContext('2d'))
    vm = this;
    vm.videoElement = videoElement;
    vm.constraints = constraints;
    vm.canvas = canvas;
    console.log(vm.canvas, " asd")
    vm.displayCanvas = displayCanvas;
    // Clearing canvas Bug 60144 VYI authentication window shows previously authenticated FACE before authenticating current user face
    var displayContext = vm.displayCanvas.getContext('2d');
    displayContext.clearRect(0, 0, vm.displayCanvas.width, vm.displayCanvas.height);
    vm.successCB = successCallback;
    vm.errorCB = errorCallback;
    vm.progressCB = progressCallback;
    vm.started = false;
    vm.completed = false;
    vm.totalImageCount = imageCount;
    vm.images = [];
    vm.captured = false;
    vm.globalAlpha = 0;
    vm.currentPercent = 0;
    vm.setupFaceDetection();
    vm.capture = this.capture.bind(this);
    vm.stopVideo = this.stopVideo.bind(this);
    vm.start();
    vm.setContext();
};

// this will start and ask user permission for accessing webcam.
faceSDK.start = function() {
    console.log(2, "@")
    var constraints = { video: true };
    navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            console.log(stream, "Stream")
            vm.started = true;
            vm.progressCB(states.havePermission);
            vm.stream = stream;
            vm.videoElement.srcObject = stream;
            var tracks = stream.getTracks();
            lastCameraId = tracks[0].getSettings().deviceId;
            setCapturedTimeout();
            vm.runTheLoop();
        })
        .catch(function(error) {
            vm.errorCB({
                code: error.code,
                message: error.message,
                name: error.name
            });
        });
};

// this will just set the context we need for capturing image.
faceSDK.setContext = function() {
    console.log(vm.canvas, " AAAAAAA")
    vm.context = vm.canvas.getContext('2d');
    if(vm.displayCanvas) {
        vm.displayContext = vm.displayCanvas.getContext('2d');
    }
};

// this will capture the image and set it in the context.
faceSDK.capture = function() {
    vm.context.drawImage(vm.videoElement, 0, 0, vm.canvas.width, vm.canvas.height);
};

// this will start capturing the video and we can use it later for further processing
// we can set the timeout to 0 ms for live feed processing.
// this is the only way for now.
faceSDK.captureFeed = function() {
    vm.interval = setInterval(function() { vm.capture(); }, 100);
};

// this will stop the feed.
faceSDK.stopFeed = function() {
    clearInterval(vm.interval);
};

// this will return the base64 of the image, which we can use for further processing/ending to server.
faceSDK.getImageBase64 = function() {
    return vm.canvas.toDataURL("image/jpeg", 1.0);
};

// this will stop all the feed and video will stop streaming.
faceSDK.stopVideo = function() {
    if(vm && vm.videoElement.srcObject) {
        vm.started = false;
        vm.videoElement.srcObject.getVideoTracks().forEach(function(track) {
            track.stop();
        });
    }
};

// this will fetch list of all the video devices existing in users system (provided by browser)
faceSDK.getAvailableDevices = function() {
    return navigator.mediaDevices.enumerateDevices()
        .then(function(devices) {
            console.log(devices, "Devvices")
            var videoDevices = devices.filter(function(item) {
                return item.kind === "videoinput";
            });
            return videoDevices;
        })
        .catch(function(error) {
            return error
        });
    // if we need to use a specific device, use this in constraints where id is the actual deviceId.
    // video: { deviceId: { exact: id} }
};

faceSDK.setupFaceDetection = function() {
    console.log("isnide faceDetction")
    vm.facefinder_classify_region = function (r, c, s, pixels, ldim) { return -1.0; };
    vm.update_memory = pico.instantiate_detection_memory(5); // Combine detection from last X frames
    // Host facefinder locally now
    vm.cascadeurl = 'https://raw.githubusercontent.com/nenadmarkus/pico/c2e81f9d23cc11d1a612fd21e4f9de0921a5d0d9/rnt/cascades/facefinder';
    console.log(vm.cascadeurl, "cascade url")
    console.log(vm, "vm")
    // vm.cascadeurl = 'websdk/facefinder.txt';
    fetch(vm.cascadeurl).then(function (response) {
        response.arrayBuffer().then(function (buffer) {
            var bytes = new Int8Array(buffer);
            vm.facefinder_classify_region = pico.unpack_cascade(bytes);
            console.log('* facefinder loaded');
        });
    });
};

faceSDK.detectFace = function () {
    // console.log("detect face")
    if (!vm.stream || !vm.stream.active) {
        vm.progressCB(states.inactive);
        setErrorTimeout();
        return;
    }
    var imageWidth = vm.canvas.width;
    var imageHeight = vm.canvas.height;
    var canvasWidthOffset = 0;
    var canvasHeightOffset = 0;
    var widthOffset = 0;
    var heightOffset = 0;
    // Center image if camera resolution smaller or bigger
    if(vm.videoElement.videoWidth < vm.canvas.width) {
        imageWidth = vm.videoElement.videoWidth;
        canvasWidthOffset = (vm.canvas.width - vm.videoElement.videoWidth) / 2;
    }
    else if(vm.videoElement.videoWidth > vm.canvas.width) {
        widthOffset = (vm.videoElement.videoWidth - vm.canvas.width) / 2;
    }
    if(vm.videoElement.videoHeight < vm.canvas.height) {
        imageHeight = vm.videoElement.videoHeight;
        canvasHeightOffset = (vm.canvas.height - vm.videoElement.videoHeight) / 2;
    }
    else if(vm.videoElement.videoHeight > vm.canvas.height) {
        heightOffset = (vm.videoElement.videoHeight - vm.canvas.height) / 2;
    }
    if(!imageWidth || !imageHeight) {
        return;
    }
    vm.context.drawImage(vm.videoElement, widthOffset, heightOffset, imageWidth, imageHeight, canvasWidthOffset, canvasHeightOffset, imageWidth, imageHeight);
    if(vm.displayContext) {
        vm.displayContext.drawImage(vm.videoElement, widthOffset, heightOffset, imageWidth, imageHeight, canvasWidthOffset, canvasHeightOffset, imageWidth, imageHeight);
    }
    var rgba = vm.context.getImageData(0, 0, vm.canvas.width, vm.canvas.height).data;
    // prepare input to `run_cascade`
    var image = {
        "pixels": rgba_to_grayscale(rgba, vm.canvas.height, vm.canvas.width),
        "nrows": vm.canvas.height,
        "ncols": vm.canvas.width,
        "ldim": vm.canvas.width
    };
    var params = {
        "shiftfactor": 0.1, // move the detection window by 10% of its size
        "minsize": 60,      // minimum size of a face (impacts performance, smaller means more processing)
        "maxsize": 1000,    // maximum size of a face
        "scalefactor": 1.1  // for multiscale processing: resize the detection window by 10% when moving to the higher scale
    };
    // run the cascade over the image
    // dets is an array that contains (r, c, s, q) quadruplets
    // (representing row, column, scale and detection score)
    var dets = pico.run_cascade(image, vm.facefinder_classify_region, params);
    // Combine detections from several frames to increase confidence a face is present
    dets = vm.update_memory(dets);
    // cluster the obtained detections
    dets = pico.cluster_detections(dets, 0.2); // set IoU threshold to 0.2
    var qthresh = 100.0;
    var mask = document.createElement('canvas');
    mask.width = vm.canvas.width;
    mask.height = vm.canvas.height;
    var maskContext = mask.getContext('2d');
    // this constant is empirical: other cascades might require a different one
    var detectedFaces = dets.filter(function(det) {
        return det[3] > qthresh;
    });
    var processfn = function(video, dt) {
        // render the video frame to the canvas element and extract RGBA pixel data
        vm.displayContext.drawImage(video, 0, 0);
        var rgba = vm.displayContext.getImageData(0, 0, 640, 480).data;
        // prepare input to `run_cascade`
        image = {
            "pixels": rgba_to_grayscale(rgba, 480, 640),
            "nrows": 480,
            "ncols": 640,
            "ldim": 640
        }
        params = {
            "shiftfactor": 0.1, // move the detection window by 10% of its size
            "minsize": 100,     // minimum size of a face
            "maxsize": 1000,    // maximum size of a face
            "scalefactor": 1.1  // for multiscale processing: resize the detection window by 10% when moving to the higher scale
        }
        // run the cascade over the frame and cluster the obtained detections
        // dets is an array that contains (r, c, s, q) quadruplets
        // (representing row, column, scale and detection score)
        dets = pico.run_cascade(image, vm.facefinder_classify_region, params);
        dets = vm.update_memory(dets);
        dets = pico.cluster_detections(dets, 0.2); // set IoU threshold to 0.2
        // draw detections
        for(i=0; i<dets.length; ++i)
            // check the detection score
            // if it's above the threshold, draw it
            // (the constant 50.0 is empirical: other cascades might require a different one)
            if(dets[i][3]>50.0)
            {
                var r, c, s;
                //
                vm.displayContext.beginPath();
                vm.displayContext.arc(dets[i][1], dets[i][0], dets[i][2]/2, 0, 2*Math.PI, false);
                vm.displayContext.lineWidth = 3;
                vm.displayContext.strokeStyle = 'red';
                vm.displayContext.stroke();
                //
                // find the eye pupils for each detected face
                // starting regions for localization are initialized based on the face bounding box
                // (parameters are set empirically)
                // first eye
                r = dets[i][0] - 0.075*dets[i][2];
                c = dets[i][1] - 0.175*dets[i][2];
                s = 0.35*dets[i][2];
            }
    }
    var mycamvas = new camvas(vm.displayContext, processfn);
    // If progress at 100% we are done
    if(vm.completed && vm.currentPercent >= 1) {
        vm.stopVideo();
        vm.successCB(vm.images);
    }
    // Increase progress bar
    if(vm.currentPercent < (vm.images.length / vm.totalImageCount)) {
        vm.currentPercent += percentDelta;
    }
    if(detectedFaces.length > 0) {
        console.log("found faces")
        // Found faces
        var multipleFaces = detectedFaces.length > 1;
        var incorrectSize = false;
        // Set state (ex. multiface, too small, too big)
        if(multipleFaces) {
            vm.progressCB(states.multiFace);
            setErrorTimeout();
        }
        else {
            var faceSize = detectedFaces[0][2];
            if(faceSize < minFaceSize) {
                incorrectSize = true;
                vm.progressCB(states.tooSmall);
                setErrorTimeout();
            }
            else if(faceSize > maxFaceSize) {
                incorrectSize = true;
                vm.progressCB(states.tooBig);
                setErrorTimeout();
            }
            else {
                vm.progressCB(states.ok);
            }
        }
        // Transparent background
        multipleFaces ? decreaseAlpha() : increaseAlpha();
        maskContext.globalAlpha = vm.globalAlpha;
        maskContext.fillStyle = "#000000";
        maskContext.fillRect(0, 0, vm.displayCanvas.width, vm.displayCanvas.height);
        console.log("BHAI")
        for (var i = 0; i < detectedFaces.length; ++i) {
            if(vm.displayContext) {
                var radius = detectedFaces[i][2] / 2;
                var halfCircleDashCount = 15;
                if(!multipleFaces) {
                    // Transparent inner circle for detected face
                    maskContext.globalCompositeOperation = 'destination-out';
                    maskContext.arc(detectedFaces[i][1], detectedFaces[i][0], radius * 1.5, -quarter, -quarter + circle, false);
                    maskContext.fill();
                }
                // Reset composition and alpha for circle
                maskContext.globalCompositeOperation = 'source-over';
                maskContext.globalAlpha = 1.0;
                // Dashed circle / error circle
                maskContext.beginPath();
                maskContext.arc(detectedFaces[i][1], detectedFaces[i][0], radius * 1.75, -quarter, -quarter + circle, false);
                maskContext.lineWidth = 25;
                maskContext.setLineDash([radius * 1.75 * quarter / halfCircleDashCount]);
                maskContext.strokeStyle = (multipleFaces || incorrectSize) ? '#d31d20' : '#d3d3d3';
                maskContext.stroke();
                if(!(multipleFaces || incorrectSize)) {
                    // Draw progress circle
                    maskContext.beginPath();
                    maskContext.arc(detectedFaces[i][1], detectedFaces[i][0], radius * 1.75, -quarter, -quarter + (circle * vm.currentPercent), false);
                    maskContext.lineWidth = 25;
                    maskContext.setLineDash([radius * 1.75 * quarter / halfCircleDashCount]);
                    maskContext.strokeStyle = '#337ab7';
                    maskContext.stroke();
                }
            }
        }
        // Draw mask on canvas
        vm.displayContext.drawImage(mask, 0, 0);
        console.log("draw")
        // Save image if only one face detected
        if(!(multipleFaces || incorrectSize) && !vm.captured) {
            vm.saveImage(vm.getImageBase64());
            setCapturedTimeout();
        }
    }
    else {
        console.log("no face")
        // No face found
        vm.progressCB(states.noFace);
        setErrorTimeout();
        if(vm.displayContext) {
            decreaseAlpha();
            maskContext.globalAlpha = vm.globalAlpha;
            maskContext.fillStyle = "#000000";
            maskContext.fillRect(0, 0, vm.displayCanvas.width, vm.displayCanvas.height);
            vm.displayContext.drawImage(mask, 0, 0);
        }
    }
};

faceSDK.runTheLoop = function() {
    var loop = function () {
        if(!vm.started) {
            return;
        }
        vm.detectFace();
        requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
};

faceSDK.saveImage = function(image) {
    console.log(image, "image")
    if(vm.images.length < vm.totalImageCount) {
        vm.images.push(image);
    }
    if(vm.images.length === vm.totalImageCount && !vm.completed) {
        vm.completed = true;
    }
};

faceSDK.getLastCameraId = function() {
    return lastCameraId;
};

function rgba_to_grayscale(rgba, nrows, ncols) {
    var gray = new Uint8Array(nrows * ncols);
    for (var r = 0; r < nrows; ++r) {
        for (var c = 0; c < ncols; ++c) {
            // gray = 0.2*red + 0.7*green + 0.1*blue
            gray[r * ncols + c] = (2 * rgba[r * 4 * ncols + 4 * c] + 7 * rgba[r * 4 * ncols + 4 * c + 1] + 1 * rgba[r * 4 * ncols + 4 * c + 2]) / 10;
        }
    }
    return gray;
}

function increaseAlpha() {
    if (vm.globalAlpha < alphaMax) {
        vm.globalAlpha = vm.globalAlpha + alphaDelta;
    }
}

function decreaseAlpha() {
    if (vm.globalAlpha > 0) {
        vm.globalAlpha = vm.globalAlpha - alphaDelta;
    }
    if (vm.globalAlpha < 0) {
        vm.globalAlpha = 0;
    }
}

function setCapturedTimeout() {
    vm.captured = true;
    vm.timeout = setTimeout(function () {
        vm.captured = false;
    }, 500);
}

function setErrorTimeout() {
    vm.captured = true;
    clearTimeout(vm.timeout);
    vm.timeout = setTimeout(function() {
        vm.captured = false;
    }, 2000);
}