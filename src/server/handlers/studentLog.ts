import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';
import { config } from '../setup';

export function studentLog(req: Request, res: Response) {
  const json = req.body;
  const id = json.id;

  // Write JSON log
  const logFilename = config.logFilename.replace('[id]', id);
  const logFilepath = path.join(config.directory, logFilename);
  fs.writeFile(logFilepath, JSON.stringify(json, null, 2), console.error);

  res.send(JSON.stringify({ success: true }));
}
