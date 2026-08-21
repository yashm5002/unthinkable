import React from 'react';

export default function SummaryView({ data, length, onLengthChange, onReset, isFallback }) {
  const { summary, summaryParagraphs, keyPoints } = data;
  
  // Backwards compatibility if old API response is cached
  const paragraphs = summaryParagraphs || [summary];

  return (
    <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-xl font-bold text-slate-800 flex flex-wrap items-center gap-3">
          <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Document Summary
          {isFallback && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200 shadow-sm">
              Offline Mode
            </span>
          )}
        </h2>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-500">Length:</span>
          <div className="flex bg-slate-200 p-1 rounded-lg">
            {['short', 'long'].map(option => (
              <button
                key={option}
                onClick={() => onLengthChange(option)}
                className={`px-4 py-1.5 text-sm font-semibold rounded-md capitalize transition-all duration-200 ${
                  length === option 
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-slate-900/5' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300/50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 md:p-8 flex-1 bg-white">
        <div className="space-y-10 max-w-3xl mx-auto">
          
          {/* Overview Section */}
          <section>
            <div className="flex items-center gap-3 mb-5">
              <div className="bg-indigo-100 p-2 rounded-lg shadow-sm">
                <svg className="w-5 h-5 text-indigo-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800 tracking-tight">Overview</h3>
            </div>
            <div className="bg-slate-50/80 rounded-xl p-6 md:p-8 border border-slate-100 shadow-inner">
              <div className="space-y-5">
                {paragraphs.map((para, i) => (
                  <p 
                    key={i} 
                    className={`text-slate-700 leading-relaxed text-[1.05rem] ${
                      i === 0 ? 'first-letter:text-5xl first-letter:font-black first-letter:text-indigo-600 first-letter:mr-2 first-letter:float-left first-letter:leading-none' : ''
                    }`}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </section>

          {/* Key Points Section */}
          {keyPoints && keyPoints.length > 0 && (
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-100 p-2 rounded-lg shadow-sm">
                  <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-slate-800 tracking-tight">Key Points</h3>
              </div>
              <div className="bg-slate-50/80 rounded-xl p-6 md:p-8 border border-slate-100 shadow-inner">
                <div className="space-y-3">
                  {keyPoints.map((point, index) => (
                    <details key={index} className="group bg-white rounded-lg border border-slate-200 shadow-sm [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between cursor-pointer p-4 font-semibold text-slate-800 select-none">
                        <div className="flex items-center gap-3">
                          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                            {index + 1}
                          </span>
                          <span className="text-[1.05rem]">
                            {typeof point === 'string' ? point : point.title}
                          </span>
                        </div>
                        <svg className="w-5 h-5 text-slate-400 group-open:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                        </svg>
                      </summary>
                      <div className="px-4 pb-5 pt-1 pl-14 text-slate-600 text-[1rem] leading-relaxed border-t border-slate-50 mt-1">
                        {typeof point === 'string' ? 'No further details available.' : point.details}
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
        
        {/* Footer Action */}
        <div className="mt-12 pt-6 border-t border-slate-100 flex justify-center">
          <button 
            onClick={onReset}
            className="inline-flex items-center gap-2 px-6 py-2.5 border border-slate-300 text-slate-700 bg-white rounded-lg text-sm font-semibold hover:bg-slate-50 hover:text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Summarize Another Document
          </button>
        </div>
      </div>
    </div>
  );
}
