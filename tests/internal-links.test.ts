import { describe,expect,it } from 'vitest';import page from '../public/content/pages/burbank-notes-burbank-a.json';import { renderLegacy } from '../app/utils/content'
import metrePage from '../public/content/pages/among-notes-among-m.json'
import legacySearchPage from '../public/content/pages/eliot-search.json'
import traditionPage from '../public/content/pages/essays-swtradition.json'
import euripidesPage from '../public/content/pages/essays-sweuripides.json'
import tralaPage from '../public/content/pages/burbank-notes-trala-n.json'
import amongPage from '../public/content/pages/among-notes-among-a.json'
import amongTitlePage from '../public/content/pages/among-notes-title-n.json'
import carnavalPage from '../public/content/pages/burbank-notes-carnaval.json'
import poemsPage from '../public/content/pages/poems-1920.json'
import rhapsodyPage from '../public/content/pages/rhapsody-frame.json'
import framesetPage from '../public/content/pages/index.json'
describe('server content renderer',()=>{it('rewrites annotation links to ordinary URLs',()=>{const html=renderLegacy(page as never);expect(html).toContain('href="/annotation/burbank-notes-title-n/"');expect(html).toContain('href="/annotation/burbank-notes-axletree-n/"');expect(html).not.toContain('href="title_N.htm"');expect(html).not.toContain('href="axletree_N.htm"')});it('embeds static annotation previews',()=>{const html=renderLegacy(page as never);expect(html).toContain('class="annotation-tooltip"');expect(html).toContain('role="tooltip"');expect(html).toContain('aria-describedby="annotation-tooltip-');expect(html).toContain('Click for the full annotation')});it('rewrites assets to canonical root paths',()=>{expect(renderLegacy(page as never)).toContain('/content/assets/')})})

describe('editorial asset replacements',()=>{it('renders reconstructed metre symbols without broken archival URLs',()=>{const html=renderLegacy(metrePage as never);expect(html).toContain('/editorial-assets/scansion/stressed.svg');expect(html).toContain('/editorial-assets/scansion/unstressed-long.svg');expect(html).toContain('/editorial-assets/scansion/unstressed-short.svg');expect(html).toContain('/editorial-assets/scansion/pause-dot.svg');expect(html).toContain('/editorial-assets/scansion/slur.svg');expect(html).not.toContain('/content/assets/images/stressed.gif')})})
describe('editorial asset replacements',()=>{it('omits an obsolete search badge while retaining its link text',()=>{const html=renderLegacy(legacySearchPage as never);expect(html).not.toContain('avmini.gif');expect(html).toContain('<strong>Search</strong>')})})
describe('Greek text recovery',()=>{it('renders missing Greek bitmaps as semantic Unicode text',()=>{const tradition=renderLegacy(traditionPage as never);expect(tradition).toContain('<span class="editorial-greek" lang="grc"');expect(tradition).toContain('ὁ δὲ νοῦς ἴσως');expect(tradition).not.toContain('greek1.gif');const euripides=renderLegacy(euripidesPage as never);expect(euripides).toContain('ἑξῆλθον δόμων');expect(euripides).toContain('οὐκ ἔστιν ἄλλη φρὴν μιαιφονωτέρα');expect(euripides).not.toContain('greek6.gif')})})
describe('editorial link replacements',()=>{
  it('replaces missing Gautier pages with public-domain sources',()=>{const html=renderLegacy(tralaPage as never);expect(html).toContain('https://fr.wikisource.org/wiki/Variations_sur_le_Carnaval_de_Venise_(RDDM)');expect(html).toContain('https://www.gutenberg.org/cache/epub/29521/pg29521-images.html#VARIATIONS_ON_THE_CARNIVAL_OF_VENICE');expect(html).not.toContain('GautierProject');expect(html).toContain('rel="external noopener noreferrer"')})
  it('corrects recoverable internal path errors',()=>{expect(renderLegacy(amongPage as never)).toContain('href="/annotation/among-notes-title-n/"');expect(renderLegacy(amongTitlePage as never)).toContain('href="/read/among-notes-among-m/"')})
  it('links the missing Veronese detail to the official Louvre record',()=>{const html=renderLegacy(carnavalPage as never);expect(html).toContain('https://collections.louvre.fr/en/ark:/53355/cl010064382');expect(html).not.toContain('IMG_wedding.htm')})
  it('retains visible titles while removing unrecoverable dead links',()=>{const poems=renderLegacy(poemsPage as never);expect(poems).toContain('Gerontion');expect(poems).toContain('Sweeney Erect');expect(poems).not.toContain('Gerontion_FRAME.htm');expect(poems).not.toContain('Erect_FRAME.htm');expect(renderLegacy(rhapsodyPage as never)).not.toContain('Rhapsody_NOTE.htm')})
})
describe('legacy markup normalization',()=>{
  it('removes obsolete presentational elements and preserves named fragment targets',()=>{const html=renderLegacy(page as never);expect(html).not.toMatch(/<\/?(?:font|center)\b/i);expect(html).toContain('class="legacy-center"');expect(html).toContain('class="legacy-anchor"')})
  it('emits valid modern image syntax',()=>{const html=renderLegacy(carnavalPage as never);expect(html).not.toMatch(/<img\b[^>]*\/\s+(?:loading|tabindex|data-lightbox)=/i);expect(html).not.toMatch(/<img\b[^>]*\balt=("[^"]*"|'[^']*')[^>]*\balt=/i)})
  it('replaces the nested frameset document with a semantic fallback',()=>{const html=renderLegacy(framesetPage as never);expect(html).toContain('original frameset entry point');expect(html).not.toMatch(/<(?:html|head|body|frameset|frame)\b/i)})
})
