import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, OAuthProvider } from 'firebase/auth';
import { getFirestore, initializeFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, onSnapshot, query, where, orderBy, serverTimestamp, setDoc, collectionGroup } from 'firebase/firestore';
import { getStorage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAGIKYazY3u3J1SLZvIoVeiaH-ypAZTo0Q",
  authDomain: "safe-browser-a1acf.firebaseapp.com",
  projectId: "safe-browser-a1acf",
  storageBucket: "safe-browser-a1acf.firebasestorage.app",
  messagingSenderId: "310056223862",
  appId: "1:310056223862:web:b90d2518a4582000504b57",
  measurementId: "G-KQFH4HQNHL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const appleProvider = new OAuthProvider('apple.com');
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});
export const storage = getStorage(app);

// ─── Firestore Helpers ─────────────────────────────────────────────────────

// Users
export const getUserProfile = (uid) => getDoc(doc(db, 'users', uid));
export const setUserProfile = (uid, data) => setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });

export const subscribeAllUsers = (callback) =>
  onSnapshot(collection(db, 'users'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeManagers = (callback) =>
  onSnapshot(query(collection(db, 'users'), where('role', 'in', ['manager', 'landlord'])), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const updateUserRole = (uid, role) =>
  updateDoc(doc(db, 'users', uid), { role, updatedAt: serverTimestamp() });

// Properties
export const subscribeProperties = (callback) =>
  onSnapshot(collection(db, 'properties'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addProperty = (data) =>
  addDoc(collection(db, 'properties'), { ...data, createdAt: serverTimestamp() });

export const updateProperty = (id, data) =>
  updateDoc(doc(db, 'properties', id), { ...data, updatedAt: serverTimestamp() });

export const deleteProperty = (id) => deleteDoc(doc(db, 'properties', id));

// Tenants
export const subscribeTenants = (callback) =>
  onSnapshot(collection(db, 'tenants'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addTenant = (data) =>
  addDoc(collection(db, 'tenants'), { ...data, createdAt: serverTimestamp() });

export const updateTenant = (id, data) =>
  updateDoc(doc(db, 'tenants', id), { ...data, updatedAt: serverTimestamp() });

export const deleteTenant = (id) => deleteDoc(doc(db, 'tenants', id));

export const getTenantByUserId = (uid, callback) =>
  onSnapshot(query(collection(db, 'tenants'), where('userId', '==', uid)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))[0] || null));

// Payments
export const subscribePayments = (callback) =>
  onSnapshot(collection(db, 'payments'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeTenantPayments = (tenantId, callback) =>
  onSnapshot(query(collection(db, 'payments'), where('tenantId', '==', tenantId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addPayment = (data) =>
  addDoc(collection(db, 'payments'), { ...data, createdAt: serverTimestamp() });

export const updatePayment = (id, data) =>
  updateDoc(doc(db, 'payments', id), { ...data, updatedAt: serverTimestamp() });

// Maintenance
export const subscribeMaintenance = (callback) =>
  onSnapshot(collection(db, 'maintenance'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeTenantMaintenance = (tenantId, callback) =>
  onSnapshot(query(collection(db, 'maintenance'), where('tenantId', '==', tenantId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addMaintenanceRequest = async (data) => {
  const docRef = await addDoc(collection(db, 'maintenance'), {
    ...data,
    updates: [{ date: new Date().toLocaleDateString(), text: 'Request submitted.' }],
    createdAt: serverTimestamp()
  });
  // Notify managers
  getDocs(query(collection(db, 'users'), where('role', 'in', ['manager', 'landlord']))).then(snap => {
    snap.forEach(d => createNotification({ userId: d.id, title: 'New Maintenance Ticket', body: `${data.title} reported.`, link: 'maintenance' }));
  }).catch(e => console.error(e));
  return docRef;
};

export const updateMaintenanceRequest = (id, data) =>
  updateDoc(doc(db, 'maintenance', id), { ...data, updatedAt: serverTimestamp() });

// Documents
export const subscribeDocuments = (callback) =>
  onSnapshot(collection(db, 'documents'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeTenantDocuments = (tenantId, callback) =>
  onSnapshot(query(collection(db, 'documents'), where('tenantId', '==', tenantId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addDocument = (data) =>
  addDoc(collection(db, 'documents'), { ...data, createdAt: serverTimestamp() });

export const updateDocument = (id, data) =>
  updateDoc(doc(db, 'documents', id), { ...data, updatedAt: serverTimestamp() });

export const deleteDocument = (id) => deleteDoc(doc(db, 'documents', id));

export const uploadFile = (file, path, onProgress) => {
  return new Promise((resolve, reject) => {
    const storageRef = ref(storage, path);
    const task = uploadBytesResumable(storageRef, file);
    task.on('state_changed',
      snap => onProgress && onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      reject,
      async () => { const url = await getDownloadURL(task.snapshot.ref); resolve(url); }
    );
  });
};

// Announcements
export const subscribeAnnouncements = (callback) =>
  onSnapshot(collection(db, 'announcements'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addAnnouncement = async (data) => {
  const docRef = await addDoc(collection(db, 'announcements'), { ...data, createdAt: serverTimestamp() });
  // Notify tenants
  getDocs(query(collection(db, 'users'), where('role', '==', 'tenant'))).then(snap => {
    snap.forEach(d => createNotification({ userId: d.id, title: 'New Announcement', body: data.title, link: 'announcements' }));
  }).catch(e => console.error(e));
  return docRef;
};

export const updateAnnouncement = (id, data) =>
  updateDoc(doc(db, 'announcements', id), { ...data, updatedAt: serverTimestamp() });

export const deleteAnnouncement = (id) => deleteDoc(doc(db, 'announcements', id));

// Messages / Threads
export const subscribeThreads = (userId, callback) =>
  onSnapshot(query(collection(db, 'threads'), where('participants', 'array-contains', userId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeMessages = (threadId, callback) =>
  onSnapshot(collection(db, 'threads', threadId, 'messages'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const sendMessage = async (threadId, message) => {
  await addDoc(collection(db, 'threads', threadId, 'messages'), { ...message, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'threads', threadId), { lastMessage: message.text, updatedAt: serverTimestamp() });
};

export const createThread = (data) =>
  addDoc(collection(db, 'threads'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

// Notifications
export const subscribeNotifications = (userId, callback) =>
  onSnapshot(query(collection(db, 'notifications'), where('userId', '==', userId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const markNotificationRead = (id) => updateDoc(doc(db, 'notifications', id), { read: true });

export const createNotification = (data) =>
  addDoc(collection(db, 'notifications'), { ...data, read: false, createdAt: serverTimestamp() });

// Keys & Access
export const subscribeKeys = (callback) =>
  onSnapshot(collection(db, 'keys'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addKey = (data) =>
  addDoc(collection(db, 'keys'), { ...data, createdAt: serverTimestamp() });

export const updateKey = (id, data) =>
  updateDoc(doc(db, 'keys', id), { ...data, updatedAt: serverTimestamp() });

export const deleteKey = (id) => deleteDoc(doc(db, 'keys', id));

// Packages
export const subscribePackages = (callback) =>
  onSnapshot(collection(db, 'packages'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeTenantPackages = (tenantId, callback) =>
  onSnapshot(query(collection(db, 'packages'), where('tenantId', '==', tenantId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addPackage = async (data) => {
  const docRef = await addDoc(collection(db, 'packages'), { ...data, createdAt: serverTimestamp() });
  if (data.tenantId) {
    await createNotification({ userId: data.tenantId, title: 'Package Delivered', body: `A new package from ${data.courier} is waiting for you at the front desk.`, link: 'packages' });
  }
  return docRef;
};

export const updatePackage = (id, data) =>
  updateDoc(doc(db, 'packages', id), { ...data, updatedAt: serverTimestamp() });

export const deletePackage = (id) => deleteDoc(doc(db, 'packages', id));

// Deposits / LMR
export const subscribeDeposits = (callback) =>
  onSnapshot(collection(db, 'deposits'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeTenantDeposits = (tenantId, callback) =>
  onSnapshot(query(collection(db, 'deposits'), where('tenantId', '==', tenantId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addDeposit = (data) =>
  addDoc(collection(db, 'deposits'), { ...data, createdAt: serverTimestamp() });

export const updateDeposit = (id, data) =>
  updateDoc(doc(db, 'deposits', id), { ...data, updatedAt: serverTimestamp() });

export const deleteDeposit = (id) => deleteDoc(doc(db, 'deposits', id));

// Evictions Phase 15
export const subscribeEvictions = (callback) =>
  onSnapshot(collection(db, 'evictions'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addEviction = (data) =>
  addDoc(collection(db, 'evictions'), { ...data, createdAt: serverTimestamp() });

export const updateEviction = (id, data) =>
  updateDoc(doc(db, 'evictions', id), { ...data, updatedAt: serverTimestamp() });

export const deleteEviction = (id) => deleteDoc(doc(db, 'evictions', id));

// HOA Phase 17: Bylaw Violations
export const subscribeViolations = (callback) =>
  onSnapshot(collection(db, 'violations'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeUserViolations = (userId, callback) =>
  onSnapshot(query(collection(db, 'violations'), where('ownerId', '==', userId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addViolation = (data) =>
  addDoc(collection(db, 'violations'), { ...data, createdAt: serverTimestamp() });

export const updateViolation = (id, data) =>
  updateDoc(doc(db, 'violations', id), { ...data, updatedAt: serverTimestamp() });

export const deleteViolation = (id) => deleteDoc(doc(db, 'violations', id));

// HOA Phase 18: Reserve Fund
export const subscribeReserveFund = (callback) =>
  onSnapshot(collection(db, 'reserve_fund'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addReserveFundEntry = (data) =>
  addDoc(collection(db, 'reserve_fund'), { ...data, createdAt: serverTimestamp() });

export const updateReserveFundEntry = (id, data) =>
  updateDoc(doc(db, 'reserve_fund', id), { ...data, updatedAt: serverTimestamp() });

export const deleteReserveFundEntry = (id) => deleteDoc(doc(db, 'reserve_fund', id));

// HOA Phase 22: Reserve Study Projects
export const subscribeReserveProjects = (callback) =>
  onSnapshot(collection(db, 'reserve_projects'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addReserveProject = (data) =>
  addDoc(collection(db, 'reserve_projects'), { ...data, createdAt: serverTimestamp() });

export const updateReserveProject = (id, data) =>
  updateDoc(doc(db, 'reserve_projects', id), { ...data, updatedAt: serverTimestamp() });

export const deleteReserveProject = (id) => deleteDoc(doc(db, 'reserve_projects', id));

// HOA Phase 19: Board Meetings
export const subscribeMeetings = (callback) =>
  onSnapshot(collection(db, 'boardMeetings'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addMeeting = (data) =>
  addDoc(collection(db, 'boardMeetings'), { ...data, createdAt: serverTimestamp() });

export const updateMeeting = (id, data) =>
  updateDoc(doc(db, 'boardMeetings', id), { ...data, updatedAt: serverTimestamp() });

export const deleteMeeting = (id) => deleteDoc(doc(db, 'boardMeetings', id));

// HOA Phase 20: Special Assessments
export const subscribeAssessments = (callback) =>
  onSnapshot(collection(db, 'assessments'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addAssessment = (data) =>
  addDoc(collection(db, 'assessments'), { ...data, createdAt: serverTimestamp() });

export const updateAssessment = (id, data) =>
  updateDoc(doc(db, 'assessments', id), { ...data, updatedAt: serverTimestamp() });

export const deleteAssessment = (id) => deleteDoc(doc(db, 'assessments', id));

// HOA Phase 23: Special Assessment Unit Payments (Scalability)
export const subscribeAssessmentPayments = (assessmentId, callback) =>
  onSnapshot(collection(db, 'assessments', assessmentId, 'unit_payments'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeOwnerAssessmentPayments = (ownerId, callback) =>
  onSnapshot(query(collectionGroup(db, 'unit_payments'), where('ownerId', '==', ownerId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, assessmentId: d.ref.parent.parent.id, ...d.data() }))));

export const setUnitPayment = (assessmentId, unitId, data) =>
  setDoc(doc(db, 'assessments', assessmentId, 'unit_payments', unitId), { ...data, updatedAt: serverTimestamp() }, { merge: true });

// HOA Phase 23: Electronic Voting
export const subscribeVotes = (meetingId, callback) =>
  onSnapshot(collection(db, 'boardMeetings', meetingId, 'votes'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const submitVote = (meetingId, voteId, data) =>
  setDoc(doc(db, 'boardMeetings', meetingId, 'votes', voteId), { ...data, timestamp: serverTimestamp() }, { merge: true });

// Vendors & Contractors
export const subscribeVendors = (callback) =>
  onSnapshot(collection(db, 'vendors'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addVendor = (data) =>
  addDoc(collection(db, 'vendors'), { ...data, createdAt: serverTimestamp() });

export const updateVendor = (id, data) =>
  updateDoc(doc(db, 'vendors', id), { ...data, updatedAt: serverTimestamp() });

export const deleteVendor = (id) => deleteDoc(doc(db, 'vendors', id));

// Registry (Pets & Vehicles)
export const subscribeRegistry = (callback) =>
  onSnapshot(collection(db, 'registry'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeUserRegistry = (userId, callback) =>
  onSnapshot(query(collection(db, 'registry'), where('userId', '==', userId)), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addRegistryEntry = (data) =>
  addDoc(collection(db, 'registry'), { ...data, createdAt: serverTimestamp() });

export const updateRegistryEntry = (id, data) =>
  updateDoc(doc(db, 'registry', id), { ...data, updatedAt: serverTimestamp() });

export const deleteRegistryEntry = (id) => deleteDoc(doc(db, 'registry', id));

// Amenity Bookings
export const subscribeBookings = (propertyId, callback) => {
  let q = collection(db, 'bookings');
  if (propertyId) q = query(q, where('propertyId', '==', propertyId));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const addBooking = (data) =>
  addDoc(collection(db, 'bookings'), { ...data, createdAt: serverTimestamp() });

export const updateBooking = (id, data) =>
  updateDoc(doc(db, 'bookings', id), { ...data, updatedAt: serverTimestamp() });

export const deleteBooking = (id) => deleteDoc(doc(db, 'bookings', id));

// Visitor Management
export const subscribeVisitors = (propertyId, callback) => {
  let q = collection(db, 'visitors');
  if (propertyId) q = query(q, where('propertyId', '==', propertyId));
  return onSnapshot(q, snap => callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
};

export const addVisitor = (data) =>
  addDoc(collection(db, 'visitors'), { ...data, createdAt: serverTimestamp() });

export const updateVisitorStatus = (id, status) =>
  updateDoc(doc(db, 'visitors', id), { status, updatedAt: serverTimestamp() });

export const deleteVisitor = (id) => deleteDoc(doc(db, 'visitors', id));

export default app;
