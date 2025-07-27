# CivicSnap - Photo-First Civic Issue Reporting

CivicSnap is a web application that allows users to capture civic issues with their camera and report them instantly. Users can take photos or videos of public infrastructure issues, add descriptions and location information, and the app will use AI to analyze the issue and automatically post it to Twitter, tagging relevant authorities.

## Development Setup

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
   or
   ```
   yarn
   ```
3. Set up environment variables:
   - Create a `.env.local` file in the root directory
   - Add the following environment variables:
     ```
     # Gemini API Key
     GEMINI_API_KEY=your_gemini_api_key
     
     # Google Maps API Key (for reverse geocoding)
     NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key
     
     # Twitter API Keys
     X_API_KEY=your_twitter_api_key
     X_API_SECRET=your_twitter_api_secret
     X_BEARER_TOKEN=your_twitter_bearer_token
     X_ACCESS_TOKEN=your_twitter_access_token
     X_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret
     X_CLIENT_ID=your_twitter_client_id
     X_CLIENT_SECRET=your_twitter_client_secret
     ```
   - Note: You can obtain these API keys from:
     - [Google AI Studio](https://makersuite.google.com/) for Gemini API
     - [Google Cloud Console](https://console.cloud.google.com/) for Google Maps API
     - [Twitter Developer Portal](https://developer.twitter.com/) for Twitter API

### Running the Development Server

```
npm run dev
```
or
```
yarn dev
```

The application will be available at http://localhost:3000

## Troubleshooting

### Camera Access Issues

If you encounter camera access issues:

1. Make sure no other applications are using the camera
2. Check browser permissions for camera access
3. Try refreshing the page or using a different browser

### Missing Favicon

If you see a 404 error for favicon.ico, you can create a proper favicon by:

1. Converting the existing icon-192x192.png to .ico format using an online converter
2. Placing the favicon.ico file in the public directory

### React DevTools

For a better development experience, install React DevTools:

- [Chrome Extension](https://chrome.google.com/webstore/detail/react-developer-tools/fmkadmapgofadopljbjfkapdkoienihi)
- [Firefox Extension](https://addons.mozilla.org/en-US/firefox/addon/react-devtools/)
- [Edge Extension](https://microsoftedge.microsoft.com/addons/detail/react-developer-tools/gpphkfbcpidddadnkolkpfckpihlkkil)

For other browsers or mobile development, install the standalone version:

```
npm install -g react-devtools
```

Then run:

```
react-devtools
```

And add this script tag to your HTML:

```html
<script src="http://localhost:8097"></script>
```

## PWA Support

This application supports Progressive Web App features. You can install it on your device for offline access.

## API Integrations

### Gemini API

This application uses Google's Gemini API for analyzing images and generating appropriate civic issue reports. The API is used to:

- Detect civic issues in uploaded images/videos
- Generate appropriate descriptions
- Identify relevant authorities and hashtags
- Create draft tweets for reporting issues

### Google Maps API

The Google Maps API is used for reverse geocoding to convert GPS coordinates to human-readable addresses:

- Converts latitude and longitude to street addresses
- Provides more user-friendly location information in reports
- Helps identify the correct local authorities based on location

### Twitter API

The Twitter (X) API is used to post civic issues directly to Twitter. The integration allows:

- Posting tweets with the generated content
- Uploading media (images/videos) with the tweets
- Tagging relevant authorities
- Using appropriate hashtags for better visibility

## Deployment on Vercel

### Setting Up Environment Variables on Vercel

When deploying to Vercel, you need to set up environment variables in the Vercel dashboard:

1. Go to your project in the Vercel dashboard
2. Navigate to Settings > Environment Variables
3. Add the following environment variables:
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`: Your Google Maps API key
   - `X_API_KEY`: Your Twitter API key
   - `X_API_SECRET`: Your Twitter API secret
   - `X_BEARER_TOKEN`: Your Twitter bearer token
   - `X_ACCESS_TOKEN`: Your Twitter access token
   - `X_ACCESS_TOKEN_SECRET`: Your Twitter access token secret
   - `X_CLIENT_ID`: Your Twitter client ID
   - `X_CLIENT_SECRET`: Your Twitter client secret

### Troubleshooting Vercel Deployment

If you encounter issues with the AI analysis on Vercel:

1. Check that all environment variables are correctly set in the Vercel dashboard
2. Verify that your Gemini API key is valid and has not expired
3. Check the function logs in the Vercel dashboard for specific error messages
4. Make sure your Gemini API key has access to the required models (gemini-1.5-flash)
5. If you're using a free tier of Gemini API, check for usage limits

## License

MIT