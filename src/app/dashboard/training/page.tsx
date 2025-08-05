
'use client';

import { useState, useEffect, type FormEvent, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, orderBy, addDoc, serverTimestamp, deleteDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, PlusCircle, Trash, Link as LinkIcon, Upload, Download, ExternalLink, FileText, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { validateFiles } from '@/lib/utils';
import type { TrainingMaterial, UserProfile } from '@/lib/types';


const UploadMaterialDialog = ({ userProfile, onUploadFinished }: { userProfile: UserProfile, onUploadFinished: () => void }) => {
    const { toast } = useToast();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [file, setFile] = useState<File | null>(null);
    const [link, setLink] = useState('');
    const [loading, setLoading] = useState(false);
    const [open, setOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!title.trim() || !description.trim()) {
            toast({ title: "Missing Information", description: "Title and description are required.", variant: "destructive" });
            setLoading(false);
            return;
        }

        try {
            let fileUrl: string | undefined = undefined;
            let fileName: string | undefined = undefined;

            if (file) {
                const storageRef = ref(storage, `training_materials/${Date.now()}_${file.name}`);
                await uploadBytes(storageRef, file);
                fileUrl = await getDownloadURL(storageRef);
                fileName = file.name;
            }

            const materialData: Partial<TrainingMaterial> = {
                title,
                description,
                type: file ? 'file' : 'link', // Prioritize file if both are present
                url: fileUrl || link, // Use fileUrl if it exists, otherwise use the link
                fileName,
                createdAt: new Date().toISOString(),
                createdBy: userProfile.id,
            };

            await addDoc(collection(db, 'trainingMaterials'), materialData);
            toast({ title: 'Material Added', description: 'The training material has been successfully added.' });
            onUploadFinished();
            setOpen(false); 
            setTitle('');
            setDescription('');
            setFile(null);
            setLink('');

        } catch (error: any) {
            console.error("Error adding material:", error);
            toast({ title: "Error", description: "Could not add material. Please try again.", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const uploadedFile = e.target.files[0];
            const validation = validateFiles([uploadedFile]);
            if (!validation.isValid) {
                toast({ title: 'Validation Error', description: validation.message, variant: 'destructive' });
                return;
            }
            setFile(uploadedFile);
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><PlusCircle className="mr-2 h-4 w-4" /> Add New Material</Button>
            </DialogTrigger>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add Training Material</DialogTitle>
                         <DialogDescription>
                            Provide a title, description, and optionally a file or an external link.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required />
                        </div>
                         <div className="space-y-2">
                            <Label htmlFor="file-upload">File (Optional)</Label>
                            <Button type="button" variant="outline" className="w-full justify-start text-muted-foreground" onClick={() => fileInputRef.current?.click()}>
                                <UploadCloud className="mr-2 h-4 w-4"/>
                                {file ? <span className="text-foreground">{file.name}</span> : 'Choose File'}
                            </Button>
                            <Input id="file-upload" type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden"/>
                         </div>
                         <div className="space-y-2">
                            <Label htmlFor="link">URL (Optional)</Label>
                            <Input id="link" type="url" placeholder="e.g., https://youtube.com/watch?v=..." value={link} onChange={(e) => setLink(e.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload />}
                            Add Material
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default function TrainingPage() {
    const { userProfile, loading: authLoading } = useAuth();
    const router = useRouter();
    const { toast } = useToast();

    const [materials, setMaterials] = useState<TrainingMaterial[]>([]);
    const [loadingData, setLoadingData] = useState(true);
    
    useEffect(() => {
        if (!authLoading && (!userProfile || (userProfile.role !== 'admin' && userProfile.role !== 'vle'))) {
            router.push('/dashboard');
        }
    }, [userProfile, authLoading, router]);

    useEffect(() => {
        const materialsQuery = query(collection(db, "trainingMaterials"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(materialsQuery, (snapshot) => {
            setMaterials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as TrainingMaterial));
            setLoadingData(false);
        });
        return () => unsubscribe();
    }, []);

    const handleDelete = async (material: TrainingMaterial) => {
        if (!window.confirm(`Are you sure you want to delete "${material.title}"?`)) return;

        try {
            await deleteDoc(doc(db, "trainingMaterials", material.id));
            if (material.type === 'file' && material.url) {
                const fileRef = ref(storage, material.url);
                await deleteObject(fileRef);
            }
            toast({ title: 'Material Deleted', description: `${material.title} has been removed.` });
        } catch (error: any) {
             toast({ title: 'Error Deleting', description: "Could not delete material.", variant: 'destructive' });
             console.error("Error deleting material:", error);
        }
    };
    
    if (authLoading || loadingData || !userProfile) {
        return <div className="flex justify-center items-center h-[calc(100vh-10rem)]"><Loader2 className="h-8 w-8 animate-spin" /></div>;
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Training & Help Center</CardTitle>
                        <CardDescription>
                            {userProfile.isAdmin ? "Manage and upload training materials for VLEs." : "Find guides and resources to help you complete services."}
                        </CardDescription>
                    </div>
                    {userProfile.isAdmin && <UploadMaterialDialog userProfile={userProfile} onUploadFinished={() => {}} />}
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Title</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Date Added</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials.length > 0 ? materials.map(material => (
                            <TableRow key={material.id}>
                                <TableCell className="font-medium">{material.title}</TableCell>
                                <TableCell className="capitalize flex items-center gap-2">
                                    {material.type === 'file' ? <FileText className="h-4 w-4 text-muted-foreground"/> : <LinkIcon className="h-4 w-4 text-muted-foreground" />}
                                    {material.type}
                                </TableCell>
                                <TableCell className="text-muted-foreground max-w-sm">{material.description}</TableCell>
                                <TableCell>{format(new Date(material.createdAt), 'dd MMM yyyy')}</TableCell>
                                <TableCell className="text-right space-x-2">
                                     <Button asChild variant="outline" size="sm" disabled={!material.url}>
                                        <a href={material.url} target="_blank" rel="noopener noreferrer">
                                            {material.type === 'file' ? <Download className="mr-2 h-4 w-4"/> : <ExternalLink className="mr-2 h-4 w-4" />}
                                            {material.type === 'file' ? 'Download' : 'Open Link'}
                                        </a>
                                    </Button>
                                    {userProfile.isAdmin && (
                                        <Button size="sm" variant="destructive" onClick={() => handleDelete(material)}>
                                            <Trash className="mr-2 h-4 w-4" /> Delete
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">No training materials found.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}
