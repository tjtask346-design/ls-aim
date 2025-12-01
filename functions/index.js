const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.redirectToLink = functions.https.onRequest(async (req, res) => {
    const shortCode = req.params[0];
    
    if (!shortCode || shortCode === '') {
        return res.redirect('/');
    }
    
    try {
        const snapshot = await admin.firestore()
            .collection('links')
            .where('shortCode', '==', shortCode)
            .limit(1)
            .get();
        
        if (snapshot.empty) {
            return res.redirect('/');
        }
        
        const link = snapshot.docs[0].data();
        
        // Update click count
        await admin.firestore()
            .collection('links')
            .doc(snapshot.docs[0].id)
            .update({
                clicks: admin.firestore.FieldValue.increment(1)
            });
        
        // Redirect to original URL
        return res.redirect(link.originalUrl);
    } catch (error) {
        console.error('Error:', error);
        return res.redirect('/');
    }
});
