import { useEffect, useRef } from 'react';

// Uses the browser's built-in <dialog>, which already handles the Esc key,
// the dark backdrop and keeping keyboard focus inside, so no library is needed.
export default function Modal({ title, subtitle, onClose, children }) {
  const dialogRef = useRef(null);

  // React's StrictMode runs effects twice in development, so check it isn't already open.
  useEffect(() => {
    if (!dialogRef.current.open) dialogRef.current.showModal();
  }, []);

  // A click whose target is the <dialog> itself landed on the backdrop, not the content.
  function handleClick(event) {
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog ref={dialogRef} onClose={onClose} onClick={handleClick}>
      <div className="modal-header">
        <div>
          <h2>{title}</h2>
          {subtitle}
        </div>
        <button className="close-btn" onClick={onClose} aria-label="Close">✕</button>
      </div>
      <div className="modal-body">{children}</div>
    </dialog>
  );
}
