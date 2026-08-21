/**
 * Utility to extract text from a PDF file using pdfjs-dist.
 * Runs entirely client-side.
 */
import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker to use the CDN matching the installed version
// This avoids complex Vite/Webpack worker bundling issues and ensures the worker is always available
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export const extractTextFromPDF = async (file, onProgress) => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    let extractedText = '';

    if (numPages === 0) {
      throw new Error("The PDF appears to be empty.");
    }

    // Process pages sequentially to maintain order and report progress
    for (let i = 1; i <= numPages; i++) {
      if (onProgress) {
        // Calculate percentage based on pages parsed
        onProgress(Math.round(((i - 1) / numPages) * 100));
      }
      
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      
      // Map text items and attempt to preserve basic structure (spaces/paragraphs)
      // textContent.items contains the text objects on the page
      const pageText = textContent.items.map(item => item.str).join(' ');
      extractedText += pageText + '\n\n';
    }

    if (onProgress) onProgress(100);

    const final = extractedText.trim();
    if (!final) throw new Error("No readable text found in this PDF. It might consist entirely of scanned images without embedded text.");
    
    return final;
  } catch (error) {
    console.error("PDF Extraction Error:", error);
    throw new Error(error.message || "Failed to extract text from PDF.");
  }
};
