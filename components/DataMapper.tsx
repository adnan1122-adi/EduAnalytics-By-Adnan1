import React, { useState, useEffect } from 'react';
import { RawRow, ColumnMapping } from '../types';
import { ArrowRight, CheckCircle2, AlertCircle, Database } from 'lucide-react';

interface DataMapperProps {
  headers: string[];
  sampleRow: RawRow;
  onConfirm: (mapping: ColumnMapping) => void;
  onBack: () => void;
}

export const DataMapper: React.FC<DataMapperProps> = ({ headers, sampleRow, onConfirm, onBack }) => {
  const [mapping, setMapping] = useState<ColumnMapping>({
    nameCol: '',
    classCol: '',
    componentCols: [],
    totalCol: null
  });

  // Auto-detect columns
  useEffect(() => {
    const newMapping = { ...mapping };
    const numericHeaders = headers.filter(h => {
      const val = sampleRow[h];
      return typeof val === 'number' || (typeof val === 'string' && !isNaN(parseFloat(val)));
    });

    newMapping.nameCol = headers.find(h => /name|student|candidate/i.test(h)) || headers[0] || '';
    newMapping.classCol = headers.find(h => /class|grade|section|batch/i.test(h)) || '';
    
    // Prioritize "Overall Score" or "Quarter 1" as requested, then fallback to standard identifiers
    let total = headers.find(h => /overall score|quarter 1/i.test(h));
    if (!total) {
        total = headers.find(h => /total|final mark|sum|score/i.test(h));
    }

    if (total) newMapping.totalCol = total;
    
    // Components should be numeric columns that are not the total column and not ID/phone
    newMapping.componentCols = numericHeaders.filter(h => h !== newMapping.totalCol && !/roll|id|phone/i.test(h));

    setMapping(newMapping);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [headers]);

  const handleComponentToggle = (header: string) => {
    setMapping(prev => ({
      ...prev,
      componentCols: prev.componentCols.includes(header) 
        ? prev.componentCols.filter(c => c !== header)
        : [...prev.componentCols, header]
    }));
  };

  const isValid = mapping.nameCol && mapping.componentCols.length > 0;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
       <div className="flex items-center gap-4 mb-8">
        <div className="p-3 bg-indigo-50 rounded-xl">
           <Database className="w-8 h-8 text-indigo-600" />
        </div>
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Map Data Columns</h2>
           <p className="text-slate-500 mt-1">Tell us which columns represent what data.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Student Name Column</label>
                <div className="relative">
                    <select 
                        value={mapping.nameCol} 
                        onChange={e => setMapping({...mapping, nameCol: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                    >
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                    <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">▼</div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Class/Grade Column (Optional)</label>
                <div className="relative">
                    <select 
                        value={mapping.classCol} 
                        onChange={e => setMapping({...mapping, classCol: e.target.value})}
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                    >
                        <option value="">-- None --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                     <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">▼</div>
                </div>
            </div>

            <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Total/Final Mark (Optional)</label>
                <div className="relative">
                    <select 
                        value={mapping.totalCol || ''} 
                        onChange={e => setMapping({...mapping, totalCol: e.target.value || null})}
                        className="w-full p-3 border border-slate-200 rounded-xl text-slate-700 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all appearance-none"
                    >
                        <option value="">-- Auto Calculate Sum --</option>
                        {headers.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                     <div className="absolute right-3 top-3.5 pointer-events-none text-slate-400">▼</div>
                </div>
            </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
          <h3 className="text-base font-bold text-slate-800 mb-3 flex items-center gap-2">
            Assessment Components
          </h3>
          <p className="text-sm text-slate-500 mb-4">Select the columns that contain marks (e.g. Quiz 1, Midterm).</p>
          
          <div className="flex flex-wrap gap-2">
            {headers.map(h => (
              <button
                key={h}
                onClick={() => handleComponentToggle(h)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                  mapping.componentCols.includes(h)
                    ? 'bg-white border-indigo-600 text-indigo-700 shadow-sm ring-1 ring-indigo-600'
                    : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
                }`}
              >
                {h}
              </button>
            ))}
          </div>
          {mapping.componentCols.length === 0 && (
            <div className="flex items-center gap-2 mt-4 text-amber-600 text-sm bg-amber-50 p-3 rounded-lg border border-amber-100">
              <AlertCircle className="w-4 h-4" />
              Please select at least one component.
            </div>
          )}
        </div>
      </div>

      <div className="mt-10 flex justify-between items-center pt-6 border-t border-slate-100">
        <button onClick={onBack} className="text-slate-500 font-semibold hover:text-slate-800 px-6 py-3 hover:bg-slate-100 rounded-xl transition">
          Back
        </button>
        <button
          onClick={() => isValid && onConfirm(mapping)}
          disabled={!isValid}
          className={`flex items-center gap-3 px-8 py-4 rounded-xl font-bold text-lg transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 ${
            isValid 
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200' 
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          Generate Analysis
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};