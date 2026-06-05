import { pipeline, env } from '@xenova/transformers';

// Skip local model check since we are running in browser.
env.allowLocalModels = false;

class PipelineSingleton {
    static task = 'automatic-speech-recognition';
    static model = 'Xenova/whisper-tiny.en';
    static instance = null;

    static async getInstance(progress_callback = null) {
        if (this.instance === null) {
            this.instance = await pipeline(this.task, this.model, { progress_callback });
        }
        return this.instance;
    }
}

// Listen for messages from the main thread
self.addEventListener('message', async (event) => {
    // Retrieve the translation pipeline. When called for the first time,
    // this will load the pipeline and save it for future use.
    let transcriber = await PipelineSingleton.getInstance(x => {
        // We also add a progress callback to the pipeline so that we can
        // track model downloading.
        self.postMessage(x);
    });

    // Actually perform the transcription
    let output = await transcriber(event.data.audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
    });

    // Send the output back to the main thread
    self.postMessage({
        status: 'complete',
        output,
    });
});
