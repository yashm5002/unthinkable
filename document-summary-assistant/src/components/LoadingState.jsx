/**
 * Component to display loading state and progress.
 * Props:
 * - message: Describe what is currently loading (e.g., "Extracting text...").
 * - progress: Number (0-100) representing completion percentage, or null for indeterminate.
 */
import React from 'react';

export default function LoadingState({ message, progress }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-200 shadow-sm">
      {/* Spinner */}
      <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-indigo-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      
      <h3 className="text-lg font-medium text-slate-800">{message}</h3>
      
      {/* Optional Progress Bar */}
      {progress !== null && progress !== undefined && (
        <div className="w-full max-w-xs mt-4">
          <div className="bg-slate-200 rounded-full h-2.5 w-full overflow-hidden">
            <div 
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300 ease-out" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-sm text-slate-500 mt-2 text-center">{progress}%</p>
        </div>
      )}
    </div>
  );
}
