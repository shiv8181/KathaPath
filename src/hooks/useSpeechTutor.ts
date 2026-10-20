import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export function splitSentences(text: string): string[] {
  return (text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

export function useSpeechTutor(text: string) {
  const sentences = useMemo(() => splitSentences(text), [text]);
  const [sentenceIndex, setSentenceIndex] = useState(0);
  const [wordIndex, setWordIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [englishVoice, setEnglishVoice] = useState('');
  const [hindiVoice, setHindiVoice] = useState('');
  const [notice, setNotice] = useState('');
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const sessionRef = useRef(0);
  const timerRef = useRef<number | undefined>(undefined);

  const selectedEnglish = voices.find(v => v.name === englishVoice)
    ?? voices.find(v => v.lang.toLowerCase().startsWith('en-in'))
    ?? voices.find(v => v.lang.toLowerCase().startsWith('en'));
  const selectedHindi = voices.find(v => v.name === hindiVoice)
    ?? voices.find(v => v.lang.toLowerCase().startsWith('hi'));

  const cancel = useCallback(() => {
    sessionRef.current += 1;
    if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    window.speechSynthesis?.cancel();
    utteranceRef.current = null;
    setIsPlaying(false);
    setWordIndex(-1);
  }, []);

  useEffect(() => {
    const load = () => setVoices(window.speechSynthesis?.getVoices() ?? []);
    load();
    window.speechSynthesis?.addEventListener('voiceschanged', load);
    return () => {
      window.speechSynthesis?.removeEventListener('voiceschanged', load);
      window.speechSynthesis?.cancel();
      if (timerRef.current !== undefined) window.clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    cancel();
    setSentenceIndex(0);
    setNotice('');
  }, [text, cancel]);

  const speakSentence = useCallback((index: number) => {
    if (!('speechSynthesis' in window)) {
      setNotice('Speech synthesis is not supported in this browser. Try Chrome.');
      return;
    }
    if (index < 0 || index >= sentences.length) {
      setIsPlaying(false);
      setWordIndex(-1);
      setNotice('You have reached the end of this reading.');
      return;
    }
    const token = ++sessionRef.current;
    window.speechSynthesis.cancel();
    setSentenceIndex(index);
    setWordIndex(-1);
    setIsPlaying(true);
    const sentence = sentences[index];
    const utterance = new SpeechSynthesisUtterance(sentence);
    utterance.lang = selectedEnglish?.lang || 'en-IN';
    utterance.rate = speed;
    if (selectedEnglish) utterance.voice = selectedEnglish;
    utterance.onboundary = event => {
      if (token !== sessionRef.current || typeof event.charIndex !== 'number') return;
      const before = sentence.slice(0, event.charIndex);
      setWordIndex((before.match(/\S+/g) ?? []).length);
    };
    utterance.onend = () => {
      if (token !== sessionRef.current) return;
      setWordIndex(-1);
      if (index + 1 < sentences.length) {
        timerRef.current = window.setTimeout(() => {
          if (token === sessionRef.current) speakSentence(index + 1);
        }, 700);
      } else {
        setIsPlaying(false);
        setNotice('Reading complete. Well done!');
      }
    };
    utterance.onerror = event => {
      if (token === sessionRef.current && event.error !== 'canceled' && event.error !== 'interrupted') {
        setIsPlaying(false);
        setNotice('Audio playback stopped. Please try again.');
      }
    };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [sentences, selectedEnglish, speed]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) cancel();
    else speakSentence(sentenceIndex);
  }, [isPlaying, cancel, speakSentence, sentenceIndex]);

  const moveSentence = useCallback((direction: number) => {
    cancel();
    setSentenceIndex(current => Math.max(0, Math.min(Math.max(0, sentences.length - 1), current + direction)));
  }, [cancel, sentences.length]);

  const restart = useCallback(() => {
    cancel();
    setSentenceIndex(0);
    setNotice('');
  }, [cancel]);

  const speakHindi = useCallback((text: string) => {
    if (!selectedHindi) {
      setNotice('No Hindi voice was detected. Enable a Hindi text-to-speech voice in device settings.');
      return;
    }
    cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = selectedHindi.lang || 'hi-IN';
    utterance.voice = selectedHindi;
    utterance.rate = speed;
    utterance.onend = () => setNotice('Explanation finished.');
    utterance.onerror = () => setNotice('Hindi audio could not be played on this device.');
    utteranceRef.current = utterance;
    setNotice('Playing spoken learning explanation. Hindi text is not shown on screen.');
    window.speechSynthesis.speak(utterance);
  }, [selectedHindi, speed, cancel]);

  const speakWord = useCallback((word: string) => {
    if (!selectedEnglish) {
      setNotice('No English voice was detected on this device.');
      return;
    }
    cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.voice = selectedEnglish;
    utterance.lang = selectedEnglish.lang;
    utterance.rate = speed;
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [selectedEnglish, speed, cancel]);

  return {
    sentences, sentenceIndex, setSentenceIndex, wordIndex, isPlaying, speed, setSpeed,
    voices, englishVoice, setEnglishVoice, hindiVoice, setHindiVoice, selectedEnglish,
    selectedHindi, notice, setNotice, cancel, togglePlayback, speakSentence, moveSentence,
    restart, speakHindi, speakWord,
  };
}
