import { describe, expect, test, beforeEach, vi } from 'vitest';
import { ChatCompletionMessageParam } from 'openai/resources';

// Mock Dreadcabinet module
vi.mock('@theunwalked/dreadcabinet', () => ({
    Operator: {}
}));

// Set up mock implementations before importing modules
const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
};

// Define mock functions with type assertions
// @ts-ignore
const mockReadFile = vi.fn().mockResolvedValue('Existing note content');
// @ts-ignore
const mockWriteFile = vi.fn().mockResolvedValue(undefined);
// @ts-ignore
const mockExists = vi.fn().mockResolvedValue(false);
// @ts-ignore
const mockListFiles = vi.fn().mockResolvedValue([]);
// @ts-ignore
const mockCreateCompletion = vi.fn().mockResolvedValue('Generated note content');
// @ts-ignore
const mockFormat = vi.fn().mockReturnValue({ messages: [{ role: 'user', content: 'compose this' }] });
// @ts-ignore
const mockCreateComposePrompt = vi.fn().mockResolvedValue('compose this transcription please');

// Mock the modules before importing
vi.mock('@/logging', () => ({
    getLogger: vi.fn(() => mockLogger)
}));

vi.mock('@/util/storage', () => ({
    create: vi.fn(() => ({
        readFile: mockReadFile,
        writeFile: mockWriteFile,
        exists: mockExists,
        listFiles: mockListFiles
    }))
}));

vi.mock('@/util/openai', () => ({
    createCompletion: mockCreateCompletion,
}));

vi.mock('@/prompt/prompts', () => ({
    create: vi.fn(() => ({
        format: mockFormat,
        createComposePrompt: mockCreateComposePrompt
    })),
}));

// Import modules after mocking
let Logging: any;
let Storage: any;
let OpenAI: any;
let Prompt: any;
let ComposePhase: any;
// Import these modules to ensure we're using the mocked versions
let Dreadcabinet: any;

describe('compose', () => {
    beforeEach(async () => {
        vi.clearAllMocks();

        // Import the modules
        Logging = await import('@/logging');
        Storage = await import('@/util/storage');
        OpenAI = await import('@/util/openai');
        Prompt = await import('@/prompt/prompts');
        ComposePhase = await import('@/phases/compose');
        Dreadcabinet = await import('@theunwalked/dreadcabinet');

        // Reset mock values
        // @ts-ignore
        mockReadFile.mockResolvedValue('Existing note content');
        // @ts-ignore
        mockWriteFile.mockResolvedValue(undefined);
        // @ts-ignore
        mockExists.mockResolvedValue(false);
        // @ts-ignore
        mockListFiles.mockResolvedValue([]);
        // @ts-ignore
        mockCreateCompletion.mockResolvedValue('Generated note content');
        // @ts-ignore
        mockFormat.mockReturnValue({ messages: [{ role: 'user', content: 'compose this' }] });
        // @ts-ignore
        mockCreateComposePrompt.mockResolvedValue({
            persona: { items: [{ text: 'Persona' }] },
            instructions: { items: [{ text: 'Instructions' }] },
            contents: { items: [{ text: 'Content' }] },
            contexts: { items: [{ text: 'Context' }] },
        });
    });

    describe('create', () => {
        test('should create a compose instance with correct dependencies', () => {
            const config = {
                timezone: 'UTC',
                outputDirectory: '/output',
                dryRun: false,
                debug: false,
                model: 'gpt-4o-mini',
                classifyModel: 'gpt-4o-mini',
                composeModel: 'gpt-4o-mini'
            };

            // Create a mock operator
            const mockOperator = {};

            const instance = ComposePhase.create(config, mockOperator);

            expect(instance).toBeDefined();
            expect(instance.compose).toBeDefined();
            expect(Logging.getLogger).toHaveBeenCalled();
            expect(Storage.create).toHaveBeenCalledWith({ log: mockLogger.debug });
            expect(Prompt.create).toHaveBeenCalledWith(config.composeModel, config);
        });
    });

    describe('compose', () => {
        test('should return existing note if file with hash exists', async () => {
            const transcription = {
                text: 'This is a test transcription',
                type: 'note',
                subject: 'test subject',
                recordingTime: '2023-01-01T12:00:00.000Z'
            };
            const outputPath = '/output/path';
            const contextPath = '/output/context';
            const interimPath = '/output/interim';
            const filename = 'note';
            const hash = '12345678';
            const creationTime = new Date('2023-01-01T12:00:00.000Z');
            const destinationPath = '/output/path/note.md';

            // @ts-ignore
            mockListFiles.mockResolvedValueOnce(['note-with-12345678-hash.md']);

            const config = {
                debug: false,
                model: 'gpt-4o-mini',
                classifyModel: 'gpt-4o-mini',
                composeModel: 'gpt-4o-mini'
            };

            // Create a mock operator
            const mockOperator = {};

            const instance = ComposePhase.create(config, mockOperator);
            const result = await instance.compose(transcription, outputPath, contextPath, interimPath, filename, hash, creationTime, destinationPath);

            expect(mockListFiles).toHaveBeenCalledWith(outputPath);
            expect(mockCreateCompletion).not.toHaveBeenCalled();
            expect(mockFormat).not.toHaveBeenCalled();
            expect(result).toBeUndefined();
        });

        test('should return existing note content if note file already exists', async () => {
            const transcription = {
                text: 'This is a test transcription',
                type: 'note',
                subject: 'test subject',
                recordingTime: '2023-01-01T12:00:00.000Z'
            };
            const outputPath = '/output/path';
            const contextPath = '/output/context';
            const interimPath = '/output/interim';
            const filename = 'note';
            const hash = '12345678';
            const creationTime = new Date('2023-01-01T12:00:00.000Z');
            const destinationPath = '/output/path/note.md';

            // @ts-ignore
            mockListFiles.mockResolvedValueOnce([]);
            // @ts-ignore
            mockExists.mockResolvedValueOnce(true);

            const config = {
                debug: false,
                model: 'gpt-4o-mini',
                classifyModel: 'gpt-4o-mini',
                composeModel: 'gpt-4o-mini'
            };

            // Create a mock operator
            const mockOperator = {};

            const instance = ComposePhase.create(config, mockOperator);
            const result = await instance.compose(transcription, outputPath, contextPath, interimPath, filename, hash, creationTime, destinationPath);

            expect(mockExists).toHaveBeenCalledWith('/output/path/note.md');
            expect(mockReadFile).toHaveBeenCalledWith('/output/path/note.md', 'utf8');
            expect(mockCreateCompletion).not.toHaveBeenCalled();
            expect(result).toBe('Existing note content');
        });

        test('should generate a new note when no existing file is found', async () => {
            const transcription = {
                text: 'This is a test transcription',
                type: 'note',
                subject: 'test subject',
                recordingTime: '2023-01-01T12:00:00.000Z'
            };
            const outputPath = '/output/path';
            const contextPath = '/output/context';
            const interimPath = '/output/interim';
            const filename = 'note';
            const hash = '12345678';
            const creationTime = new Date('2023-01-01T12:00:00.000Z');
            const destinationPath = '/output/path/note.md';

            // @ts-ignore
            mockListFiles.mockResolvedValueOnce([]);
            // @ts-ignore
            mockExists.mockResolvedValueOnce(false);

            const config = {
                debug: false,
                model: 'gpt-4o-mini',
                classifyModel: 'gpt-4o-mini',
                composeModel: 'gpt-4o-mini'
            };

            // Create a mock operator
            const mockOperator = {};

            const instance = ComposePhase.create(config, mockOperator);
            const result = await instance.compose(transcription, outputPath, contextPath, interimPath, filename, hash, creationTime, destinationPath);

            expect(mockListFiles).toHaveBeenCalledWith(outputPath);
            expect(mockExists).toHaveBeenCalledWith('/output/path/note.md');
            expect(mockCreateComposePrompt).toHaveBeenCalledWith(transcription, 'note');
            expect(mockCreateCompletion).toHaveBeenCalled();
            expect(mockWriteFile).toHaveBeenCalled();
            // The result should now include metadata
            expect(result).toContain('Generated note content');
            expect(result).toContain('## Metadata');
        });

        test('should handle different file types in transcription', async () => {
            const transcription = {
                text: 'This is a test transcription',
                type: 'action_item',  // Different type
                subject: 'test subject',
                recordingTime: '2023-01-01T12:00:00.000Z'
            };
            const outputPath = '/output/path';
            const contextPath = '/output/context';
            const interimPath = '/output/interim';
            const filename = 'action';
            const hash = '12345678';
            const creationTime = new Date('2023-01-01T12:00:00.000Z');
            const destinationPath = '/output/path/action.md';

            // @ts-ignore
            mockListFiles.mockResolvedValueOnce([]);
            // @ts-ignore
            mockExists.mockResolvedValueOnce(false);

            const config = {
                debug: false,
                model: 'gpt-4o-mini',
                classifyModel: 'gpt-4o-mini',
                composeModel: 'gpt-4o-mini'
            };

            const mockOperator = {};
            const instance = ComposePhase.create(config, mockOperator);
            await instance.compose(transcription, outputPath, contextPath, interimPath, filename, hash, creationTime, destinationPath);

            expect(mockCreateComposePrompt).toHaveBeenCalledWith(transcription, 'action_item');
            expect(mockWriteFile).toHaveBeenCalled();
        });
    });
});
