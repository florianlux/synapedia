import { describe, it, expect } from "vitest";
import { mdxToHtml } from "../mdx-to-html";

describe("mdxToHtml", () => {
  it("converts headings to HTML", async () => {
    const result = await mdxToHtml("# Hello\n\n## World");
    expect(result).toContain("<h1>Hello</h1>");
    expect(result).toContain("<h2>World</h2>");
  });

  it("converts bold and italic text", async () => {
    const result = await mdxToHtml("**bold** and *italic*");
    expect(result).not.toBeNull();
    expect(result).toContain("<strong>bold</strong>");
    expect(result).toContain("<em>italic</em>");
  });

  it("converts links to anchor tags", async () => {
    const result = await mdxToHtml("[click](https://example.com)");
    expect(result).toContain('<a href="https://example.com">click</a>');
  });

  it("converts blockquotes", async () => {
    const result = await mdxToHtml("> Important note");
    expect(result).toContain("<blockquote>");
    expect(result).toContain("Important note");
  });

  it("converts tables", async () => {
    const md = "| A | B |\n|---|---|\n| 1 | 2 |";
    const result = await mdxToHtml(md);
    expect(result).toContain("<table>");
    expect(result).toContain("<th>A</th>");
    expect(result).toContain("<td>1</td>");
  });

  it("handles empty string input", async () => {
    const result = await mdxToHtml("");
    expect(typeof result).toBe("string");
  });

  it("strips JSX import statements", async () => {
    const md = 'import { Foo } from "bar";\n\n# Title';
    const result = await mdxToHtml(md);
    expect(result).not.toContain("import");
    expect(result).toContain("<h1>Title</h1>");
  });

  it("never returns null for valid markdown", async () => {
    const result = await mdxToHtml("Hello world");
    expect(result).not.toBeNull();
  });
});
