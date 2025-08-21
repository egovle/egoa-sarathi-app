'use client';

import { redirect } from 'next/navigation';

export default function GovernmentDashboard() {
    redirect('/dashboard/camps');
    // The redirect function throws an error to stop rendering and redirect the user.
    // Therefore, this component will never actually render anything.
    // Returning null satisfies TypeScript's requirement for a valid JSX element type.
    return null;
};
