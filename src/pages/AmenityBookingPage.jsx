import { useState, useEffect } from 'react';
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Info, Trash2, User, Building, List } from 'lucide-react';
import { subscribeBookings, addBooking, deleteBooking, subscribeProperties } from '../firebase';
import { P, Btn, Modal, PageHeader, Spinner, EmptyState, StatusBadge, Select, Table, TR, TD, ConfirmModal } from '../components/UI';

// Normalize amenity entries that could be strings or objects
const getAmenityName = (a) => {
  if (typeof a === 'string') return a;
  if (a && typeof a === 'object') return a.name || a.label || JSON.stringify(a);
  return String(a);
};

export default function AmenityBookingPage({ userProfile, tenantData, onToast }) {
  const [properties, setProperties] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPropertyId, setSelectedPropertyId] = useState('');
  const [selectedAmenity, setSelectedAmenity] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showConfirm, setShowConfirm] = useState(null);
  const [confirmAction, setConfirmAction] = useState(null);
  const [viewMode, setViewMode] = useState('calendar');

  const isManager = ['manager', 'landlord', 'super_admin'].includes(userProfile?.role);
  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const unsubP = subscribeProperties(data => {
      setProperties(data);
      setLoading(false);
      if (!isManager && tenantData?.propertyId) {
        setSelectedPropertyId(tenantData.propertyId);
      } else if (data.length > 0 && !selectedPropertyId) {
        setSelectedPropertyId(data[0].id);
      }
    });
    return () => unsubP();
  }, [isManager, tenantData?.propertyId]);

  useEffect(() => {
    if (!selectedPropertyId) return;
    const unsubB = subscribeBookings(selectedPropertyId, data => {
      const sorted = [...data].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
      setBookings(sorted);
      setLoading(false);
    });
    return () => unsubB();
  }, [selectedPropertyId]);

  const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = (month, year) => new Date(year, month, 1).getDay();

  const handlePrevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const handleNextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const activeProperty = properties.find(p => p.id === selectedPropertyId);
  const rawAmenities = activeProperty?.bookableAmenities || [];
  const bookableAmenities = rawAmenities.map(getAmenityName);

  const handleBook = async () => {
    if (!showConfirm) return;
    const isTaken = bookings.some(b => b.date === showConfirm.date && b.amenityName === selectedAmenity);
    if (isTaken) return onToast('This slot has already been reserved. Please refresh or pick another date.', 'error');

    try {
      await addBooking({
        propertyId: selectedPropertyId,
        propertyName: activeProperty.name,
        amenityName: selectedAmenity,
        date: showConfirm.date,
        userId: userProfile.uid,
        userName: userProfile.name,
        unit: tenantData?.unit || 'N/A',
        status: 'Confirmed'
      });
      onToast(`Successfully booked ${selectedAmenity} for ${showConfirm.date}!`);
      setShowConfirm(null);
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  const handleDelete = async (id) => {
    setConfirmAction({ message: 'Cancel this booking?', action: async () => {
      try {
        await deleteBooking(id);
        onToast('Booking cancelled.');
      } catch (e) {
        onToast(e.message, 'error');
      }
    } });
  };

  if (loading && properties.length === 0) return <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Spinner size={32} /></div>;

  // ─── Calendar View ──────────────────────────────────────────────
  const renderCalendar = () => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();
    const days = daysInMonth(month, year);
    const startDay = firstDayOfMonth(month, year);
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    const calendarDays = [];
    for (let i = 0; i < startDay; i++) calendarDays.push(null);
    for (let i = 1; i <= days; i++) calendarDays.push(i);

    return (
      <div style={{ background: P.card, borderRadius: 16, border: `1px solid ${P.border}`, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', background: P.bg, borderBottom: `1px solid ${P.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <CalendarIcon size={20} color={P.navy} />
            <span style={{ fontWeight: 800, fontSize: 18, color: P.navy }}>{monthName} {year}</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handlePrevMonth} style={{ padding: 6, borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer' }}><ChevronLeft size={18} /></button>
            <button onClick={handleNextMonth} style={{ padding: 6, borderRadius: 8, border: `1px solid ${P.border}`, background: '#fff', cursor: 'pointer' }}><ChevronRight size={18} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#fff' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ padding: '12px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: P.textMuted, borderBottom: `1px solid ${P.border}`, background: '#fafbfc' }}>{d}</div>
          ))}
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} style={{ borderBottom: `1px solid ${P.border}`, borderRight: `1px solid ${P.border}` }} />;

            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const isToday = todayStr === dateStr;
            const isPast = dateStr < todayStr;
            const booking = bookings.find(b => b.date === dateStr && b.amenityName === selectedAmenity);

            return (
              <div key={dateStr} style={{
                height: 100, borderBottom: `1px solid ${P.border}`, borderRight: (idx + 1) % 7 === 0 ? 'none' : `1px solid ${P.border}`,
                padding: 8, position: 'relative',
                background: isPast ? '#f5f5f5' : isToday ? '#FFF9E6' : '#fff',
                opacity: isPast && !booking ? 0.5 : 1
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: isPast ? P.textMuted : isToday ? P.warning : P.text }}>{day}</div>
                {booking ? (
                  <div style={{
                    marginTop: 6, padding: '4px 8px', borderRadius: 6,
                    background: booking.userId === userProfile.uid ? '#EAF7F2' : '#FDECEA',
                    border: `1px solid ${booking.userId === userProfile.uid ? P.success + '44' : P.danger + '22'}`,
                    fontSize: 10, fontWeight: 700, color: booking.userId === userProfile.uid ? P.success : P.danger
                  }}>
                    {isManager ? (
                      <div>
                        <div>{booking.userName}</div>
                        <div style={{ opacity: 0.7 }}>Unit {booking.unit}</div>
                      </div>
                    ) : (
                      booking.userId === userProfile.uid ? 'Your Booking' : 'Reserved'
                    )}
                    {(isManager || booking.userId === userProfile.uid) && !isPast && (
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(booking.id); }} style={{ position: 'absolute', top: 4, right: 4, border: 'none', background: 'none', color: P.danger, cursor: 'pointer', padding: 2 }}>
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ) : !isPast ? (
                  <button
                    onClick={() => setShowConfirm({ date: dateStr, amenity: selectedAmenity })}
                    style={{ position: 'absolute', inset: 0, border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none' }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── List View ──────────────────────────────────────────────────
  const renderListView = () => {
    let filtered = selectedAmenity
      ? bookings.filter(b => b.amenityName === selectedAmenity)
      : bookings;

    if (!isManager) {
      filtered = filtered.filter(b => b.userId === userProfile.uid);
    }

    // Sort newest first
    const sorted = [...filtered].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const upcoming = sorted.filter(b => b.date >= todayStr);
    const past = sorted.filter(b => b.date < todayStr);

    if (sorted.length === 0) {
      return <EmptyState icon="📋" title="No Bookings Found" body={selectedAmenity ? `No bookings for ${selectedAmenity} yet.` : 'No bookings for this property yet.'} />;
    }

    const renderTable = (items, label) => {
      if (items.length === 0) return null;
      return (
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: P.textMuted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>{label} ({items.length})</div>
          <Table headers={['Date', 'Facility', ...(isManager ? ['Booked By', 'Unit'] : []), 'Status', 'Actions']}>
            {items.map((b, i) => {
              const dateObj = new Date(b.date + 'T00:00:00');
              const dateFormatted = dateObj.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
              const isPast = b.date < todayStr;
              return (
                <TR key={b.id} idx={i}>
                  <TD bold>{dateFormatted}</TD>
                  <TD>{b.amenityName}</TD>
                  {isManager && <TD>{b.userName || '—'}</TD>}
                  {isManager && <TD>{b.unit || '—'}</TD>}
                  <TD><StatusBadge status={isPast ? 'resolved' : 'approved'} /></TD>
                  <TD>
                    {!isPast && (isManager || b.userId === userProfile.uid) ? (
                      <button onClick={() => handleDelete(b.id)} style={{ border: 'none', background: 'none', color: P.danger, cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
                        <Trash2 size={14} /> Cancel
                      </button>
                    ) : (
                      <span style={{ fontSize: 12, color: P.textMuted }}>{isPast ? 'Completed' : '—'}</span>
                    )}
                  </TD>
                </TR>
              );
            })}
          </Table>
        </div>
      );
    };

    return (
      <div>
        {renderTable(upcoming, 'Upcoming Bookings')}
        {renderTable(past, 'Past Bookings')}
      </div>
    );
  };

  return (
    <div>
      <PageHeader title="Amenity Bookings" subtitle="Reserve building facilities and community spaces" />

      <div style={{ display: 'flex', gap: 20, marginBottom: 24, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <Select
            label="1. Select Property"
            value={selectedPropertyId}
            onChange={e => { setSelectedPropertyId(e.target.value); setSelectedAmenity(''); }}
            disabled={!isManager}
            options={properties.map(p => ({ label: p.name, value: p.id }))}
          />
        </div>
        <div style={{ flex: 1 }}>
          <Select
            label="2. Select Facility"
            value={selectedAmenity}
            onChange={e => setSelectedAmenity(e.target.value)}
            options={[
              { label: selectedAmenity ? 'All Facilities' : 'Select an Amenity...', value: '' },
              ...bookableAmenities.map(a => ({ label: a, value: a }))
            ]}
          />
        </div>
        <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
          <button
            onClick={() => setViewMode('calendar')}
            style={{ padding: '10px 14px', borderRadius: '9px 0 0 9px', border: `1.5px solid ${P.border}`, borderRight: 'none', background: viewMode === 'calendar' ? P.navy : '#fff', color: viewMode === 'calendar' ? '#fff' : P.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
          >
            <CalendarIcon size={15} /> Calendar
          </button>
          <button
            onClick={() => setViewMode('list')}
            style={{ padding: '10px 14px', borderRadius: '0 9px 9px 0', border: `1.5px solid ${P.border}`, background: viewMode === 'list' ? P.navy : '#fff', color: viewMode === 'list' ? '#fff' : P.textMuted, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600 }}
          >
            <List size={15} /> List
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        !selectedAmenity ? (
          <EmptyState icon="🏊‍♂️" title="No Amenity Selected" body="Please select a building and facility to view available dates." />
        ) : (
          renderCalendar()
        )
      ) : (
        renderListView()
      )}

      {showConfirm && (
        <Modal title="Confirm Booking" onClose={() => setShowConfirm(null)}>
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${P.success}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CalendarIcon size={30} color={P.success} />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: P.navy, marginBottom: 8 }}>Reserve {showConfirm.amenity}?</div>
            <div style={{ fontSize: 14, color: P.textMuted, marginBottom: 24 }}>
              Setting a reservation for <b style={{ color: P.text }}>{new Date(showConfirm.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</b>.
            </div>

            <div style={{ display: 'flex', gap: 12 }}>
              <Btn variant="ghost" onClick={() => setShowConfirm(null)} style={{ flex: 1 }}>Cancel</Btn>
              <Btn onClick={handleBook} style={{ flex: 2 }}>Confirm Reservation</Btn>
            </div>

            <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: P.bg, borderRadius: 10, fontSize: 12, color: P.textMuted }}>
              <Info size={14} /> Only one booking per day is permitted for this facility.
            </div>
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
