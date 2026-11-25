import React from 'react';
import { createRoot } from 'react-dom/client';
import { readDesign } from './designRegistry';
import { ReferenceDesign } from './ReferenceDesign';
import { ArtifactDesign } from './ArtifactDesign';
import currentCss from '../reference/style.css?url';
import mainCss from './main/style.css?url';
import artifactCss from './artifact/integration.css?url';
import chatCss from './chatbot.css?url';
import artifact2Css from './artifact/design-2.css?url';
import artifact3Css from './artifact/design-3.css?url';

const id = readDesign(new URLSearchParams(location.search).get('design'));
document.title = `Design ${id} · Raikan Conveyancing`;
const sheets = id === 1 ? [currentCss] : id === 4 ? [mainCss, artifactCss] : ['/design-assets/fonts.css', id === 2 ? artifact2Css : artifact3Css, chatCss, artifactCss];
for (const href of sheets) { const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href; document.head.append(link); }
createRoot(document.getElementById('root')!).render(<React.StrictMode>
  {id === 2 || id === 3 ? <ArtifactDesign design={id} /> : <ReferenceDesign design={id} />}
</React.StrictMode>);
