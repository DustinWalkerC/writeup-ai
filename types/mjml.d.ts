// ═══════════════════════════════════════════════════════════════
// types/mjml.d.ts
// Type declarations for the mjml package.
// Place this file at: types/mjml.d.ts
// Then ensure your tsconfig.json includes: "typeRoots": ["./types", "./node_modules/@types"]
// OR place it anywhere and reference it in tsconfig "include" array.
// ═══════════════════════════════════════════════════════════════

declare module 'mjml' {
  interface MJMLParseError {
    line: number;
    message: string;
    tagName: string;
    formattedMessage: string;
  }

  interface MJMLParseResults {
    html: string;
    errors: MJMLParseError[];
  }

  interface MJMLParsingOptions {
    fonts?: Record<string, string>;
    keepComments?: boolean;
    beautify?: boolean;
    minify?: boolean;
    validationLevel?: 'strict' | 'soft' | 'skip';
    filePath?: string;
    preprocessors?: Array<(xml: string) => string>;
  }

  function mjml2html(mjml: string, options?: MJMLParsingOptions): MJMLParseResults;

  export default mjml2html;
}
