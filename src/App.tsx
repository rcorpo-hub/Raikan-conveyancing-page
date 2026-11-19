import { useEffect } from 'react';
import markup from './reference/markup.html?raw';
import { mountReference } from './reference/app';

export function App() {
  useEffect(() => mountReference(), []);
  return <div dangerouslySetInnerHTML={{ __html: markup }} />;
}
export default App;
