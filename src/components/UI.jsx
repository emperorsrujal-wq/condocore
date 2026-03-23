import { useState, useEffect } from 'react';

// ─── Design Tokens ────────────────────────────────────────────────────────────
export const P = {
  navy: '#0B1E3D', navyMid: '#152B52', navyLight: '#1E3A6B',
  gold: '#C8A96E', goldLight: '#E2C898', goldDark: '#A07840',
  bg: '#F2F4F8', card: '#FFFFFF', text: '#0B1E3D', textMuted: '#6B7B9A',
  border: '#DDE2EF', success: '#1A7F5A', warning: '#C97B1A',
  danger: '#C0392B', info: '#1A5FA8',
};

export const ROLE_COLORS = {
  manager: P.gold, landlord: '#7EB8D4', tenant: '#82C9A5', owner: '#B08FE0'
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const map = {
    active:       { color: P.success,    bg: '#EAF7F2', label: 'Active' },
    expiring:     { color: P.warning,    bg: '#FEF3E2', label: 'Expiring Soon' },
    overdue:      { color: P.danger,     bg: '#FDECEA', label: 'Overdue' },
    paid:         { color: P.success,    bg: '#EAF7F2', label: 'Paid' },
    pending:      { color: P.warning,    bg: '#FEF3E2', label: 'Pending' },
    'in-progress':{ color: P.info,       bg: '#EAF0FB', label: 'In Progress' },
    open:         { color: P.danger,     bg: '#FDECEA', label: 'Open' },
    resolved:     { color: P.success,    bg: '#EAF7F2', label: 'Resolved' },
    approved:     { color: P.success,    bg: '#EAF7F2', label: 'Approved' },
    urgent:       { color: '#7B1A1A',    bg: '#FDECEA', label: 'Urgent' },
    high:         { color: P.danger,     bg: '#FDECEA', label: 'High' },
    medium:       { color: P.warning,    bg: '#FEF3E2', label: 'Medium' },
    low:          { color: P.textMuted,  bg: '#F0F2F7', label: 'Low' },
    draft:        { color: P.textMuted,  bg: '#F0F2F7', label: 'Draft' },
    sent:         { color: P.warning,    bg: '#FEF3E2', label: 'Sent' },
    signed:       { color: P.info,       bg: '#EAF0FB', label: 'Signed' },
    countersigned:{ color: P.success,    bg: '#EAF7F2', label: 'Executed' },
  };
  const s = map[status] || { color: P.textMuted, bg: '#F0F2F7', label: status };
  return (
    <span style={{ background: s.bg, color: s.color, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, letterSpacing: 0.3, whiteSpace: 'nowrap' }}>
      {s.label}
    </span>
  );
}

// ─── Button ───────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, style: extraStyle, type = 'button' }) {
  const variants = {
    primary:   { background: P.navy, color: '#fff', border: 'none' },
    success:   { background: P.success, color: '#fff', border: 'none' },
    danger:    { background: P.danger, color: '#fff', border: 'none' },
    ghost:     { background: 'none', color: P.textMuted, border: `1.5px solid ${P.border}` },
    gold:      { background: P.gold, color: P.navy, border: 'none' },
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: 12 },
    md: { padding: '10px 18px', fontSize: 14 },
    lg: { padding: '13px 24px', fontSize: 15 },
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      style={{ ...variants[variant], ...sizes[size], borderRadius: 9, cursor: disabled ? 'not-allowed' : 'pointer', fontWeight: 600, fontFamily: "'DM Sans', sans-serif", display: 'inline-flex', alignItems: 'center', gap: 6, opacity: disabled ? 0.6 : 1, transition: 'all 0.15s', ...extraStyle }}>
      {children}
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────
export function Input({ id, label, type = 'text', value, onChange, placeholder, required, style: extraStyle, helpText }) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ marginBottom: 14, ...extraStyle }}>
      {label && (
        <div style={{ marginBottom: 5 }}>
          <label htmlFor={inputId} style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
            {label}{required && <span style={{ color: P.danger }}> *</span>}
          </label>
          {helpText && <div style={{ fontSize: 10, color: P.goldDark, fontWeight: 500, marginTop: 1, fontStyle: 'italic' }}>{helpText}</div>}
        </div>
      )}
      <input id={inputId} type={type} value={value} onChange={onChange} placeholder={placeholder} required={required}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', fontFamily: "'DM Sans', sans-serif", color: P.text, background: P.card, boxSizing: 'border-box', transition: 'border 0.15s' }}
        onFocus={e => e.target.style.borderColor = P.navyLight}
        onBlur={e => e.target.style.borderColor = P.border} />
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────
export function Select({ id, label, value, onChange, options, required, helpText }) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ marginBottom: 5 }}>
          <label htmlFor={selectId} style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
            {label}{required && <span style={{ color: P.danger }}> *</span>}
          </label>
          {helpText && <div style={{ fontSize: 10, color: P.goldDark, fontWeight: 500, marginTop: 1, fontStyle: 'italic' }}>{helpText}</div>}
        </div>
      )}
      <select id={selectId} value={value} onChange={onChange} required={required}
        style={{ width: '100%', padding: '12px 14px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', fontFamily: "'DM Sans', sans-serif", color: P.text, background: P.card }}>
        {(options || []).map(o => typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Textarea ─────────────────────────────────────────────────────────────────
export function Textarea({ label, value, onChange, placeholder, rows = 3, helpText }) {
  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ marginBottom: 5 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>{label}</label>
          {helpText && <div style={{ fontSize: 10, color: P.goldDark, fontWeight: 500, marginTop: 1, fontStyle: 'italic' }}>{helpText}</div>}
        </div>
      )}
      <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 9, border: `1.5px solid ${P.border}`, fontSize: 14, outline: 'none', fontFamily: "'DM Sans', sans-serif", color: P.text, resize: 'vertical', boxSizing: 'border-box' }}
        onFocus={e => e.target.style.borderColor = P.navyLight}
        onBlur={e => e.target.style.borderColor = P.border} />
    </div>
  );
}

// ─── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children, maxWidth = 480 }) {
  return (
    <div className="animate-fadeIn" style={{ position: 'fixed', inset: 0, background: 'rgba(11,30,61,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
      <div className="animate-slideUp" style={{ background: P.card, borderRadius: 18, width: '100%', maxWidth, boxShadow: '0 20px 60px rgba(11,30,61,0.3)', overflow: 'hidden', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ background: P.navy, padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 18, color: '#fff' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: 24, overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── ConfirmModal ────────────────────────────────────────────────────────────
export function ConfirmModal({ message, onConfirm, onCancel, confirmLabel = 'Confirm', confirmVariant = 'danger' }) {
  return (
    <div className="animate-fadeIn" style={{ position: 'fixed', inset: 0, background: 'rgba(11,30,61,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 20 }}>
      <div className="animate-slideUp" style={{ background: P.card, borderRadius: 16, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(11,30,61,0.3)', overflow: 'hidden' }}>
        <div style={{ padding: '28px 24px 16px', textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: confirmVariant === 'danger' ? '#FDECEA' : '#EAF0FB', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: 22 }}>
            {confirmVariant === 'danger' ? '⚠' : '?'}
          </div>
          <p style={{ fontSize: 15, color: P.text, margin: 0, lineHeight: 1.5, fontWeight: 500 }}>{message}</p>
        </div>
        <div style={{ padding: '12px 24px 24px', display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
          <Btn variant={confirmVariant} onClick={onConfirm}>{confirmLabel}</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, style: extra }) {
  return (
    <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, boxShadow: '0 2px 10px rgba(11,30,61,0.06)', ...extra }}>
      {children}
    </div>
  );
}

// ─── PageHeader ───────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
      <div>
        <h1 style={{ fontFamily: "'Libre Baskerville', serif", fontSize: 26, color: P.text, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ color: P.textMuted, margin: '4px 0 0', fontSize: 14 }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 20 }) {
  return (
    <div className="spinning" style={{ width: size, height: size, border: `2px solid ${P.border}`, borderTopColor: P.navyLight, borderRadius: '50%', display: 'inline-block' }} />
  );
}

// ─── EmptyState ───────────────────────────────────────────────────────────────
export function EmptyState({ icon, title, body, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: P.textMuted }}>
      <div style={{ fontSize: 48, marginBottom: 14, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: 17, fontWeight: 700, color: P.text, marginBottom: 6 }}>{title}</div>
      {body && <div style={{ fontSize: 14, marginBottom: 20 }}>{body}</div>}
      {action}
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────
export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = type === 'success' ? P.success : type === 'error' ? P.danger : P.info;
  return (
    <div className="animate-slideUp" style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, background: bg, color: '#fff', borderRadius: 12, padding: '12px 18px', boxShadow: '0 6px 24px rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 600, maxWidth: 360 }}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 16 }}>✕</button>
    </div>
  );
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
export function StatCard({ label, value, sub, color, icon }) {
  return (
    <div style={{ background: P.card, borderRadius: 14, padding: '20px 22px', border: `1px solid ${P.border}`, boxShadow: '0 2px 8px rgba(11,30,61,0.05)', flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: 11, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700, marginBottom: 6 }}>{label}</div>
          <div style={{ fontSize: 28, fontFamily: "'Libre Baskerville', serif", fontWeight: 700, color: color || P.text }}>{value}</div>
          {sub && <div style={{ fontSize: 12, color: P.textMuted, marginTop: 4 }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: 28 }}>{icon}</div>}
      </div>
    </div>
  );
}

// ─── Table helpers ────────────────────────────────────────────────────────────
export function Table({ headers, children }) {
  return (
    <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden', boxShadow: '0 2px 10px rgba(11,30,61,0.06)' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: P.bg }}>
            {headers.map(h => (
              <th key={h} style={{ padding: '11px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: P.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', borderBottom: `1px solid ${P.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function TR({ children, onClick, idx }) {
  return (
    <tr onClick={onClick} style={{ background: idx % 2 === 0 ? P.card : '#FAFBFD', cursor: onClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
      onMouseEnter={e => onClick && (e.currentTarget.style.background = '#EDF1FA')}
      onMouseLeave={e => onClick && (e.currentTarget.style.background = idx % 2 === 0 ? P.card : '#FAFBFD')}>
      {children}
    </tr>
  );
}

export function TD({ children, bold, muted }) {
  return (
    <td style={{ padding: '13px 16px', fontSize: bold ? 15 : 13, fontWeight: bold ? 700 : 400, color: muted ? P.textMuted : P.text }}>{children}</td>
  );
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ name, color, size = 36 }) {
  const initials = name ? name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?';
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: (color || P.navyLight) + '30', border: `2px solid ${color || P.navyLight}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: color || P.navyLight, fontSize: Math.round(size * 0.32), fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}
