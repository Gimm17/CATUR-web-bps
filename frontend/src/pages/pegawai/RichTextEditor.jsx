import React, { useEffect, useRef, useState } from 'react';
import { FaSpinner } from 'react-icons/fa';
import 'quill/dist/quill.snow.css';

// Load Quill secara dinamis
const loadQuill = () => import('quill');

const MOBILE_MEDIA_QUERY = '(max-width: 768px)';

const escapeHtml = (text = '') =>
  String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const htmlToPlainText = (html = '') => {
  if (!html) return '';

  let processed = String(html)
    .replace(/\r\n/g, '\n')
    .replace(/<span[^>]*class=["'][^"']*ql-ui[^"']*["'][^>]*>[\s\S]*?<\/span>/gi, '');

  processed = processed.replace(
    /<(ol|ul)[^>]*>([\s\S]*?)<\/\1>/gi,
    (_, listTag, listInner) => {
      const tag = String(listTag || '').toLowerCase();
      let counter = 1;
      let prevOrdered = null;

      const items = String(listInner || '').replace(
        /<li([^>]*)>([\s\S]*?)<\/li>/gi,
        (__, liAttrs, liContent) => {
          let isOrdered = tag === 'ol';
          if (/data-list=["']bullet["']/i.test(liAttrs)) isOrdered = false;
          else if (/data-list=["']ordered["']/i.test(liAttrs)) isOrdered = true;

          if (prevOrdered !== null && prevOrdered !== isOrdered && isOrdered) {
            counter = 1;
          }
          prevOrdered = isOrdered;

          let clean = liContent.replace(/<[^>]+>/g, '').trim();
          if (isOrdered) {
            clean = clean.replace(/^\d+[\.\)]\s+/, '');
            return `${counter++}. ${clean}\n`;
          }
          clean = clean.replace(/^[•\-\*]\s+/, '');
          return `• ${clean}\n`;
        }
      );

      return `${items}\n`;
    }
  );

  if (typeof document === 'undefined') {
    return processed
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>\s*<p>/gi, '\n\n')
      .replace(/<[^>]+>/g, '')
      .trim();
  }

  const container = document.createElement('div');
  container.innerHTML = processed
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>\s*<p>/gi, '\n\n')
    .replace(/<\/div>\s*<div>/gi, '\n');

  return (container.textContent || container.innerText || '').trim();
};

const plainTextToHtml = (text = '') => {
  const normalizedText = String(text).replace(/\r\n/g, '\n').trim();
  if (!normalizedText) return '';

  const lines = normalizedText.split('\n');
  const htmlBlocks = [];
  let currentListType = null;
  let currentListItems = [];

  const flushList = () => {
    if (!currentListType || !currentListItems.length) return;
    const tag = currentListType === 'ol' ? 'ol' : 'ul';
    const itemsHtml = currentListItems.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
    htmlBlocks.push(`<${tag}>${itemsHtml}</${tag}>`);
    currentListType = null;
    currentListItems = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList();
      continue;
    }

    const orderedMatch = trimmed.match(/^\d+[\.\)]\s+(.*)$/);
    if (orderedMatch) {
      if (currentListType && currentListType !== 'ol') flushList();
      currentListType = 'ol';
      currentListItems.push(orderedMatch[1].trim());
      continue;
    }

    const bulletMatch = trimmed.match(/^[•\-\*]\s+(.*)$/);
    if (bulletMatch) {
      if (currentListType && currentListType !== 'ul') flushList();
      currentListType = 'ul';
      currentListItems.push(bulletMatch[1].trim());
      continue;
    }

    flushList();
    htmlBlocks.push(`<p>${escapeHtml(trimmed)}</p>`);
  }

  flushList();
  return htmlBlocks.join('');
};

const RichTextEditor = ({ value, onChange, placeholder, readOnly }) => {
  const editorRef = useRef(null);
  const quillRef = useRef(null);
  const lastHtmlRef = useRef('');
  const lastPropValueRef = useRef(value || '');
  const onChangeRef = useRef(onChange);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }

    return window.matchMedia(MOBILE_MEDIA_QUERY).matches;
  });
  const [mobileTextValue, setMobileTextValue] = useState(() => htmlToPlainText(value || ''));
  const [Quill, setQuill] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);
    const handleMediaChange = (event) => {
      setIsMobileViewport(event.matches);
    };

    setIsMobileViewport(mediaQuery.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleMediaChange);
      return () => mediaQuery.removeEventListener('change', handleMediaChange);
    }

    mediaQuery.addListener(handleMediaChange);
    return () => mediaQuery.removeListener(handleMediaChange);
  }, []);

  useEffect(() => {
    if (isMobileViewport) {
      setIsLoading(false);
      return undefined;
    }

    // Load Quill dynamically
    loadQuill().then((QuillModule) => {
      setQuill(() => QuillModule.default);
      setIsLoading(false);
    }).catch(err => {
      console.error("Gagal memuat Quill:", err);
      setIsLoading(false);
    });
  }, [isMobileViewport]);

  useEffect(() => {
    if (isMobileViewport) return undefined;

    if (editorRef.current && Quill && !quillRef.current) {
      try {
        editorRef.current.parentElement?.querySelectorAll('.ql-toolbar').forEach((el) => el.remove());
        quillRef.current = new Quill(editorRef.current, {
          theme: 'snow',
          placeholder: placeholder || 'Tulis laporan Anda di sini...',
          readOnly: readOnly || false,
          modules: {
            toolbar: isMobileViewport
              ? [
                  ['bold', 'italic', 'underline'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  ['clean']
                ]
              : [
                  [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
                  ['bold', 'italic', 'underline', 'strike'],
                  [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                  [{ 'indent': '-1'}, { 'indent': '+1' }],
                  [{ 'align': [] }],
                  ['link'],
                  ['clean']
                ],
          },
        });

        quillRef.current.root.setAttribute('inputmode', 'text');
        quillRef.current.root.setAttribute('autocapitalize', 'sentences');
        quillRef.current.root.setAttribute('autocorrect', 'on');
        quillRef.current.root.setAttribute('spellcheck', 'true');
        quillRef.current.root.style.webkitUserSelect = 'text';
        quillRef.current.root.style.userSelect = 'text';
        quillRef.current.root.style.touchAction = 'manipulation';

        quillRef.current.on('text-change', (delta, oldDelta, source) => {
          if (source !== 'user') return;
          const content = quillRef.current.root.innerHTML;
          lastHtmlRef.current = content;
          lastPropValueRef.current = content;
          onChangeRef.current?.(content);
        });

        // Set initial value
        const initialValue = value || '';
        if (initialValue) {
          lastHtmlRef.current = initialValue;
          lastPropValueRef.current = initialValue;
          quillRef.current.clipboard.dangerouslyPasteHTML(initialValue, 'silent');
        }
      } catch (error) {
        console.error("Error inisialisasi Quill:", error);
      }
    }

    return () => {
      if (quillRef.current) {
        quillRef.current = null;
      }
    };
  }, [Quill, isMobileViewport]);

  // Update content when value changes externally
  useEffect(() => {
    if (isMobileViewport) {
      const nextTextValue = htmlToPlainText(value || '');
      setMobileTextValue((currentValue) => (
        currentValue === nextTextValue ? currentValue : nextTextValue
      ));
      lastPropValueRef.current = value || '';
      return;
    }

    if (!quillRef.current) return;
    const normalizedValue = value || '';
    if (normalizedValue === lastPropValueRef.current) return;
    if (quillRef.current.hasFocus()) return;

    if (normalizedValue !== quillRef.current.root.innerHTML) {
      lastHtmlRef.current = normalizedValue;
      lastPropValueRef.current = normalizedValue;
      quillRef.current.clipboard.dangerouslyPasteHTML(normalizedValue, 'silent');
    }
  }, [isMobileViewport, value]);

  // Update readOnly state
  useEffect(() => {
    if (quillRef.current) {
      quillRef.current.enable(!readOnly);
    }
  }, [readOnly]);

  const applyMobileValue = (nextTextValue) => {
    const nextHtmlValue = plainTextToHtml(nextTextValue);
    setMobileTextValue(nextTextValue);
    lastHtmlRef.current = nextHtmlValue;
    lastPropValueRef.current = nextHtmlValue;
    onChangeRef.current?.(nextHtmlValue);
  };

  const handleMobileChange = (event) => {
    applyMobileValue(event.target.value);
  };

  const handleMobileFormatList = (mode) => {
    if (readOnly) return;
    const rawLines = (mobileTextValue || '').split('\n');
    const nonEmptyCount = rawLines.filter((l) => l.trim()).length;

    if (!nonEmptyCount) {
      applyMobileValue(mode === 'ordered' ? '1. ' : '• ');
      return;
    }

    let counter = 1;
    const formatted = rawLines.map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return '';
      const stripped = trimmed
        .replace(/^\d+[\.\)]\s+/, '')
        .replace(/^[•\-\*]\s+/, '');
      if (mode === 'ordered') {
        return `${counter++}. ${stripped}`;
      }
      if (mode === 'bullet') {
        return `• ${stripped}`;
      }
      return stripped;
    });

    applyMobileValue(formatted.join('\n'));
  };

  if (isLoading) {
    return (
      <div style={{ 
        height: '250px', 
        background: '#f9fafb', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        border: '2px solid #e5e7eb',
        borderRadius: '8px',
        gap: '8px',
        color: '#6b7280'
      }}>
        <FaSpinner style={{ animation: 'spin 1s linear infinite' }} /> 
        Memuat editor...
      </div>
    );
  }

  if (isMobileViewport) {
    return (
      <div style={{ 
        border: '2px solid #e5e7eb', 
        borderRadius: '8px', 
        overflow: 'hidden',
        backgroundColor: readOnly ? '#f9fafb' : 'white'
      }}>
        {!readOnly && (
          <div style={{
            display: 'flex',
            gap: '8px',
            padding: '8px 12px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f8fafc',
            flexWrap: 'wrap'
          }}>
            <button
              type="button"
              onClick={() => handleMobileFormatList('ordered')}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: 'white',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              1. Penomoran
            </button>
            <button
              type="button"
              onClick={() => handleMobileFormatList('bullet')}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: 'white',
                padding: '4px 10px',
                fontSize: '12px',
                fontWeight: 600,
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              • Poin Bullet
            </button>
            <button
              type="button"
              onClick={() => handleMobileFormatList('plain')}
              style={{
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: 'white',
                padding: '4px 10px',
                fontSize: '12px',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Paragraf Biasa
            </button>
          </div>
        )}
        <textarea
          value={mobileTextValue}
          onChange={handleMobileChange}
          placeholder={placeholder || 'Tulis laporan Anda di sini...'}
          readOnly={readOnly}
          rows={10}
          style={{
            width: '100%',
            minHeight: '250px',
            border: 'none',
            outline: 'none',
            resize: 'vertical',
            padding: '14px 16px',
            fontSize: '14px',
            lineHeight: 1.6,
            backgroundColor: readOnly ? '#f9fafb' : 'white',
            color: '#111827'
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ 
      border: '2px solid #e5e7eb', 
      borderRadius: '8px', 
      overflow: 'hidden',
      backgroundColor: readOnly ? '#f9fafb' : 'white'
    }}>
      <div ref={editorRef} style={{ height: '250px' }} />
    </div>
  );
};

export default RichTextEditor;
