import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FiActivity,
  FiAlertCircle,
  FiCheck,
  FiClock,
  FiDatabase,
  FiDownloadCloud,
  FiEdit3,
  FiLayers,
  FiShield,
  FiX,
} from 'react-icons/fi';

import {
  CHANGELOG_VERSION,
  DISMISSED_CHANGELOG_COOKIE,
  DISMISSED_CHANGELOG_VERSION_KEY,
  RELEASE_NOTES,
  SHOW_CHANGELOG_AFTER_LOGIN_KEY,
} from './releaseNotes';
import './ChangelogPopup.css';

const NOTE_ICONS = [
  FiLayers,
  FiClock,
  FiShield,
  FiEdit3,
  FiDownloadCloud,
  FiActivity,
  FiDatabase,
  FiAlertCircle,
];

function getDismissedCookieVersion() {
  const cookiePrefix = `${DISMISSED_CHANGELOG_COOKIE}=`;
  const cookie = document.cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(cookiePrefix));
  return cookie ? decodeURIComponent(cookie.slice(cookiePrefix.length)) : null;
}

function shouldOpenChangelog() {
  const requestedAfterLogin = sessionStorage.getItem(SHOW_CHANGELOG_AFTER_LOGIN_KEY) === 'true';
  const dismissedVersion = localStorage.getItem(DISMISSED_CHANGELOG_VERSION_KEY)
    || getDismissedCookieVersion();

  if (dismissedVersion === CHANGELOG_VERSION) {
    sessionStorage.removeItem(SHOW_CHANGELOG_AFTER_LOGIN_KEY);
    return false;
  }

  return requestedAfterLogin;
}

export default function ChangelogPopup() {
  const [isOpen, setIsOpen] = useState(shouldOpenChangelog);
  const primaryButtonRef = useRef(null);

  const closeForSession = useCallback(() => {
    sessionStorage.removeItem(SHOW_CHANGELOG_AFTER_LOGIN_KEY);
    setIsOpen(false);
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    primaryButtonRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') closeForSession();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeForSession, isOpen]);

  const dismissCurrentVersion = () => {
    localStorage.setItem(DISMISSED_CHANGELOG_VERSION_KEY, CHANGELOG_VERSION);
    document.cookie = `${DISMISSED_CHANGELOG_COOKIE}=${encodeURIComponent(CHANGELOG_VERSION)}; Max-Age=31536000; Path=/; SameSite=Lax`;
    closeForSession();
  };

  if (!isOpen) return null;

  return (
    <div className="catur-changelog-backdrop">
      <section
        className="catur-changelog-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catur-changelog-title"
        aria-describedby="catur-changelog-description"
      >
        <div className="catur-changelog-rail" aria-hidden="true">
          <span>CATUR</span>
          <strong>02.6</strong>
        </div>

        <div className="catur-changelog-panel">
          <header className="catur-changelog-header">
            <div>
              <span className="catur-changelog-version">Pembaruan September 2026</span>
              <h2 id="catur-changelog-title">Yang baru di CATUR</h2>
              <p id="catur-changelog-description">
                Ringkasan fitur, perubahan logika, dan dampaknya pada alur perjalanan dinas.
              </p>
            </div>
            <button
              type="button"
              className="catur-changelog-close"
              onClick={closeForSession}
              aria-label="Tutup changelog"
            >
              <FiX aria-hidden="true" />
            </button>
          </header>

          <div
            className="catur-changelog-scroll"
            role="region"
            aria-label="Detail pembaruan"
            tabIndex="0"
          >
            <div className="catur-changelog-scroll-hint">
              <strong>8 pembaruan penting</strong>
              <span>Gulir untuk membaca seluruh detail</span>
            </div>
            <div className="catur-changelog-notes">
              {RELEASE_NOTES.map((note, index) => {
                const NoteIcon = NOTE_ICONS[index] || FiActivity;
                return (
                  <article className="catur-changelog-note" key={note.title}>
                    <div className="catur-changelog-note-heading">
                      <span className={`catur-changelog-note-icon is-${note.tone}`} aria-hidden="true">
                        <NoteIcon />
                      </span>
                      <div>
                        <span className="catur-changelog-category">{note.category}</span>
                        <h3>{note.title}</h3>
                        <p className="catur-changelog-summary">{note.summary}</p>
                      </div>
                    </div>
                    <dl className="catur-changelog-detail-grid">
                      <div>
                        <dt>Sebelumnya</dt>
                        <dd>{note.before}</dd>
                      </div>
                      <div className="is-logic">
                        <dt>Logika sistem</dt>
                        <dd>{note.logic}</dd>
                      </div>
                      <div>
                        <dt>Dampak untuk pengguna</dt>
                        <dd>{note.impact}</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          </div>

          <footer className="catur-changelog-actions">
            <button
              type="button"
              className="catur-changelog-dismiss"
              onClick={dismissCurrentVersion}
            >
              Jangan tampilkan lagi
            </button>
            <button
              ref={primaryButtonRef}
              type="button"
              className="catur-changelog-confirm"
              onClick={closeForSession}
            >
              <FiCheck aria-hidden="true" />
              Mengerti
            </button>
          </footer>
        </div>
      </section>
    </div>
  );
}
