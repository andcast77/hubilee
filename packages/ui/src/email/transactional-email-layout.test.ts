import { describe, expect, it } from "vitest";
import {
  buildTransactionalEmailHtml,
  escapeHtml,
  escapeHtmlAttr,
} from "./transactional-email-layout.js";

describe("transactional-email-layout", () => {
  it("escapeHtml neutraliza marcado", () => {
    expect(escapeHtml("<script>x</script>")).toBe(
      "&lt;script&gt;x&lt;/script&gt;",
    );
    expect(escapeHtml(`a"b'c`)).toBe("a&quot;b&#39;c");
  });

  it("escapeHtmlAttr es coherente con atributos entre comillas dobles", () => {
    expect(escapeHtmlAttr("&")).toBe("&amp;");
  });

  it("buildTransactionalEmailHtml usa columna max-w-lg (512px), lienzo neutro y card elevado", () => {
    const html = buildTransactionalEmailHtml({
      htmlTitle: "Título doc",
      cardTitle: "Activa tu cuenta",
      bodyHtml: "<p>Contenido</p>",
    });
    expect(html).toContain("max-width:512px");
    expect(html).toContain("Activa tu cuenta");
    expect(html).toContain("Contenido");
    expect(html).toContain("#f4f4f5");
    expect(html).toContain("#ffffff");
    expect(html).toContain("padding:28px 28px 26px 28px");
    expect(html).toContain("padding:26px 28px 18px 28px");
    expect(html).toContain("border-radius:20px");
    expect(html).toContain("2px solid #6366f1");
    expect(html).not.toContain("box-shadow");
    expect(html).not.toContain("-webkit-box-shadow");
    expect(html).toContain('name="color-scheme"');
    expect(html).toMatch(/bgcolor="#f4f4f5"/i);
    expect(html).not.toMatch(/<style\b/i);
    expect(html).not.toContain("ms-email-");
    expect(html).not.toContain("linear-gradient");
    expect(html).not.toContain("#0a0a0f");
  });

  it("renderiza bloque bienvenida opcional cuando hay título y subtítulo", () => {
    const html = buildTransactionalEmailHtml({
      htmlTitle: "t",
      welcomeTitle: "Bienvenido",
      welcomeSubtitle: "Sigue los pasos en pantalla",
      cardTitle: "Paso siguiente",
      bodyHtml: "<p/>",
    });
    expect(html).toContain("Bienvenido");
    expect(html).toContain("Sigue los pasos en pantalla");
    expect(html).toContain("#71717a");
    expect(html).toContain("font-size:30px");
  });

  it("incluye botón primario con href escapado y pie opcional", () => {
    const html = buildTransactionalEmailHtml({
      htmlTitle: "X",
      cardTitle: "H",
      bodyHtml: "<p>B</p>",
      primaryButton: {
        label: "Ir",
        href: "https://example.com/path?x=1&y=2",
      },
      cardFooterHtml: '<p style="margin:0;">Pie</p>',
    });
    expect(html).toContain("Ir");
    expect(html).toContain('href="https://example.com/path?x=1&amp;y=2"');
    expect(html).toContain("Pie");
  });

  it("escapa cardTitle para evitar inyección", () => {
    const html = buildTransactionalEmailHtml({
      htmlTitle: "t",
      cardTitle: "<img src=x onerror=alert(1)>",
      bodyHtml: "<p/>",
    });
    expect(html).not.toContain("<img");
    expect(html).toContain(escapeHtml("<img src=x onerror=alert(1)>"));
  });

  it("inserta logo opcional cuando brandLogoUrl está definido", () => {
    const html = buildTransactionalEmailHtml({
      htmlTitle: "t",
      cardTitle: "H",
      bodyHtml: "<p/>",
      brandLogoUrl: "https://cdn.example.com/logo.png",
    });
    expect(html).toContain("https://cdn.example.com/logo.png");
    expect(html).toContain('alt="Hubilee"');
  });
});
