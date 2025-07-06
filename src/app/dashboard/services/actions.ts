
'use server';

import { collection, addDoc, updateDoc, deleteDoc, doc, writeBatch, getDocs, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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
        
        return { success: true };
    } catch (error: any) {
        console.error("Error resetting data:", error);
        return { success: false, error: error.message };
    }
};

export async function seedDatabase() {
    try {
        const servicesRef = collection(db, "services");
        const deleteBatch = writeBatch(db);
        const existingServicesSnap = await getDocs(servicesRef);
        existingServicesSnap.forEach(doc => deleteBatch.delete(doc.ref));
        await deleteBatch.commit();

        const seedData = [
            {
                parent: { name: 'PAN Card Services', isVariable: false, customerRate: 0, vleRate: 0, governmentFee: 0, documentGroups: [] },
                children: [
                    { 
                        name: 'New PAN Card Application', isVariable: false, customerRate: 150, vleRate: 120, governmentFee: 107,
                        documentGroups: [
                            { key: 'identity_proof', label: 'Identity Proof', isOptional: false, minRequired: 1, type: 'documents', options: [{ key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }] },
                            { key: 'address_proof', label: 'Address Proof', isOptional: false, minRequired: 1, type: 'documents', options: [{ key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }] },
                            { key: 'birth_proof', label: 'Birth Proof', isOptional: false, minRequired: 1, type: 'documents', options: [{ key: 'birth_certificate', label: 'Birth Certificate', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }, { key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }] },
                        ]
                    },
                    { 
                        name: 'Correction in PAN Card', isVariable: false, customerRate: 150, vleRate: 120, governmentFee: 107,
                        documentGroups: [
                             { key: 'pan_card_copy', label: 'PAN Card Copy', isOptional: false, minRequired: 1, type: 'documents', options: [{ key: 'pan_card', label: 'PAN Card', type: 'document', isOptional: false, allowedFileTypes: ['pdf','jpg'] }] },
                             { key: 'supporting_document', label: 'Supporting Document', isOptional: false, minRequired: 1, type: 'documents', options: [{ key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }, { key: 'passport', label: 'Passport', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }] },
                        ]
                    }
                ]
            },
            {
                parent: { name: 'Passport Services', isVariable: false, customerRate: 0, vleRate: 0, governmentFee: 0, documentGroups: [] },
                children: [
                    { 
                        name: 'New Passport Application', isVariable: false, customerRate: 200, vleRate: 150, governmentFee: 1500,
                        documentGroups: [
                            { key: 'birth_proof', label: 'Birth Proof', isOptional: false, minRequired: 1, type: 'documents', options: [{ key: 'birth_certificate', label: 'Birth Certificate', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }] },
                            { key: 'address_proof', label: 'Address Proof', isOptional: false, minRequired: 1, type: 'documents', options: [{ key: 'aadhaar_card', label: 'Aadhaar Card', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }, { key: 'electricity_bill', label: 'Electricity Bill', type: 'document', isOptional: true, allowedFileTypes: ['pdf','jpg'] }] },
                        ]
                    }
                ]
            },
            {
                parent: { name: 'Variable Rate Service Example', isVariable: true, customerRate: 0, vleRate: 0, governmentFee: 0, documentGroups: [] },
                children: [
                    { 
                        name: 'Complex Legal Document Drafting', isVariable: true, customerRate: 0, vleRate: 0, governmentFee: 0,
                        documentGroups: [
                           { key: 'case_details', label: 'Case Details', isOptional: false, minRequired: 1, type: 'text', options: [{ key: 'case_summary', label: 'Case Summary', type: 'text', isOptional: false, placeholder: 'Briefly describe the legal matter.' }] },
                        ]
                    }
                ]
            }
        ];
        
        const addBatch = writeBatch(db);
        for (const category of seedData) {
            const parentRef = doc(collection(db, 'services'));
            addBatch.set(parentRef, { ...category.parent, parentId: null });

            for (const child of category.children) {
                const childRef = doc(collection(db, 'services'));
                addBatch.set(childRef, { ...child, parentId: parentRef.id });
            }
        }
        await addBatch.commit();
        
        return { success: true };
    } catch (error: any) {
        console.error("Error seeding database:", error);
        return { success: false, error: error.message };
    }
}
