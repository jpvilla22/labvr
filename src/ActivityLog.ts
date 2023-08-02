import { RecordingSheet } from './RecordingSheet';

export namespace ActivityLog {
  export let sessionId: string;

  export function sendActivity() {
    const data: any = { entries: RecordingSheet.getEntries() };

    data.id = sessionId;
    const now = new Date();
    data.date = `${now.toLocaleDateString().replace(/\//g, '-')}T${now.toLocaleTimeString()}`;

    // URL del servidor
    const url = '/studentLog/';

    // Opciones de la solicitud
    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };

    // Realizar la solicitud al servidor
    fetch(url, options)
      .then((response) => response.json())
      .then((result) => console.log(result))
      .catch((error) => console.error('Error:', error));
  }

  export function sendResults() {
    const now = new Date();
    const date = `${now.toLocaleDateString().replace(/\//g, '-')}T${now.toLocaleTimeString()}`;

    const data = {
      results: RecordingSheet.buildResults(),
      id: sessionId,
      date,
    };

    const options = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };

    fetch('/results', options)
      .then((response) => response.json())
      .then((result) => console.log(result))
      .catch((error) => console.error('Error:', error));
  }
}
