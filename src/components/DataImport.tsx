import React, { useState, useRef } from 'react';
import { 
  Upload, 
  FileType, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  FileSpreadsheet,
  ArrowRight
} from 'lucide-react';
import Papa from 'papaparse';
import { Language, SaleRecord, LineItem } from '../types';
import { LANGUAGES } from '../lib/utils';
import { cn } from '../lib/utils';

interface DataImportProps {
  lang: Language;
  onImport: (newData: SaleRecord[], filename: string) => void;
  title?: string;
  description?: string;
}

export function DataImport({ lang, onImport, title, description }: DataImportProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = LANGUAGES[lang];

  const actualTitle = title || t.import;
  const actualDesc = description || "Drop your supermarket POS export files (.csv, .tsv, .txt) to analyze latest performance.";

  const handleFile = (file: File) => {
    const validExtensions = ['.csv', '.tsv', '.txt'];
    const isExtensionValid = validExtensions.some(ext => file.name.toLowerCase().endsWith(ext));

    if (!isExtensionValid) {
      setStatus('error');
      setErrorMessage('Please upload a CSV, TSV, or TXT file.');
      return;
    }

    setStatus('processing');
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      worker: true,
      delimiter: "", // Auto-detect delimiter (handles tabs automatically)
      complete: (results) => {
        try {
          const rawData = results.data as any[];
          const saleMap = new Map<string, SaleRecord>();
          
          rawData.forEach((row, index) => {
            const rawRowValues = Object.values(row).map(v => String(v).toLowerCase());
            // Filter out VOID transactions immediately
            if (rawRowValues.some(v => v.includes('void'))) return;

            const getVal = (keys: string[]) => {
              const matchedKey = Object.keys(row).find(k => {
                const normalized = k.trim().toLowerCase().replace(/\s+|_/g, '');
                return keys.some(search => search.toLowerCase().replace(/\s+|_/g, '') === normalized);
              });
              // Return the value only if it's not strictly null/undefined and NOT an empty string
              const val = matchedKey ? row[matchedKey] : null;
              if (val === "" || val === null || val === undefined) return null;
              return val;
            };

            const sanitizeStr = (val: any) => {
              if (val === null || val === undefined) return '';
              return String(val).replace(/^["']|["']$/g, '').trim();
            };

            // Heuristic: try description first as it often contains the full text in these exports
            const nameCandidates = ['description', 'name', 'ProductName', 'ItemName', 'Product'];
            let fullDesc = "";
            for (const key of nameCandidates) {
              const val = sanitizeStr(getVal([key]));
              if (val) {
                fullDesc = val;
                break;
              }
            }
            if (!fullDesc) fullDesc = 'Unnamed Product';

            const tid = sanitizeStr(getVal(['transaction_no', 'TransactionID', 'ID', 'id', 'OrderNumber'])) || `imported_${index}`;
            const sku = sanitizeStr(getVal(['barcode', 'item_no', 'SKU', 'sku', 'ItemCode'])) || 'UNKNOWN';
            let cat = sanitizeStr(getVal(['department', 'Category', 'Department', 'Dept'])) || 'General';
            // Normalize numeric departments (e.g. "02" to "2")
            if (/^\d+$/.test(cat)) {
              cat = parseInt(cat, 10).toString();
            }
            
            const cleanNum = (val: any) => {
              if (val === null || val === undefined) return '';
              if (typeof val !== 'string') return String(val);
              return val.replace(/[$, \s\t"]/g, '');
            };

            const lineTotal = parseFloat(cleanNum(getVal(['item_amount', 'item_price', 'Price', 'UnitPrice', 'price']))) || 0;
            const qty = Math.max(1, parseFloat(cleanNum(getVal(['item_qty', 'Quantity', 'Qty', 'quantity']))) || 1);
            const price = Number((lineTotal / qty).toFixed(2));
            
            // Robust Date Parsing - prioritize fields with time information (containing a colon)
            const timeFields = ['created_time', 'order_date', 'Timestamp', 'Date', 'Time'];
            let rawTime: any = null;
            
            // First pass: look for a field that looks like it has a time (contains :)
            for (const field of timeFields) {
              const val = getVal([field]);
              if (val && String(val).includes(':')) {
                rawTime = val;
                break;
              }
            }
            // Fallback: take anything matching the time keys
            if (!rawTime) {
              rawTime = getVal(timeFields);
            }

            let timestamp = new Date().toISOString();
            
            if (rawTime) {
              const strTime = String(rawTime);
              // Handle Excel Serial Date (e.g., 46054) - only if no time is present
              if (/^\d{5}(\.\d+)?$/.test(strTime) && !strTime.includes(':')) {
                const excelDate = parseFloat(strTime);
                const unixTimestamp = (excelDate - 25569) * 86400 * 1000;
                timestamp = new Date(unixTimestamp).toISOString();
              } else {
                // Try standard parsing
                const d = new Date(strTime);
                if (!isNaN(d.getTime())) {
                  // Check if year is like '26' and fix to '2026'
                  if (d.getFullYear() < 100) {
                    d.setFullYear(2000 + d.getFullYear());
                  }
                  // Force to a "Wall Clock" UTC timestamp so the hour in the file matches the hour in the DB
                  const dUTC = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate(), d.getHours(), d.getMinutes()));
                  timestamp = dUTC.toISOString();
                } else {
                  // Manual regex fallback for "M/D/YY H:mm"
                  const match = strTime.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{1,2})/);
                  if (match) {
                    const [_, m, d, y, h, min] = match;
                    const year = y.length === 2 ? `20${y}` : y;
                    const dObj = new Date(Date.UTC(parseInt(year), parseInt(m)-1, parseInt(d), parseInt(h), parseInt(min)));
                    if (!isNaN(dObj.getTime())) {
                      timestamp = dObj.toISOString();
                    }
                  }
                }
              }
            }

            const method = getVal(['payment_type', 'PaymentMethod', 'Method', 'Payment']) || 'Card';
            const memberId = sanitizeStr(getVal(['member', 'MemberID', 'Customer', 'Member No']));

            const existingSale = saleMap.get(tid);
            
            const lineItem: LineItem = {
              id: `item_${index}_${sku}`,
              sku,
              name: fullDesc,
              nameZh: fullDesc, // Use same for now or extract if possible
              department: cat,
              price,
              quantity: qty,
              amount: lineTotal
            };
            
            if (existingSale) {
              existingSale.items.push(lineItem);
              existingSale.totalAmount = Number((existingSale.totalAmount + lineTotal).toFixed(2));
            } else {
              saleMap.set(tid, {
                id: tid,
                timestamp,
                items: [lineItem],
                totalAmount: Number(lineTotal.toFixed(2)),
                paymentMethod: (method.toLowerCase().includes('card') || method.toLowerCase().includes('credit')) ? 'Card' : 'Cash',
                memberId: memberId || undefined
              });
            }
          });
          
          const finalData = Array.from(saleMap.values());
          
          setTimeout(() => {
            onImport(finalData, file.name);
            setStatus('success');
          }, 1500); // Artificial delay for better UX
          
        } catch (err) {
          console.error(err);
          setStatus('error');
          setErrorMessage('Failed to parse CSV format. Please ensure it matches the template.');
        }
      },
      error: (err) => {
        setStatus('error');
        setErrorMessage(err.message);
      }
    });
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const downloadTemplate = () => {
    const csvContent = "TransactionID,Timestamp,SKU,ProductName,ProductNameZh,Category,Price,Quantity,PaymentMethod\n" +
      "sale_999,2026-04-23T14:00:00Z,DUMPLING_F,Frozen Pork Dumplings,猪肉水饺,Frozen,12.99,2,Card\n" +
      "sale_999,2026-04-23T14:00:00Z,VINEGAR_C,Chinking Vinegar,镇江香醋,Sauces,3.50,1,Card";
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kam_man_import_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-km-cream text-km-red mb-2">
            <Upload className="w-8 h-8" />
          </div>
          <h1 className="headline-1 text-foreground">{actualTitle}</h1>
          <p className="body-2 text-muted-foreground max-w-lg mx-auto">
            {actualDesc}
          </p>
        </div>

        {/* Upload Zone */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={cn(
            "relative group cursor-pointer border-2 border-dashed rounded-3xl p-12 transition-all flex flex-col items-center justify-center gap-4",
            isDragging ? "border-km-red bg-km-cream/50" : "border-gray-200 hover:border-km-red hover:bg-gray-50"
          )}
        >
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            accept=".csv,.tsv,.txt"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          
          {status === 'processing' ? (
            <div className="text-center space-y-4">
              <Loader2 className="w-12 h-12 text-km-red animate-spin mx-auto" />
              <p className="font-bold text-km-ink">Processing file...</p>
            </div>
          ) : status === 'success' ? (
              <div className="text-center space-y-4">
                <p className="headline-2 text-foreground">Import Complete!</p>
                <p className="body-3 text-muted-foreground">Your dashboard has been updated with new sales data.</p>
              </div>
          ) : (
            <>
              <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <FileType className="w-10 h-10 text-gray-400 group-hover:text-km-red transition-colors" />
              </div>
              <div className="text-center">
                <p className="headline-2 text-foreground underline decoration-primary/30 group-hover:decoration-primary">Click to upload or drag & drop</p>
                <p className="body-3 text-muted-foreground mt-1">Supports CSV, TSV, TXT (Max 10MB)</p>
              </div>
            </>
          )}

          {status === 'error' && (
            <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-50 px-4 py-2 rounded-lg font-bold text-sm animate-shake">
              <AlertCircle className="w-4 h-4" />
              {errorMessage}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
