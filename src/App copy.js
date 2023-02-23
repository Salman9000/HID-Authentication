import logo from "./logo.svg"
import React, { useEffect, useState } from "react"
import { Credential, BioSample } from "@digitalpersona/core"
import { FingerprintsAuth } from "@digitalpersona/authentication"
import { ServiceError, AuthService } from "@digitalpersona/services"
import {
  FingerprintReader,
  QualityCode,
  ErrorOccurred,
  SampleFormat
} from "@digitalpersona/devices"
import "./App.css"

function App() {
  const reader = new FingerprintReader()
  const authService = new AuthService("https://sdk.techinoviq.com/DPWebAUTH/DPWebAuthService.svc");
  let samples = BioSample
  let minSamples = 4
  let minFinger = 1
  let maxFinger = 10
  const [readerConnected, setreaderConnected] = useState(false)
  const [device, setdevice] = useState([])
  const [sample, setsamples] = useState([])
  const [state, setState] = useState({
    step: 0,
    device: []
  })
  useEffect(() => {
    // (device) => {
    //   reader.onDeviceConnected()
    // }
    getConnectedDevices()
    checkDeviceStatus()
    setreaderConnected(true)
  }, [])

  const getConnectedDevices = async () => {
    try {
      const devices = await reader.enumerateDevices()
      console.log(devices)
      const myDevice = await reader.getDeviceInfo(devices[0])
      console.log(myDevice)
    } catch (e) {
      console.log(e)
    }
  }
  const submit = async (data) => {
    try {
      const auth = new FingerprintsAuth(authService);
      console.log(data)
      const token = await auth.identify(data)
      console.log(token, "token")
      console.log(data, "Asdsa")
      // const token = auth.identify(BioSample[data])
      // console.log(auth.identify(sample))
      // setsamples({ samples: BioSample[data] })
      console.log("fingerprint acquired")
    } catch (error) {
      console.log(error)
      console.log("fingerprint not acuired")
    }
  }

  const checkDeviceStatus = async () => {
    console.log("here")
    reader.onDeviceConnected = async (device) => {
      await updateReaderStatus()
      console.log("Device is connected")
    }
  }

  reader.onDeviceDisconnected = async (device) => {
    await updateReaderStatus()
    console.log("device is diconnected")
  }
  reader.onSamplesAcquired = async (data) => {
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
  const capture = function () {
    reader.startAcquisition(SampleFormat.Intermediate)
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
      {/* </form> */}
    </div>
  )
}

export default App
