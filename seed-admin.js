import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAGIKYazY3u3J1SLZvIoVeiaH-ypAZTo0Q",
  authDomain: "safe-browser-a1acf.firebaseapp.com",
  projectId: "safe-browser-a1acf",
  storageBucket: "safe-browser-a1acf.firebasestorage.app",
  messagingSenderId: "310056223862",
  appId: "1:310056223862:web:b90d2518a4582000504b57"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const email = 'emperorsrujal@gmail.com';
const password = 'Sujubond@007';

async function seed() {
  try {
    console.log(`Attempting to create Super Admin account for ${email}...`);
    
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    console.log(`Auth account created! UID: ${user.uid}`);
    
    console.log('Writing super-admin role to default users collection...');
    await setDoc(doc(db, 'users', user.uid), {
      name: 'Super Admin',
      email: email,
      role: 'super-admin',
      initials: 'SA',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log("SUCCESS! Account is provisioned and ready for login.");
    process.exit(0);
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('NOTICE: This email is already registered in Firebase Authentication (likely tied to your Google OAuth profile).');
      console.log('To set the password on your existing Google-linked account, please log in with Google, go to Settings, and type your new password in the Security panel, or let me know if you would like me to force reset it via other means.');
      process.exit(0);
    } else {
      console.error("FAILED to provision account:", error);
      process.exit(1);
    }
  }
}

seed();
