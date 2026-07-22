import ExcelJS from "exceljs";

/**
 * Preview Excel di web — dibaca ULANG dari buffer .xlsx yang SAMA PERSIS
 * dengan yang didownload (bukan model data terpisah), supaya isi (angka,
 * teks, warna, border) dijamin identik. Styling visual di HTML tidak akan
 * 100% pixel-perfect dengan Excel native (keterbatasan platform web), tapi
 * datanya berasal dari file yang benar-benar sama.
 */

export type PreviewCell = {
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: "left" | "center" | "right";
  numeric?: boolean;
  fontColor?: string;
  fillColor?: string;
  bordered?: boolean;
  colSpan?: number;
  rowSpan?: number;
};

export type PreviewSheet = {
  name: string;
  rows: (PreviewCell | null)[][];
  colWidthsPx: number[];
};

export type ExcelPreviewModel = {
  sheets: PreviewSheet[];
};

function argbToCss(argb?: string): string | undefined {
  if (!argb || argb.length < 6) return undefined;
  return `#${argb.slice(-6)}`;
}

/** "B2" -> { col: 2, row: 2 } (1-indexed, huruf basis-26). */
function parseAddress(addr: string): { col: number; row: number } {
  const match = addr.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return { col: 0, row: 0 };

  let col = 0;
  for (const ch of match[1].toUpperCase()) {
    col = col * 26 + (ch.charCodeAt(0) - 64);
  }
  return { col, row: Number(match[2]) };
}

type MergeInfo = { colSpan: number; rowSpan: number };

function buildMergeMaps(merges: string[]) {
  const masters = new Map<string, MergeInfo>();
  const covered = new Set<string>();

  for (const range of merges) {
    const [startAddr, endAddr] = range.split(":");
    if (!endAddr) continue;

    const start = parseAddress(startAddr);
    const end = parseAddress(endAddr);
    const colSpan = end.col - start.col + 1;
    const rowSpan = end.row - start.row + 1;

    masters.set(`${start.row}:${start.col}`, { colSpan, rowSpan });

    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        if (r === start.row && c === start.col) continue;
        covered.add(`${r}:${c}`);
      }
    }
  }

  return { masters, covered };
}

export async function bufferToPreviewModel(
  buffer: Buffer
): Promise<ExcelPreviewModel> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

  const sheets: PreviewSheet[] = workbook.worksheets.map((worksheet) => {
    const { masters, covered } = buildMergeMaps(worksheet.model.merges || []);

    const rowCount = worksheet.rowCount;
    const colCount = worksheet.columnCount;
    const rows: (PreviewCell | null)[][] = [];

    for (let r = 1; r <= rowCount; r++) {
      const row = worksheet.getRow(r);
      const rowCells: (PreviewCell | null)[] = [];

      for (let c = 1; c <= colCount; c++) {
        const key = `${r}:${c}`;

        if (covered.has(key)) {
          rowCells.push(null);
          continue;
        }

        const cell = row.getCell(c);
        const merge = masters.get(key);
        const isNumeric = typeof cell.value === "number";
        const align = cell.alignment?.horizontal;

        rowCells.push({
          text: String(cell.text ?? ""),
          bold: cell.font?.bold || undefined,
          italic: cell.font?.italic || undefined,
          align:
            align === "left" || align === "center" || align === "right"
              ? align
              : undefined,
          numeric: isNumeric || undefined,
          fontColor: argbToCss(cell.font?.color?.argb),
          fillColor:
            cell.fill?.type === "pattern" && cell.fill.pattern === "solid"
              ? argbToCss(
                  (cell.fill.fgColor as { argb?: string } | undefined)?.argb
                )
              : undefined,
          bordered: Boolean(
            cell.border &&
              (cell.border.top ||
                cell.border.bottom ||
                cell.border.left ||
                cell.border.right)
          ),
          colSpan: merge && merge.colSpan > 1 ? merge.colSpan : undefined,
          rowSpan: merge && merge.rowSpan > 1 ? merge.rowSpan : undefined,
        });
      }

      rows.push(rowCells);
    }

    // worksheet.columns tidak selalu ter-populate benar setelah .xlsx.load()
    // (bisa balik ke default sempit) — baca per-kolom lewat getColumn() yang
    // lebih andal, dengan lebar minimum supaya teks label tidak pecah
    // karakter-per-baris kalau lebar tak terbaca sama sekali.
    const MIN_WIDTH_PX = 110;
    const colWidthsPx = Array.from({ length: colCount }, (_, i) => {
      const width = worksheet.getColumn(i + 1).width;
      return Math.max(MIN_WIDTH_PX, Math.round((width ?? 18) * 7.5));
    });

    return { name: worksheet.name, rows, colWidthsPx };
  });

  return { sheets };
}
