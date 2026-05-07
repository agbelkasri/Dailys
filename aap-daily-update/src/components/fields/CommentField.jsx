import { useEffect, useRef } from 'react';
import styles from './CommentField.module.css';

/**
 * Intentional formatting colors — preserved through all stripping logic.
 *
 * Chrome stores colors as "rgb(r, g, b)" with varying whitespace.
 * We normalise by removing spaces before comparing.
 *
 *  RED_COLOR   = #ef4444 → rgb(239,68,68)
 *  HL_COLOR    = #fef08a → rgb(254,240,138)  (yellow highlight)
 */
const RED_COLOR = 'rgb(239, 68, 68)';
const HL_COLOR  = 'rgb(254, 240, 138)';

function norm(s) {
  return (s || '').replace(/\s+/g, '').toLowerCase();
}
function isIntentionalColor(c) {
  return norm(c) === norm(RED_COLOR);
}
function isIntentionalBg(c) {
  return norm(c) === norm(HL_COLOR);
}

/**
 * Strip inline color styles that Chrome adds as side-effects of execCommand
 * (e.g. bold captures the computed color), while preserving intentional red
 * text and yellow highlights applied by the toolbar.
 */
function stripUnintentionalColors(html) {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  tmp.querySelectorAll('[style]').forEach(el => {
    // caret-color is never intentional — always remove
    el.style.removeProperty('caret-color');
    // Keep our intentional red; strip every other inline color
    if (!isIntentionalColor(el.style.color)) {
      el.style.removeProperty('color');
    }
    // Keep our intentional yellow highlight; strip every other inline bg
    if (!isIntentionalBg(el.style.backgroundColor)) {
      el.style.removeProperty('background-color');
    }
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
  // Strip legacy presentational attributes (pasted content)
  tmp.querySelectorAll('[color], [bgcolor]').forEach(el => {
    el.removeAttribute('color');
    el.removeAttribute('bgcolor');
  });
  return tmp.innerHTML;
}

function applySelectively(el) {
  el.querySelectorAll('*').forEach(node => {
    node.style.removeProperty('caret-color');
    if (!isIntentionalColor(node.style.color)) {
      node.style.removeProperty('color');
    }
    if (!isIntentionalBg(node.style.backgroundColor)) {
      node.style.removeProperty('background-color');
    }
    node.removeAttribute('color');
    node.removeAttribute('bgcolor');
  });
}

function RichCommentField({ value, onChange, onFocus, onBlur, readOnly }) {
  const ref     = useRef(null);
  const focused = useRef(false);

  // Sync value → DOM only when not focused (avoids clobbering the cursor).
  useEffect(() => {
    if (!ref.current || focused.current) return;
    ref.current.innerHTML = stripUnintentionalColors(value || '');
    // Belt-and-suspenders walk after innerHTML assignment
    applySelectively(ref.current);
  }, [value]);

  // Watch for inline styles written by execCommand during live editing and
  // strip unintentional ones immediately so they never reach Firestore.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new MutationObserver(() => {
      el.querySelectorAll('[style]').forEach(node => {
        node.style.removeProperty('caret-color');
        if (!isIntentionalColor(node.style.color)) {
          node.style.removeProperty('color');
        }
        if (!isIntentionalBg(node.style.backgroundColor)) {
          node.style.removeProperty('background-color');
        }
        if (!node.getAttribute('style')?.trim()) node.removeAttribute('style');
      });
      el.querySelectorAll('[color], [bgcolor]').forEach(node => {
        node.removeAttribute('color');
        node.removeAttribute('bgcolor');
      });
    });
    observer.observe(el, {
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'color', 'bgcolor'],
    });
    return () => observer.disconnect();
  }, []);

  if (readOnly) {
    return (
      <div
        className={styles.readOnly}
        dangerouslySetInnerHTML={{
          __html: stripUnintentionalColors(value) ||
            '<span style="color:#bbb;font-style:italic">No comments</span>',
        }}
      />
    );
  }

  // ── Toolbar handlers ────────────────────────────────────────────────────────

  const handleBold = () => {
    ref.current?.focus();
    // styleWithCSS=false → produces <b> instead of <span style="font-weight:bold">
    // which prevents Chrome from capturing + inlining the current computed color.
    document.execCommand('styleWithCSS', false, false);
    document.execCommand('bold');
  };

  const handleRed = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return; // require a selection
    const curColor = document.queryCommandValue('foreColor');
    if (norm(curColor) === norm(RED_COLOR)) {
      // Already red → remove colour formatting from selection
      document.execCommand('removeFormat');
    } else {
      document.execCommand('foreColor', false, RED_COLOR);
    }
  };

  const handleHighlight = () => {
    const el = ref.current;
    if (!el) return;
    el.focus();
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed) return; // require a selection
    const curBg = document.queryCommandValue('backColor');
    if (norm(curBg) === norm(HL_COLOR)) {
      // Already highlighted → remove
      document.execCommand('hiliteColor', false, 'transparent');
    } else {
      document.execCommand('hiliteColor', false, HL_COLOR);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.boldBtn}
          onMouseDown={(e) => { e.preventDefault(); handleBold(); }}
          title="Bold (select text first)"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={styles.redBtn}
          onMouseDown={(e) => { e.preventDefault(); handleRed(); }}
          title="Red text (select text first · click again to remove)"
        >
          <strong className={styles.redLabel}>R</strong>
        </button>
        <button
          type="button"
          className={styles.highlightBtn}
          onMouseDown={(e) => { e.preventDefault(); handleHighlight(); }}
          title="Highlight text (select text first · click again to remove)"
        >
          <span className={styles.highlightLabel}>H</span>
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        className={styles.richEdit}
        onInput={(e) => onChange(e.currentTarget.innerHTML)}
        onFocus={() => { focused.current = true; onFocus?.(); }}
        onBlur={() => { focused.current = false; onBlur?.(); }}
      />
    </div>
  );
}

export function CommentField({ value, onChange, readOnly, onFocus, onBlur, richText }) {
  const ref = useRef(null);

  // Auto-resize textarea to fit content
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);

  if (richText) {
    return (
      <RichCommentField
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );
  }

  if (readOnly) {
    return (
      <div className={styles.readOnly}>
        {value || <span className={styles.empty}>No comments</span>}
      </div>
    );
  }

  return (
    <textarea
      ref={ref}
      className={styles.textarea}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      onBlur={onBlur}
      placeholder="Add comments..."
      rows={2}
    />
  );
}
