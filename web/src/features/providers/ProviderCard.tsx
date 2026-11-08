import type { ProviderSummary } from "@shared/providers.ts";
import { Button } from "../../components/Button.tsx";
import { ProviderLogo } from "../../components/ProviderLogo.tsx";
import { formatMoney, formatTimeAgo } from "../../lib/format.ts";
import { messages } from "../../locales/en.ts";

const t = messages.providers;

type ProviderCardProps = {
  provider: ProviderSummary;
  now: Date;
  onGetStarted: () => void;
};

/** The left-hand cell of a provider's row: logo, price and "Get Started". */
export function ProviderCard({ provider, now, onGetStarted }: ProviderCardProps) {
  return (
    <div className="provider-card">
      <div className="provider-card__info">
        <div className="provider-card__badges">{provider.isCheapest && <span className="badge">{t.cheapest}</span>}</div>
        <h2 className="provider-card__name">
          <ProviderLogo id={provider.id} name={provider.name} />
        </h2>
        <p className="price">
          <span className="price__amount price__amount--large">{formatMoney(provider.monthlyPriceCents)}</span>
          <span className="price__unit">{t.perMonthShort}</span>
        </p>
        <p className="provider-card__retrieved">
          <time dateTime={provider.retrievedAt}>{t.retrieved(formatTimeAgo(provider.retrievedAt, now))}</time>
        </p>
      </div>
      <div className="provider-card__action">
        <p className="provider-card__tagline">{provider.tagline}</p>
        <Button size="large" withArrow onClick={onGetStarted} aria-label={t.getStartedWith(provider.name)}>
          {t.getStarted}
        </Button>
      </div>
    </div>
  );
}
