#!/usr/bin/env node
import child_process, { exec } from 'child_process';
import util from 'util';

export async function run(command: string, options: child_process.ExecOptions = {}): Promise<{ stdout: string; stderr: string }> {
    const execPromise = util.promisify(exec);
    const result = await execPromise(command, options);
    return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString()
    };
}