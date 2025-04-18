import { NextResponse } from 'next/server';
import { ImageAnnotatorClient } from '@google-cloud/vision';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const imageBase64 = body.image;

    if (!imageBase64) {
      return NextResponse.json({ error: 'No image data provided.' }, { status: 400 });
    }

    // Remove the data URL prefix if it exists (e.g., "data:image/jpeg;base64,")
    const base64Data = imageBase64.split(',')[1] || imageBase64;

    // Creates a client
    const client = new ImageAnnotatorClient();

    // Prepare the request
    const visionRequest = {
      image: {
        content: base64Data, // Send the base64 encoded image data
      },
      features: [
        { type: 'TEXT_DETECTION' }, // Specify the feature type
      ],
    };

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
    // Check if the error is specifically related to authentication
    if (error instanceof Error && (error.message.includes('Could not load the default credentials') || error.message.includes('permission'))) {
         return NextResponse.json({ error: 'Server configuration error: Could not authenticate with Google Cloud Vision API. Check credentials.' }, { status: 500 });
    }
    return NextResponse.json({ error: 'Failed to process image with Google Cloud Vision API.' }, { status: 500 });
  }
} 