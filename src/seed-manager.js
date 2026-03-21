import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, setDoc, doc, serverTimestamp } from 'firebase/firestore';

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
const auth = getAuth(app);
const db = getFirestore(app);

async function seed() {
  try {
    console.log("Logging in...");
    const { user } = await signInWithEmailAndPassword(auth, 'manager@test.com', 'manager123');
    console.log("Logged in UID:", user.uid);
    
    console.log("Setting user profile in Firestore...");
    await setDoc(doc(db, 'users', user.uid), {
      name: "Test Manager",
      email: "manager@test.com",
      role: "manager",
      initials: "TM",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    console.log("Profile seeded successfully!");
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

seed();
