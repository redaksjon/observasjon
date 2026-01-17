import { Chat, Formatter } from '@riotprompt/riotprompt';
import { ChatCompletionMessageParam } from 'openai/resources';
import path from 'path';
import * as Logging from '@/logging';
import { Config } from '@/observasjon';
import { ClassifiedTranscription } from '@/processor';
import * as Prompt from '@/prompt/prompts';
import { stringifyJSON } from '@/util/general';
import * as OpenAI from '@/util/openai';
import * as Storage from '@/util/storage';
// Helper function to promisify ffmpeg.

export interface Instance {
    compose: (transcription: ClassifiedTranscription, outputPath: string, contextPath: string, interimPath: string, filename: string, hash: string, creationTime: Date, destinationPath: string) => Promise<any>;
}

export const create = (config: Config): Instance => {
    const logger = Logging.getLogger();
    const storage = Storage.create({ log: logger.debug });
    const prompts = Prompt.create(config.composeModel as Chat.Model, config);

    const formatDate = (date: Date): string => {
        return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTime = (date: Date): string => {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const generateMetadata = (transcription: ClassifiedTranscription, creationTime: Date, destinationPath: string): string => {
        const metadata: string[] = ['## Metadata', ''];
        
        metadata.push(`**Date**: ${formatDate(creationTime)}`);
        metadata.push(`**Time**: ${formatTime(creationTime)}`);
        metadata.push('');

        // Add project information if available
        if (transcription.project) {
            metadata.push(`**Project**: ${transcription.project}`);
            metadata.push(`**Project ID**: \`${transcription.project}\``);
            metadata.push('');
        }

        // Add routing information
        metadata.push('### Routing');
        metadata.push('');
        metadata.push(`**Destination**: ${destinationPath}`);
        
        if (transcription.confidence !== undefined) {
            metadata.push(`**Confidence**: ${(transcription.confidence * 100).toFixed(1)}%`);
        }
        
        // Add classification signals if available
        if (transcription.classificationSignals && transcription.classificationSignals.length > 0) {
            metadata.push('');
            metadata.push('**Classification Signals**:');
            transcription.classificationSignals.forEach((signal: any) => {
                metadata.push(`- ${signal.type}: "${signal.value}" (${signal.weight}% weight)`);
            });
        }

        // Add reasoning if available
        if (transcription.reasoning) {
            metadata.push('');
            metadata.push(`**Reasoning**: ${transcription.reasoning}`);
        }

        // Add tags if available
        if (transcription.tags && transcription.tags.length > 0) {
            metadata.push('');
            metadata.push(`**Tags**: ${transcription.tags.map((tag: string) => `\`${tag}\``).join(', ')}`);
        }

        metadata.push('');
        return metadata.join('\n');
    };

    const compose = async (transcription: ClassifiedTranscription, outputPath: string, contextPath: string, interimPath: string, filename: string, hash: string, creationTime: Date, destinationPath: string): Promise<any> => {
        // Look for a file in the outputPath that contains the hash and has a .json extension - let me be clear, the file name might have a lot of other stuff.  I need you to look for any filename that has that hash value in it.  Could you use a regexp?
        const files = await storage.listFiles(outputPath);
        const baseFilename = path.basename(filename);
        const matchingFiles = files.filter((file: string) => file.includes(baseFilename) && file.endsWith('.md'));
        if (matchingFiles.length > 0) {
            logger.info('Transcribed Note file %s already exists, skipping', matchingFiles[0]);
            return;
        }

        // Check to see if the Note already exists...
        const noteOutputPath = path.join(outputPath, baseFilename + '.md');
        logger.debug('Checking if output file %s exists', noteOutputPath);
        if (await storage.exists(noteOutputPath)) {
            logger.info('Output file %s already exists, returning existing content...', noteOutputPath);
            const existingContent = await storage.readFile(noteOutputPath, 'utf8');
            return existingContent;
        }

        const formatter = Formatter.create();
        const chatRequest: Chat.Request = formatter.formatPrompt(config.composeModel as Chat.Model, await prompts.createComposePrompt(transcription, transcription.type));

        const requestOutputPath = path.join(interimPath, baseFilename + '.request.json');
        await storage.writeFile(requestOutputPath, stringifyJSON(chatRequest), 'utf8');
        logger.debug('Wrote chat request to %s', requestOutputPath);

        const debugResponsePath = config.debug ? path.join(interimPath, baseFilename + '.response.json') : undefined;
        const noteCompletion: string = await OpenAI.createCompletion(chatRequest.messages as ChatCompletionMessageParam[], { model: config.model, debug: config.debug, debugFile: debugResponsePath });

        // Generate metadata header and prepend to the note
        const metadata = generateMetadata(transcription, creationTime, destinationPath);
        const noteWithMetadata = `${metadata}\n${noteCompletion}`;

        await storage.writeFile(noteOutputPath, Buffer.from(noteWithMetadata, 'utf8'), 'utf8');
        logger.debug('Wrote note with metadata to %s', noteOutputPath);

        return noteWithMetadata;
    }

    return {
        compose,
    }
}


