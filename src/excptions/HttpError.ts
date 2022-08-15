
export enum StatusCode {
    SUCCESSFUL_REQ = 200,
    RESOURCE_CREATED = 201,
    BAD_REQUEST = 400,
    UNAUTHORIZED = 401,
    NOT_FOUND = 404,
    INTERNAL_SERVER_ERROR = 500
}

export default class HttpError extends Error {
    public statusCode?: StatusCode;
    
    constructor(message: string) {
        super(message);
    }
}