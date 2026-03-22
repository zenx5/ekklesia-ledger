import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import logoEkklesia from "../assets/logo.png";

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

function generateHeaderTable(doc, title: string){
  doc.addImage(logoEkklesia, 'PNG', 15, 10, 25, 20);

  autoTable(doc, {
      startY: 15,
      theme: 'plain',
      styles: { textColor: [0, 0, 0], fontSize: 12, fontStyle: 'bold' },
      body: [
        ['', title]
      ],
      columnStyles: {
        0: { cellWidth: 50 },
        1: { halign: 'center', fontSize: 14 }
      }
    });
}

export function generateEntradaPDF(data: EntradaReportData) {
    const doc = new jsPDF();

    // 1. Encabezado (Logo y Título)
    generateHeaderTable(doc, 'RELATÓRIO FINANCEIRO - ENTRADAS')

    // 2. Información del Evento
    generateTable(doc, [
        [
          { content: 'DAT.: ' + formatDate(data.data_culto), colSpan: 2 },
          { content: calculateDay(data.data_culto), colSpan: 2 }
        ],
        [{ content: 'PASTORES PRESENTES: ' + (data.pastores_presentes || ''), colSpan: 4 }],
        [{ content: 'DIACONOS EM SERVIÇO: ' + (data.diaconos_servico || ''), colSpan: 4 }],
        [{ content: 'PRELETOR: ' + (data.preletor || ''), colSpan: 4 }]
      ]
    );

    generateTable(doc, [
        [
          { content: 'PRESENTES: ' + (data.quantidade_presentes || ''), colSpan: 2 },
          { content: 'VISITANTES:' + (data.quantidade_visitantes || ''), colSpan: 2 }
        ],
        [{ content: 'BATIZADOS / RECEBIDOS:' + (data.quantidade_batizados || ''), colSpan: 4 }]
      ]
    );

    generateTable(doc, [
        [
          { content: 'OFERTAS GERAIS', colSpan: 3, styles: { fontStyle: 'bold' } },
          { content: formatCurrency(data.ofertas_gerais || 0), styles: { fontStyle: 'bold' } }
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
        ...data.tithers.map(t => [ formatCurrency(t.valor), t.nome, getPaymentLabel(t.forma_pagamento) ]),
        ['', '', '']
      ],
      columnStyles: {
        0: { cellWidth: 35 },
        2: { cellWidth: 50 }
      }
    });

    const total_dizimos = data.tithers.reduce((sum, t) => sum + t.valor, 0);
    const total_arrecadado = total_dizimos + (data.ofertas_gerais || 0);
    // 4. Totales Finales
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY,
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10 },
      body: [
        [
          { content: 'TOTAL DIZIMOS', colSpan: 2, styles: { fillColor: [249, 249, 249] } },
          { content: formatCurrency(total_dizimos || 0), styles: { fillColor: [249, 249, 249] } }
        ],
        [
          { content: 'TOTAL ARRECADADO', colSpan: 2, styles: { fillColor: [221, 221, 221] } },
          { content: formatCurrency(total_arrecadado || 0), styles: { fillColor: [221, 221, 221] } }
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
    doc.save('relatorio-entrada-' + formatDate(data.data_culto) + '.pdf');
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

    // 1. Encabezado (Logo y Título)
    generateHeaderTable(doc, 'RELATÓRIO FINANCEIRO - SAÍDAS')

    // 2. Información del Evento
    generateTable(doc, [
        [
          { content: 'DATA: ' + expense.data_saida, colSpan: 2 },
          { content: calculateDay(expense.data_saida), colSpan: 2 }
        ],
        [
          { content: 'RESPONSÁVEL', colSpan: 2 },
          { content: expense.responsavel || 'NÃO INFORMADO', colSpan: 2 }
        ]
      ]
    );

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], fontSize: 9, minCellHeight: 4 },
      headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], halign: 'center' },
      head: [
        [{ content: 'DESCRIÇÃo', colSpan: 3 }],
      ],
      body: [
        [{ content: expense.descricao || 'NÃO INFORMADO', colSpan: 3 }]
      ]
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], fontSize: 9, halign: 'center' },
      headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], halign: 'center' },
      head: [
        ['VALOR', 'CATEGORIA', 'FORMA DE PAGAMENTO']
      ],
      body: [
        [ formatCurrency(expense.valor), expense.categoria, getPaymentLabel(expense.forma_pagamento) ]
      ]
    });

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 5,
      theme: 'grid',
      styles: { lineColor: [0, 0, 0], lineWidth: 0.1, textColor: [0, 0, 0], fontSize: 9, minCellHeight: 4 },
      headStyles: { fillColor: [242, 242, 242], textColor: [0, 0, 0], halign: 'center' },
      head: [
        [{ content: 'OBSERVAÇÕES', colSpan: 3 }],
      ],
      body: [
        [{ content: expense.observacoes || 'NÃO INFORMADO', colSpan: 3 }]
      ]
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
    doc.save('relatorio-saida-' + formatDate(expense.data_saida) + '.pdf');
}

function calculateDay(date: string) {
  const days = ['DOMINGO', 'SEGUNDA-FEIRA', 'TERÇA-FEIRA', 'QUARTA-FEIRA', 'QUINTA-FEIRA', 'SEXTA-FEIRA', 'SÁBADO'];
  const d = new Date(date + "T12:00:00");
  return days[d.getDay()];
}