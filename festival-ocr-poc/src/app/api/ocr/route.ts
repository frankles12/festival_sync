import { NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { ImageAnnotatorClient } from '@google-cloud/vision';
import fs from 'fs';
import path from 'path';

function createVisionClient(): ImageAnnotatorClient {
  // 1) Prefer JSON creds provided via env (GOOGLE_APPLICATION_CREDENTIALS_JSON)
  const jsonEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (jsonEnv) {
    try {
      const parsed = JSON.parse(jsonEnv);
      const privateKey: string = typeof parsed.private_key === 'string'
        ? parsed.private_key.replace(/\\n/g, '\n')
        : parsed.private_key;
      return new ImageAnnotatorClient({
        projectId: parsed.project_id,
        credentials: {
          client_email: parsed.client_email,
          private_key: privateKey,
        },
      });
    } catch (e) {
      console.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON', e);
    }
  }

  // 2) If GOOGLE_APPLICATION_CREDENTIALS points to a key file, use it
  const keyFileFromEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (keyFileFromEnv && fs.existsSync(keyFileFromEnv)) {
    return new ImageAnnotatorClient({ keyFilename: keyFileFromEnv });
  }

  // 3) Fallback to local project key file if present (dev convenience)
  const localKey = path.join(process.cwd(), 'google-cloud-key.json');
  if (fs.existsSync(localKey)) {
    return new ImageAnnotatorClient({ keyFilename: localKey });
  }

  // 4) Last resort: rely on ADC (may work in some environments like GCP)
  return new ImageAnnotatorClient();
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageBase64 = body.image;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image data provided.' }, { status: 400 });
    }

    // Remove the data URL prefix if it exists (e.g., "data:image/jpeg;base64,")
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    // Creates a client (tries several credential sources)
    const client = createVisionClient();

    // Prepare the request
    const visionRequest = {
      image: {
        // Convert base64 string to bytes Buffer for Vision API
        content: Buffer.from(base64Data, 'base64'),
      },
      features: [
        { type: 'TEXT_DETECTION' },
      ],
    } as const;

    console.log('Sending request to Google Cloud Vision API...');
    // Performs image annotation based on the specified features
    const [result] = await client.annotateImage(visionRequest);
    console.log('Received response from Google Cloud Vision API.');

    const detections = result.textAnnotations;
    // The first annotation is typically the full detected text block
    const fullText = detections && detections.length > 0 ? detections[0].description : '';

    if (!fullText) {
      console.log('No text detected by Vision API.');
      return NextResponse.json({ text: 'No text detected.' });
    }

    // console.log('Detected Text:', fullText); // Optional: log the full text

    return NextResponse.json({ text: fullText });

  } catch (error) {
    console.error('Google Cloud Vision API Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    // Check if the error is specifically related to authentication
    if (
      message.includes('Could not load the default credentials') ||
      message.toLowerCase().includes('permission') ||
      message.toLowerCase().includes('unauthorized')
    ) {
      return NextResponse.json(
        { error: 'Server configuration error: Could not authenticate with Google Cloud Vision API. Check credentials.' },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: `Failed to process image with Google Cloud Vision API. ${message}` },
      { status: 500 }
    );
  }
} 