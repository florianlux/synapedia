/**
 * Convert MDX/Markdown source to a static HTML string.
 * Uses a lightweight regex-based converter for the standard Markdown
 * elements used in Synapedia articles (headings, paragraphs, bold,
 * italic, links, blockquotes, tables, lists, code blocks).
 *
 * Returns null on any error so the publish flow never crashes.
 */

export async function mdxToHtml(source: string): Promise<string | null> {
  try {
    return convertMdxToHtml(source);
  } catch (err) {
    console.error("[mdxToHtml] Failed to convert MDX to HTML:", err);
    return null;
  }
}

function convertMdxToHtml(mdx: string): string {
  // Strip JSX import statements and component tags (MDX-specific)
  let text = mdx
    .replace(/^import\s+.*$/gm, "")
    .replace(/<[A-Z]\w*[^>]*\/>/g, "")
    .replace(/<[A-Z]\w*[^>]*>[\s\S]*?<\/[A-Z]\w*>/g, "");

  const lines = text.split("\n");
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Blank line
    if (line.trim() === "") {
      i++;
      continue;
    }

    // Fenced code block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(escapeHtml(lines[i]));
        i++;
      }
      i++; // skip closing ```
      const langAttr = lang ? ` class="language-${lang}"` : "";
      html.push(`<pre><code${langAttr}>${codeLines.join("\n")}</code></pre>`);
      continue;
    }

    // Heading
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      html.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`);
      i++;
      continue;
    }

    // Blockquote
    if (line.trim().startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      html.push(`<blockquote><p>${inlineFormat(quoteLines.join(" "))}</p></blockquote>`);
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}\s*$/.test(line.trim())) {
      html.push("<hr>");
      i++;
      continue;
    }

    // Table
    if (line.includes("|") && i + 1 < lines.length && /^\|?[\s-:|]+\|?$/.test(lines[i + 1].trim())) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      html.push(parseTable(tableLines));
      continue;
    }

    // Unordered list
    if (/^\s*[-*+]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*+]\s+/, ""));
        i++;
      }
      html.push("<ul>" + items.map((item) => `<li>${inlineFormat(item)}</li>`).join("") + "</ul>");
      continue;
    }

    // Ordered list
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      html.push("<ol>" + items.map((item) => `<li>${inlineFormat(item)}</li>`).join("") + "</ol>");
      continue;
    }

    // Paragraph (default)
    const paraLines: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !lines[i].match(/^#{1,6}\s/) && !lines[i].trim().startsWith(">") && !lines[i].trim().startsWith("```") && !/^[-*_]{3,}\s*$/.test(lines[i].trim())) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      html.push(`<p>${inlineFormat(paraLines.join(" "))}</p>`);
    }
  }

  return html.join("\n");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineFormat(text: string): string {
  return text
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img alt="$1" src="$2">')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>")
    // Bold
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // Italic
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // Inline code
    .replace(/`([^`]+)`/g, "<code>$1</code>");
}

function parseTable(lines: string[]): string {
  const rows = lines
    .filter((l) => !/^\|?[\s-:|]+\|?$/.test(l.trim()))
    .map((l) =>
      l.split("|").map((c) => c.trim()).filter((c) => c !== "")
    );

  if (rows.length === 0) return "";

  const [header, ...body] = rows;
  let table = "<table><thead><tr>";
  for (const cell of header) {
    table += `<th>${inlineFormat(cell)}</th>`;
  }
  table += "</tr></thead><tbody>";
  for (const row of body) {
    table += "<tr>";
    for (const cell of row) {
      table += `<td>${inlineFormat(cell)}</td>`;
    }
    table += "</tr>";
  }
  table += "</tbody></table>";
  return table;
}
