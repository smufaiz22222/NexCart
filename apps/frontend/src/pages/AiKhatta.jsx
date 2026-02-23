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

    // --- PDF GENERATION LOGIC ---
    const handleDownloadPDF = () => {
        if (!parsedData) return;
        const doc = new jsPDF();

        // --- 1. ADD LOGO ---
        // Replace the string below with your actual Base64 string from Step 1
        const logoBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...";

        try {
            // addImage(imageData, format, x, y, width, height)
            doc.addImage(logoBase64, 'PNG', 14, 10, 30, 30);
        } catch (e) {
            console.error("Logo failed to load", e);
        }

        // --- 2. ADJUST TEXT POSITIONING ---
        doc.setFontSize(20);
        doc.setTextColor(37, 99, 235); // Blue color
        doc.text('OFFICIAL KHATTA REPORT', 50, 22);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 50, 30);
        doc.text(`Reference: AI-SCAN-${Math.random().toString(36).substr(2, 9).toUpperCase()}`, 50, 36);

        // --- 3. DRAW TABLE ---
        const tableColumn = ["Customer Email", "Description", "Amount (INR)"];
        const tableRows = parsedData.map(item => [
            item.customerEmail,
            item.notes,
            item.amount > 0 ? `+Rs. ${item.amount}` : `-Rs. ${Math.abs(item.amount)}`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45, // Moved down to make room for logo
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235], fontSize: 11 },
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
        <div className="space-y-6 max-w-5xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                <FileText className="h-6 w-6 mr-2 text-blue-600" /> AI Khatta Digitizer
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-sm border p-6">
                    <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500">Upload Invoice/Ledger Image</p>
                        <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                    </label>
                    <button onClick={handleProcessImage} disabled={!selectedFile || isProcessing} className="w-full mt-6 py-3 bg-blue-600 text-white rounded-lg disabled:bg-blue-300">
                        {isProcessing ? <Loader2 className="animate-spin inline mr-2" /> : 'Extract Data'}
                    </button>
                </div>

                <div className="space-y-6">
                    <div className="bg-white rounded-xl shadow-sm border p-6 h-64 flex items-center justify-center overflow-hidden">
                        {previewUrl ? <img src={previewUrl} className="max-h-full" /> : <p className="text-gray-400">No preview</p>}
                    </div>

                    {parsedData && (
                        <div className="bg-green-50 border border-green-200 p-6 rounded-xl space-y-4">
                            <h3 className="font-bold text-green-800">Extraction Results</h3>
                            {parsedData.map((data, idx) => (
                                <div key={idx} className={`p-3 rounded bg-white border flex justify-between ${data.isTotal ? 'border-blue-500 bg-blue-50' : 'border-green-100'}`}>
                                    <div className="text-sm">
                                        <p className="font-bold">{data.customerEmail}</p>
                                        <p className="text-gray-500 text-xs">{data.notes}</p>
                                    </div>
                                    <span className={`font-bold ${data.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {data.amount > 0 ? `+₹${data.amount}` : `-₹${Math.abs(data.amount)}`}
                                    </span>
                                </div>
                            ))}

                            <div className="flex gap-2">
                                <button onClick={handleDownloadPDF} className="flex-1 py-2 border border-blue-600 text-blue-600 rounded flex justify-center items-center hover:bg-blue-50">
                                    <Download className="w-4 h-4 mr-2" /> PDF
                                </button>
                                <button onClick={handleSaveToDatabase} className="flex-1 py-2 bg-green-600 text-white rounded flex justify-center items-center hover:bg-green-700">
                                    <Database className="w-4 h-4 mr-2" /> Save
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}