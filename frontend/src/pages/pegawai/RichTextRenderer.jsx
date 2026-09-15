import React from 'react';
import DOMPurify from 'dompurify';
import 'quill/dist/quill.snow.css';

const RichTextRenderer = ({ content, className = '' }) => {
  if (!content) return null;

  // Sanitize HTML untuk keamanan
  const sanitizedContent = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'strike', 's',
      'ol', 'ul', 'li', 'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'blockquote', 'pre', 'code', 'a'
    ],
    ALLOWED_ATTR: ['href', 'target', 'class', 'style']
  });

  return (
    <div className={`ql-snow rich-text-content ${className}`}>
      <div
        className="ql-editor"
        style={{ padding: 0 }}
        dangerouslySetInnerHTML={{ __html: sanitizedContent }}
      />
    </div>
  );
};

export default RichTextRenderer;
