// src/lib/seed.ts
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const vles: any[] = [
    // Demo VLEs removed to prevent re-seeding.
    // Please remove any existing demo users from your Firestore 'vles' collection manually.
];

const users: any[] = [
    // Demo users removed to prevent re-seeding.
];

// NOTE: This seed function does NOT create users in Firebase Auth.
// These are just profile documents. The corresponding users must be created via the registration form.
// This script is useful for setting up initial VLEs or admin users.
export async function seedDatabase() {
    console.log('Starting to seed database...');

    if (vles.length === 0 && users.length === 0) {
        console.log('No seed data found. Skipping seeding.');
        return;
    }

    const vlePromises = vles.map(vle => {
        const docRef = doc(db, 'vles', vle.id);
        return setDoc(docRef, vle.data);
    });

    const userPromises = users.map(user => {
        const docRef = doc(db, 'users', user.id);
        return setDoc(docRef, user.data);
    });

    await Promise.all([...vlePromises, ...userPromises]);

    console.log('Database seeding complete.');
}
