import { useState } from 'react';
import { designs, readDesign, type DesignId } from './designs/designRegistry';
import './designs/switcher.css';

export function App() {
  const [selected, setSelected] = useState<DesignId>(() => readDesign(new URLSearchParams(location.search).get('design')));
  const [loading, setLoading] = useState(true);
  function select(id: DesignId) {
    if (id === selected) return;
    setLoading(true); setSelected(id);
    const url = new URL(location.href);
    url.searchParams.set('design', String(id));
    history.replaceState(null, '', url);
  }
  const params = new URLSearchParams(location.search);
  params.set('design', String(selected));
  return <div className="design-presenter">
    <header className="design-toolbar">
      <select className="design-select" aria-label="Choose website design" aria-controls="design-preview"
        value={selected} onChange={event => select(readDesign(event.target.value))}>
        {designs.map(design => <option key={design.id} value={design.id}>{design.label}</option>)}
      </select>
    </header>
    <main id="design-preview" className="design-preview" aria-label={designs[selected - 1].description}>
      {loading && <div className="design-loading" role="status">Loading Design {selected}…</div>}
      <iframe key={selected} src={`/design-preview.html?${params}`} title={`Design ${selected} website`} onLoad={() => setLoading(false)} />
    </main>
  </div>;
}
export default App;
