
'use client';

import { useEffect, useState, type FormEvent, useRef, type ChangeEvent } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { createNotification } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Send, Paperclip, FileText, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { validateFiles } from '@/lib/utils';
import type { UserProfile, User, GroupChatMessage } from '@/lib/types';


export const GroupChat = ({ user, userProfile }: { user: User, userProfile: UserProfile }) => {
    const [messages, setMessages] = useState<GroupChatMessage[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [fileToUpload, setFileToUpload] = useState<File | null>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const messagesRef = collection(db, `groupChats/mainRoom/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as GroupChatMessage);
            setMessages(newMessages);
        });

        return () => unsubscribe();
    }, []);

    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const validation = validateFiles([file]);
            if (!validation.isValid) {
                toast({
                    title: "Invalid File",
                    description: validation.message,
                    variant: "destructive"
                });
                return;
            }
            setFileToUpload(file);
        }
    };
    
    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() && !fileToUpload) return;
        setIsSending(true);

        try {
            const messageData: Partial<Omit<GroupChatMessage, 'id'>> = {
                senderId: user.uid,
                senderName: userProfile.name,
                senderRole: userProfile.isAdmin ? 'Admin' : 'VLE',
                timestamp: serverTimestamp(),
            };

            let notificationText = '';

            if (fileToUpload) {
                const storageRef = ref(storage, `group_chat_files/${Date.now()}_${fileToUpload.name}`);
                await uploadBytes(storageRef, fileToUpload);
                const downloadURL = await getDownloadURL(storageRef);
                messageData.fileUrl = downloadURL;
                messageData.fileName = fileToUpload.name;
                notificationText = `Sent a file: ${fileToUpload.name}`;
            }

            if (newMessage.trim()) {
                messageData.text = newMessage.trim();
                notificationText = newMessage.trim();
            }

            await addDoc(collection(db, `groupChats/mainRoom/messages`), messageData);
            
            setNewMessage('');
            setFileToUpload(null);
            if(fileInputRef.current) fileInputRef.current.value = "";
            
            const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true));
            const vlesQuery = query(collection(db, "vles"), where("isAdmin", "==", false));
            
            const [adminSnapshot, vleSnapshot] = await Promise.all([getDocs(adminsQuery), getDocs(vlesQuery)]);
            const adminIds = adminSnapshot.docs.map(doc => doc.id);
            const vleIds = vleSnapshot.docs.map(doc => doc.id);

            const participantIds = new Set([...adminIds, ...vleIds].filter(id => id && id !== user.uid));
            
            for (const id of participantIds) {
                await createNotification(
                    id,
                    `New message in Group Chat`,
                    `${userProfile.name}: "${notificationText}"`,
                    `/dashboard/group-chat`
                );
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };
    
    const getDisplayName = (message: GroupChatMessage) => {
        if (userProfile.isAdmin || message.senderId === user.uid) {
            return `${message.senderName} (${message.senderRole})`;
        }
        if (message.senderRole === 'Admin') {
            return `${message.senderName} (Admin)`;
        }
        return `VLE (ID: ${message.senderId.slice(-6).toUpperCase()})`;
    }

    return (
        <div className="flex flex-col h-[65vh]">
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto space-y-4 p-4 pr-2 bg-muted/30 rounded-t-lg">
                {messages.length > 0 ? (
                    messages.map(msg => (
                        <div key={msg.id} className={cn("flex flex-col", msg.senderId === user.uid ? "items-end" : "items-start")}>
                            <div className={cn("p-3 rounded-lg max-w-sm md:max-w-md", msg.senderId === user.uid ? "bg-primary text-primary-foreground" : "bg-card border")}>
                                <p className="font-bold text-xs capitalize">{getDisplayName(msg)}</p>
                                {msg.text && <p className="text-sm break-words mt-1">{msg.text}</p>}
                                {msg.fileUrl && (
                                    <a 
                                        href={msg.fileUrl} 
                                        target="_blank" 
                                        rel="noopener noreferrer" 
                                        className="mt-2 flex items-center gap-2 p-2 rounded-md bg-background/20 hover:bg-background/40 transition-colors"
                                    >
                                        <FileText className="h-5 w-5 shrink-0" />
                                        <span className="text-sm font-medium truncate">{msg.fileName}</span>
                                        <Download className="h-4 w-4 ml-auto" />
                                    </a>
                                )}
                                {msg.timestamp && (
                                    <p className="text-xs opacity-70 mt-2 text-right">
                                        {formatDistanceToNow(msg.timestamp.toDate(), { addSuffix: true })}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                        No messages yet. Start the conversation!
                    </div>
                )}
            </div>
            <div className="p-4 border-t bg-background rounded-b-lg">
                 {fileToUpload && (
                    <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground p-2 bg-muted rounded-md">
                        <FileText className="h-4 w-4"/>
                        <span className="truncate">{fileToUpload.name}</span>
                        <Button 
                            type="button" 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 ml-auto"
                            onClick={() => {
                                setFileToUpload(null);
                                if(fileInputRef.current) fileInputRef.current.value = "";
                            }}
                        >
                            <span className="sr-only">Remove file</span> &times;
                        </Button>
                    </div>
                )}
                <form onSubmit={handleSendMessage} className="flex w-full items-start gap-2">
                    <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 resize-none max-h-24"
                        disabled={isSending}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                    <Button type="button" variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                        <Paperclip />
                    </Button>
                    <Button type="submit" size="icon" disabled={isSending || (!newMessage.trim() && !fileToUpload)}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </form>
            </div>
        </div>
    );
};

    