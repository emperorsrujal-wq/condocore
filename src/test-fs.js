// test.js
import { initializeApp } from 'firebase/app';
import { getFirestore, getDoc, doc } from 'firebase/firestore';

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

console.log("Fetching user test...");
getDoc(doc(db, 'users', 'test'))
  .then(snap => {
    console.log("Success! exists:", snap.exists());
    process.exit(0);
  })
  .catch(err => {
    console.error("Error:", err);
    process.exit(1);
  });
