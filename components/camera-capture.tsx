"use client"

import React, { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Camera, X, Check, Video, FlipHorizontal, Pause, Play } from "lucide-react"

interface CameraCaptureProps {
  onCapture: (file: File, preview: string, type: "image" | "video") => void
  onClose: () => void
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordedChunksRef = useRef<Blob[]>([])
  
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isCameraReady, setIsCameraReady] = useState(false)
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [captureMode, setCaptureMode] = useState<"photo" | "video">("photo")
  const [isRecording, setIsRecording] = useState(false)
  const [recordingTime, setRecordingTime] = useState(0)
  const [recordingTimerId, setRecordingTimerId] = useState<NodeJS.Timeout | null>(null)

  useEffect(() => {
    // Function to start the camera
    const startCamera = async () => {
      try {
        // Stop any existing stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop())
        }
        
        // Add a small delay before requesting camera access to ensure previous streams are fully released
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Request camera access with specified facing mode
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { 
            facingMode: facingMode,
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: captureMode === "video", // Enable audio only for video mode
        })
        
        // Set the stream as video source
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream
          setStream(mediaStream)
          setIsCameraReady(true)
          setError(null) // Clear any previous errors
        }
      } catch (err: any) {
        console.error("Error accessing camera:", err)
        
        // Provide more specific error messages based on the error type
        if (err.name === "NotReadableError") {
          setError("कैमरा पहले से उपयोग में है या एक्सेस नहीं किया जा सकता। कृपया अन्य ऐप्स बंद करें जो कैमरा का उपयोग कर रहे हैं।")
        } else if (err.name === "NotAllowedError") {
          setError("कैमरा एक्सेस की अनुमति नहीं दी गई। कृपया ब्राउज़र सेटिंग्स में कैमरा अनुमति दें।")
        } else if (err.name === "NotFoundError") {
          setError("कोई कैमरा डिवाइस नहीं मिला। कृपया सुनिश्चित करें कि आपका डिवाइस कैमरा से लैस है।")
        } else {
          setError(`कैमरा एक्सेस करने में समस्या हुई (${err.name || 'अज्ञात त्रुटि'}): ${err.message || ''}। कृपया पेज को रिफ्रेश करें या अन्य डिवाइस का उपयोग करें।`)
        }
        
        setIsCameraReady(false)
      }
    }

    // Start the camera when component mounts or when facing mode changes
    startCamera()

    // Clean up function to stop the camera when component unmounts
    return () => {
      // Properly stop all media tracks
      if (stream) {
        const tracks = stream.getTracks()
        tracks.forEach(track => {
          try {
            track.stop()
          } catch (err) {
            console.error("Error stopping track:", err)
          }
        })
        
        // Clear video source
        if (videoRef.current && videoRef.current.srcObject) {
          videoRef.current.srcObject = null
        }
        
        setStream(null)
        setIsCameraReady(false)
      }
      
      // Clear recording timer if exists
      if (recordingTimerId) {
        clearInterval(recordingTimerId)
        setRecordingTimerId(null)
      }
      
      // Clear media recorder
      if (mediaRecorderRef.current) {
        try {
          if (mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
          }
        } catch (err) {
          console.error("Error stopping media recorder:", err)
        }
        mediaRecorderRef.current = null
      }
      
      // Clear recorded chunks
      recordedChunksRef.current = []
    }
  }, [facingMode, captureMode])

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw the current video frame to the canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Convert canvas to blob
    canvas.toBlob((blob) => {
      if (blob) {
        // Create a File object from the blob
        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" })
        
        // Get the data URL for preview
        const dataUrl = canvas.toDataURL('image/jpeg')
        
        // Call the onCapture callback with the file and preview URL
        onCapture(file, dataUrl, "image")
      }
    }, 'image/jpeg', 0.95)
  }
  
  const toggleCameraFacing = async () => {
    // First stop the current stream to release the camera
    if (stream) {
      const tracks = stream.getTracks()
      tracks.forEach(track => {
        try {
          track.stop()
        } catch (err) {
          console.error("Error stopping track:", err)
        }
      })
      
      // Clear video source
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null
      }
      
      setStream(null)
      setIsCameraReady(false)
    }
    
    // Add a small delay to ensure camera is released
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Then change the facing mode
    setFacingMode(prev => prev === "user" ? "environment" : "user")
  }
  
  const toggleCaptureMode = async () => {
    // First stop the current stream to release the camera
    if (stream) {
      const tracks = stream.getTracks()
      tracks.forEach(track => {
        try {
          track.stop()
        } catch (err) {
          console.error("Error stopping track:", err)
        }
      })
      
      // Clear video source
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject = null
      }
      
      setStream(null)
      setIsCameraReady(false)
    }
    
    // Add a small delay to ensure camera is released
    await new Promise(resolve => setTimeout(resolve, 300))
    
    // Then change the capture mode
    setCaptureMode(prev => prev === "photo" ? "video" : "photo")
  }
  
  const startVideoRecording = () => {
    if (!stream || !videoRef.current || !isCameraReady) {
      setError("कैमरा तैयार नहीं है। कृपया पेज को रिफ्रेश करें और कैमरा एक्सेस की अनुमति दें।")
      return
    }
    
    // Reset recorded chunks
    recordedChunksRef.current = []
    
    try {
      // Check if the stream has video tracks
      const videoTracks = stream.getVideoTracks()
      if (videoTracks.length === 0) {
        setError("वीडियो ट्रैक उपलब्ध नहीं है। कृपया कैमरा एक्सेस की अनुमति दें।")
        return
      }
      
      // Check if the stream has audio tracks when in video mode
      const audioTracks = stream.getAudioTracks()
      if (audioTracks.length === 0) {
        console.warn("Audio tracks not available. Recording video without audio.")
      }
      
      // Try different MIME types based on browser support
      let mimeType = 'video/webm;codecs=vp9,opus'
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus'
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = 'video/webm'
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = ''
          }
        }
      }
      
      // Create a new MediaRecorder instance
      const mediaRecorder = new MediaRecorder(stream, 
        mimeType ? { mimeType } : undefined
      )
      
      // Store the MediaRecorder reference
      mediaRecorderRef.current = mediaRecorder
      
      // Handle data available event
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data)
        }
      }
      
      // Handle recording stop event
      mediaRecorder.onstop = () => {
        // Check if we have recorded chunks
        if (recordedChunksRef.current.length === 0) {
          setError("रिकॉर्डिंग डेटा प्राप्त नहीं हुआ। कृपया पुनः प्रयास करें।")
          return
        }
        
        try {
          // Create a blob from the recorded chunks
          const blob = new Blob(recordedChunksRef.current, {
            type: mimeType || 'video/webm'
          })
          
          // Create a File object from the blob
          const file = new File([blob], "camera-recording.webm", { type: mimeType || "video/webm" })
          
          // Create a URL for the blob
          const videoUrl = URL.createObjectURL(blob)
          
          // Call the onCapture callback with the file and preview URL
          onCapture(file, videoUrl, "video")
        } catch (blobErr) {
          console.error("Error creating blob from recorded chunks:", blobErr)
          setError("रिकॉर्डिंग को संसाधित करने में समस्या हुई। कृपया पुनः प्रयास करें।")
        }
      }
      
      // Handle recording error
      mediaRecorder.onerror = (event) => {
        console.error("MediaRecorder error:", event)
        setError("रिकॉर्डिंग के दौरान त्रुटि हुई। कृपया पुनः प्रयास करें।")
        stopVideoRecording()
      }
      
      // Start recording
      mediaRecorder.start(100) // Collect data every 100ms
      setIsRecording(true)
      setError(null) // Clear any previous errors
      
      // Start a timer to track recording duration
      setRecordingTime(0)
      const timerId = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      setRecordingTimerId(timerId)
      
    } catch (err) {
      console.error("Error starting video recording:", err)
      setError(`वीडियो रिकॉर्डिंग शुरू करने में समस्या हुई: ${err instanceof Error ? err.message : 'अज्ञात त्रुटि'}।`)
    }
  }
  
  const stopVideoRecording = () => {
    // Check if we're actually recording
    if (!isRecording && (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording')) {
      // Not recording, so just reset states
      setIsRecording(false)
      if (recordingTimerId) {
        clearInterval(recordingTimerId)
        setRecordingTimerId(null)
      }
      return
    }
    
    try {
      // Stop the media recorder if it exists and is recording
      if (mediaRecorderRef.current) {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop()
          console.log("Media recorder stopped successfully")
        } else if (mediaRecorderRef.current.state === 'inactive' && recordedChunksRef.current.length > 0) {
          // If recorder is inactive but we have chunks, try to process them
          console.log("Processing existing chunks as recorder is inactive")
          try {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' })
            const file = new File([blob], "camera-recording.webm", { type: "video/webm" })
            const videoUrl = URL.createObjectURL(blob)
            onCapture(file, videoUrl, "video")
          } catch (blobErr) {
            console.error("Error creating blob from recorded chunks:", blobErr)
            setError("रिकॉर्डिंग को संसाधित करने में समस्या हुई। कृपया पुनः प्रयास करें।")
          }
        } else {
          console.log("Media recorder is in state: " + mediaRecorderRef.current.state)
        }
      } else {
        console.log("No media recorder reference found")
      }
    } catch (err) {
      console.error("Error stopping media recorder:", err)
      setError(`रिकॉर्डिंग बंद करने में समस्या हुई: ${err instanceof Error ? err.message : 'अज्ञात त्रुटि'}।`)
    } finally {
      // Always clear the recording timer
      if (recordingTimerId) {
        clearInterval(recordingTimerId)
        setRecordingTimerId(null)
      }
      
      // Always reset recording state
      setIsRecording(false)
      
      // Don't clear error here as it might contain useful information about why recording stopped
    }
  }
  
  // Format seconds to MM:SS
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div className="relative w-full max-w-md">
        {/* Close button */}
        <Button 
          variant="ghost" 
          className="absolute top-4 right-4 text-white bg-black/50 rounded-full p-2 z-10"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Video preview */}
        {error ? (
          <div className="bg-red-500/20 text-white p-4 rounded-lg text-center">
            <p>{error}</p>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-lg bg-black">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted={captureMode === "photo"} // Only mute in photo mode
              className="w-full h-auto"
              onCanPlay={() => setIsCameraReady(true)}
            />
            <canvas ref={canvasRef} className="hidden" />
            
            {/* Recording indicator */}
            {isRecording && (
              <div className="absolute top-4 left-4 bg-red-500/80 text-white px-3 py-1 rounded-full flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span>{formatTime(recordingTime)}</span>
              </div>
            )}
          </div>
        )}

        {/* Camera controls */}
        <div className="mt-4 flex justify-between items-center px-4">
          {/* Toggle camera mode (photo/video) */}
          <Button 
            onClick={toggleCaptureMode}
            variant="ghost"
            className="text-white bg-white/10 rounded-full p-2"
            disabled={isRecording}
          >
            {captureMode === "photo" ? <Video className="w-6 h-6" /> : <Camera className="w-6 h-6" />}
          </Button>
          
          {/* Main capture button */}
          {captureMode === "photo" ? (
            <Button 
              onClick={capturePhoto}
              disabled={!isCameraReady}
              className="bg-white text-black hover:bg-white/90 rounded-full w-16 h-16 flex items-center justify-center"
            >
              <Camera className="w-8 h-8" />
            </Button>
          ) : (
            <Button 
              onClick={isRecording ? stopVideoRecording : startVideoRecording}
              disabled={!isCameraReady}
              className={`${isRecording ? 'bg-red-500' : 'bg-white'} text-${isRecording ? 'white' : 'black'} hover:bg-${isRecording ? 'red-600' : 'white/90'} rounded-full w-16 h-16 flex items-center justify-center`}
            >
              {isRecording ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
            </Button>
          )}
          
          {/* Toggle camera facing */}
          <Button 
            onClick={toggleCameraFacing}
            variant="ghost"
            className="text-white bg-white/10 rounded-full p-2"
            disabled={isRecording}
          >
            <FlipHorizontal className="w-6 h-6" />
          </Button>
        </div>
      </div>
    </div>
  )
}