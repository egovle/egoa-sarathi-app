
'use server';

import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { services as seedServices } from '@/lib/seed';
import type { Service } from '@/lib/types';

export async function addService(data: Omit<Service, 'id'>) {
    try {
        await addDoc(collection(db, "services"), data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateService(id: string, data: Partial<Omit<Service, 'id'>>) {
    try {
        const serviceRef = doc(db, "services", id);
        await updateDoc(serviceRef, data);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteService(id: string) {
    try {
        const batch = writeBatch(db);
        const serviceRef = doc(db, "services", id);
        
        // Find and delete all sub-services first to prevent orphans
        const childrenQuery = query(collection(db, "services"), where("parentId", "==", id));
        const childrenSnapshot = await getDocs(childrenQuery);
        childrenSnapshot.forEach(childDoc => {
            batch.delete(childDoc.ref);
        });

        // Delete the parent service
        batch.delete(serviceRef);

        await batch.commit();
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function seedDatabase() {
    try {
        const servicesCollectionRef = collection(db, 'services');
        const existingServicesSnapshot = await getDocs(query(servicesCollectionRef));

        const batch = writeBatch(db);
        existingServicesSnapshot.docs.forEach(doc => batch.delete(doc.ref));

        seedServices.forEach(service => {
            const { id, ...serviceData } = service;
            const docRef = id ? doc(db, "services", id) : doc(collection(db, "services"));
            batch.set(docRef, serviceData);
        });
        await batch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error seeding database:", error);
        return { success: false, error: error.message };
    }
};

export async function resetApplicationData() {
    const processInBatches = async (
        collectionRef: any,
        operation: 'delete' | 'update',
        updateData?: object
    ) => {
        const BATCH_SIZE = 499;
        const snapshot = await getDocs(query(collectionRef));
        if (snapshot.size === 0) return;

        let batch = writeBatch(db);
        let count = 0;

        for (const doc of snapshot.docs) {
            if (operation === 'delete') {
                batch.delete(doc.ref);
            } else if (operation === 'update' && updateData) {
                batch.update(doc.ref, updateData);
            }
            count++;
            if (count === BATCH_SIZE) {
                await batch.commit();
                batch = writeBatch(db);
                count = 0;
            }
        }
        if (count > 0) {
            await batch.commit();
        }
    };

    try {
        const collectionsToClear = ['tasks', 'camps', 'notifications', 'paymentRequests', 'services', 'campSuggestions', 'taskChats'];
        for (const collectionName of collectionsToClear) {
            await processInBatches(collection(db, collectionName), 'delete');
        }

        await processInBatches(collection(db, 'users'), 'update', { walletBalance: 0 });
        const vleCollection = collection(db, 'vles');
        const adminQuery = query(vleCollection, where("isAdmin", "==", true));
        const adminSnapshot = await getDocs(adminQuery);
        const adminId = adminSnapshot.docs.length > 0 ? adminSnapshot.docs[0].id : null;

        await processInBatches(vleCollection, 'update', { walletBalance: 0 }); 

        // After resetting VLEs, if an admin was found, ensure their balance is reset too.
        // This is a safeguard in case the batch update misses it or runs into edge cases.
        if(adminId){
            const adminRef = doc(db, 'vles', adminId);
            const adminDoc = await getDoc(adminRef);
            if(adminDoc.exists() && adminDoc.data().walletBalance !== 0){
                await updateDoc(adminRef, { walletBalance: 0 });
            }
        }


        let seedBatch = writeBatch(db);
        seedServices.forEach(service => {
            const docRef = service.id ? doc(db, "services", service.id) : doc(collection(db, "services"));
            const { id, ...serviceData } = service;
            seedBatch.set(docRef, serviceData);
        });
        await seedBatch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error resetting data:", error);
        return { success: false, error: error.message };
    }
};
