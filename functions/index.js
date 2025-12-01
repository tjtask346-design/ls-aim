// functions/index.js
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

exports.redirectShortUrl = functions.https.onRequest(async (req, res) => {
    const shortId = req.path.split('/')[1];

    if (!shortId) {
        // রুট ডিরেক্টরিতে ফিরিয়ে দেবে (যদি কেউ শুধু ডোমেইন ভিজিট করে)
        return res.redirect('/'); 
    }

    try {
        const docRef = db.collection('all_short_links').doc(shortId);
        const doc = await docRef.get();

        if (doc.exists) {
            const data = doc.data();
            const longUrl = data.longUrl;

            // ক্লিক কাউন্টার আপডেট করা
            await docRef.update({
                clicks: admin.firestore.FieldValue.increment(1)
            });

            // লম্বা ইউআরএল এ রিডাইরেক্ট করা
            return res.redirect(301, longUrl); 
        } else {
            // লিঙ্ক খুঁজে না পেলে 404
            return res.status(404).send('Not Found: The short link does not exist.');
        }
    } catch (error) {
        console.error("Redirection Error:", error);
        return res.status(500).send('Internal Server Error');
    }
});
