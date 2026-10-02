import type { WorkspaceNote, WorkspaceSpace, WorkspaceTask } from '@/features/dashboard/homeTypes';

export type ShareMode = 'complete' | 'custom';
export type ExportFormat = 'pdf' | 'doc';

type SummaryInput = {
  space: WorkspaceSpace;
  tasks: WorkspaceTask[];
  notes: WorkspaceNote[];
  mode: ShareMode;
  format: ExportFormat;
  preparedBy?: string;
  generatedAt?: Date;
};

const statusLabel: Record<WorkspaceTask['status'], string> = {
  done: 'Done',
  open: 'Open',
  review: 'Review',
};

const priorityColor: Record<WorkspaceTask['priority'], { fg: string; bg: string }> = {
  High: { fg: '#b42318', bg: '#fef3f2' },
  Medium: { fg: '#b7791f', bg: '#fff3cf' },
  Low: { fg: '#0f8b63', bg: '#dff7ec' },
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const multiline = (value: string) => escapeHtml(value).replace(/\r?\n/g, '<br />');

const formatDate = (date: Date) =>
  date.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const buildSummaryFileName = (space: WorkspaceSpace, date = new Date()) => {
  const day = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');

  return `${space.name} - KukuNotes summary - ${day}`;
};

const renderTasks = (tasks: WorkspaceTask[]) => {
  if (!tasks.length) {
    return '<p class="empty">No tasks included in this summary.</p>';
  }

  const rows = tasks
    .map((task, index) => {
      const tone = priorityColor[task.priority];
      return `
        <tr>
          <td class="num">${index + 1}</td>
          <td>
            <div class="item-title">${escapeHtml(task.title)}</div>
            ${task.description ? `<div class="item-body">${multiline(task.description)}</div>` : ''}
          </td>
          <td><span class="pill" style="color:${tone.fg};background:${tone.bg};">${task.priority}</span></td>
          <td class="nowrap">${escapeHtml(task.dueDate)}</td>
          <td class="nowrap status-${task.status}">${statusLabel[task.status]}</td>
        </tr>`;
    })
    .join('');

  return `
    <table class="items" cellspacing="0" cellpadding="0">
      <thead>
        <tr>
          <th class="num">#</th>
          <th>Task</th>
          <th>Priority</th>
          <th>Due</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
};

const renderNotes = (notes: WorkspaceNote[]) => {
  if (!notes.length) {
    return '<p class="empty">No notes included in this summary.</p>';
  }

  return notes
    .map(
      (note) => `
      <div class="note">
        <div class="item-title">${escapeHtml(note.title)}</div>
        <div class="note-date">${escapeHtml(note.dateLabel)}</div>
        ${note.excerpt ? `<div class="item-body">${multiline(note.excerpt)}</div>` : ''}
      </div>`,
    )
    .join('');
};

export const buildSummaryHtml = ({
  space,
  tasks,
  notes,
  mode,
  format,
  preparedBy,
  generatedAt = new Date(),
}: SummaryInput) => {
  const doneCount = tasks.filter((task) => task.status === 'done').length;
  const openCount = tasks.length - doneCount;
  const highCount = tasks.filter((task) => task.priority === 'High' && task.status !== 'done').length;
  const scopeLabel = mode === 'complete' ? 'Complete share' : 'Custom share';
  const isWord = format === 'doc';

  const stats = [
    { label: 'Tasks', value: tasks.length },
    { label: 'Completed', value: doneCount },
    { label: 'Open', value: openCount },
    { label: 'High priority', value: highCount },
    { label: 'Notes', value: notes.length },
  ];

  const wordHead = isWord
    ? `<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->`
    : '';

  return `<!DOCTYPE html>
<html${isWord ? ' xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"' : ' lang="en"'}>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(space.name)} · KukuNotes summary</title>
${wordHead}
<style>
  ${isWord ? '@page { size: 21cm 29.7cm; margin: 2cm; }' : ''}
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #101828;
    font-family: 'Segoe UI', Inter, Roboto, 'Helvetica Neue', Arial, sans-serif;
    font-size: 11pt;
    line-height: 1.5;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .header { padding-bottom: 14pt; border-bottom: 2pt solid #1355ff; }
  .brand { color: #1355ff; font-size: 9pt; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
  h1 { margin: 4pt 0 2pt; font-size: 22pt; line-height: 1.2; letter-spacing: -0.01em; }
  .description { margin: 4pt 0 0; color: #475467; }
  .meta { margin-top: 8pt; color: #667085; font-size: 9pt; }
  .meta span { margin-right: 14pt; }
  .scope { color: #1355ff; font-weight: 600; }
  table.stats { width: 100%; margin: 16pt 0 6pt; border-collapse: separate; border-spacing: 6pt 0; }
  table.stats td { width: 20%; padding: 10pt; border: 1pt solid #dbe2ec; border-radius: 8pt; background: #f6f8fc; text-align: left; }
  .stat-value { display: block; color: #101828; font-size: 18pt; font-weight: 700; line-height: 1.1; }
  .stat-label { display: block; color: #667085; font-size: 8.5pt; font-weight: 600; letter-spacing: 0.04em; text-transform: uppercase; }
  h2 { margin: 20pt 0 8pt; padding-bottom: 5pt; border-bottom: 1pt solid #dbe2ec; font-size: 13pt; }
  h2 small { color: #667085; font-size: 10pt; font-weight: 500; }
  table.items { width: 100%; border-collapse: collapse; }
  table.items th { padding: 7pt 8pt; border-bottom: 1pt solid #c7d0dd; color: #667085; background: #f6f8fc; font-size: 8.5pt; font-weight: 700; letter-spacing: 0.04em; text-align: left; text-transform: uppercase; }
  table.items td { padding: 8pt; border-bottom: 1pt solid #eaeef4; vertical-align: top; }
  table.items tr { page-break-inside: avoid; }
  .num { width: 24pt; color: #94a3b8; }
  .nowrap { white-space: nowrap; }
  .item-title { font-weight: 600; }
  .item-body { margin-top: 2pt; color: #475467; font-size: 10pt; }
  .pill { display: inline-block; padding: 1pt 7pt; border-radius: 999px; font-size: 8.5pt; font-weight: 700; }
  .status-done { color: #0f8b63; font-weight: 600; }
  .status-open { color: #1355ff; font-weight: 600; }
  .status-review { color: #b7791f; font-weight: 600; }
  .note { margin-bottom: 8pt; padding: 10pt 12pt; border: 1pt solid #dbe2ec; border-left: 3pt solid #1355ff; border-radius: 6pt; page-break-inside: avoid; }
  .note-date { color: #667085; font-size: 8.5pt; }
  .empty { color: #667085; font-style: italic; }
  .footer { margin-top: 24pt; padding-top: 8pt; border-top: 1pt solid #dbe2ec; color: #94a3b8; font-size: 8.5pt; }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">KukuNotes · Space summary</div>
    <h1>${escapeHtml(space.name)}</h1>
    ${space.description ? `<p class="description">${multiline(space.description)}</p>` : ''}
    <div class="meta">
      <span class="scope">${scopeLabel}</span>
      <span>Generated ${escapeHtml(formatDate(generatedAt))}</span>
      ${preparedBy ? `<span>Prepared by ${escapeHtml(preparedBy)}</span>` : ''}
    </div>
  </div>

  <table class="stats" cellspacing="0" cellpadding="0">
    <tr>
      ${stats
        .map(
          (stat) =>
            `<td><span class="stat-value">${stat.value}</span><span class="stat-label">${stat.label}</span></td>`,
        )
        .join('')}
    </tr>
  </table>

  <h2>Tasks <small>(${tasks.length})</small></h2>
  ${renderTasks(tasks)}

  <h2>Notes <small>(${notes.length})</small></h2>
  ${renderNotes(notes)}

  <div class="footer">Exported from KukuNotes · ${escapeHtml(formatDate(generatedAt))}</div>
</body>
</html>`;
};
