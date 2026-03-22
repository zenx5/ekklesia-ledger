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

function generateTable(doc, body = []){
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], fontSize: 9 },
      body
    });
}

export function generateEntradaPDF(data: EntradaReportData) {
    const doc = new jsPDF();

    // 1. Encabezado (Logo y Título)
    autoTable(doc, {
      startY: 15,
      theme: 'plain',
      styles: { textColor: [0, 0, 0], fontSize: 12, fontStyle: 'bold' },
      body: [
        ['[LOGO EKKLESIA]', 'RELATÓRIO FINANCEIRO - ENTRADAS']
      ],
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center', fontSize: 14 }
      }
    });

    // 2. Información del Evento
    generateTable(doc, [
        [
          { content: 'DAT.: 14/12/2025', colSpan: 2 },
          { content: 'DOMINGO', colSpan: 2 }
        ],
        [{ content: 'PASTORES PRESENTES: FABIO LUIS COUTINHO', colSpan: 4 }],
        [{ content: 'DIACONOS EM SERVIÇO: ROSELI / ODAIR', colSpan: 4 }],
        [{ content: 'PRELETOR: FABIO LUIS COUTINHO', colSpan: 4 }]
      ]
    );

    generateTable(doc, [
        [
          { content: 'PRESENTES: 75', colSpan: 2 },
          { content: 'VISITANTES:', colSpan: 2 }
        ],
        [{ content: 'BATIZADOS / RECEBIDOS:', colSpan: 4 }]
      ]
    );

    generateTable(doc, [
        [
          { content: 'OFERTAS GERAIS', colSpan: 3, styles: { fontStyle: 'bold' } },
          { content: 'R$ 143,00', styles: { fontStyle: 'bold' } }
        ]
      ]
    );

    // 3. Tabla de Dizimistas
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], fontSize: 9 },
      headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], halign: 'center' },
      head: [
        [{ content: 'RELAÇÃO DE DIZIMISTAS', colSpan: 3 }],
        ['VALOR', 'NOME', 'FORMA DE PAGAMENTO']
      ],
      body: [
        ['R$ 10,00', 'RODRIGO VALENÇA', 'PIX'],
        ['R$ 300,00', 'FLAVIA APARECIDA', 'PIX'],
        ['R$ 430,00', 'JUNIOR CARVALHO', 'PIX'],
        ['150,00', 'EDUARDA MACHADO', 'PIX'],
        ['250,00', 'DAIANE PEDRA', 'PIX'],
        [' ', ' ', ' '], // Espacios vacíos como en tu HTML
        [' ', ' ', ' ']
      ],
      columnStyles: {
        0: { cellWidth: 35 },
        2: { cellWidth: 50 }
      }
    });

    // 4. Totales Finales
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10 },
      body: [
        [
          { content: 'TOTAL DIZIMOS', colSpan: 2, styles: { fillColor: [249, 249, 249] } },
          { content: 'R$ 1.140,00', styles: { fillColor: [249, 249, 249] } }
        ],
        [
          { content: 'TOTAL ARRECADADO', colSpan: 2, styles: { fillColor: [221, 221, 221] } },
          { content: 'R$ 1.283,00', styles: { fillColor: [221, 221, 221] } }
        ]
      ],
      columnStyles: {
        0: { cellWidth: 35 }, // Mismo ancho que la columna 'VALOR' superior
      }
    });

    // 5. Sección de Firmas (Posicionamiento manual)
    const finalY = (doc as any).lastAutoTable.finalY + 35;
    doc.setFontSize(8);
    
    // Configuración de líneas (x1, y1, x2, y2)
    doc.line(20, finalY, 70, finalY); 
    doc.text('SECRETARIA', 45, finalY + 5, { align: 'center' });

    doc.line(80, finalY, 130, finalY);
    doc.text('TESOUREIRO', 105, finalY + 5, { align: 'center' });

    doc.line(140, finalY, 190, finalY);
    doc.text('PASTOR', 165, finalY + 5, { align: 'center' });

    // Descarga del archivo
    doc.save('Relatorio_Financeiro.pdf');
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
