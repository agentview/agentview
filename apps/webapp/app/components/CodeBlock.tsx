import { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
import typescript from "highlight.js/lib/languages/typescript";

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
    }
  }, [code]);

  return (
    <pre className="text-sm font-mono overflow-x-auto">
      <code ref={codeRef} className={`language-${language}`}>
        {code}
      </code>
      <style>{`
        .hljs {
          background: transparent;
          color: #e5e7eb;
        }
        .hljs-keyword {
          color: #c792ea;
        }
        .hljs-string {
          color: #c3e88d;
        }
        .hljs-number {
          color: #f78c6c;
        }
        .hljs-built_in {
          color: #82aaff;
        }
        .hljs-function {
          color: #82aaff;
        }
        .hljs-title {
          color: #82aaff;
        }
        .hljs-attr {
          color: #ffcb6b;
        }
        .hljs-variable {
          color: #f07178;
        }
        .hljs-comment {
          color: #6a737d;
          font-style: italic;
        }
        .hljs-params {
          color: #e5e7eb;
        }
        .hljs-property {
          color: #80cbc4;
        }
        .hljs-literal {
          color: #f78c6c;
        }
      `}</style>
    </pre>
  );
}
