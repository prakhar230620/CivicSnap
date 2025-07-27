import { type NextRequest, NextResponse } from "next/server"
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/genai"

// Safely get the API key with fallback error handling
const getGeminiApiKey = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY environment variable is not set");
    throw new Error("Gemini API key is missing. Please set the GEMINI_API_KEY environment variable.");
  }
  return apiKey;
};

let genAI: GoogleGenerativeAI;

try {
  genAI = new GoogleGenerativeAI(getGeminiApiKey());
} catch (error) {
  console.error("Failed to initialize Gemini API:", error);
  // We'll handle this in the POST function
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
    // Check if Gemini API is initialized
    if (!genAI) {
      console.error("Gemini API is not initialized. Check if GEMINI_API_KEY is set in environment variables.");
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

    // Media file is optional now, but we'll still process it if provided
    let contentParts = []
    
    // Initialize the Gemini model
    let model;
    try {
      model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        safetySettings: [
          {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          },
          {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
          }
        ]
      })
    } catch (modelError) {
      console.error("Error initializing Gemini model:", modelError);
      return NextResponse.json({ 
        error: "Failed to initialize AI model. Please try again later." 
      }, { status: 500 });
    }

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

    // Configure generation options
    const generationConfig = {
      temperature: 0.4,
      topP: 0.8,
      topK: 40,
      maxOutputTokens: 2048,
    };

    // Generate content with the model
    const result = await model.generateContent({
      contents: [{ parts: contentParts }],
      generationConfig,
    })
    
    // Get the text from the response directly
    let responseText;
    try {
      // With @google/genai, we can access the text directly without consuming a body
      responseText = result.response.text()
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
