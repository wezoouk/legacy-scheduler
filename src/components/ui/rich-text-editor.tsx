import React, { forwardRef, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

const modules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['blockquote', 'code-block'],
    ['link', 'image'],
    ['clean']
  ],
};

const formats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'align', 'list', 'bullet',
  'blockquote', 'code-block', 'link', 'image',
  'table', 'tr', 'td', 'th', 'tbody', 'thead',
  'script', 'style'
];

export const RichTextEditor = forwardRef<ReactQuill, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, readOnly = false }, ref) => {
    const quillRef = useRef<ReactQuill>(null);

    useEffect(() => {
      if (ref && typeof ref === 'object') {
        ref.current = quillRef.current;
      }
    }, [ref]);

    return (
      <div className={cn("rich-text-editor", className)}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          modules={modules}
          formats={formats}
          readOnly={readOnly}
          style={{
            '--quill-border-color': 'hsl(var(--border))',
            '--quill-bg': 'hsl(var(--background))',
            '--quill-text': 'hsl(var(--foreground))',
          } as React.CSSProperties}
        />
        <style jsx global>{`
          .rich-text-editor .ql-toolbar {
            border-color: hsl(var(--border));
            background: hsl(var(--background));
          }
          .rich-text-editor .ql-container {
            border-color: hsl(var(--border));
            font-family: inherit;
            min-height: 120px;
          }
          .rich-text-editor .ql-editor {
            color: hsl(var(--foreground));
            min-height: 120px;
          }
          .rich-text-editor .ql-editor.ql-blank::before {
            color: hsl(var(--muted-foreground));
          }
          .rich-text-editor .ql-snow .ql-picker {
            color: hsl(var(--foreground));
          }
          .rich-text-editor .ql-snow .ql-stroke {
            stroke: hsl(var(--foreground));
          }
          .rich-text-editor .ql-snow .ql-fill {
            fill: hsl(var(--foreground));
          }
        `}</style>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';