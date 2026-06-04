import type { Preset } from "../data/presets";

interface PresetGalleryProps {
  presets: Preset[];
  onSelect: (preset: Preset) => void;
  disabled?: boolean;
}

export function PresetGallery({ presets, onSelect, disabled }: PresetGalleryProps) {
  return (
    <div className="preset-strip">
      {presets.map((preset) => (
        <button
          key={preset.id}
          className="preset-chip"
          onClick={() => onSelect(preset)}
          disabled={disabled}
          title={preset.title}
        >
          <img src={preset.image} alt={preset.title} />
          <span>{preset.title}</span>
        </button>
      ))}
    </div>
  );
}
