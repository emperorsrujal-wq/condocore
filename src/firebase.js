import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  getDoc, getDocs, onSnapshot, query, where, orderBy, serverTimestamp, setDoc } from 'firebase/firestore';
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
export const db = getFirestore(app);
export const storage = getStorage(app);

// ─── Firestore Helpers ─────────────────────────────────────────────────────

// Users
export const getUserProfile = (uid) => getDoc(doc(db, 'users', uid));
export const setUserProfile = (uid, data) => setDoc(doc(db, 'users', uid), { ...data, updatedAt: serverTimestamp() }, { merge: true });

// Properties
export const subscribeProperties = (callback) =>
  onSnapshot(collection(db, 'properties'), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addProperty = (data) =>
  addDoc(collection(db, 'properties'), { ...data, createdAt: serverTimestamp() });

// Tenants
export const subscribeTenants = (callback) =>
  onSnapshot(query(collection(db, 'tenants'), orderBy('createdAt', 'desc')), snap =>
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
  onSnapshot(query(collection(db, 'payments'), orderBy('createdAt', 'desc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeTenantPayments = (tenantId, callback) =>
  onSnapshot(query(collection(db, 'payments'), where('tenantId', '==', tenantId), orderBy('createdAt', 'desc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addPayment = (data) =>
  addDoc(collection(db, 'payments'), { ...data, createdAt: serverTimestamp() });

export const updatePayment = (id, data) =>
  updateDoc(doc(db, 'payments', id), { ...data, updatedAt: serverTimestamp() });

// Maintenance
export const subscribeMaintenance = (callback) =>
  onSnapshot(query(collection(db, 'maintenance'), orderBy('createdAt', 'desc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeTenantMaintenance = (tenantId, callback) =>
  onSnapshot(query(collection(db, 'maintenance'), where('tenantId', '==', tenantId), orderBy('createdAt', 'desc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addMaintenanceRequest = (data) =>
  addDoc(collection(db, 'maintenance'), {
    ...data,
    updates: [{ date: new Date().toLocaleDateString(), text: 'Request submitted.' }],
    createdAt: serverTimestamp()
  });

export const updateMaintenanceRequest = (id, data) =>
  updateDoc(doc(db, 'maintenance', id), { ...data, updatedAt: serverTimestamp() });

// Documents
export const subscribeDocuments = (callback) =>
  onSnapshot(query(collection(db, 'documents'), orderBy('createdAt', 'desc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeTenantDocuments = (tenantId, callback) =>
  onSnapshot(query(collection(db, 'documents'), where('tenantId', '==', tenantId), orderBy('createdAt', 'desc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addDocument = (data) =>
  addDoc(collection(db, 'documents'), { ...data, createdAt: serverTimestamp() });

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
  onSnapshot(query(collection(db, 'announcements'), orderBy('createdAt', 'desc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const addAnnouncement = (data) =>
  addDoc(collection(db, 'announcements'), { ...data, createdAt: serverTimestamp() });

export const updateAnnouncement = (id, data) =>
  updateDoc(doc(db, 'announcements', id), { ...data, updatedAt: serverTimestamp() });

export const deleteAnnouncement = (id) => deleteDoc(doc(db, 'announcements', id));

// Messages / Threads
export const subscribeThreads = (userId, callback) =>
  onSnapshot(query(collection(db, 'threads'), where('participants', 'array-contains', userId), orderBy('updatedAt', 'desc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const subscribeMessages = (threadId, callback) =>
  onSnapshot(query(collection(db, 'threads', threadId, 'messages'), orderBy('createdAt', 'asc')), snap =>
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() }))));

export const sendMessage = async (threadId, message) => {
  await addDoc(collection(db, 'threads', threadId, 'messages'), { ...message, createdAt: serverTimestamp() });
  await updateDoc(doc(db, 'threads', threadId), { lastMessage: message.text, updatedAt: serverTimestamp() });
};

export const createThread = (data) =>
  addDoc(collection(db, 'threads'), { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });

export default app;
