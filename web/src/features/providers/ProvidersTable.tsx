// The comparison table. The provider column stays put while the feature
// columns scroll sideways.
import { COMPARISON_COLUMNS, type ProviderSummary } from "@shared/providers.ts";
import { useNow } from "../../hooks/use-now.ts";
import { messages } from "../../locales/en.ts";
import { FeatureCell } from "./FeatureCell.tsx";
import { ProviderCard } from "./ProviderCard.tsx";

type ProvidersTableProps = {
  providers: ProviderSummary[];
  onGetStarted: (provider: ProviderSummary) => void;
};

export function ProvidersTable({ providers, onGetStarted }: ProvidersTableProps) {
  const now = useNow();
  return (
    <div className="table-scroll" tabIndex={0} role="region" aria-label={messages.providers.title}>
      <table className="providers-table">
        <caption className="visually-hidden">{messages.providers.title}</caption>
        <thead>
          <tr>
            <th scope="col" className="providers-table__provider-head">
              {messages.providers.columnProvider}
            </th>
            {COMPARISON_COLUMNS.map((column) => (
              <th key={column.id} scope="col">
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) => (
            <tr key={provider.id}>
              <th scope="row" className="providers-table__provider">
                <ProviderCard provider={provider} now={now} onGetStarted={() => onGetStarted(provider)} />
              </th>
              {COMPARISON_COLUMNS.map((column) => (
                <td key={column.id}>
                  <FeatureCell value={provider.features[column.id]} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
