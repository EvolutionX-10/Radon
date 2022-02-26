import type { RadonEnv } from './types';

declare global {
    namespace NodeJS {
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface ProcessEnv extends RadonEnv {}
    }
}
export {};
