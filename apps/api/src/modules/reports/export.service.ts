import { Injectable } from "@nestjs/common";
import { ReportsService } from "./reports.service";
import { ReportQueryDto } from "./dto/query-report.dto";
import * as ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { format } from "date-fns";

const STATUS_LABELS: Record<string, string> = {
  NEW: "Yangi", PROCESSING: "Jarayonda", ASSIGNED: "Biriktirilgan",
  DELIVERED: "Yetkazildi", CANCELLED: "Bekor qilindi",
};
const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Naqd", CARD: "Karta", DEBT: "Nasiya", FREE: "Bepul",
};

@Injectable()
export class ExportService {
  constructor(private reportsService: ReportsService) {}

  async toExcel(query: ReportQueryDto): Promise<Buffer> {
    const { orders, period } = await this.reportsService.getExportData(query);
    const overview = await this.reportsService.getOverview(query);

    const wb = new ExcelJS.Workbook();
    wb.creator = "AquaERP";
    wb.created = new Date();

    // Summary sheet
    const summary = wb.addWorksheet("Xulosa");
    summary.columns = [
      { header: "Ko'rsatkich", key: "metric", width: 30 },
      { header: "Qiymat", key: "value", width: 25 },
    ];
    summary.getRow(1).font = { bold: true };
    summary.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };
    summary.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

    const rows = [
      ["Davr", `${format(period.from, "dd.MM.yyyy")} — ${format(period.to, "dd.MM.yyyy")}`],
      ["Jami buyurtmalar", overview.orders.total],
      ["Yetkazilgan", overview.orders.delivered],
      ["Bekor qilingan", overview.orders.cancelled],
      ["Sotilgan suv (dona)", overview.water.sold],
      ["Qaytarilgan tara", overview.water.bottlesReturned],
      ["Kirim (so'm)", overview.finance.income],
      ["Chiqim (so'm)", overview.finance.expense],
      ["Sof foyda (so'm)", overview.finance.profit],
      ["Yangi mijozlar", overview.newCustomers],
    ];
    rows.forEach((r) => summary.addRow({ metric: r[0], value: r[1] }));

    // Orders sheet
    const ws = wb.addWorksheet("Buyurtmalar");
    ws.columns = [
      { header: "№", key: "num", width: 18 },
      { header: "Mijoz", key: "customer", width: 25 },
      { header: "Telefon", key: "phone", width: 18 },
      { header: "Soni", key: "qty", width: 10 },
      { header: "Summa", key: "total", width: 15 },
      { header: "To'lov", key: "payment", width: 12 },
      { header: "Status", key: "status", width: 15 },
      { header: "Haydovchi", key: "driver", width: 20 },
      { header: "Sana", key: "date", width: 18 },
    ];
    const header = ws.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF2563EB" } };

    orders.forEach((o) => {
      ws.addRow({
        num: o.orderNumber,
        customer: o.customer.name,
        phone: o.customer.phone,
        qty: o.quantity,
        total: Number(o.totalAmount),
        // Ochiq zakazda to'lov turi hali tanlanmagan bo'lishi mumkin (null)
        payment: o.paymentType ? PAYMENT_LABELS[o.paymentType] : "—",
        status: STATUS_LABELS[o.status],
        driver: o.driver?.name ?? "—",
        date: format(new Date(o.createdAt), "dd.MM.yyyy HH:mm"),
      });
    });

    ws.getColumn("total").numFmt = "#,##0";

    const buffer = await wb.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async toPdf(query: ReportQueryDto): Promise<Buffer> {
    const { orders, period } = await this.reportsService.getExportData(query);
    const overview = await this.reportsService.getOverview(query);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 40 });
      const chunks: Buffer[] = [];
      doc.on("data", (c) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // Header
      doc.fontSize(20).fillColor("#2563eb").text("AquaERP Hisoboti", { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(10).fillColor("#666").text(
        `Davr: ${format(period.from, "dd.MM.yyyy")} — ${format(period.to, "dd.MM.yyyy")}`,
        { align: "center" }
      );
      doc.moveDown(1);

      // Summary box
      doc.fontSize(13).fillColor("#000").text("Umumiy ko'rsatkichlar", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#333");
      const summaryLines = [
        `Jami buyurtmalar: ${overview.orders.total}`,
        `Yetkazilgan: ${overview.orders.delivered}    Bekor: ${overview.orders.cancelled}`,
        `Sotilgan suv: ${overview.water.sold} dona    Qaytarilgan tara: ${overview.water.bottlesReturned}`,
        `Kirim: ${overview.finance.income.toLocaleString()} so'm`,
        `Chiqim: ${overview.finance.expense.toLocaleString()} so'm`,
        `Sof foyda: ${overview.finance.profit.toLocaleString()} so'm`,
        `Yangi mijozlar: ${overview.newCustomers}`,
      ];
      summaryLines.forEach((line) => doc.text(line));
      doc.moveDown(1);

      // Orders table
      doc.fontSize(13).fillColor("#000").text("Buyurtmalar", { underline: true });
      doc.moveDown(0.5);

      const tableTop = doc.y;
      const cols = [
        { label: "№", x: 40, w: 90 },
        { label: "Mijoz", x: 130, w: 110 },
        { label: "Soni", x: 240, w: 40 },
        { label: "Summa", x: 280, w: 75 },
        { label: "Status", x: 355, w: 80 },
        { label: "Sana", x: 435, w: 110 },
      ];

      doc.fontSize(8).fillColor("#fff");
      doc.rect(40, tableTop, 515, 18).fill("#2563eb");
      doc.fillColor("#fff");
      cols.forEach((c) => doc.text(c.label, c.x + 2, tableTop + 5, { width: c.w }));

      let y = tableTop + 20;
      doc.fillColor("#333");
      orders.slice(0, 35).forEach((o, i) => {
        if (i % 2 === 0) { doc.rect(40, y - 2, 515, 16).fill("#f3f4f6"); doc.fillColor("#333"); }
        doc.fontSize(7);
        doc.text(o.orderNumber, cols[0].x + 2, y, { width: cols[0].w });
        doc.text(o.customer.name, cols[1].x + 2, y, { width: cols[1].w });
        doc.text(String(o.quantity), cols[2].x + 2, y, { width: cols[2].w });
        doc.text(Number(o.totalAmount).toLocaleString(), cols[3].x + 2, y, { width: cols[3].w });
        doc.text(STATUS_LABELS[o.status], cols[4].x + 2, y, { width: cols[4].w });
        doc.text(format(new Date(o.createdAt), "dd.MM.yyyy"), cols[5].x + 2, y, { width: cols[5].w });
        y += 16;
        if (y > 780) { doc.addPage(); y = 40; }
      });

      doc.end();
    });
  }
}
