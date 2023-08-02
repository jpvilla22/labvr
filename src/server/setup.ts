import express from 'express';
import Server from 'webpack-dev-server';
import { studentLog } from './handlers/studentLog';
import { experimentResults } from './handlers/experimentResults';

export const config = {
  directory: './resultados',
  logFilename: '[id].json',
  csvFilename: '[id].csv',
};

export function setup(server: Server) {
  server.app.use(express.json());

  server.app.get('/ping', (req: any, res: any) => res.send('Pong :) <3'));

  server.app.post('/studentLog', studentLog);
  server.app.post('/results', experimentResults);
}
