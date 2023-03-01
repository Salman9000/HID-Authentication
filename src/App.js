import React, { useEffect, useState, useRef } from "react"
import { FingerprintReader, SampleFormat } from "@digitalpersona/devices"
import Canvas from "./Canvas"
import "./App.css"
import axios from "axios"
import jwt_decode from "jwt-decode"
import HID_LOGO from "./images/HID_logo.png"
import FINGERPRINT from "./images/fingerprint.png"
import FACE from "./images/face.png"
import PASSWORD from "./images/password.png"
import { Buffer } from "buffer"
function App() {
  const faceSDK = window.faceSDK
  const host = "sdk.techinoviq.com"
  const reader = new FingerprintReader()
  const [scanStart, setScanStart] = useState(false)
  const [userName, setUserName] = useState("dinesh@dpdemo.com")
  const [userPassword, setPassword] = useState("")
  const [readerConnected, setreaderConnected] = useState("")
  const [error, setError] = useState("")
  const canvasRef = useRef(null)
  const canvasRef2 = useRef(null)
  const videoRef = useRef(null)
  const [loginType, setType] = useState(1)
  useEffect(() => {
    // (device) => {
    //   reader.onDeviceConnected()
    // }
    getConnectedDevices()
    // checkDeviceStatus()
    setreaderConnected(true)
  }, [])

  const canvas = canvasRef.current
  const canvas2 = canvasRef2.current
  const video = videoRef.current
  useEffect(() => {
    // const canvas = canvasRef.current
    // const context = canvas.getContext('2d')
    //Our first draw
    // context.fillStyle = '#000000'
    // context.fillRect(0, 0, context.canvas.width, context.canvas.height)
  }, [])

  function b64ToB64Url(a) {
    a = a.replace(/\=/g, "")
    a = a.replace(/\+/g, "-")
    a = a.replace(/\//g, "_")
    return a
  }

  function stob64u(str) {
    return b64ToB64Url(Buffer.from(JSON.stringify(str)).toString("base64"))
  }

  const successCallBack = (e) => {
    let authData = []
    e.forEach(function (prefixedBase64) {
      var base64 = prefixedBase64.replace("data:image/jpeg;base64,", "")
      var imageData = {
        Version: 1,
        ImageType: 1, // JPEG_FILE
        //There is no need to encode since it already encoded during conversion to JPEG
        ImageData: base64 // Base64url encoded raw image
      }

      var bioSample = {
        Version: 1,
        Header: {
          Factor: 2, // Facial features
          Format: {
            FormatOwner: 0, // Not used
            FormatID: 0
          },
          Type: 1, // Raw image
          Purpose: 1, // Verification
          Quality: -1,
          Encryption: 0 // Unencrypted
        },
        Data: stob64u(imageData)
      }
      authData.push(bioSample)
    })
    submitFaceData(userName, JSON.stringify(authData))
  }

  const submitFaceData = (userName, faceCred) => {
    submitData(userName, stob64u(faceCred))
  }

  const submitData = async (userName, credentialData, tokenId) => {
    console.log(credentialData)
    try {

      const res = await axios.post("https://webenroll.techinoviq.com/dpenrollment/api/DPWebAUTH/DPWebAuthService.svc/AuthenticateUser", {
        user: {
        name: "dpdemno\\dinesh",
        type: 3,
        isOfficer: false
      },
      credential: {
        id: "85AEAA44-413B-4DC1-AF09-ADE15892730A",
        data: credentialData
      }
    })
    console.log(res)
  } catch(e) {
  console.log(e)
  }
  }
  const errCallBack = (e) => {
    console.log(e)
  }
  const progressCallBack = (e) => {
    console.log(e)
  }

  const stopVideo = () => {
    faceSDK.stopVideo();
  }
  const faceCapture = async () => {
    faceSDK.init(
      video,
      { video: true },
      canvas,
      canvas2,
      1,
      successCallBack,
      errCallBack,
      progressCallBack
    )
  }
  if (canvas) {
    // console.log(canvas.getContext('2d'))
    // faceSDK.capture();
    try {
      // faceSDK.getAvailableDevices().then(data => console.log(data)).catch(e => error)
      // faceSDK.start();
    } catch (e) {
      console.log(e)
    }
    // console.log("ere")
    // faceSDK.start();
  }

  const getConnectedDevices = async () => {
    try {
      const devices = await reader.enumerateDevices()
      console.log(devices, "devices")
      const myDevice = await reader.getDeviceInfo(devices[0])
      console.log(myDevice)
      capture()
      // capture()
    } catch (e) {
      console.log(e)
    }
  }

  function setCookie(name, value, days) {
    var expires = ""
    if (days) {
      var date = new Date()
      date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
      expires = "; expires=" + date.toUTCString()
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/"
  }

  const submitByPassword = (e) => {
    e.preventDefault();
    console.log("sumit")
    setCookie("credentials", userName)
    window.location.replace(
      "http://localhost:9089/BrowserWeb/servlet/BrowserServlet"
    )
  }
  const submit = async (data) => {
    try {
      // const auth = new FingerprintsAuth(authService);
      // console.log(data)
      // const token = await auth.identify(data)

      // console.log(token, "token")
      console.log(JSON.stringify(data), "Asdsa")
      const encodedData = Buffer.from(JSON.stringify(data)).toString("base64")
      console.log(encodedData)
      const res = await axios.post(
        `https://${host}/DPWebAuth/DPWebAuthService.svc/AuthenticateUser`,
        {
          user: {
            name: userName,
            type: 6
          },
          credential: {
            id: "AC184A13-60AB-40e5-A514-E10F777EC2F9",
            data: encodedData
          }
        }
      )
      const token = res.data.AuthenticateUserResult.jwt
      var decoded = jwt_decode(token)
      console.log(decoded)
      setCookie("credentials", userName)
      window.location.replace(
        "http://localhost:9089/BrowserWeb/servlet/BrowserServlet"
      )
      // const token = auth.identify(BioSample[data])
      // console.log(auth.identify(sample))
      // setsamples({ samples: BioSample[data] })
      console.log("fingerprint acquired")
    } catch (error) {
      if (error?.message == "Request failed with status code 404") {
        console.log(error?.response?.data, "asdsa")
        setError(error?.response?.data)
        capture()
      }
      console.log(error, "error")

      // capture();
    }
  }

  const checkDeviceStatus = async () => {
    console.log("here")
    // reader.onDeviceConnected = async (device) => {
    //   // await updateReaderStatus()
    //   console.log("Device is connected")
    //   capture()
    // }
  }

  reader.onDeviceDisconnected = async (device) => {
    await updateReaderStatus()
    console.log("device is diconnected")
  }
  reader.onSamplesAcquired = async (data) => {
    setError("")
    console.log("sampler equried")
    reader.stopAcquisition()
    setScanStart(false)
    submit(data.samples)
  }
  const updateReaderStatus = async () => {
    try {
      const devices = await reader.enumerateDevices()
      setreaderConnected({ readerConnected: devices.length > 0 })
    } catch (err) {
      setreaderConnected({ readerConnected: false })
    }
  }
  const capture = async () => {
    if (userName != "") {
      console.log("start scan")
      setScanStart(true)
      try {
        const res = await reader.startAcquisition(SampleFormat.Intermediate)
        console.log(res, "Res")
      } catch (error) {
        console.log(error)
      }
    } else {
      setError("Please type username")
    }
  }
  return (
    <div className="min-h-screen flex justify-center w-full">
      <div className="p-10 ">
        <img className="w-40 mx-auto" src={HID_LOGO} alt="asd" />
        <div className="text-[#525e66] text-center font-semibold text-xl my-5">
          HID DigitalPersona
        </div>
        <div className="text-[#525e66] text-center text-lg mb-5">
          You are now logging into T24
        </div>
        <div className="mb-4">
          <Canvas canvasRef={canvasRef2} style={loginType == 3 ? {display: 'block'} : {display: "none"}}/>
          {/* display canvas */}
          <Canvas canvasRef={canvasRef} style={{ display: "none" }} />
          <video
            width="640"
            height="480"
            ref={videoRef}
            autoPlay
            style={{ display: "none" }}
          />
        </div>
        {scanStart && loginType == 1 && (
          <div className="text-center p-4 bg-blue-100 border border-blue-300 rounded-lg text-blue-600 mb-5">
            Please scan your fingerprint
          </div>
        )}
        {error ? (
          <>
            <h3>Error</h3>
            <p>Description:</p>
            <p>{error.description}</p>
            <p>Error code:</p>
            <p>{error.error_code}</p>
          </>
        ) : (
          <p></p>
        )}
        <form onSubmit={submitByPassword}>
        <div className="mx-auto flex justify-center mb-10">
          <input
            className="border border-[#ccc] rounded-lg border-l-2 bg-white p-2 w-96 mx-auto"
            placeholder="username@domain.com"
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
        </div>
        {loginType == 2 && (
          <div className="mx-auto flex justify-center mb-10 p-4 bg-[#f9f9f9] border border-gray-200">
            <div>
              <p className="text-blue-500 font-bold text-lg mb-3">
                PASSWORD LOGIN
              </p>
              <input
                className="border border-[#ccc] rounded-lg border-1 bg-white p-2 w-96"
                placeholder="Password"
                type="password"
                value={userPassword}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <input type="submit" hidden />
          </div>
        )}
        </form>
        <div className="flex flex-wrap w-full gap-4 justify-center">
          <div
            onClick={() => {
              setType(1)
              stopVideo()
            }}
            className="bg-white rounded-lg p-4 flex items-center justify-center border-2 border-[#ccc] flex-col shadow-lg hover:bg-gray-200 hover:border-blue-500 hover:border-2 hover:cursor-pointer"
          >
            <img className="w-24 mx-auto" src={FINGERPRINT} alt="asd" />
            <div className="text-center text-blue-600 font-bold text-xs">
              FINGERPRINTS
            </div>
          </div>
          <div
            onClick={() => {
              setType(2)
              stopVideo()
            }}
            className="bg-white rounded-lg p-4 flex items-center justify-center border-2 border-[#ccc] flex-col shadow-lg hover:bg-gray-200 hover:border-blue-500 hover:border-2 hover:cursor-pointer"
          >
            <img className="w-24 mx-auto" src={PASSWORD} alt="asd" />
            <div className="text-center text-blue-600 font-bold text-xs">
              PASSWORD
            </div>
          </div>
          <div
            onClick={() => {
              setType(3)
              stopVideo()
              faceCapture()
            }}
            className="bg-white rounded-lg p-4 flex items-center justify-center border-2 border-[#ccc] flex-col shadow-lg hover:bg-gray-200 hover:border-blue-500 hover:border-2 hover:cursor-pointer"
          >
            <img className="w-24 mx-auto" src={FACE} alt="asd" />
            <div className="text-center text-blue-600 font-bold text-xs">
              FACE
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
