// src/config/firebase-admin.config.ts
import * as admin from 'firebase-admin';
import * as path from 'path';
import * as fs from 'fs';

const serviceAccountPath = path.join(
  __dirname,
  '../../firebase-admin-key.json',
);

if (!admin.apps.length) {
  const serviceAccount = JSON.parse(
    fs.readFileSync(serviceAccountPath, 'utf8'),
  );

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

export default admin;
