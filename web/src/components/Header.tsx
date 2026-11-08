import { messages } from "../locales/en.ts";
import { accountIcon, menuIcon } from "./icons.ts";
import { ProviderLogo } from "./ProviderLogo.tsx";

export function Header() {
  return (
    <header className="header">
      <div className="header__start">
        <button type="button" className="icon-button header__menu" aria-label={messages.header.menu}>
          <img src={menuIcon} alt="" width={32} height={32} />
        </button>
        <a className="header__home" href="/" aria-label={messages.header.home}>
          <ProviderLogo id="digitallly" name="digitallly" />
        </a>
      </div>
      <button type="button" className="header__account" aria-label={messages.header.account}>
        <img src={accountIcon} alt="" width={32} height={32} />
      </button>
    </header>
  );
}
