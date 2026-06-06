import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'vendor-assist-secret-key-12345';

// Cache Google public certs
let googleCerts = null;
let googleCertsExpiry = 0;

async function getGoogleCerts() {
  const now = Date.now();
  if (googleCerts && now < googleCertsExpiry) {
    return googleCerts;
  }

  try {
    const res = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
    const certs = await res.json();
    googleCerts = certs;
    googleCertsExpiry = now + 3600 * 1000; // Cache for 1 hour
    return certs;
  } catch (error) {
    console.error('Failed to fetch Google public certs:', error);
    throw new Error('Failed to verify Google authentication: could not fetch public certificates');
  }
}

export async function verifyToken(authHeader) {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('No token provided');
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    throw new Error('Malformed token');
  }

  // Decode to determine type
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.payload) {
    throw new Error('Invalid token format');
  }

  const isFirebaseToken = decoded.payload.iss && decoded.payload.iss.startsWith('https://securetoken.google.com/');

  if (isFirebaseToken) {
    const projectId = process.env.FIREBASE_PROJECT_ID || decoded.payload.aud;
    const expectedIss = `https://securetoken.google.com/${projectId}`;
    
    if (decoded.payload.aud !== projectId) {
      throw new Error(`Firebase token audience mismatch: expected ${projectId}, got ${decoded.payload.aud}`);
    }
    if (decoded.payload.iss !== expectedIss) {
      throw new Error(`Firebase token issuer mismatch`);
    }

    const kid = decoded.header.kid;
    const certs = await getGoogleCerts();
    const cert = certs[kid];
    if (!cert) {
      throw new Error('Google certificate not found for token key ID');
    }

    return new Promise((resolve, reject) => {
      jwt.verify(token, cert, { algorithms: ['RS256'] }, (err, verifiedToken) => {
        if (err) {
          return reject(new Error('Firebase token verification failed: ' + err.message));
        }
        resolve({
          userId: verifiedToken.sub,
          email: verifiedToken.email,
          authType: 'google'
        });
      });
    });
  } else {
    // Local JWT
    return new Promise((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, verifiedToken) => {
        if (err) {
          return reject(new Error('Local JWT verification failed: ' + err.message));
        }
        resolve({
          userId: verifiedToken.userId,
          email: verifiedToken.email,
          authType: 'local'
        });
      });
    });
  }
}
