import { type NextRequest, NextResponse } from "next/server"
import { TwitterApi } from "twitter-api-v2"

// Initialize with OAuth 1.0a User Context authentication
// This is required for media uploads and tweet posting
// IMPORTANT: For Twitter API v2 free tier, your app MUST be associated with a Project in the Twitter Developer Portal
// The free tier only allows posting tweets and media uploads with OAuth 1.0a User Context authentication
const twitterClient = new TwitterApi({
  appKey: process.env.X_API_KEY!,
  appSecret: process.env.X_API_SECRET!,
  accessToken: process.env.X_ACCESS_TOKEN!,
  accessSecret: process.env.X_ACCESS_TOKEN_SECRET!,
})

// Function to verify Twitter API credentials and permissions
async function verifyTwitterCredentials() {
  try {
    // Try to get the authenticated user to verify credentials
    const user = await twitterClient.v2.me();
    console.log("Twitter credentials verified for user:", user.data.username);
    return { success: true, user: user.data };
  } catch (error) {
    console.error("Twitter credentials verification failed:", error);
    
    // Log detailed error information
    if ((error as any).data) {
      console.error("Verification error details:", JSON.stringify((error as any).data));
    }
    
    // Provide specific guidance based on error code
    if ((error as any).code === 403) {
      console.error("403 Forbidden: Your app may not have the correct permissions.");
      console.error("Make sure your Twitter Developer App has the 'Read and Write' permission.");
    }
    
    return { success: false, error };
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify Twitter API credentials before proceeding
    console.log("Verifying Twitter API credentials...");
    const verificationResult = await verifyTwitterCredentials();
    
    if (!verificationResult.success) {
      console.error("Twitter API credentials verification failed. Cannot proceed with tweet.");
      return NextResponse.json(
        { 
          success: false, 
          error: "Twitter API credentials verification failed", 
          details: (verificationResult.error as Error)?.message || "Unknown error",
          code: (verificationResult.error as any)?.code || 401
        },
        { status: 401 }
      );
    }
    
    console.log("Twitter API credentials verified successfully. Proceeding with tweet.");
    
    const formData = await request.formData()
    const tweetText = formData.get("tweet") as string
    const mediaFile = formData.get("media") as File | null

    if (!tweetText) {
      return NextResponse.json({ error: "No tweet text provided" }, { status: 400 })
    }

    const rwClient = twitterClient.readWrite

    let mediaId: string | undefined

    // Upload media if provided
    if (mediaFile) {
      try {
        const bytes = await mediaFile.arrayBuffer()
        const buffer = Buffer.from(bytes)

        // Upload media to Twitter
        // Note: Media uploads still require v1.1 API even when using v2 for tweets
        // This is explicitly mentioned in Twitter API documentation
        console.log("Attempting to upload media with type:", mediaFile.type)
        mediaId = await rwClient.v1.uploadMedia(buffer, {
          mimeType: mediaFile.type,
        })
        
        console.log("Media uploaded successfully with ID:", mediaId)
      } catch (mediaError) {
        console.error("Error uploading media:", mediaError)
        
        // Log detailed error information for debugging
        if ((mediaError as any).data) {
          console.error("Media upload error details:", JSON.stringify((mediaError as any).data))
        }
        
        // Continue without media if upload fails
      }
    }

    // Post tweet
    // For Twitter API v2, the media_ids should be passed directly in the tweet options
    let tweet;
    
    try {
      if (mediaId) {
        console.log("Posting tweet with media ID:", mediaId)
        tweet = await rwClient.v2.tweet(tweetText || "Check out this media!", {
          media: { media_ids: [mediaId] }
        })
      } else {
        console.log("Posting tweet without media")
        tweet = await rwClient.v2.tweet(tweetText || "Hello, Twitter!")
      }
      
      console.log("Tweet posted successfully with ID:", tweet.data.id)
    } catch (tweetError) {
      console.error("Error posting tweet:", tweetError)
      
      // Log detailed error information for debugging
      if ((tweetError as any).data) {
        console.error("Tweet posting error details:", JSON.stringify((tweetError as any).data))
      }
      
      // Check for specific error codes
      if ((tweetError as any).code === 403) {
        console.error("403 Forbidden: This could be due to Twitter API free tier limitations or incorrect app setup")
        console.error("Make sure your Twitter Developer App is associated with a Project in the Developer Portal")
        console.error("Also verify that your app has the 'Write' permission enabled in the User authentication settings")
      }
      
      throw tweetError
    }

    const tweetUrl = `https://twitter.com/user/status/${tweet.data.id}`

    return NextResponse.json({
      success: true,
      tweet_url: tweetUrl,
      tweet_id: tweet.data.id,
    })
  } catch (error) {
    console.error("Error posting tweet:", error)
    
    // Extract detailed error information for the response
    let errorMessage = "Failed to post tweet"
    if (error instanceof Error) {
      errorMessage = error.message
    }
    
    // Check if there's data in the error object
    let errorDetails = "";
    if ((error as any).data) {
      try {
        // Try to stringify the error data for more details
        const errorDataStr = JSON.stringify((error as any).data);
        errorDetails = ` - Details: ${errorDataStr}`;
      } catch (e) {
        // If stringify fails, just use what we have
        errorDetails = " - Additional error details available in server logs";
      }
    }
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        details: errorDetails || undefined,
        code: (error as any).code || 500
      },
      { status: 500 },
    )
  }
}
