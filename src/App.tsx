import { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Headphones, Upload, Play, Pause, SkipBack, SkipForward, RotateCcw, Settings2, Volume2, FileText, Clock3, CheckCircle2, Sparkles, Languages, LibraryBig, X, AlertCircle } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type Chapter = { id: string; title: string; category: string; minutes: number; text: string; explanation: string; words: { word: string; meaning: string }[] };
const chapters: Chapter[] = [
  { id: 'crow', title: 'The Thirsty Crow', category: 'Aesop-style fable', minutes: 3, text: 'It was a hot summer day. A crow was very thirsty. He flew here and there in search of water. At last, he saw a pot under a tree. He looked inside the pot, but there was very little water. The crow tried to drink, but his beak could not reach the water. Then he saw some small stones nearby. He picked up the stones one by one and dropped them into the pot. Slowly, the water rose. At last, the crow could reach the water and drink it. He was happy and flew away.', explanation: 'The story teaches us that patience and clever thinking can help us solve difficult problems.', words: [{ word: 'thirsty', meaning: 'Needing or wanting a drink of water.' }, { word: 'nearby', meaning: 'Not far away; close to a place.' }, { word: 'patient', meaning: 'Able to wait calmly without giving up.' }] },
  { id: 'woodcutter', title: 'The Honest Woodcutter', category: 'Moral story', minutes: 4, text: 'Once there lived a poor woodcutter near a forest. One day, while cutting wood beside a river, his axe slipped from his hand and fell into the water. The woodcutter sat on the bank and began to cry. A kind spirit appeared and asked him why he was sad. The spirit dived into the river and brought out a golden axe. The woodcutter said it was not his. Next, the spirit brought a silver axe, but the woodcutter refused that one too. Finally, the spirit brought his old iron axe. The woodcutter was delighted and told the truth. The spirit rewarded him for his honesty.', explanation: 'The story reminds us that honesty is more valuable than wealth.', words: [{ word: 'woodcutter', meaning: 'A person whose work is cutting trees for wood.' }, { word: 'delighted', meaning: 'Very pleased and happy.' }, { word: 'rewarded', meaning: 'Given something in recognition of good work or behaviour.' }] },
  { id: 'wind', title: 'The Wind and the Sun', category: 'Classic fable', minutes: 3, text: 'One day, the Wind and the Sun argued about who was stronger. They saw a traveller walking along a road wearing a warm coat. They agreed that whoever could make the traveller take off his coat would be the stronger one. The Wind blew as hard as he could. The traveller held his coat tightly around himself. Then the Sun began to shine warmly. Soon the traveller felt hot and took off his coat. The Wind had to admit that the Sun had won. The story shows that gentleness can succeed where force fails.', explanation: 'The lesson is that kindness and gentleness can be more effective than force.', words: [{ word: 'argued', meaning: 'Spoke angrily because of a disagreement.' }, { word: 'traveller', meaning: 'A person who is travelling.' }, { word: 'gentleness', meaning: 'The quality of being kind and mild.' }] },
  { id: 'golden', title: 'The Golden Touch', category: 'Myth retelling', minutes: 4, text: 'King Midas loved gold more than anything else. One day, he was granted a wish. He wished that everything he touched would turn to gold. At first, he was delighted. He touched tables, chairs and flowers, and they became golden. But when he tried to eat, his food turned to gold. When he hugged his daughter, she turned into a golden statue. Midas understood that his wish was a terrible mistake. He begged for the power to be taken away. He learned that love and life are worth more than riches.', explanation: 'The story teaches that greed can make us lose the things that matter most.', words: [{ word: 'granted', meaning: 'Allowed or gave someone what they asked for.' }, { word: 'statue', meaning: 'A carved or shaped figure of a person or animal.' }, { word: 'greed', meaning: 'A strong desire to have more than you need.' }] }
];
const splitSentences = (text: string) => {
  const matches = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [];
  return matches.map(s => s.trim()).filter(Boolean);
};
function App() {
  const [activeId, setActiveId] = useState('crow');
  const [uploadedTitle, setUploadedTitle] = useState('');
  const [uploadedText, setUploadedText] = useState('');
  const [notice, setNotice] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(-1);
  const [speed, setSpeed] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [englishVoice, setEnglishVoice] = useState('');
  const [hindiVoice, setHindiVoice] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sessionRef = useRef(0);
  const chapter = chapters.find(c => c.id === activeId) ?? chapters[0];
  const text = uploadedText || chapter.text;
  const title = uploadedText ? uploadedTitle : chapter.title;
  const sentences = useMemo(() => splitSentences(text), [text]);
  const currentSentence = sentences[Math.min(sentenceIndex, Math.max(0, sentences.length - 1))] ?? '';
  const words = currentSentence.split(/(\s+)/);
  const selectedEnglish = voices.find(v => v.name === englishVoice) ?? voices.find(v => v.lang.toLowerCase().startsWith('en-in')) ?? voices.find(v => v.lang.toLowerCase().startsWith('en')) ;
  const selectedHindi = voices.find(v => v.name === hindiVoice) ?? voices.find(v => v.lang.toLowerCase().startsWith('hi'));
  const cancelSpeech = () => { sessionRef.current++; window.speechSynthesis?.cancel(); utteranceRef.current = null; setIsPlaying(false); setWordIndex(-1); };
  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    load(); window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => { window.speechSynthesis?.removeEventListener('voiceschanged', load); window.speechSynthesis?.cancel(); };
  }, []);
  useEffect(() => { cancelSpeech(); setSentenceIndex(0); }, [activeId, uploadedText]);
  const speakSentence = (index: number) => {
    if (!('speechSynthesis' in window)) { setNotice('Speech synthesis is not supported in this browser. Try Chrome.'); return; }
    if (index < 0 || index >= sentences.length) { setIsPlaying(false); setWordIndex(-1); setNotice('You have reached the end of this reading.'); return; }
    const token = ++sessionRef.current;
    window.speechSynthesis.cancel();
    setSentenceIndex(index); setWordIndex(-1); setIsPlaying(true);
    const utterance = new SpeechSynthesisUtterance(sentences[index]);
    utterance.lang = selectedEnglish?.lang || 'en-IN'; utterance.rate = speed; if (selectedEnglish) utterance.voice = selectedEnglish;
    utterance.onboundary = (event) => {
      if (token !== sessionRef.current) return;
      if (event.name === 'word' || typeof event.charIndex === 'number') {
        const prefix = sentences[index].slice(0, event.charIndex);
        setWordIndex(prefix.trim() ? prefix.trim().split(/\s+/).length : 0);
      }
    };
    utterance.onend = () => {
      if (token !== sessionRef.current) return;
      setWordIndex(-1);
      if (index + 1 < sentences.length) {
        window.setTimeout(() => { if (token === sessionRef.current) speakSentence(index + 1); }, 700);
      } else { setIsPlaying(false); setNotice('Reading complete. Well done!'); }
    };
    utterance.onerror = (event) => { if (token === sessionRef.current && event.error !== 'canceled' && event.error !== 'interrupted') { setIsPlaying(false); setNotice('Audio playback stopped. Please try again.'); } };
    utteranceRef.current = utterance; window.speechSynthesis.speak(utterance);
  };
  const togglePlayback = () => {
    if (isPlaying) { cancelSpeech(); return; }
    speakSentence(sentenceIndex);
  };
  const selectChapter = (id: string) => { cancelSpeech(); setUploadedText(''); setUploadedTitle(''); setActiveId(id); setSentenceIndex(0); setNotice(''); };
  const moveSentence = (direction: number) => { cancelSpeech(); const next = Math.max(0, Math.min(sentences.length - 1, sentenceIndex + direction)); setSentenceIndex(next); setWordIndex(-1); };
  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) { setNotice('Please choose a PDF file.'); return; }
    if (file.size > 25 * 1024 * 1024) { setNotice('This PDF is larger than the 25 MB upload limit.'); return; }
    setNotice('Reading text from your PDF…');
    try {
      const data = new Uint8Array(await file.arrayBuffer());
      const pdf = await pdfjsLib.getDocument({ data }).promise;
      const pageTexts: string[] = [];
      for (let pageNo = 1; pageNo <= pdf.numPages; pageNo++) {
        const page = await pdf.getPage(pageNo);
        const content = await page.getTextContent();
        const line = content.items.map(item => ('str' in item ? item.str : '')).join(' ').replace(/\s+/g, ' ').trim();
        if (line) pageTexts.push(line);
      }
      const extracted = pageTexts.join('\n\n').trim();
      if (!extracted) { setNotice('No selectable text was found. This may be a scanned PDF; OCR support is planned for a later stage.'); return; }
      cancelSpeech(); setActiveId(''); setUploadedTitle(file.name.replace(/\.pdf$/i, '')); setUploadedText(extracted); setSentenceIndex(0); setNotice('PDF text loaded. Select Play to begin reading.');
    } catch (error) { console.error(error); setNotice('We could not read this PDF. It may be damaged or protected.'); }
  };
  const shownWords = currentSentence.split(/\s+/);
  const activeWords = chapter.words.filter(item => currentSentence.toLowerCase().includes(item.word.toLowerCase()));
  const explain = () => {
    if (uploadedText) { setNotice('Spoken Hindi explanations for uploaded PDFs need a translation service. The English reader works now; Hindi explanation integration is the next development stage.'); return; }
    if (!selectedHindi) { setNotice('No Hindi voice was detected on this device. Add or enable a Hindi text-to-speech voice in your device settings.'); return; }
    cancelSpeech();
    const u = new SpeechSynthesisUtterance(chapter.explanation + ' Vocabulary: ' + activeWords.map(w => w.word + '. ' + w.meaning).join('. '));
    u.lang = selectedHindi.lang || 'hi-IN'; u.voice = selectedHindi; u.rate = speed;
    u.onstart = () => setNotice('Playing spoken learning explanation. Hindi text is not shown on screen.');
    u.onend = () => setNotice('Explanation finished.');
    utteranceRef.current = u; window.speechSynthesis.speak(u);
  };
  return <div className="app-shell">
    <header className="topbar" data-testid="app-header">
      <a className="brand" href="#" onClick={e => e.preventDefault()}><span className="brand-mark"><BookOpen size={23}/></span><span><strong>KathaPath</strong><small>READ · LISTEN · LEARN</small></span></a>
      <div className="topbar-center"><span className="status-dot"/><span>Browser audio engine</span><span className="status-pill">READY</span></div>
      <button className="icon-button settings-trigger" onClick={() => setShowSettings(true)} aria-label="Open settings"><Settings2 size={19}/><span>Settings</span></button>
    </header>
    <main className="layout">
      <aside className="library-panel panel">
        <div className="section-heading"><div><span className="eyebrow">YOUR READING DESK</span><h2>Library</h2></div><LibraryBig size={21}/></div>
        <label className="upload-button" htmlFor="pdf-upload" data-testid="btn-upload-pdf-trigger"><Upload size={17}/> Upload a PDF <span>+</span></label>
        <input id="pdf-upload" className="visually-hidden" type="file" accept="application/pdf,.pdf" onChange={handleUpload} data-testid="input-pdf-file-upload"/>
        <div className="library-list">{chapters.map((item, i) => <button key={item.id} onClick={() => selectChapter(item.id)} className={'chapter-card ' + (!uploadedText && activeId === item.id ? 'selected' : '')} data-testid={i < 2 ? `chapter-card-${item.id === 'crow' ? 'thirsty-crow' : 'woodcutter'}` : undefined}>
          <span className="chapter-number">0{i + 1}</span><span className="chapter-meta"><strong>{item.title}</strong><small>{item.category} · {item.minutes} min</small></span><span className="chapter-open">↗</span>
        </button>)}</div>
        <div className="library-note"><Sparkles size={17}/><p><strong>Small steps, strong skills.</strong><br/>Listen to a sentence, notice new words, and build confidence one page at a time.</p></div>
        <div className="library-footer"><span><CheckCircle2 size={14}/> 4 starter readings</span><span>PDF limit: 25 MB</span></div>
      </aside>
      <section className="reader-column">
        <div className="reader-title-row"><div><span className="eyebrow">NOW READING</span><h1>{title}</h1><p>{uploadedText ? 'Uploaded PDF · extracted text' : chapter.category + ' · English practice'}</p></div><span className="document-chip"><FileText size={15}/>{uploadedText ? 'YOUR PDF' : 'SAMPLE'}</span></div>
        <div className="reader-card panel" data-testid="pdf-canvas-container">
          <div className="paper-toolbar"><span><FileText size={15}/> READING PAGE</span><span className="page-label" data-testid="pdf-page-indicator">TEXT VIEW · {sentences.length} SENTENCES</span></div>
          <div className="paper-content">
            {sentences.length ? sentences.map((sentence, index) => <p key={index} className={'sentence ' + (sentenceIndex === index ? 'sentence-active' : '')} onClick={() => { cancelSpeech(); setSentenceIndex(index); setWordIndex(-1); }} data-testid={index === sentenceIndex ? 'current-sentence-text' : undefined}>
              {sentenceIndex === index ? sentence.split(/(\s+)/).map((part, wi) => {
                if (/^\s+$/.test(part)) return part;
                const visibleIndex = sentence.slice(0, sentence.indexOf(part)).trim().split(/\s+/).filter(Boolean).length;
                return <span key={wi} className={visibleIndex === wordIndex ? 'word-active' : ''}>{part}</span>;
              }) : sentence}
            </p>) : <div className="empty-reading"><BookOpen size={36}/><p>Choose a story from your library or upload a PDF to begin.</p></div>}
          </div>
          <div className="paper-footer"><span>ENGLISH READING MODE</span><span><span className="amber-dot"/> Live word highlight</span></div>
        </div>
        <div className="playback-card panel">
          <div className="playback-top"><div className="playback-label"><Headphones size={17}/><span>LISTENING SESSION</span></div><span className="progress-count">SENTENCE {Math.min(sentenceIndex + 1, sentences.length)} <i>OF</i> {sentences.length}</span></div>
          <div className="progress-track"><div className="progress-fill" style={{width: sentences.length ? ((sentenceIndex + (isPlaying ? 0.35 : 0)) / sentences.length * 100) + '%' : '0%'}}/></div>
          <div className="playback-controls">
            <button className="control-button" onClick={() => { cancelSpeech(); setSentenceIndex(0); }} aria-label="Restart chapter" data-testid="btn-playback-restart"><RotateCcw size={17}/></button>
            <button className="control-button" onClick={() => moveSentence(-1)} aria-label="Previous sentence" data-testid="btn-playback-prev-sentence"><SkipBack size={19}/></button>
            <button className="play-button" onClick={togglePlayback} aria-label={isPlaying ? 'Pause reading' : 'Play reading'} data-testid="btn-playback-play-pause">{isPlaying ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor"/>}<span>{isPlaying ? 'Pause' : 'Listen'}</span></button>
            <button className="control-button" onClick={() => { cancelSpeech(); setSentenceIndex(Math.min(sentences.length - 1, sentenceIndex + 1)); }} aria-label="Next sentence" data-testid="btn-playback-next-sentence"><SkipForward size={19}/></button>
            <div className="speed-control"><label htmlFor="speed">SPEED</label><select id="speed" value={speed} onChange={e => setSpeed(Number(e.target.value))} data-testid="slider-reading-speed"><option value={0.75}>0.75×</option><option value={0.9}>0.9×</option><option value={1}>1.0×</option><option value={1.2}>1.2×</option><option value={1.5}>1.5×</option></select></div>
          </div>
        </div>
        {notice && <div className="notice" role="status"><AlertCircle size={16}/><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Dismiss notice"><X size={15}/></button></div>}
      </section>
      <aside className="tutor-panel panel">
        <div className="tutor-header"><div><span className="eyebrow">YOUR AI STUDY COMPANION</span><h2>Tutor session</h2></div><span className="tutor-avatar"><Headphones size={20}/></span></div>
        <div className="session-status"><span className={'status-dot ' + (isPlaying ? 'live' : '')}/><span data-testid="tutor-status-badge">{isPlaying ? 'Reading aloud' : 'Ready when you are'}</span><span className="wave-mini"><i/><i/><i/><i/></span></div>
        <div className="current-card"><span className="eyebrow">CURRENT SENTENCE</span><p>{currentSentence || 'Your selected sentence will appear here.'}</p><div className="sentence-tag">SENTENCE {Math.min(sentenceIndex + 1, sentences.length)} / {sentences.length}</div></div>
        <div className="tutor-feature"><div className="feature-icon"><Languages size={18}/></div><div><strong>Spoken Hindi guide</strong><p>Hear a short explanation and vocabulary support without displaying Hindi text.</p></div></div>
        <button className="explain-button" onClick={explain}><Volume2 size={17}/> Play spoken explanation <span>↗</span></button>
        <div className="vocab-section"><div className="vocab-title"><span className="eyebrow">WORDS TO NOTICE</span><span className="vocab-count">{activeWords.length} WORDS</span></div>
          {activeWords.length ? activeWords.map(item => <div className="vocab-row" key={item.word}><div><strong>{item.word}</strong><p>{item.meaning}</p></div><button onClick={() => { if (!selectedEnglish) { setNotice('No English voice was detected on this device.'); return; } const u = new SpeechSynthesisUtterance(item.word); u.voice = selectedEnglish; u.rate = speed; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }} aria-label={'Pronounce ' + item.word}><Volume2 size={16}/></button></div>) : <p className="vocab-empty">Choose a sample reading to explore selected vocabulary. Word definitions for uploaded PDFs will be added in a later stage.</p>}
        </div>
        <div className="spoken-only"><span className="spoken-icon"><Volume2 size={15}/></span><span><strong>Audio-first learning</strong><small>Hindi explanations are spoken, never written on screen.</small></span></div>
      </aside>
    </main>
    <footer className="app-footer"><span>© KathaPath · A calmer way to learn English</span><span><Clock3 size={13}/> Your reading progress stays in this session</span></footer>
    {showSettings && <div className="modal-backdrop" onClick={() => setShowSettings(false)}><section className="settings-modal panel" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="settings-title"><div className="modal-heading"><div><span className="eyebrow">PERSONALISE YOUR SESSION</span><h2 id="settings-title">Audio settings</h2></div><button className="icon-button" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={19}/></button></div>
      <label className="setting-field">English voice<select value={englishVoice} onChange={e => setEnglishVoice(e.target.value)} data-testid="select-english-voice"><option value="">Automatic English voice</option>{voices.filter(v => v.lang.toLowerCase().startsWith('en')).map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></label>
      <label className="setting-field">Hindi voice<select value={hindiVoice} onChange={e => setHindiVoice(e.target.value)} data-testid="select-hindi-voice"><option value="">Automatic Hindi voice</option>{voices.filter(v => v.lang.toLowerCase().startsWith('hi')).map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></label>
      <p className="settings-help">Available voices depend on your device and browser. If Hindi voices are missing, install or enable a Hindi speech voice in your device's text-to-speech settings.</p><button className="save-settings" onClick={() => setShowSettings(false)}>Save preferences</button>
    </section></div>}
  </div>;
}
export default App;