// Provider logos. Each one is assembled from slices of one image, positioned
// exactly as in the Figma file (see styles/logos.css).
import cloudidSprite from "../assets/cloudid-sprite.png";
import proneteSprite from "../assets/pronete-sprite.png";
import tebiobioSprite from "../assets/tebiobio-sprite.png";
import digitalllyMark from "../assets/digitallly-mark.png";
import digitalllyWordmark from "../assets/digitallly-wordmark.png";

const LOGOS: Record<string, string[]> = {
  cloudid: [cloudidSprite, cloudidSprite, cloudidSprite],
  pronete: [proneteSprite, proneteSprite, proneteSprite],
  tebiobio: [tebiobioSprite, tebiobioSprite],
  digitallly: [digitalllyMark, digitalllyWordmark],
};

export function ProviderLogo({ id, name }: { id: string; name: string }) {
  const layers = LOGOS[id];
  if (!layers) return <span className="logo logo--text">{name}</span>;
  return (
    <span className={`logo logo--${id}`} role="img" aria-label={name}>
      {layers.map((src, index) => (
        <span key={index} className={`logo__layer logo__layer--${index + 1}`}>
          <img className="logo__image" src={src} alt="" draggable={false} />
        </span>
      ))}
    </span>
  );
}
