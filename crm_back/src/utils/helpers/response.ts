import type { Response } from 'express';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  total?: number;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message?: string,
  status = 200
): void {
  const body: ApiResponse<T> = { success: true, data };
  if (message) body.message = message;
  res.status(status).json(body);
}

export function sendError(
  res: Response,
  message: string,
  status = 500
): void {
  res.status(status).json({ success: false, message });
}

export function sendSuccessWithTotal<T>(
  res: Response,
  data: T,
  total: number
): void {
  res.json({ success: true, total, data });
}
