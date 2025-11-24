import React, { useState, useEffect } from 'react';
import { ArrowRight, Layers, CheckSquare, Square, Check } from 'lucide-react';

interface SheetSelectorProps {
  sheets: string[];
  onNext: (selected: string[]) => void;
  onBack: () => void;
}

export const SheetSelector: React.FC<SheetSelectorProps> = ({ sheets, onNext, onBack }) => {
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (sheets.length > 0) setSelected(sheets);
  }, [sheets]);

  const toggleSheet = (sheet: string) => {
    setSelected(prev =>
      prev.includes(sheet) ? prev.filter(s => s !== sheet) : [...prev, sheet]
    );
  };

  const handleSelectAll = () => setSelected(sheets);
  const handleDeselectAll = () => setSelected([]);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-50 rounded-xl">
           <Layers className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Select Sheets</h2>
           <p className="text-slate-500 mt-1">Which sheets contain the student data?</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-500">{selected.length} Selected</span>
        <div className="flex gap-4 text-sm font-medium">
            <button 
                onClick={handleSelectAll} 
                className="text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
            >
                Select All
            </button>
            <button 
                onClick={handleDeselectAll} 
                className="text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-colors"
            >
                Deselect All
            </button>
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto mb-10 pr-2 custom-scrollbar">
        {sheets.map(sheet => {
           const isSelected = selected.includes(sheet);
           return (
            <div 
                key={sheet}
                onClick={() => toggleSheet(sheet)}
                className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all duration-200 group ${
                    isSelected 
                        ? 'border-indigo-600 bg-indigo-50/50' 
                        : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
                <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected 
                        ? 'bg-indigo-600 border-indigo-600' 
                        : 'border-slate-300 bg-white group-hover:border-slate-400'
                }`}>
                    {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>
                <span className={`ml-4 font-semibold text-lg ${isSelected ? 'text-indigo-900' : 'text-slate-600'}`}>
                    {sheet}
                </span>
            </div>
           );
        })}
        {sheets.length === 0 && (
          <div className="p-8 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No sheets found in this file.
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <button onClick={onBack} className="text-slate-500 font-semibold hover:text-slate-800 px-6 py-3 hover:bg-slate-100 rounded-xl transition">
          Back
        </button>
        <button
          onClick={() => onNext(selected)}
          disabled={selected.length === 0}
          className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
            selected.length > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          Next Step
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};