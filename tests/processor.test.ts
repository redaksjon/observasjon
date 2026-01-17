import { describe, expect, test, beforeAll, beforeEach, vi } from 'vitest';
import { ClassifiedTranscription } from '../src/processor';

// Variables to hold dynamically imported modules
let processorModule: any;

// Mock dependencies
const mockLogger = {
    debug: vi.fn(),
    verbose: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
};

vi.mock('../src/logging', () => ({
    getLogger: vi.fn().mockReturnValue(mockLogger)
}));

// Mock for TranscribePhase
// @ts-ignore
const mockTranscribe = vi.fn().mockResolvedValue({
    text: 'Test transcription',
    audioFileBasename: 'test-audio'
});

const mockTranscribeInstance = {
    transcribe: mockTranscribe
};

vi.mock('../src/phases/transcribe', () => ({
    create: vi.fn().mockReturnValue(mockTranscribeInstance)
}));

// Mock for ClassifyPhase
const mockClassify = vi.fn().mockResolvedValue({
    text: 'Test transcription',
    type: 'note',
    subject: 'Test subject'
});

const mockClassifyInstance = {
    classify: mockClassify
};

vi.mock('../src/phases/classify', () => ({
    create: vi.fn().mockReturnValue(mockClassifyInstance)
}));

// Mock for ComposePhase
const mockCompose = vi.fn().mockResolvedValue(undefined);

const mockComposeInstance = {
    compose: mockCompose
};

vi.mock('../src/phases/compose', () => ({
    create: vi.fn().mockReturnValue(mockComposeInstance)
}));

// Mock for LocatePhase
const mockLocateResult = {
    creationTime: new Date('2023-01-01T12:00:00Z'),
    outputPath: '/test/output/path',
    contextPath: '/test/output/path/.context',
    interimPath: '/test/output/path/.interim',
    transcriptionFilename: 'test-transcription.json',
    hash: 'test-hash-123'
};

const mockLocate = vi.fn().mockResolvedValue(mockLocateResult);

const mockLocateInstance = {
    locate: mockLocate
};

vi.mock('../src/phases/locate', () => ({
    create: vi.fn().mockReturnValue(mockLocateInstance)
}));

// Mock for CompletePhase
const mockComplete = vi.fn().mockResolvedValue('/test/processed/2023-1-1-test-hash-123-note-test-subject.mp3');

const mockCompleteInstance = {
    complete: mockComplete
};

vi.mock('../src/phases/complete', () => ({
    create: vi.fn().mockReturnValue(mockCompleteInstance)
}));

// Mock Dreadcabinet operator
const mockConstructFilename = vi.fn().mockResolvedValue('test-note-filename.md');

const mockOperator = {
    constructFilename: mockConstructFilename
};

// Config object
const mockConfig = {
    model: 'gpt-4o',
    transcriptionModel: 'whisper-1',
    processedDirectory: './processed',
    dryRun: false
};

// Load all dynamic imports before tests
beforeAll(async () => {
    processorModule = await import('../src/processor.js');
});

describe('Processor', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('process', () => {
        test('should process an audio file through all phases', async () => {
            // Create a processor instance
            const processor = processorModule.create(mockConfig, mockOperator);

            // Test file to process
            const testFile = '/path/to/test-audio.mp3';

            // Process the file
            await processor.process(testFile);

            // Verify locate phase was called with correct args
            expect(mockLocate).toHaveBeenCalledWith(testFile);

            // Verify transcribe phase was called with correct args
            expect(mockTranscribe).toHaveBeenCalledWith(
                mockLocateResult.creationTime,
                mockLocateResult.outputPath,
                mockLocateResult.contextPath,
                mockLocateResult.interimPath,
                mockLocateResult.transcriptionFilename,
                mockLocateResult.hash,
                testFile
            );

            // Verify classify phase was called with correct args
            expect(mockClassify).toHaveBeenCalledWith(
                mockLocateResult.creationTime,
                mockLocateResult.outputPath,
                mockLocateResult.contextPath,
                mockLocateResult.interimPath,
                'Test transcription', // text from mockTranscribe
                mockLocateResult.hash,
                'test-audio',
            );

            // Verify constructFilename was called
            expect(mockConstructFilename).toHaveBeenCalledWith(
                mockLocateResult.creationTime,
                'note', // type from mockClassify
                mockLocateResult.hash,
                { subject: 'Test subject' }
            );

            // Verify compose phase was called with correct args
            expect(mockCompose).toHaveBeenCalledWith(
                {
                    text: 'Test transcription',
                    type: 'note',
                    subject: 'Test subject'
                },
                mockLocateResult.outputPath,
                mockLocateResult.contextPath,
                mockLocateResult.interimPath,
                'test-note-filename.md',
                mockLocateResult.hash,
                mockLocateResult.creationTime,
                `${mockLocateResult.outputPath}/test-note-filename.md`
            );

            // Verify complete phase was called with correct args
            expect(mockComplete).toHaveBeenCalledWith(
                'note',
                'Test subject',
                mockLocateResult.hash,
                mockLocateResult.creationTime,
                testFile
            );

            // Verify logging
            expect(mockLogger.verbose).toHaveBeenCalledWith('Processing file %s', testFile);
            expect(mockLogger.debug).toHaveBeenCalledWith('Locating file %s', testFile);
            expect(mockLogger.debug).toHaveBeenCalledWith('Transcribing file %s', testFile);
            expect(mockLogger.debug).toHaveBeenCalledWith('Classifying transcription for file %s', testFile);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                'Composing Note %s in %s',
                'test-note-filename.md',
                mockLocateResult.outputPath
            );
            expect(mockLogger.debug).toHaveBeenCalledWith('Completing processing for %s', testFile);
            expect(mockLogger.info).toHaveBeenCalledWith('Processed file %s', testFile);
        });

        test('should handle errors from locate phase', async () => {
            // Setup locate to throw an error
            const testError = new Error('Locate error');
            mockLocate.mockRejectedValueOnce(testError);

            // Create a processor instance
            const processor = processorModule.create(mockConfig, mockOperator);

            // Process the file and expect it to throw
            await expect(processor.process('/path/to/test-audio.mp3')).rejects.toThrow('Locate error');

            // Verify other phases were not called
            expect(mockTranscribe).not.toHaveBeenCalled();
            expect(mockClassify).not.toHaveBeenCalled();
            expect(mockConstructFilename).not.toHaveBeenCalled();
            expect(mockCompose).not.toHaveBeenCalled();
        });

        test('should handle errors from transcribe phase', async () => {
            // Setup transcribe to throw an error
            const testError = new Error('Transcribe error');
            // @ts-ignore
            mockTranscribe.mockRejectedValueOnce(testError);

            // Create a processor instance
            const processor = processorModule.create(mockConfig, mockOperator);

            // Process the file and expect it to throw
            await expect(processor.process('/path/to/test-audio.mp3')).rejects.toThrow('Transcribe error');

            // Verify locate was called but classify and compose were not
            expect(mockLocate).toHaveBeenCalled();
            expect(mockClassify).not.toHaveBeenCalled();
            expect(mockConstructFilename).not.toHaveBeenCalled();
            expect(mockCompose).not.toHaveBeenCalled();
        });

        test('should handle errors from classify phase', async () => {
            // Setup classify to throw an error
            const testError = new Error('Classify error');
            mockClassify.mockRejectedValueOnce(testError);

            // Create a processor instance
            const processor = processorModule.create(mockConfig, mockOperator);

            // Process the file and expect it to throw
            await expect(processor.process('/path/to/test-audio.mp3')).rejects.toThrow('Classify error');

            // Verify locate and transcribe were called but compose was not
            expect(mockLocate).toHaveBeenCalled();
            expect(mockTranscribe).toHaveBeenCalled();
            expect(mockConstructFilename).not.toHaveBeenCalled();
            expect(mockCompose).not.toHaveBeenCalled();
        });

        test('should handle errors from compose phase', async () => {
            // Setup compose to throw an error
            const testError = new Error('Compose error');
            mockCompose.mockRejectedValueOnce(testError);

            // Create a processor instance
            const processor = processorModule.create(mockConfig, mockOperator);

            // Process the file and expect it to throw
            await expect(processor.process('/path/to/test-audio.mp3')).rejects.toThrow('Compose error');

            // Verify previous phases were called
            expect(mockLocate).toHaveBeenCalled();
            expect(mockTranscribe).toHaveBeenCalled();
            expect(mockClassify).toHaveBeenCalled();
            expect(mockConstructFilename).toHaveBeenCalled();
        });

        test('should handle errors from complete phase', async () => {
            // Setup complete to throw an error
            const testError = new Error('Complete error');
            mockComplete.mockRejectedValueOnce(testError);

            // Create a processor instance
            const processor = processorModule.create(mockConfig, mockOperator);

            // Process the file and expect it to throw
            await expect(processor.process('/path/to/test-audio.mp3')).rejects.toThrow('Complete error');

            // Verify previous phases were called
            expect(mockLocate).toHaveBeenCalled();
            expect(mockTranscribe).toHaveBeenCalled();
            expect(mockClassify).toHaveBeenCalled();
            expect(mockConstructFilename).toHaveBeenCalled();
            expect(mockCompose).toHaveBeenCalled();
        });
    });
});
