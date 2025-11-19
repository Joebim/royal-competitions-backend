declare module '@paypal/checkout-server-sdk' {
  export namespace core {
    export class LiveEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
    
    export class SandboxEnvironment {
      constructor(clientId: string, clientSecret: string);
    }
    
    export class PayPalHttpClient {
      constructor(environment: LiveEnvironment | SandboxEnvironment);
      execute<T = any>(request: any): Promise<{ result: T; statusCode: number }>;
    }
  }
  
  export namespace orders {
    export class OrdersCreateRequest {
      prefer(value: string): void;
      requestBody(body: any): void;
    }
    
    export class OrdersCaptureRequest {
      constructor(orderId: string);
      prefer(value: string): void;
    }
    
    export class OrdersGetRequest {
      constructor(orderId: string);
    }
  }
  
  export namespace payments {
    export class CapturesRefundRequest {
      constructor(captureId: string);
      prefer(value: string): void;
      requestBody(body: any): void;
    }
  }
  
  export default {
    core: {
      LiveEnvironment: core.LiveEnvironment,
      SandboxEnvironment: core.SandboxEnvironment,
      PayPalHttpClient: core.PayPalHttpClient,
    },
    orders: {
      OrdersCreateRequest: orders.OrdersCreateRequest,
      OrdersCaptureRequest: orders.OrdersCaptureRequest,
      OrdersGetRequest: orders.OrdersGetRequest,
    },
    payments: {
      CapturesRefundRequest: payments.CapturesRefundRequest,
    },
  };
}

