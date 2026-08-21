/**
 * Component for file upload (drag & drop and file selection).
 * Props:
 * - onFileSelect: Callback triggered when a valid file is selected.
 * - onError: Callback to report validation errors up to the parent.
 */
import React, { useCallback, useRef, useState } from 'react';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB limit to prevent browser/memory crashes
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];

export default function Uploader({ onFileSelect, onError }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateAndProcessFile = (file) => {
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      onError(`Unsupported file type: ${file.name}. Please upload a PDF, PNG, or JPEG.`);
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      onError(`File too large: ${file.name}. Maximum size is 10MB to ensure smooth processing.`);
      return;
    }

    // Clear any previous errors
    onError(null);
    onFileSelect(file);
  };

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      // Process the first file only
      validateAndProcessFile(e.dataTransfer.files[0]);
    }
  }, [onError, onFileSelect]);

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFile(e.target.files[0]);
    }
  };

  return (
    <div 
      className={`relative flex flex-col items-center justify-center p-12 md:p-16 border-2 border-dashed rounded-2xl transition-all duration-200
        ${isDragging 
          ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]' 
          : 'border-slate-300 bg-white hover:border-slate-400 hover:bg-slate-50 shadow-sm'}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className={`p-4 rounded-full mb-5 transition-colors duration-200 ${isDragging ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
      </div>
      
      <h3 className="text-xl font-semibold text-slate-900 tracking-tight">Upload a document</h3>
      <p className="mt-2 text-sm text-slate-500 text-center max-w-xs">
        Drag and drop your file here, or click to browse. Supports PDF, PNG, and JPEG up to 10MB.
      </p>

      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept=".pdf,.png,.jpg,.jpeg"
        onChange={handleFileInput}
      />
      
      <button 
        onClick={() => fileInputRef.current?.click()}
        className="mt-8 px-6 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-semibold hover:bg-slate-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-sm"
      >
        Browse Files
      </button>
    </div>
  );
}
