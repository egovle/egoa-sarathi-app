// src/ai/flows/extract-service-request-info.ts
'use server';
/**
 * @fileOverview Extracts relevant information (required documents, skills needed) from special service requests or customer complaints using AI.
 *
 * - extractServiceRequestInfo - A function that handles the information extraction process.
 * - ExtractServiceRequestInfoInput - The input type for the extractServiceRequestInfo function.
 * - ExtractServiceRequestInfoOutput - The return type for the extractServiceRequestInfo function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExtractServiceRequestInfoInputSchema = z.object({
  requestText: z
    .string()
    .describe(
      'The text of the service request or customer complaint.'
    ),
});
export type ExtractServiceRequestInfoInput = z.infer<typeof ExtractServiceRequestInfoInputSchema>;

const ExtractServiceRequestInfoOutputSchema = z.object({
  requiredDocuments: z
    .array(z.string())
    .describe('A list of required documents for the service request.'),
  potentialVleSkills: z
    .array(z.string())
    .describe('A list of skills needed by the VLE to fulfill the service request.'),
});
export type ExtractServiceRequestInfoOutput = z.infer<typeof ExtractServiceRequestInfoOutputSchema>;

export async function extractServiceRequestInfo(input: ExtractServiceRequestInfoInput): Promise<ExtractServiceRequestInfoOutput> {
  return extractServiceRequestInfoFlow(input);
}

const prompt = ai.definePrompt({
  name: 'extractServiceRequestInfoPrompt',
  input: {schema: ExtractServiceRequestInfoInputSchema},
  output: {schema: ExtractServiceRequestInfoOutputSchema},
  prompt: `You are an AI assistant designed to extract relevant information from service requests or customer complaints.

  Given the following text, extract the required documents and potential VLE skills needed to fulfill the request.

  Text: {{{requestText}}}

  Format your response as a JSON object with "requiredDocuments" and "potentialVleSkills" fields.
  The "requiredDocuments" field should be a list of documents that are explicitly mentioned or strongly implied by the text.
  The "potentialVleSkills" field should be a list of skills that a VLE would need to possess to complete the task described in the text.
  Example:
  {
    "requiredDocuments": ["Aadhar card", "Property tax receipt"],
    "potentialVleSkills": ["Data entry", "Document verification", "Online form submission"]
  }
  `,
});

const extractServiceRequestInfoFlow = ai.defineFlow(
  {
    name: 'extractServiceRequestInfoFlow',
    inputSchema: ExtractServiceRequestInfoInputSchema,
    outputSchema: ExtractServiceRequestInfoOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
