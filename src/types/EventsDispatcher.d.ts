export interface IEventsHandling {
  addEventListener: (type: number | string, handler: any) => void;
  removeEventListener: (type: number | string, handler: any) => void;
  dispatchEvent: (event: any) => boolean | void;
}
