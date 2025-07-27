import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI } from "@google/generative-ai"

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

interface AIResponse {
  detected_issue: string
  location_detected: string
  responsible_authority: string
  twitter_handles: string[]
  hashtags: string[]
  final_tweet: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const mediaFile = formData.get("media") as File
    const issueText = formData.get("issueText") as string
    const location = formData.get("location") as string

    // Media file is now optional, but we need at least issue text or location
    if (!issueText && !location) {
      return NextResponse.json({ error: "Please provide issue description or location" }, { status: 400 })
    }

    // Media file is optional now, but we'll still process it if provided
    let contentParts = []
    
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

    const prompt = `
    You are an AI assistant for a civic reporting app. Based on the user's description and location information, provide a JSON response with the following structure:

    {
      "detected_issue": "Brief description of the civic issue based on user's input",
      "location_detected": "${location}",
      "responsible_authority": "Name of the local government authority responsible for this type of issue",
      "twitter_handles": ["@handle1", "@handle2"] (relevant official Twitter handles),
      "hashtags": ["#tag1", "#tag2", "#tag3"] (relevant civic hashtags),
      "final_tweet": "A respectful, clear tweet mentioning the issue, location, tagging authorities, and using hashtags"
    }

    User's description: ${issueText || "No description provided"}
    Location info: ${location}

    Focus on Indian civic authorities and use appropriate Hindi/English civic hashtags. Keep the tweet under 280 characters and maintain a respectful, solution-seeking tone.

    Respond only with valid JSON.
    `
    
    contentParts.push(prompt)

    // If media is provided, add it to the content parts
    if (mediaFile) {
      // Convert file to base64 for Gemini
      const bytes = await mediaFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64Data = buffer.toString("base64")
      
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: mediaFile.type,
        },
      }
      
      contentParts.push(imagePart)
    }

    const result = await model.generateContent(contentParts)
    const response = await result.response
    
    // Get the text from the response and store it to avoid consuming the body multiple times
    let responseText;
    try {
      responseText = await response.text() // Consume the response body only once and store it
    } catch (textError) {
      console.error("Error getting text from Gemini response:", textError)
      throw new Error("Failed to get response from AI service")
    }

    // Parse the JSON response
    let aiResponse: AIResponse
    try {
      // Clean the response to extract JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        aiResponse = JSON.parse(jsonMatch[0])
      } else {
        throw new Error("No JSON found in response")
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", responseText)
      // Fallback response
      aiResponse = {
        detected_issue: "Public infrastructure issue detected",
        location_detected: location || "Location not specified",
        responsible_authority: "Local Municipal Corporation",
        twitter_handles: ["@SwachhBharat", "@MyGovIndia"],
        hashtags: ["#PublicIssue", "#SwachhBharat", "#FixIt"],
        final_tweet: `Public infrastructure issue reported at ${location || "unspecified location"}. Kindly resolve promptly. @SwachhBharat @MyGovIndia #PublicIssue #SwachhBharat #FixIt`,
      }
    }

    return NextResponse.json(aiResponse)
  } catch (error) {
    console.error("Error in AI analysis:", error)
    return NextResponse.json({ error: "Failed to analyze media" }, { status: 500 })
  }
}
