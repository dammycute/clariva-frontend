import jsPDF from 'jspdf';

interface ReceiptItem {
  feeName: string;
  amountDue: number;
}

interface ReceiptData {
  schoolName: string;
  studentName: string;
  admissionNo: string;
  items: ReceiptItem[];
  amountDue: number;
  amountPaid: number;
  balance: number;
  paymentMethod: string | null;
  paymentRef: string | null;
  date: string;
}

export function generateReceiptPDF(data: ReceiptData) {
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const pageW = doc.internal.pageSize.getWidth();

  doc.setFillColor(13, 43, 85);
  doc.rect(0, 0, pageW, 30, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CLARIVA', pageW / 2, 14, { align: 'center' });
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('School Management Platform', pageW / 2, 22, { align: 'center' });

  doc.setTextColor(13, 43, 85);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PAYMENT RECEIPT', pageW / 2, 42, { align: 'center' });

  const lineY = 48;
  doc.setDrawColor(26, 122, 74);
  doc.setLineWidth(0.5);
  doc.line(15, lineY, pageW - 15, lineY);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(data.schoolName, 15, 56);

  let y = 66;
  const leftX = 15;
  const rightX = pageW / 2 + 5;
  const labelColor: [number, number, number] = [100, 116, 139];
  const valueColor: [number, number, number] = [13, 43, 85];
  const lineH = 7;

  doc.setFontSize(9);
  const fields = [
    { label: 'Student:', value: data.studentName, col: 'left' },
    { label: 'Admission No:', value: data.admissionNo, col: 'left' },
    { label: 'Date:', value: data.date, col: 'right' },
    { label: 'Method:', value: data.paymentMethod || '—', col: 'right' },
    { label: 'Ref No:', value: data.paymentRef || '—', col: 'right' },
  ];

  fields.forEach(f => {
    const x = f.col === 'left' ? leftX : rightX;
    doc.setTextColor(...labelColor);
    doc.setFont('helvetica', 'normal');
    doc.text(f.label, x, y);
    doc.setTextColor(...valueColor);
    doc.setFont('helvetica', 'bold');
    doc.text(f.value, x + 28, y);
    y += lineH;
  });

  y += 4;
  const tableX = 15;
  const colWidths = [50, 25, 25, 30];
  const totalW = colWidths.reduce((a, b) => a + b, 0);
  const headers = ['Fee Item', 'Due', 'Paid', 'Balance'];

  doc.setFillColor(13, 43, 85);
  doc.rect(tableX, y, totalW, 6, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  let cx = tableX;
  headers.forEach((h, i) => {
    doc.text(h, cx + 2, y + 4);
    cx += colWidths[i];
  });
  y += 6;

  const items = data.items.length > 0 ? data.items : [{ feeName: 'Fee', amountDue: data.amountDue }];
  items.forEach((item, idx) => {
    const rowColor = idx % 2 === 0 ? 247 : 255;
    doc.setFillColor(rowColor, rowColor, rowColor);
    doc.rect(tableX, y, totalW, 6, 'F');
    doc.setTextColor(13, 43, 85);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const rowValues = [
      item.feeName,
      `₦${item.amountDue.toLocaleString()}`,
      '',
      '',
    ];
    cx = tableX;
    rowValues.forEach((v, i) => {
      doc.text(v, cx + 2, y + 4);
      cx += colWidths[i];
    });
    y += 6;
  });

  doc.setFillColor(247, 249, 252);
  doc.rect(tableX, y, totalW, 6, 'F');
  doc.setTextColor(13, 43, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  const totalValues = ['Total', `₦${data.amountDue.toLocaleString()}`, `₦${data.amountPaid.toLocaleString()}`, `₦${data.balance.toLocaleString()}`];
  cx = tableX;
  totalValues.forEach((v, i) => {
    if (i === 3 && data.balance > 0) {
      doc.setTextColor(185, 28, 28);
    } else if (i === 2) {
      doc.setTextColor(26, 122, 74);
    } else {
      doc.setTextColor(13, 43, 85);
    }
    doc.text(v, cx + 2, y + 4);
    cx += colWidths[i];
  });
  y += 8;

  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(15, y + 4, pageW - 15, y + 4);
  doc.setTextColor(148, 163, 184);
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('This is a computer-generated receipt. No signature required.', pageW / 2, y + 12, { align: 'center' });
  doc.text(`Generated on ${data.date} via Clariva`, pageW / 2, y + 17, { align: 'center' });

  doc.save(`receipt-${data.admissionNo}.pdf`);
}
