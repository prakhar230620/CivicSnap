"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "../components/ui/button"
import { Card } from "../components/ui/card"
import { Textarea } from "../components/ui/textarea"
// Import Badge from shadcn/ui components
import { Badge } from "../components/ui/badge"
import CameraCapture from "../components/camera-capture"
import { useLoadScript, Autocomplete } from "@react-google-maps/api"
import * as Geocode from "react-geocode"
import {
  AlertTriangle,
  Camera,
  ImageIcon,
  Video,
  MapPin,
  Send,
  Loader2,
  CheckCircle,
  Navigation,
  Twitter,
  Copy,
  X,
  RotateCcw,
  Play,
  Pause,
  Shield,
  Zap,
  Globe,
  ExternalLink,
  AlertCircle,
  Search,
} from "lucide-react"
// Import cn utility from clsx/tailwind-merge directly if @/lib/utils is not available
import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

// Create the cn utility function inline
const cn = (...inputs: any[]) => {
  return twMerge(clsx(inputs))
}

interface AIResponse {
  detected_issue: string
  location_detected: string
  responsible_authority: string
  twitter_handles: string[]
  hashtags: string[]
  final_tweet: string
  error?: string
}

interface TwitterResponse {
  success: boolean
  tweet_url?: string
  error?: string
}

type MediaType = "image" | "video"

// Custom error message component for better UX
const ErrorMessage = ({ message, onRetry, onManual }: { message: string; onRetry?: () => void; onManual?: () => void }) => (
  <div className="bg-red-500/20 border border-red-500/30 rounded-md p-3 mb-4">
    <div className="flex items-start">
      <AlertCircle className="w-5 h-5 text-red-400 mr-2 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="text-red-100 text-sm">{message}</p>
        <div className="flex gap-2 mt-2">
          {onRetry && (
            <Button size="sm" variant="outline" className="bg-transparent border-red-400/30 text-red-100 hover:bg-red-400/20 text-xs py-0 h-7" onClick={onRetry}>
              Try Again
            </Button>
          )}
          {onManual && (
            <Button size="sm" variant="outline" className="bg-transparent border-red-400/30 text-red-100 hover:bg-red-400/20 text-xs py-0 h-7" onClick={onManual}>
              Enter Manually
            </Button>
          )}
        </div>
      </div>
    </div>
  </div>
);

// Add a type declaration for the window object to include our custom property
declare global {
  interface Window {
    _locationTimeoutId?: number;
  }
}

export default function CivicReporter() {
  // Log to verify API key is loaded and configure Geocode API
  useEffect(() => {
    // Configure Geocode API with the provided API key
    const apiKey = "AIzaSyCkzMyvUKcEB1ioQs9WSjPvetC9QYoWg3U";
    Geocode.setKey(apiKey);
    Geocode.setLanguage("en");
    Geocode.setRegion("in");
    Geocode.setLocationType("ROOFTOP");
    
    console.log("Google Maps API key is configured");
  }, []);
  const [step, setStep] = useState<"capture" | "form" | "processing" | "result">("capture")
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<MediaType | null>(null)
  const [issueText, setIssueText] = useState("")
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [manualLocation, setManualLocation] = useState("")
  const [useManualLocation, setUseManualLocation] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [tweetResponse, setTweetResponse] = useState<TwitterResponse | null>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [locationError, setLocationError] = useState<string | null>(null)
  const [addressFromCoords, setAddressFromCoords] = useState<string | null>(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [addressLoading, setAddressLoading] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  // Load Google Maps script
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: "AIzaSyCkzMyvUKcEB1ioQs9WSjPvetC9QYoWg3U",
    libraries: ["places"],
    // Add additional options to prevent API target blocked error
    version: "weekly",
    language: "en",
    region: "in",
    // Add channel parameter for better tracking
    channel: "civic-reporter-app",
  });

  // Reference for the autocomplete input
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const autocompleteInputRef = useRef<HTMLInputElement>(null);
  
  // State to track if browser geolocation is available
  const [isGeolocationAvailable, setIsGeolocationAvailable] = useState(true);
  const [isGeolocationEnabled, setIsGeolocationEnabled] = useState(true);
  const [coords, setCoords] = useState<{latitude: number, longitude: number} | null>(null);
  
  // Function to handle place selection from autocomplete
  const onPlaceSelected = () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        
        setLocation({ lat, lng });
        setAddressFromCoords(place.formatted_address || null);
        setLocationError(null);
        setUseManualLocation(false);
      }
    }
  };
  
  // Function to handle autocomplete load
  const onAutocompleteLoad = (autocomplete: google.maps.places.Autocomplete) => {
    autocompleteRef.current = autocomplete;
  };
  
  // Function to get current location using browser's geolocation API
  const getCurrentLocationWithGoogleMaps = () => {
    setLocationError(null);
    setAddressFromCoords(null);
    setLocationLoading(true);
    
    if (!navigator.geolocation) {
      setIsGeolocationAvailable(false);
      setLocationError("Geolocation is not supported by this browser.");
      setUseManualLocation(true);
      setLocationLoading(false);
      return;
    }
    
    // Clear any existing timeout
    if (typeof window !== 'undefined' && '_locationTimeoutId' in window && window._locationTimeoutId) {
      clearTimeout(window._locationTimeoutId as number);
      delete window._locationTimeoutId;
    }
    
    // Set a timeout to handle cases where getCurrentPosition might silently fail
    window._locationTimeoutId = window.setTimeout(() => {
      setLocationError("Location request timed out. Please try again or enter location manually.");
      setLocationLoading(false);
      delete window._locationTimeoutId;
    }, 15000) as number; // 15 seconds timeout
    
    navigator.geolocation.getCurrentPosition(
      // Success callback
      (position) => {
        // Clear timeout
        if (typeof window !== 'undefined' && '_locationTimeoutId' in window && window._locationTimeoutId) {
          clearTimeout(window._locationTimeoutId as number);
          delete window._locationTimeoutId;
        }
        
        if (position && position.coords) {
          const { latitude, longitude } = position.coords;
          setCoords({ latitude, longitude });
          setLocation({
            lat: latitude,
            lng: longitude,
          });
          
          // Get address from coordinates
          getAddressFromCoordinates(latitude, longitude);
          setLocationError(null);
        } else {
          setLocationError("Could not get valid location coordinates.");
          setUseManualLocation(true);
          setAddressFromCoords(null);
        }
        
        setLocationLoading(false);
      },
      // Error callback
      (error) => {
        // Clear timeout
        if (typeof window !== 'undefined' && '_locationTimeoutId' in window && window._locationTimeoutId) {
          clearTimeout(window._locationTimeoutId as number);
          delete window._locationTimeoutId;
        }
        
        console.error("Geolocation error:", error);
        setLocationError(getLocationErrorMessage(error));
        setAddressFromCoords(null);
        setLocationLoading(false);
      },
      // Options
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  };
  
  // Effect to handle address conversion when coordinates change
  useEffect(() => {
    if (coords && !useManualLocation) {
      getAddressFromCoordinates(coords.latitude, coords.longitude);
    }
  }, [coords, useManualLocation]);

  // Helper function to get user-friendly error messages
  const getLocationErrorMessage = (error: any): string => {
    if (!error) return "Unknown location error. Please try again or enter location manually.";
    
    if (typeof error === 'object' && 'code' in error) {
      switch(error.code) {
        case 1: // PERMISSION_DENIED
          return "Location permission denied. Please enable location services in your browser settings.";
        case 2: // POSITION_UNAVAILABLE
          return "Location information is unavailable. Please try again or enter location manually.";
        case 3: // TIMEOUT
          return "Location request timed out. Please try again or enter location manually.";
        default:
          return `Location error (${error.code}): ${error.message || 'Unknown error'}. Please try again or enter manually.`;
      }
    }
    
    return typeof error === 'string' ? error : "Unable to get your location. Please enter manually.";
  };
  
  // Function to convert coordinates to address using reverse geocoding
  const getAddressFromCoordinates = async (latitude: number, longitude: number) => {
    // Set loading state for address conversion
    setAddressLoading(true);
    
    try {
      // Make sure we have valid coordinates
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || isNaN(latitude) || isNaN(longitude)) {
        throw new Error("Invalid coordinates provided");
      }
      
      // Use the provided API key
      const apiKey = "AIzaSyCkzMyvUKcEB1ioQs9WSjPvetC9QYoWg3U";
      
      // Configure Geocode API with the new key
      Geocode.setKey(apiKey);
      Geocode.setLanguage("en");
      Geocode.setRegion("in");
      Geocode.setLocationType("ROOFTOP");
      
      // Try using direct fetch to Google Maps API as a fallback method
      // This can sometimes work when the Geocode library has issues
      try {
        // Call the Geocode API
        const response = await Geocode.fromLatLng(latitude, longitude);
        
        // Check if we have valid results
        if (response.status === "OK" && response.results && response.results.length > 0) {
          const address = response.results[0].formatted_address;
          setAddressFromCoords(address);
          setAddressLoading(false);
          return address;
        } else {
          throw new Error("No results or invalid status from Geocode API");
        }
      } catch (geocodeError) {
        console.warn("Primary geocoding method failed, trying fallback", geocodeError);
        
        // Fallback: Direct API call to Google Maps Geocoding API
        try {
          const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=en&region=in`;
          
          const fetchResponse = await fetch(url);
          if (!fetchResponse.ok) {
            console.warn(`Fallback geocoding HTTP error: ${fetchResponse.status}`);
            // Don't throw, continue to fallback
          } else {
            const data = await fetchResponse.json();
            
            if (data.status === "OK" && data.results && data.results.length > 0) {
              const address = data.results[0].formatted_address;
              setAddressFromCoords(address);
              setAddressLoading(false);
              return address;
            } else {
              console.warn(`Fallback geocoding API error: ${data.status}`);
              // Don't throw, continue to fallback
            }
          }
        } catch (fallbackError) {
          console.warn("Fallback geocoding method also failed:", fallbackError);
          // Don't throw, continue to final fallback
        }
      }
    } catch (error) {
      console.error("All reverse geocoding methods failed:", error);
      
      // Check if it's a network error or API key issue
      if (error instanceof Error) {
        if (error.message.includes("API key") || error.message.includes("apiKey") || 
            error.message.includes("ApiTargetBlockedMapError") || 
            error.message.includes("API target blocked")) {
          console.warn("Google Maps API key issue detected");
          setLocationError("Google Maps API key is invalid or restricted. Using coordinates instead.");
          // Suggest manual location entry
          setUseManualLocation(true);
        } else if (error.message.includes("Network Error") || error.message.includes("Failed to fetch")) {
          setLocationError("Network error while getting address. Using coordinates instead.");
        } else {
          // Don't show error for other issues, just use coordinates
          console.log("Using coordinates instead of address due to error:", error.message);
        }
      }
      
      // Fallback to basic coordinate string when all else fails
      const coordString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setAddressFromCoords(coordString);
      setAddressLoading(false);
      return coordString;
    }
  };

  // Function to trigger location detection
  const getCurrentLocation = () => {
    // Use the new Google Maps based location function
    getCurrentLocationWithGoogleMaps();
  }

  const handleCameraCapture = () => {
    setShowCamera(true)
  }
  
  const handleCameraClose = () => {
    setShowCamera(false)
  }
  
  const handleCameraPhotoCapture = (file: File, preview: string, type: "image" | "video") => {
    setMediaFile(file)
    setMediaPreview(preview)
    setMediaType(type)
    setShowCamera(false)
    setStep("form")
  }

  const handleGallerySelect = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click()
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, source: "camera" | "gallery") => {
    const file = event.target.files?.[0]
    if (file) {
      setMediaFile(file)
      setMediaType(file.type.startsWith("video/") ? "video" : "image")

      const reader = new FileReader()
      reader.onload = (e) => {
        setMediaPreview(e.target?.result as string)
        setStep("form")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleVideoToggle = () => {
    if (videoRef.current) {
      if (isVideoPlaying) {
        videoRef.current.pause()
      } else {
        videoRef.current.play()
      }
      setIsVideoPlaying(!isVideoPlaying)
    }
  }

  // Process the report with AI - improved error handling and validation
  const processWithAI = async (): Promise<AIResponse> => {
    // Media file is now optional
    
    // Validate location data
    let locationString = ""
    if (useManualLocation) {
      if (!manualLocation.trim()) {
        throw new Error("Please enter your location in the text field")
      }
      locationString = manualLocation.trim()
    } else {
      if (!location || (typeof location.lat !== 'number' || typeof location.lng !== 'number')) {
        throw new Error("Location information is missing or invalid. Please try getting your location again or enter it manually.")
      }
      
      // Use the address from coordinates if available, otherwise use coordinates
      if (addressFromCoords) {
        locationString = addressFromCoords
      } else {
        locationString = `${location.lat},${location.lng}`
      }
    }
    
    // Validate that we have at least issue text or location
    if (!issueText && !locationString) {
      throw new Error("Please provide issue description or location")
    }

    // Create form data for API request
    const formData = new FormData()
    if (mediaFile) {
      formData.append("media", mediaFile)
    }
    formData.append("issueText", issueText)
    formData.append("location", locationString)

    try {
      // Send request to API
      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      })

      // Clone the response before consuming it to avoid "Body has already been consumed" error
      const responseClone = response.clone();

      // Handle API errors
      if (!response.ok) {
        let errorMessage = "Failed to process with AI";
        let errorContent;
        try {
          errorContent = await response.json();
        } catch (parseError) {
          try {
            errorContent = await responseClone.text();
          } catch (textError) {
            console.error("Error parsing response as text:", textError);
            errorContent = response.statusText;
          }
        }

        if (typeof errorContent === 'object' && errorContent !== null && 'error' in errorContent) {
          errorMessage = errorContent.error;
          
          // Check for specific API service errors
          if (response.status === 503) {
            errorMessage = "AI service is currently unavailable. Please check your API key configuration or try again later.";
          } else if (errorMessage.includes("API key") || errorMessage.includes("Gemini")) {
            errorMessage = "AI service configuration issue. Please check your API key or contact support.";
          }
        } else if (typeof errorContent === 'string') {
          errorMessage = `${errorMessage}: ${errorContent || response.statusText}`;
        } else {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      // Parse and return response
      try {
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        return data;
      } catch (jsonError) {
        console.error("Error parsing response as JSON:", jsonError);
        try {
          // Try to parse the cloned response as text if JSON parsing fails
          const textData = await responseClone.text();
          throw new Error(`Invalid response format: ${textData}`);
        } catch (textError) {
          throw new Error("Failed to process response from server");
        }
      }
    } catch (error) {
      console.error("Error in processWithAI:", error);
      throw error;
    }
  }

  // Submit the report - improved validation and error handling
  const handleSubmit = async () => {
    // Reset any previous errors
    setLocationError(null);
    
    // Validate media file
    if (!mediaFile) {
      setStep("capture");
      return;
    }

    // Validate location information
    if (useManualLocation) {
      if (!manualLocation.trim()) {
        setLocationError("Please enter your location in the text field");
        return;
      }
    } else {
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        setLocationError("Location information is missing or invalid. Please try getting your location again or enter it manually.");
        return;
      }
    }

    // Start processing
    setIsProcessing(true);
    setStep("processing");

    try {
      // Process with AI
      const response = await processWithAI();
      setAiResponse(response);
      setStep("result");
    } catch (error: any) {
      console.error("Error processing:", error);
      
      // Handle different types of errors
      let errorMessage = "Error processing your report. ";
      
      // Ensure error is properly converted to string to avoid "Body has already been consumed" errors
      const errorObj = error || {};
      const errorMsg = typeof errorObj.message === 'string' 
        ? errorObj.message 
        : (errorObj.toString && typeof errorObj.toString === 'function' 
            ? errorObj.toString() 
            : 'Unknown error');
      
      if (errorMsg.toLowerCase().includes("location")) {
        setLocationError(errorMsg);
        errorMessage = "";
      } else if (errorMsg.toLowerCase().includes("media")) {
        errorMessage = `Media issue: ${errorMsg}`;
      } else {
        errorMessage += errorMsg;
      }
      
      // Only show alert if it's not a location error (which is shown in the UI)
      if (errorMessage) {
        alert(errorMessage);
      }
      
      setStep("form");
    } finally {
      setIsProcessing(false);
    }
  }

  const postToTwitter = async () => {
    if (!aiResponse || !mediaFile) {
      alert("No tweet data available")
      return
    }

    setIsPosting(true)

    try {
      const formData = new FormData()
      formData.append("tweet", aiResponse.final_tweet)
      formData.append("media", mediaFile)

      const response = await fetch("/api/tweet", {
        method: "POST",
        body: formData,
      })

      // Clone the response before consuming it to avoid "Body has already been consumed" error
      const responseClone = response.clone();

      // Handle API errors
      if (!response.ok) {
        let errorMessage = "Failed to post tweet";
        let errorContent;
        try {
          errorContent = await response.json();
        } catch (parseError) {
          try {
            errorContent = await responseClone.text();
          } catch (textError) {
            console.error("Error parsing response as text:", textError);
            errorContent = response.statusText;
          }
        }

        if (typeof errorContent === 'object' && errorContent !== null && 'error' in errorContent) {
          errorMessage = errorContent.error;
        } else if (typeof errorContent === 'string') {
          errorMessage = `${errorMessage}: ${errorContent || response.statusText}`;
        } else {
          errorMessage = `${errorMessage}: ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }

      try {
        const result: TwitterResponse = await response.json()
        setTweetResponse(result)

        if (result.success) {
          alert("Tweet posted successfully!")
        } else {
          alert(`Failed to post tweet: ${result.error}`)
        }
      } catch (jsonError) {
        console.error("Error parsing tweet response as JSON:", jsonError);
        try {
          // Try to parse the cloned response as text if JSON parsing fails
          const textData = await responseClone.text();
          throw new Error(`Invalid response format: ${textData}`);
        } catch (textError) {
          throw new Error("Failed to process response from server");
        }
      }
    } catch (error) {
      console.error("Error posting tweet:", error)
      alert(error instanceof Error ? error.message : "Error posting tweet. Please try again.")
    } finally {
      setIsPosting(false)
    }
  }

  const copyTweet = () => {
    if (aiResponse?.final_tweet) {
      navigator.clipboard.writeText(aiResponse.final_tweet)
      alert("Tweet copied to clipboard!")
    }
  }

  // Monitor coords changes from the useGeolocated hook
  useEffect(() => {
    if (coords && !useManualLocation) {
      setLocation({
        lat: coords.latitude,
        lng: coords.longitude,
      });
      setLocationError(null);
    }
  }, [coords, useManualLocation]);

  const resetApp = () => {
    setStep("capture")
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setIssueText("")
    setLocation(null)
    setManualLocation("")
    setUseManualLocation(false)
    setAiResponse(null)
    setIsVideoPlaying(false)
    setTweetResponse(null)
    setLocationError(null)
    setAddressFromCoords(null)
    setLocationLoading(false)
    setAddressLoading(false)
    
    // Clear any pending timeouts
    if (typeof window !== 'undefined' && '_locationTimeoutId' in window && window._locationTimeoutId) {
      clearTimeout(window._locationTimeoutId as number)
      delete window._locationTimeoutId
    }
  }

  const goBackToCapture = () => {
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
    setStep("capture")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-6 max-w-md">
        {/* Header - Only show on capture screen */}
        <AnimatePresence>
          {step === "capture" && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center mb-12"
            >
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <Shield className="w-12 h-12 text-cyan-400" />
                  <motion.div
                    className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                  />
                </div>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">CivicSnap</h1>
              <p className="text-slate-300 text-sm mb-4">AI-Powered Civic Issue Reporting</p>
              <div className="flex items-center justify-center gap-2">
                <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-300 border-cyan-500/30">
                  <Zap className="w-3 h-3 mr-1" />
                  AI Powered
                </Badge>
                <Badge variant="secondary" className="bg-green-500/20 text-green-300 border-green-500/30">
                  <Globe className="w-3 h-3 mr-1" />
                  Auto Tweet
                </Badge>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {/* Step 1: Capture Screen */}
          {step === "capture" && (
            <motion.div
              key="capture"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="flex flex-col items-center justify-center min-h-[60vh]"
            >
              {/* Main Camera Button */}
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative mb-8">
                <motion.div
                  className="w-32 h-32 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center cursor-pointer shadow-2xl"
                  animate={{
                    boxShadow: [
                      "0 0 30px rgba(168, 85, 247, 0.4)",
                      "0 0 50px rgba(168, 85, 247, 0.6)",
                      "0 0 30px rgba(168, 85, 247, 0.4)",
                    ],
                  }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCameraCapture()
                  }}
                >
                  <Camera className="w-16 h-16 text-white" />
                </motion.div>

                {/* Pulse Ring */}
                <motion.div
                  className="absolute inset-0 border-4 border-white/30 rounded-full pointer-events-none"
                  animate={{ scale: [1, 1.3, 1], opacity: [0.7, 0, 0.7] }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                />
              </motion.div>

              <h2 className="text-2xl font-bold text-white mb-4 text-center">Capture Issue</h2>
              <p className="text-slate-300 text-center mb-8 px-4">
                Take a photo or video of the civic issue you want to report
              </p>

              {/* Action Buttons */}
              <div className="flex gap-4 w-full max-w-xs">
                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleCameraCapture()
                  }}
                  className="flex-1 bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 py-6"
                >
                  <Camera className="w-5 h-5 mr-2" />
                  Camera
                </Button>

                <Button
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleGallerySelect()
                  }}
                  className="flex-1 bg-white/10 backdrop-blur-lg border border-white/20 text-white hover:bg-white/20 py-6"
                >
                  <ImageIcon className="w-5 h-5 mr-2" />
                  Gallery
                </Button>
              </div>

              {/* Hidden File Input for Gallery */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={(e) => handleFileSelect(e, "gallery")}
                className="hidden"
                style={{ display: "none" }}
              />
              
              {/* Camera Component */}
              {showCamera && (
                <CameraCapture 
                  onCapture={handleCameraPhotoCapture}
                  onClose={handleCameraClose}
                />
              )}
            </motion.div>
          )}

          {/* Step 2: Form Screen */}
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Back Button */}
              <Button onClick={goBackToCapture} variant="ghost" className="text-white hover:bg-white/10 p-2">
                <X className="w-5 h-5" />
              </Button>

              {/* Media Preview */}
              <Card className="p-4 bg-white/10 backdrop-blur-lg border-white/20">
                <div className="relative">
                  {mediaType === "image" ? (
                    <img
                      src={mediaPreview || "/placeholder.svg"}
                      alt="Captured issue"
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="relative">
                      <video
                        ref={videoRef}
                        src={mediaPreview || ""}
                        className="w-full h-48 object-cover rounded-lg"
                        onPlay={() => setIsVideoPlaying(true)}
                        onPause={() => setIsVideoPlaying(false)}
                      />
                      <Button
                        onClick={handleVideoToggle}
                        className="absolute inset-0 bg-black/50 hover:bg-black/60 text-white"
                        variant="ghost"
                      >
                        {isVideoPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8" />}
                      </Button>
                    </div>
                  )}

                  <div className="absolute top-2 right-2">
                    <Badge className="bg-black/50 text-white border-0">
                      {mediaType === "image" ? <Camera className="w-3 h-3 mr-1" /> : <Video className="w-3 h-3 mr-1" />}
                      {mediaType === "image" ? "Photo" : "Video"}
                    </Badge>
                  </div>
                </div>

                <Button
                  onClick={goBackToCapture}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-white/20 text-white hover:bg-white/10 bg-transparent"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
              </Card>

              {/* Issue Description */}
              <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20">
                <h3 className="text-white font-semibold mb-4">Describe the Issue (Optional)</h3>
                <Textarea
                  placeholder="Add any additional details about the issue..."
                  value={issueText}
                  onChange={(e) => setIssueText(e.target.value)}
                  className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 min-h-[80px] resize-none"
                />
              </Card>

              {/* Location */}
              <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20">
                <h3 className="text-white font-semibold mb-4 flex items-center">
                  <MapPin className="w-5 h-5 mr-2 text-green-400" />
                  Location
                </h3>

                <div className="space-y-4">
                  {/* Location Error Message */}
                  {locationError && (
                    <ErrorMessage 
                      message={locationError} 
                      onRetry={getCurrentLocation} 
                      onManual={() => setUseManualLocation(true)} 
                    />
                  )}
                  
                  {/* Location Toggle */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setUseManualLocation(false);
                        if (useManualLocation && location) {
                          // If switching back to auto and we have coords, try to get the address again
                          getAddressFromCoordinates(location.lat, location.lng);
                        }
                      }}
                      variant={!useManualLocation ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        !useManualLocation
                          ? "bg-green-500 hover:bg-green-600 text-white"
                          : "border-white/20 text-white hover:bg-white/10 bg-transparent",
                      )}
                    >
                      Auto
                    </Button>
                    <Button
                      onClick={() => setUseManualLocation(true)}
                      variant={useManualLocation ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        useManualLocation
                          ? "bg-blue-500 hover:bg-blue-600 text-white"
                          : "border-white/20 text-white hover:bg-white/10 bg-transparent",
                      )}
                    >
                      Manual
                    </Button>
                  </div>

                  {/* Auto Location */}
                  {!useManualLocation && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-slate-300">Current Location</div>
                        <Button
                          onClick={getCurrentLocation}
                          variant="outline"
                          size="sm"
                          className="border-white/20 text-white hover:bg-white/10 bg-transparent h-7 text-xs"
                          disabled={locationLoading || isProcessing || !isGeolocationAvailable || !isGeolocationEnabled}
                        >
                          {locationLoading ? (
                            <>
                              <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                              Getting...
                            </>
                          ) : (
                            <>
                              <Navigation className="w-3 h-3 mr-1" />
                              Get Location
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="bg-white/5 rounded-md p-2 text-sm text-slate-300 min-h-[36px] flex items-center">
                        {location ? (
                          <div className="flex flex-col w-full">
                            <div className="flex items-center">
                              <CheckCircle className="w-4 h-4 text-green-400 mr-2" />
                              Location detected {coords && (
                                <span className="ml-1 text-xs text-slate-400">
                                  {coords && 'accuracy' in coords && (
                                    <span>(accuracy: {Math.round((coords as GeolocationCoordinates).accuracy)}m)</span>
                                  )}
                                </span>
                              )}
                            </div>
                            {addressLoading ? (
                              <div className="mt-1 text-xs text-slate-300 pl-6 flex items-center">
                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                Getting address...
                              </div>
                            ) : addressFromCoords ? (
                              <div className="mt-1 text-xs text-slate-300 pl-6">
                                {addressFromCoords}
                              </div>
                            ) : (
                              <div className="mt-1 text-xs text-slate-400 italic pl-6">
                                Using coordinates: {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400 italic">
                            {locationLoading ? "Getting your location..." :
                              !isGeolocationAvailable ? "Geolocation not supported in this browser" :
                              !isGeolocationEnabled ? "Location services are disabled" :
                              "No location detected yet"}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual Location with Google Places Autocomplete */}
                  {useManualLocation && (
                    <div className="space-y-2">
                      <div className="text-sm text-slate-300">Enter Location</div>
                      {isLoaded ? (
                        <div className="relative">
                          <Autocomplete
                            onLoad={onAutocompleteLoad}
                            onPlaceChanged={onPlaceSelected}
                            options={{
                              componentRestrictions: { country: "in" },
                              fields: ["formatted_address", "geometry", "name"],
                              strictBounds: false,
                              types: ["geocode", "establishment"]
                            }}
                          >
                            <input
                              ref={autocompleteInputRef}
                              type="text"
                              placeholder="Search for a location"
                              value={manualLocation}
                              onChange={(e) => setManualLocation(e.target.value)}
                              className="w-full bg-white/5 border border-white/20 text-white placeholder:text-slate-400 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                          </Autocomplete>
                          <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                        </div>
                      ) : loadError ? (
                        <div>
                          <Textarea
                            placeholder="Enter your location (e.g., city, neighborhood, landmark)"
                            value={manualLocation}
                            onChange={(e) => setManualLocation(e.target.value)}
                            className="bg-white/5 border-white/20 text-white placeholder:text-slate-400 min-h-[60px] resize-none"
                          />
                          <div className="text-xs text-amber-400 mt-1">
                            <AlertTriangle className="w-3 h-3 inline mr-1" />
                            Google Maps could not be loaded. Using manual text input instead.
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center p-4 bg-white/5 rounded-md">
                          <Loader2 className="w-5 h-5 text-slate-400 animate-spin" />
                          <span className="ml-2 text-slate-400">Loading location search...</span>
                        </div>
                      )}
                      {manualLocation.trim() && addressFromCoords && (
                        <div className="flex items-center text-xs text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          {addressFromCoords}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* Submit Button */}
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  onClick={handleSubmit}
                  disabled={!mediaFile || (!location && !manualLocation.trim())}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-5 h-5 mr-2" />
                  Analyze & Generate Tweet
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Step 3: Processing Screen */}
          {step === "processing" && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="text-center py-12"
            >
              <div className="relative mb-8">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
                  className="w-16 h-16 mx-auto"
                >
                  <Loader2 className="w-16 h-16 text-cyan-400" />
                </motion.div>
                <motion.div
                  className="absolute inset-0 w-16 h-16 mx-auto border-4 border-purple-500/30 rounded-full"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Number.POSITIVE_INFINITY }}
                />
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Processing with AI</h3>
              <div className="space-y-2 text-slate-300">
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                  🤖 Analyzing media with Gemini AI...
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }}>
                  📍 Identifying location and authority...
                </motion.p>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.5 }}>
                  🐦 Generating optimized tweet...
                </motion.p>
              </div>
            </motion.div>
          )}

          {/* Step 4: Result Screen */}
          {step === "result" && aiResponse && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Success Header */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", duration: 0.6 }}
                className="text-center"
              >
                <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">AI Analysis Complete!</h3>
                <p className="text-slate-300">Your civic issue has been analyzed</p>
              </motion.div>

              {/* Issue Summary */}
              <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20">
                <h4 className="text-white font-semibold mb-3">Issue Detected</h4>
                <p className="text-slate-300 mb-4">{aiResponse.detected_issue}</p>

                <div className="space-y-2">
                  <div className="flex items-center text-sm">
                    <MapPin className="w-4 h-4 mr-2 text-green-400" />
                    <span className="text-slate-300">{aiResponse.location_detected}</span>
                  </div>
                  <div className="flex items-center text-sm">
                    <Shield className="w-4 h-4 mr-2 text-blue-400" />
                    <span className="text-slate-300">{aiResponse.responsible_authority}</span>
                  </div>
                </div>
              </Card>

              {/* Generated Tweet */}
              <Card className="p-6 bg-white/10 backdrop-blur-lg border-white/20">
                <h4 className="text-white font-semibold mb-3 flex items-center">
                  <Twitter className="w-4 h-4 mr-2 text-blue-400" />
                  Generated Tweet with Media
                </h4>
                <div className="bg-black/30 rounded-lg p-4 mb-4">
                  <p className="text-white text-sm leading-relaxed mb-3">{aiResponse.final_tweet}</p>
                  {mediaPreview && (
                    <div className="relative">
                      {mediaType === "image" ? (
                        <img
                          src={mediaPreview || "/placeholder.svg"}
                          alt="Tweet media"
                          className="w-full h-32 object-cover rounded border border-white/20"
                        />
                      ) : (
                        <video
                          src={mediaPreview}
                          className="w-full h-32 object-cover rounded border border-white/20"
                          controls
                        />
                      )}
                      <Badge className="absolute top-2 right-2 bg-black/70 text-white border-0">Media Attached</Badge>
                    </div>
                  )}
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {aiResponse.twitter_handles.map((handle, index) => (
                    <Badge key={index} variant="secondary" className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                      {handle}
                    </Badge>
                  ))}
                  {aiResponse.hashtags.map((tag, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="bg-purple-500/20 text-purple-300 border-purple-500/30"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mb-4">
                  <Button
                    onClick={copyTweet}
                    variant="outline"
                    size="sm"
                    className="flex-1 border-white/20 text-white hover:bg-white/10 bg-transparent"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={postToTwitter}
                    disabled={isPosting}
                    size="sm"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {isPosting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Twitter className="w-4 h-4 mr-2" />
                    )}
                    {isPosting ? "Posting..." : "Post Tweet"}
                  </Button>
                </div>

                {/* Tweet Response */}
                {tweetResponse && (
                  <div
                    className={cn(
                      "p-3 rounded-lg border text-sm",
                      tweetResponse.success
                        ? "bg-green-500/20 border-green-500/30 text-green-300"
                        : "bg-red-500/20 border-red-500/30 text-red-300",
                    )}
                  >
                    {tweetResponse.success ? (
                      <div className="flex items-center">
                        <span>✅ Tweet posted successfully!</span>
                      </div>
                    ) : (
                      <span>❌ {tweetResponse.error}</span>
                    )}
                  </div>
                )}
              </Card>

              {/* New Report Button */}
              <Button
                onClick={resetApp}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-6"
              >
                Report Another Issue
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
