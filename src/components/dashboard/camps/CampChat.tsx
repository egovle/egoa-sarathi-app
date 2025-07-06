'use client';

import { useEffect, useState, type FormEvent, useRef } from 'react';
import { collection, onSnapshot, addDoc, query, orderBy, serverTimestamp, getDocs, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { createNotification } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, Send } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import type { Camp, UserProfile, User } from '@/lib/types';

export const CampChat = ({ camp, user, userProfile }: { camp: Camp, user: User, userProfile: UserProfile }) => {
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const { toast } = useToast();

    useEffect(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
        }
    }, [messages]);

    useEffect(() => {
        const messagesRef = collection(db, `campChats/${camp.id}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const newMessages = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(newMessages);
        });

        return () => unsubscribe();
    }, [camp.id]);

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !user) return;
        setIsSending(true);

        const messageData = {
            text: newMessage.trim(),
            senderId: user.uid,
            senderName: userProfile.name,
            senderRole: userProfile.isAdmin ? 'Admin' : userProfile.role,
            timestamp: serverTimestamp(),
        };

        try {
            await addDoc(collection(db, `campChats/${camp.id}/messages`), messageData);
            setNewMessage('');
            
            const adminsQuery = query(collection(db, "vles"), where("isAdmin", "==", true));
            const adminSnapshot = await getDocs(adminsQuery);
            const adminIds = adminSnapshot.docs.map(doc => doc.id);

            const confirmedVleIds = camp.assignedVles
                .filter(v => v.status === 'accepted')
                .map(v => v.vleId);
            
            const participantIds = new Set([...adminIds, ...confirmedVleIds].filter(id => id && id !== user.uid));

            for (const id of participantIds) {
                await createNotification(
                    id,
                    `New message in Camp: ${camp.name}`,
                    `${userProfile.name}: "${newMessage.trim()}"`,
                    `/dashboard/camps`
                );
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast({ title: "Error", description: "Could not send message.", variant: "destructive" });
        } finally {
            setIsSending(false);
        }
    };
    
    return (
        <Card className="flex flex-col h-full">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Camp Chat</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden">
                <div ref={scrollContainerRef} className="h-full overflow-y-auto space-y-4 pr-2 flex flex-col">
                    {messages.length > 0 ? (
                        messages.map(msg => (
                            <div key={msg.id} className={cn("flex flex-col", msg.senderId === user.uid ? "items-end" : "items-start")}>
                                <div className={cn("p-2 rounded-lg max-w-xs md:max-w-md", msg.senderId === user.uid ? "bg-primary text-primary-foreground" : "bg-muted")}>
                                    <p className="font-bold text-xs capitalize">{msg.senderName} ({msg.senderRole})</p>
                                    <p className="text-sm break-words">{msg.text}</p>
                                    {msg.timestamp && (
                                        <p className="text-xs opacity-70 mt-1 text-right">
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
            </CardContent>
            <CardFooter>
                <form onSubmit={handleSendMessage} className="flex w-full items-center gap-2">
                    <Textarea
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type a message..."
                        rows={1}
                        className="flex-1 resize-none"
                        disabled={isSending}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSendMessage(e);
                            }
                        }}
                    />
                    <Button type="submit" size="icon" disabled={isSending || !newMessage.trim()}>
                        {isSending ? <Loader2 className="animate-spin" /> : <Send />}
                    </Button>
                </form>
            </CardFooter>
        </Card>
    );
};
