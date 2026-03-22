import { useState, useEffect, useMemo } from 'react';
import { Download, PieChart, BarChart2, DollarSign, Wrench } from 'lucide-react';
import { subscribePayments, subscribeMaintenance, subscribeProperties, subscribeTenants } from '../firebase';
import { P, Btn, PageHeader, StatCard, Table, TR, TD, Select, Spinner, EmptyState } from '../components/UI';
import { useHOAMode } from '../contexts/HOAModeContext';

export default function ReportsPage({ userProfile, onToast }) {
  const { label, isHOAMode } = useHOAMode();
  const [reportType, setReportType] = useState('financial'); // 'financial' | 'vat' | 'maintenance'
  const [propertyId, setPropertyId] = useState('all');
  const [dateRange, setDateRange]   = useState('ytd'); // 'ytd' | 'lastYear' | 'all'

  const [properties, setProperties] = useState([]);
  const [tenants, setTenants]       = useState([]);
  const [payments, setPayments]     = useState([]);
  const [maintenance, setMaintenance] = useState([]);
  const [loading, setLoading]       = useState(true);

  useEffect(() => {
    let u1 = subscribeProperties(p => setProperties(p));
    let u2 = subscribeTenants(t => setTenants(t));
    let u3 = subscribePayments(p => setPayments(p));
    let u4 = subscribeMaintenance(m => setMaintenance(m));
    
    // Slight delay to ensure all listeners hit initial state
    setTimeout(() => setLoading(false), 800);
    return () => { u1(); u2(); u3(); u4(); };
  }, []);

  const selectedProperty = properties.find(p => p.id === propertyId);
  const propertyNameFilter = selectedProperty ? selectedProperty.name : null;

  // Filter tenant IDs belonging to the selected property
  const validTenantIds = useMemo(() => {
    if (!propertyNameFilter) return null; // 'all'
    return new Set(tenants.filter(t => t.property === propertyNameFilter).map(t => t.id));
  }, [propertyNameFilter, tenants]);

  // Date filtering
  const isWithinDateRange = (dateStr) => {
    if (dateRange === 'all' || !dateStr) return true;
    const date = new Date(dateStr);
    const now = new Date();
    if (dateRange === 'ytd') return date.getFullYear() === now.getFullYear();
    if (dateRange === 'lastYear') return date.getFullYear() === now.getFullYear() - 1;
    return true;
  };

  // --- Financial Data ---
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      if (validTenantIds && !validTenantIds.has(p.tenantId)) return false;
      const d = p.createdAt?.toDate ? p.createdAt.toDate() : p.createdAt;
      if (!isWithinDateRange(d)) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
  }, [payments, validTenantIds, dateRange]);

  const totalCollected = filteredPayments.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalPending   = filteredPayments.filter(p => p.status !== 'paid').reduce((sum, p) => sum + (p.amount || 0), 0);
  const totalRevenue   = totalCollected + totalPending;

  // --- Maintenance Data ---
  const filteredMaintenance = useMemo(() => {
    return maintenance.filter(m => {
      if (validTenantIds && !validTenantIds.has(m.tenantId)) return false;
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : m.createdAt;
      if (!isWithinDateRange(d)) return false;
      return true;
    }).sort((a, b) => {
      const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(0);
      const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(0);
      return dateB - dateA;
    });
  }, [maintenance, validTenantIds, dateRange]);

  const maintenanceResolved = filteredMaintenance.filter(m => m.status === 'Resolved').length;
  const maintenancePending  = filteredMaintenance.filter(m => m.status !== 'Resolved').length;

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <PageHeader 
        title="Advanced Reporting" 
        subtitle="Generate financial and operational insights"
        action={<Btn onClick={() => onToast('Exporting to PDF... (Mock)')}><Download size={15} /> Export Report</Btn>}
      />

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, background: P.card, padding: 16, borderRadius: 12, border: `1px solid ${P.border}`, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px' }}>
          <Select label="Report Type" value={reportType} onChange={e => setReportType(e.target.value)} options={[
            { label: (isHOAMode ? 'HOA ' : '') + 'Financial Summary', value: 'financial' },
            { label: 'VAT / Tax Estimator', value: 'vat' },
            { label: label('maintenance', 'Maintenance') + ' Efficiency', value: 'maintenance' }
          ]} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Select label="Property" value={propertyId} onChange={e => setPropertyId(e.target.value)} options={[
            { label: 'All Properties', value: 'all' },
            ...properties.map(p => ({ label: p.name, value: p.id }))
          ]} />
        </div>
        <div style={{ flex: '1 1 200px' }}>
          <Select label="Date Range" value={dateRange} onChange={e => setDateRange(e.target.value)} options={[
            { label: 'Year to Date', value: 'ytd' },
            { label: 'Last Year', value: 'lastYear' },
            { label: 'All Time', value: 'all' }
          ]} />
        </div>
      </div>

      {/* --- FINANCIAL REPORT --- */}
      {reportType === 'financial' && (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Total Revenue (Expected)" value={`$${totalRevenue.toLocaleString()}`} icon="💰" color={P.navy} />
            <StatCard label={label('rent', 'Rent') + " Collected"} value={`$${totalCollected.toLocaleString()}`} icon="✅" color={P.success} />
            <StatCard label="Outstanding" value={`$${totalPending.toLocaleString()}`} icon="⏳" color={P.gold} />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12 }}>{label('rent', 'Payment')} Breakdown</h3>
          {filteredPayments.length === 0 ? <EmptyState icon="🧾" title="No data found for this period" /> : (
            <Table headers={[label('tenant', 'Tenant'), 'Amount', 'Status', 'Method', 'Date']}>
              {filteredPayments.map((p, i) => {
                const tenantName = tenants.find(t => t.id === p.tenantId)?.name || 'Unknown';
                const dateStr = p.paid || p.due || (p.createdAt?.toDate ? p.createdAt.toDate().toLocaleDateString() : 'N/A');
                return (
                  <TR key={p.id || i} idx={i}>
                    <TD bold>{tenantName}</TD>
                    <TD>${Number(p.amount).toLocaleString()}</TD>
                    <TD>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, 
                        background: p.status === 'paid' ? '#EAF7F2' : '#FFF4E5', 
                        color: p.status === 'paid' ? P.success : P.gold }}>
                        {p.status}
                      </span>
                    </TD>
                    <TD>{p.method || 'Unknown'}</TD>
                    <TD>{dateStr}</TD>
                  </TR>
                );
              })}
            </Table>
          )}
        </>
      )}

      {/* --- VAT ESTIMATOR --- */}
      {reportType === 'vat' && (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Eligible Revenue (Collected)" value={`$${totalCollected.toLocaleString()}`} icon="💵" color={P.navy} />
            <StatCard label="Estimated VAT (5%)" value={`$${(totalCollected * 0.05).toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon="🏛️" color={P.primary} />
            <StatCard label="Net Remainder" value={`$${(totalCollected * 0.95).toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon="📊" color={P.success} />
          </div>
          <div style={{ background: P.navyLight + '10', padding: '24px 28px', borderRadius: 12, border: `1px solid ${P.navyLight}30` }}>
            <h4 style={{ margin: '0 0 10px', color: P.navy, fontSize: 16 }}>VAT Calculation Notes</h4>
            <p style={{ color: P.textMuted, fontSize: 14, lineHeight: 1.6, margin: 0 }}>
              This VAT estimator automatically calculates a flat 5% provision on all <strong>Collected</strong> payments fitting the criteria. 
              Pending or outstanding balances are excluded from this calculation. 
              For official tax filings, please export these records and consult a certified accountant or tax specialist in your jurisdiction.
            </p>
          </div>
        </>
      )}

      {/* --- MAINTENANCE EFFICIENCY --- */}
      {reportType === 'maintenance' && (
        <>
          <div style={{ display: 'flex', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
            <StatCard label="Total Requests" value={filteredMaintenance.length} icon="🔧" color={P.navy} />
            <StatCard label="Resolved" value={maintenanceResolved} icon="✅" color={P.success} />
            <StatCard label="Pending/Active" value={maintenancePending} icon="🚧" color={P.gold} />
          </div>

          <h3 style={{ fontSize: 16, fontWeight: 700, color: P.text, marginBottom: 12 }}>{label('maintenance', 'Maintenance')} Ticket Log</h3>
          {filteredMaintenance.length === 0 ? <EmptyState icon="🛠️" title="No maintenance data found" /> : (
            <Table headers={['Issue', label('tenant', 'Tenant'), 'Status', 'Priority', 'Logged']}>
              {filteredMaintenance.map((m, i) => {
                const tenantName = tenants.find(t => t.id === m.tenantId)?.name || 'Unknown';
                const dateStr = m.createdAt?.toDate ? m.createdAt.toDate().toLocaleDateString() : 'N/A';
                return (
                  <TR key={m.id || i} idx={i}>
                    <TD bold>{m.topic || (m.description ? m.description.slice(0, 30) + '...' : 'No Description')}</TD>
                    <TD>{tenantName}</TD>
                    <TD>
                      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 4, 
                        background: m.status === 'Resolved' ? '#EAF7F2' : '#F4F6F8', 
                        color: m.status === 'Resolved' ? P.success : P.textMuted }}>
                        {m.status || 'Pending'}
                      </span>
                    </TD>
                    <TD>
                      <span style={{ fontSize: 12, fontWeight: 600, color: m.priority === 'High' ? P.danger : m.priority === 'Medium' ? P.gold : P.navyLight }}>
                        {m.priority || 'Normal'}
                      </span>
                    </TD>
                    <TD>{dateStr}</TD>
                  </TR>
                );
              })}
            </Table>
          )}
        </>
      )}

    </div>
  );
}
