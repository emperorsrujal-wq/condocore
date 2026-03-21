const API_KEY = "AIzaSyAGIKYazY3u3J1SLZvIoVeiaH-ypAZTo0Q";
const EMAIL = "emperorsrujal@gmail.com";
const PASSWORD = "Sujubond@007";
const PROJECT_ID = "safe-browser-a1acf";

async function run() {
  console.log("Provisioning via REST API...");
  // 1. Sign up
  const resp = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, returnSecureToken: true })
  });
  const data = await resp.json();

  if (data.error && data.error.message === 'EMAIL_EXISTS') {
    console.log("Account already exists! Either you signed up via Google, or have an existing password.");
    // Exiting with code 2 so we know it's EMAIL_EXISTS
    process.exit(2);
  } else if (data.error) {
    console.log("Error:", data.error.message);
    process.exit(1);
  }

  const idToken = data.idToken;
  const uid = data.localId;
  console.log("Auth created! UID:", uid);

  // 2. Write to Firestore using REST
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/users/${uid}`;
  const firestoreResp = await fetch(`https://firestore.googleapis.com/v1/${docPath}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
    body: JSON.stringify({
      fields: {
        name: { stringValue: 'Super Admin' },
        email: { stringValue: EMAIL },
        role: { stringValue: 'super-admin' },
        initials: { stringValue: 'SA' },
      }
    })
  });

  if (!firestoreResp.ok) {
    const fsData = await firestoreResp.json();
    console.log("Firestore Error:", JSON.stringify(fsData));
  } else {
    console.log("SUCCESS! Firestore document set as super-admin.");
  }
}
run();
