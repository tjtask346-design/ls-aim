// Auth state observer
// Use globally available Firebase instances
const auth = window.auth;
const db = window.db;

// Check if Firebase is initialized
if (!auth || !db) {
    console.error("Firebase not initialized. Please check your configuration.");
    
    // Show error message to user
    document.addEventListener('DOMContentLoaded', function() {
        const authContainer = document.getElementById('authContainer');
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 50px;">
                    <h2>Configuration Error</h2>
                    <p>Firebase configuration is missing. Please check environment variables.</p>
                    <p>If you're the developer, make sure to set:</p>
                    <ul style="text-align: left; max-width: 400px; margin: 20px auto;">
                        <li>NEXT_PUBLIC_FIREBASE_API_KEY</li>
                        <li>NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN</li>
                        <li>NEXT_PUBLIC_FIREBASE_PROJECT_ID</li>
                        <li>NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET</li>
                        <li>NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID</li>
                        <li>NEXT_PUBLIC_FIREBASE_APP_ID</li>
                    </ul>
                </div>
            `;
        }
    });
}

// Rest of your existing app.js code...auth.onAuthStateChanged((user) => {
    if (user) {
        // User is signed in
        document.getElementById('authContainer').style.display = 'none';
        document.getElementById('appContainer').style.display = 'block';
        document.getElementById('userName').textContent = user.displayName || user.email.split('@')[0];
        loadUserLinks(user.uid);
    } else {
        // User is signed out
        document.getElementById('authContainer').style.display = 'block';
        document.getElementById('appContainer').style.display = 'none';
    }
});

// Auth Functions
function showSignup() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
}

function showLogin() {
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
}

function login() {
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    auth.signInWithEmailAndPassword(email, password)
        .catch((error) => {
            alert('Login failed: ' + error.message);
        });
}

function signup() {
    const name = document.getElementById('signupName').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    if (password.length < 6) {
        alert('Password must be at least 6 characters long');
        return;
    }
    
    auth.createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            // Update user profile with name
            return userCredential.user.updateProfile({
                displayName: name
            });
        })
        .then(() => {
            // Create user document in Firestore
            return db.collection('users').doc(auth.currentUser.uid).set({
                name: name,
                email: email,
                createdAt: new Date(),
                totalLinks: 0
            });
        })
        .catch((error) => {
            alert('Signup failed: ' + error.message);
        });
}

function logout() {
    auth.signOut();
}

// Generate random short code
function generateShortCode() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

// Create Short Link
async function createShortLink() {
    const user = auth.currentUser;
    if (!user) return;
    
    const originalUrl = document.getElementById('originalUrl').value;
    let alias = document.getElementById('alias').value.trim();
    const note = document.getElementById('note').value.trim();
    
    if (!originalUrl || !note) {
        alert('Please fill in all required fields');
        return;
    }
    
    // Validate URL
    try {
        new URL(originalUrl);
    } catch {
        alert('Please enter a valid URL');
        return;
    }
    
    // Generate short code
    const shortCode = alias || generateShortCode();
    
    // Check if alias already exists
    if (alias) {
        const existingLink = await db.collection('links').where('shortCode', '==', shortCode).get();
        if (!existingLink.empty) {
            alert('This alias is already taken. Please choose another one.');
            return;
        }
    }
    
    // Create link document
    const linkData = {
        userId: user.uid,
        originalUrl: originalUrl,
        shortCode: shortCode,
        note: note,
        clicks: 0,
        createdAt: new Date(),
        userName: user.displayName || user.email.split('@')[0]
    };
    
    try {
        await db.collection('links').add(linkData);
        
        // Update user's total links count
        const userRef = db.collection('users').doc(user.uid);
        userRef.update({
            totalLinks: firebase.firestore.FieldValue.increment(1)
        });
        
        // Clear form
        document.getElementById('originalUrl').value = '';
        document.getElementById('alias').value = '';
        document.getElementById('note').value = '';
        
        // Reload links
        loadUserLinks(user.uid);
        
        alert('Short link created successfully!');
    } catch (error) {
        alert('Error creating link: ' + error.message);
    }
}

// Load User Links
async function loadUserLinks(userId) {
    const linksList = document.getElementById('linksList');
    linksList.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading links...</div>';
    
    try {
        const snapshot = await db.collection('links')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        
        if (snapshot.empty) {
            linksList.innerHTML = '<div class="error">No links created yet. Create your first short link above!</div>';
            return;
        }
        
        linksList.innerHTML = '';
        snapshot.forEach(doc => {
            const link = doc.data();
            const linkElement = createLinkElement(doc.id, link);
            linksList.appendChild(linkElement);
        });
    } catch (error) {
        linksList.innerHTML = '<div class="error">Error loading links</div>';
        console.error(error);
    }
}

// Create Link Element
function createLinkElement(linkId, link) {
    const div = document.createElement('div');
    div.className = 'link-item';
    div.onclick = () => openLinkModal(linkId, link);
    
    const shortUrl = `${window.location.origin}/${link.shortCode}`;
    const date = link.createdAt.toDate ? link.createdAt.toDate().toLocaleDateString() : new Date(link.createdAt).toLocaleDateString();
    
    div.innerHTML = `
        <div class="link-header">
            <div class="link-note">${link.note}</div>
            <div class="link-date">${date}</div>
        </div>
        <div class="link-short">${shortUrl}</div>
        <div class="link-original">${link.originalUrl.substring(0, 60)}${link.originalUrl.length > 60 ? '...' : ''}</div>
        <div class="link-stats">
            <span><i class="fas fa-mouse-pointer"></i> ${link.clicks} clicks</span>
        </div>
    `;
    
    return div;
}

// Modal Functions
let currentLinkId = null;
let currentLinkData = null;

function openLinkModal(linkId, linkData) {
    currentLinkId = linkId;
    currentLinkData = linkData;
    
    const modal = document.getElementById('linkModal');
    const shortUrl = `${window.location.origin}/${linkData.shortCode}`;
    
    document.getElementById('modalTitle').textContent = linkData.note;
    document.getElementById('modalShortLink').value = shortUrl;
    document.getElementById('modalOriginalLink').textContent = linkData.originalUrl;
    document.getElementById('modalNote').textContent = linkData.note;
    document.getElementById('modalClicks').textContent = linkData.clicks;
    
    const date = linkData.createdAt.toDate ? linkData.createdAt.toDate().toLocaleString() : new Date(linkData.createdAt).toLocaleString();
    document.getElementById('modalCreated').textContent = date;
    
    // Generate QR Code
    const qrcodeDiv = document.getElementById('qrcode');
    qrcodeDiv.innerHTML = '';
    QRCode.toCanvas(qrcodeDiv, shortUrl, {
        width: 200,
        height: 200,
        margin: 1
    }, function (error) {
        if (error) console.error(error);
    });
    
    modal.style.display = 'block';
}

function closeModal() {
    document.getElementById('linkModal').style.display = 'none';
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    element.select();
    element.setSelectionRange(0, 99999);
    document.execCommand('copy');
    alert('Copied to clipboard!');
}

function visitLink() {
    if (currentLinkData) {
        // Increment click count
        db.collection('links').doc(currentLinkId).update({
            clicks: firebase.firestore.FieldValue.increment(1)
        });
        
        // Open link in new tab
        window.open(`${window.location.origin}/${currentLinkData.shortCode}`, '_blank');
        closeModal();
    }
}

async function deleteLink() {
    if (!confirm('Are you sure you want to delete this link?')) return;
    
    try {
        await db.collection('links').doc(currentLinkId).delete();
        
        // Update user's total links count
        const userRef = db.collection('users').doc(auth.currentUser.uid);
        userRef.update({
            totalLinks: firebase.firestore.FieldValue.increment(-1)
        });
        
        closeModal();
        loadUserLinks(auth.currentUser.uid);
        alert('Link deleted successfully!');
    } catch (error) {
        alert('Error deleting link: ' + error.message);
    }
}

function downloadQR() {
    const canvas = document.querySelector('#qrcode canvas');
    if (canvas) {
        const link = document.createElement('a');
        link.download = `${currentLinkData.shortCode}-qrcode.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('linkModal');
    if (event.target == modal) {
        closeModal();
    }
};
