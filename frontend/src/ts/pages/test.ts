import * as TestLogic from "../test/test-logic";
import * as Funbox from "../test/funbox/funbox";
import Page from "./page";
import { updateFooterAndVerticalAds } from "../controllers/ad-controller";
import { blurInputElement } from "../input/input-element";
import { resetIncompleteTests } from "../states/test";

export const page = new Page({
  id: "test",
  path: "/",
  beforeHide: async (): Promise<void> => {
    blurInputElement();
  },
  afterHide: async (): Promise<void> => {
    void TestLogic.restart({
      noAnim: true,
    });
    void Funbox.clear();
    updateFooterAndVerticalAds(true);
  },
  beforeShow: async (): Promise<void> => {
    updateFooterAndVerticalAds(false);
    resetIncompleteTests();
    void TestLogic.restart({
      noAnim: true,
    });
  },
});
