import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

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
const db = getFirestore(app);

async function seed() {
  try {
    const tenantUID = 'test-tenant-uid-123';
    
    // 1. Create User Document
    await setDoc(doc(db, 'users', tenantUID), {
      name: 'Alice Smith',
      email: 'alice@example.com',
      phone: '555-0100',
      role: 'tenant',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    // 2. Create Tenant Entity linked to the User Profile
    await addDoc(collection(db, 'tenants'), {
      name: 'Alice Smith',
      email: 'alice@example.com',
      phone: '555-0100',
      userId: tenantUID,
      propertyId: 'fake-property-id',
      unit: 'A1',
      leaseStart: '2026-01-01',
      leaseEnd: '2027-01-01',
      rentAmount: 1200,
      createdAt: serverTimestamp()
    });

    console.log("Successfully seeded Alice Smith as a Tenant!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
