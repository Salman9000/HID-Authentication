import logo from "./logo.svg"
import React, { useEffect, useState, useRef } from "react"
import { Credential, BioSample } from "@digitalpersona/core"
import { FingerprintsAuth, FaceAuth } from "@digitalpersona/authentication"
import { ServiceError, AuthService } from "@digitalpersona/services"
import {
  FingerprintReader,
  QualityCode,
  ErrorOccurred,
  SampleFormat
} from "@digitalpersona/devices"
import "./App.css"
import axios from 'axios';
import jwt_decode from "jwt-decode";
import Canvas from "./Canvas"
function App() {
  const faceSDK = window.faceSDK;
  const host = "sdk.techinoviq.com"
  const reader = new FingerprintReader()
  const [scanStart, setScanStart] = useState(false);
  const [userName, setUserName] = useState("dinesh@dpdemo.com");
  const [readerConnected, setreaderConnected] = useState("");
  const [error, setError] = useState("");
  const canvasRef = useRef(null)
  const videoRef = useRef(null)
  useEffect(() => {
    // (device) => {
    //   reader.onDeviceConnected()
    // }
    getConnectedDevices()
    // checkDeviceStatus()
    setreaderConnected(true)
    // capture()
  }, [])

  const canvas = canvasRef.current
  const video = videoRef.current
  useEffect(() => {
    // const canvas = canvasRef.current
    // const context = canvas.getContext('2d')

    //Our first draw
    // context.fillStyle = '#000000'
    // context.fillRect(0, 0, context.canvas.width, context.canvas.height)
  }, [])

  const successCallBack = () => {
    console.log("success")
  }
  const errCallBack = (e) => {
      console.log(e)
  }
  const progressCallBack = () => {
      console.log("progress")
  }
if(canvas) {
// console.log(canvas.getContext('2d'))
// faceSDK.capture();
try {
    faceSDK.getAvailableDevices().then(data => console.log(data)).catch(e => error)

    // faceSDK.init(null, null, canvas, canvas, null, successCallBack, errCallBack, progressCallBack);
  } catch (e) {
console.log(e)
  }
  // console.log("ere")
  // faceSDK.start();
}

  const getConnectedDevices = async () => {
    try {      
      const devices = await reader.enumerateDevices()
      console.log(devices)
      const myDevice = await reader.getDeviceInfo(devices[0])
      console.log(myDevice)
      // capture()
    } catch (e) {
      console.log(e)
    }
  }
  
  function setCookie(name,value,days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}
  const submit = async (data) => {
    try {
      // const auth = new FingerprintsAuth(authService);
      // console.log(data)
      // const token = await auth.identify(data)

      // console.log(token, "token")
      console.log(JSON.stringify(data), "Asdsa")
      const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');
      console.log(encodedData)
      const res = await axios.post(`https://${host}/DPWebAuth/DPWebAuthService.svc/AuthenticateUser`, {
        
          user: {
              name: userName,
              type: 6
          },
          credential: {
              id: "AC184A13-60AB-40e5-A514-E10F777EC2F9",
              data: encodedData
          }
      
      })
      const token = res.data.AuthenticateUserResult.jwt
      var decoded = jwt_decode(token);
      console.log(decoded)
      setCookie('credentials', userName)
      window.location.replace("http://localhost:9089/BrowserWeb/servlet/BrowserServlet")
      // const token = auth.identify(BioSample[data])
      // console.log(auth.identify(sample))
      // setsamples({ samples: BioSample[data] })
      console.log("fingerprint acquired")
    } catch (error) {
      if (error?.message == "Request failed with status code 404") {
        console.log(error?.response?.data, "asdsa")
        setError(error?.response?.data)
        capture();
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
    reader.stopAcquisition();
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
    if(userName != "") {
      console.log("start scan")
      setScanStart(true);
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
    <div className="App">
      {/* <form className="enrollement-form" onSubmit={submit}> */}
      <button
        className={"primary btn"}
        style={{ width: "200px", margin: "0 auto", marginBottom: "30px" }}
        onClick={() => capture()}
        type="button"
      >
        Capture Fingerprint
      </button>
      <input type="text" value={userName} onChange={(e) => setUserName(e.target.value)} /> 
      <>
      {scanStart ? <p>Please scan your fingeprint</p> : <></>}
      {error ? 
      <>
      <h3>Error</h3>
      <p>Description:</p>
      <p>{error.description}</p>
      <p>Error code:</p>
      <p>{error.error_code}</p>
      </>
       : <p></p>}
      </>
      <Canvas canvasRef={canvasRef} />
      <video width="320" height="240" ref={videoRef} />
      {/* </form> */}
    </div>
  )
}

export default App
