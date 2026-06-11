interface WaveformBarsProps {
  isPlaying: boolean;
  barCount?: number;
  color?: string;
  className?: string;
}

const DELAYS = [0, 0.15, 0.05, 0.2, 0.1];
const DURATIONS = [0.5, 0.65, 0.55, 0.7, 0.6];

export default function WaveformBars({
  isPlaying,
  barCount = 5,
  color = 'currentColor',
  className = '',
}: WaveformBarsProps) {
  return (
    <>
      <style>{`
        @keyframes waveBarAnim {
          0%, 100% { height: 4px; }
          50% { height: 18px; }
        }
      `}</style>
      <div
        className={`flex items-end gap-[3px] ${className}`}
        style={{ height: 20 }}
        aria-hidden="true"
      >
        {Array.from({ length: barCount }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 4,
              borderRadius: 2,
              backgroundColor: color,
              height: isPlaying ? undefined : 4,
              minHeight: 4,
              animation: isPlaying
                ? `waveBarAnim ${DURATIONS[i % DURATIONS.length]}s ease-in-out ${DELAYS[i % DELAYS.length]}s infinite`
                : 'none',
            }}
          />
        ))}
      </div>
    </>
  );
}
