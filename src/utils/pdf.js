import { jsPDF } from 'jspdf';
import { rupees, shortDate } from './format.js';

function header(doc, title) {
  doc.setDrawColor(23, 51, 92);
  doc.setLineWidth(0.8);
  doc.rect(12, 12, 186, 25);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('NATIONAL INSTITUTE OF TECHNOLOGY', 105, 22, { align: 'center' });
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Academic Administration Office', 105, 28, { align: 'center' });
  doc.text('Student Document Management Cell', 105, 33, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title, 105, 48, { align: 'center' });
}

function pair(doc, label, value, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.text(label, x, y);
  doc.setFont('helvetica', 'normal');
  doc.text(String(value || '-'), x + 46, y);
}

export function paymentReceiptPdf(application, payment) {
  const doc = new jsPDF();
  header(doc, 'PAYMENT RECEIPT');
  doc.setFontSize(10);
  pair(doc, 'Student Name', application.full_name, 22, 66);
  pair(doc, 'Application ID', application.id, 22, 76);
  pair(doc, 'Payment ID', payment.payment_id, 22, 86);
  pair(doc, 'Document Type', application.document_type, 22, 96);
  pair(doc, 'Amount', rupees(application.amount), 22, 106);
  pair(doc, 'Payment Status', 'Paid', 22, 116);
  pair(doc, 'Date / Time', shortDate(payment.created_at), 22, 126);
  doc.setDrawColor(216, 222, 232);
  doc.line(22, 142, 188, 142);
  doc.setFontSize(9);
  doc.text('This is a system generated receipt from the college ERP document request module.', 22, 152);
  doc.text('Please quote the Application ID for all academic office correspondence.', 22, 159);
  return doc.output('blob');
}

export function officialDocumentPdf(application) {
  const doc = new jsPDF();
  header(doc, application.document_type.toUpperCase());
  doc.setFontSize(10);
  pair(doc, 'Application ID', application.id, 22, 66);
  pair(doc, 'Register No.', application.register_number, 22, 76);
  pair(doc, 'Student Name', application.full_name, 22, 86);
  pair(doc, 'Department', application.department, 22, 96);
  pair(doc, 'Academic Year', application.year, 22, 106);
  pair(doc, 'Issue Date', new Date().toLocaleDateString('en-IN'), 22, 116);

  doc.setFont('helvetica', 'normal');
  const body = bodyFor(application);
  doc.text(doc.splitTextToSize(body, 166), 22, 136);

  doc.setDrawColor(216, 222, 232);
  doc.line(22, 226, 80, 226);
  doc.line(130, 226, 188, 226);
  doc.setFont('helvetica', 'bold');
  doc.text('Prepared By', 22, 234);
  doc.text('Authorized Signatory', 130, 234);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Academic Administration Office', 22, 241);
  doc.text('Dean / Registrar Office', 130, 241);
  doc.text('Official seal to be affixed by the issuing office.', 22, 266);
  return doc.output('blob');
}

function bodyFor(application) {
  if (application.document_type === 'Bonafide Certificate') {
    return `This is to certify that ${application.full_name}, Register Number ${application.register_number}, is a bonafide student of ${application.department}, ${application.year}. This certificate is issued for the purpose of ${application.purpose}.`;
  }
  if (application.document_type === 'Transfer Certificate') {
    return `Based on the records available with the Academic Administration Office, this Transfer Certificate has been prepared for ${application.full_name}, Register Number ${application.register_number}. The student details have been verified against institute records.`;
  }
  if (application.document_type === 'Fee Receipt') {
    return `This document confirms that the student request has been processed by the accounts and academic office. The receipt is issued to ${application.full_name} for official submission related to ${application.purpose}.`;
  }
  if (application.document_type === 'Transcript') {
    return `The transcript request for ${application.full_name}, Register Number ${application.register_number}, has been reviewed and approved for official issue. Academic records are to be attached or printed by the examination section.`;
  }
  return `The marksheet request for ${application.full_name}, Register Number ${application.register_number}, has been reviewed and approved for official issue by the academic office.`;
}
