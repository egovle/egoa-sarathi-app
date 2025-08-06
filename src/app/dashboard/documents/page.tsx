'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Loader2, FileText, HardDriveUpload } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Task, TaskDocument } from '@/lib/types';

export default function DocumentVaultPage() {
    const { user, userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const [documents, setDocuments] = useState<TaskDocument[]>([]);
    const [loadingData, setLoadingData] = useState(true);

    useEffect(() => {
        if (!authLoading && (!user || userProfile?.role !== 'customer')) {
            router.push('/dashboard');
        }
    }, [user, userProfile, authLoading, router]);

    useEffect(() => {
        if (!user) return;

        const fetchDocuments = async () => {
            setLoadingData(true);
            const tasksQuery = query(collection(db, "tasks"), where("creatorId", "==", user.uid));
            const tasksSnapshot = await getDocs(tasksQuery);
            
            const allDocs: TaskDocument[] = [];
            tasksSnapshot.forEach(doc => {
                const task = doc.data() as Task;
                if (task.documents) {
                    allDocs.push(...task.documents);
                }
            });

            // Filter for unique documents based on their name and URL
            const uniqueDocs = Array.from(new Map(allDocs.map(doc => [`${doc.name}-${doc.url}`, doc])).values());
            
            setDocuments(uniqueDocs);
            setLoadingData(false);
        };

        fetchDocuments();
    }, [user]);

    if (authLoading || loadingData) {
        return (
            <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <HardDriveUpload /> My Document Vault
                </CardTitle>
                <CardDescription>
                    A central place for all documents you've uploaded across your service requests.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {documents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {documents.map((doc, index) => (
                             <a 
                                key={index}
                                href={doc.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="block group"
                             >
                                <Card className="hover:bg-muted/50 hover:shadow-md transition-all">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <FileText className="h-8 w-8 text-primary" />
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-medium truncate group-hover:underline">{doc.name}</p>
                                            <p className="text-xs text-muted-foreground">{doc.optionKey.replace(/_/g, ' ')}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </a>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <p className="text-muted-foreground">You haven't uploaded any documents yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
