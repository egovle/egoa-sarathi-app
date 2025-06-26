'use server';

import { seedDatabase } from '@/lib/seed';
import { revalidatePath } from 'next/cache';

export async function handleSeedDatabase() {
    try {
        await seedDatabase();
        console.log('Database seeded successfully.');
        revalidatePath('/dashboard'); // Revalidate the dashboard page to show new data
        return { success: true, message: 'Database seeded successfully!' };
    } catch (error) {
        console.error('Error seeding database:', error);
        return { success: false, message: 'Failed to seed database.' };
    }
}
