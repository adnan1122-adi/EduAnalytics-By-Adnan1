import React, { useState, useMemo, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, RadarChart, Radar, PolarGrid, 
  PolarAngleAxis, PolarRadiusAxis, ScatterChart, Scatter, ZAxis
} from 'recharts';
import { FullAnalysis, StudentPerformanceGroup, StudentData } from '../types';
import { 
  FileText, Table as TableIcon, BarChart3, PieChart as PieChartIcon, 
  LineChart as LineChartIcon, Activity, FileDown, GitCompare, Info, 
  Users, Award, TrendingUp, CircleDot
} from 'lucide-react';
import { exportToPDF, exportToWord } from '../services/exportUtils';
import { calculateCorrelation } from '../services/analysisUtils';

interface ChartsPanelProps {
  analysis: FullAnalysis;
  sourceName: string;
  totalScoreName?: string;
}

const COLORS = {
  grade: ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444'], // A to F
  components: '#6366f1'
};

const GROUP_COLORS: { [key: string]: string } = {
  [StudentPerformanceGroup.HighAchiever]: '#10b981', // Emerald
  [StudentPerformanceGroup.AboveAverage]: '#06b6d4', // Cyan
  [StudentPerformanceGroup.Average]: '#6366f1',      // Indigo
  [StudentPerformanceGroup.BelowAverage]: '#f59e0b', // Amber
  [StudentPerformanceGroup.AtRisk]: '#ef4444',       // Red
};

type ComponentChartType = 'bar' | 'line' | 'area' | 'radar';
type CorrelationChartType = 'scatter' | 'bar' | 'line' | 'area';

export const ChartsPanel: React.FC<ChartsPanelProps> = ({ analysis, sourceName, totalScoreName = 'Overall Score' }) => {
  const [componentChartType, setComponentChartType] = useState<ComponentChartType>('bar');
  const [correlationChartType, setCorrelationChartType] = useState<CorrelationChartType>('scatter');
  
  // Correlation State
  const [scatterX, setScatterX] = useState<string>('');
  const [scatterY, setScatterY] = useState<string>(totalScoreName);

  const componentKeys = useMemo(() => {
    return analysis.componentStats.map(c => c.name);
  }, [analysis]);

  // Validate and set default scatter axes whenever keys or total name change
  useEffect(() => {
    const validKeys = [totalScoreName, ...componentKeys];
    
    // Check if current values are valid (exists in new keys), if not, reset them
    const isXValid = scatterX && validKeys.includes(scatterX);
    const isYValid = scatterY && validKeys.includes(scatterY);

    if (!isXValid) {
      // Default X to first component if available, else total
      setScatterX(componentKeys.length > 0 ? componentKeys[0] : totalScoreName);
    }

    if (!isYValid) {
      // Default Y to total
      setScatterY(totalScoreName);
    }
  }, [componentKeys, totalScoreName, scatterX, scatterY]);

  // Prepare Grade Distribution Data
  const gradeData = Object.entries(analysis.summary.gradeDist).map(([grade, count]) => ({
    grade, count
  }));

  // Prepare Group Distribution
  const groupCounts = analysis.students.reduce((acc, student) => {
    acc[student.group] = (acc[student.group] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const groupData = Object.values(StudentPerformanceGroup).map((group) => ({
    name: group,
    value: groupCounts[group] || 0
  }));

  // Helper to get value from student object
  const getStudentValue = (student: StudentData, key: string) => {
    // If the key matches the total score name, return total score
    if (key === totalScoreName) return student.totalScore;
    
    // Check if it is a component
    if (student.components[key] !== undefined) {
        return student.components[key];
    }
    
    // Fallback for "Total Score" legacy default or if name matches
    if (key === 'Total Score') return student.totalScore;
    
    return 0;
  };

  // Prepare Scatter Data
  const scatterData = useMemo(() => {
    return analysis.students.map(s => ({
      name: s.name,
      x: getStudentValue(s, scatterX),
      y: getStudentValue(s, scatterY),
      group: s.group
    }));
  }, [analysis.students, scatterX, scatterY, totalScoreName]);

  // Calculate Dynamic Correlation
  const correlationValue = useMemo(() => {
    const xVals = scatterData.map(d => d.x);
    const yVals = scatterData.map(d => d.y);
    return calculateCorrelation(xVals, yVals);
  }, [scatterData]);

  const getCorrelationStrength = (r: number) => {
    const abs = Math.abs(r);
    if (abs > 0.7) return { text: 'Strong', color: 'text-emerald-600', bg: 'bg-emerald-50' };
    if (abs > 0.4) return { text: 'Moderate', color: 'text-indigo-600', bg: 'bg-indigo-50' };
    return { text: 'Weak', color: 'text-slate-500', bg: 'bg-slate-100' };
  };

  const strength = getCorrelationStrength(correlationValue);

  const renderComponentChart = () => {
    const data = analysis.componentStats;
    
    switch (componentChartType) {
      case 'line':
        return (
          <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              tick={{fill: '#64748b', fontSize: 11}} 
              axisLine={false} 
              tickLine={false} 
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend />
            <Line type="monotone" dataKey="mean" name="Average Score" stroke="#6366f1" strokeWidth={3} activeDot={{ r: 8 }} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} />
          </LineChart>
        );
      case 'area':
        return (
          <AreaChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              tick={{fill: '#64748b', fontSize: 11}} 
              axisLine={false} 
              tickLine={false} 
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend />
            <defs>
              <linearGradient id="colorMean" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="mean" name="Average Score" stroke="#6366f1" fillOpacity={1} fill="url(#colorMean)" />
          </AreaChart>
        );
      case 'radar':
         return (
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="name" tick={{fill: '#64748b', fontSize: 11}} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} />
            <Radar name="Average Score" dataKey="mean" stroke="#6366f1" fill="#6366f1" fillOpacity={0.4} />
            <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend />
          </RadarChart>
        );
      default: // bar
        return (
          <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              tick={{fill: '#64748b', fontSize: 11}} 
              axisLine={false} 
              tickLine={false} 
              interval={0}
              angle={-45}
              textAnchor="end"
              height={60}
            />
            <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
            <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
            <Legend />
            <Bar dataKey="mean" name="Average Score" fill="#6366f1" radius={[6, 6, 0, 0]} />
          </BarChart>
        );
    }
  };

  const renderCorrelationChart = () => {
    // When using Bar/Line/Area for comparisons, we use Dual Axis to handle scale differences
    // (e.g. Quiz out of 10 vs Total out of 100)
    const ComparisonChart = correlationChartType === 'bar' ? BarChart : correlationChartType === 'line' ? LineChart : AreaChart;
    const DataComponent = correlationChartType === 'bar' ? Bar : correlationChartType === 'line' ? Line : Area;
    
    // Props for the data components
    const commonDataProps = {
      isAnimationActive: true,
      type: "monotone" // Ignored by Bar, used by Line/Area
    };

    if (correlationChartType === 'scatter') {
      return (
        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
                type="number" 
                dataKey="x" 
                name={scatterX} 
                tick={{fill: '#64748b', fontSize: 12}} 
                label={{ value: scatterX, position: 'insideBottom', offset: -10, fill: '#64748b' }} 
            />
            <YAxis 
                type="number" 
                dataKey="y" 
                name={scatterY} 
                tick={{fill: '#64748b', fontSize: 12}}
                label={{ value: scatterY, angle: -90, position: 'insideLeft', fill: '#64748b' }} 
            />
            <ZAxis dataKey="name" name="Student" />
            <Tooltip 
                cursor={{ strokeDasharray: '3 3' }} 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            />
            <Scatter name="Students" data={scatterData} fill="#10b981" />
        </ScatterChart>
      );
    }

    return (
      <ComparisonChart data={scatterData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
        <XAxis 
          dataKey="name" 
          tick={false} 
          axisLine={false} 
          label={{ value: 'Students (Individual)', position: 'insideBottom', offset: -5, fill: '#94a3b8', fontSize: 12 }}
        />
        <YAxis yAxisId="left" orientation="left" stroke="#6366f1" tick={{fill: '#6366f1'}} axisLine={false} tickLine={false} />
        <YAxis yAxisId="right" orientation="right" stroke="#10b981" tick={{fill: '#10b981'}} axisLine={false} tickLine={false} />
        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
        <Legend />
        
        {/* @ts-ignore - Dynamic component type handling */}
        <DataComponent 
          {...commonDataProps}
          yAxisId="left"
          dataKey="x" 
          name={scatterX} 
          fill="#6366f1" 
          stroke="#6366f1" 
          fillOpacity={correlationChartType === 'area' ? 0.3 : 1}
          radius={correlationChartType === 'bar' ? [4, 4, 0, 0] : 0}
          strokeWidth={2}
          dot={false}
        />
        {/* @ts-ignore */}
        <DataComponent 
          {...commonDataProps}
          yAxisId="right"
          dataKey="y" 
          name={scatterY} 
          fill="#10b981" 
          stroke="#10b981"
          fillOpacity={correlationChartType === 'area' ? 0.3 : 1} 
          radius={correlationChartType === 'bar' ? [4, 4, 0, 0] : 0}
          strokeWidth={2}
          dot={false}
        />
      </ComparisonChart>
    );
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-5 rounded-2xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Performance Dashboard</h2>
          <p className="text-sm text-slate-500">Comprehensive analysis of student academic data.</p>
        </div>
        <div className="flex gap-3">
             <button 
                onClick={() => exportToPDF('dashboard-content', `EduAnalytics_Report_${sourceName.replace(/\s+/g, '_')}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-900 transition-all text-sm font-bold shadow-lg shadow-slate-200 hover:shadow-xl hover:-translate-y-0.5"
            >
                <FileDown className="w-4 h-4" /> PDF Report
            </button>
             <button 
                onClick={() => exportToWord('dashboard-content', `EduAnalytics_Report_${sourceName.replace(/\s+/g, '_')}`)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-all text-sm font-bold shadow-lg shadow-indigo-200 hover:shadow-xl hover:-translate-y-0.5"
            >
                <FileText className="w-4 h-4" /> Word Report
            </button>
        </div>
      </div>

      <div id="dashboard-content" className="space-y-8 bg-slate-50/50 p-6 rounded-xl">
        
        {/* Report Header (Included in PDF) */}
        <div className="flex flex-col border-b border-slate-200 pb-6 mb-2 break-inside-avoid">
             <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Performance Analysis Report</h1>
             <div className="flex items-center gap-3 mt-3">
                <span className="px-4 py-1.5 rounded-full bg-indigo-600 text-white text-sm font-bold shadow-sm shadow-indigo-200">
                  {sourceName}
                </span>
             </div>
        </div>

        {/* KPI Cards (Moved here for PDF Export) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 break-inside-avoid">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-indigo-600 mb-2">
                <BarChart3 className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Class Average</span>
              </div>
              <p className="text-4xl font-bold text-slate-900">{analysis.summary.mean.toFixed(1)}%</p>
              <p className="text-sm text-slate-400 mt-1">Overall performance</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                <Users className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Pass Rate</span>
              </div>
              <p className="text-4xl font-bold text-slate-900">
                {analysis.students.length > 0 ? ((analysis.summary.passCount / analysis.students.length) * 100).toFixed(0) : 0}%
              </p>
              <p className="text-sm text-slate-400 mt-1">{analysis.summary.passCount} students passed</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                <Award className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Top Score</span>
              </div>
              <p className="text-4xl font-bold text-slate-900">{analysis.summary.max}</p>
                <p className="text-sm text-slate-400 mt-1">Highest achievement</p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
                <div className="flex items-center gap-2 text-blue-600 mb-2">
                <TrendingUp className="w-5 h-5" />
                <span className="text-sm font-semibold uppercase tracking-wider">Variance</span>
              </div>
              <p className="text-4xl font-bold text-slate-900">{analysis.summary.stdDev.toFixed(1)}</p>
              <p className="text-sm text-slate-400 mt-1">Standard Deviation</p>
            </div>
          </div>
        </div>

        {/* Statistics Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden break-inside-avoid">
            <div className="p-6 border-b border-slate-100 flex items-center gap-3 bg-gradient-to-r from-white to-slate-50">
                <div className="p-2 bg-indigo-50 rounded-lg">
                  <TableIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                   <h3 className="font-bold text-slate-800">Detailed Statistical Breakdown</h3>
                   <p className="text-xs text-slate-500">Mean, Median, Mode, Std Dev, Min & Max per category.</p>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-slate-500 uppercase bg-slate-50/50">
                        <tr>
                            <th className="px-6 py-4 font-semibold">Category</th>
                            <th className="px-6 py-4 font-semibold">Mean</th>
                            <th className="px-6 py-4 font-semibold">Median</th>
                            <th className="px-6 py-4 font-semibold">Mode</th>
                            <th className="px-6 py-4 font-semibold">Std Dev</th>
                            <th className="px-6 py-4 font-semibold">Min</th>
                            <th className="px-6 py-4 font-semibold">Max</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        <tr className="bg-indigo-50/30 hover:bg-indigo-50/50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-800 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-indigo-500"></span> {totalScoreName}
                            </td>
                            <td className="px-6 py-4 text-slate-800 font-bold">{analysis.summary.mean.toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-600">{analysis.summary.median.toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-600">{analysis.summary.mode.toFixed(2)}</td>
                            <td className="px-6 py-4 text-slate-600">{analysis.summary.stdDev.toFixed(2)}</td>
                            <td className="px-6 py-4 text-red-600 font-semibold">{analysis.summary.min.toFixed(0)}</td>
                            <td className="px-6 py-4 text-emerald-600 font-semibold">{analysis.summary.max.toFixed(0)}</td>
                        </tr>
                        {analysis.componentStats.map(stat => (
                             <tr key={stat.name} className="bg-white hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-700 pl-8 border-l-4 border-transparent hover:border-indigo-500 transition-all">
                                  {stat.name}
                                </td>
                                <td className="px-6 py-4 text-slate-500">{stat.mean.toFixed(2)}</td>
                                <td className="px-6 py-4 text-slate-500">{stat.median.toFixed(2)}</td>
                                <td className="px-6 py-4 text-slate-500">{stat.mode.toFixed(2)}</td>
                                <td className="px-6 py-4 text-slate-500">{stat.stdDev.toFixed(2)}</td>
                                <td className="px-6 py-4 text-slate-500">{stat.min.toFixed(0)}</td>
                                <td className="px-6 py-4 text-slate-500">{stat.max.toFixed(0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>

        {/* Correlation Analysis Section (New) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 break-inside-avoid">
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-6">
                <div className="flex items-center gap-3">
                   <div className="p-2 bg-emerald-50 rounded-lg">
                      <GitCompare className="w-5 h-5 text-emerald-600" />
                   </div>
                   <div>
                      <h3 className="text-lg font-bold text-slate-800">Variable Correlation Analysis</h3>
                      <p className="text-sm text-slate-500">Compare relationships between different assessments.</p>
                   </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto items-center">
                    
                    {/* Chart Type Selector */}
                    <div className="flex bg-slate-100/80 p-1 rounded-lg">
                        {(['scatter', 'bar', 'line', 'area'] as const).map((type) => (
                            <button
                                key={type}
                                onClick={() => setCorrelationChartType(type)}
                                className={`p-2 rounded-md transition-all duration-200 ${
                                correlationChartType === type 
                                    ? 'bg-white shadow-sm text-emerald-600 scale-100 ring-1 ring-emerald-500/10' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                                }`}
                                title={`${type.charAt(0).toUpperCase() + type.slice(1)} Chart`}
                            >
                                {type === 'scatter' && <CircleDot className="w-4 h-4" />}
                                {type === 'bar' && <BarChart3 className="w-4 h-4" />}
                                {type === 'line' && <LineChartIcon className="w-4 h-4" />}
                                {type === 'area' && <Activity className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>

                    {/* Correlation Controls */}
                    <div className="flex flex-col sm:flex-row gap-2 items-center w-full sm:w-auto">
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">X (Left):</span>
                            <select 
                                value={scatterX}
                                onChange={(e) => setScatterX(e.target.value)}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-32"
                            >
                                <option value={totalScoreName}>{totalScoreName}</option>
                                {componentKeys.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                        <div className="hidden sm:block text-slate-300 font-light">/</div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <span className="text-xs font-bold text-slate-500 uppercase whitespace-nowrap">Y (Right):</span>
                            <select 
                                value={scatterY}
                                onChange={(e) => setScatterY(e.target.value)}
                                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500 w-full sm:w-32"
                            >
                                <option value={totalScoreName}>{totalScoreName}</option>
                                {componentKeys.map(k => <option key={k} value={k}>{k}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="flex-grow h-80">
                    <ResponsiveContainer width="100%" height="100%">
                        {renderCorrelationChart()}
                    </ResponsiveContainer>
                </div>

                {/* Correlation Stats Box */}
                <div className="lg:w-64 flex flex-col gap-4">
                    <div className={`p-5 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center h-full ${strength.bg}`}>
                        <div className="mb-2 text-slate-400">
                            <Activity className="w-8 h-8 opacity-50" />
                        </div>
                        <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-1">Correlation (r)</h4>
                        <div className={`text-3xl font-black ${strength.color}`}>
                            {correlationValue.toFixed(3)}
                        </div>
                        <div className={`mt-2 px-3 py-1 rounded-full text-xs font-bold ${strength.color} bg-white/50`}>
                            {strength.text} Relationship
                        </div>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl text-xs text-slate-500 leading-relaxed border border-slate-100">
                        <div className="flex items-center gap-2 font-bold text-slate-700 mb-2">
                            <Info className="w-3 h-3" /> Interpretation
                        </div>
                        <p>
                            A correlation of <strong>1.0</strong> means a perfect positive relationship. 
                            Charts with Dual Axes (Bar/Line) help compare trends across variables with different scales.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Grade Distribution */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 break-inside-avoid">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-indigo-500"/> Grade Distribution
              </h3>
              
              <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Left: Chart */}
                  <div className="h-72 w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={gradeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                          <XAxis dataKey="grade" tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis allowDecimals={false} tick={{fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <Tooltip 
                              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} 
                              cursor={{ fill: '#f1f5f9' }}
                          />
                          <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} >
                              {gradeData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS.grade[index % COLORS.grade.length]} />
                              ))}
                          </Bar>
                      </BarChart>
                      </ResponsiveContainer>
                  </div>

                  {/* Right: Table */}
                  <div className="w-full md:w-1/2 overflow-hidden rounded-xl border border-slate-100">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                              <tr>
                                  <th className="px-3 py-2">Grade</th>
                                  <th className="px-3 py-2 text-center">Count</th>
                                  <th className="px-3 py-2 text-right">%</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {gradeData.map((entry, index) => {
                                  const total = analysis.students.length;
                                  const percent = total > 0 ? (entry.count / total) * 100 : 0;
                                  const color = COLORS.grade[index % COLORS.grade.length];
                                  return (
                                      <tr key={entry.grade} className="hover:bg-slate-50/50">
                                          <td className="px-3 py-2 font-medium text-slate-700 flex items-center gap-2">
                                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }}></span>
                                              {entry.grade}
                                          </td>
                                          <td className="px-3 py-2 text-center text-slate-600 font-semibold">{entry.count}</td>
                                          <td className="px-3 py-2 text-right text-slate-500">{percent.toFixed(1)}%</td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
            </div>

            {/* Performance Groups (Chart + Table) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 break-inside-avoid">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <PieChartIcon className="w-5 h-5 text-indigo-500"/> Performance Groups
              </h3>
              
              <div className="flex flex-col md:flex-row gap-6 items-center">
                  {/* Left: Chart */}
                  <div className="h-64 w-full md:w-1/2">
                      <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                            data={groupData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                          {groupData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={GROUP_COLORS[entry.name] || '#94a3b8'} />
                          ))}
                          </Pie>
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      </PieChart>
                      </ResponsiveContainer>
                  </div>

                  {/* Right: Table */}
                  <div className="w-full md:w-1/2 overflow-hidden rounded-xl border border-slate-100">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
                              <tr>
                                  <th className="px-3 py-2">Group</th>
                                  <th className="px-3 py-2 text-center">Count</th>
                                  <th className="px-3 py-2 text-right">%</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {groupData.map((group) => {
                                  const total = analysis.students.length;
                                  const percent = total > 0 ? (group.value / total) * 100 : 0;
                                  return (
                                      <tr key={group.name} className="hover:bg-slate-50/50">
                                          <td className="px-3 py-2 font-medium text-slate-700 flex items-center gap-2">
                                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: GROUP_COLORS[group.name] }}></span>
                                              {group.name}
                                          </td>
                                          <td className="px-3 py-2 text-center text-slate-600 font-semibold">{group.value}</td>
                                          <td className="px-3 py-2 text-right text-slate-500">{percent.toFixed(1)}%</td>
                                      </tr>
                                  );
                              })}
                          </tbody>
                      </table>
                  </div>
              </div>
            </div>
        </div>

        {/* Component Performance Comparison with Selector */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 break-inside-avoid">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Component Analysis</h3>
                    <p className="text-sm text-slate-500">Compare average performance across assessments.</p>
                </div>
                
                {/* Segmented Control */}
                <div className="flex bg-slate-100/80 p-1.5 rounded-xl">
                    {(['bar', 'line', 'area', 'radar'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setComponentChartType(type)}
                        className={`p-2.5 rounded-lg transition-all duration-200 ${
                          componentChartType === type 
                            ? 'bg-white shadow-sm text-indigo-600 scale-100' 
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                        title={`${type.charAt(0).toUpperCase() + type.slice(1)} Chart`}
                      >
                        {type === 'bar' && <BarChart3 className="w-4 h-4" />}
                        {type === 'line' && <LineChartIcon className="w-4 h-4" />}
                        {type === 'area' && <Activity className="w-4 h-4" />}
                        {type === 'radar' && <PieChartIcon className="w-4 h-4" />}
                      </button>
                    ))}
                </div>
            </div>
            
            <div className="h-96 w-full">
              <ResponsiveContainer width="100%" height="100%">
                  {renderComponentChart()}
              </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};