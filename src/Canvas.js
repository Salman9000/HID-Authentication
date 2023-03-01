
import React, { useRef, useEffect } from 'react'

const Canvas = ({canvasRef, style}) => {
  
  return <canvas ref={canvasRef} style={style} width="640" height="480" />
}

export default Canvas