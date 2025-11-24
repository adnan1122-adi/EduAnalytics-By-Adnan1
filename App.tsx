import React, { useState, useMemo } from 'react';
import { FileUpload } from './components/FileUpload';
import { SheetSelector } from './components/SheetSelector';
import { DataMapper } from './components/DataMapper';
import { ChartsPanel } from './components/ChartsPanel';
import { StudentTable } from './components/StudentTable';
import { ActionPlan } from './components/ActionPlan';
import { RawRow, ColumnMapping, StudentData } from './types';
import { performFullAnalysis, determineGroup } from './services/analysisUtils';
import { LayoutDashboard, Table2, BrainCircuit, GraduationCap, Filter } from 'lucide-react';

const App: React.FC = () => {
  const [step, setStep] = useState<number>(1);
  const [rawSheetData, setRawSheetData] = useState<{ [key: string]: RawRow[] }>({});
  const [selectedSheetNames, setSelectedSheetNames] = useState<string[]>([]);
  
  // State for data and filtering
  const [allStudents, setAllStudents] = useState<StudentData[]>([]);
  const [sheetFilter, setSheetFilter] = useState<string>('All');
  const [totalColName, setTotalColName] = useState<string>('Overall Score');
  
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'ai'>('dashboard');

  const onDataLoaded = (data: { [key: string]: RawRow[] }) => {
    setRawSheetData(data);
    setStep(2); 
  };

  const onSheetsConfirmed = (selected: string[]) => {
    setSelectedSheetNames(selected);
    setStep(3); 
  };

  const getSmartValue = (row: RawRow, colName: string): string | number | undefined | null => {
    // 1. Exact match
    if (Object.prototype.hasOwnProperty.call(row, colName)) {
      return row[colName];
    }
    // 2. Case-insensitive match
    const lowerColName = colName.toLowerCase().trim();
    const foundKey = Object.keys(row).find(k => k.toLowerCase().trim() === lowerColName);
    if (foundKey) {
        return row[foundKey];
    }
    return undefined;
  };

  const onMappingConfirmed = (mapping: ColumnMapping) => {
    // Update the total column name based on selection or default
    setTotalColName(mapping.totalCol || 'Overall Score');

    let allRows: RawRow[] = [];
    selectedSheetNames.forEach(sheet => {
      // Ensure we preserve the sheet source
      const rows = (rawSheetData[sheet] || []).map(r => ({ ...r, SheetSource: sheet }));
      allRows = [...allRows, ...rows];
    });

    // Process rows first, then filter out invalid ones
    const processedStudents: StudentData[] = allRows
      .map((row, idx) => {
        // Smart retrieval of name
        const rawName = getSmartValue(row, mapping.nameCol);
        const name = rawName ? String(rawName) : '';
        
        const sheetName = String(row['SheetSource'] || 'Unknown');
        
        // Smart retrieval of class
        let className = sheetName;
        if (mapping.classCol) {
            const rawClass = getSmartValue(row, mapping.classCol);
            if (rawClass) className = String(rawClass);
        }
        
        const components: { [key: string]: number } = {};
        let sumComponents = 0;
        
        mapping.componentCols.forEach(col => {
          const rawVal = getSmartValue(row, col);
          const val = parseFloat(String(rawVal || '0'));
          const cleanVal = isNaN(val) ? 0 : val;
          components[col] = cleanVal;
          sumComponents += cleanVal;
        });

        let total = sumComponents;
        if (mapping.totalCol) {
          const rawTotal = getSmartValue(row, mapping.totalCol);
          const tVal = parseFloat(String(rawTotal));
          if (!isNaN(tVal)) total = tVal;
        }

        return {
          id: `s-${sheetName}-${idx}`,
          name,
          class: className,
          components,
          totalScore: total,
          maxPossibleScore: 100, 
          percentage: total, 
          group: determineGroup(total),
          originalRow: row,
          sheetName
        };
      })
      .filter(student => student.name && student.name.trim() !== ''); // Only keep students with a valid name

    setAllStudents(processedStudents);
    setSheetFilter('All');
    setStep(4);
  };

  // Dynamic Analysis based on Filter
  const filteredStudents = useMemo(() => {
    if (sheetFilter === 'All') return allStudents;
    return allStudents.filter(s => s.sheetName === sheetFilter);
  }, [allStudents, sheetFilter]);

  const analysis = useMemo(() => {
    if (filteredStudents.length === 0) return null;
    const result = performFullAnalysis(filteredStudents);
    return { ...result, students: filteredStudents };
  }, [filteredStudents]);

  const getHeaders = () => {
    if (selectedSheetNames.length === 0) return [];
    // Use the first selected sheet to define the master schema
    const firstSheetName = selectedSheetNames[0];
    const firstSheetRows = rawSheetData[firstSheetName];
    if (!firstSheetRows || firstSheetRows.length === 0) return [];
    return Object.keys(firstSheetRows[0]);
  };

  const getSampleRow = () => {
    if (selectedSheetNames.length === 0) return {};
    const firstSheetName = selectedSheetNames[0];
    return rawSheetData[firstSheetName][0] || {};
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20 selection:bg-indigo-100 selection:text-indigo-700">
      
      {/* Modern Glass Header */}
      <header className="sticky top-0 z-40 w-full backdrop-blur-lg bg-white/80 border-b border-slate-200/60 transition-all duration-200 supports-[backdrop-filter]:bg-white/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-2 rounded-lg shadow-md shadow-indigo-500/20">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 tracking-tight">
              EduAnalytics AI
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            {step === 4 && selectedSheetNames.length > 1 && (
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 rounded-full px-3 py-1 border border-slate-200">
                <Filter className="w-4 h-4 text-slate-500" />
                <select 
                  value={sheetFilter} 
                  onChange={(e) => setSheetFilter(e.target.value)}
                  className="bg-transparent border-none text-sm font-semibold text-slate-700 focus:ring-0 cursor-pointer outline-none min-w-[120px]"
                >
                  <option value="All">All Sheets ({selectedSheetNames.length})</option>
                  {selectedSheetNames.map(name => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            )}
            
            {step === 4 && (
              <button 
                onClick={() => { setStep(1); setAllStudents([]); setSelectedSheetNames([]); }}
                className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-full transition-all"
              >
                New Analysis
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        
        {step === 1 && (
          <div className="max-w-2xl mx-auto mt-16 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-extrabold text-slate-900 mb-6 tracking-tight">
                Academic Intelligence <br className="hidden sm:block"/>
                <span className="text-indigo-600">Simplified.</span>
              </h2>
              <p className="text-lg text-slate-500 max-w-lg mx-auto leading-relaxed">
                Upload your gradebook to instantly generate professional visualizations and AI-driven differentiated action plans.
              </p>
            </div>
            <FileUpload onDataLoaded={onDataLoaded} />
          </div>
        )}

        {step === 2 && (
          <div className="mt-8">
            <SheetSelector 
                sheets={Object.keys(rawSheetData)} 
                onNext={onSheetsConfirmed}
                onBack={() => setStep(1)}
            />
          </div>
        )}

        {step === 3 && (
          <div className="mt-8">
            <DataMapper 
              headers={getHeaders()} 
              sampleRow={getSampleRow()} 
              onConfirm={onMappingConfirmed} 
              onBack={() => setStep(2)}
            />
          </div>
        )}

        {step === 4 && analysis && (
          <div className="space-y-8 animate-in fade-in duration-500">
            
            {/* Mobile Filter (Visible only on small screens) */}
            {selectedSheetNames.length > 1 && (
               <div className="sm:hidden mb-4">
                 <select 
                    value={sheetFilter} 
                    onChange={(e) => setSheetFilter(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl text-slate-700 shadow-sm font-semibold"
                  >
                    <option value="All">All Sheets</option>
                    {selectedSheetNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
               </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex p-1.5 bg-slate-100/80 backdrop-blur-sm rounded-full shadow-inner border border-slate-200">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'dashboard' 
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'students' 
                      ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Table2 className="w-4 h-4" /> Student List
                </button>
                <button
                  onClick={() => setActiveTab('ai')}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-200 ${
                    activeTab === 'ai' 
                      ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <BrainCircuit className="w-4 h-4" /> AI Action Plan
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div className="min-h-[500px]">
              {activeTab === 'dashboard' && (
                <ChartsPanel 
                  analysis={analysis} 
                  sourceName={sheetFilter === 'All' ? 'All Sheets' : sheetFilter} 
                  totalScoreName={totalColName}
                />
              )}
              {activeTab === 'students' && (
                <StudentTable 
                  students={analysis.students} 
                  totalScoreHeader={totalColName} 
                />
              )}
              {activeTab === 'ai' && <ActionPlan key={sheetFilter} analysis={analysis} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;