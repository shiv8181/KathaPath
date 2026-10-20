import { ChangeEvent, useMemo, useState } from 'react';
import { AlertCircle, BookOpen, CheckCircle2, Clock3, FileText, Headphones, Languages, LibraryBig, Settings2, Sparkles, Upload, Volume2, X } from 'lucide-react';
import PdfPageCanvas from './components/PdfPageCanvas';
import PlaybackDock from './components/PlaybackDock';
import SettingsModal from './components/SettingsModal';
import { usePdfDocument } from './hooks/usePdfDocument';
import { useSpeechTutor } from './hooks/useSpeechTutor';
import { api } from './lib/http';

type Chapter = { id: string; title: string; category: string; minutes: number; text: string; explanation: string; words: { word: string; meaning: string }[] };
const chapters: Chapter[] = [
  { id: 'crow', title: 'The Thirsty Crow', category: 'Aesop-style fable', minutes: 3, text: 'It was a hot summer day. A crow was very thirsty. He flew here and there in search of water. At last, he saw a pot under a tree. He looked inside the pot, but there was very little water. The crow tried to drink, but his beak could not reach the water. Then he saw some small stones nearby. He picked up the stones one by one and dropped them into the pot. Slowly, the water rose. At last, the crow could reach the water and drink it. He was happy and flew away.', explanation: 'The story teaches us that patience and clever thinking can help us solve difficult problems.', words: [{ word: 'thirsty', meaning: 'Needing or wanting a drink of water.' }, { word: 'nearby', meaning: 'Not far away; close to a place.' }, { word: 'patient', meaning: 'Able to wait calmly without giving up.' }] },
  { id: 'woodcutter', title: 'The Honest Woodcutter', category: 'Moral story', minutes: 4, text: 'Once there lived a poor woodcutter near a forest. One day, while cutting wood beside a river, his axe slipped from his hand and fell into the water. The woodcutter sat on the bank and began to cry. A kind spirit appeared and asked him why he was sad. The spirit dived into the river and brought out a golden axe. The woodcutter said it was not his. Next, the spirit brought a silver axe, but the woodcutter refused that one too. Finally, the spirit brought his old iron axe. The woodcutter was delighted and told the truth. The spirit rewarded him for his honesty.', explanation: 'The story reminds us that honesty is more valuable than wealth.', words: [{ word: 'woodcutter', meaning: 'A person whose work is cutting trees for wood.' }, { word: 'delighted', meaning: 'Very pleased and happy.' }, { word: 'rewarded', meaning: 'Given something in recognition of good work or behaviour.' }] },
  { id: 'wind', title: 'The Wind and the Sun', category: 'Classic fable', minutes: 3, text: 'One day, the Wind and the Sun argued about who was stronger. They saw a traveller walking along a road wearing a warm coat. They agreed that whoever could make the traveller take off his coat would be the stronger one. The Wind blew as hard as he could. The traveller held his coat tightly around himself. Then the Sun began to shine warmly. Soon the traveller felt hot and took off his coat. The Wind had to admit that the Sun had won. The story shows that gentleness can succeed where force fails.', explanation: 'The lesson is that kindness and gentleness can be more effective than force.', words: [{ word: 'argued', meaning: 'Spoke angrily because of a disagreement.' }, { word: 'traveller', meaning: 'A person who is travelling.' }, { word: 'gentleness', meaning: 'The quality of being kind and mild.' }] },
  { id: 'golden', title: 'The Golden Touch', category: 'Myth retelling', minutes: 4, text: 'King Midas loved gold more than anything else. One day, he was granted a wish. He wished that everything he touched would turn to gold. At first, he was delighted. He touched tables, chairs and flowers, and they became golden. But when he tried to eat, his food turned to gold. When he hugged his daughter, she turned into a golden statue. Midas understood that his wish was a terrible mistake. He begged for the power to be taken away. He learned that love and life are worth more than riches.', explanation: 'The story teaches that greed can make us lose the things that matter most.', words: [{ word: 'granted', meaning: 'Allowed or gave someone what they asked for.' }, { word: 'statue', meaning: 'A carved or shaped figure of a person or animal.' }, { word: 'greed', meaning: 'A strong desire to have more than you need.' }] }
];

export default function App() {
  const [activeId, setActiveId] = useState('crow');
  const [showSettings, setShowSettings] = useState(false);
  const [library, setLibrary] = useState<{ id: string; filename: string; size_bytes: number; page_count: number; is_sample: boolean; created_at: string }[]>([]);
  const [busyLibrary, setBusyLibrary] = useState(false);
  const pdf = usePdfDocument();
  const chapter = chapters.find(item => item.id === activeId) ?? chapters[0];
  const text = pdf.text || chapter.text;
  const tutor = useSpeechTutor(text);
  const sentences = tutor.sentences;
  const currentSentence = sentences[Math.min(tutor.sentenceIndex, Math.max(0, sentences.length - 1))] ?? '';
  const activeWords = chapter.words.filter(item => currentSentence.toLowerCase().includes(item.word.toLowerCase()));
  const title = pdf.fileName || chapter.title;

  const refreshLibrary = async () => {
    setBusyLibrary(true);
    try { setLibrary(await api.listPdfs()); }
    catch (error) { tutor.setNotice(error instanceof Error ? error.message : 'Could not load the saved PDF library.'); }
    finally { setBusyLibrary(false); }
  };
  const selectChapter = (id: string) => {
    tutor.cancel(); pdf.clear(); setActiveId(id); tutor.setNotice('');
  };
  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    tutor.cancel();
    try {
      await pdf.openFile(file, true);
      setActiveId('');
      tutor.setNotice(pdf.error || 'PDF opened. Select Listen to begin reading.');
      void refreshLibrary();
    } catch (error) {
      tutor.setNotice(error instanceof Error ? error.message : 'We could not open this PDF.');
    }
  };
  const playExplanation = async () => {
    if (!currentSentence) return;
    try {
      tutor.setNotice('Preparing spoken Hindi explanation…');
      const response = await api.explain([currentSentence]);
      const item = response.items[0];
      if (!item) throw new Error('The explanation service returned no result.');
      // Hindi content is passed directly to speech synthesis and is never rendered as text.
      const audioOnly = [item.hindi, ...item.vocab.map(v => v.hindi)].filter(Boolean).join(' ');
      tutor.speakHindi(audioOnly);
    } catch (error) {
      tutor.setNotice(error instanceof Error ? error.message : 'Hindi explanation service is unavailable.');
    }
  };
  const readWord = (word: string) => tutor.speakWord(word);
  const sentenceParts = useMemo(() => {
    const parts: { value: string; start: number; whitespace: boolean }[] = [];
    const regex = /\s+|\S+/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(currentSentence))) parts.push({ value: match[0], start: match.index, whitespace: /^\s+$/.test(match[0]) });
    return parts;
  }, [currentSentence]);

  return <div className="app-shell">
    <header className="topbar" data-testid="app-header">
      <a className="brand" href="#" onClick={event => event.preventDefault()}><span className="brand-mark"><BookOpen size={23}/></span><span><strong>KathaPath</strong><small>READ · LISTEN · LEARN</small></span></a>
      <div className="topbar-center"><span className="status-dot"/><span>{pdf.fileName ? 'PDF reading engine' : 'Browser audio engine'}</span><span className="status-pill">READY</span></div>
      <div className="header-actions"><button className="icon-button" onClick={() => void refreshLibrary()} disabled={busyLibrary} aria-label="Refresh saved library"><LibraryBig size={17}/><span>{busyLibrary ? 'Loading…' : 'Sync library'}</span></button><button className="icon-button settings-trigger" onClick={() => setShowSettings(true)} aria-label="Open settings"><Settings2 size={19}/><span>Settings</span></button></div>
    </header>
    <main className="layout">
      <aside className="library-panel panel">
        <div className="section-heading"><div><span className="eyebrow">YOUR READING DESK</span><h2>Library</h2></div><LibraryBig size={21}/></div>
        <label className="upload-button" htmlFor="pdf-upload" data-testid="btn-upload-pdf-trigger"><Upload size={17}/> Upload a PDF <span>+</span></label>
        <input id="pdf-upload" className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={handleUpload} data-testid="input-pdf-file-upload"/>
        <div className="library-list">{chapters.map((item, index) => <button key={item.id} onClick={() => selectChapter(item.id)} className={'chapter-card ' + (!pdf.fileName && activeId === item.id ? 'selected' : '')} data-testid={index < 2 ? `chapter-card-${item.id === 'crow' ? 'thirsty-crow' : 'woodcutter'}` : undefined}>
          <span className="chapter-number">0{index + 1}</span><span className="chapter-meta"><strong>{item.title}</strong><small>{item.category} · {item.minutes} min</small></span><span className="chapter-open">↗</span>
        </button>)}</div>
        <div className="library-note"><Sparkles size={17}/><p><strong>Small steps, strong skills.</strong><br/>Listen to a sentence, notice new words, and build confidence one page at a time.</p></div>
        <div className="library-footer"><span><CheckCircle2 size={14}/> 4 starter readings</span><span>{library.length} saved PDFs {busyLibrary ? '· syncing' : ''}</span><span>PDF limit: 25 MB</span></div>
      </aside>
      <section className="reader-column">
        <div className="reader-title-row"><div><span className="eyebrow">NOW READING</span><h1>{title}</h1><p>{pdf.fileName ? 'Uploaded PDF · original page layout' : chapter.category + ' · English practice'}</p></div><span className="document-chip"><FileText size={15}/>{pdf.fileName ? 'YOUR PDF' : 'SAMPLE'}</span></div>
        {pdf.fileName
          ? <PdfPageCanvas canvasRef={pdf.canvasRef} pageNumber={pdf.pageNumber} pageCount={pdf.pageCount} loading={pdf.loading} onPageChange={pdf.setPageNumber}/>
          : <div className="reader-card panel" data-testid="pdf-canvas-container"><div className="paper-toolbar"><span><FileText size={15}/> READING PAGE</span><span className="page-label" data-testid="pdf-page-indicator">TEXT VIEW · {sentences.length} SENTENCES</span></div><div className="paper-content">{sentences.map((sentence, index) => <p key={index} className={'sentence ' + (tutor.sentenceIndex === index ? 'sentence-active' : '')} onClick={() => { tutor.cancel(); tutor.setSentenceIndex(index); tutor.setNotice(''); }} data-testid={index === tutor.sentenceIndex ? 'current-sentence-text' : undefined}>{index === tutor.sentenceIndex ? sentenceParts.map((part, i) => <span key={i} className={!part.whitespace && part.start <= currentSentence.length && (currentSentence.slice(0, part.start).match(/\S+/g) ?? []).length === tutor.wordIndex ? 'word-active' : ''}>{part.value}</span>) : sentence}</p>)}</div><div className="paper-footer"><span>ENGLISH READING MODE</span><span><span className="amber-dot"/> Live word highlight</span></div></div>}
        {pdf.error && <div className="notice" role="status"><AlertCircle size={16}/><span>{pdf.error}</span><button onClick={() => pdf.setError('')} aria-label="Dismiss notice"><X size={15}/></button></div>}
        <PlaybackDock sentenceIndex={tutor.sentenceIndex} sentenceCount={sentences.length} isPlaying={tutor.isPlaying} speed={tutor.speed} onToggle={tutor.togglePlayback} onRestart={tutor.restart} onMove={tutor.moveSentence} onSpeedChange={tutor.setSpeed}/>
        {tutor.notice && <div className="notice" role="status"><AlertCircle size={16}/><span>{tutor.notice}</span><button onClick={() => tutor.setNotice('')} aria-label="Dismiss notice"><X size={15}/></button></div>}
      </section>
      <aside className="tutor-panel panel">
        <div className="tutor-header"><div><span className="eyebrow">YOUR AI STUDY COMPANION</span><h2>Tutor session</h2></div><span className="tutor-avatar"><Headphones size={20}/></span></div>
        <div className="session-status"><span className={'status-dot ' + (tutor.isPlaying ? 'live' : '')}/><span data-testid="tutor-status-badge">{tutor.isPlaying ? 'Reading aloud' : 'Ready when you are'}</span><span className="wave-mini"><i/><i/><i/><i/></span></div>
        <div className="current-card"><span className="eyebrow">CURRENT SENTENCE</span><p>{currentSentence || 'Your selected sentence will appear here.'}</p><div className="sentence-tag">SENTENCE {sentences.length ? tutor.sentenceIndex + 1 : 0} / {sentences.length}</div></div>
        <div className="tutor-feature"><div className="feature-icon"><Languages size={18}/></div><div><strong>Spoken Hindi guide</strong><p>Hear a short explanation and vocabulary support without displaying Hindi text.</p></div></div>
        <button className="explain-button" onClick={() => void playExplanation()}><Volume2 size={17}/> Play spoken explanation <span>↗</span></button>
        <div className="vocab-section"><div className="vocab-title"><span className="eyebrow">WORDS TO NOTICE</span><span className="vocab-count">{activeWords.length} WORDS</span></div>
          {activeWords.length ? activeWords.map(item => <div className="vocab-row" key={item.word}><div><strong>{item.word}</strong><p>{item.meaning}</p></div><button onClick={() => readWord(item.word)} aria-label={'Pronounce ' + item.word}><Volume2 size={16}/></button></div>) : <p className="vocab-empty">Choose a sample reading to explore selected vocabulary. For uploaded PDFs, use the spoken Hindi guide for sentence-level support.</p>}
        </div>
        <div className="spoken-only"><span className="spoken-icon"><Volume2 size={15}/></span><span><strong>Audio-first learning</strong><small>Hindi explanations are spoken, never written on screen.</small></span></div>
      </aside>
    </main>
    <footer className="app-footer"><span>© KathaPath · A calmer way to learn English</span><span><Clock3 size={13}/> Reading progress stays in this session</span></footer>
    <SettingsModal open={showSettings} voices={tutor.voices} englishVoice={tutor.englishVoice} hindiVoice={tutor.hindiVoice} onEnglishChange={tutor.setEnglishVoice} onHindiChange={tutor.setHindiVoice} onClose={() => setShowSettings(false)}/>
  </div>;
}
