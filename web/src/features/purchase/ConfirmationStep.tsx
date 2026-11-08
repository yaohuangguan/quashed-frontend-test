import { useId } from "react";
import { formatIsoDate } from "@shared/dates.ts";
import type { CreateOrderResponse } from "@shared/purchase.ts";
import { Button } from "../../components/Button.tsx";
import { ButtonsPane } from "../../components/ButtonsPane.tsx";
import { messages } from "../../locales/en.ts";
import { FlyoutHeader } from "./FlyoutHeader.tsx";

const t = messages.purchase;

type ConfirmationStepProps = {
  order: CreateOrderResponse;
  onDone: () => void;
  onDisconnect: () => void;
};

/** Step 3: the purchase went through. */
export function ConfirmationStep({ order, onDone, onDisconnect }: ConfirmationStepProps) {
  const titleId = `${useId()}-title`;
  return (
    <div className="flyout__form">
      <FlyoutHeader titleId={titleId} title={t.confirmedTitle(order.providerName)} onDisconnect={onDisconnect} />
      <div className="flyout__body flyout__body--text" role="status">
        <p>{t.contractStarts(formatIsoDate(order.contractStartDate))}</p>
        <p>{t.specialistsWillContact(order.providerName)}</p>
      </div>
      <ButtonsPane>
        <Button withArrow onClick={onDone}>
          {t.backToDashboard}
        </Button>
      </ButtonsPane>
    </div>
  );
}
