
'use client';

import { useRef, useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Camera } from 'lucide-react';

export const CameraUploadDialog = ({ open, onOpenChange, onCapture }: { open: boolean, onOpenChange: (open: boolean) => void, onCapture: (file: File) => void }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        let stream: MediaStream | null = null;
        const getCameraPermission = async () => {
            if (!open) return;
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: true });
                setHasCameraPermission(true);
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (error) {
                console.error('Error accessing camera:', error);
                setHasCameraPermission(false);
                toast({
                    variant: 'destructive',
                    title: 'Camera Access Denied',
                    description: 'Please enable camera permissions in your browser settings.',
                });
            }
        };

        getCameraPermission();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
            if (videoRef.current) {
              videoRef.current.srcObject = null;
            }
        };
    }, [open, toast]);

    const handleCapture = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        if (context) {
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob((blob) => {
                if (blob) {
                    const fileName = `capture-${Date.now()}.jpg`;
                    const file = new File([blob], fileName, { type: 'image/jpeg' });
                    onCapture(file);
                    onOpenChange(false);
                }
            }, 'image/jpeg');
        }
    };
    
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Capture Document</DialogTitle>
                    <DialogDescription>Position your document in the frame and click capture.</DialogDescription>
                </DialogHeader>
                <div className="relative">
                    <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted" autoPlay muted playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {hasCameraPermission === false && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-md">
                           <Alert variant="destructive" className="w-auto">
                              <AlertTitle>Camera Access Required</AlertTitle>
                              <AlertDescription>
                                Please allow camera access to use this feature.
                              </AlertDescription>
                          </Alert>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleCapture} disabled={!hasCameraPermission}>
                        <Camera className="mr-2 h-4 w-4" /> Capture
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

    