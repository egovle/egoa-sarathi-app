'use server';

import { revalidatePath } from 'next/cache';
import { seedDatabase } from '@/lib/seed';

export async function handleSeedDatabase() {
  try {
    await seedDatabase();
    revalidatePath('/');
  } catch (error) {
    console.error('Error seeding database:', error);
    // This will be caught by the form's error handling
    throw new Error('Failed to seed database.');
  }
}
