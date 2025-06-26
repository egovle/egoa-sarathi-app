'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Wand2, ArrowLeft } from 'lucide-react';
import { extractServiceRequestInfo, type ExtractServiceRequestInfoOutput } from '@/ai/flows/extract-service-request-info';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';

export default function SmartExtractorPage() {
  const { toast } = useToast();
  const [requestText, setRequestText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ExtractServiceRequestInfoOutput | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!requestText.trim()) {
      toast({
        title: 'Input Required',
        description: 'Please enter the service request text.',
        variant: 'destructive',
      });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const output = await extractServiceRequestInfo({ requestText });
      setResult(output);
    } catch (error) {
      console.error(error);
      toast({
        title: 'Error',
        description: 'Failed to extract information. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
        <div className="flex items-center gap-4 mb-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/dashboard">
                    <ArrowLeft className="h-4 w-4" />
                    <span className="sr-only">Back</span>
                </Link>
            </Button>
            <h1 className="font-semibold text-lg md:text-2xl">Smart Information Extractor</h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <form onSubmit={handleSubmit}>
                <Card>
                    <CardHeader>
                    <CardTitle>Special Service Request</CardTitle>
                    <CardDescription>
                        Enter the text of a special service request or customer complaint. The AI will extract key information.
                    </CardDescription>
                    </CardHeader>
                    <CardContent>
                    <div className="grid gap-2">
                        <Label htmlFor="request-text">Request Text</Label>
                        <Textarea
                        id="request-text"
                        placeholder="e.g., I need to get a new PAN card made for my son who just turned 18. I have his Aadhar card and birth certificate..."
                        rows={10}
                        value={requestText}
                        onChange={(e) => setRequestText(e.target.value)}
                        disabled={loading}
                        />
                    </div>
                    </CardContent>
                    <CardFooter>
                    <Button type="submit" disabled={loading}>
                        {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                        <Wand2 className="mr-2 h-4 w-4" />
                        )}
                        Extract Information
                    </Button>
                    </CardFooter>
                </Card>
            </form>

            <Card className="flex flex-col">
                <CardHeader>
                    <CardTitle>Extracted Information</CardTitle>
                    <CardDescription>
                        Documents and skills identified by the AI.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                    {loading && (
                        <div className="flex items-center justify-center h-full">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    )}
                    {!loading && !result && (
                        <div className="flex items-center justify-center text-center h-full p-8">
                            <p className="text-muted-foreground">Results will be displayed here.</p>
                        </div>
                    )}
                    {result && (
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-semibold mb-2">Required Documents</h4>
                                <div className="flex flex-wrap gap-2">
                                    {result.requiredDocuments.length > 0 ? (
                                        result.requiredDocuments.map((doc, i) => <Badge key={i}>{doc}</Badge>)
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No documents identified.</p>
                                    )}
                                </div>
                            </div>
                            <div className="border-t my-4"></div>
                            <div>
                                <h4 className="font-semibold mb-2">Potential VLE Skills</h4>
                                <div className="flex flex-wrap gap-2">
                                {result.potentialVleSkills.length > 0 ? (
                                        result.potentialVleSkills.map((skill, i) => <Badge variant="secondary" key={i}>{skill}</Badge>)
                                    ) : (
                                        <p className="text-sm text-muted-foreground">No skills identified.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
