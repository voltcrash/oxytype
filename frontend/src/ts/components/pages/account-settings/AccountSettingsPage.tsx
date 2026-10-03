import { JSXElement } from "solid-js";

import {
  AccountSettingsTab,
  accountSettingsTabs,
  getCurrentTab,
  setCurrentTab,
} from "../../../states/account-settings";
import { Button } from "../../common/Button";
import { Page } from "../../common/Page";
import { SidebarLayout } from "../../common/SidebarLayout";
import { AccountTab } from "./AccountTab";
import { ApeKeysTab } from "./ApeKeysTab";
import { AuthenticationTab } from "./AuthenticationTab";
import { BlockedUsersTab } from "./BlockedUsersTab";
import { DangerZoneTab } from "./DangerZoneTab";

const tabContent: Record<AccountSettingsTab, () => JSXElement> = {
  account: () => <AccountTab />,
  authentication: () => <AuthenticationTab />,
  blockedUsers: () => <BlockedUsersTab />,
  apeKeys: () => <ApeKeysTab />,
  dangerZone: () => <DangerZoneTab />,
};

export function AccountSettingsPage() {
  return (
    <Page id="accountSettings">
      <SidebarLayout
        items={accountSettingsTabs}
        active={getCurrentTab()}
        onSelect={setCurrentTab}
        footer={
          <Button
            text="settings"
            variant="text"
            fa={{ icon: "fa-cog" }}
            href="/settings"
            router-link
          />
        }
      >
        {tabContent[getCurrentTab()]()}
      </SidebarLayout>
    </Page>
  );
}
