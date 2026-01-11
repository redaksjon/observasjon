import { describe, expect, test, beforeEach, vi } from 'vitest';

// Setup mock objects
const mockOpenAICreate = vi.fn();
const mockOpenAITranscribe = vi.fn();
const mockChat = {
    completions: {
        create: mockOpenAICreate
    }
};
const mockAudio = {
    transcriptions: {
        create: mockOpenAITranscribe
    }
};

const mockOpenAIInstance = {
    chat: mockChat,
    audio: mockAudio
};

const mockOpenAIConstructor = vi.fn(() => mockOpenAIInstance);

const mockStorageWriteFile = vi.fn();
const mockStorageReadStream = vi.fn();
const mockStorage = {
    writeFile: mockStorageWriteFile,
    readStream: mockStorageReadStream
};
const mockStorageCreate = vi.fn(() => mockStorage);

const mockLogger = {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn()
};
const mockGetLogger = vi.fn(() => mockLogger);

// Setup module mocks
vi.mock('openai', () => ({
    OpenAI: mockOpenAIConstructor
}));

vi.mock('../../src/util/storage.js', () => ({
    create: mockStorageCreate
}));

vi.mock('../../src/logging.js', () => ({
    getLogger: mockGetLogger
}));

// Import the module under test
let openAiUtils: any;

describe('OpenAI utilities', () => {
    beforeEach(async () => {
        vi.clearAllMocks();
        vi.resetModules();

        // Reset mocks
        mockGetLogger.mockReturnValue(mockLogger);
        mockStorageCreate.mockReturnValue(mockStorage);

        // Import the module under test
        openAiUtils = await import('../../src/util/openai.js');
    });

    describe('createCompletion', () => {
        test('should successfully create a completion', async () => {
            const mockMessages = [{ role: 'user', content: 'test' }];
            const mockResponse = { choices: [{ message: { content: 'test response' } }] };

            // @ts-ignore
            mockOpenAICreate.mockResolvedValue(mockResponse);
            process.env.OPENAI_API_KEY = 'test-key';

            const result = await openAiUtils.createCompletion(mockMessages);

            expect(result).toBe('test response');
            expect(mockLogger.debug).toHaveBeenCalledWith('Sending prompt to OpenAI: %j', mockMessages);
            expect(mockLogger.debug).toHaveBeenCalledWith('Received response from OpenAI: %s', 'test response');
        });

        test('should handle JSON response format', async () => {
            const mockMessages = [{ role: 'user', content: 'test' }];
            const mockResponse = { choices: [{ message: { content: '{"key": "value"}' } }] };

            // @ts-ignore
            mockOpenAICreate.mockResolvedValue(mockResponse);
            process.env.OPENAI_API_KEY = 'test-key';

            const result = await openAiUtils.createCompletion(mockMessages, { responseFormat: { type: 'json' } });

            expect(result).toEqual({ key: "value" });
        });

        test('should write debug file when debug options are provided', async () => {
            const mockMessages = [{ role: 'user', content: 'test' }];
            const mockResponse = { choices: [{ message: { content: 'test response' } }] };

            // @ts-ignore
            mockOpenAICreate.mockResolvedValue(mockResponse);
            process.env.OPENAI_API_KEY = 'test-key';

            await openAiUtils.createCompletion(mockMessages, { debug: true, debugFile: 'debug.json' });

            expect(mockStorageWriteFile).toHaveBeenCalledWith(
                'debug.json',
                JSON.stringify(mockResponse, null, 2),
                'utf8'
            );
            expect(mockLogger.debug).toHaveBeenCalledWith('Wrote debug file to %s', 'debug.json');
        });

        test('should throw error when API key is missing', async () => {
            delete process.env.OPENAI_API_KEY;

            await expect(openAiUtils.createCompletion([]))
                .rejects
                .toThrow('OPENAI_API_KEY environment variable is not set');
        });

        test('should throw error when no response is received', async () => {
            const mockResponse = { choices: [{ message: { content: '' } }] };

            // @ts-ignore
            mockOpenAICreate.mockResolvedValue(mockResponse);
            process.env.OPENAI_API_KEY = 'test-key';

            await expect(openAiUtils.createCompletion([]))
                .rejects
                .toThrow('No response received from OpenAI');
        });
    });

    describe('transcribeAudio', () => {
        test('should successfully transcribe audio', async () => {
            const mockFilePath = '/test/audio.mp3';
            const mockTranscription = { text: 'test transcription' };
            const mockStream = {};

            // @ts-ignore
            mockStorageReadStream.mockResolvedValue(mockStream);
            // @ts-ignore
            mockOpenAITranscribe.mockResolvedValue(mockTranscription);
            process.env.OPENAI_API_KEY = 'test-key';

            const result = await openAiUtils.transcribeAudio(mockFilePath);

            expect(result).toEqual(mockTranscription);
            expect(mockLogger.debug).toHaveBeenCalledWith('Transcribing audio file: %s', mockFilePath);
            expect(mockLogger.debug).toHaveBeenCalledWith('Received transcription from OpenAI: %s', mockTranscription);
        });

        test('should write debug file when debug options are provided', async () => {
            const mockFilePath = '/test/audio.mp3';
            const mockTranscription = { text: 'test transcription' };
            const mockStream = {};

            // @ts-ignore
            mockStorageReadStream.mockResolvedValue(mockStream);
            // @ts-ignore
            mockOpenAITranscribe.mockResolvedValue(mockTranscription);
            process.env.OPENAI_API_KEY = 'test-key';

            await openAiUtils.transcribeAudio(mockFilePath, { debug: true, debugFile: 'transcription-debug.json' });

            expect(mockStorageWriteFile).toHaveBeenCalledWith(
                'transcription-debug.json',
                JSON.stringify(mockTranscription, null, 2),
                'utf8'
            );
            expect(mockLogger.debug).toHaveBeenCalledWith('Wrote debug file to %s', 'transcription-debug.json');
        });

        test('should throw error when API key is missing', async () => {
            delete process.env.OPENAI_API_KEY;

            await expect(openAiUtils.transcribeAudio('/test/audio.mp3'))
                .rejects
                .toThrow('OPENAI_API_KEY environment variable is not set');
        });

        test('should throw error when no transcription is received', async () => {
            const mockStream = {};

            // @ts-ignore
            mockStorageReadStream.mockResolvedValue(mockStream);
            // @ts-ignore
            mockOpenAITranscribe.mockResolvedValue(null);
            process.env.OPENAI_API_KEY = 'test-key';

            await expect(openAiUtils.transcribeAudio('/test/audio.mp3'))
                .rejects
                .toThrow('No transcription received from OpenAI');
        });
    });
});
