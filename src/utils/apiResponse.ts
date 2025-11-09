export class ApiResponse {
  public success: boolean;
  public message?: string;
  public data?: any;
  public meta?: Record<string, any>;
  public errors?: Record<string, string[]>;

  constructor(options: {
    success: boolean;
    message?: string;
    data?: any;
    meta?: Record<string, any>;
    errors?: Record<string, string[]>;
  }) {
    this.success = options.success;
    this.message = options.message;
    this.data = options.data;
    this.meta = options.meta;
    this.errors = options.errors;
  }

  static success(
    data?: any,
    message?: string,
    meta?: Record<string, any>
  ): ApiResponse {
    return new ApiResponse({
      success: true,
      message,
      data,
      meta,
    });
  }

  static error(
    message: string,
    errors?: Record<string, string[]>
  ): ApiResponse {
    return new ApiResponse({
      success: false,
      message,
      errors,
    });
  }
}




