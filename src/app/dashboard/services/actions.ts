
'use server';

import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
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
        await deleteDoc(doc(db, "services", id));
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
