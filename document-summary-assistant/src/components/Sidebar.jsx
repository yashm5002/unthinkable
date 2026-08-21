import React from 'react';

export default function Sidebar({ history, onSelect, selectedId, onNew, onClear }) {
  return (
    <aside className="w-full h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-100 flex flex-col gap-3">
        <button
          onClick={onNew}
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          New Summary
        </button>
        {history.length > 0 && (
          <div className="flex justify-between items-center px-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recent</span>
            <button onClick={onClear} className="text-xs text-slate-500 hover:text-red-600 transition-colors">Clear</button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {history.length === 0 ? (
          <div className="text-center py-8 px-4">
            <p className="text-sm text-slate-500">No summaries yet.</p>
          </div>
        ) : (
          history.map((item) => {
            const date = new Date(item.date);
            const isToday = date.toDateString() === new Date().toDateString();
            const displayDate = isToday 
              ? `Today at ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`
              : date.toLocaleDateString([], { month: 'short', day: 'numeric' });

            const isSelected = selectedId === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onSelect(item)}
                className={`w-full text-left px-3 py-3 rounded-lg transition-colors flex flex-col gap-1 ${
                  isSelected ? 'bg-indigo-50 border border-indigo-100' : 'hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex justify-between items-start">
                  <span className={`text-sm font-semibold truncate pr-2 ${isSelected ? 'text-indigo-900' : 'text-slate-700'}`} title={item.filename}>
                    {item.filename}
                  </span>
                  <span className="text-[10px] font-medium text-slate-400 whitespace-nowrap pt-0.5">
                    {displayDate}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${isSelected ? 'text-indigo-600' : 'text-slate-500'} line-clamp-1`}>
                    {item.data?.summaryParagraphs?.[0] || 'View summary...'}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
