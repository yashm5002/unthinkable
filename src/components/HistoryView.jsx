import React from 'react';

export default function HistoryView({ history, onClear }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-slate-900">No history yet</h3>
        <p className="mt-2 text-sm text-slate-500 max-w-sm text-center">
          Any document summaries you generate will be securely stored here for future reference.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Your Summaries
        </h3>
        <button
          onClick={onClear}
          className="text-sm px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg font-medium transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {history.map((item) => {
          const date = new Date(item.date);
          const isToday = date.toDateString() === new Date().toDateString();
          const displayDate = isToday 
            ? `Today at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
            : date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });

          return (
            <div 
              key={item.id} 
              className="group bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 overflow-hidden flex flex-col"
            >
              {/* Card Header */}
              <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <h4 className="text-base font-semibold text-slate-900 truncate" title={item.filename}>
                    {item.filename}
                  </h4>
                  <span className="text-xs font-medium text-slate-500 mt-1 block">
                    {displayDate}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5 items-end flex-shrink-0">

                  {item.isFallback && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700">
                      Offline
                    </span>
                  )}
                </div>
              </div>

              {/* Card Body (Preview) */}
              <div className="p-6 flex-1 bg-white">
                <div className="relative text-sm text-slate-600 leading-relaxed line-clamp-4">
                  {item.data?.summaryParagraphs?.[0] || "No summary content available."}
                  {/* Fade out effect for long text */}
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                </div>
                
                {item.data?.keyPoints?.length > 0 && (
                  <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-500">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                    </svg>
                    {item.data.keyPoints.length} Key Points Extracted
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
