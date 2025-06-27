
'use server';

import { db } from "@/lib/firebase";
import { addDoc, collection, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { revalidatePath } from "next/cache";

export async function addService(data: { name: string; rate: number; documents: string[] }) {
    try {
        await addDoc(collection(db, "services"), data);
        revalidatePath('/dashboard/services');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateService(id: string, data: { name: string; rate: number; documents: string[] }) {
    try {
        const serviceRef = doc(db, "services", id);
        await updateDoc(serviceRef, data);
        revalidatePath('/dashboard/services');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteService(id: string) {
    try {
        await deleteDoc(doc(db, "services", id));
        revalidatePath('/dashboard/services');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
