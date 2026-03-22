import { useState, useEffect, useRef } from 'react';
import { Send, Plus, Search, MessageSquare, User, Clock } from 'lucide-react';
import { subscribeThreads, subscribeMessages, sendMessage, createThread, subscribeTenants, subscribeManagers } from '../firebase';
import { P, Btn, PageHeader, Modal, Input, Select, Spinner, EmptyState } from '../components/UI';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase'; // for manual queries if needed

export default function MessagesPage({ userProfile, onToast }) {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  
  // New thread modal
  const [showNew, setShowNew] = useState(false);
  const [contacts, setContacts] = useState([]); // List of people we can message
  const [selectedContact, setSelectedContact] = useState('');
  
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!userProfile?.uid) return;
    const unsub = subscribeThreads(userProfile.uid, data => {
      // Sort by updatedAt desc
      const sorted = [...data].sort((a, b) => {
        const tA = a.updatedAt?.toDate ? a.updatedAt.toDate().getTime() : 0;
        const tB = b.updatedAt?.toDate ? b.updatedAt.toDate().getTime() : 0;
        return tB - tA;
      });
      setThreads(sorted);
      setLoading(false);
    });
    return unsub;
  }, [userProfile]);

  useEffect(() => {
    // Load contacts based on role
    if (userProfile?.role === 'manager' || userProfile?.role === 'landlord') {
      const unsub = subscribeTenants(data => {
        // Tenants have { userId, name, unit }
        const mapped = data.filter(t => t.userId).map(t => ({ id: t.userId, name: `${t.name} (Unit ${t.unit || '?'})` }));
        setContacts(mapped);
      });
      return unsub;
    } else {
      // Tenant looking for manager. Using optimized helper.
      const unsub = subscribeManagers(data => {
        const mapped = data.map(d => ({ id: d.id, name: `${d.name} (Manager)` }));
        setContacts(mapped);
      });
      return unsub;
    }
  }, [userProfile]);

  useEffect(() => {
    if (!activeThreadId) return;
    const unsub = subscribeMessages(activeThreadId, data => {
      setMessages(data);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });
    return unsub;
  }, [activeThreadId]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeThreadId) return;
    const currentText = text.trim();
    setText(''); // clear optimistic
    try {
      await sendMessage(activeThreadId, { text: currentText, senderId: userProfile.uid, senderName: userProfile.name });
    } catch (e) { 
      onToast(e.message, 'error'); 
      setText(currentText); // revert on error
    }
  };

  const handleStartThread = async () => {
    if (!selectedContact) return onToast('Please select a recipient.', 'error');
    
    // Check if thread already exists with this exact single other person
    const existing = threads.find(t => 
      t.participants.includes(selectedContact) && 
      t.participants.length === 2
    );
    
    if (existing) {
      setActiveThreadId(existing.id);
      setShowNew(false);
      return;
    }

    try {
      // Find contact name
      const contactName = contacts.find(c => c.id === selectedContact)?.name || 'User';
      
      const newThread = {
        participants: [userProfile.uid, selectedContact],
        participantNames: {
          [userProfile.uid]: userProfile.name,
          [selectedContact]: contactName.replace(/ \(.*\)/, '') // Strip extra info
        },
        lastMessage: 'Thread started',
      };
      
      // The firebase createThread returns a docRef if we modified it, but currently it just returns undefined if it's async void without returning await. Wait, our `createThread` in firebase.js returns a Promise containing the docRef!
      const docRef = await createThread(newThread);
      setActiveThreadId(docRef.id);
      setShowNew(false);
    } catch (e) {
      onToast(e.message, 'error');
    }
  };

  const getOtherParticipantName = (thread) => {
    if (!thread || !thread.participants || !thread.participantNames) return 'Unknown';
    const otherId = thread.participants.find(id => id !== userProfile?.uid);
    return thread.participantNames[otherId] || 'Unknown';
  };


  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <PageHeader
        title="Messages"
        subtitle="Direct communication with tenants and staff"
        action={<Btn onClick={() => setShowNew(true)}><Plus size={15} /> New Message</Btn>}
      />

      <div style={{ display: 'flex', flex: 1, background: P.card, borderRadius: 14, border: `1px solid ${P.border}`, overflow: 'hidden', minHeight: 0 }}>
        
        {/* Sidebar: Thread List */}
        <div style={{ width: 320, borderRight: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column', background: '#fafbfc' }}>
          <div style={{ padding: '16px', borderBottom: `1px solid ${P.border}` }}>
            <div style={{ position: 'relative' }}>
              <Search size={16} color={P.textMuted} style={{ position: 'absolute', left: 12, top: 12 }} />
              <input type="text" placeholder="Search conversations..." 
                style={{ width: '100%', padding: '10px 10px 10px 38px', borderRadius: 8, border: `1.5px solid ${P.border}`, outline: 'none', fontFamily: "'DM Sans', sans-serif" }} 
              />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {threads.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center', color: P.textMuted }}>
                <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
                <div style={{ fontSize: 13 }}>No active conversations</div>
              </div>
            ) : (
              threads.map(t => {
                const active = activeThreadId === t.id;
                const otherName = getOtherParticipantName(t);
                return (
                  <div key={t.id} onClick={() => setActiveThreadId(t.id)}
                    style={{ padding: '16px', borderBottom: `1px solid ${P.border}`, cursor: 'pointer', background: active ? '#fff' : 'transparent', borderLeft: `3px solid ${active ? P.navy : 'transparent'}`, transition: 'all 0.2s' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: P.navy, fontSize: 13 }}>{otherName}</span>
                      <span style={{ fontSize: 10, color: P.textMuted }}>{t.updatedAt?.toDate ? t.updatedAt.toDate().toLocaleDateString() : ''}</span>
                    </div>
                    <div style={{ fontSize: 12, color: active ? P.text : P.textMuted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {t.lastMessage || '...'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chat Canvas Section */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
          {!activeThreadId ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: P.textMuted, flexDirection: 'column' }}>
              <MessageSquare size={48} style={{ opacity: 0.2, marginBottom: 16 }} />
              <p>Select a conversation to start messaging</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div style={{ padding: '16px 24px', borderBottom: `1px solid ${P.border}`, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: P.navyLight + '20', color: P.navy, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                  {getOtherParticipantName(threads.find(t => t.id === activeThreadId))?.[0] || '?'}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: P.navy, fontSize: 15 }}>{getOtherParticipantName(threads.find(t => t.id === activeThreadId))}</div>
                  <div style={{ fontSize: 12, color: P.textMuted }}>Participant</div>
                </div>
              </div>

              {/* Message History */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, background: '#f8f9fa' }}>
                {messages.length === 0 ? (
                  <div style={{ margin: 'auto', color: P.textMuted, fontSize: 13 }}>Start the conversation...</div>
                ) : (
                  messages.map((m, i) => {
                    const isMe = m.senderId === userProfile.uid;
                    return (
                      <div key={m.id || i} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '70%', display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{ 
                          background: isMe ? P.navy : '#fff', 
                          color: isMe ? '#fff' : P.text, 
                          padding: '12px 16px', 
                          borderRadius: '16px', 
                          borderBottomRightRadius: isMe ? 4 : 16,
                          borderBottomLeftRadius: !isMe ? 4 : 16,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                          border: isMe ? 'none' : `1px solid ${P.border}`,
                          fontSize: 14,
                          lineHeight: 1.5
                        }}>
                          {m.text}
                        </div>
                        <div style={{ fontSize: 10, color: P.textMuted, marginTop: 4, padding: '0 4px' }}>
                          {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Just now'}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSend} style={{ borderTop: `1px solid ${P.border}`, padding: '16px 24px', display: 'flex', gap: 12, background: '#fff' }}>
                <input 
                  type="text" 
                  value={text} 
                  onChange={e => setText(e.target.value)}
                  placeholder="Type a message..." 
                  style={{ flex: 1, padding: '12px 16px', borderRadius: 24, border: `1.5px solid ${P.border}`, outline: 'none', fontSize: 14, fontFamily: "'DM Sans', sans-serif" }}
                />
                <button type="submit" disabled={!text.trim()} 
                  style={{ width: 44, height: 44, borderRadius: '50%', background: text.trim() ? P.success : P.border, border: 'none', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: text.trim() ? 'pointer' : 'not-allowed', transition: 'background 0.2s' }}>
                  <Send size={18} style={{ marginLeft: -2 }} />
                </button>
              </form>
            </>
          )}
        </div>

      </div>

      {showNew && (
        <Modal title="New Conversation" onClose={() => setShowNew(false)} maxWidth={400}>
          <div style={{ marginBottom: 20 }}>
            <Select 
              label="Select Recipient" 
              value={selectedContact} 
              onChange={e => setSelectedContact(e.target.value)} 
              options={[
                { label: '--- Select someone ---', value: '' },
                ...contacts.map(c => ({ label: c.name, value: c.id }))
              ]} 
            />
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn onClick={() => setShowNew(false)} secondary>Cancel</Btn>
            <Btn onClick={handleStartThread}>Start Chat</Btn>
          </div>
        </Modal>
      )}

    </div>
  );
}
