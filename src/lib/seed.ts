// src/lib/seed.ts
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

// This file is for seeding initial data into your Firestore database.
// The arrays below are empty to prevent adding unwanted demo data.
// NOTE: This seed function does NOT create users in Firebase Auth.
// It only creates profile documents. To remove existing demo users, you must do so
// from your Firebase Console in the Firestore Database section.

const vles: any[] = [];

const users: any[] = [];

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
