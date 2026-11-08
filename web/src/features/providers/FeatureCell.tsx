import type { FeatureValue } from "@shared/providers.ts";
import { checkIcon, crossIcon } from "../../components/icons.ts";
import { formatMoney } from "../../lib/format.ts";
import { messages } from "../../locales/en.ts";

/** One cell of the comparison table: a tick, a cross, text or a price. */
export function FeatureCell({ value }: { value: FeatureValue }) {
  switch (value.type) {
    case "included":
      return <img src={checkIcon} alt={messages.providers.included} width={24} height={24} />;
    case "excluded":
      return <img src={crossIcon} alt={messages.providers.excluded} width={24} height={24} />;
    case "text":
      return <span>{value.text}</span>;
    case "price":
      return (
        <span className="price price--small">
          <span className="price__amount">{formatMoney(value.amountCents)}</span>
          <span className="price__unit">{messages.providers.per[value.per]}</span>
        </span>
      );
  }
}
