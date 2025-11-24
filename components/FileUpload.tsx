import React, { useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { RawRow } from '../types';

interface FileUploadProps {
  onDataLoaded: (sheets: { [sheetName: string]: RawRow[] }) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onDataLoaded }) => {
  
  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = e.target?.result;
      if (!data) return;

      const workbook = XLSX.read(data, { type: 'binary' });
      const allSheetsData: { [sheetName: string]: RawRow[] } = {};

      workbook.SheetNames.forEach((sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        
        // Access column metadata (hidden status)
        const colMetadata = (worksheet['!cols'] as any[]) || [];

        // Parse sheet as array of arrays to inspect headers and data availability
        const jsonData = XLSX.utils.sheet_to_json<any[]>(worksheet, { header: 1, defval: null });
        
        if (jsonData.length > 0) {
          const headers = jsonData[0]; // First row is headers
          const dataRows = jsonData.slice(1);
          
          if (headers && headers.length > 0) {
            // Identify valid column indices
            const indicesToKeep: number[] = [];
            
            headers.forEach((header: any, index: number) => {
              // 1. Check if column is hidden in Excel metadata
              const isHidden = colMetadata[index]?.hidden === true;
              
              // 2. Check if header itself is not empty
              const hasHeader = header !== null && header !== undefined && String(header).trim() !== '';

              // 3. Check if there is ANY data under this header in the rows
              let hasData = false;
              for (const row of dataRows) {
                const cellValue = row[index];
                if (cellValue !== null && cellValue !== undefined && String(cellValue).trim() !== '') {
                  hasData = true;
                  break;
                }
              }

              // Only keep if visible, has a header name, and contains data
              if (!isHidden && hasHeader && hasData) {
                indicesToKeep.push(index);
              }
            });

            // Handle duplicate headers (e.g. "Score", "Score" -> "Score", "Score_2")
            const finalHeaders: string[] = [];
            const headerCounts: { [key: string]: number } = {};
            
            indicesToKeep.forEach(index => {
                const originalHeader = String(headers[index]).trim();
                if (headerCounts[originalHeader]) {
                    headerCounts[originalHeader]++;
                    finalHeaders.push(`${originalHeader}_${headerCounts[originalHeader]}`);
                } else {
                    headerCounts[originalHeader] = 1;
                    finalHeaders.push(originalHeader);
                }
            });

            // Construct clean objects
            const cleanedData: RawRow[] = dataRows.map(row => {
              const rowObj: RawRow = {};
              let rowHasRelevantData = false;
              
              indicesToKeep.forEach((colIndex, i) => {
                const headerName = finalHeaders[i];
                const val = row[colIndex];
                
                // Ensure key exists for consistent object shape (important for DataMapper)
                rowObj[headerName] = val !== undefined ? val : null;

                if (val !== null && val !== undefined && String(val).trim() !== '') {
                    rowHasRelevantData = true;
                }
              });
              
              // Only return row if it has data in the columns we care about
              return rowHasRelevantData ? rowObj : null;
            }).filter((r): r is RawRow => r !== null);

            if (cleanedData.length > 0) {
              allSheetsData[sheetName] = cleanedData;
            }
          }
        }
      });

      onDataLoaded(allSheetsData);
    };
    reader.readAsBinaryString(file);
  }, [onDataLoaded]);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) handleFile(files[0]);
  };

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) handleFile(files[0]);
  };

  return (
    <div 
      onDrop={onDrop}
      onDragOver={(e) => e.preventDefault()}
      className="group relative border-2 border-dashed border-indigo-200 hover:border-indigo-500 bg-white hover:bg-indigo-50/30 rounded-3xl p-16 text-center transition-all duration-300 ease-in-out cursor-pointer shadow-sm hover:shadow-md"
    >
      <div className="flex flex-col items-center justify-center gap-6 pointer-events-none">
        <div className="p-5 bg-indigo-50 rounded-2xl group-hover:bg-indigo-100 group-hover:scale-110 transition-all duration-300 shadow-sm">
          <FileSpreadsheet className="w-12 h-12 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-slate-800 mb-2">Upload Gradebook</h3>
          <p className="text-slate-500">Drag & drop your Excel or CSV file here</p>
        </div>
      </div>
      <label className="mt-8 inline-block px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 cursor-pointer active:scale-95">
        Browse Files
        <input type="file" className="hidden" accept=".xlsx, .xls, .csv" onChange={onChange} />
      </label>
    </div>
  );
};