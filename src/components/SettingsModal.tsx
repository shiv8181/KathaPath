import { X } from 'lucide-react';

type Props = {
  open: boolean; voices: SpeechSynthesisVoice[]; englishVoice: string; hindiVoice: string;
  onEnglishChange: (name: string) => void; onHindiChange: (name: string) => void; onClose: () => void;
};
export default function SettingsModal({ open, voices, englishVoice, hindiVoice, onEnglishChange, onHindiChange, onClose }: Props) {
  if (!open) return null;
  return <div className="modal-backdrop" onClick={onClose}><section className="settings-modal panel" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="settings-title">
    <div className="modal-heading"><div><span className="eyebrow">PERSONALISE YOUR SESSION</span><h2 id="settings-title">Audio settings</h2></div><button className="icon-button" onClick={onClose} aria-label="Close settings"><X size={19}/></button></div>
    <label className="setting-field">English voice<select value={englishVoice} onChange={event => onEnglishChange(event.target.value)} data-testid="select-english-voice"><option value="">Automatic English voice</option>{voices.filter(v => v.lang.toLowerCase().startsWith('en')).map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></label>
    <label className="setting-field">Hindi voice<select value={hindiVoice} onChange={event => onHindiChange(event.target.value)} data-testid="select-hindi-voice"><option value="">Automatic Hindi voice</option>{voices.filter(v => v.lang.toLowerCase().startsWith('hi')).map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}</select></label>
    <p className="settings-help">Available voices depend on your device and browser. Hindi explanations are played as audio only; Hindi text is never displayed.</p>
    <button className="save-settings" onClick={onClose}>Save preferences</button>
  </section></div>;
}
