import { useState, useEffect, useRef } from 'react';
import { Upload, Download, Eye, Trash2, FileText } from 'lucide-react';
import { subscribeDocuments, subscribeTenantDocuments, addDocument, deleteDocument, uploadFile } from '../firebase';
import { P, Btn, Modal, Input, Select, PageHeader, Spinner, EmptyState, ConfirmModal } from '../components/UI';

export default function DocumentsPage({ onToast, userProfile, tenantData }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filterType, setFilterType] = useState('All');
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading]  = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile]            = useState(null);
  const [docType, setDocType]      = useState('Lease');
  const [docName, setDocName]      = useState('');
  const [docUnit, setDocUnit]      = useState('');
  const fileInputRef               = useRef();
  const isTenant = userProfile?.role === 'tenant';
  const [confirmAction, setConfirmAction] = useState(null);

  useEffect(() => {
    let unsub;
    if (isTenant && tenantData?.id) {
      unsub = subscribeTenantDocuments(tenantData.id, data => { 
        const sorted = [...data].sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        setDocuments(sorted); 
        setLoading(false); 
      });
    } else {
      unsub = subscribeDocuments(data => { 
        const sorted = [...data].sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
          return dateB - dateA;
        });
        setDocuments(sorted); 
        setLoading(false); 
      });
    }
    return () => unsub && unsub();
  }, [isTenant, tenantData?.id]);

  const TYPES = ['All', 'Bylaws', 'Lease', 'Inspection', 'Notice', 'Insurance', 'Report', 'Other'];
  const filtered = (filterType === 'All' ? documents : documents.filter(d => d.type === filterType))
    .filter(d => !isTenant || d.status !== 'pending_approval')
    .filter(d => {
      const q = search.toLowerCase();
      return d.name?.toLowerCase().includes(q) || d.type?.toLowerCase().includes(q) || d.unit?.toLowerCase().includes(q) || d.uploadedBy?.toLowerCase().includes(q);
    });

  const handleUpload = async () => {
    if (!file) return onToast('Please select a file.', 'error');
    setUploading(true);
    try {
      const path = `documents/${Date.now()}_${file.name}`;
      const url  = await uploadFile(file, path, setUploadProgress);
      await addDocument({
        name: docName || file.name,
        type: docType,
        unit: docUnit || (tenantData?.unit || 'General'),
        tenantId: tenantData?.id || null,
        url,
        storagePath: path,
        size: formatBytes(file.size),
        ext: file.name.split('.').pop().toUpperCase(),
        uploadedBy: userProfile?.name || 'Unknown',
      });
      setShowUpload(false); setFile(null); setDocName(''); setUploadProgress(0);
      onToast('Document uploaded successfully!');
    } catch (e) { onToast(e.message, 'error'); }
    setUploading(false);
  };

  const handleDelete = async (doc) => {
    setConfirmAction({ message: 'Delete this document?', action: async () => {
      try { await deleteDocument(doc.id); onToast('Document deleted.'); }
      catch (e) { onToast(e.message, 'error'); }
    } });
    return;
  };

  const formatBytes = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader title={isTenant ? 'My Documents' : 'Documents'}
        subtitle={`${documents.length} documents`}
        action={<Btn onClick={() => setShowUpload(true)}><Upload size={15} /> Upload Document</Btn>} />

      {/* Search & Filters */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Search size={15} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: P.textMuted }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents by name, unit, or type..."
            style={{ width: '100%', padding: '10px 12px 10px 34px', borderRadius: 10, border: `1.5px solid ${P.border}`, fontSize: 13, outline: 'none', background: P.card }} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {TYPES.map(t => (
            <button key={t} onClick={() => setFilterType(t)} style={{ padding: '8px 14px', borderRadius: 9, border: `1.5px solid ${filterType === t ? P.navy : P.border}`, background: filterType === t ? P.navy : P.card, color: filterType === t ? '#fff' : P.textMuted, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>{t}</button>
          ))}
        </div>
      </div>

      {filtered.length === 0
        ? <EmptyState icon="📄" title="No documents" body="Upload your first document." action={<Btn onClick={() => setShowUpload(true)}><Upload size={14} /> Upload</Btn>} />
        : (
          <div style={{ background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden', boxShadow: '0 2px 10px rgba(11,30,61,0.06)' }}>
            {filtered.map((d, i) => (
              <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', borderBottom: i < filtered.length - 1 ? `1px solid ${P.border}` : 'none', transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = P.bg}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                {/* File icon */}
                <div style={{ width: 42, height: 48, borderRadius: 8, background: '#FDECEA', border: '1px solid #F5C6C2', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <FileText size={16} color={P.danger} />
                  <span style={{ fontSize: 8, color: P.danger, fontWeight: 800, marginTop: 1 }}>{d.ext || 'FILE'}</span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: P.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: P.textMuted, marginTop: 2 }}>
                    Unit {d.unit} · {d.size} · Uploaded by {d.uploadedBy}
                    {d.createdAt?.toDate && ` · ${d.createdAt.toDate().toLocaleDateString()}`}
                  </div>
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: P.bg, color: P.navyLight, border: `1px solid ${P.border}`, flexShrink: 0 }}>{d.type}</span>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <a href={d.url} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: `1px solid ${P.border}`, background: 'none', cursor: 'pointer', fontSize: 13, color: P.text, textDecoration: 'none' }}><Eye size={13} /> View</a>
                  <a href={d.url} download={d.name} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 8, border: 'none', background: P.navy, cursor: 'pointer', fontSize: 13, color: '#fff', textDecoration: 'none' }}><Download size={13} /> Download</a>
                  {!isTenant && <button onClick={() => handleDelete(d)} style={{ padding: '7px 10px', borderRadius: 8, border: 'none', background: '#FDECEA', cursor: 'pointer', color: P.danger }}><Trash2 size={13} /></button>}
                </div>
              </div>
            ))}
          </div>
        )}

      {/* Upload Modal */}
      {showUpload && (
        <Modal title="Upload Document" onClose={() => { setShowUpload(false); setFile(null); setDocName(''); }}>
          {/* File picker */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Select File *</label>
            <div onClick={() => fileInputRef.current?.click()}
              style={{ border: `2px dashed ${file ? P.success : P.border}`, borderRadius: 12, padding: '24px', textAlign: 'center', cursor: 'pointer', background: file ? '#EAF7F2' : P.bg, transition: 'all 0.15s' }}>
              <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: 'none' }} onChange={e => { const f = e.target.files?.[0]; if (f) { setFile(f); setDocName(f.name.replace(/\.[^/.]+$/, '')); } }} />
              {file
                ? <div style={{ color: P.success, fontWeight: 600 }}>✓ {file.name} ({formatBytes(file.size)})</div>
                : <div style={{ color: P.textMuted }}><Upload size={24} style={{ marginBottom: 8, opacity: 0.5 }} /><div style={{ fontSize: 14 }}>Click to select a file</div><div style={{ fontSize: 12, marginTop: 4 }}>PDF, DOC, JPG, PNG supported</div></div>
              }
            </div>
          </div>

          <Input label="Document Name" value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Lease Agreement – John Smith" />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
            <Select label="Document Type" value={docType} onChange={e => setDocType(e.target.value)} options={['Bylaws', 'Lease', 'Inspection', 'Notice', 'Insurance', 'Report', 'Other']} />
            <Input label="Unit" value={docUnit} onChange={e => setDocUnit(e.target.value)} placeholder="e.g. 1204 or All" />
          </div>

          {uploading && (
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: P.textMuted, marginBottom: 5 }}>
                <span>Uploading...</span><span>{uploadProgress}%</span>
              </div>
              <div style={{ height: 6, background: P.border, borderRadius: 4 }}>
                <div style={{ height: '100%', width: `${uploadProgress}%`, background: P.success, borderRadius: 4, transition: 'width 0.3s' }} />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Btn variant="ghost" onClick={() => setShowUpload(false)} style={{ flex: 1 }}>Cancel</Btn>
            <Btn onClick={handleUpload} disabled={uploading || !file} style={{ flex: 2 }}>
              {uploading ? `Uploading ${uploadProgress}%...` : '↑ Upload Document'}
            </Btn>
          </div>
        </Modal>
      )}

      {confirmAction && (
        <ConfirmModal
          message={confirmAction.message}
          onConfirm={() => { confirmAction.action(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}
