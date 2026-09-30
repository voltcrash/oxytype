import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { render } from "solid-js/web";

import { EmailHandler } from "./components/standalone/EmailHandler";
import { firebaseConfig } from "./constants/firebase-config";

const element = document.getElementById("app");
if (element !== null) {
  render(
    () => (
      <EmailHandler
        initializeAuth={() => getAuth(initializeApp(firebaseConfig))}
      />
    ),
    element,
  );
}
