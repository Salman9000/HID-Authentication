function FaceController($scope, $translate, $timeout) {
    var permissionTimeout;

    $scope.submitFaceData = function (userName, faceCred) {
        // format face credential
        $scope.submitData(userName, stob64u(faceCred));
    };

    $scope.faceErrorMessage = null;
    $scope.facePrompt = "FaceIdentityPrompt";

    $scope.faceCaptureState = {
        started: false,
        userName: null
    };
    $scope.faceCameraInfo = {
        selectedCamera: null,
        cameraList: null
    };

    $scope.restartCapture = function () {
        if (!$scope.faceCaptureState.started) {
            return;
        }
        var userName = $scope.faceCaptureState.userName;
        $scope.stopFaceAuthentication();
        $scope.startFaceAuthentication(userName);
    };

    $scope.getAvailableCameras = function () {
        return faceSDK.getAvailableDevices()
            .then(function (devices) {
                var supportedDevices = devices.filter(function (item) {
                    // TODO: Once there is an API to check the camera band, remove this!
                    if (item.label.includes("HP IR")) return false;
                    return true;
                });
                return supportedDevices;
            })
            .catch(function () {
                return {};
            });
    };

    $scope.startFaceAuthentication = function (userName) {
        if ($scope.faceCaptureState.started) {
            return;
        }

        if (!userName) {
            $scope.facePrompt = "FaceIdentityPrompt";
            return;
        }

        if (!$scope.faceCameraInfo.selectedCamera) {
            $scope.getAvailableCameras().then(function (cameras) {
                if (Array.isArray(cameras) && cameras.length) {
                    var camera = null;
                    var lastCameraId = localStorage.getItem("lastCameraId");
                    if (lastCameraId) {
                        for (var i = 0; i < cameras.length; i++) {
                            if (lastCameraId === cameras[i].deviceId) {
                                camera = cameras[i];
                                break;
                            }
                        }
                    }
                    if (!camera) {
                        camera = cameras[0];
                    }

                    $scope.$apply(function () {
                        $scope.faceCameraInfo.selectedCamera = camera;
                        if (cameras.length > 1 && !$scope.isMobile(true)) {
                            $scope.faceCameraInfo.cameraList = cameras;
                        }
                        $scope.startFaceAuthentication(userName);
                    });
                }
                else {
                    $scope.$apply(function () {
                        $scope.faceErrorMessage = "FaceNoCameraAvailable";
                        $scope.facePrompt = null;
                    });
                }
            });
            return;
        }

        // Delay to prevent flashing of permission message
        permissionTimeout = $timeout(function () {
            $scope.faceErrorMessage = "FaceCameraAccessDenied";
        }, 2000);
        $scope.facePrompt = null;
        $scope.faceCaptureState.started = true;
        $scope.faceCaptureState.userName = userName;

        var videoElement = angular.element('#face_videoPlayer')[0];
        var constraints = {
            video: {
                /* 640x480 gives the best quality score*/
                width: { ideal: 640/*1280*/ },
                height: { ideal: 480/*720*/ }
            }
        };
        if ($scope.faceCameraInfo.selectedCamera && $scope.faceCameraInfo.cameraList) {
            constraints.video.deviceId = { exact: $scope.faceCameraInfo.selectedCamera.deviceId };
        } else {
            constraints.video.facingMode = { ideal: "user" };
        }
        var canvas = angular.element('#face_videoCanvas')[0];
        var detectionCanvas = angular.element('#face_detectionCanvas')[0];

        function successCallback(data) {
            if ($scope.faceCameraInfo.selectedCamera) {
                localStorage.setItem("lastCameraId", $scope.faceCameraInfo.selectedCamera.deviceId);
            }

            var authData = [];

            data.forEach(function (prefixedBase64) {
                var base64 = prefixedBase64.replace("data:image/jpeg;base64,", "");
                var imageData = {
                    Version: 1,
                    ImageType: 1, // JPEG_FILE
                    //There is no need to encode since it already encoded during conversion to JPEG
                    ImageData: base64 // Base64url encoded raw image
                };

                var bioSample = {
                    Version: 1,
                    Header:
                        {
                            Factor: 2, // Facial features
                            Format:
                                {
                                    FormatOwner: 0, // Not used
                                    FormatID: 0
                                },
                            Type: 1, // Raw image
                            Purpose: 1, // Verification
                            Quality: -1,
                            Encryption: 0 // Unencrypted
                        },
                    Data: stob64u(JSON.stringify(imageData)) // Base64url encoded CDPJsonFaceImage object
                };
                authData.push(bioSample);
            });

            $scope.submitFaceData(userName, JSON.stringify(authData));
        }

        function errorCallback(error) {
            $scope.$apply(function () {
                $timeout.cancel(permissionTimeout);
                if (error.name === "NotReadableError" || error.name === 'SourceUnavailableError' || error.name === 'AbortError') {
                    $scope.faceErrorMessage = 'FaceCameraNotReadable';
                }
                else if (error.name === "NotFoundError") {
                    $scope.faceErrorMessage = 'FaceNoCameraAvailable';
                }
                else if (error.name === "OverconstrainedError") {
                    $scope.faceErrormessage = 'FaceCameraConstraintError';
                }
                else {
                    $scope.faceErrorMessage = 'FaceCameraAccessDenied';
                }
                $scope.facePrompt = null;
                $scope.faceCaptureState.started = false;
                $scope.faceCaptureState.userName = null;
            });
        }

        function progressCallback(progress) {
            $scope.$apply(function () {
                switch (progress.code) {
                    case 1:
                        $scope.faceErrorMessage = null;
                        $scope.facePrompt = "FaceGenericPrompt";
                        break;
                    case 2:
                        $scope.faceErrorMessage = 'FaceTooSmall';
                        $scope.facePrompt = null;
                        break;
                    case 3:
                        $scope.faceErrorMessage = 'FaceTooBig';
                        $scope.facePrompt = null;
                        break;
                    case 4:
                        $timeout.cancel(permissionTimeout);
                        $scope.hasPermission = true;
                        if ($scope.faceCameraInfo.selectedCamera && !$scope.faceCameraInfo.selectedCamera.label) {
                            $scope.getAvailableCameras().then(function (cameras) {
                                if (Array.isArray(cameras) && cameras.length) {
                                    $scope.$apply(function () {
                                        var deviceId = $scope.faceCameraInfo.selectedCamera.deviceId;
                                        if (cameras.length > 1 && !$scope.isMobile(true)) {
                                            $scope.faceCameraInfo.cameraList = cameras;
                                        }
                                        for (var i = 0; i < cameras.length; i++) {
                                            if (cameras[i].deviceId === deviceId) {
                                                $scope.faceCameraInfo.selectedCamera = cameras[i];
                                                break;
                                            }
                                        }
                                    });
                                }
                            });
                        }
                        break;
                    case 6:
                        $scope.faceErrorMessage = "FaceNoFaceDetected";
                        $scope.facePrompt = null;
                        break;
                    case 7:
                        $scope.faceErrorMessage = "FaceMultipleFacesDetected";
                        $scope.facePrompt = null;
                        break;
                    case 8:
                        $scope.stopFaceAuthentication();
                        $scope.faceErrorMessage = "FaceCameraNotReadable";
                        break;
                }
            });
        }

        var imageCount = 3;
        faceSDK.init(videoElement, constraints, canvas, detectionCanvas, imageCount, successCallback, errorCallback, progressCallback);
    };

    $scope.stopFaceAuthentication = function () {
        if (!$scope.faceCaptureState.started) {
            return;
        }

        faceSDK.stopVideo();
        $scope.facePrompt = null;
        $scope.faceCaptureState.started = false;
        $scope.faceCaptureState.userName = null;
    };

    $scope.initializePlugin(function (/*e*/) {
        console.log("face_form.set_active");
        beginMonitoringFields("face_username", null);
        $('#face_tab_button').trigger('click');
    }, function (/*e*/) {
        console.log("face_form.kill_active");
        $scope.stopFaceAuthentication();
    });
}