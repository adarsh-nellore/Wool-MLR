import { Request, Response, NextFunction } from 'express';
import xss from 'xss';

export function sanitizeInputs(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        obj[key] = xss(value, {
          whiteList: {},
          stripIgnoreTag: true,
          stripIgnoreTagBody: ['script'],
        });
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitizeObject(value);
      } else if (Array.isArray(value)) {
        value.forEach(item => {
          if (typeof item === 'object' && item !== null) {
            sanitizeObject(item);
          }
        });
      }
    }
  }
}
