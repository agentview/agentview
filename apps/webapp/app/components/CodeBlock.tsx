import { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";
import "highlight.js/styles/github-dark.css";

hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("tsx", typescript);

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = "tsx" }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      hljs.highlightElement(codeRef.current);

      // Post-process to highlight JSX tags (PascalCase components)
      const html = codeRef.current.innerHTML;
      const jsxHighlighted = html.replace(
        /(&lt;\/?)([A-Z][a-zA-Z0-9]*)(\s|&gt;|\/&gt;)/g,
        '$1<span class="hljs-title class_">$2</span>$3'
      );
      codeRef.current.innerHTML = jsxHighlighted;
    }
  }, [code]);

  return (
    <pre className="text-sm font-mono overflow-x-auto" style={{ background: 'transparent' }}>
      <code
        ref={codeRef}
        className={`language-${language}`}
        style={{ background: 'transparent', color: '#e6edf3' }}
      >
        {code}
      </code>
    </pre>
  );
}
