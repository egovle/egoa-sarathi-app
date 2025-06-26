// src/lib/seed.ts
import { doc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const vles = [
    {
        id: 'vle-suresh-kumar',
        data: {
            name: "Suresh Kumar",
            location: "Panjim, Goa",
            status: "Approved",
            available: true,
            email: "suresh.k@example.com",
            mobile: "9988776655",
            walletBalance: 1000,
            bankAccounts: [],
            role: "vle",
            isAdmin: true,
        }
    },
    {
        id: 'vle-anjali-desai',
        data: {
            name: "Anjali Desai",
            location: "Margao, Goa",
            status: "Pending",
            available: false,
            email: "anjali.d@example.com",
            mobile: "9898989898",
            walletBalance: 0,
            bankAccounts: [],
            role: "vle",
            isAdmin: false,
        }
    }
];

const users = [
    {
        id: 'customer-ravi-sharma',
        data: {
            name: "Ravi Sharma",
            location: "Panjim, Goa",
            email: "ravi.sharma@example.com",
            mobile: "9876543210",
            walletBalance: 1000,
            bankAccounts: [],
            role: "customer",
        }
    },
     {
        id: 'customer-priya-naik',
        data: {
            name: "Priya Naik",
            location: "Vasco, Goa",
            email: "priya.n@example.com",
            mobile: "9123456789",
            walletBalance: 500,
            bankAccounts: [],
            role: "customer",
        }
    }
];

// NOTE: This seed function does NOT create users in Firebase Auth.
// These are just profile documents. The corresponding users must be created via the registration form.
// This script is useful for setting up initial VLEs or admin users.
export async function seedDatabase() {
    console.log('Starting to seed database...');

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
