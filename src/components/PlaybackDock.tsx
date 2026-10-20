import { Pause, Play, RotateCcw, SkipBack, SkipForward } from 'lucide-react';

type Props = {
  sentenceIndex: number; sentenceCount: number; isPlaying: boolean; speed: number;
  onToggle: () => void; onRestart: () => void; onMove: (direction: number) => void;
  onSpeedChange: (speed: number) => void;
};
export default function PlaybackDock({ sentenceIndex, sentenceCount, isPlaying, speed, onToggle, onRestart, onMove, onSpeedChange }: Props) {
  const progress = sentenceCount ? ((sentenceIndex + (isPlaying ? 0.35 : 0)) / sentenceCount) * 100 : 0;
  return <div className="playback-card panel">
    <div className="playback-top"><div className="playback-label"><span>◖</span><span>LISTENING SESSION</span></div><span className="progress-count">SENTENCE {sentenceCount ? Math.min(sentenceIndex + 1, sentenceCount) : 0} <i>OF</i> {sentenceCount}</span></div>
    <div className="progress-track"><div className="progress-fill" style={{ width: `${progress}%` }} /></div>
    <div className="playback-controls">
      <button className="control-button" onClick={onRestart} aria-label="Restart chapter" data-testid="btn-playback-restart"><RotateCcw size={17}/></button>
      <button className="control-button" onClick={() => onMove(-1)} aria-label="Previous sentence" disabled={sentenceIndex <= 0} data-testid="btn-playback-prev-sentence"><SkipBack size={19}/></button>
      <button className="play-button" onClick={onToggle} aria-label={isPlaying ? 'Pause reading' : 'Play reading'} data-testid="btn-playback-play-pause">{isPlaying ? <Pause size={22} fill="currentColor"/> : <Play size={22} fill="currentColor}/>}<span>{isPlaying ? 'Pause' : 'Listen'}</span></button>
      <button className="control-button" onClick={() => onMove(1)} aria-label="Next sentence" disabled={!sentenceCount || sentenceIndex >= sentenceCount - 1} data-testid="btn-playback-next-sentence"><SkipForward size={19}/></button>
      <div className="speed-control"><label htmlFor="speed">SPEED</label><select id="speed" value={speed} onChange={e => onSpeedChange(Number(e.target.value))} data-testid="slider-reading-speed"><option value={0.75}>0.75×</option><option value={0.9}>0.9×</option><option value={1}>1.0×</option><option value={1.2}>1.2×</option><option value={1.5}>1.5×</option></select></div>
    </div>
  </div>;
}
