import React, { forwardRef, useEffect, useRef } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import { cn } from '@/lib/utils';
import { MediaService } from '@/lib/media-service';

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
  clipboard: {
    matchVisual: false,
  }
};

const formats = [
  'header', 'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'align', 'list', 'bullet',
  'blockquote', 'code-block', 'link', 'image',
  'size', 'font', 'script', 'indent', 'direction'
];

export const RichTextEditor = forwardRef<ReactQuill, RichTextEditorProps>(
  ({ value, onChange, placeholder, className, readOnly = false }, ref) => {
    const quillRef = useRef<ReactQuill>(null);

    useEffect(() => {
      if (ref && typeof ref === 'object') {
        ref.current = quillRef.current;
      }
    }, [ref]);

    useEffect(() => {
      const quill = quillRef.current?.getEditor();
      if (quill) {
        // Custom image handler
        const toolbar = quill.getModule('toolbar');
        toolbar.addHandler('image', () => {
          const input = document.createElement('input');
          input.setAttribute('type', 'file');
          input.setAttribute('accept', 'image/*');
          input.click();

          input.onchange = async () => {
            const file = input.files?.[0];
            if (file) {
              try {
                console.log('📸 Uploading image for rich text editor:', file.name);
                const result = await MediaService.uploadImage(file);
                console.log('✅ Image uploaded successfully:', result.url);
                
                const range = quill.getSelection();
                quill.insertEmbed(range?.index || 0, 'image', result.url);
              } catch (error) {
                console.error('❌ Failed to upload image:', error);
                alert('Failed to upload image. Please try again.');
              }
            }
          };
        });
      }
    }, []);

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
        <style>{`
          .rich-text-editor .ql-toolbar {
            border: 1px solid #e5e7eb;
            border-bottom: none;
            background: #f9fafb;
          }
          .rich-text-editor .ql-container {
            border: none;
            font-family: inherit;
            min-height: 120px;
            flex: 1;
            display: flex;
            flex-direction: column;
            background: transparent;
          }
          .rich-text-editor .ql-editor {
            color: #000000;
            min-height: 120px;
            flex: 1;
            background: transparent;
          }
          /* Allow user-selected colors to override default black */
          .rich-text-editor .ql-editor .ql-color-red,
          .rich-text-editor .ql-editor .ql-color-orange,
          .rich-text-editor .ql-editor .ql-color-yellow,
          .rich-text-editor .ql-editor .ql-color-green,
          .rich-text-editor .ql-editor .ql-color-blue,
          .rich-text-editor .ql-editor .ql-color-purple,
          .rich-text-editor .ql-editor .ql-color-white,
          .rich-text-editor .ql-editor .ql-color-black {
            color: inherit !important;
          }
          .rich-text-editor .ql-editor.ql-blank::before {
            color: #999999 !important;
          }
          .rich-text-editor .ql-snow .ql-picker {
            color: #333333 !important;
          }
          .rich-text-editor .ql-snow .ql-picker-label {
            color: #333333 !important;
          }
          .rich-text-editor .ql-snow .ql-picker-options {
            background: white !important;
            border: 1px solid #ccc !important;
          }
          .rich-text-editor .ql-snow .ql-picker-item {
            color: #333333 !important;
          }
          .rich-text-editor .ql-snow .ql-picker-item:hover {
            background: #f0f0f0 !important;
            color: #333333 !important;
          }
          .rich-text-editor .ql-snow .ql-stroke {
            stroke: #333333 !important;
          }
          .rich-text-editor .ql-snow .ql-fill {
            fill: #333333 !important;
          }
          .rich-text-editor.h-full {
            display: flex;
            flex-direction: column;
            height: 100%;
          }
          .rich-text-editor.h-full .ql-container {
            flex: 1;
            min-height: 0;
          }
          .rich-text-editor.h-full .ql-editor {
            flex: 1;
            min-height: 0;
          }
          .rich-text-editor .ql-editor img {
            max-width: 100%;
            height: auto;
            max-height: 300px;
            object-fit: contain;
          }
          .rich-text-editor .ql-editor .ql-align-center img {
            display: block;
            margin: 0 auto;
          }
          .rich-text-editor .ql-editor .ql-align-right img {
            display: block;
            margin-left: auto;
            margin-right: 0;
          }
          .rich-text-editor .ql-editor .ql-align-left img {
            display: block;
            margin-right: auto;
            margin-left: 0;
          }
        `}</style>
      </div>
    );
  }
);

RichTextEditor.displayName = 'RichTextEditor';