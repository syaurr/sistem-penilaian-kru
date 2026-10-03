import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ASPECT_ORDER, ASPECT_DISPLAY_NAMES } from '@/lib/constants';
import type { AspectKey } from '@/types';

// Tipe data agar konsisten
type RecapResult = {
    rank: number;
    bonusStatus: string;
    name: string;
    outlet: string;
    role: string;
    totalNilaiAkhir: number;
    totalNilaiCrew: number;
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
    doc.setFontSize(18);
    doc.setTextColor(DARK_TEAL);
    doc.text("HASIL MONITORING PENILAIAN INDIVIDU", doc.internal.pageSize.getWidth() / 2, 40, { align: 'center' });
    doc.setFontSize(12);
    doc.setFont(FONT_NAME, 'normal');
    doc.text(`PERIODE: ${period.toUpperCase()}`, doc.internal.pageSize.getWidth() / 2, 55, { align: 'center' });

    // Header tabel dinamis berdasarkan 11 aspek
    const tableColumn = [
        "Rank",
        "Nama Kru - Outlet",
        ...ASPECT_ORDER.map(key => ASPECT_DISPLAY_NAMES[key]),
    ];
    
    // Baris kosong (diisi lewat didDrawCell)
    const tableRows = data.slice(0, 25).map(() => 
        Array(tableColumn.length).fill('')
    );

    // Kolom lebar — disesuaikan untuk 11 aspek di landscape A4 (~632px)
    const columnStyles: Record<number, any> = {
        0: { cellWidth: 32, halign: 'center' },  // Rank
        1: { cellWidth: 70, halign: 'left' },     // Nama Kru
    };
    
    // Setiap kolom aspek mendapat lebar sama (~48px untuk 11 aspek)
    ASPECT_ORDER.forEach((_, idx) => {
        columnStyles[idx + 2] = { cellWidth: 48 };
    });

    autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 80,
        theme: 'plain', 
        styles: { font: FONT_NAME, fontSize: 7, cellPadding: { top: 6, right: 2, bottom: 6, left: 2 }, valign: 'middle' },
        headStyles: { textColor: '#FFFFFF', font: FONT_NAME, fontStyle: 'bold', fontSize: 7, cellPadding: { top: 4, right: 2, bottom: 4, left: 2 } },
        columnStyles,
        
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
                doc.roundedRect(cellX, cellY, cellW, cellH, 6, 6, 'F');
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
                doc.roundedRect(x - 10, cellY + 3, 20, cellH - 6, 6, 6, 'F');
                doc.setTextColor(textColor);
                doc.setFont(FONT_NAME, 'bold');
                doc.setFontSize(10);
                doc.text(String(crewData.rank), x, cellY + cellH / 2, { align: 'center', baseline: 'middle' });
            }

            if (row.section === 'body' && column.index === 1) {
                doc.setFont(FONT_NAME, 'bold');
                doc.setFontSize(8);
                doc.setTextColor(DARK_TEAL);
                doc.text(crewData.name, cellX + 3, cellY + cellH / 2 - 3, { baseline: 'middle' });
                doc.setFont(FONT_NAME, 'normal');
                doc.setFontSize(6);
                doc.setTextColor('#6b7280');
                doc.text(crewData.outlet, cellX + 3, cellY + cellH / 2 + 6, { baseline: 'middle' });
            }

            if (row.section === 'body' && column.index >= 2) {
                const aspectIdx = column.index - 2;
                const aspectKey = ASPECT_ORDER[aspectIdx];
                if (!aspectKey) return;
                const aspectData = crewData.aspect_scores[aspectKey];
                const text = (crewData.role === 'leader' || aspectKey !== 'leadership') ? aspectData?.score?.toFixed(1) : undefined;
                
                if (text) {
                    const colors = getScoreHexColor(aspectData.score, aspectData.max_score);
                    if (colors) {
                        doc.setFont(FONT_NAME, 'bold');
                        doc.setFontSize(8);
                        const textWidth = doc.getTextWidth(text);
                        const pillWidth = textWidth + 12;
                        const pillX = cellX + (cellW - pillWidth) / 2;
                        doc.setFillColor(colors.bgColor);
                        doc.roundedRect(pillX, cellY + 4, pillWidth, cellH - 8, 6, 6, 'F');
                        doc.setTextColor(colors.textColor);
                        doc.text(text, cellX + cellW / 2, cellY + cellH / 2, { align: 'center', baseline: 'middle' });
                    }
                }
            }
        },
    });

    doc.save(`Rekap Survei Penilaian Individu_${period.replace(/\s/g, "_")}.pdf`);
};