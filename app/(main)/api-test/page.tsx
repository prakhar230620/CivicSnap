"use client"

import { useState } from "react"
import { Button } from "../../../components/ui/button"
import { Card } from "../../../components/ui/card"

export default function APITestPage() {
  const [twitterStatus, setTwitterStatus] = useState<{
    loading: boolean
    success?: boolean
    message?: string
    error?: string
    user?: { id: string; name: string; username: string }
  }>({
    loading: false,
  })

  const [geminiStatus, setGeminiStatus] = useState<{
    loading: boolean
    success?: boolean
    message?: string
    error?: string
    sample_response?: string
  }>({
    loading: false,
  })

  const verifyTwitterAPI = async () => {
    setTwitterStatus({ loading: true })
    try {
      const response = await fetch("/api/verify-twitter")
      const data = await response.json()

      if (data.success) {
        setTwitterStatus({
          loading: false,
          success: true,
          message: data.message,
          user: data.user,
        })
      } else {
        setTwitterStatus({
          loading: false,
          success: false,
          error: data.error,
        })
      }
    } catch (error) {
      setTwitterStatus({
        loading: false,
        success: false,
        error: "Failed to connect to verification endpoint",
      })
    }
  }

  const verifyGeminiAPI = async () => {
    setGeminiStatus({ loading: true })
    try {
      const response = await fetch("/api/verify-gemini")
      const data = await response.json()

      if (data.success) {
        setGeminiStatus({
          loading: false,
          success: true,
          message: data.message,
          sample_response: data.sample_response,
        })
      } else {
        setGeminiStatus({
          loading: false,
          success: false,
          error: data.error,
        })
      }
    } catch (error) {
      setGeminiStatus({
        loading: false,
        success: false,
        error: "Failed to connect to verification endpoint",
      })
    }
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8">API Connection Test</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Twitter API Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Twitter API</h2>
          <Button 
            onClick={verifyTwitterAPI} 
            disabled={twitterStatus.loading}
            className="mb-4"
          >
            {twitterStatus.loading ? "Verifying..." : "Verify Twitter API Connection"}
          </Button>

          {twitterStatus.success === true && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 font-medium">{twitterStatus.message}</p>
              {twitterStatus.user && (
                <div className="mt-2">
                  <p><strong>User ID:</strong> {twitterStatus.user.id}</p>
                  <p><strong>Name:</strong> {twitterStatus.user.name}</p>
                  <p><strong>Username:</strong> @{twitterStatus.user.username}</p>
                </div>
              )}
            </div>
          )}

          {twitterStatus.success === false && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 font-medium">Error: {twitterStatus.error}</p>
              <p className="mt-2 text-sm">Please check your Twitter API credentials in the .env.local file.</p>
            </div>
          )}
        </Card>

        {/* Gemini API Test */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold mb-4">Gemini API</h2>
          <Button 
            onClick={verifyGeminiAPI} 
            disabled={geminiStatus.loading}
            className="mb-4"
          >
            {geminiStatus.loading ? "Verifying..." : "Verify Gemini API Connection"}
          </Button>

          {geminiStatus.success === true && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-md">
              <p className="text-green-700 font-medium">{geminiStatus.message}</p>
              {geminiStatus.sample_response && (
                <div className="mt-2">
                  <p><strong>Sample Response:</strong></p>
                  <p className="mt-1 text-sm italic">"{geminiStatus.sample_response}"</p>
                </div>
              )}
            </div>
          )}

          {geminiStatus.success === false && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700 font-medium">Error: {geminiStatus.error}</p>
              <p className="mt-2 text-sm">Please check your Gemini API key in the .env.local file.</p>
            </div>
          )}
        </Card>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">API Configuration</h2>
        <p className="mb-2">The following environment variables should be set in your <code>.env.local</code> file:</p>
        
        <div className="bg-gray-100 p-4 rounded-md overflow-x-auto">
          <pre className="text-sm">
{`# Gemini API Key
GEMINI_API_KEY=your_gemini_api_key

# Twitter API Keys
X_API_KEY=your_twitter_api_key
X_API_SECRET=your_twitter_api_secret
X_BEARER_TOKEN=your_twitter_bearer_token
X_ACCESS_TOKEN=your_twitter_access_token
X_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
X_CLIENT_ID=your_twitter_client_id
X_CLIENT_SECRET=your_twitter_client_secret`}
          </pre>
        </div>
      </div>
    </div>
  )
}