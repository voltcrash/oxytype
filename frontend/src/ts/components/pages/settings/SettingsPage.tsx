import { createResource, JSXElement, Show } from "solid-js";

import { resetConfig } from "../../../config/lifecycle";
import { getConfig } from "../../../config/store";
import {
  playTimeWarning,
  previewClick,
  previewError,
} from "../../../controllers/sound-controller";
import { isAuthenticated } from "../../../states/core";
import { showModal } from "../../../states/modals";
import {
  getSearchMatchCounts,
  getSettingsSearch,
  isSettingsSearchActive,
  setSettingsSearch,
} from "../../../states/settings-search";
import {
  getCurrentSettingsSection,
  SettingsSection,
  settingsSections,
  setCurrentSettingsSection,
} from "../../../states/settings-sections";
import { showSimpleModal } from "../../../states/simple-modal";
import { cn } from "../../../utils/cn";
import fileStorage from "../../../utils/file-storage";
import { Button } from "../../common/Button";
import { H2 } from "../../common/Headers";
import { Page } from "../../common/Page";
import { SidebarLayout } from "../../common/SidebarLayout";
import { CommandlineHotkey } from "../../hotkeys/CommandlineHotkey";
import { AnimationFpsLimit } from "./custom-setting/AnimationFpsLimit";
import { AutoSwitchTheme } from "./custom-setting/AutoSwitchTheme";
import { CustomBackground } from "./custom-setting/CustomBackground";
import { CustomBackgroundFilters } from "./custom-setting/CustomBackgroundFilters";
import { CustomLayoutfluid } from "./custom-setting/CustomLayoutfluid";
import { CustomPolyglot } from "./custom-setting/CustomPolyglot";
import { FontFamily } from "./custom-setting/FontFamily";
import { Funbox } from "./custom-setting/Funbox";
import { ImportExport } from "./custom-setting/ImportExport";
import { KeymapLayout } from "./custom-setting/KeymapLayout";
import { KeymapSize } from "./custom-setting/KeymapSize";
import { Language } from "./custom-setting/Language";
import { Layout } from "./custom-setting/Layout";
import { MaxLineWidth } from "./custom-setting/MaxLineWidth";
import { MinAcc } from "./custom-setting/MinAcc";
import { MinBurst } from "./custom-setting/MinBurst";
import { MinSpeed } from "./custom-setting/MinSpeed";
import { PaceCaret } from "./custom-setting/PaceCaret";
import { Presets } from "./custom-setting/Presets";
import { SoundVolume } from "./custom-setting/SoundVolume";
import { Tags } from "./custom-setting/Tags";
import { Theme } from "./custom-setting/Theme";
import { SearchableAutoSetting } from "./SearchableAutoSetting";
import { SearchableSetting } from "./SearchableSetting";
import { SettingsSectionContext } from "./settings-section-context";
import { SettingsSearch } from "./SettingsSearch";

export function SettingsPage(): JSXElement {
  const [hasLocalBg] = createResource(
    () => fileStorage.track("LocalBackgroundFile"),
    async () => fileStorage.hasFile("LocalBackgroundFile"),
  );

  return (
    <Page id="settings">
      <SidebarLayout
        items={settingsSections}
        // while filtering, results from every section are shown
        active={
          isSettingsSearchActive() ? undefined : getCurrentSettingsSection()
        }
        onSelect={(section) => {
          setSettingsSearch("");
          setCurrentSettingsSection(section);
        }}
        header={<SettingsSearch />}
        counts={isSettingsSearchActive() ? getSearchMatchCounts() : undefined}
        footer={
          isAuthenticated() || getConfig.showKeyTips ? (
            <>
              <Show when={isAuthenticated()}>
                <Button
                  text="account settings"
                  variant="text"
                  fa={{ icon: "fa-user-cog" }}
                  href="/account-settings"
                  router-link
                />
              </Show>
              <Show when={getConfig.showKeyTips}>
                {/* padded like the buttons: inset to line up with the item icons,
                    and space below to match the gap above the tip */}
                <div class="px-2 pb-2 text-em-xs text-sub">
                  tip: you can also change all these settings quickly via the
                  command palette (<CommandlineHotkey />)
                </div>
              </Show>
            </>
          ) : undefined
        }
      >
        <Show
          when={
            isSettingsSearchActive() &&
            Object.keys(getSearchMatchCounts()).length === 0
          }
        >
          <div class="text-center text-sub">
            No settings match &quot;{getSettingsSearch().trim()}&quot;.
          </div>
        </Show>
        <div class="grid gap-16">
          <Section section="behavior">
            <Show when={isAuthenticated()}>
              <Tags />
              <Presets />
              <SearchableAutoSetting key="resultSaving" />
            </Show>
            <SearchableAutoSetting key="difficulty" />
            <SearchableAutoSetting key="quickRestart" />
            <SearchableAutoSetting key="repeatQuotes" />
            <SearchableAutoSetting key="blindMode" />
            <SearchableAutoSetting key="alwaysShowWordsHistory" />
            <SearchableAutoSetting key="singleListCommandLine" />
            <MinSpeed />
            <MinAcc />
            <MinBurst />
            <SearchableAutoSetting key="britishEnglish" />
            <Language />
            <Funbox />
            <CustomLayoutfluid />
            <CustomPolyglot />
          </Section>
          <Section section="input">
            <SearchableAutoSetting key="freedomMode" />
            <SearchableAutoSetting key="strictSpace" />
            <SearchableAutoSetting key="oppositeShiftMode" />
            <SearchableAutoSetting key="stopOnError" />
            <SearchableAutoSetting key="deleteOnError" />
            <SearchableAutoSetting key="confidenceMode" />
            <SearchableAutoSetting key="quickEnd" />
            <SearchableAutoSetting key="indicateTypos" />
            <SearchableAutoSetting key="hideExtraLetters" />
            <SearchableAutoSetting key="compositionDisplay" />
            <SearchableAutoSetting key="lazyMode" />
            <Layout />
            <SearchableAutoSetting key="codeUnindentOnBackspace" />
          </Section>
          <Section section="sound">
            <SoundVolume />
            <SearchableAutoSetting
              key="playSoundOnClick"
              wide
              onOptionClick={(option) => {
                if (option === "off") return;
                void previewClick(option);
              }}
            />
            <SearchableAutoSetting
              key="playSoundOnError"
              wide
              onOptionClick={(option) => {
                if (option === "off") return;
                void previewError(option);
              }}
            />
            <SearchableAutoSetting
              key="playTimeWarning"
              wide
              onOptionClick={(option) => {
                if (option === "off") return;
                void playTimeWarning();
              }}
            />
          </Section>
          <Section section="caret">
            <SearchableAutoSetting key="smoothCaret" />
            <SearchableAutoSetting key="caretStyle" wide />
            <PaceCaret />
            <SearchableAutoSetting key="repeatedPace" />
            <SearchableAutoSetting key="paceCaretStyle" wide />
          </Section>
          <Section section="appearance">
            <SearchableAutoSetting key="timerStyle" wide />
            <SearchableAutoSetting key="liveSpeedStyle" />
            <SearchableAutoSetting key="liveAccStyle" />
            <SearchableAutoSetting key="liveBurstStyle" />
            <SearchableAutoSetting key="timerColor" />
            <SearchableAutoSetting key="timerOpacity" />
            <SearchableAutoSetting key="highlightMode" wide />
            <SearchableAutoSetting key="typedEffect" />
            <SearchableAutoSetting key="tapeMode" />
            <SearchableAutoSetting key="tapeMargin" />
            <SearchableAutoSetting key="smoothLineScroll" />
            <SearchableAutoSetting key="showAllLines" />
            <SearchableAutoSetting key="alwaysShowDecimalPlaces" />
            <SearchableAutoSetting key="typingSpeedUnit" />
            <SearchableAutoSetting key="startGraphsAtZero" />
            <MaxLineWidth />
            <SearchableAutoSetting key="fontSize" />
            <FontFamily />
            <SearchableAutoSetting key="keymapMode" />
            <Show when={getConfig.keymapMode !== "off"}>
              <KeymapLayout />
              <SearchableAutoSetting key="keymapStyle" wide />
              <SearchableAutoSetting key="keymapLegendStyle" wide />
              <SearchableAutoSetting key="keymapKeys" wide />
              <KeymapSize />
            </Show>
          </Section>
          <Section section="theme">
            <SearchableAutoSetting key="flipTestColors" />
            <SearchableAutoSetting key="colorfulMode" />
            <CustomBackground />
            <Show when={getConfig.customBackground !== "" || hasLocalBg()}>
              <CustomBackgroundFilters />
            </Show>
            <AutoSwitchTheme />
            <SearchableAutoSetting key="randomTheme" wide />
            <Theme />
          </Section>
          <Section section="hideElements">
            <SearchableAutoSetting key="showKeyTips" />
            <SearchableAutoSetting key="showOutOfFocusWarning" />
            <SearchableAutoSetting key="capsLockWarning" />
            <SearchableAutoSetting key="showAverage" />
          </Section>
          <Section section="dangerZone">
            <ImportExport />
            <SearchableAutoSetting key="ads" />
            <SearchableSetting
              key="cookies"
              title="update cookie preferences"
              description="If you changed your mind about which cookies you consent to, you can change your preferences here."
              fa={{
                icon: "fa-cookie-bite",
              }}
              inputs={
                <Button
                  class="w-full"
                  onClick={() => {
                    showModal("Cookies");
                  }}
                >
                  open
                </Button>
              }
            />
            <AnimationFpsLimit />
            <SearchableSetting
              key="resetSettings"
              title="reset settings"
              description={
                <div>
                  Resets settings to the default (but doesn&apos;t touch your
                  tags and presets).
                  <br />
                  <div class="text-error">You can&apos;t undo this!</div>
                </div>
              }
              fa={{
                icon: "fa-undo",
              }}
              inputs={
                <Button
                  class="w-full"
                  danger
                  onClick={() => {
                    showSimpleModal({
                      title: "Are you sure?",
                      buttonText: "reset",
                      execFn: async () => {
                        await resetConfig();
                        await fileStorage.deleteFile("LocalBackgroundFile");
                        return {
                          status: "success",
                          message: "Settings reset",
                        };
                      },
                    });
                  }}
                >
                  reset settings
                </Button>
              }
            />
          </Section>
        </div>
      </SidebarLayout>
    </Page>
  );
}

function Section(props: {
  section: SettingsSection;
  children: JSXElement;
}): JSXElement {
  // oxlint-disable-next-line solid/reactivity -- each section is static
  const section = props.section;
  return (
    <div
      id={`group_${props.section}`}
      class={cn(
        "grid gap-8",
        // only the selected section is shown, unless filtering, where every
        // section with a matching setting is shown
        !isSettingsSearchActive() &&
          getCurrentSettingsSection() !== props.section &&
          "hidden",
        isSettingsSearchActive() &&
          "not-has-[[data-setting-key]:not(.hidden)]:hidden",
      )}
    >
      <H2
        text={settingsSections[props.section].text}
        fa={{ icon: settingsSections[props.section].icon }}
        class="pb-0"
      />
      <SettingsSectionContext.Provider value={section}>
        {props.children}
      </SettingsSectionContext.Provider>
    </div>
  );
}
