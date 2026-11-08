import { closeIcon } from "../../components/icons.ts";
import { messages } from "../../locales/en.ts";

type FlyoutHeaderProps = {
  titleId: string;
  title: string;
  onDisconnect: () => void;
};

/** Title on the left, "Disconnect ×" on the right. */
export function FlyoutHeader({ titleId, title, onDisconnect }: FlyoutHeaderProps) {
  return (
    <header className="flyout__header">
      <h2 className="flyout__title" id={titleId}>
        {title}
      </h2>
      <button type="button" className="flyout__disconnect" onClick={onDisconnect}>
        {messages.purchase.disconnect}
        <img src={closeIcon} alt="" width={20} height={20} />
      </button>
    </header>
  );
}
