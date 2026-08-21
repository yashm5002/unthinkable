/**
 * Utility to extract text from images using tesseract.js.
 * Runs entirely client-side via WebAssembly workers.
 */
import Tesseract from 'tesseract.js';

export const extractTextFromImage = async (file, onProgress) => {
  try {
    // Tesseract.recognize handles worker creation, loading models, and execution in one go
    // We use the default 'eng' (English) language pack.
    const result = await Tesseract.recognize(
      file,
      'eng',
      {
        // Tesseract provides status updates (e.g., 'loading tesseract core', 'recognizing text')
        // We only want to report progress during the actual 'recognizing text' phase to keep the UI smooth
        logger: m => {
          if (m.status === 'recognizing text' && onProgress) {
            // progress is a fraction from 0 to 1
            onProgress(Math.round(m.progress * 100));
          }
        }
      }
    );

    const text = result.data.text.trim();
    
    if (!text) {
      throw new Error("No readable text found in this image.");
    }

    return text;
  } catch (error) {
    console.error("OCR Extraction Error:", error);
    throw new Error(error.message || "Failed to extract text from image.");
  }
};
