import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

const formatDate = (date: string) =>
  new Date(date + "T12:00:00").toLocaleDateString("pt-BR");

const getPaymentLabel = (p: string) => {
  const labels: Record<string, string> = { dinheiro: "Dinheiro", pix: "PIX", transferencia: "Transferência", boleto: "Boleto" };
  return labels[p] || p;
};

interface EntradaReportData {
  data_culto: string;
  pastores_presentes: string | null;
  diaconos_servico: string | null;
  preletor: string | null;
  quantidade_presentes: number | null;
  quantidade_visitantes: number | null;
  quantidade_batizados: number | null;
  ofertas_gerais: number | null;
  dizimos_total: number | null;
  total_arrecadacao: number | null;
  observacoes: string | null;
  tithers: { nome: string; valor: number; forma_pagamento: string }[];
}

export function generateEntradaPDF(report: EntradaReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório Financeiro de Entrada", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Data do Culto: ${formatDate(report.data_culto)}`, pageWidth / 2, 28, { align: "center" });

  let y = 38;

  // Info section
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Informações do Culto", 14, y);
  y += 6;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  const info = [
    ["Pastores Presentes", report.pastores_presentes || "-"],
    ["Diáconos em Serviço", report.diaconos_servico || "-"],
    ["Preletor", report.preletor || "-"],
    ["Presentes", String(report.quantidade_presentes || 0)],
    ["Visitantes", String(report.quantidade_visitantes || 0)],
    ["Batizados/Recebidos", String(report.quantidade_batizados || 0)],
  ];

  autoTable(doc, {
    startY: y,
    body: info,
    theme: "plain",
    styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Finances summary
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro", 14, y);
  y += 6;

  autoTable(doc, {
    startY: y,
    body: [
      ["Ofertas Gerais", formatCurrency(Number(report.ofertas_gerais || 0))],
      ["Total Dízimos", formatCurrency(Number(report.dizimos_total || 0))],
      ["Total Arrecadação", formatCurrency(Number(report.total_arrecadacao || 0))],
    ],
    theme: "grid",
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 60 }, 1: { halign: "right" } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // Tithers table
  if (report.tithers.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Relação de Dizimistas", 14, y);
    y += 6;

    autoTable(doc, {
      startY: y,
      head: [["Nome", "Forma de Pagamento", "Valor (R$)"]],
      body: report.tithers.map((t) => [t.nome, getPaymentLabel(t.forma_pagamento), formatCurrency(t.valor)]),
      foot: [["Total", "", formatCurrency(report.tithers.reduce((s, t) => s + t.valor, 0))]],
      theme: "grid",
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [41, 128, 185] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
      columnStyles: { 2: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // Observations
  if (report.observacoes) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Observações", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(report.observacoes, pageWidth - 28);
    doc.text(lines, 14, y);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.save(`entrada_${report.data_culto}.pdf`);
}

interface SaidaReportData {
  data_saida: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  forma_pagamento: string;
  responsavel: string | null;
  observacoes: string | null;
}

export function generateSaidaPDF(expense: SaidaReportData) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Comprovante de Saída", pageWidth / 2, 20, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Data: ${formatDate(expense.data_saida)}`, pageWidth / 2, 28, { align: "center" });

  let y = 40;

  autoTable(doc, {
    startY: y,
    body: [
      ["Descrição", expense.descricao],
      ["Categoria", expense.categoria || "-"],
      ["Responsável", expense.responsavel || "-"],
      ["Forma de Pagamento", getPaymentLabel(expense.forma_pagamento)],
      ["Valor", formatCurrency(expense.valor)],
    ],
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 4 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 55 }, 1: { halign: "left" } },
    margin: { left: 14, right: 14 },
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  if (expense.observacoes) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Observações", 14, y);
    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lines = doc.splitTextToSize(expense.observacoes, pageWidth - 28);
    doc.text(lines, 14, y);
  }

  // Footer
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, pageWidth / 2, pageHeight - 10, { align: "center" });

  doc.save(`saida_${expense.data_saida}.pdf`);
}
