import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

export const exportWithLogoFlow = (elementId: string, fileName: string) => {
    // 1. Ask user if they want to add a logo
    if (window.confirm("Would you like to add a custom logo (e.g., School Crest) to the report header?")) {
        // 2. Create hidden input for file selection
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (evt) => {
                    const logoBase64 = evt.target?.result as string;
                    // 3. Proceed to export with logo
                    exportToPDF(elementId, fileName, logoBase64);
                };
                reader.readAsDataURL(file);
            }
        };
        // Trigger file dialog
        input.click();
    } else {
        // 3. Proceed to export without logo
        exportToPDF(elementId, fileName);
    }
};

export const exportToPDF = async (elementId: string, fileName: string, logoBase64?: string | null) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  try {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210;
    const pdfHeight = 297;
    const margin = 15; // Increased margin for professional look
    const bottomMargin = 20; // Space for footer
    const contentWidth = pdfWidth - (2 * margin);
    const contentHeight = pdfHeight - margin - bottomMargin;

    let currentY = margin;

    // Handle Logo Insertion
    if (logoBase64) {
        try {
             const img = new Image();
             img.src = logoBase64;
             // Wait for image to load to get dimensions
             await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
             });

             const maxW = 40; // Max width in mm
             const maxH = 20; // Max height in mm
             const aspect = img.width / img.height;
             
             let drawW = maxW;
             let drawH = maxW / aspect;

             if (drawH > maxH) {
                 drawH = maxH;
                 drawW = maxH * aspect;
             }
             
             // Detect format slightly loosely (jsPDF handles most standard base64)
             let format = 'PNG';
             if (logoBase64.startsWith('data:image/jpeg') || logoBase64.startsWith('data:image/jpg')) format = 'JPEG';
             
             pdf.addImage(logoBase64, format, margin, margin, drawW, drawH);
             
             // Push content down to avoid overlap
             currentY = margin + drawH + 5;

        } catch (e) {
            console.warn("Failed to load logo for PDF", e);
            // If logo fails, we just continue without it
        }
    }

    // Iterate through direct children to handle them as blocks
    const children = Array.from(element.children) as HTMLElement[];

    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.style.display === 'none' || child.tagName === 'SCRIPT' || child.tagName === 'STYLE') continue;

      const canvas = await html2canvas(child, {
        scale: 3, // High scale for crisp professional text
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });

      const imgWidth = contentWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      const spaceLeft = (pdfHeight - bottomMargin) - currentY;

      // Case 1: Fits perfectly
      if (imgHeight <= spaceLeft) {
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5;
      } 
      // Case 2: Fits on a new page (small enough to not need splitting)
      else if (imgHeight <= contentHeight && imgHeight < (contentHeight * 0.5)) {
        pdf.addPage();
        currentY = margin;
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', margin, currentY, imgWidth, imgHeight);
        currentY += imgHeight + 5;
      }
      // Case 3: Needs splitting (Large content like table or long report)
      else {
        // Logic to slice the canvas and distribute across pages
        let currentSliceY = 0; // Y position in the source canvas (px)
        let remainingCanvasHeight = canvas.height; // Height left to print (px)

        while (remainingCanvasHeight > 0) {
            // Determine how much vertical space we have on the current PDF page
            const currentSpaceMM = (currentY === margin) 
                ? contentHeight 
                : ((pdfHeight - bottomMargin) - currentY);
            
            // Convert that MM space to Canvas Pixels
            // canvas.width (px) = imgWidth (mm)
            // factor = px / mm
            const pxPerMM = canvas.width / imgWidth;
            const availableHeightPx = currentSpaceMM * pxPerMM;

            // Determine slice height: min(what's left, what fits)
            // We use a small buffer (e.g., 2px) to prevent sub-pixel rounding issues showing blank lines
            const sliceHeightPx = Math.min(remainingCanvasHeight, availableHeightPx);
            
            // If slice is too small (e.g. just a line), force new page if we haven't just started one
            if (sliceHeightPx < (5 * pxPerMM) && currentY !== margin && remainingCanvasHeight > sliceHeightPx) {
                pdf.addPage();
                currentY = margin;
                continue;
            }

            // Create temp canvas for slice
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeightPx;
            
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
                // Draw portion of original canvas
                ctx.drawImage(
                    canvas, 
                    0, currentSliceY, canvas.width, sliceHeightPx, // Source
                    0, 0, sliceCanvas.width, sliceHeightPx         // Destination
                );

                const sliceImgData = sliceCanvas.toDataURL('image/png');
                const sliceHeightMM = sliceHeightPx / pxPerMM;
                
                pdf.addImage(sliceImgData, 'PNG', margin, currentY, imgWidth, sliceHeightMM);
                
                currentY += sliceHeightMM;
                currentSliceY += sliceHeightPx;
                remainingCanvasHeight -= sliceHeightPx;
            }

            // If we still have content, move to next page
            if (remainingCanvasHeight > 10) { // Tolerance of 10px
                pdf.addPage();
                currentY = margin;
            }
        }
        currentY += 5; // Margin after component
      }
    }

    // Add Page Numbers Footer
    const totalPages = pdf.getNumberOfPages();
    pdf.setFontSize(9);
    pdf.setTextColor(150);
    
    for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        const footerText = `Page ${i} of ${totalPages} | Generated by KTS EduAnalytics By:M.Adnan `;
        pdf.text(footerText, pdfWidth / 2, pdfHeight - 10, { align: 'center' });
    }

    pdf.save(`${fileName}.pdf`);
  } catch (err) {
    console.error("PDF Export failed", err);
    alert("Could not generate PDF. Please try again.");
  }
};

export const exportToWord = (elementId: string, fileName: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Simple HTML export for Word
  const header = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' 
          xmlns:w='urn:schemas-microsoft-com:office:word' 
          xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>${fileName}</title>
      <style>
        body { font-family: Calibri, sans-serif; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
        th, td { border: 1px solid #000; padding: 8px; text-align: left; }
        th { background-color: #f3f4f6; }
        h1, h2, h3 { color: #2E74B5; }
        .chart-container { display: none; }
      </style>
    </head>
    <body>
      <h1>${fileName.replace(/_/g, ' ')}</h1>
  `;
  
  const footer = "</body></html>";
  const content = element.innerHTML;
  
  const sourceHTML = header + content + footer;
  
  const blob = new Blob(['\ufeff', sourceHTML], {
    type: 'application/msword'
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};