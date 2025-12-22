declare class Worker {
  constructor(stringUrl: string | URL, options?: any);
  postMessage: (...args: any[]) => void;
  terminate: () => void;
}
