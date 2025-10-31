declare module 'next/server' {
  export class NextRequest {}
  export class NextResponse {
    constructor(...args: any[]);
    static json(body?: any, init?: any): any;
  }
}
