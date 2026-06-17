import { HttpException, HttpStatus } from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';

const mockJson = jest.fn();
const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
const mockResponse = { status: mockStatus };
const mockRequest = { url: '/api/v1/test' };
const mockArgumentsHost = {
  switchToHttp: () => ({
    getResponse: () => mockResponse,
    getRequest: () => mockRequest,
  }),
} as any;

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('handles HttpException with object response', () => {
    const exception = new HttpException(
      { message: 'Validation failed', error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Validation failed',
        error: 'Bad Request',
        path: '/api/v1/test',
      }),
    );
  });

  it('handles HttpException with string response', () => {
    const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 404, path: '/api/v1/test' }),
    );
  });

  it('handles array of validation messages', () => {
    const exception = new HttpException(
      { message: ['field is required', 'field must be a string'], error: 'Bad Request' },
      HttpStatus.BAD_REQUEST,
    );

    filter.catch(exception, mockArgumentsHost);

    const calledWith = mockJson.mock.calls[0][0];
    expect(Array.isArray(calledWith.message)).toBe(true);
  });

  it('handles unknown (non-HTTP) exceptions as 500', () => {
    const exception = new Error('Database connection lost');

    filter.catch(exception, mockArgumentsHost);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('uses exception.message when object response has no message field', () => {
    const exception = new HttpException({ error: 'Conflict' }, HttpStatus.CONFLICT);

    filter.catch(exception, mockArgumentsHost);

    const calledWith = mockJson.mock.calls[0][0];
    expect(calledWith.statusCode).toBe(409);
    expect(calledWith.message).toBeTruthy();
  });

  it('defaults error to "Error" when object response has no error field', () => {
    const exception = new HttpException({ message: 'Something bad' }, HttpStatus.BAD_REQUEST);

    filter.catch(exception, mockArgumentsHost);

    const calledWith = mockJson.mock.calls[0][0];
    expect(calledWith.error).toBe('Error');
  });

  it('includes ISO timestamp in all responses', () => {
    const exception = new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    filter.catch(exception, mockArgumentsHost);

    const calledWith = mockJson.mock.calls[0][0];
    expect(new Date(calledWith.timestamp).toISOString()).toBe(calledWith.timestamp);
  });
});
