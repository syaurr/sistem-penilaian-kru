import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Tipe data agar konsisten
type RecapResult = {
    rank: number;
    bonusStatus: string;
    name: string;
    outlet: string;
    role: string;
    totalNilaiAkhir: number;
    totalNilaiCrew: number;
    nilaiSupervisor1: number;
    nilaiSupervisor2: number;
    aspect_scores: { 
        [key: string]: { 
            score: number; 
            max_score: number; 
        }; 
    };
};
type AspectHeader = { key: string; name: string; };

const getScoreHexColor = (score: number, maxScore: number): {bgColor: string, textColor: string} | null => {
    if (score === null || score === undefined || maxScore === 0) return null; 
    const CUKUP = { bgColor: '#F2D086', textColor: '#854d0e' };
    const BAIK = { bgColor: '#94E07B', textColor: '#166534' };  
    const SANGAT_BAIK = { bgColor: '#04A5A5', textColor: '#FFFFFF' };
    const percentage = (score / maxScore) * 100;
    if (percentage >= 75) return SANGAT_BAIK;
    if (percentage >= 50) return BAIK;
    return CUKUP;
};

const aspectOrder = ["leadership", "preparation", "cashier", "order_making", "packing", "stock_opname", "cleanliness"];

export const exportToPdf = async (data: RecapResult[], aspects: AspectHeader[], period: string) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: 'a4' });
    let FONT_NAME = 'helvetica';
    let LOGO_DATA_URI: string | null = null;
    const DARK_TEAL = '#033F3F';

    try {
        const [fontRegular, fontBold, logo] = await Promise.all([
            fetch('/Poppins-Regular.ttf').then(res => res.arrayBuffer()),
            fetch('/Poppins-Bold.ttf').then(res => res.arrayBuffer()),
            fetch('/logo.png').then(res => res.blob())
        ]);
        
        const reader = new FileReader();
        reader.readAsDataURL(logo);
        LOGO_DATA_URI = await new Promise(resolve => { reader.onloadend = () => resolve(reader.result as string) });

        // Helper to convert ArrayBuffer to base64 string
        function arrayBufferToBase64(buffer: ArrayBuffer) {
            let binary = '';
            const bytes = new Uint8Array(buffer);
            const len = bytes.byteLength;
            for (let i = 0; i < len; i++) {
                binary += String.fromCharCode(bytes[i]);
            }
            return btoa(binary);
        }

        doc.addFileToVFS('Poppins-Regular.ttf', arrayBufferToBase64(fontRegular));
        doc.addFileToVFS('Poppins-Bold.ttf', arrayBufferToBase64(fontBold));
        doc.addFont('Poppins-Regular.ttf', 'Poppins', 'normal');
        doc.addFont('Poppins-Bold.ttf', 'Poppins', 'bold');
        FONT_NAME = 'Poppins';
    } catch (error) {
        console.error("Gagal memuat aset:", error);
    }
    
    if (LOGO_DATA_URI) doc.addImage(LOGO_DATA_URI, 'PNG', 40, 25, 60, 0); 
    doc.setFont(FONT_NAME, 'bold');
    doc.setFontSize(22);
    doc.setTextColor(DARK_TEAL);
    doc.text("HASIL MONITORING PENILAIAN INDIVIDU", doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
    doc.setFontSize(14);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(`PERIODE: ${period.toUpperCase()}`, doc.internal.pageSize.getWidth() / 2, 55, { align: 'center' });

    const tableColumn = [ "Peringkat", "Nama Kru - Outlet", "Kepemimpinan", "Persiapan", "Penerimaan", "Pembuatan", "Pengemasan", "SO", "Kebersihan" ];
    const tableRows = data.slice(0, 25).map(item => (['', '', '', '', '', '', '', '', '']));

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: 'plain', 
        styles: { font: FONT_NAME, fontSize: 9, cellPadding: { top: 8, right: 3, bottom: 8, left: 3 }, valign: 'middle' },
        headStyles: { textColor: '#FFFFFF', font: FONT_NAME, fontStyle: 'bold', fontSize: 9, cellPadding: { top: 5, right: 2, bottom: 5, left: 2 } },
        
        // --- PERUBAHAN UTAMA DI SINI ---
        columnStyles: { 
            0: { cellWidth: 50, halign: 'center' },  // Peringkat
            1: { cellWidth: 90, halign: 'left' },   // Nama Kru
            2: { cellWidth: 65 },  // Kepemimpinan
            3: { cellWidth: 65 },  // Persiapan
            4: { cellWidth: 65 },  // Penerimaan
            5: { cellWidth: 65 },  // Pembuatan
            6: { cellWidth: 65 },  // Pengemasan
            7: { cellWidth: 45 },  // SO
            8: { cellWidth: 65 },  // Kebersihan
        },
        
        didDrawCell: (hookData) => {
            const { cell, row, column, doc } = hookData;
            const crewData = data[row.index];
            if (!crewData) return;

            const cellX = cell.x;
            const cellY = cell.y;
            const cellW = cell.width;
            const cellH = cell.height;

            if (row.section === 'head') {
                doc.setFillColor(DARK_TEAL);
                doc.roundedRect(cellX, cellY, cellW, cellH, 8, 8, 'F');
                doc.setTextColor('#FFFFFF');
                doc.setFont(FONT_NAME, 'bold');
                doc.text(String(cell.text), cellX + cellW / 2, cellY + cellH / 2, { align: 'center', baseline: 'middle' });
            }

            if (row.section === 'body' && column.index === 0) {
                let rankColor = '#FDE68A'; let textColor = '#A16207';
                if (crewData.bonusStatus === 'ineligible') { rankColor = '#6B1815'; textColor = '#FFFFFF'; }
                if (crewData.bonusStatus === 'bonus_200k') { rankColor = '#166534'; textColor = '#FFFFFF'; }
                if (crewData.bonusStatus === 'bonus_100k') { rankColor = '#94E07B'; textColor = '#14532D'; }

                doc.setFillColor(rankColor);
                const x = cellX + cellW / 2;
                doc.roundedRect(x - 12, cellY + 4, 24, cellH - 8, 8, 8, 'F');
                doc.setTextColor(textColor);
                doc.setFont(FONT_NAME, 'bold');
                doc.setFontSize(12);
                doc.text(String(crewData.rank), x, cellY + cellH / 2, { align: 'center', baseline: 'middle' });
            }

            if (row.section === 'body' && column.index === 1) {
                doc.setFont(FONT_NAME, 'bold');
                doc.setFontSize(10);
                doc.setTextColor(DARK_TEAL);
                doc.text(crewData.name, cellX + 4, cellY + cellH / 2 - 4, { baseline: 'middle' });
                doc.setFont(FONT_NAME, 'normal');
                doc.setFontSize(8);
                doc.setTextColor('#6b7280');
                doc.text(crewData.outlet, cellX + 4, cellY + cellH / 2 + 7, { baseline: 'middle' });
            }

            if (row.section === 'body' && column.index >= 2) {
                const aspectKey = aspectOrder[column.index - 2];
                if (!aspectKey) return;
                const aspectData = crewData.aspect_scores[aspectKey];
                const text = (crewData.role === 'leader' || aspectKey !== 'leadership') ? aspectData?.score?.toFixed(1) : undefined;
                
                if (text) {
                    const colors = getScoreHexColor(aspectData.score, aspectData.max_score);
                    if (colors) {
                        doc.setFont(FONT_NAME, 'bold');
                        doc.setFontSize(10);
                        const textWidth = doc.getTextWidth(text);
                        const pillWidth = textWidth + 16;
                        const pillX = cellX + (cellW - pillWidth) / 2;
                        doc.setFillColor(colors.bgColor);
                        doc.roundedRect(pillX, cellY + 5, pillWidth, cellH - 10, 8, 8, 'F');
                        doc.setTextColor(colors.textColor);
                        doc.text(text, cellX + cellW / 2, cellY + cellH / 2, { align: 'center', baseline: 'middle' });
                    }
                }
            }
        },
    });

    doc.save(`Rekap Survei Penilaian Individu_${period.replace(/\s/g, "_")}.pdf`);
};