"use client";

import { useState } from 'react';
import Tesseract from 'tesseract.js';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0); // Optional: track progress

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedImage(event.target.files[0]);
      setOcrResult(''); // Clear previous result
      setProgress(0); // Reset progress
    }
  };

  const handleOcr = async () => {
    if (!selectedImage) {
      alert('Please select an image first.');
      return;
    }

    setIsLoading(true);
    setOcrResult('');
    setProgress(0);

    try {
      const worker = await Tesseract.createWorker('eng', 1, { // 'eng' for English, 1 for default OEM
        logger: m => {
          console.log(m); // Log progress and status messages
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
        // Optional: Specify path to worker/language files if not using CDN
        // workerPath: '/path/to/tesseract/worker.min.js',
        // langPath: '/path/to/tesseract/lang-data',
        // corePath: '/path/to/tesseract/tesseract-core.wasm.js',
      });

      const { data: { text } } = await worker.recognize(selectedImage);
      setOcrResult(text);
      await worker.terminate(); // Terminate the worker when done
    } catch (error) {
      console.error('OCR Error:', error);
      setOcrResult('Error performing OCR. Check console for details.');
    } finally {
      setIsLoading(false);
      setProgress(100); // Ensure progress shows 100% on completion/error
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Tesseract.js OCR Proof-of-Concept</h1>

      <div className="flex flex-col items-center gap-4 mb-8">
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
        />
        <button
          onClick={handleOcr}
          disabled={!selectedImage || isLoading}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Processing...' : 'Extract Text'}
        </button>
      </div>

      {isLoading && (
        <div className="w-full max-w-md bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress}%` }}></div>
          <p className="text-center text-sm mt-1">{progress}%</p>
        </div>
      )}

      {ocrResult && (
        <div className="mt-8 p-4 border border-gray-300 rounded-md bg-gray-50 w-full max-w-xl">
          <h2 className="text-xl font-semibold mb-2">Extracted Text:</h2>
          <pre className="whitespace-pre-wrap text-sm">{ocrResult}</pre>
        </div>
      )}
    </main>
  );
}
