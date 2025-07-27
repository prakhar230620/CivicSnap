import { NextRequest, NextResponse } from "next/server"
import { genkit } from "genkit"
import { googleAI, gemini } from "@genkit-ai/googleai"

// Initialize Genkit with GoogleAI plugin
const apiKey = process.env.GEMINI_API_KEY
let ai: any = null

// Only initialize if API key is available
if (apiKey) {
  ai = genkit({
    plugins: [googleAI({ apiKey })],
    model: gemini('gemini-1.5-flash')
  })
} else {
  console.warn("GEMINI_API_KEY is not set in environment variables. Genkit will not be available.")
}

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
    // Check if Genkit is initialized
    if (!ai) {
      console.error("Genkit is not initialized. Check if GEMINI_API_KEY is set in environment variables.");
      return NextResponse.json({ 
        error: "AI service is currently unavailable. Please try again later or contact support." 
      }, { status: 503 }); // Service Unavailable
    }

    const formData = await request.formData()
    const mediaFile = formData.get("media") as File
    const issueText = formData.get("issueText") as string
    const location = formData.get("location") as string

    // Media file is now optional, but we need at least issue text or location
    if (!issueText && !location) {
      return NextResponse.json({ error: "Please provide issue description or location" }, { status: 400 })
    }

    // Create the prompt text
    const promptText = `
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
    
    // Prepare the generation options
    const generateOptions: {
      temperature: number;
      topK: number;
      topP: number;
      maxOutputTokens: number;
      prompt: string | (string | { inlineData: { data: string; mimeType: string } })[];
    } = {
      temperature: 0.4,
      topK: 32,
      topP: 1,
      maxOutputTokens: 2048,
      prompt: promptText
    };

    // If media is provided, add it to the options
    if (mediaFile) {
      // Convert file to base64 for Gemini
      const bytes = await mediaFile.arrayBuffer()
      const buffer = Buffer.from(bytes)
      const base64Data = buffer.toString("base64")
      
      // Add image to the generation options
      generateOptions.prompt = [
        promptText,
        {
          inlineData: {
            data: base64Data,
            mimeType: mediaFile.type
          }
        }
      ];
    }

    // Generate content using Genkit
    const result = await ai.generate(generateOptions);
    
    // Get the text from the response
    const responseText = result.text;

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
    
    // Provide a fallback response even when the API fails
    // This ensures the app can still function without the Gemini API
    if (location) {
      const fallbackResponse: AIResponse = {
        detected_issue: "Public infrastructure issue",
        location_detected: (location as unknown as string) || "Unknown location",
        responsible_authority: "Local Municipal Corporation",
        twitter_handles: ["@SwachhBharat", "@MyGovIndia"],
        hashtags: ["#CivicIssue", "#FixOurCity", "#PublicInfrastructure"],
        final_tweet: `Public infrastructure issue reported at ${location}. Authorities please take action. @SwachhBharat @MyGovIndia #CivicIssue #FixOurCity`
      };
      
      // Log that we're using fallback
      console.log("Using fallback response due to API error");
      
      // Return the fallback response with a 200 status
      return NextResponse.json(fallbackResponse);
    }
    
    // If we don't have location, we can't provide a meaningful fallback
    return NextResponse.json({ 
      error: "Failed to analyze media. Please check your API configuration or try again later." 
    }, { status: 500 })
  }
}
