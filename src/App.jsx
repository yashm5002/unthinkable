/**
 * Main Application Component.
 * Manages state for file uploading, text extraction, API calls, and handles fallback logic.
 */
import React, { useState, useEffect } from 'react';
import Uploader from './components/Uploader';
import LoadingState from './components/LoadingState';
import SummaryView from './components/SummaryView';
import ErrorBanner from './components/ErrorBanner';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import { extractTextFromPDF } from './utils/pdfExtractor';
import { extractTextFromImage } from './utils/ocrExtractor';
import { generateOfflineSummary } from './utils/offlineSummarizer';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [username, setUsername] = useState(localStorage.getItem('username') || null);
  
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | extracting | summarizing | success
  const [progress, setProgress] = useState(null);
  const [extractedText, setExtractedText] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [summaryLength, setSummaryLength] = useState('long');
  const [error, setError] = useState(null);
  const [isFallback, setIsFallback] = useState(false);
  const [sessionCache, setSessionCache] = useState({});
  
  // History specific state
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const getHistoryKey = (user) => `summary_history_${user || 'guest'}`;
  
  const [history, setHistory] = useState([]);

  // Load history when the user logs in
  useEffect(() => {
    if (username) {
      const saved = localStorage.getItem(getHistoryKey(username));
      setHistory(saved ? JSON.parse(saved) : []);
    } else {
      setHistory([]);
    }
  }, [username]);

  // Save history to localStorage when it changes
  useEffect(() => {
    if (username) {
      localStorage.setItem(getHistoryKey(username), JSON.stringify(history));
    }
  }, [history, username]);

  const handleLogin = (newToken, newUsername) => {
    setToken(newToken);
    setUsername(newUsername);
    localStorage.setItem('token', newToken);
    localStorage.setItem('username', newUsername);
  };

  const handleLogout = () => {
    setToken(null);
    setUsername(null);
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    resetState();
    setSelectedHistoryItem(null);
  };

  const resetState = () => {
    setFile(null);
    setStatus('idle');
    setProgress(null);
    setExtractedText('');
    setSummaryData(null);
    setError(null);
    setIsFallback(false);
    setSelectedHistoryItem(null);
    setIsMobileMenuOpen(false);
    setSessionCache({});
  };

  const handleFileSelect = async (selectedFile) => {
    resetState();
    setFile(selectedFile);
    setStatus('extracting');
    setError(null);
    
    try {
      let text = '';
      if (selectedFile.type === 'application/pdf') {
        text = await extractTextFromPDF(selectedFile, (p) => setProgress(p));
      } else if (selectedFile.type.startsWith('image/')) {
        text = await extractTextFromImage(selectedFile, (p) => setProgress(p));
      } else {
        throw new Error("Unsupported file type selected during extraction.");
      }

      setExtractedText(text);
      setSessionCache({});
      await fetchSummary(text, summaryLength, selectedFile.name);
      
    } catch (err) {
      console.error(err);
      setError(err.message || "An error occurred while reading the file.");
      setStatus('idle');
    }
  };

  const saveToHistory = (data, length, filename, fallbackFlag) => {
    const newEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      filename: filename || 'Unknown Document',
      length,
      data,
      isFallback: fallbackFlag
    };
    setHistory(prev => [newEntry, ...prev]);
  };

  const fetchSummary = async (text, length, filename = file?.name) => {
    setStatus('summarizing');
    setProgress(null);
    setError(null);

    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ text, length })
      });

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        if (!response.ok) {
          throw new Error(`Server returned ${response.status} ${response.statusText}`);
        }
        throw new Error('Received invalid JSON from server.');
      }

      if (response.status === 401) {
        handleLogout();
        throw new Error("Session expired. Please log in again.");
      }

      if (!response.ok) {
        if (data.fallback) {
          console.warn(`API requested fallback. Using offline summarizer. Reason: ${data.error}`);
          triggerOfflineFallback(text, length, filename);
          return;
        }
        throw new Error(data.error || 'Failed to generate summary.');
      }

      // The API now returns a single summary for the requested length
      setSessionCache(prev => ({
        ...prev,
        [length]: { data, isFallback: false }
      }));
      setSummaryData(data); // Render the currently selected length
      setIsFallback(false);
      setStatus('success');
      
      saveToHistory(data, length, filename, false);
    } catch (err) {
      console.error("Network or API Error:", err);
      if (err.message.includes("Session expired")) {
        setError(err.message);
        setStatus('idle');
      } else {
        triggerOfflineFallback(text, length, filename);
      }
    }
  };

  const triggerOfflineFallback = (text, length, filename = file?.name) => {
    try {
      setIsFallback(true);
      const data = generateOfflineSummary(text, length);
      setSummaryData(data);
      setSessionCache(prev => ({ ...prev, [length]: { data, isFallback: true } }));
      setStatus('success');
      saveToHistory(data, length, filename, true);
    } catch (fallbackErr) {
      setError("Both primary and offline summarization failed. The document might be unreadable.");
      setStatus('idle');
    }
  };

  const handleLengthChange = (newLength) => {
    setSummaryLength(newLength);
    if (extractedText && !selectedHistoryItem) {
      if (sessionCache[newLength]) {
        // Use cached response instantly without API call or History save
        setSummaryData(sessionCache[newLength].data);
        setIsFallback(sessionCache[newLength].isFallback);
        setStatus('success');
      } else if (isFallback) {
        triggerOfflineFallback(extractedText, newLength);
      } else {
        fetchSummary(extractedText, newLength);
      }
    }
  };

  const handleHistorySelect = (item) => {
    setSelectedHistoryItem(item);
    setIsMobileMenuOpen(false);
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
        <header className="bg-white border-b border-slate-200">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">DocuSumm</h1>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <Login onLogin={handleLogin} />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              className="md:hidden p-2 text-slate-500 hover:bg-slate-100 rounded-md"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-sm">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight hidden sm:block">
                DocuSumm
              </h1>
            </div>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-slate-700 leading-tight">{username}</span>
                <span className="text-xs text-slate-500 leading-tight">Pro Member</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 text-white flex items-center justify-center font-bold text-sm shadow-sm ring-2 ring-white">
                {username ? username.charAt(0).toUpperCase() : 'U'}
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ml-1"
              title="Logout"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex max-w-7xl mx-auto w-full relative">
        {/* Mobile Sidebar Overlay */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 md:hidden bg-slate-900/50" onClick={() => setIsMobileMenuOpen(false)} />
        )}
        
        {/* Sidebar */}
        <div className={`fixed inset-y-0 left-0 z-40 w-80 bg-white transform transition-transform duration-300 ease-in-out md:relative md:transform-none ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'} border-r border-slate-200 h-[calc(100vh-4rem)] md:flex flex-shrink-0`}>
          <div className="w-full">
             <Sidebar 
               history={history} 
               selectedId={selectedHistoryItem?.id}
               onSelect={handleHistorySelect} 
               onNew={resetState}
               onClear={() => setHistory([])}
             />
          </div>
        </div>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto h-[calc(100vh-4rem)] w-full relative p-4 sm:p-6 lg:p-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <ErrorBanner message={error} onDismiss={() => setError(null)} />

            {selectedHistoryItem ? (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <SummaryView 
                  data={selectedHistoryItem.data}
                  length={selectedHistoryItem.length}
                  onLengthChange={() => {}} // Disabled for historical items
                  onReset={resetState}
                  isFallback={selectedHistoryItem.isFallback}
                />
              </div>
            ) : (
              <>
                {status === 'idle' && (
                  <div className="animate-in fade-in zoom-in-95 duration-300">
                    <div className="text-center mb-8 mt-4">
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mb-4">
                        Unlock insights instantly.
                      </h2>
                      <p className="text-lg text-slate-500 max-w-2xl mx-auto">
                        Upload your dense reports, PDFs, or images and let our AI distill them into clear, actionable summaries in seconds.
                      </p>
                    </div>
                    <Uploader onFileSelect={handleFileSelect} onError={setError} />
                  </div>
                )}

                {status === 'extracting' && (
                  <div className="animate-in fade-in duration-300 pt-12">
                    <LoadingState 
                      message={`Extracting text from ${file?.name}...`} 
                      progress={progress} 
                    />
                  </div>
                )}

                {status === 'summarizing' && (
                  <div className="animate-in fade-in duration-300 pt-12">
                    <LoadingState message="Analyzing and generating summary..." progress={null} />
                  </div>
                )}

                {status === 'success' && summaryData && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <SummaryView 
                      data={summaryData}
                      length={summaryLength}
                      onLengthChange={handleLengthChange}
                      onReset={resetState}
                      isFallback={isFallback}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
