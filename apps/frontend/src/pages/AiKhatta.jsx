import { useState } from 'react';
import { UploadCloud, FileText, Loader2, CheckCircle, AlertCircle, Image as ImageIcon, Download, Database } from 'lucide-react';
import apiClient from '../api/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function AiKhatta() {
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [parsedData, setParsedData] = useState(null);
    const [error, setError] = useState('');

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setError('');
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            setParsedData(null);
        }
    };

    const handleProcessImage = async () => {
        if (!selectedFile) return;
        setIsProcessing(true);
        setError('');

        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onloadend = async () => {
            try {
                const response = await apiClient.post('/khatta/process', { image: reader.result });
                setParsedData(response.data.entries);
            } catch (err) {
                setError('AI processing failed. Check your API key or backend limits.');
            } finally {
                setIsProcessing(false);
            }
        };
    };

    const handleDownloadPDF = () => {
        if (!parsedData) return;
        const doc = new jsPDF();

        const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";

        try {
            // addImage(imageData, format, x, y, width, height)
            doc.addImage(logoBase64, 'PNG', 14, 10, 30, 30);
        } catch (e) {
            console.error("Logo failed to load", e);
        }

        doc.setFontSize(20);
        doc.setTextColor(245, 158, 11); // Amber color for dark mode theme matching in PDF
        doc.text('OFFICIAL KHATTA REPORT', 50, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 30);
        doc.text(`Reference: AI-SCAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 50, 36);

        const tableColumn = ["Customer Email", "Description", "Amount (INR)"];
        const tableRows = parsedData.map(item => [
            item.customerEmail,
            item.notes,
            item.amount > 0 ? `+Rs. ${item.amount}` : `-Rs. ${Math.abs(item.amount)}`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45, 
            theme: 'grid',
            headStyles: { fillColor: [28, 28, 28], fontSize: 11, textColor: [245, 158, 11] }, // Dark header with gold text
            columnStyles: {
                2: { halign: 'right', fontStyle: 'bold' } // Right align the Amount column
            }
        });

        doc.save(`Khatta_Report_${new Date().getTime()}.pdf`);
    };

    const handleSaveToDatabase = async () => {
        try {
            setIsProcessing(true);
            await apiClient.post('/khatta/save', { entries: parsedData });
            alert('Entries successfully saved to your Ledger!');
            setParsedData(null);
        } catch (err) {
            alert('Failed to save. Ensure customers are registered.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto font-sans selection:bg-amber-500/30 selection:text-amber-200">
            <h1 className="text-2xl font-bold text-white flex items-center tracking-wide">
                <FileText className="h-6 w-6 mr-3 text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" /> 
                AI Khatta Digitizer
            </h1>
            <p className="text-sm text-zinc-400 -mt-4">Upload handwritten ledgers or invoices for automatic data extraction.</p>

            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg text-sm font-medium flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                <div className="flex flex-col space-y-6">
                    <div className="bg-[#1c1c1c] rounded-xl shadow-2xl border border-zinc-800 p-6 flex-grow flex flex-col">
                        <label className="flex flex-col items-center justify-center w-full flex-grow border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer bg-[#0a0a0a] hover:bg-zinc-900/50 hover:border-amber-500/50 transition-all duration-300 group min-h-[250px]">
                            <UploadCloud className="w-12 h-12 text-zinc-600 mb-4 group-hover:text-amber-500 transition-colors" />
                            <p className="text-sm font-bold text-zinc-400 group-hover:text-zinc-300">
                                {selectedFile ? 'Change Image' : 'Upload Invoice/Ledger Image'}
                            </p>
                            <p className="text-xs text-zinc-600 mt-2 font-mono">JPG, PNG, WEBP</p>
                            <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </label>
                        
                        <button 
                            onClick={handleProcessImage} 
                            disabled={!selectedFile || isProcessing} 
                            className="w-full mt-6 py-4 bg-amber-500 text-[#0a0a0a] font-extrabold tracking-wide rounded-md disabled:bg-zinc-800 disabled:text-zinc-500 transition-all duration-300 shadow-[0_0_15px_rgba(245,158,11,0.2)] hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] disabled:shadow-none disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {isProcessing ? (
                                <span className="flex items-center justify-center"><Loader2 className="animate-spin h-5 w-5 mr-2" /> Analyzing Data...</span>
                            ) : 'Extract Data via AI'}
                        </button>
                    </div>
                </div>

                <div className="space-y-6 flex flex-col">
                    
                    <div className="bg-[#1c1c1c] rounded-xl shadow-2xl border border-zinc-800 p-4 h-64 flex items-center justify-center overflow-hidden relative group">
                        {previewUrl ? (
                            <>
                                <img src={previewUrl} className="max-h-full max-w-full object-contain drop-shadow-xl z-10" alt="Preview" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex items-center justify-center pointer-events-none">
                                    <ImageIcon className="h-8 w-8 text-white/50" />
                                </div>
                            </>
                        ) : (
                            <div className="flex flex-col items-center justify-center text-zinc-600">
                                <ImageIcon className="h-10 w-10 mb-2 opacity-50" />
                                <p className="text-sm font-medium tracking-widest uppercase">No Preview</p>
                            </div>
                        )}
                    </div>

                    {parsedData && (
                        <div className="bg-[#0a0a0a] border border-emerald-500/30 p-6 rounded-xl space-y-5 shadow-[0_0_30px_rgba(16,185,129,0.05)] flex-grow">
                            <h3 className="font-bold text-emerald-400 flex items-center tracking-wide">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Extraction Results
                            </h3>
                            
                            <div className="space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                                {parsedData.map((data, idx) => (
                                    <div key={idx} className={`p-4 rounded-md flex justify-between items-center transition-colors ${
                                        data.isTotal 
                                            ? 'border border-amber-500/40 bg-amber-500/10' 
                                            : 'border border-zinc-800 bg-[#1c1c1c] hover:bg-zinc-800/50'
                                    }`}>
                                        <div className="text-sm flex-1 mr-4">
                                            <p className="font-bold text-white truncate">{data.customerEmail}</p>
                                            <p className="text-zinc-500 text-xs mt-1 truncate">{data.notes}</p>
                                        </div>
                                        <span className={`font-black text-base whitespace-nowrap ${
                                            data.amount > 0 ? 'text-emerald-400' : 'text-red-400'
                                        }`}>
                                            {data.amount > 0 ? `+₹${data.amount}` : `-₹${Math.abs(data.amount)}`}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-zinc-800/50">
                                <button 
                                    onClick={handleDownloadPDF} 
                                    className="flex-1 py-3 border border-zinc-700 text-zinc-300 font-bold tracking-wide rounded-md flex justify-center items-center hover:bg-zinc-800 hover:text-white transition-colors"
                                >
                                    <Download className="w-4 h-4 mr-2" /> Download PDF
                                </button>
                                <button 
                                    onClick={handleSaveToDatabase} 
                                    className="flex-1 py-3 bg-emerald-600 text-[#0a0a0a] font-extrabold tracking-wide rounded-md flex justify-center items-center hover:bg-emerald-500 transition-colors shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                >
                                    <Database className="w-4 h-4 mr-2" /> Save to Ledger
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}