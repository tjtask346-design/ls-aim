// api/redirect.js
const { initializeApp } = require('firebase/app');
const { getFirestore, query, where, getDocs, updateDoc, increment } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export default async function handler(req, res) {
    const { shortCode } = req.query;
    
    if (!shortCode) {
        return res.redirect('/');
    }
    
    try {
        const linksRef = collection(db, 'links');
        const q = query(linksRef, where('shortCode', '==', shortCode));
        const querySnapshot = await getDocs(q);
        
        if (querySnapshot.empty) {
            return res.redirect('/');
        }
        
        const doc = querySnapshot.docs[0];
        const linkData = doc.data();
        
        // Update click count
        await updateDoc(doc.ref, {
            clicks: increment(1)
        });
        
        // Redirect to original URL
        return res.redirect(linkData.originalUrl);
    } catch (error) {
        console.error('Redirect error:', error);
        return res.redirect('/');
    }
}
