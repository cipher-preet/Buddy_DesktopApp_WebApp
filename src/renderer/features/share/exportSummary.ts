import type { ExportDocumentResult } from '@shared/types/electron-api';

import type { ExportFormat } from './shareSummary';

const downloadBlob = (content: BlobPart, type: string, fileName: string) => {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const printHtmlInFrame = (html: string) =>
  new Promise<void>((resolve) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    frame.srcdoc = html;
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
      window.setTimeout(() => {
        frame.remove();
        resolve();
      }, 500);
    };
    document.body.appendChild(frame);
  });

/** Saves via the native dialog in Electron; falls back to browser download/print. */
export const exportSummaryDocument = async (
  format: ExportFormat,
  html: string,
  fileName: string,
): Promise<ExportDocumentResult> => {
  const electronApi = window.electronApi;

  if (electronApi?.exportPdf && electronApi.exportDoc) {
    return format === 'pdf'
      ? electronApi.exportPdf({ html, fileName })
      : electronApi.exportDoc({ html, fileName });
  }

  if (format === 'doc') {
    downloadBlob(`\ufeff${html}`, 'application/msword', `${fileName}.doc`);
  } else {
    await printHtmlInFrame(html);
  }

  return { saved: true };
};

export const revealExportedFile = (filePath: string) => {
  void window.electronApi?.revealFile?.(filePath);
};
