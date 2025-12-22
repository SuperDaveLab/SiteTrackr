declare class Worker {
  constructor(stringUrl: string | URL, options?: any);
  postMessage(message: unknown, transfer?: any): void;
  terminate(): void;
}
