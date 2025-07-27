"use client"

import type React from "react"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Camera, ImageIcon } from "lucide-react"
import CameraCapture from "@/components/camera-capture"

export default function DebugCamera() {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)

  const handleCameraClick = () => {
    console.log("Camera button clicked")
    setShowCamera(true)
  }
  
  const handleCameraClose = () => {
    console.log("Camera closed")
    setShowCamera(false)
  }
  
  const [capturedMedia, setCapturedMedia] = useState<{file: File, preview: string, type: "image" | "video"} | null>(null)
  
  const handleCameraCapture = (file: File, preview: string, type: "image" | "video") => {
    console.log(`${type === "image" ? "Photo" : "Video"} captured:`, file)
    setCapturedImage(preview)
    setCapturedMedia({file, preview, type})
    setShowCamera(false)
  }

  const handleGalleryClick = () => {
    console.log("Gallery button clicked")
    console.log("File input ref:", fileInputRef.current)

    if (fileInputRef.current) {
      console.log("Triggering file input click")
      fileInputRef.current.click()
    } else {
      console.error("File input ref is null")
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: string) => {
    console.log(`${type} file selected:`, event.target.files?.[0])
    const file = event.target.files?.[0]
    if (file) {
      console.log("File details:", {
        name: file.name,
        size: file.size,
        type: file.type,
      })
      alert(`${type} file selected: ${file.name}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-white text-2xl mb-8">Camera Debug Test</h1>

      <div className="space-y-4 w-full max-w-xs">
        <Button onClick={handleCameraClick} className="w-full bg-blue-500 hover:bg-blue-600 text-white py-4">
          <Camera className="w-5 h-5 mr-2" />
          Test Camera
        </Button>

        <Button onClick={handleGalleryClick} className="w-full bg-green-500 hover:bg-green-600 text-white py-4">
          <ImageIcon className="w-5 h-5 mr-2" />
          Test Gallery
        </Button>
      </div>

      {/* Hidden input for gallery */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        onChange={(e) => handleFileChange(e, "Gallery")}
        style={{ display: "none" }}
      />
      
      {/* Show captured media if available */}
      {capturedMedia && (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2 text-white">
            {capturedMedia.type === "image" ? "Captured Image:" : "Captured Video:"}
          </h3>
          
          {capturedMedia.type === "image" ? (
            <img 
              src={capturedMedia.preview} 
              alt="Captured" 
              className="max-w-full h-auto rounded-lg border border-gray-300" 
            />
          ) : (
            <video 
              src={capturedMedia.preview} 
              controls 
              className="max-w-full h-auto rounded-lg border border-gray-300"
            />
          )}
          
          <div className="mt-2 text-white text-sm">
            <p>File type: {capturedMedia.file.type}</p>
            <p>File size: {Math.round(capturedMedia.file.size / 1024)} KB</p>
          </div>
        </div>
      )}
      
      {/* Camera Component */}
      {showCamera && (
        <CameraCapture 
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
        />
      )}

      <div className="mt-8 text-white text-sm">
        <p>Check browser console for debug logs</p>
        <p>Make sure to allow camera permissions</p>
      </div>
    </div>
  )
}
