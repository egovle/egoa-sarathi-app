// src/lib/seed.ts
import { collection, addDoc, doc, setDoc, getDocs, query } from 'firebase/firestore';
import { db } from './firebase';

// NOTE: This seed function does NOT create users in Firebase Auth.
// It only creates profile documents. To remove existing demo users, you must do so
// from your Firebase Console in the Firestore Database section.
const vles: any[] = [];
const users: any[] = [];

// A list of common services to seed the database with.
const services = [
  { name: 'PAN Card Application', rate: 150, documents: ['Aadhaar Card', 'Photo', 'Signature'] },
  { name: 'Passport Application', rate: 1500, documents: ['Aadhaar Card', 'Birth Certificate', 'Photo'] },
  { name: 'Driving License', rate: 1200, documents: ['Aadhaar Card', 'Photo', 'Form 1'] },
  { name: 'Voter ID Card', rate: 50, documents: ['Aadhaar Card', 'Photo'] },
  { name: 'Aadhaar Card Update', rate: 100, documents: ['Existing Aadhaar', 'Proof of Change'] },
  { name: 'Birth Certificate', rate: 200, documents: ['Hospital Record', 'Parent IDs'] },
  { name: 'Death Certificate', rate: 200, documents: ['Hospital Record', 'ID of Deceased'] },
  { name: 'Marriage Certificate', rate: 500, documents: ['Aadhaar Cards', 'Wedding Photo'] },
  { name: 'Property Tax Payment', rate: 50, documents: ['Property ID', 'Last Receipt'] },
  { name: 'Water Bill Payment', rate: 20, documents: ['Consumer ID'] },
  { name: 'Electricity Bill Payment', rate: 20, documents: ['Consumer ID'] },
  { name: 'Gas Connection Booking', rate: 30, documents: ['Consumer ID'] },
  { name: 'Ration Card Services', rate: 100, documents: ['Aadhaar Card', 'Family Photo'] },
  { name: 'Income Certificate', rate: 120, documents: ['Aadhaar Card', 'Salary Slip'] },
  { name: 'Caste Certificate', rate: 120, documents: ['Aadhaar Card', "Father's Certificate"] },
  { name: 'Domicile Certificate', rate: 150, documents: ['Aadhaar Card', 'Proof of Residence'] },
];

export async function seedDatabase() {
    console.log('Starting to seed database...');

    if (vles.length > 0) {
        const vlePromises = vles.map(vle => {
            const docRef = doc(db, 'vles', vle.id);
            return setDoc(docRef, vle.data);
        });
        await Promise.all(vlePromises);
        console.log('VLE seeding complete.');
    }

    if (users.length > 0) {
        const userPromises = users.map(user => {
            const docRef = doc(db, 'users', user.id);
            return setDoc(docRef, user.data);
        });
        await Promise.all(userPromises);
        console.log('User seeding complete.');
    }

    if (services.length > 0) {
        const servicesCollectionRef = collection(db, 'services');
        const existingServicesSnapshot = await getDocs(query(servicesCollectionRef));

        if (existingServicesSnapshot.empty) {
            console.log('Seeding services...');
            const servicePromises = services.map(service => {
                return addDoc(servicesCollectionRef, service);
            });
            await Promise.all(servicePromises);
            console.log('Services seeding complete.');
        } else {
            console.log('Services collection already has data. Skipping service seeding.');
        }
    }
    
    if (vles.length === 0 && users.length === 0 && services.length === 0) {
         console.log('No seed data found. Skipping seeding.');
         return;
    }

    console.log('Database seeding finished.');
}
